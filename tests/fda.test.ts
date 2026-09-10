import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canonicalUrl,
  parseList,
  parseDetail,
  RECENT_URL,
} from "../src/server/connectors/fda/parser";
import {
  parseDate,
  mapType,
  mapStatus,
  normalize,
  contentHash,
} from "../src/server/connectors/fda/normalizer";
import { classify } from "../src/server/connectors/fda/rules";
const list = readFileSync("tests/fixtures/fda/list.html", "utf8");
const detail = readFileSync("tests/fixtures/fda/detail.html", "utf8");
const candidate = parseList(list, RECENT_URL)[0];
test("FDA list isolates official details and deduplicates canonical links", () => {
  assert.equal(parseList(list, RECENT_URL).length, 1);
  assert.match(candidate.url, /test-cell-therapy$/);
});
test("FDA detail extracts official title, PDF, docket, office and introductory summary", () => {
  const raw = parseDetail(detail, candidate.url, candidate, RECENT_URL);
  assert.equal(raw.title, "Cell Therapy Manufacturing Guidance");
  assert.equal(raw.docket, "FDA-TEST-D-0001");
  assert.equal(raw.documentNumber, "TEST-GUIDANCE-1");
  assert.equal(raw.offices.length, 1);
  assert.match(raw.pdf!, /\/media\/999999\/download$/);
  assert.doesNotMatch(raw.summary!, /Submit Comments/);
  assert.equal(normalize(raw).data.status, "FINAL");
});
test("FDA dates preserve missing precision and reject impossible dates", () => {
  for (const raw of ["2026-08-20", "08/20/2026", "August 20, 2026"])
    assert.equal(parseDate(raw)?.toISOString().slice(0, 10), "2026-08-20");
  for (const raw of [
    "2026",
    "August 2026",
    "2026-02-30",
    "02/29/2025",
    "",
    "Unknown 12, 2026",
  ]) {
    const warnings: string[] = [];
    assert.equal(parseDate(raw, warnings), null);
    assert.ok(warnings.length);
  }
});
test("FDA type/status mappings require explicit evidence", () => {
  for (const [raw, expected] of [
    ["Draft Guidance", "DRAFT_GUIDANCE"],
    ["Final Guidance", "FINAL_GUIDANCE"],
    ["Guidance", "GUIDELINE"],
    ["Q&A", "QA"],
    ["Notice", "NOTICE"],
    ["anything", "OTHER"],
  ])
    assert.equal(mapType(raw, ""), expected);
  for (const status of [
    "Draft",
    "Final",
    "Effective",
    "Revised",
    "Withdrawn",
    "Archived",
    "Unknown",
  ])
    assert.equal(mapStatus(status), status.toUpperCase());
  assert.equal(mapStatus("Guidance for industry"), "UNKNOWN");
});
test("FDA URLs keep identifying query parameters and reject untrusted hosts", () => {
  assert.equal(
    canonicalUrl("http://fda.gov/media/123/download/?id=4&utm_source=x#top"),
    "https://www.fda.gov/media/123/download?id=4",
  );
  for (const url of [
    "https://fda.gov.evil.com/x",
    "https://user:pass@www.fda.gov/x",
    "file:///x",
    "https://www.fda.gov:999/x",
  ])
    assert.throws(() => canonicalUrl(url));
});
test("FDA missing PDF/date/document number stay absent; invalid detail fails", () => {
  const html = detail
    .replace(/<div class="lcds-toolbar">[\s\S]*?<\/div>/, "")
    .replace("August 20, 2026", "2026")
    .replace("<dt>Document Number:</dt><dd>TEST-GUIDANCE-1</dd>", "");
  const n = normalize(parseDetail(html, candidate.url, candidate, RECENT_URL));
  assert.equal(n.data.pdf_url, null);
  assert.equal(n.data.publication_date, null);
  assert.equal(n.data.publication_date_raw, "2026");
  assert.equal(n.data.document_number, null);
  assert.throws(() =>
    parseDetail("<h1>Access Denied</h1>", candidate.url, candidate, RECENT_URL),
  );
});
test("FDA stable hashes ignore whitespace but detect official changes", () => {
  assert.equal(
    contentHash({ title: "Cell  therapy\n guidance", status: "Final" }),
    contentHash({ status: "Final", title: "Cell therapy guidance" }),
  );
  assert.notEqual(
    contentHash({ status: "Final" }),
    contentHash({ status: "Draft" }),
  );
});
test("FDA relevance supports biologics and shared CDER guidance without accepting unrelated food", () => {
  assert.ok(classify("Biosimilar development", "", [], "").relevant);
  assert.ok(classify("Clinical trial quality", "", ["CDER"], "").relevant);
  assert.equal(
    classify("Food packaging colorants", "", [], "").relevant,
    false,
  );
});
