import { parseArgs } from "node:util";
import { loadEnvConfig } from "@next/env";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { db } from "../src/server/db";
import { adapters } from "../src/server/connectors/registry";
import { runScheduler } from "../src/server/scheduler/run";
import { safeError } from "../src/server/scheduler/health";
import { calendarDate } from "../src/server/validation";
loadEnvConfig(process.cwd());
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    strict: true,
    options: {
      "dry-run": { type: "boolean" },
      due: { type: "boolean" },
      trigger: { type: "string", default: "cli" },
      mode: { type: "string", default: "incremental" },
      limit: { type: "string", default: "8" },
      "max-pages": { type: "string" },
      "start-date": { type: "string" },
    },
  });
  const requested = positionals[0]?.toUpperCase();
  const codes = requested === "ALL" ? Object.keys(adapters) : [requested];
  if (positionals.length !== 1 || codes.some((c) => !c || !adapters[c]))
    throw new Error("Use sync <all|fda|ema|nmpa|cde|ich|pmda>");
  if (!["initial", "incremental"].includes(values.mode))
    throw new Error("Invalid mode");
  if (!["cli", "scheduled", "manual"].includes(values.trigger))
    throw new Error("Invalid trigger");
  const limit = Number(values.limit),
    maxPages = values["max-pages"] ? Number(values["max-pages"]) : undefined;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("limit must be 1..100");
  if (
    maxPages !== undefined &&
    (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 4)
  )
    throw new Error("max-pages must be 1..4");
  const startDate = values["start-date"]
    ? new Date(calendarDate.parse(values["start-date"]))
    : undefined;
  const client = db();
  try {
    const report = await runScheduler(
      client,
      codes.map((code) => adapters[code]),
      {
        mode: values.mode as "initial" | "incremental",
        limit,
        maxPages,
        startDate,
        dryRun: values["dry-run"],
        dueOnly: values.due,
        trigger: values.trigger as "cli" | "scheduled" | "manual",
      },
    );
    console.log(JSON.stringify(report, null, 2));
    mkdirSync(".data", { recursive: true });
    writeFileSync(".data/sync-summary.json", JSON.stringify(report, null, 2));
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `## Regulatory Sync\n\nJob: ${report.job_id} · ${report.status}\n\n` +
          "| Source | Health | Result | Found | New | Updated | Failed |\n|---|---|---|---:|---:|---:|---:|\n" +
          report.sources
            .map(
              (r) =>
                `| ${[r.source, r.health, r.status, r.records_found, r.records_new, r.records_updated, r.records_failed].join(" | ")} |`,
            )
            .join("\n") +
          "\n",
      );
    process.exitCode =
      report.status === "FAILED"
        ? 1
        : report.status === "PARTIAL_SUCCESS"
          ? 2
          : 0;
  } finally {
    await client.$disconnect();
  }
}
main().catch((e) => {
  console.error(e.name === "ZodError" ? "Invalid arguments" : safeError(e));
  process.exitCode = 1;
});
