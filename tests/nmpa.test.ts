import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList, parseDetail } from "../src/server/connectors/nmpa/parser";
import { normalize } from "../src/server/connectors/nmpa/normalizer";
const source = "https://www.nmpa.gov.cn/xxgk/ggtg/ypggtg/index.html",
  candidate = parseList(
    readFileSync("tests/fixtures/nmpa/list.html", "utf8"),
    source,
  )[0],
  html = readFileSync("tests/fixtures/nmpa/detail.html", "utf8");
test("NMPA synthetic Chinese title, document number, announcement, date and DOCX", () => {
  const n = normalize(parseDetail(html, candidate.url, candidate, source));
  assert.equal(n.data.title_original, n.data.title_zh);
  assert.equal(n.data.document_type, "ANNOUNCEMENT");
  assert.match(n.data.document_number!, /2026年第1号/);
  assert.equal(n.data.status, "UNKNOWN");
  assert.equal(n.data.attachment_urls?.length, 1);
  assert.equal(n.data.pdf_url, null);
  assert.equal(
    n.data.publication_date?.toISOString().slice(0, 10),
    "2026-08-20",
  );
});
test("NMPA missing attachment is valid but access challenge is never a record", () => {
  const d = parseDetail(
    html.replace(/<a[\s\S]*?<\/a>/, ""),
    candidate.url,
    candidate,
    source,
  );
  assert.equal(d.attachments.length, 0);
  assert.throws(() =>
    parseDetail(
      "<script>challenge()</script>",
      candidate.url,
      candidate,
      source,
    ),
  );
});

test("NMPA real English listing and full article preserve language and update-date semantics", () => {
  const page = "https://english.nmpa.gov.cn/drugs.html";
  const rows = parseList(
    readFileSync("tests/fixtures/nmpa/english-list.html", "utf8"),
    page,
  );
  assert.equal(rows.length, 6);
  const r = normalize(
    parseDetail(
      readFileSync("tests/fixtures/nmpa/english-detail.html", "utf8"),
      rows[0].url,
      rows[0],
      page,
    ),
  ).data;
  assert.equal(r.title_zh, "");
  assert.equal(r.document_number, "(No. 134, 2025)");
  assert.equal(r.document_type, "ANNOUNCEMENT");
  assert.equal(r.publication_date, null);
  assert.equal(r.updated_date?.toISOString().slice(0, 10), "2026-04-14");
  assert.ok(r.content_text!.length > 1000);
  assert.equal(r.source_metadata?.language, "en");
  assert.equal(r.status, "UNKNOWN");
});
