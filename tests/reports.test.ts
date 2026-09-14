import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { reportQuery, type Report } from "../src/server/reports/data";
import { renderCSV, csvCell } from "../src/server/reports/csv";
import { renderPDF } from "../src/server/reports/pdf";
import { json, failure } from "../src/server/http";
const sample: Report = {
  type: "regulations",
  generated_at: "2026-09-14T00:00:00Z",
  parameters: reportQuery.parse({}),
  limited: false,
  notice:
    "Official Fact ≠ BioReg Translation ≠ BioReg System Summary ≠ External AI Interpretation. UTC dates. 官方事实与系统摘要独立。",
  rows: [
    {
      id: "test-regulation",
      regulation_id: "r1",
      agency: "FDA",
      official_url:
        "https://www.fda.gov/regulatory-information/search-fda-guidance-documents",
      timestamp: "2026-09-14T00:00:00Z",
      severity: "HIGH",
      evidence: "Official Fact / BioReg System Summary",
      details: {
        "官方标题 Official Title": "生物药质量控制 Quality Control",
        "Official Summary":
          "中文 English 混排。" +
          "这是长文本分页质量测试，不能截字或溢出。".repeat(240),
        "BioReg Summary": "Not disclosed / Not available",
      },
    },
  ],
};
test("report parameters reject invalid dates, ranges, format and unbounded sizes", () => {
  for (const q of [
    { start: "2026-02-30" },
    { start: "2026-10-01", end: "2026-01-01" },
    { limit: 101 },
    { limit: 0 },
    { format: "exe" },
    { type: "comparison", regulation: "r", from: "v", to: "v" },
    { type: "digest", agency: "FDA" },
  ])
    assert.equal(reportQuery.safeParse(q).success, false);
});
test("CSV stable UTF8 BOM escaping and spreadsheet formula mitigation", () => {
  const csv = renderCSV(sample);
  assert.ok(csv.startsWith("\uFEFFid,regulation_id,agency,official_url,"));
  assert.ok(csv.includes("生物药"));
  assert.equal(csvCell('=cmd("x")'), '"\'=cmd(""x"")"');
  assert.equal(csvCell("中文,\nabc"), '"中文,\nabc"');
  assert.equal(renderCSV(sample), csv);
});
for (const type of ["regulations", "changes", "digest"])
  test("searchable Chinese PDF " + type, async () => {
    const r = { ...sample, type };
    const before = JSON.stringify(r);
    const bytes = await renderPDF(r);
    assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
    assert.ok(bytes.length > 5000);
    assert.equal(JSON.stringify(r), before);
    mkdirSync(".data/report-qa", { recursive: true });
    writeFileSync(".data/report-qa/" + type + ".pdf", bytes);
  });
test("API failures return safe traceable envelope without stack or credentials", async () => {
  const r = failure(new Error("postgresql://private:password@secret"));
  const d = await r.json();
  assert.equal(r.status, 503);
  assert.ok(d.code && d.message && d.request_id && d.timestamp);
  assert.ok(!JSON.stringify(d).includes("private"));
  const tooLarge = await failure({ code: "REPORT_TOO_LARGE" }).json();
  assert.equal(tooLarge.code, "REPORT_TOO_LARGE");
  assert.equal(
    (await json({ error: "NOT_FOUND" }, 404).json()).code,
    "NOT_FOUND",
  );
});
