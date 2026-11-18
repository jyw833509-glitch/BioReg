import test from "node:test";
import assert from "node:assert/strict";
import { parseList as fdaList, BIOSIMILAR_ANALYTICAL_URL } from "../src/server/connectors/fda/parser";
import { parseList as emaList } from "../src/server/connectors/ema/parser";
import { BIOLOGICAL_QA_URL } from "../src/server/connectors/ema/config";

test("checklist reference seeds require actual official document structure", () => {
  const fda = '<span class="content-type-label">GUIDANCE DOCUMENT</span><h1 class="content-title">Development of Therapeutic Protein Biosimilars: Comparative Analytical Assessment</h1>';
  assert.equal(fdaList(fda, BIOSIMILAR_ANALYTICAL_URL)[0].url, BIOSIMILAR_ANALYTICAL_URL);
  assert.throws(() => fdaList('<h1>Access denied</h1>', BIOSIMILAR_ANALYTICAL_URL), /Unrecognized/);
  const ema = '<h1 class="content-banner-title">Questions and answers for biological medicinal products</h1><article class="ema-general"><div class="ecl-editor">This question and answer page is developed and maintained by the CHMP Biologics Working Party and provides agreed positions on biological human medicinal products.</div></article>';
  const r = emaList(ema, BIOLOGICAL_QA_URL)[0];
  assert.equal(r.url, BIOLOGICAL_QA_URL);
  assert.equal(r.document?.type, "Questions and answers");
  assert.equal(r.document?.date, undefined);
  assert.equal(r.document?.effectiveDate, undefined);
  assert.throws(() => emaList('<h1>Verification required</h1>', BIOLOGICAL_QA_URL), /Unrecognized/);
});
