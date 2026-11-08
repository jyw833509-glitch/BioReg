import { load } from "cheerio";
import { clean } from "../fda/parser";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";
export function parseList(html: string, url: string): Candidate[] {
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
    const article = $("article.ema-scientific-guideline");
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
      topics: ["Clinical pharmacology"],
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
      adoption_status: statuses || null,
      consultation_status: value("Consultation dates") || null,
      responsible_committee: null,
    },
  };
}
