import test from "node:test";
import assert from "node:assert/strict";
import {
  generate,
  promptRequest,
  truncation,
  limits,
} from "../src/server/ai/generator";
import { providers, templates } from "../src/lib/external-ai";
import { buildContext } from "../src/server/ai/context";
import type { Db } from "../src/server/db";

test("change and comparison load both owned immutable versions without writes", async () => {
  const { snapshot } = await import("../src/server/changes/detect");
  const versions = ["a", "b"].map((id, i) => ({
    id,
    regulation_id: "r",
    version_name: String(i + 1),
    detected_at: new Date("2026-01-01"),
    created_at: new Date("2026-01-01"),
    publication_date: null,
    content_snapshot: JSON.stringify(
      snapshot({
        title_original: "Rule",
        content_text: i ? "New text" : "Old text",
      }),
    ),
  }));
  const event = {
    id: "event",
    regulation_id: "r",
    previous_version_id: "a",
    current_version_id: "b",
    change_types: ["CONTENT_CHANGED"],
    changed_fields: [],
    sections: [],
    change_summary: "Content changed",
  };
  const before = JSON.stringify({ versions, event });
  const db = {
    regulation: {
      findFirst: async () => ({
        id: "r",
        title_original: "Rule",
        categories: [],
        product_types: [],
        affected_departments: [],
      }),
    },
    changeEvent: { findFirst: async () => event },
    regulationVersion: {
      findFirst: async ({
        where,
      }: {
        where: { id: string; regulation_id: string };
      }) =>
        where.regulation_id === "r"
          ? versions.find((v) => v.id === where.id)
          : null,
    },
  } as unknown as Db;
  for (const kind of ["change", "comparison"] as const) {
    const q = promptRequest.parse({
      kind,
      id: kind === "change" ? "event" : "r",
      from: "a",
      to: "b",
      template: kind === "change" ? "change" : "compare",
      level: "detailed",
    });
    const r = generate(q, await buildContext(db, q));
    assert.match(r.prompt, /Old text/);
    assert.match(r.prompt, /New text/);
    assert.match(r.prompt, /deterministic version diff/);
  }
  assert.equal(JSON.stringify({ versions, event }), before);
  await assert.rejects(
    () =>
      buildContext(
        db,
        promptRequest.parse({
          kind: "comparison",
          id: "r",
          from: "a",
          to: "foreign",
          template: "compare",
        }),
      ),
    { code: "P2025" },
  );
});
test("saved digest uses system summary and watchlist match evidence without regeneration", async () => {
  const digest = {
    id: "digest",
    digest_date: "2026-01-01",
    generated_at: new Date(),
    summary: {
      new_count: 0,
      matches: [],
      evidence_type: "BioReg Digest Summary",
    },
  };
  const before = JSON.stringify(digest);
  const db = {
    dailyDigest: { findUnique: async () => digest },
  } as unknown as Db;
  const q = promptRequest.parse({
    kind: "digest",
    id: "digest",
    template: "digest",
  });
  const r = generate(q, await buildContext(db, q));
  assert.match(r.prompt, /BioReg System Summary/);
  assert.match(r.prompt, /Watchlist Match/);
  assert.equal(JSON.stringify(digest), before);
});

for (const kind of ["regulation", "change", "comparison", "digest"] as const)
  for (const language of ["Chinese", "English", "Bilingual"] as const)
    test(kind + " " + language + " prompt", () => {
      const q = promptRequest.parse({
        kind,
        id: "record",
        from: "a",
        to: "b",
        template:
          kind === "comparison"
            ? "compare"
            : kind === "change"
              ? "change"
              : kind === "digest"
                ? "digest"
                : "explain",
        language,
      });
      const r = generate(q, [
        { label: "Official Fact", data: { title: "Official title" } },
        { label: "BioReg Translation", data: "Not supplied" },
        { label: "BioReg System Summary", data: "detected facts" },
      ]);
      assert.match(r.prompt, /External AI Interpretation/);
      assert.match(r.prompt, /当前提供的官方资料不足以确认/);
      assert.ok(r.prompt.includes(language));
    });
for (const level of ["compact", "standard", "detailed"] as const)
  test(level + " bounded explicit truncation", () => {
    const q = promptRequest.parse({ kind: "regulation", id: "r", level });
    const r = generate(q, [
      { label: "Official Fact", data: "x".repeat(10000) },
      { label: "Content", data: "y".repeat(100000), body: true },
    ]);
    assert.ok(r.truncated);
    assert.ok(r.prompt.includes(truncation));
    assert.ok(r.prompt.length < limits[level] + 4000);
    if (level === "compact") assert.match(r.prompt, /omitted by compact/);
  });
test("disabled provider and incompatible templates rejected", () => {
  const q = promptRequest.parse({ kind: "regulation", id: "r" });
  assert.throws(() =>
    generate(
      q,
      [],
      providers.map((p) => ({ ...p, enabled: false })),
    ),
  );
  assert.throws(() => generate({ ...q, template: "digest" }, []));
  assert.throws(() =>
    promptRequest.parse({ kind: "comparison", id: "r", from: "a", to: "a" }),
  );
});
test("provider URLs fixed HTTPS without credentials or payloads", () => {
  assert.deepEqual(
    providers.map((p) => new URL(p.homepage_url).hostname),
    ["chat.deepseek.com", "www.doubao.com", "chat.qwen.ai", "chatgpt.com"],
  );
  for (const p of providers) {
    const u = new URL(p.homepage_url);
    assert.equal(u.protocol, "https:");
    assert.equal(u.username + u.password + u.search + u.hash, "");
  }
  assert.equal(templates.length, 12);
});
test("CMC does not invent requirements, language and products are context", () => {
  const r = generate(
    promptRequest.parse({ kind: "regulation", id: "r", template: "cmc" }),
    [{ label: "BioReg Metadata", data: { product_types: ["ADC"] } }],
  );
  assert.match(r.prompt, /该主题未在当前提供的法规内容中确认/);
  assert.match(r.prompt, /not an official requirement/);
  assert.match(r.prompt, /Viral Safety/);
});
test("context reads allowlisted facts only, missing text/summary and no writes or external network", async () => {
  const r = {
    id: "r",
    is_mock: false,
    title_original: "Test",
    content_text: "",
    official_summary: null,
    source_metadata: { password: "PRIVATE_SENTINEL" },
    categories: [],
    product_types: [],
    affected_departments: [],
  };
  const before = JSON.stringify(r);
  let reads = 0;
  const db = {
    regulation: {
      findFirst: async (args: unknown) => {
        assert.match(JSON.stringify(args), /"is_mock":false/);
        reads++;
        return r;
      },
    },
  } as unknown as Db;
  const blocks = await buildContext(
    db,
    promptRequest.parse({ kind: "regulation", id: "r" }),
  );
  const result = generate(
    promptRequest.parse({ kind: "regulation", id: "r" }),
    blocks,
  );
  assert.match(result.prompt, /Not supplied/);
  assert.match(result.prompt, /Full text not available/);
  assert.ok(!result.prompt.includes("PRIVATE_SENTINEL"));
  assert.equal(JSON.stringify(r), before);
  assert.equal(reads, 1);
});
test("missing source records fail instead of inventing facts", async () => {
  const db = { regulation: { findFirst: async () => null } } as unknown as Db;
  await assert.rejects(
    () =>
      buildContext(
        db,
        promptRequest.parse({ kind: "regulation", id: "missing" }),
      ),
    { code: "P2025" },
  );
});
