import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import { db } from "../src/server/db";
import { sourceDefaults } from "../src/server/scheduler/config";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL secret is required");
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
    },
  );
  if (result.status !== 0)
    throw new Error(
      "Database migration failed; verify connectivity and migration permissions. Connection details are suppressed.",
    );
  const client = db();
  try {
    for (const source of sourceDefaults)
      await client.source.upsert({
        where: { code: source.code },
        update: {},
        create: { ...source, id: `source-${source.code.toLowerCase()}` },
      });
    console.log(
      "Migrations applied; six Source configurations ensured. No mock data seeded.",
    );
  } finally {
    await client.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "PREPARE_SYNC_FAILED: configure DATABASE_URL and verify database access; credentials are not logged.",
  );
  process.exitCode = 1;
});
