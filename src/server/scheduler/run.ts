import type { Db } from "../db";
import type { Adapter } from "../connectors/shared/types";
import { syncSource, type SyncOptions } from "../connectors/shared/sync";
import { acquireLock, SyncBusyError } from "./lock";
import { healthFor, classifyFailure, safeError } from "./health";
import type { Prisma } from "../../generated/prisma/client";

export interface SchedulerOptions extends SyncOptions {
  trigger?: "scheduled" | "manual" | "cli";
  dueOnly?: boolean;
}
export function isDue(
  source: { last_sync_at: Date | null; sync_frequency: number },
  now: Date,
) {
  return (
    !source.last_sync_at ||
    now.getTime() - source.last_sync_at.getTime() >=
      source.sync_frequency * 3600000
  );
}
export function globalStatus(rows: { status: string }[]) {
  const attempted = rows.filter((r) => !r.status.startsWith("SKIPPED"));
  if (!attempted.length) return "SKIPPED";
  if (attempted.every((r) => r.status === "SUCCESS")) return "SUCCESS";
  return attempted.some((r) => r.status !== "FAILED")
    ? "PARTIAL_SUCCESS"
    : "FAILED";
}
export async function runScheduler(
  db: Db,
  adapters: Adapter[],
  options: SchedulerOptions,
) {
  if (options.trigger === "scheduled" && options.mode !== "incremental")
    throw new Error("Scheduled runs must be incremental");
  if (
    !adapters.length ||
    new Set(adapters.map((a) => a.code)).size !== adapters.length
  )
    throw new Error("Expected unique sources");
  const started = new Date();
  const rows: Array<Record<string, string | number | boolean | null>> = [];
  const report = {
    job_id: null as string | null,
    trigger: options.trigger || "cli",
    mode: options.mode,
    dry_run: !!options.dryRun,
    started_at: started.toISOString(),
    finished_at: "",
    duration_ms: 0,
    status: "RUNNING",
    sources: rows,
  };
  let lock;
  try {
    if (!options.dryRun) lock = await acquireLock(db, "scheduler");
  } catch (error) {
    if (!(error instanceof SyncBusyError)) throw error;
    return {
      ...report,
      finished_at: new Date().toISOString(),
      status: "SKIPPED",
      reason: "GLOBAL_JOB_ALREADY_RUNNING",
    };
  }
  try {
    if (!options.dryRun) {
      await db.syncJob.updateMany({
        where: { status: "RUNNING" },
        data: {
          status: "FAILED",
          finished_at: started,
          summary: {
            error:
              "Previous scheduler process interrupted; retry can run without stale lock",
          },
        },
      });
      const job = await db.syncJob.create({
        data: {
          trigger: report.trigger,
          mode: options.mode,
          started_at: started,
        },
      });
      report.job_id = job.id;
    }
    for (const adapter of adapters) {
      const start = new Date();
      const source = await db.source.findUnique({
        where: { code: adapter.code },
      });
      const base = {
        source: adapter.code,
        started_at: start.toISOString(),
        records_found: 0,
        records_new: 0,
        records_updated: 0,
        records_failed: 0,
      };
      if (
        !source?.enabled ||
        (options.dueOnly &&
          source.last_status !== "DISABLED" &&
          isDue(source, start) === false)
      ) {
        if (source && !source.enabled && !options.dryRun)
          await db.source.update({
            where: { id: source.id },
            data: { last_status: "DISABLED" },
          });
        rows.push({
          ...base,
          finished_at: new Date().toISOString(),
          duration_ms: 0,
          status: !source
            ? "FAILED"
            : !source.enabled
              ? "SKIPPED_DISABLED"
              : "SKIPPED_NOT_DUE",
          health: !source
            ? "UNAVAILABLE"
            : !source.enabled
              ? "DISABLED"
              : source.last_status,
          error_kind: !source ? "CONFIGURATION_ERROR" : null,
        });
        continue;
      }
      try {
        await lock?.assertOwned();
        const result = await syncSource(db, adapter, {
          ...options,
          jobId: report.job_id || undefined,
        });
        rows.push({
          ...base,
          records_found: result.records_found,
          records_new: result.records_new,
          records_updated: result.records_updated,
          records_failed: result.records_failed,
          records_skipped: result.records_skipped,
          status: result.status,
          health: healthFor(result.status, result.errors),
          error_kind: classifyFailure(result.errors),
          error: result.errors.join("\n").slice(0, 8000),
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - start.getTime(),
        });
      } catch (error) {
        const busy = error instanceof SyncBusyError;
        const message = safeError(error);
        const health = busy
          ? source.last_status
          : healthFor("FAILED", [message]);
        rows.push({
          ...base,
          status: busy ? "SKIPPED_RUNNING" : "FAILED",
          health,
          error: message,
          error_kind: busy ? null : classifyFailure([message]),
          records_failed: busy ? 0 : 1,
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - start.getTime(),
        });
        if (!busy && !options.dryRun) {
          const logs = await db.syncLog.updateMany({
            where: {
              job_id: report.job_id,
              source_id: source.id,
              finished_at: null,
            },
            data: {
              finished_at: new Date(),
              status: "FAILED",
              records_failed: 1,
              error_message: message,
              error_kind: classifyFailure([message]),
            },
          });
          if (!logs.count)
            await db.syncLog.create({
              data: {
                job_id: report.job_id,
                source_id: source.id,
                started_at: start,
                finished_at: new Date(),
                status: "FAILED",
                records_failed: 1,
                error_message: message,
                error_kind: classifyFailure([message]),
              },
            });
          await db.source.update({
            where: { id: source.id },
            data: {
              last_sync_at: start,
              last_failure_at: new Date(),
              last_status: health,
            },
          });
        }
      }
    }
    report.status = globalStatus(rows as { status: string }[]);
  } catch (error) {
    report.status = "FAILED";
    rows.push({
      source: "SCHEDULER",
      status: "FAILED",
      error: safeError(error),
    });
  } finally {
    report.finished_at = new Date().toISOString();
    report.duration_ms = Date.now() - started.getTime();
    try {
      if (report.job_id)
        await db.syncJob.update({
          where: { id: report.job_id },
          data: {
            finished_at: new Date(report.finished_at),
            status: report.status,
            summary: report as unknown as Prisma.InputJsonObject,
          },
        });
    } finally {
      await lock?.release();
    }
  }
  return report;
}
