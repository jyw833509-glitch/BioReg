import test from "node:test";
import assert from "node:assert/strict";
import {
  translationIssues,
  retainTitleProvenance,
  titleHash,
} from "../src/server/enrichment/title-quality";

test("rejects observed domain mistranslation and incomplete translations", () => {
  assert.ok(
    translationIssues(
      "Guideline on immunogenicity assessment of therapeutic proteins",
      "生物类似药免疫原性评估指南",
    ).length,
  );
  assert.ok(
    translationIssues(
      "Stability Testing of New Drug Substances and Products",
      "稳定性试验 of 新药物质和产品",
    ).length,
  );
  assert.ok(
    translationIssues(
      "Container Closure Systems for Human Drugs",
      "容器密封系统 for 人类药物",
    ).length,
  );
  assert.ok(
    translationIssues("Analytical Sieving <786>", "分析筛滤 <786>").length,
  );
});
test("preserves numbers while allowing Chinese order and rejects lost revision", () => {
  assert.deepEqual(
    translationIssues("Announcement (No. 134, 2025)", "公告（2025年第134号）"),
    [],
  );
  assert.ok(
    translationIssues("ICH Q5A(R2)", "ICH Q5A 指南").includes(
      "number_mismatch",
    ),
  );
});
test("retains provenance only for the same official title across synchronization", () => {
  const proof = {
    original_sha256: titleHash("Original"),
    method: "local_model",
  };
  assert.equal(
    retainTitleProvenance(
      "Original",
      { bioreg_title_translation: proof },
      { raw_status: "Final" },
    ).bioreg_title_translation,
    proof,
  );
  assert.deepEqual(
    retainTitleProvenance(
      "Revised",
      { bioreg_title_translation: proof },
      { raw_status: "Draft" },
    ),
    { raw_status: "Draft" },
  );
});
