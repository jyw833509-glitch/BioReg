import test from "node:test";
import assert from "node:assert/strict";
import { createReadCache } from "../src/server/read-cache";

test("public cache coalesces concurrent reads, expires without serving stale values and separates filters", async () => {
  let time = 0,
    calls = 0;
  const cache = createReadCache(2, 30, () => time);
  const load = async () => ++calls;
  assert.deepEqual(
    await Promise.all([cache.read("FDA", load), cache.read("FDA", load)]),
    [1, 1],
  );
  assert.equal(await cache.read("EMA", load), 2);
  time = 29;
  assert.equal(await cache.read("FDA", load), 1);
  time = 30;
  assert.equal(await cache.read("FDA", load), 3);
  assert.equal(calls, 3);
  time = 60;
  await assert.rejects(cache.read("FDA", async () => { throw new Error("offline"); }));
  assert.equal(await cache.read("FDA", load), 4);
});
test("cache rejects failed loads, retries and evicts least recently used entries", async () => {
  const cache = createReadCache(2);
  let calls = 0;
  const load = async () => ++calls;
  await assert.rejects(
    cache.read("failure", async () => {
      throw new Error("DB unavailable");
    }),
  );
  assert.equal(await cache.read("failure", load), 1);
  await cache.read("B", load);
  await cache.read("C", load);
  assert.equal(await cache.read("failure", load), 4);
});
