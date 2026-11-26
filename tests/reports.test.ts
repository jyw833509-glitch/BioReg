import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { reportQuery, type Report } from "../src/server/reports/data";
import { renderCSV, csvCell } from "../src/server/reports/csv";
import { renderPDF } from "../src/server/reports/pdf";
import { json, failure } from "../src/server/http";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPreview } from "../src/components/report-preview";
import { Reports } from "../src/components/reports";
import { reportDates, reportError } from "../src/lib/report-display";
import { officialSearchSources } from "../src/lib/search";
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

test("report form sources match the API and dates explain each existing filter contract", () => {
  const html = renderToStaticMarkup(createElement(Reports, { records: [] }));
  for (const source of officialSearchSources) {
    assert.ok(reportQuery.safeParse({ agency: source.code }).success);
    assert.ok(html.includes(`value="${source.code}"`));
  }
  assert.match(html, /法规发布日期 · 开始/);
  assert.match(html, /生成并预览/);
  assert.match(reportDates.changes.hint, /系统发现/);
  assert.match(reportDates.sources.hint, /日期仅筛选同步运行记录/);
  assert.match(reportDates.digest.hint, /周一日期/);
  assert.equal(reportDates.comparison.label, "");
  assert.doesNotMatch(
    reportError({ code: "INVALID_PARAMETERS", issues: [{ field: "end" }] }),
    /Invalid|Error/,
  );
});

test("report preview preserves official and translated evidence without raw JSON or unsafe links", () => {
  const facts = {
    title_original: "Official original <script>alert(1)</script>",
    document_number: "Q5A(R2)",
    publication_date: "2026-01-02T00:00:00.000Z",
    effective_date: null,
    status: "FINAL",
    official_summary: "Unchanged official words.",
    official_url: "https://www.ich.org/page/quality-guidelines",
    pdf_url: "javascript:alert(1)",
  };
  const report: Report = {
    ...sample,
    rows: [
      {
        ...sample.rows[0],
        official_url: facts.official_url,
        details: {
          "Official Regulatory Information": facts,
          "BioReg Translation": {
            title_zh: "已有中文标题",
            summary_zh: "已保存的中文译文。",
          },
          "BioReg Metadata": { version: "2" },
          "Historical Versions": [
            { version_name: "1", content_snapshot: JSON.stringify(facts) },
          ],
        },
      },
    ],
  };
  const before = JSON.stringify(report);
  const html = renderToStaticMarkup(createElement(ReportPreview, { report }));
  assert.match(html, /已有中文标题/);
  assert.match(html, /官方摘要（原文）/);
  assert.match(html, /Unchanged official words\./);
  assert.match(html, /中文摘要译文（非官方，供参考）/);
  assert.match(html, /2026-01-02/);
  assert.match(html, /生效日期<\/dt><dd><span>未提供/);
  assert.match(html, /历史官方摘要与当前摘要一致/);
  assert.match(html, /href="https:\/\/www.ich.org\/page\/quality-guidelines"/);
  assert.doesNotMatch(
    html,
    /<pre|<script|href="javascript:|T00:00:00|content_snapshot|source_hash/,
  );
  assert.equal(JSON.stringify(report), before);
});

test("all non-regulation report previews render nested records and comparisons readably", () => {
  const change = {
    change_types: ["STATUS_CHANGED"],
    changed_fields: [
      { field: "status", old_value: "DRAFT", new_value: "FINAL" },
    ],
    sections: [],
  };
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ["changes", change, /旧值<\/th><th>新值/],
    [
      "comparison",
      {
        comparison: change,
        version_a: { version_name: "1" },
        version_b: { version_name: "2" },
        unchanged_fields: ["document_number"],
      },
      /征求意见稿/,
    ],
    [
      "versions",
      {
        version_name: "2",
        content_snapshot: JSON.stringify({
          title_original: "Historical title",
          publication_date: "2020-02-01T00:00:00Z",
        }),
      },
      /Historical title/,
    ],
    [
      "digest",
      {
        date: "weekly:2026-11-23",
        timezone: "Asia/Shanghai",
        summary: {
          period: "weekly",
          new_count: 3,
          updated_count: 0,
          new_regulations: [
            { title: "Saved title", official_url: "https://www.fda.gov/" },
          ],
        },
      },
      /Saved title/,
    ],
    [
      "watchlist",
      {
        watchlist: { name: "我的关注" },
        reasons: ["regulator: EMA"],
        change_event: change,
      },
      /发布机构：EMA/,
    ],
    [
      "sources",
      {
        enabled: false,
        current_status: "DEGRADED",
        recent_logs: [
          {
            started_at: "2026-11-23T00:00:00Z",
            finished_at: null,
            status: "SUCCESS",
            records_failed: 1,
            error_message: "HTTP 403",
          },
        ],
      },
      /执行中/,
    ],
    [
      "notifications",
      {
        title: "通知",
        message: "保存的内容",
        read_at: null,
        delivery_status: "PENDING",
      },
      /未读/,
    ],
    [
      "summary",
      { regulation_count: 0, by_agency: {}, by_severity: {} },
      /不代表全库总量/,
    ],
  ];
  for (const [type, details, expected] of cases) {
    const report: Report = {
      ...sample,
      type,
      rows: [
        {
          ...sample.rows[0],
          id: type === "summary" ? "scope-summary" : type,
          details,
        },
      ],
    };
    const before = JSON.stringify(report);
    const html = renderToStaticMarkup(createElement(ReportPreview, { report }));
    assert.match(html, expected, type);
    assert.doesNotMatch(
      html,
      /<pre|\{&quot;|&quot;old_value&quot;|content_snapshot|Not disclosed/,
      type,
    );
    assert.equal(JSON.stringify(report), before, type);
  }
});
