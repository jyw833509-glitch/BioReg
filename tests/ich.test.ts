import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList, parseDetail } from "../src/server/connectors/ich/parser";
import { normalize } from "../src/server/connectors/ich/normalizer";
import { config } from "../src/server/connectors/ich/config";
const body = readFileSync("tests/fixtures/ich/list.json", "utf8");
test("ICH public JSON code, step, revision, official PDF and adoption precision", () => {
  const c = parseList(body, config.pages[0])[0],
    n = normalize(parseDetail("", c.url, c, config.pages[0]));
  assert.equal(n.data.document_number, "Q5A");
  assert.equal(n.data.source_metadata?.guideline_code, "Q5A(R2)");
  assert.equal(n.data.source_metadata?.adoption_date_raw, "1 November 2023");
  assert.equal(n.data.status, "FINAL");
  assert.equal(n.data.publication_date, null);
  assert.equal(n.data.official_topics[0], "quality");
  assert.ok(n.data.pdf_url);
});
test("ICH covers Q S E M and rejects invalid schema without fabricated records", () => {
  assert.equal(config.pages.length, 4);
  for (const url of config.pages) assert.equal(parseList(body, url).length, 1);
  assert.equal(parseList('{"items":[]}', config.pages[0]).length, 0);
});

test("ICH supplemental papers keep independent identity and never inherit guideline step/date", () => {
  const root = JSON.parse(body);
  root.items[0].items[0].fileGroups.push({
    title: "Endorsed Documents",
    files: [
      {
        title: "Q5A Concept Paper",
        uri: "https://database.ich.org/sites/default/files/concept.pdf",
      },
      {
        title: "Q5A Business Plan",
        uri: "https://database.ich.org/sites/default/files/business.pdf",
      },
    ],
  });
  const rows = parseList(JSON.stringify(root), config.pages[0]);
  assert.equal(rows.length, 2);
  const paper = normalize(
    rows.find((r) => r.title.includes("Concept"))!.document!,
  ).data;
  assert.equal(paper.document_type, "CONCEPT_PAPER");
  assert.equal(paper.document_number, null);
  assert.equal(paper.status, "UNKNOWN");
  assert.equal(paper.publication_date, null);
  assert.equal(paper.source_metadata?.adoption_date_raw, undefined);
});
