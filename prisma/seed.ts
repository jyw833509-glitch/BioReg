import { loadEnvConfig } from "@next/env";
import { directDb } from "../src/server/direct-db";
import { seedDatabase } from "./seed-data";
loadEnvConfig(process.cwd());
async function main() {
  const client = directDb();
  try {
    await seedDatabase(client);
    console.log(
      "Seed Success: 6 sources, 15 Development / Mock regulations, version history, 5 mock logs, 1 watchlist. Existing rows are preserved.",
    );
  } finally {
    await client.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "SEED_FAILED: check connection and migrations; credentials are not logged.",
  );
  process.exitCode = 1;
});
