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
    if (!/scientific-guideline$/.test(href)) return;
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
  if (!title) throw new Error("Unrecognized EMA guideline document structure");
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
