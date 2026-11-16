import test from "node:test";
import assert from "node:assert/strict";
import reviewed from "../src/server/enrichment/reviewed-titles.json";
import {
  reviewedTitle,
  validTitleApproval,
} from "../src/server/enrichment/title-review";
import {
  titleHash,
  translationIssues,
} from "../src/server/enrichment/title-quality";
import { retainVerifiedFields } from "../src/server/enrichment/retain-fields";
import { buildFieldReview } from "../src/server/enrichment/field-review";

test("every reviewed title retains its exact approved hash and passes terminology gates", () => {
  assert.equal(new Set(reviewed.map((r) => r.original)).size, reviewed.length);
  for (const row of reviewed) {
    assert.deepEqual(
      translationIssues(row.original, row.translation),
      [],
      row.original,
    );
    assert.ok(reviewedTitle(row.original), row.original);
    assert.equal(reviewedTitle(row.original + " [changed]"), null);
  }
});
test("unreviewed model output cannot become an approved machine translation", () => {
  const original = "Unreviewed document";
  const translation = "未复核文件";
  assert.equal(
    validTitleApproval({
      id: "test",
      title_original: original,
      translation,
      reviewed_sha256: titleHash(original + "\n" + translation),
      method: "reviewed_local_model",
      model: "arbitrary",
      revision: "arbitrary",
      review: "terminology_and_full_title_review",
    }),
    false,
  );
});
test("observed 8B domain errors are rejected before any database import", () => {
  for (const [en, zh] of [
    ["Homeopathic Drug Products", "家庭药产品"],
    ["Performance Status", "性能状态"],
    ["Shedding Studies", "shedding 研究"],
    ["Active Immunotherapy", "活性免疫治疗"],
  ])
    assert.ok(translationIssues(en, zh).length);
});
test("new title automatic approval requires the pinned model, matching hash and all QA checks", () => {
  const title_original =
    "Guideline on endotoxin testing for therapeutic proteins";
  const translation = "治疗性蛋白内毒素检验指南";
  const row = {
    id: "isolated-new-title",
    title_original,
    translation,
    reviewed_sha256: titleHash(title_original + "\n" + translation),
    method: "local_model_quality_checked" as const,
    model: "Qwen/Qwen3-8B-GGUF",
    revision: "7c41481f57cb95916b40956ab2f0b139b296d974",
    review: "automated_terminology_numbers_and_abbreviation_checks",
    issues: [],
  };
  assert.equal(validTitleApproval(row), true);
  assert.equal(validTitleApproval({ ...row, revision: "unverified" }), false);
  assert.equal(
    validTitleApproval({ ...row, issues: ["term:endotoxin"] }),
    false,
  );
  assert.equal(validTitleApproval({ ...row, translation: "随意翻译" }), false);
});
test("unchanged source preserves enriched facts; changed attachment and explicit facts win", () => {
  const previous = {
    title_original: "Notice",
    pdf_url: "https://www.pmda.go.jp/one.pdf",
    document_number: "ABC",
    publication_date: new Date("2025-01-01"),
    effective_date: null,
    status: "FINAL",
    source_metadata: {
      bioreg_field_enrichment: {
        original_sha256: titleHash("Notice"),
        values: {
          document_number: "ABC",
          publication_date: "2025-01-01",
          status: "FINAL",
        },
      },
    },
  };
  const incoming = {
    ...previous,
    document_number: null,
    publication_date: null,
    status: "UNKNOWN",
    source_metadata: {},
  };
  assert.equal(retainVerifiedFields(previous, incoming).document_number, "ABC");
  assert.equal(
    retainVerifiedFields(previous, {
      ...incoming,
      pdf_url: "https://www.pmda.go.jp/new.pdf",
    }).document_number,
    null,
  );
  assert.equal(
    retainVerifiedFields(previous, { ...incoming, status: "WITHDRAWN" }).status,
    "WITHDRAWN",
  );
});
test("field reasons distinguish access limits, partial dates and ICH regional implementation", () => {
  const result = buildFieldReview(
    {
      regulator: "ICH",
      title_original: "Title",
      status: "UNKNOWN",
      publication_date_raw: "March 2025",
    },
    [{ url: "https://www.ich.org", outcome: "restricted", reason: "HTTP_403" }],
    "2026-11-16",
  );
  assert.equal(result.fields.document_number.state, "access_limited");
  assert.equal(result.fields.publication_date.state, "partial_date");
  assert.equal(result.fields.effective_date.state, "regional_only");
});
