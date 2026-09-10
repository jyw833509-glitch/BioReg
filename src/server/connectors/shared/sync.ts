import type { Db } from "../../db";
import type { Adapter, Candidate } from "./types";
import type { HtmlClient } from "./client";
import { writeRecord } from "./writer";
import { acquireLock } from "../../scheduler/lock";
import { healthFor, classifyFailure, safeError } from "../../scheduler/health";
export interface SyncOptions {
  mode: "initial" | "incremental";
  limit: number;
  dryRun?: boolean;
  startDate?: Date;
  maxPages?: number;
  jobId?: string;
}
async function runSource(
  db: Db,
  adapter: Adapter,
  options: SyncOptions,
  client: HtmlClient,
  assertOwned: () => Promise<void>,
) {
  if (
    options.maxPages !== undefined &&
    (!Number.isInteger(options.maxPages) ||
      options.maxPages < 1 ||
      options.maxPages > 4)
  )
    throw new Error("maxPages must be 1..4");
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    options.limit > 100
  )
    throw new Error("limit must be 1..100");
  const source = await db.source.findUnique({ where: { code: adapter.code } });
  if (!source || !source.enabled)
    throw new Error(
      "Official source Source missing or disabled; initialize sources first",
    );
  const started = new Date();
  const result = {
    mode: options.mode,
    dry_run: !!options.dryRun,
    records_found: 0,
    records_relevant: 0,
    records_new: 0,
    records_existing: 0,
    records_updated: 0,
    records_invalid: 0,
    records_skipped: 0,
    records_failed: 0,
    status: "SUCCESS" as "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED",
    warnings: [] as string[],
    errors: [] as string[],
  };
  if (!options.dryRun) {
    await db.syncLog.updateMany({
      where: { source_id: source.id, is_mock: false, finished_at: null },
      data: {
        finished_at: started,
        status: "FAILED",
        error_kind: "RUNTIME_SOURCE_LIMITATION",
        error_message: "Previous process interrupted; lock released; retrying",
      },
    });
    await db.source.update({
      where: { id: source.id },
      data: { last_sync_at: started },
    });
  }
  const log = options.dryRun
    ? null
    : await db.syncLog.create({
        data: {
          source_id: source.id,
          job_id: options.jobId,
          started_at: started,
          status: "FAILED",
          is_mock: false,
        },
      });
  let completed = 0;
  try {
    const batches: Candidate[][] = [];
    for (const pageUrl of adapter.pages.slice(
      0,
      options.maxPages || adapter.pages.length,
    )) {
      try {
        const page = await client.get(pageUrl);
        const parsed = adapter.parseList(page.html, page.url);
        if (!parsed.length)
          throw new Error(
            "Official source list returned no recognized guidance links",
          );
        batches.push(parsed.map((c) => ({ ...c, sourcePage: page.url })));
      } catch (error) {
        result.records_failed++;
        result.errors.push(`${pageUrl}: ${safeError(error)}`);
      }
    }
    // Round-robin prevents the first ICH category consuming every record slot.
    const listed: Candidate[] = [];
    for (let i = 0; i < Math.max(0, ...batches.map((b) => b.length)); i++)
      for (const batch of batches) if (batch[i]) listed.push(batch[i]);
    if (!listed.length) {
      result.status = "FAILED";
    }
    let candidates = listed.slice(0, options.limit);
    if (options.mode === "incremental" && options.limit > 1) {
      const recheckCount = Math.max(1, Math.floor(options.limit / 3));
      const stored = await db.regulation.findMany({
        where: {
          source_id: source.id,
          is_mock: false,
          canonical_url: { not: null },
        },
        orderBy: [
          { last_checked_at: { sort: "asc", nulls: "first" } },
          { id: "asc" },
        ],
        take: recheckCount,
      });
      const rechecks: Candidate[] = stored
        .filter(
          (r) =>
            !adapter.embeddedDocuments ||
            listed.some((c) => c.url === r.canonical_url),
        )
        .map((r) => ({
          url: r.canonical_url!,
          title: r.title_original,
          context: r.issuing_offices.join(" "),
        }));
      // Reserve a bounded portion for old records; recent-list reads stay bounded too.
      candidates = [
        ...new Map([...rechecks, ...listed].map((c) => [c.url, c])).values(),
      ].slice(0, options.limit);
    }
    result.records_found = candidates.length;
    const seen = new Set<string>();
    for (const candidate of candidates) {
      try {
        const detail = candidate.document
          ? { html: "", url: candidate.url }
          : await client.get(candidate.url);
        const normalized = adapter.read(
          detail.html,
          detail.url,
          candidate,
          candidate.sourcePage || adapter.pages[0],
        );
        result.warnings.push(
          ...normalized.warnings.map((w) => `${candidate.url}: ${w}`),
        );
        if (!normalized.relevant) {
          result.records_skipped++;
          completed++;
          continue;
        }
        result.records_relevant++;
        const keys = [
          normalized.data.canonical_url,
          ...(normalized.data.document_number
            ? [`number:${normalized.data.document_number}`]
            : []),
        ];
        if (keys.some((k) => seen.has(k))) {
          result.records_skipped++;
          completed++;
          continue;
        }
        keys.forEach((k) => seen.add(k));
        if (
          options.startDate &&
          normalized.data.publication_date &&
          normalized.data.publication_date < options.startDate
        ) {
          result.records_skipped++;
          completed++;
          continue;
        }
        await assertOwned();
        const outcome = await writeRecord(
          db,
          source.id,
          normalized.data,
          options.dryRun,
        );
        if (outcome === "new") result.records_new++;
        else {
          result.records_existing++;
          if (outcome === "updated") result.records_updated++;
          else result.records_skipped++;
        }
        completed++;
      } catch (error) {
        result.records_failed++;
        result.records_invalid++;
        result.errors.push(`${candidate.url}: ${safeError(error)}`);
      }
    }
    result.status = result.records_failed
      ? completed
        ? "PARTIAL_SUCCESS"
        : "FAILED"
      : "SUCCESS";
  } catch (error) {
    result.status = "FAILED";
    result.records_failed++;
    result.errors.push(safeError(error));
  }
  if (log) {
    await db.$transaction(async (tx) => {
      await tx.syncLog.update({
        where: { id: log.id },
        data: {
          finished_at: new Date(),
          status: result.status,
          records_found: result.records_found,
          records_new: result.records_new,
          records_updated: result.records_updated,
          records_failed: result.records_failed,
          error_kind: classifyFailure(result.errors),
          error_message: result.errors.length
            ? result.errors.join("\n").slice(0, 8000)
            : null,
        },
      });
      await tx.source.update({
        where: { id: source.id },
        data: {
          last_status: healthFor(result.status, result.errors),
          ...(result.status === "SUCCESS"
            ? { last_success_at: new Date() }
            : { last_failure_at: new Date() }),
        },
      });
    });
  }
  return result;
}
export async function* syncSources(
  db: Db,
  adapters: Adapter[],
  options: SyncOptions,
) {
  for (const adapter of adapters) {
    try {
      yield {
        source: adapter.code,
        ...(await syncSource(db, adapter, options)),
      };
    } catch (error) {
      yield {
        source: adapter.code,
        status: "FAILED" as const,
        errors: [safeError(error)],
      };
    }
  }
}
export async function syncSource(
  db: Db,
  adapter: Adapter,
  options: SyncOptions,
  client: HtmlClient = adapter.client,
) {
  if (options.dryRun)
    return runSource(db, adapter, options, client, async () => {});
  const lock = await acquireLock(db, "source:" + adapter.code);
  try {
    const guarded: HtmlClient = {
      get: async (url) => {
        await lock.assertOwned();
        const response = await client.get(url);
        await lock.assertOwned();
        return response;
      },
    };
    return await runSource(db, adapter, options, guarded, lock.assertOwned);
  } finally {
    await lock.release();
  }
}
