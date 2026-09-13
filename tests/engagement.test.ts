import test from "node:test";
import assert from "node:assert/strict";
import { watchlistSchema } from "../src/server/validation";
import { matchWatchlist, priority } from "../src/server/engagement/matcher";
import { dayWindow, dueDate } from "../src/server/engagement/time";
import { settingsSchema } from "../src/server/engagement/digest";
import type {
  Regulation,
  Watchlist,
  ChangeEvent,
} from "../src/generated/prisma/client";
const r = {
  title_original: "Ｂｉｏｌｏｇｉｃｓ Guidance",
  title_zh: "",
  content_text: "Manufacturing   process validation",
  official_summary: "Clinical trials",
  summary_zh: "",
  regulator: "FDA",
  country_or_region: "United States",
  categories: ["Quality"],
  subcategories: ["CMC"],
  product_types: ["Antibody"],
  development_stages: ["Clinical"],
  affected_departments: ["QA"],
  document_type: "FINAL_GUIDANCE",
  status: "FINAL",
  importance_level: "HIGH",
  is_mock: false,
  attachment_urls: [],
} as unknown as Regulation;
const w = (data: Record<string, unknown> = {}) =>
  ({ ...watchlistSchema.parse({ name: "test", ...data }) }) as Watchlist;
const e = {
  change_types: ["CONTENT_CHANGED"],
  severity: "MEDIUM",
} as ChangeEvent;
for (const [field, value] of Object.entries({
  regulators: ["FDA"],
  country_or_regions: ["United States"],
  categories: ["Quality"],
  subcategories: ["CMC"],
  product_types: ["Antibody"],
  development_stages: ["Clinical"],
  affected_departments: ["QA"],
  document_types: ["FINAL_GUIDANCE"],
  statuses: ["FINAL"],
  importance_levels: ["HIGH"],
  keywords: ["BIOLOGICS"],
  change_types: ["CONTENT_CHANGED"],
  minimum_severity: "MEDIUM",
}))
  test("matcher " + field, () =>
    assert.equal(matchWatchlist(w({ [field]: value }), r, e).matched, true),
  );
test("keyword matches captured content and summary", () => {
  for (const key of ["manufacturing process", "clinical trials"])
    assert.equal(matchWatchlist(w({ keywords: [key] }), r, e).matched, true);
});
test("AND across fields OR within field and explain reasons", () => {
  const result = matchWatchlist(
    w({
      regulators: ["FDA", "EMA"],
      categories: ["Quality"],
      keywords: ["nonexistent", "validation"],
    }),
    r,
    e,
  );
  assert.equal(result.matched, true);
  assert.equal(result.reasons.length, 3);
  assert.equal(
    matchWatchlist(w({ regulators: ["EMA"], categories: ["Quality"] }), r, e)
      .matched,
    false,
  );
});
test("missing field does not match and empty filters unrestricted", () => {
  assert.equal(
    matchWatchlist(w({ categories: ["Quality"] }), { ...r, categories: [] }, e)
      .matched,
    false,
  );
  assert.equal(matchWatchlist(w(), r).matched, true);
  assert.equal(matchWatchlist(w({ enabled: false }), r).matched, false);
});
test("new document type and severity minimum", () => {
  assert.equal(
    matchWatchlist(w({ change_types: ["NEW_DOCUMENT"] }), r).matched,
    true,
  );
  assert.equal(
    matchWatchlist(w({ minimum_severity: "HIGH" }), r, e).matched,
    false,
  );
});
for (const [label, data] of Object.entries({
  mock: { is_mock: true },
  verification: { content_text: "Please verify you are human" },
  denied: { title_original: "Access Denied" },
  empty: { content_text: "", official_summary: "" },
  captcha: { content_text: '<div class="g-recaptcha">captcha</div>' },
}))
  test("exclude " + label, () =>
    assert.equal(matchWatchlist(w(), { ...r, ...data }).matched, false),
  );
test("central priority rules", () => {
  assert.equal(
    priority(r, { ...e, change_types: ["DRAFT_TO_FINAL"] }),
    "CRITICAL",
  );
  assert.equal(priority(r), "HIGH");
  assert.equal(
    priority({ ...r, importance_level: "LOW" }, { ...e, severity: "LOW" }),
    "LOW",
  );
});
test("DST and non-UTC calendar windows", () => {
  for (const [date, hours] of [
    ["2026-03-08", 23],
    ["2026-11-01", 25],
  ] as const) {
    const win = dayWindow(date, "America/New_York");
    assert.equal((+win.end - +win.start) / 3600000, hours);
  }
  assert.equal(
    dayWindow("2026-09-14", "Asia/Shanghai").start.toISOString(),
    "2026-09-13T16:00:00.000Z",
  );
});
test("configured due time generates prior complete day", () => {
  assert.equal(
    dueDate(new Date("2026-09-14T00:00:00Z"), "Asia/Shanghai", "08:00"),
    "2026-09-13",
  );
  assert.equal(
    dueDate(new Date("2026-09-13T23:59:00Z"), "Asia/Shanghai", "08:00"),
    null,
  );
  assert.throws(() =>
    settingsSchema.parse({
      digest_enabled: true,
      digest_time: "25:00",
      timezone: "invalid",
    }),
  );
});
