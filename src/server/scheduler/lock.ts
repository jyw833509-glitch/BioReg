import { Client } from "pg";
import { connectionFor, type Db } from "../db";
export class SyncBusyError extends Error {}
// A dedicated PostgreSQL session owns the lock throughout network requests.
// Process termination releases it; there is no expiring lease that permits overlap.
export async function acquireLock(db: Db, name: string) {
  const connectionString = connectionFor(db);
  const schema =
    new URL(connectionString).searchParams.get("schema") || "public";
  const key = `bioreg:${schema}:${name}`;
  const session = new Client({
    connectionString,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });
  let lost = false;
  session.on("error", () => {
    lost = true;
  });
  try {
    await session.connect();
    const result = await session.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
      [key],
    );
    if (!result.rows[0].locked)
      throw new SyncBusyError(`Sync already running: ${name}`);
  } catch (error) {
    await session.end().catch(() => {});
    throw error;
  }
  return {
    assertOwned: async () => {
      if (lost) throw new Error("Database lock connection lost; sync stopped");
      await session.query("SELECT 1");
    },
    release: async () => {
      await session.end().catch(() => {});
    },
  };
}
