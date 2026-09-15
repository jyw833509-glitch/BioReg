import { loadEnvConfig } from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "../src/server/db";
import {
  dashboardAggregateQuery,
  getDashboard,
} from "../src/server/repositories/dashboard-repository";
import { Prisma } from "../src/generated/prisma/client";
import { measure } from "../src/server/performance";
async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Local database required");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname))
    throw new Error("This EXPLAIN diagnostic is restricted to local databases");
  const client = createClient(url);
  try {
    const dashboard = await measure("dashboard.local", () =>
      getDashboard(client),
    );
    const plans = {
      aggregate: await client.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${dashboardAggregateQuery()}`,
      ),
      array:
        await client.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM regulations WHERE categories @> ARRAY['CMC / Quality']::text[] AND is_mock=false LIMIT 20`,
      search:
        await client.$queryRaw`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id FROM regulations WHERE title_original ILIKE '%biologic%' AND is_mock=false LIMIT 20`,
    };
    const indexes =
      await client.$queryRaw`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() ORDER BY tablename,indexname`;
    const result = {
      at: new Date().toISOString(),
      scope: "local only; not production query plans",
      regulations: dashboard.value.total,
      metrics: dashboard.metrics,
      plans,
      indexes,
    };
    mkdirSync(".data", { recursive: true });
    writeFileSync(
      ".data/performance-query-plans.json",
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({
        scope: result.scope,
        regulations: result.regulations,
        metrics: result.metrics,
        plansSaved: true,
      }),
    );
  } finally {
    await client.$disconnect();
  }
}
main().catch(() => {
  console.error("Local performance diagnostics failed");
  process.exitCode = 1;
});
