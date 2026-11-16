import test from "node:test";
import assert from "node:assert/strict";
import {
  japaneseDate,
  pmdaCoverCandidates,
  nmpaAnnouncementCandidates,
  emaTitleVersion,
} from "../src/server/enrichment/official-fields";
test("EMA revision requires a verified official title and never invents a baseline edition", () => {
  const url = "https://www.ema.europa.eu/en/scientific-guidelines/example";
  const meta = {
    metadata_verified: true,
    capture_scope: "official_guideline_metadata",
  };
  assert.equal(
    emaTitleVersion("Guideline (Rev.1)", url, meta)[0].value,
    "Rev.1",
  );
  assert.equal(
    emaTitleVersion("ICH Q5A(R2) guideline - Step 5", url, meta)[0].value,
    "Q5A(R2)",
  );
  assert.deepEqual(emaTitleVersion("Guideline", url, meta), []);
  assert.deepEqual(emaTitleVersion("Guideline revision 1", url, {}), []);
});
const pdf = (text: string) => ({
  url: "https://www.pmda.go.jp/files/example.pdf",
  content_sha256: "test",
  inspected_pages: [{ page: 1, text }],
});
test("NMPA signature date differs from English page update and explicit effective date", () => {
  const evidence = {
    url: "https://english.nmpa.gov.cn/2025-12/24/example.htm",
    content_sha256: "fixture",
    text: "Updated: 2025-12-24 The provisions shall come into force as of January 1, 2026. It is hereby announced. National Medical Products Administration November 17, 2025 About NMPA",
  };
  const rows = nmpaAnnouncementCandidates(
    "Announcement of NMPA ([2025] No. 113)",
    evidence,
  );
  assert.equal(
    rows.find((r) => r.field === "publication_date")?.value,
    undefined,
  );
  assert.equal(
    rows.find((r) => r.field === "effective_date")?.value,
    "2026-01-01",
  );
  assert.equal(
    rows.find((r) => r.field === "document_number")?.value,
    "2025年第113号",
  );
  assert.deepEqual(
    nmpaAnnouncementCandidates(
      "Policy Interpretation of the NMPA Announcement",
      evidence,
    ),
    [],
  );
});
test("body citations never become a Japanese notice's own number/date", () => {
  const rows = pmdaCoverCandidates(
    pdf(
      "事務連絡\n令和3年12月22日\n各都道府県衛生主管部\n令和3年7月29日付け薬生機審発0729第1号の通知について",
    ),
  );
  assert.equal(
    rows.some((r) => r.field === "document_number"),
    false,
  );
  assert.equal(
    rows.find((r) => r.field === "publication_date")?.value,
    "2021-12-22",
  );
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

test("plural issuance language belongs to a final NMPA announcement", () => {
  const r = nmpaAnnouncementCandidates("Announcement of NMPA (No. 134, 2025)", {
    url: "https://english.nmpa.gov.cn/example.htm",
    content_sha256: "fixture",
    text: "The following matters are hereby announced as follows.",
  });
  assert.equal(r.find((c) => c.field === "status")?.value, "FINAL");
  assert.equal(
    r.some((c) => c.field === "publication_date"),
    false,
  );
});
