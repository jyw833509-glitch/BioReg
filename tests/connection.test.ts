import assert from "node:assert/strict";
import { test } from "node:test";
import { directConnection } from "../src/server/direct-db";

test("CLI requires its own connection and rejects Supabase transaction mode", () => {
  const saved = process.env.DIRECT_URL;
  const runtime = process.env.DATABASE_URL;
  try {
    process.env.DATABASE_URL = "postgresql://placeholder@localhost/runtime";
    delete process.env.DIRECT_URL;
    assert.throws(directConnection, /DIRECT_URL_REQUIRED/);
    process.env.DIRECT_URL = "postgresql://placeholder@example.pooler.supabase.com:6543/postgres";
    assert.throws(directConnection, /DIRECT_URL_SESSION_REQUIRED/);
    process.env.DIRECT_URL = "postgresql://placeholder@example.pooler.supabase.com:5432/postgres";
    assert.equal(directConnection(), process.env.DIRECT_URL);
    assert.notEqual(directConnection(), process.env.DATABASE_URL);
  } finally {
    if (saved === undefined) delete process.env.DIRECT_URL;
    else process.env.DIRECT_URL = saved;
    if (runtime === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = runtime;
  }
});
