import { loadEnvConfig } from "@next/env";
import { spawnSync } from "node:child_process";
import { db } from "../src/server/db";
import { sourceDefaults } from "../src/server/scheduler/config";
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");
  let connection: URL;
  try {
    connection = new URL(process.env.DATABASE_URL);
    if (!/^postgres(?:ql)?:$/.test(connection.protocol)) throw new Error();
  } catch {
    throw new Error("DATABASE_URL_INVALID");
  }
  if (
    /YOUR[-_]PASSWORD|\[.*PASSWORD.*\]/i.test(
      decodeURIComponent(connection.password),
    )
  )
    throw new Error("DATABASE_PASSWORD_PLACEHOLDER");
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 120000,
    },
  );
  if (result.status !== 0) {
    // Emit only Prisma's fixed error identifier, never its connection details.
    const code = `${result.stderr || ""}\n${result.stdout || ""}`.match(
      /\bP\d{4}\b/,
    )?.[0];
    throw new Error(
      code ||
        (result.error?.code === "ETIMEDOUT"
          ? "MIGRATION_TIMEOUT"
          : "MIGRATION_FAILED"),
    );
  }
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
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  const code =
    /^(?:P\d{4}|DATABASE_URL_MISSING|DATABASE_URL_INVALID|DATABASE_PASSWORD_PLACEHOLDER|MIGRATION_TIMEOUT|MIGRATION_FAILED)$/.test(
      message,
    )
      ? message
      : "SOURCE_PREPARATION_FAILED";
  console.error(
    `PREPARE_SYNC_FAILED (${code}): verify database configuration; credentials are not logged.`,
  );
  process.exitCode = 1;
});
