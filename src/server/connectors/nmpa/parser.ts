import { load } from "cheerio";
import { clean } from "../fda/parser";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";
export function parseList(html: string, url: string): Candidate[] {
  const $ = load(html);
  const result = new Map<string, Candidate>();
  if (new URL(url).hostname === "english.nmpa.gov.cn") {
    $("h3.list-tit a[href]").each((_, e) => {
      const target = officialUrl($(e).attr("href")!, url, config.hosts);
      if (!/\/c_\d+\.htm$/.test(target)) return;
      result.set(target, {
        url: target,
        title: clean($(e).text()),
        context: "Drugs",
      });
    });
    return [...result.values()];
  }
  $("a[href]").each((_, e) => {
    const href = $(e).attr("href") || "";
    if (!/\/\d{10,}\.html$/.test(href)) return;
    const target = officialUrl(href, url, config.hosts);
    result.set(target, { url: target, title: clean($(e).text()), context: "" });
  });
  return [...result.values()];
}
// Pending live verification: never accept an access-challenge page as a document.
export function parseDetail(
  html: string,
  url: string,
  _c: Candidate,
  sourcePage: string,
): Document {
  const $ = load(html);
  if (new URL(url).hostname === "english.nmpa.gov.cn") {
    const title = clean($(".art-tit").text());
    const body = $(".art-text");
    if (!title || !body.length || !clean(body.text()))
      throw new Error("Unrecognized NMPA English official article");
    const info = clean($(".art-info").text());
    const attachments = body
      .find("a[href]")
      .map((_, e) => $(e).attr("href")!)
      .get()
      .filter((h) => /\.(pdf|docx?)(?:\?|$)/i.test(h))
      .map((h) => officialUrl(h, url, config.hosts));
    return {
      title,
      url: officialUrl(url, url, config.hosts),
      sourcePage,
      type: /^Policy Interpretation/i.test(title)
        ? "Policy Interpretation"
        : title,
      status: /\(Abolished\)/i.test(title) ? "废止" : "",
      updatedDate: /Updated:\s*(\d{4}-\d{2}-\d{2})/.exec(info)?.[1],
      documentNumber: /^(?:NMPA )?Announcement/i.test(title)
        ? title.match(/\((?:\[\d{4}\]\s*)?No\.\s*\d+(?:,\s*\d{4})?\)/i)?.[0] ||
          null
        : null,
      attachments,
      content: clean(body.text()),
      summary: $("meta[name=description]").attr("content") || null,
      metadata: {
        language: "en",
        publication_channel: "NMPA official English website",
        publisher_credit: clean($(".art-info span").first().text()) || null,
        date_basis:
          "Updated is the English webpage update date, not the original promulgation date",
        coverage:
          "Official English publications; Chinese portal not yet accessible",
      },
    };
  }
  const meta = (name: string) =>
    $("meta")
      .filter(
        (_, e) =>
          ($(e).attr("name") || "").toLowerCase() === name.toLowerCase(),
      )
      .attr("content") || "";
  const title = clean(meta("ArticleTitle"));
  const body = $("#zoom, .article-content, .TRS_Editor").first();
  if (!title || !body.length)
    throw new Error(
      "Unrecognized NMPA article metadata/body; live parser verification pending",
    );
  const content = clean(body.text());
  const attachments = body
    .find("a[href]")
    .map((_, e) => $(e).attr("href") || "")
    .get()
    .filter((h) => /\.(pdf|docx?)(?:\?|$)/i.test(h))
    .map((h) => officialUrl(h, url, config.hosts));
  return {
    title,
    url: officialUrl(url, url, config.hosts),
    sourcePage,
    type: meta("ColumnName"),
    status: meta("Validity"),
    date: meta("PubDate"),
    documentNumber:
      meta("DocumentNumber") ||
      title.match(
        /(?:国药监[^（(\s]*[〔（(]\d{4}[〕）)]\s*\d+号|[（(]\d{4}年第\d+号[）)])/u,
      )?.[0] ||
      null,
    summary: meta("Description") || null,
    content,
    attachments,
    offices: [meta("ContentSource")].filter(Boolean),
    metadata: { publishing_department: meta("ContentSource") || null },
  };
}
