import test from "node:test";
import assert from "node:assert/strict";
import { rotateCandidates } from "../src/server/connectors/shared/rotation";
import { isAdmin, issueAdminSession, validAdminKey } from "../src/server/admin";
test("login diagnostics separate missing config, invalid key and origin without leaking secrets", async (t) => {
  const { GET, POST } = await import("../src/app/api/admin/route");
  const previous = process.env.BIOREG_ADMIN_KEY;
  const originBefore = process.env.APP_ORIGIN;
  t.after(() => {
    if (previous === undefined) delete process.env.BIOREG_ADMIN_KEY;
    else process.env.BIOREG_ADMIN_KEY = previous;
    if (originBefore === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = originBefore;
  });
  process.env.APP_ORIGIN = "https://example.org";
  const logs: unknown[][] = [];
  t.mock.method(console, "warn", (...args: unknown[]) => logs.push(args));
  const request = (key: string, origin = "https://example.org") => new Request("https://example.org/api/admin", {
    method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify({ key }),
  });
  delete process.env.BIOREG_ADMIN_KEY;
  assert.equal((await (await GET(new Request("https://example.org"))).json()).configuration, "missing");
  assert.equal((await POST(request("not-the-secret"))).status, 503);
  process.env.BIOREG_ADMIN_KEY = "short";
  assert.equal((await (await GET(new Request("https://example.org"))).json()).configuration, "invalid");
  const secret = "test-only-diagnostic-secret-".repeat(3);
  process.env.BIOREG_ADMIN_KEY = secret;
  const state = await GET(new Request("https://example.org"));
  assert.deepEqual(await state.json(), { admin: false, configuration: "ready" });
  assert.match(state.headers.get("cache-control")!, /no-store/);
  const mismatch = await POST(request("not-the-secret"));
  assert.equal(mismatch.status, 401);
  assert.equal((await mismatch.json()).code, "ADMIN_KEY_MISMATCH");
  assert.equal((await POST(request(secret, "https://other.invalid"))).status, 403);
  const login = await POST(request(secret));
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly; SameSite=Strict/);
  assert.match(cookie, /; Secure/);
  const session = await GET(new Request("https://example.org", { headers: { cookie: cookie.split(";")[0] } }));
  assert.equal((await session.json()).admin, true);
  assert.equal(JSON.stringify(logs).includes(secret), false);
  assert.equal(JSON.stringify(logs).includes("not-the-secret"), false);
});
test("public writes fail closed; signed admin sessions expire and reject tampering", (t) => {
  const previous = process.env.BIOREG_ADMIN_KEY;
  t.after(() => {
    if (previous === undefined) delete process.env.BIOREG_ADMIN_KEY;
    else process.env.BIOREG_ADMIN_KEY = previous;
  });
  process.env.BIOREG_ADMIN_KEY = "test-only-".repeat(5);
  assert.equal(isAdmin(new Request("https://example.org")), false);
  assert.equal(validAdminKey("wrong"), false);
  const token = issueAdminSession(1000);
  const request = (value: string) =>
    new Request("https://example.org", {
      headers: { cookie: "bioreg_admin=" + value },
    });
  assert.equal(isAdmin(request(token), 2000), true);
  assert.equal(isAdmin(request(token + "x"), 2000), false);
  assert.equal(isAdmin(request(token), 1000 + 8 * 3600000), false);
});
test("bounded rotations eventually cover all links despite reserved rechecks", () => {
  const list = Array.from({ length: 25 }, (_, i) => ({
    url: `https://example.org/${i}`,
    title: String(i),
    context: "",
  }));
  let cursor = 0;
  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) {
    const r = rotateCandidates(list, list.slice(0, 2), 8, cursor);
    cursor = r.nextCursor;
    assert.ok(r.candidates.length <= 8);
    assert.equal(
      new Set(r.candidates.map((x) => x.url)).size,
      r.candidates.length,
    );
    r.candidates.forEach((x) => seen.add(x.url));
  }
  assert.equal(seen.size, 25);
});

test("weekly summary includes Monday ingestion, reuses key and keeps daily keys separate", async () => {
  const { generateWeeklyDigest } =
    await import("../src/server/engagement/digest");
  const saved = new Map<string, unknown>();
  const fake = {
    digestSettings: {
      upsert: async () => ({ digest_enabled: true, timezone: "Asia/Shanghai" }),
    },
    regulation: { findMany: async () => [] },
    changeEvent: { findMany: async () => [] },
    watchlistMatch: { findMany: async () => [] },
    source: { findMany: async () => [] },
    dailyDigest: {
      upsert: async (q: {
        where: { digest_date: string };
        create: unknown;
        update: unknown;
      }) => {
        saved.set(q.where.digest_date, q.create);
        return q.create;
      },
    },
  };
  const db = fake as unknown as Parameters<typeof generateWeeklyDigest>[0];
  const monday = new Date("2026-11-02T01:30:00Z");
  const first = await generateWeeklyDigest(db, monday);
  await generateWeeklyDigest(db, monday);
  assert.equal(saved.size, 1);
  assert.equal(first!.digest_date, "weekly:2026-11-02");
  assert.equal(first!.window_start.toISOString(), "2026-10-26T16:00:00.000Z");
  assert.equal(first!.window_end.toISOString(), "2026-11-02T16:00:00.000Z");
  assert.equal(
    await generateWeeklyDigest(db, new Date("2026-11-03T01:30:00Z")),
    null,
  );
});
