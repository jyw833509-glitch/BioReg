import { load } from "cheerio";
import { clean } from "../fda/parser";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config, BIOLOGICAL_QA_URL } from "./config";
export function parseList(html: string, url: string): Candidate[] {
  if (url === BIOLOGICAL_QA_URL) {
    const candidate = { url, title: "", context: "Biologicals" };
    const document = parseDetail(html, url, candidate, url);
    return [{ ...candidate, title: document.title, document }];
  }
  if (new URL(url).pathname.endsWith("/scientific-guidelines-output-json-report_en.json")) {
    const payload = JSON.parse(html);
    if (!Array.isArray(payload.data) || payload.meta?.total_records !== payload.data.length)
      throw new Error("Incomplete EMA scientific guideline JSON catalog");
    return payload.data.flatMap((row: { title?: string; category?: string; url?: string; first_published_date?: string; last_updated_date?: string }) => {
      if (!row.title || !row.url || !/Human/i.test(row.category || "") ||
        !/biologic|biotechnolog|biosimilar|recombinant|vaccine|antibod|cell.*therap|gene.*therap|ICH Q5/i.test(row.title)) return [];
      const target = officialUrl(row.url, url, config.hosts);
      if (!/^\/en\/scientific-guidelines\/[^/]+\/?$/.test(new URL(target).pathname)) return [];
      return [{ url: target, title: row.title, context: "Biologicals", sourcePage: url,
        fallbackDocument: { title: row.title, url: target, sourcePage: url, type: "", status: "", attachments: [],
          metadata: { metadata_verified: true, capture_scope: "official_catalog_index", full_text_captured: false,
            catalog_timestamp: payload.meta.timestamp || null,
            catalog_page_first_published: row.first_published_date || null,
            catalog_page_last_updated: row.last_updated_date || null } } }];
    });
  }
  const $ = load(html);
  const result = new Map<string, Candidate>();
  $("main a[href]").each((_, e) => {
    const href = $(e).attr("href") || "";
    // EMA migrated guideline landing pages to /en/scientific-guidelines/<slug>.
    const pathname = new URL(href, url).pathname;
    if (
      !/scientific-guideline$/.test(pathname) &&
      !/^\/en\/scientific-guidelines\/[^/]+\/?$/.test(pathname)
    )
      return;
    const target = officialUrl(href, url, config.hosts);
    result.set(target, {
      url: target,
      title: clean($(e).text()),
      context: "Biologicals",
    });
  });
  return [...result.values()];
}
export function parseDetail(
  html: string,
  url: string,
  _candidate: Candidate,
  sourcePage: string,
): Document {
  const $ = load(html);
  let section = $(".paragraph--type--ema-documents")
    .filter((_, e) => /Current effective version/i.test($(e).find("h2").text()))
    .first();
  if (!section.length) section = $(".paragraph--type--ema-documents").first();
  const file = section.find(".bcl-file").first();
  const title = clean(file.find(".file-title").text());
  if (!title) {
    const heading = clean($("h1.content-banner-title").text());
    const article = $(url === BIOLOGICAL_QA_URL ? "article.ema-general" : "article.ema-scientific-guideline");
    const content = clean(article.find(".ecl-editor").text());
    // EMA also publishes scientific Q&A directly as HTML, without a file card.
    if (
      !article.length ||
      !/questions.*answers/i.test(heading) ||
      content.length < 80
    )
      throw new Error("Unrecognized EMA guideline document structure");
    return {
      title: heading.replace(/\s*-\s*Scientific guideline\s*$/i, ""),
      url: officialUrl(url, url, config.hosts),
      sourcePage,
      type: "Questions and answers",
      status: "",
      attachments: [],
      content,
      topics: url === BIOLOGICAL_QA_URL ? ["Biologicals"] : ["Clinical pharmacology"],
      metadata: {
        capture_scope: "official_html_qa",
        full_text_captured: false,
        publication_status: "not_verified",
      },
    };
  }
  const value = (label: string) => {
    let out = "";
    file.find("small").each((_, e) => {
      if ($(e).find(".label").text().includes(label))
        out = clean($(e).find(".value").text());
    });
    return out;
  };
  const statuses = file
    .find(".file-metadata-row")
    .filter((_, e) => !$(e).find(".label").length)
    .map((_, e) => clean($(e).text()))
    .get()
    .join("; ");
  const attachments = file
    .find("a[href]")
    .map((_, e) => $(e).attr("href") || "")
    .get()
    .filter((h) => /\.(pdf|docx?)(?:\?|$)/i.test(h))
    .map((h) => officialUrl(h, url, config.hosts));
  const summary =
    clean($(".ema-node-content-wrapper .ecl-editor").first().text()) || null;
  return {
    title,
    url: officialUrl(url, url, config.hosts),
    sourcePage,
    documentNumber: value("Reference Number") || null,
    type: title,
    status: /Current effective version/i.test(section.find("h2").text())
      ? `Current effective; ${statuses}`
      : statuses,
    date: value("First published"),
    effectiveDate: value("Legal effective date"),
    updatedDate: value("Last updated"),
    attachments,
    summary,
    topics: ["Biologicals"],
    metadata: {
      capture_scope: "official_guideline_metadata",
      metadata_verified: true,
      full_text_captured: false,
      adoption_status: statuses || null,
      consultation_status: value("Consultation dates") || null,
      responsible_committee: null,
    },
  };
}
