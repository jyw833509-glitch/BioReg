import { load } from "cheerio";
import { clean } from "../fda/parser";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";
export function parseList(html: string, url: string): Candidate[] {
  const $ = load(html);
  const result = new Map<string, Candidate>();
  $("a[href]").each((_, e) => {
    const h = $(e).attr("href") || "";
    if (!h.includes("zdyzIdCODE=")) return;
    const target = officialUrl(h, url, config.hosts);
    result.set(target, {
      url: target,
      title: clean($(e).text()),
      context: "技术指导原则",
    });
  });
  return [...result.values()];
}
export function parseDetail(
  html: string,
  url: string,
  _c: Candidate,
  sourcePage: string,
): Document {
  const $ = load(html);
  const fields: Record<string, string> = {};
  $("tr").each((_, e) => {
    const cells = $(e).find("td,th");
    if (cells.length >= 2)
      fields[clean(cells.first().text())] = clean(cells.eq(1).text());
  });
  const title = fields["名称"];
  if (!title)
    throw new Error(
      "Unrecognized CDE guidance table; access may require verification",
    );
  const attachments: string[] = [];
  $("tr")
    .filter((_, e) => /^附件/.test(clean($(e).find("td,th").first().text())))
    .find("a[href]")
    .each((_, e) => {
      attachments.push(officialUrl($(e).attr("href")!, url, config.hosts));
    });
  const rawStatus = fields["版本状态"] || "";
  return {
    title,
    url: officialUrl(url, url, config.hosts),
    sourcePage,
    documentNumber: fields["文号"] || null,
    type: /征求意见/.test(rawStatus) ? "指导原则征求意见稿" : "技术指导原则",
    status: rawStatus,
    date: fields["发布时间"],
    attachments,
    topics: [fields["适用范围"], fields["专业分类"]].filter(Boolean),
    metadata: {
      professional_category: fields["专业分类"] || null,
      applicability: fields["适用范围"] || null,
    },
  };
}
