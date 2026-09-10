import { loadEnvConfig } from "@next/env";
import { parseArgs } from "node:util";
import { db } from "../src/server/db";
import { syncFda } from "../src/server/connectors/fda/sync";
import { parseDate } from "../src/server/connectors/fda/normalizer";
loadEnvConfig(process.cwd());
async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      limit: { type: "string", default: "10" },
      mode: { type: "string", default: "incremental" },
      "start-date": { type: "string" },
    },
    strict: true,
  });
  if (values.mode !== "initial" && values.mode !== "incremental")
    throw new Error("mode must be initial or incremental");
  const startDate = values["start-date"]
    ? parseDate(values["start-date"])
    : undefined;
  if (values["start-date"] && !startDate)
    throw new Error("start-date must contain a valid complete date");
  const client = db();
  try {
    const result = await syncFda(client, {
      mode: values.mode,
      limit: Number(values.limit),
      dryRun: values["dry-run"],
      startDate: startDate || undefined,
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "SUCCESS") process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error && !/Prisma/.test(error.name)
      ? error.message
      : "FDA sync failed; check database configuration",
  );
  process.exitCode = 1;
});
