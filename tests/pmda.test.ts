import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseList } from "../src/server/connectors/pmda/parser";
import { normalize } from "../src/server/connectors/pmda/normalizer";
import { config } from "../src/server/connectors/pmda/config";

// Captured official HTML, 2026-09-10; fixture tests do not contact PMDA.
test("PMDA biosimilar listing excludes presentations and preserves explicit dates", () => {
  const rows = parseList(
    readFileSync("tests/fixtures/pmda/list.html", "utf8"),
    config.pages[0],
  );
  assert.equal(rows.length, 7);
  assert.ok(
    !rows.some((r) => /Fukushima|Tanaka|Approved Products/.test(r.title)),
  );
  const r = normalize(rows[0].document!).data;
  assert.equal(r.country_or_region, "Japan");
  assert.equal(r.publication_date?.toISOString(), "2026-07-03T00:00:00.000Z");
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.is_mock, false);
  assert.equal(normalize(rows[4].document!).data.publication_date, null);
  assert.throws(() =>
    parseList(
      '<h3>Related Guidelines and Notifications</h3><ul><li><a href="https://evil.example/a.pdf">Biosimilar</a></li></ul>',
      config.pages[0],
    ),
  );
});
test("PMDA bilingual attachments are one record and incomplete years remain metadata", () => {
  const rows = parseList(
    readFileSync("tests/fixtures/pmda/regenerative.html", "utf8"),
    config.pages[1],
  );
  assert.ok(rows.length > 10);
  const r = normalize(rows[0].document!);
  assert.equal(r.relevant, true);
  assert.match(r.data.title_original, /^Applications for Marketing Approval/);
  assert.equal(r.data.attachment_urls?.length, 2);
  assert.equal(r.data.publication_date, null);
  assert.deepEqual(r.data.source_metadata?.languages, ["Japanese", "English"]);
  assert.equal(new Set(rows.map((r) => r.url)).size, rows.length);
});
