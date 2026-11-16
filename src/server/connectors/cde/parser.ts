import { load } from "cheerio";
import { clean } from "../fda/parser";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";
export function recognizedEmptyDirectory(html: string, url: string) {
  const u = new URL(url), $ = load(html);
  return u.hostname === "www.ydcdei.org.cn" && u.pathname === "/search" &&
    $("title").text() === "检索-国家药品监督管理局药品审评检查长三角分中心" &&
    $(".searchBox").length > 0 && $("input[name=keyword]").length > 0;
}
export function directoryLinks(html: string, url: string) {
  const u = new URL(url);
  if (u.hostname !== "www.ydcdei.org.cn" || u.pathname !== "/search" || u.searchParams.has("pageNo")) return [];
  const total = Number(html.match(/total:\s*(\d+)/)?.[1] || 1);
  if (total > 25) throw new Error("CDE public search pagination exceeds bounded coverage; review required");
  return Array.from({ length: Math.max(0, total - 1) }, (_, i) => {
    const next = new URL(u); next.searchParams.set("pageNo", String(i + 2)); return next.toString();
  });
}
export function parseList(html: string, url: string): Candidate[] {
  if (new URL(url).hostname === "www.ydcdei.org.cn") {
    if (new URL(url).pathname === "/search") {
      const $ = load(html);
      return $("a[title][href]").toArray().flatMap((el) => {
        const title = clean($(el).attr("title") || "");
        if (/培训|研讨会|成功举办/.test(title)) return [];
        if (!/指导原则/.test(title) || !/生物制品|生物类似药|细胞|基因|疫苗|抗体|蛋白|ICH/.test(title)) return [];
        const target = officialUrl($(el).attr("href")!, url, config.hosts);
        if (!/^\/news\/show\/\d+$/.test(new URL(target).pathname)) return [];
        return [{ url: target, title, context: "官方分中心转载", sourcePage: url }];
      });
    }
    const document = parseDetail(
      html,
      url,
      { url, title: "", context: "" },
      url,
    );
    return [
      { url, title: document.title, context: "官方分中心转载", document },
    ];
  }
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
  if (new URL(url).hostname === "www.ydcdei.org.cn") {
    const heading = clean($(".detailBox > .title").text());
    const content = clean($(".detailBox > .content").text());
    const attribution = clean($(".detailBox > .pull-right").text());
    const title = heading.match(/《([^》]+)》/)?.[1];
    if (
      !title ||
      !/指导原则/.test(heading) ||
      content.length < 60 ||
      !/来源[：:]\s*国家(?:药监局|局)药审中心(?:网站)?/.test(attribution)
    )
      throw new Error(
        "Unverified CDE document on official regional center page",
      );
    return {
      title,
      url: officialUrl(url, url, config.hosts),
      sourcePage,
      type: /征求.*意见/.test(heading) ? "征求意见稿" : "技术指导原则",
      status: /征求.*意见/.test(heading) ? "征求意见" : /关于发布|发布《/.test(heading) ? "正式发布" : "",
      content,
      attachments: $(".detailBox .content a[href]")
        .toArray()
        .flatMap((el) => {
          try {
            const target = officialUrl($(el).attr("href")!, url, config.hosts);
            return /\.pdf(?:\?|$)/i.test(target) ? [target] : [];
          } catch {
            return [];
          }
        }),
      metadata: {
        capture_scope: "official_regional_center_announcement",
        full_text_captured: false,
        issuing_authority: "国家药监局药审中心",
        republication_host: "国家药品监督管理局药品审评检查长三角分中心",
        announcement_title: heading,
        republication_date_raw: clean($(".detailBox > .date").text()),
        publication_status: "not_verified",
      },
    };
  }
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

