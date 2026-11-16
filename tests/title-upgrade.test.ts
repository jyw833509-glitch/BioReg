import test from "node:test";
import assert from "node:assert/strict";
import { canUpgradeAutomaticTitle } from "../src/server/enrichment/title-review";
import { titleHash, translationIssues } from "../src/server/enrichment/title-quality";
test("reviewed upgrades preserve official titles and reject stale automatic provenance", () => {
 const original="Good Clinical Practice", current="旧译名";
 const proof={method:"local_model_quality_checked",original_sha256:titleHash(original),translation_sha256:titleHash(current)};
 const next={method:"reviewed_local_model" as const,translation:"药物临床试验质量管理规范"};
 assert.equal(canUpgradeAutomaticTitle(original,current,{bioreg_title_translation:proof},next),true);
 assert.equal(canUpgradeAutomaticTitle(original,"手工修改",{bioreg_title_translation:proof},next),false);
 assert.equal(canUpgradeAutomaticTitle(original,current,{bioreg_title_translation:{...proof,method:"official_catalog"}},next),false);
 assert.ok(translationIssues(original,"药物良好临床实践").length);
 assert.ok(translationIssues("Drug Regulatory Data","药品监管数据").length);
 assert.deepEqual(translationIssues(original,next.translation),[]);
});
