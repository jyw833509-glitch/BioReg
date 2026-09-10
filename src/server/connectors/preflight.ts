import type { Db } from "../db";
import { adapters } from "./registry";

// Read-only local prerequisites. Does not claim the eventual cloud network works.
export async function sourcePreflight(client: Db, now = new Date()) {
  const results = [];
  for (const adapter of Object.values(adapters)) {
    const source = await client.source.findUnique({
      where: { code: adapter.code },
      include: {
        sync_logs: {
          where: { is_mock: false },
          orderBy: [{ started_at: "desc" }, { id: "desc" }],
          take: 2,
        },
        _count: { select: { regulations: { where: { is_mock: false } } } },
      },
    });
    const blockers: string[] = [];
    if (!source?.enabled) blockers.push("SOURCE_MISSING_OR_DISABLED");
    if (!source?._count.regulations) blockers.push("NO_REAL_RECORDS");
    const logs = source?.sync_logs || [];
    if (
      logs.length < 2 ||
      logs.some(
        (log) =>
          log.status !== "SUCCESS" ||
          !log.finished_at ||
          log.records_failed > 0 ||
          log.records_found === 0,
      )
    )
      blockers.push("TWO_CONSECUTIVE_NONEMPTY_SUCCESSFUL_RUNS_REQUIRED");
    if (
      !logs[0]?.finished_at ||
      now.getTime() - logs[0].finished_at.getTime() > 24 * 60 * 60 * 1000
    )
      blockers.push("NO_SUCCESS_WITHIN_24_HOURS");
    const incomplete = source
      ? await client.regulation.count({
          where: {
            source_id: source.id,
            is_mock: false,
            OR: [
              { official_url: null },
              { canonical_url: null },
              { content_hash: null },
              { versions: { none: {} } },
            ],
          },
        })
      : 0;
    if (incomplete) blockers.push("RECORDS_MISSING_PROVENANCE_OR_VERSION");
    results.push({
      source: adapter.code,
      official_records: source?._count.regulations || 0,
      latest_status: logs[0]?.status || null,
      latest_error: logs[0]?.error_message || null,
      result: blockers.length ? "FAIL" : "PASS",
      blockers,
    });
  }
  return {
    checked_at: now.toISOString(),
    scope:
      "Local data-layer prerequisites; cloud network validation is separate",
    result: results.every((r) => r.result === "PASS") ? "PASS" : "FAIL",
    sources: results,
  };
}
