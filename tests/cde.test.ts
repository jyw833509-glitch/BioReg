import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList, parseDetail } from "../src/server/connectors/cde/parser";
import { normalize } from "../src/server/connectors/cde/normalizer";
const source = "https://www.cde.org.cn/",
  candidate = parseList(
    readFileSync("tests/fixtures/cde/list.html", "utf8"),
    source,
  )[0],
  html = readFileSync("tests/fixtures/cde/detail.html", "utf8");
test("CDE table preserves promulgated status, date, attachment and no document number", () => {
  const n = normalize(parseDetail(html, candidate.url, candidate, source));
  assert.equal(n.data.status, "FINAL");
  assert.equal(n.data.document_number, null);
  assert.equal(n.data.document_type, "TECHNICAL_GUIDELINE");
  assert.equal(
    n.data.publication_date?.toISOString().slice(0, 10),
    "2026-08-20",
  );
  assert.equal(n.data.attachment_urls?.length, 1);
  assert.equal(n.data.regulator, "CDE");
});
test("CDE consultation comes from explicit version status, never the title", () => {
  const n = normalize(
    parseDetail(
      html.replace("颁布", "征求意见稿"),
      candidate.url,
      candidate,
      source,
    ),
  );
  assert.equal(n.data.status, "UNDER_CONSULTATION");
  assert.equal(n.data.document_type, "CONSULTATION_DRAFT");
  const unknown = normalize(
    parseDetail(
      html
        .replace("颁布", "")
        .replace("生物类似药技术指导原则", "生物类似药技术指导原则征求意见稿"),
      candidate.url,
      candidate,
      source,
    ),
  );
  assert.equal(unknown.data.status, "UNKNOWN");
});
