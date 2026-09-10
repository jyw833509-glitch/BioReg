import test from "node:test";
import assert from "node:assert/strict";
import { regulations, agencies } from "../src/lib/data";
import { generatePrompt, searchRegulations } from "../src/lib/search";
test("all five agencies have multiple explicitly fictional records and no fabricated official claims", () => {
  for (const a of agencies)
    assert.ok(regulations.filter((r) => r.regulator === a).length >= 2);
  for (const r of regulations) {
    assert.equal(r.is_mock, true);
    assert.equal(r.official_url, null);
    assert.equal(r.official_summary, null);
    assert.equal(r.pdf_url, null);
  }
  assert.equal(new Set(regulations.map((r) => r.id)).size, regulations.length);
});
test("multilingual full text search and intersecting filters", () => {
  assert.equal(
    searchRegulations(regulations, "  抗体偶联  ")[0].regulator,
    "CDE",
  );
  assert.ok(searchRegulations(regulations, "THERAPEUTIC").length > 0);
  assert.equal(
    searchRegulations(regulations, "", { regulator: "FDA", status: "Final" })
      .length,
    1,
  );
  assert.equal(searchRegulations(regulations, "impossible-keyword").length, 0);
  assert.ok(
    searchRegulations(regulations, "", { date: "2026-09-09" }).every(
      (r) => r.publication_date === "2026-09-09",
    ),
  );
});
test("updates retain immutable historical snapshots and parent links", () => {
  for (const r of regulations.filter((r) => r.is_updated)) {
    assert.equal(r.versions.length, 2);
    assert.equal(r.versions[1].previous_version_id, r.versions[0].id);
    assert.notEqual(
      r.versions[0].content_snapshot,
      r.versions[1].content_snapshot,
    );
    assert.equal(r.versions[1].status, r.status);
  }
});
test("external AI prompts label simulation and preserve source boundary", () => {
  const p = generatePrompt(regulations.slice(0, 2), "Compare Regulations");
  assert.ok(p.includes("Development / Mock Data"));
  assert.ok(p.includes("Compare Regulations"));
  assert.ok(p.includes("官方文件中未确认"));
  assert.ok(p.includes(regulations[0].title_original));
  assert.ok(p.includes(regulations[1].title_original));
});
