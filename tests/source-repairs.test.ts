import test from "node:test";
import assert from "node:assert/strict";
import {
  directoryLinks,
  parseList as fdaList,
} from "../src/server/connectors/fda/parser";
import { parseDetail as emaDetail } from "../src/server/connectors/ema/parser";
import { parseList as cdeList } from "../src/server/connectors/cde/parser";
import { pharmacopoeiaAdapter } from "../src/server/connectors/pharmacopoeia";
import { sourceCoverageStatus } from "../src/lib/sync-status";
import { verifiedMetadataOnly } from "../src/server/connectors/shared/writer";
import type { OfficialRecord } from "../src/server/connectors/shared/types";

test("FDA hub navigation is official and separate from document results", () => {
  const url =
    "https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/general-biologics-guidances";
  const html =
    '<main><a href="/vaccines-blood-biologics/general-biologics-guidances/cmc-and-gmp-guidances">CMC and GMP Guidances</a><a href="https://evil.test/vaccines-blood-biologics/general-biologics-guidances/evil">Other</a></main>';
  assert.equal(directoryLinks(html, url).length, 1);
  assert.deepEqual(fdaList(html, url), []);
  assert.deepEqual(directoryLinks(html, "https://www.fda.gov/other"), []);
});
test("EMA scientific HTML Q&A does not require a PDF or fabricate dates", () => {
  const url =
    "https://www.ema.europa.eu/en/scientific-guidelines/clinical-pharmacology-pharmacokinetics-questions-answers";
  const html =
    '<h1 class="content-banner-title">Clinical pharmacology: questions and answers - Scientific guideline</h1><article class="ema-scientific-guideline"><div class="ecl-editor">Users should read the questions and answers in conjunction with the relevant scientific guidelines. Official pharmacology advice.</div></article>';
  const d = emaDetail(html, url, { url, title: "", context: "" }, url);
  assert.equal(d.type, "Questions and answers");
  assert.equal(d.date, undefined);
  assert.deepEqual(d.attachments, []);
  assert.throws(() =>
    emaDetail(
      "<h1>Access denied</h1>",
      url,
      { url, title: "", context: "" },
      url,
    ),
  );
});
test("EDQM FAQ directory discovers specific questions without indexing its portal", () => {
  const a = pharmacopoeiaAdapter("EDQM"),
    url = "https://faq.edqm.eu/display/FAQS/MICROBIOLOGY";
  const html =
    '<h1 id="title-text">MICROBIOLOGY</h1><div class="childpages-macro"><a href="/pages/viewpage.action?pageId=89489423">Microbiology chapter 2.6.1: which strains can be used?</a></div>';
  assert.equal(a.directoryLinks!(html, url).length, 1);
  assert.deepEqual(a.parseList(html, url), []);
});
test("CDE official republication requires attribution; repost date is not original publication date", () => {
  const url = "https://www.ydcdei.org.cn/news/show/1085607283813265408";
  const html =
    '<div class="detailBox"><div class="title">药审中心发布《生物类似药说明书撰写技术指导原则》</div><div class="date">发布时间：2025年02月08日</div><div class="content">' +
    "官方生物类似药指导原则公开介绍。".repeat(8) +
    '</div><div class="pull-right">来源：国家药监局药审中心</div></div>';
  const row = cdeList(html, url)[0];
  assert.equal(row.document?.title, "生物类似药说明书撰写技术指导原则");
  assert.equal(row.document?.date, undefined);
  assert.equal(row.document?.metadata?.full_text_captured, false);
  assert.throws(() =>
    cdeList(html.replace("来源：国家药监局药审中心", "来源：未知"), url),
  );
});
test("a successful single-source task cannot hide other degraded sources", () => {
  assert.equal(
    sourceCoverageStatus({ FDA: "HEALTHY", CDE: "DEGRADED" }),
    "PARTIAL_SUCCESS",
  );
  assert.equal(
    sourceCoverageStatus({ FDA: "HEALTHY", CDE: "DISABLED" }),
    "SUCCESS",
  );
  assert.equal(sourceCoverageStatus({ CDE: "UNAVAILABLE" }), "FAILED");
});

test("metadata-only admission requires parser verification and a specific official document URL", () => {
  const data = {
    regulator: "FDA",
    official_url:
      "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/biological-quality",
    source_metadata: {
      metadata_verified: true,
      capture_scope: "official_guidance_metadata",
    },
  } as unknown as OfficialRecord;
  assert.equal(verifiedMetadataOnly(data), true);
  assert.equal(
    verifiedMetadataOnly({ ...data, official_url: "https://www.fda.gov/" }),
    false,
  );
  assert.equal(
    verifiedMetadataOnly({
      ...data,
      official_url: data.official_url!.replace("www.fda.gov", "evil.test"),
    }),
    false,
  );
  assert.equal(verifiedMetadataOnly({ ...data, source_metadata: {} }), false);
});
