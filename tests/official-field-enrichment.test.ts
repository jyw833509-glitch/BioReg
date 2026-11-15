import test from "node:test";
import assert from "node:assert/strict";
import {
  japaneseDate,
  pmdaCoverCandidates,
} from "../src/server/enrichment/official-fields";
const pdf = (text: string) => ({
  url: "https://www.pmda.go.jp/files/example.pdf",
  content_sha256: "test",
  inspected_pages: [{ page: 1, text }],
});
test("uses notification header date, not provisional translation month or body references", () => {
  const rows = pmdaCoverCandidates(
    pdf(
      "Provisional Translation (as of September 2026)\nPSB/PED Notification No.1008-5\nOctober 8, 2025\nTo: Prefectures\nReference PFSB Notification No.123-4 January 1, 2009",
    ),
  );
  assert.equal(
    rows.find((r) => r.field === "publication_date")?.value,
    "2025-10-08",
  );
  assert.equal(
    rows.find((r) => r.field === "document_number")?.value,
    "PSB/PED Notification No.1008-5",
  );
  assert.equal(
    rows.some((r) => r.field === "effective_date"),
    false,
  );
});
test("Japanese era dates are validated; a dated edition is not a publication date", () => {
  assert.equal(japaneseDate("令和８年 ３月 31 日"), "2026-03-31");
  assert.equal(japaneseDate("令和8年2月30日"), null);
  const rows = pmdaCoverCandidates(pdf("令和 7 年 3 月 26 日版\n資料作成要領"));
  assert.equal(
    rows.some((r) => r.field === "publication_date"),
    false,
  );
  assert.equal(
    rows.find((r) => r.field === "official_version")?.value,
    "令和7年3月26日版",
  );
});
test("cannot use another agency PDF as PMDA evidence", () => {
  assert.deepEqual(
    pmdaCoverCandidates({
      ...pdf("January 1, 2020"),
      url: "https://example.com/a.pdf",
    }),
    [],
  );
});
