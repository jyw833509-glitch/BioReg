import test from "node:test";
import assert from "node:assert/strict";
import { searchTerms, officialSearchUrl } from "../src/lib/search";
import { pharmacopoeiaAdapter } from "../src/server/connectors/pharmacopoeia";
import { parseList } from "../src/server/connectors/ich/parser";
import { mapStatus } from "../src/server/connectors/ich/mapper";
test("Chinese/English retrieval synonyms and document identifiers retain original query", () => {
  assert.ok(searchTerms("生物类似药").includes("biosimilar"));
  assert.ok(searchTerms("stability").includes("稳定性"));
  assert.ok(searchTerms("ICH Q5A(R2)").includes("q5a"));
  assert.ok(searchTerms("<85>").includes("85"));
  assert.deepEqual(searchTerms(""), []);
});
test("official-only extensions encode keywords; unsupported entries do not pretend to search", () => {
  const url = new URL(officialSearchUrl("FDA", "抗体 & <85>")!);
  assert.equal(url.hostname, "www.fda.gov");
  assert.equal(url.searchParams.get("search"), "抗体 & <85>");
  assert.equal(
    officialSearchUrl("EDQM", "抗体"),
    officialSearchUrl("EDQM", ""),
  );
  assert.equal(officialSearchUrl("https://evil.test/", "x"), null);
});
test("pharmacopoeia catalog retains only official public links and never claims full text or effective status", () => {
  const a = pharmacopoeiaAdapter("EDQM");
  const rows = a.parseList(
    '<main><p><a href="/documents/123/456/guide.pdf">Guide for elaboration of monographs</a></p><a href="https://evil.test/documents/guide.pdf">Untrusted technical guide</a></main>',
    a.pages[0],
  );
  assert.equal(rows.length, 1);
  const r = a.read("", rows[0].url, rows[0], a.pages[0]).data;
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.publication_date, null);
  assert.equal(r.source_metadata?.full_text_captured, false);
  assert.equal(r.official_summary, null);
  assert.equal(
    r.official_url,
    "https://www.edqm.eu/documents/123/456/guide.pdf",
  );
});
test("ICH publication step and regional implementation are separate official facts", () => {
  const rows = parseList(
    JSON.stringify({
      entityInfo: { bundle: "guideline" },
      items: [
        {
          code: "Q1A(R2)",
          title: "Stability Testing",
          status: "Step 5",
          details: {
            infoTitle: "Implementation status",
            info: [
              { party: "EC, Europe", text: "Implemented; Date: 1 August 2003" },
            ],
          },
          fileGroups: [
            {
              title: "Guideline",
              files: [
                { title: "Q1A", uri: "https://database.ich.org/q1a.pdf" },
              ],
            },
          ],
        },
      ],
    }),
    "https://admin.ich.org/api?alias=/page/quality-guidelines",
  );
  assert.equal(mapStatus("Step 5"), "FINAL");
  assert.deepEqual(rows[0].document?.metadata?.regional_implementation, [
    {
      region: "EC, Europe",
      statement: "Implemented; Date: 1 August 2003",
      source_url: "https://www.ich.org/page/quality-guidelines",
    },
  ]);
});
