import { loadEnvConfig } from "@next/env";
import { db } from "../src/server/db";
import { sourcePreflight } from "../src/server/connectors/preflight";
loadEnvConfig(process.cwd());
async function main() {
  const client = db();
  try {
    const report = await sourcePreflight(client);
    console.log(JSON.stringify(report, null, 2));
    if (report.result !== "PASS") process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "SOURCE_PREFLIGHT_FAILED: check database connection; credentials are not logged.",
  );
  process.exitCode = 1;
});
