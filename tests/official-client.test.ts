import test from "node:test";
import assert from "node:assert/strict";
import { OfficialClient } from "../src/server/connectors/shared/client";

test("HTTP 200 denial pages are rejected even without Content-Type and never retried", async (t) => {
  const request = t.mock.method(globalThis, "fetch", async () => {
    const response = new Response(
      "<html><head><title>Sorry - 97138931</title></head><body><h1>Access denied</h1></body></html>",
    );
    response.headers.delete("content-type");
    return response;
  });
  const client = new OfficialClient((u) => u, 0, 1000, 2);
  await assert.rejects(
    client.get("https://www.ema.europa.eu/example"),
    /Access denied.*HTTP 200/,
  );
  assert.equal(request.mock.callCount(), 1);
});

test("202 verification pages never become data or trigger repeated requests", async (t) => {
  const request = t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("<h1>Verification</h1>", { status: 202 }),
  );
  const client = new OfficialClient((u) => u, 0, 1000, 2);
  await assert.rejects(
    client.get("https://www.cde.org.cn/example"),
    /HTTP 202/,
  );
  assert.equal(request.mock.callCount(), 1);
});

test("Transient HTTP errors retry finitely with a timeout signal", async (t) => {
  let calls = 0;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.ok(init.signal);
      return ++calls === 1
        ? new Response("Unavailable", { status: 503 })
        : new Response("<h1>Guidance</h1>", {
            headers: { "Content-Type": "text/html" },
          });
    },
  );
  const client = new OfficialClient((u) => u, 0, 1000, 1);
  assert.match(
    (await client.get("https://www.fda.gov/example")).html,
    /Guidance/,
  );
  assert.equal(calls, 2);
});
