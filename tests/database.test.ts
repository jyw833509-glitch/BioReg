import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { createClient, type Db } from "../src/server/db";
import { seedDatabase } from "../prisma/seed-data";
import { regulationRepository } from "../src/server/repositories/regulation-repository";
import { regulationVersionRepository } from "../src/server/repositories/regulation-version-repository";
import { sourceRepository } from "../src/server/repositories/source-repository";
import { syncLogRepository } from "../src/server/repositories/sync-log-repository";
import { watchlistRepository } from "../src/server/repositories/watchlist-repository";
import { getDashboard } from "../src/server/repositories/dashboard-repository";
import {
  querySchema,
  parseQuery,
  watchlistSchema,
} from "../src/server/validation";
import { sameOrigin } from "../src/server/http";
import { readFileSync } from "node:fs";
import {
  parseList,
  parseDetail,
  RECENT_URL,
} from "../src/server/connectors/fda/parser";
import { normalize } from "../src/server/connectors/fda/normalizer";
import { writeRecord } from "../src/server/connectors/fda/writer";
import { syncFda } from "../src/server/connectors/fda/sync";
import { adapters } from "../src/server/connectors/registry";
import { syncSource, syncSources } from "../src/server/connectors/shared/sync";
import { sourcePreflight } from "../src/server/connectors/preflight";
import { runScheduler } from "../src/server/scheduler/run";
import { acquireLock, SyncBusyError } from "../src/server/scheduler/lock";
import { normalizeDocument } from "../src/server/connectors/shared/normalizer";
import type { Adapter } from "../src/server/connectors/shared/types";
import type { Prisma } from "../src/generated/prisma/client";
loadEnvConfig(process.cwd());
const schema = "bioreg_test_" + randomUUID().replaceAll("-", "");
let client: Db;
let admin: Db;
let testUrl: string;
function migration() {
  const result = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl },
      encoding: "utf8",
      windowsHide: true,
    },
  );
  assert.equal(
    result.status,
    0,
    "Prisma migration failed in isolated test schema",
  );
}
before(async () => {
  const original = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  assert.ok(
    original,
    "A PostgreSQL DATABASE_URL is required; database tests are never silently skipped.",
  );
  admin = createClient(original);
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  const url = new URL(original);
  url.searchParams.set("schema", schema);
  testUrl = url.toString();
  migration();
  client = createClient(testUrl);
});
after(async () => {
  await client?.$disconnect();
  if (admin) {
    assert.match(schema, /^bioreg_test_[a-f0-9]{32}$/);
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
});
function data(id: string): Prisma.RegulationUncheckedCreateInput {
  return {
    id,
    source_id: "source-fda",
    regulator: "FDA",
    country_or_region: "United States",
    title_original: `Development / Mock Data ${id}`,
    title_zh: `开发示例 ${id}`,
    document_number: `TEST-${id}`,
    document_type: "DRAFT_GUIDANCE",
    status: "DRAFT",
    publication_date: new Date("2000-01-01"),
    importance_level: "LOW",
    keywords: ["UniqueKeyword"],
    categories: ["Test Category"],
    product_types: ["Vaccine"],
    development_stages: ["Phase I"],
    affected_departments: ["QA"],
    official_summary: null,
    official_url: null,
    is_mock: true,
  };
}
test("PostgreSQL connection and repeatable migration", async () => {
  const rows = await client.$queryRaw<{ version: string }[]>`SELECT version()`;
  assert.match(rows[0].version, /PostgreSQL/);
  migration();
  assert.equal(await client.source.count(), 0);
});
test("empty database returns zero aggregates and empty paginated results", async () => {
  const dashboard = await getDashboard(client);
  assert.equal(dashboard.total, 0);
  assert.equal(dashboard.todayNew, 0);
  assert.equal(dashboard.monitoredAgencies, 0);
  for (const result of [
    await regulationRepository(client).list(),
    await regulationRepository(client).getToday(),
    await regulationRepository(client).getUpdated(),
  ]) {
    assert.equal(result.data.length, 0);
    assert.equal(result.pagination.total, 0);
    assert.equal(result.pagination.totalPages, 1);
  }
});
test("idempotent seed preserves records and keeps every fixture explicitly mock", async () => {
  await seedDatabase(client);
  const before = await client.regulation.count();
  const versions = await client.regulationVersion.count();
  await seedDatabase(client);
  assert.equal(before, 15);
  assert.equal(await client.regulation.count(), before);
  assert.equal(await client.regulationVersion.count(), versions);
  assert.equal(await client.source.count(), 6);
  assert.equal(await client.syncLog.count(), 5);
  assert.equal(await client.watchlist.count(), 1);
  assert.equal(await client.regulation.count({ where: { is_mock: false } }), 0);
  assert.equal(
    await client.regulation.count({ where: { official_url: { not: null } } }),
    0,
  );
});
test("source codes and Source → Regulation / SyncLog relations", async () => {
  const repo = sourceRepository(client);
  assert.equal((await repo.list()).length, 6);
  assert.notEqual(
    (await repo.getByCode("NMPA"))?.id,
    (await repo.getByCode("CDE"))?.id,
  );
  const source = await client.source.findUniqueOrThrow({
    where: { code: "FDA" },
    include: { regulations: true, sync_logs: true },
  });
  assert.equal(source.regulations.length, 3);
  assert.equal(source.sync_logs.length, 1);
  await assert.rejects(
    regulationRepository(client).create({
      ...data("wrong-source"),
      source_id: "source-ema",
    }),
  );
});
test("Regulation create, read, update and explicit upsert use the unified repository", async () => {
  const repo = regulationRepository(client);
  await repo.create(data("crud"));
  assert.equal((await repo.getById("crud"))?.title_zh, "开发示例 crud");
  await repo.update("crud", { title_zh: "更新的系统译文" });
  assert.equal((await repo.getById("crud"))?.title_zh, "更新的系统译文");
  await repo.upsert("crud", data("crud"), { summary_zh: "System summary" });
  assert.equal((await repo.getById("crud"))?.summary_zh, "System summary");
  assert.equal(await repo.getById("missing"), null);
});
test("database-level search includes Chinese, original title, document number and keywords", async () => {
  const repo = regulationRepository(client);
  for (const q of [
    "治疗性蛋白",
    "Manufacturing changes",
    "DEMO-FDA-001",
    "UniqueKeyword",
  ])
    assert.ok((await repo.search(q)).pagination.total > 0, q);
  assert.equal((await repo.search("' OR 1=1 --")).pagination.total, 0);
  await repo.create({
    ...data("official-summary"),
    is_mock: false,
    official_url: "https://www.fda.gov/example",
    canonical_url: "https://www.fda.gov/example",
    official_summary: "OfficialSummarySearchFixture",
  });
  assert.equal(
    (await repo.search("OfficialSummarySearchFixture")).data[0].id,
    "official-summary",
  );
});
test("database filters for regulator, status, importance, date and multi-value fields", async () => {
  const repo = regulationRepository(client);
  assert.ok(
    (await repo.filter({ regulator: "EMA" })).data.every(
      (r) => r.regulator === "EMA",
    ),
  );
  assert.ok(
    (await repo.filter({ status: "DRAFT" })).data.every(
      (r) => r.status === "Draft",
    ),
  );
  assert.ok(
    (await repo.filter({ importance_level: "CRITICAL" })).data.every(
      (r) => r.importance_level === "Critical",
    ),
  );
  const rows = (
    await repo.filter({
      date: "2000-01-01",
      dateTo: "2000-01-01",
      categories: "Test Category",
      product_types: "Vaccine",
      development_stages: "Phase I",
      affected_departments: "QA",
      document_type: "DRAFT_GUIDANCE",
    })
  ).data;
  assert.ok(rows.length > 0);
  assert.ok(rows.every((r) => r.publication_date === "2000-01-01"));
  assert.equal(
    (await repo.filter({ regulator: "EMA", categories: "Test Category" }))
      .pagination.total,
    0,
  );
});
test("database pagination never returns the full dataset and sorting is deterministic", async () => {
  const repo = regulationRepository(client);
  for (let i = 0; i < 25; i++)
    await repo.create({
      ...data(`page-${i}`),
      keywords: ["PaginationFixture"],
    });
  const first = await repo.search("PaginationFixture", {
    page: 1,
    pageSize: 20,
  });
  const second = await repo.search("PaginationFixture", {
    page: 2,
    pageSize: 20,
  });
  assert.equal(first.pagination.total, 25);
  assert.equal(first.pagination.totalPages, 2);
  assert.equal(first.data.length, 20);
  assert.equal(second.data.length, 5);
  assert.equal(
    new Set([...first.data, ...second.data].map((r) => r.id)).size,
    25,
  );
  for (const sort of [
    "Newest",
    "Recently Updated",
    "Importance",
    "Regulator",
  ] as const) {
    const a = await repo.list({ sort, pageSize: 2 });
    const b = await repo.list({ sort, pageSize: 2 });
    assert.deepEqual(
      a.data.map((r) => r.id),
      b.data.map((r) => r.id),
    );
  }
  assert.equal(
    (await repo.list({ sort: "Importance", pageSize: 1 })).data[0]
      .importance_level,
    "Critical",
  );
});
test("Today, Updates, recent and high-priority queries read PostgreSQL", async () => {
  const repo = regulationRepository(client);
  assert.ok((await repo.getToday()).pagination.total >= 15);
  assert.ok((await repo.getUpdated()).pagination.total >= 15);
  assert.equal((await repo.getRecent(3)).data.length, 3);
  assert.ok(
    (await repo.getHighPriority()).every((r) =>
      ["Critical", "High"].includes(r.importance_level),
    ),
  );
});
test("version relation, explicit append, immutable history and parent consistency", async () => {
  const repo = regulationVersionRepository(client);
  const before = await repo.list("mock-1");
  assert.equal(before.length, 2);
  const latest = before[0];
  await repo.create({
    id: "explicit-v3",
    regulation_id: "mock-1",
    version_name: "3.0",
    publication_date: new Date("2026-09-09"),
    status: "FINAL",
    content_snapshot: "Development / Mock Data — explicitly supplied snapshot",
    previous_version_id: latest.id,
    change_detected: "Supplied fixture version",
  });
  assert.equal((await repo.list("mock-1")).length, 3);
  assert.equal(
    (await repo.list("mock-1")).find((v) => v.id === latest.id)
      ?.content_snapshot,
    latest.content_snapshot,
  );
  await assert.rejects(
    client.regulationVersion.update({
      where: { id: latest.id },
      data: { content_snapshot: "overwrite" },
    }),
  );
  await assert.rejects(
    repo.create({
      regulation_id: "mock-2",
      version_name: "bad",
      status: "DRAFT",
      publication_date: new Date(),
      content_snapshot: "Invalid parent",
      previous_version_id: latest.id,
    }),
  );
});
test("deduplication indexes allow null identities but reject same-source duplicates", async () => {
  const repo = regulationRepository(client);
  await assert.rejects(
    repo.create({ ...data("duplicate"), document_number: "DEMO-FDA-001" }),
  );
  await repo.create({
    ...data("nullable-a"),
    document_number: null,
    title_original: "Generic title",
    publication_date: new Date("2000-01-01"),
  });
  await repo.create({
    ...data("nullable-b"),
    document_number: null,
    title_original: "Generic title",
    publication_date: new Date("2000-01-02"),
  });
  await assert.rejects(
    repo.create({
      ...data("nullable-duplicate"),
      document_number: null,
      title_original: "Generic title",
      publication_date: new Date("2000-01-01"),
    }),
  );
  await assert.rejects(
    repo.create({ ...data("empty-number"), document_number: "" }),
  );
});
test("SyncLog accepts writes, enforces source foreign key and nonnegative counts", async () => {
  const repo = syncLogRepository(client);
  await repo.create({
    source_id: "source-fda",
    started_at: new Date(),
    status: "PARTIAL_SUCCESS",
    records_found: 2,
    records_new: 1,
    records_failed: 1,
    is_mock: true,
  });
  assert.ok((await repo.list()).some((l) => l.status === "PARTIAL_SUCCESS"));
  await assert.rejects(
    repo.create({
      source_id: "missing",
      started_at: new Date(),
      status: "FAILED",
    }),
  );
  await assert.rejects(
    repo.create({
      source_id: "source-fda",
      started_at: new Date(),
      status: "FAILED",
      records_failed: -1,
    }),
  );
});
test("Watchlist saves, updates and survives a separate client connection", async () => {
  const repo = watchlistRepository(client);
  const input = watchlistSchema.parse({
    name: "Persistent watch",
    regulators: ["FDA", "CDE"],
    keywords: ["CMC"],
  });
  const row = await repo.create(input);
  await repo.update(row.id, { ...input, enabled: false });
  const other = createClient(testUrl);
  try {
    assert.equal(
      (await watchlistRepository(other).getById(row.id))?.enabled,
      false,
    );
  } finally {
    await other.$disconnect();
  }
  await repo.remove(row.id);
  assert.equal(await repo.getById(row.id), null);
});
test("API inputs and same-origin write boundary are validated", () => {
  assert.equal(
    parseQuery({ status: "Draft", document_type: "Final Guidance" })
      .document_type,
    "FINAL_GUIDANCE",
  );
  assert.throws(() => querySchema.parse({ page: 0 }));
  assert.throws(() => querySchema.parse({ pageSize: 101 }));
  assert.throws(() => parseQuery({ date: "2026-02-30" }));
  assert.throws(() =>
    watchlistSchema.parse({ name: "x", regulators: ["BAD"] }),
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3000/api/watchlists", {
        headers: { origin: "https://evil.example" },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3000/api/watchlists", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
    true,
  );
});

test("FDA transactional upsert, immutable history, concurrent dedup and read-only dry run", async () => {
  const html = readFileSync("tests/fixtures/fda/detail.html", "utf8");
  const candidate = parseList(
    readFileSync("tests/fixtures/fda/list.html", "utf8"),
    RECENT_URL,
  )[0];
  const raw = parseDetail(html, candidate.url, candidate, RECENT_URL);
  const data = normalize(raw).data;
  const before = await client.regulation.count();
  assert.equal(await writeRecord(client, "source-fda", data, true), "new");
  assert.equal(await client.regulation.count(), before);
  const outcomes = await Promise.all([
    writeRecord(client, "source-fda", data),
    writeRecord(client, "source-fda", data),
  ]);
  assert.deepEqual(outcomes.sort(), ["existing", "new"]);
  const original = await client.regulation.findFirstOrThrow({
    where: { canonical_url: data.canonical_url, is_mock: false },
  });
  assert.equal(original.is_new, true);
  assert.equal(await writeRecord(client, "source-fda", data), "existing");
  const unchanged = await client.regulation.findUniqueOrThrow({
    where: { id: original.id },
  });
  assert.equal(unchanged.updated_at.getTime(), original.updated_at.getTime());
  const changed = normalize({ ...raw, status: "Draft" }).data;
  assert.equal(await writeRecord(client, "source-fda", changed), "updated");
  const row = await client.regulation.findUniqueOrThrow({
    where: { id: original.id },
    include: { versions: true },
  });
  assert.equal(row.versions.length, 2);
  assert.equal(row.is_updated, true);
  assert.equal(row.is_new, false);
  assert.equal(
    row.first_detected_at.getTime(),
    original.first_detected_at.getTime(),
  );
  assert.equal(row.versions.filter((v) => v.previous_version_id).length, 1);
});

test("FDA sync logs, dry-run isolation and per-record failure isolation", async () => {
  const list = readFileSync("tests/fixtures/fda/list.html", "utf8");
  const detail = readFileSync("tests/fixtures/fda/detail.html", "utf8");
  const fake = {
    get: async (url: string) => ({
      url,
      html: url === RECENT_URL ? list : detail,
    }),
  };
  const before = await client.syncLog.count();
  const sources = await client.source.findUniqueOrThrow({
    where: { code: "FDA" },
  });
  const dry = await syncFda(
    client,
    { mode: "initial", limit: 5, dryRun: true },
    fake,
  );
  assert.equal(dry.status, "SUCCESS");
  assert.equal(await client.syncLog.count(), before);
  assert.equal(
    (
      await client.source.findUniqueOrThrow({ where: { code: "FDA" } })
    ).last_sync_at?.getTime(),
    sources.last_sync_at?.getTime(),
  );
  const brokenList = list.replace(
    "</ul>",
    '<li><a href="/regulatory-information/search-fda-guidance-documents/broken">Broken</a></li></ul>',
  );
  const partial = await syncFda(
    client,
    { mode: "initial", limit: 5 },
    {
      get: async (url: string) => ({
        url,
        html:
          url === RECENT_URL
            ? brokenList
            : url.endsWith("broken")
              ? "<h1>Invalid</h1>"
              : detail,
      }),
    },
  );
  assert.equal(partial.status, "PARTIAL_SUCCESS");
  assert.equal(partial.records_failed, 1);
  const log = await client.syncLog.findFirstOrThrow({
    where: { is_mock: false },
    orderBy: { started_at: "desc" },
  });
  assert.equal(log.status, "PARTIAL_SUCCESS");
  assert.ok(log.finished_at);
  assert.equal(log.records_failed, 1);
  const failed = await syncFda(
    client,
    { mode: "initial", limit: 1 },
    {
      get: async () => {
        throw new Error("FDA HTTP 503");
      },
    },
  );
  assert.equal(failed.status, "FAILED");
  const incremental = await syncFda(
    client,
    { mode: "incremental", limit: 1 },
    fake,
  );
  assert.equal(incremental.status, "SUCCESS");
  assert.ok(incremental.records_found <= 2);
  assert.equal(incremental.records_new, 0);
});

test("All five additional adapters share dry-run, upsert, source-local identity and logs", async () => {
  for (const code of ["EMA", "NMPA", "CDE", "ICH", "PMDA"]) {
    const base = adapters[code],
      name = code.toLowerCase();
    const fixture = readFileSync(
      `tests/fixtures/${name}/${code === "NMPA" ? "english-list" : "list"}.${code === "ICH" ? "json" : "html"}`,
      "utf8",
    );
    const detail =
      code === "ICH" || code === "PMDA"
        ? ""
        : readFileSync(
            `tests/fixtures/${name}/${code === "NMPA" ? "english-detail" : "detail"}.html`,
            "utf8",
          );
    const adapter = {
      ...base,
      pages: [base.pages[0]],
      client: {
        get: async (url: string) => ({
          url,
          html: url === base.pages[0] ? fixture : detail,
        }),
      },
    };
    const before = await client.regulation.count();
    const logs = await client.syncLog.count();
    const dry = await syncSource(client, adapter, {
      mode: "initial",
      limit: 1,
      dryRun: true,
    });
    assert.equal(dry.status, "SUCCESS", code);
    assert.equal(dry.records_new, 1, code);
    assert.equal(await client.regulation.count(), before);
    assert.equal(await client.syncLog.count(), logs);
    const first = await syncSource(client, adapter, {
      mode: "initial",
      limit: 1,
    });
    assert.equal(first.records_new, 1, code);
    const repeat = await syncSource(client, adapter, {
      mode: "incremental",
      limit: 1,
    });
    assert.equal(repeat.records_new, 0, code);
    assert.equal(repeat.records_existing, 1, code);
    const source = await client.source.findUniqueOrThrow({
      where: { code: code as "EMA" | "NMPA" | "CDE" | "ICH" | "PMDA" },
    });
    const log = await client.syncLog.findFirstOrThrow({
      where: { source_id: source.id, is_mock: false },
      orderBy: { started_at: "desc" },
    });
    assert.equal(log.status, "SUCCESS");
  }
});

test("One blocked source cannot prevent another source from persisting", async () => {
  const fixture = readFileSync("tests/fixtures/ema/list.html", "utf8"),
    detail = readFileSync("tests/fixtures/ema/detail.html", "utf8");
  const good = {
    ...adapters.EMA,
    pages: [adapters.EMA.pages[0]],
    client: {
      get: async (url: string) => ({
        url,
        html: url === adapters.EMA.pages[0] ? fixture : detail,
      }),
    },
  };
  const bad = {
    ...adapters.NMPA,
    client: {
      get: async () => {
        throw new Error("official source HTTP 412");
      },
    },
  };
  const results = [];
  for await (const result of syncSources(client, [bad, good], {
    mode: "initial",
    limit: 1,
  }))
    results.push(result);
  assert.equal(results[0].status, "FAILED");
  assert.equal(results[1].status, "SUCCESS");
  assert.ok(
    await client.regulation.count({
      where: { regulator: "EMA", is_mock: false },
    }),
  );
});

test("A blocked category retains successful categories but reports PARTIAL_SUCCESS", async () => {
  const base = adapters.PMDA;
  const body = readFileSync("tests/fixtures/pmda/list.html", "utf8");
  const adapter = {
    ...base,
    client: {
      get: async (url: string) => {
        if (url === base.pages[0]) throw new Error("official source HTTP 202");
        return { url, html: body };
      },
    },
  };
  const result = await syncSource(client, adapter, {
    mode: "initial",
    limit: 1,
  });
  assert.equal(result.status, "PARTIAL_SUCCESS");
  assert.equal(result.records_found, 1);
  assert.equal(result.records_failed, 1);
  assert.equal(result.records_existing + result.records_new, 1);
  assert.match(result.errors[0], /202/);
});

test("Source preflight cannot be cleared by mock successes, partial runs or stale history", async () => {
  await client.syncLog.create({
    data: {
      source_id: "source-pmda",
      is_mock: true,
      status: "SUCCESS",
      started_at: new Date(),
      finished_at: new Date(),
      records_found: 100,
    },
  });
  const current = await sourcePreflight(client);
  const pmda = current.sources.find((r) => r.source === "PMDA")!;
  assert.equal(pmda.result, "FAIL");
  assert.equal(pmda.latest_status, "PARTIAL_SUCCESS");
  const stale = await sourcePreflight(
    client,
    new Date(Date.now() + 2 * 86400000),
  );
  assert.ok(
    stale.sources.every((r) =>
      r.blockers.includes("NO_SUCCESS_WITHIN_24_HOURS"),
    ),
  );
});

test("Production queries and dashboard hide mock data unless explicitly opted in", async () => {
  const previous = process.env.NODE_ENV,
    flag = process.env.BIOREG_INCLUDE_MOCK_DATA;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.BIOREG_INCLUDE_MOCK_DATA;
    const expected = await client.regulation.count({
      where: { is_mock: false },
    });
    const result = await regulationRepository(client).list();
    assert.equal(result.pagination.total, expected);
    assert.ok(result.data.every((r) => !r.is_mock));
    assert.equal(await regulationRepository(client).getById("mock-1"), null);
    const stats = await getDashboard(client);
    assert.equal(stats.total, expected);
    assert.equal(stats.mockTotal, 0);
    process.env.BIOREG_INCLUDE_MOCK_DATA = "true";
    assert.ok(
      (await regulationRepository(client).list()).pagination.total > expected,
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
    if (flag === undefined) delete process.env.BIOREG_INCLUDE_MOCK_DATA;
    else process.env.BIOREG_INCLUDE_MOCK_DATA = flag;
  }
});

function scheduledAdapter(
  base: Adapter,
  fail: () => boolean = () => false,
): Adapter {
  const url = new URL("/scheduler-test-guideline", base.pages[0]).toString();
  const document = {
    title: "Biological quality scheduler test",
    url,
    sourcePage: base.pages[0],
    type: "Guideline",
    status: "",
    attachments: [],
  };
  return {
    ...base,
    pages: [base.pages[0]],
    client: {
      get: async (u) => {
        if (fail())
          throw new Error("official source HTTP 202 verification page");
        return { url: u, html: "<h1>Official fixture</h1>" };
      },
    },
    parseList: () => [{ url, title: document.title, context: "", document }],
    read: () =>
      normalizeDocument(
        document,
        base.code,
        () => "GUIDELINE",
        () => "UNKNOWN",
      ),
  };
}
test("Scheduler invokes six sources; access denial preserves records and later recovery uses same adapter", async () => {
  let blocked = true;
  const six = Object.values(adapters).map((a) =>
    scheduledAdapter(a, () => a.code === "CDE" && blocked),
  );
  const count = await client.regulation.count({ where: { regulator: "CDE" } });
  const versions = await client.regulationVersion.count({
    where: { regulation: { regulator: "CDE" } },
  });
  const first = await runScheduler(client, six, {
    mode: "incremental",
    limit: 1,
  });
  assert.equal(first.status, "PARTIAL_SUCCESS");
  assert.equal(first.sources.length, 6);
  assert.equal(
    first.sources.find((s) => s.source === "CDE")?.health,
    "DEGRADED",
  );
  assert.equal(
    await client.regulation.count({ where: { regulator: "CDE" } }),
    count,
  );
  assert.equal(
    await client.regulationVersion.count({
      where: { regulation: { regulator: "CDE" } },
    }),
    versions,
  );
  assert.equal(
    await client.syncLog.count({ where: { job_id: first.job_id } }),
    6,
  );
  const failed = await client.source.findUniqueOrThrow({
    where: { code: "CDE" },
  });
  assert.ok(failed.last_sync_at && failed.last_failure_at);
  blocked = false;
  const recovered = await runScheduler(client, six, {
    mode: "incremental",
    limit: 1,
  });
  assert.equal(recovered.status, "SUCCESS");
  const healthy = await client.source.findUniqueOrThrow({
    where: { code: "CDE" },
  });
  assert.equal(healthy.last_status, "HEALTHY");
  assert.ok(healthy.last_success_at);
  assert.equal(
    healthy.last_failure_at?.getTime(),
    failed.last_failure_at?.getTime(),
  );
});
test("Session locks prevent overlapping scheduler and direct source jobs and release cleanly", async () => {
  const lock = await acquireLock(client, "source:FDA");
  try {
    await assert.rejects(
      syncSource(client, scheduledAdapter(adapters.FDA), {
        mode: "initial",
        limit: 1,
      }),
      SyncBusyError,
    );
  } finally {
    await lock.release();
  }
  const global = await acquireLock(client, "scheduler");
  const jobs = await client.syncJob.count();
  try {
    const result = await runScheduler(
      client,
      [scheduledAdapter(adapters.FDA)],
      { mode: "incremental", limit: 1 },
    );
    assert.equal(result.status, "SKIPPED");
    assert.equal(await client.syncJob.count(), jobs);
  } finally {
    await global.release();
  }
  assert.equal(
    (
      await runScheduler(client, [scheduledAdapter(adapters.FDA)], {
        mode: "incremental",
        limit: 1,
      })
    ).status,
    "SUCCESS",
  );
});
test("Scheduled due/disabled sources make no requests; dry run makes no DB changes", async () => {
  const source = await client.source.findUniqueOrThrow({
    where: { code: "FDA" },
  });
  const adapter = scheduledAdapter(adapters.FDA);
  adapter.client.get = async () => {
    throw new Error("Should not fetch");
  };
  await client.source.update({
    where: { id: source.id },
    data: { enabled: false },
  });
  const disabled = await runScheduler(client, [adapter], {
    mode: "incremental",
    limit: 1,
  });
  assert.equal(disabled.sources[0].health, "DISABLED");
  await client.source.update({
    where: { id: source.id },
    data: { enabled: true, last_sync_at: new Date(), last_status: "HEALTHY" },
  });
  const due = await runScheduler(client, [adapter], {
    mode: "incremental",
    trigger: "scheduled",
    dueOnly: true,
    limit: 1,
  });
  assert.equal(due.sources[0].status, "SKIPPED_NOT_DUE");
  const jobs = await client.syncJob.count(),
    logs = await client.syncLog.count(),
    records = await client.regulation.count();
  const before = await client.source.findUnique({ where: { id: source.id } });
  await runScheduler(client, [scheduledAdapter(adapters.FDA)], {
    mode: "incremental",
    dryRun: true,
    limit: 1,
  });
  assert.equal(await client.syncJob.count(), jobs);
  assert.equal(await client.syncLog.count(), logs);
  assert.equal(await client.regulation.count(), records);
  assert.deepEqual(
    await client.source.findUnique({ where: { id: source.id } }),
    before,
  );
  await assert.rejects(
    runScheduler(client, [adapter], {
      mode: "initial",
      trigger: "scheduled",
      limit: 1,
    }),
    /incremental/,
  );
});
