import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
export interface PerformanceMetrics {
  request_id: string;
  group: string;
  duration_ms: number;
  acquire_ms: number;
  query_ms: number;
  query_count: number;
  serialization_ms: number;
  overlapping_scopes: boolean;
  pool_total: number;
  pool_waiting: number;
}
const storage = new AsyncLocalStorage<PerformanceMetrics>();
const driver = { acquire_ms: 0, query_ms: 0, query_count: 0 };
const active = new Set<PerformanceMetrics>();
const round = (n: number) => Math.round(n * 100) / 100;
export function recordSerialization(ms: number) {
  const m = storage.getStore();
  if (m) m.serialization_ms += ms;
}
// Instrument completions only. Never retain SQL text, parameters or credentials.
function timed<T extends (...args: never[]) => unknown>(
  fn: T,
  kind: "acquire" | "query",
): T {
  return function (this: unknown, ...args: unknown[]) {
    const start = performance.now();
    let recorded = false;
    const finish = () => {
      if (recorded) return;
      recorded = true;
      const ms = performance.now() - start;
      if (kind === "query") {
        driver.query_ms += ms;
        driver.query_count++;
      } else driver.acquire_ms += ms;
    };
    const last = args.length - 1;
    if (typeof args[last] === "function") {
      const cb = args[last] as (...values: unknown[]) => unknown;
      args[last] = (...values: unknown[]) => {
        finish();
        return cb(...values);
      };
    }
    try {
      const result = Reflect.apply(fn, this, args);
      if (result && typeof result.then === "function")
        return result.then(
          (value: unknown) => {
            finish();
            return value;
          },
          (e: unknown) => {
            finish();
            throw e;
          },
        );
      return result;
    } catch (e) {
      finish();
      throw e;
    }
  } as unknown as T;
}
export function instrumentPool(pool: Pool) {
  const seen = new WeakSet<PoolClient>();
  pool.on("connect", (client: PoolClient) => {
    if (seen.has(client)) return;
    seen.add(client);
    client.query = timed(client.query, "query");
  });
  pool.connect = timed(pool.connect, "acquire");
  pool.on("acquire", () => {
    for (const m of active) {
      m.pool_total = Math.max(m.pool_total, pool.totalCount);
      m.pool_waiting = Math.max(m.pool_waiting, pool.waitingCount);
    }
  });
  return pool;
}
export async function measure<T>(group: string, work: () => Promise<T>) {
  const m: PerformanceMetrics = {
    request_id: randomUUID(),
    group,
    duration_ms: 0,
    acquire_ms: 0,
    query_ms: 0,
    query_count: 0,
    serialization_ms: 0,
    overlapping_scopes: active.size > 0,
    pool_total: 0,
    pool_waiting: 0,
  };
  const start = performance.now();
  const before = { ...driver };
  if (active.size) for (const other of active) other.overlapping_scopes = true;
  active.add(m);
  let value: T;
  try {
    value = await storage.run(m, work);
  } finally {
    active.delete(m);
  }
  // Driver callbacks may cross Prisma engine async contexts. These are runtime
  // window totals, not per-request attribution when overlapping_scopes=true.
  m.acquire_ms = driver.acquire_ms - before.acquire_ms;
  m.query_ms = driver.query_ms - before.query_ms;
  m.query_count = driver.query_count - before.query_count;
  m.duration_ms = performance.now() - start;
  for (const k of [
    "duration_ms",
    "acquire_ms",
    "query_ms",
    "serialization_ms",
  ] as const)
    m[k] = round(m[k]);
  return { value, metrics: m };
}
export async function measuredResponse(
  group: string,
  work: () => Promise<Response>,
) {
  const { value, metrics: m } = await measure(group, work);
  value.headers.set(
    "Server-Timing",
    `app;dur=${m.duration_ms}, acquire;dur=${m.acquire_ms}, query;dur=${m.query_ms}, serialize;dur=${m.serialization_ms}, queries;desc="${m.query_count}", overlap;desc="${m.overlapping_scopes}"`,
  );
  value.headers.set("X-Request-Id", m.request_id);
  value.headers.set("X-BioReg-Commit", process.env.COMMIT_REF || "local");
  console.info("BioReg performance", m);
  return value;
}
