import test from "node:test";
import assert from "node:assert/strict";
import { publicChapter, chapterPages } from "../src/server/connectors/pharmacopoeia-details";
import { pharmacopoeiaAdapter } from "../src/server/connectors/pharmacopoeia";

test("USP preview verifies chapter identity without treating citation year as effective date", () => {
  const url = chapterPages("USP").find((u) => u.includes("M6297_"))!;
  const html = '<div id="text-area"><div class="title">〈129〉 Analytical Procedures for Recombinant Therapeutic Monoclonal Antibodies</div><div class="body">This chapter provides analytical procedures for monoclonal antibodies.</div></div><div class="citation">United States Pharmacopeia (2024).</div>';
  const c = publicChapter(html, url)![0];
  const data = pharmacopoeiaAdapter("USP").read("", url, c, url).data;
  assert.equal(data.document_number, "<129>");
  assert.equal(data.publication_date, null);
  assert.equal(data.effective_date, null);
  assert.equal(data.status, "UNKNOWN");
  assert.equal(data.source_metadata?.full_text_captured, false);
  assert.equal(data.source_metadata?.access, "subscription_required");
  assert.throws(() => publicChapter(html.replace("〈129〉", "〈130〉"), url), /Unverified/);
  assert.throws(() => publicChapter('<div id="text-area"><div class="title">Page not found</div><div class="body">unpublished version</div></div>', url), /Unverified/);
  assert.equal(publicChapter(html, "https://doi.usp.org/"), null);
});

test("EDQM Knowledge preserves actual edition and planned suppression separately from effective status", () => {
  const url = chapterPages("EDQM").find((u) => u.endsWith("/20632"))!;
  const html = '<table>' + Object.entries({"Monograph Number":"20632","English Name":"Test for bacterial endotoxins using recombinant factor C (2.6.32.)","Status":"In Use","Last published in English":"11.0","On-going":"Suppressed from the ph.Eur.","State of work":"Effective date 01/01/2027"}).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("") + '</table>';
  const c = publicChapter(html, url)![0];
  const adapter = pharmacopoeiaAdapter("EDQM");
  const first = adapter.read("", url, c, url).data;
  const second = adapter.read("", url, publicChapter(html, url)![0], url).data;
  assert.equal(first.document_number, "2.6.32");
  assert.equal(first.status, "FINAL");
  assert.equal(first.effective_date, null);
  assert.equal(first.source_metadata?.official_version, "11.0");
  assert.equal(first.source_hash, second.source_hash);
  assert.equal(first.official_summary, null);
  assert.throws(()=>publicChapter(html.replace("20632", "20614"),url), /identity/);
});
