import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList, parseDetail } from "../src/server/connectors/ema/parser";
import { normalize } from "../src/server/connectors/ema/normalizer";
import { mapType, mapStatus } from "../src/server/connectors/ema/mapper";
const list = readFileSync("tests/fixtures/ema/list.html", "utf8"),
  html = readFileSync("tests/fixtures/ema/detail.html", "utf8"),
  source = "https://www.ema.europa.eu/en/list",
  candidate = parseList(list, source)[0];
test("EMA list/detail official metadata, PDF and DD/MM/YYYY", () => {
  assert.equal(parseList(list, source).length, 1);
  const n = normalize(parseDetail(html, candidate.url, candidate, source));
  assert.equal(n.data.status, "EFFECTIVE");
  assert.equal(
    n.data.publication_date?.toISOString().slice(0, 10),
    "2026-08-20",
  );
  assert.match(n.data.pdf_url!, /test_en.pdf$/);
  assert.equal(n.data.source_metadata?.adoption_status, "Adopted");
  assert.ok(n.relevant);
});
test("EMA raw adopted/draft states and document types are preserved", () => {
  assert.equal(mapStatus("Adopted"), "FINAL");
  assert.equal(mapStatus("Draft: consultation closed"), "DRAFT");
  assert.equal(mapStatus("consultation open"), "UNDER_CONSULTATION");
  assert.equal(mapType("Reflection paper"), "REFLECTION_PAPER");
  assert.equal(mapType("Guideline"), "GUIDELINE");
  assert.equal(mapStatus(""), "UNKNOWN");
});
