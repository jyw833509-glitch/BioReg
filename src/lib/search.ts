import type { Regulation } from "./types";
export function searchRegulations(
  records: Regulation[],
  query: string,
  filters: Record<string, string> = {},
) {
  const q = query.trim().toLowerCase();
  return records.filter(
    (r) =>
      (!q ||
        [
          r.title_original,
          r.title_zh,
          r.document_number,
          r.content_text,
          ...r.keywords,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q)) &&
      Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        if (key === "date") return r.publication_date >= value;
        if (key === "change") return value === "New" ? r.is_new : r.is_updated;
        const field = r[key as keyof Regulation];
        return Array.isArray(field)
          ? field.includes(value as never)
          : field === value;
      }),
  );
}
export function generatePrompt(
  records: Regulation[],
  task = "Explain Regulation",
) {
  return `任务：${task}。请区分官方材料与开发示例。\n\n${records.map((r) => `数据类型：${r.is_mock ? "Development / Mock Data，不是真实法规" : "Real Official Data"}\n监管机构：${r.regulator}\n法规名称：${r.title_original}\n发布日期：${r.publication_date || r.publication_date_raw || "未提供"}\n状态：${r.status}\n官方来源：${r.official_url || "未提供"}\n官方摘要：${r.official_summary || "未提供"}\n内容：${r.content_text}`).join("\n\n---\n\n")}\n\n使用中文回答。不要把 Mock 示例当作监管事实。区分官方原文与 AI 分析，不得虚构监管要求；无法确认的信息写“官方文件中未确认”。所有监管事实必须可追溯至输入官方材料。`;
}

// Curated retrieval vocabulary, not translations of official document titles or facts.
export const synonymGroups = [
  ["生物类似药", "biosimilar", "biosimilars"],
  ["稳定性", "stability"],
  ["分析方法", "analytical procedure", "analytical method"],
  ["方法验证", "validation of analytical", "analytical validation"],
  ["病毒安全", "viral safety"],
  ["质量", "quality"],
  ["药典", "pharmacopoeia", "pharmacopeia", "pharmacopeial"],
  ["内毒素", "endotoxin", "endotoxins"],
  ["无菌", "sterility", "sterile"],
  ["单克隆抗体", "单抗", "monoclonal antibody", "monoclonal antibodies"],
  ["细胞治疗", "cell therapy"],
  ["基因治疗", "gene therapy"],
  ["免疫原性", "immunogenicity"],
  ["可比性", "comparability"],
  ["杂质", "impurities"],
  ["生物制品", "biological products", "biologics"],
] as const;
export function searchTerms(input: string): string[] {
  const q = input.normalize("NFKC").trim().toLowerCase();
  if (!q) return [];
  const terms = new Set([q]);
  terms.add(q.replace(/^(?:usp|ep|ph\.?\s*eur\.?)\s+/i, ""));
  const code = q.match(/(?:ich\s*)?\b([qsem]\d+[a-z]?)(?:\s*\(?r\d+\)?)?/i);
  if (code) terms.add(code[1].toLowerCase());
  for (const group of synonymGroups)
    for (const word of group) {
      if (q.includes(word))
        for (const alternative of group)
          terms.add(q.replace(word, alternative));
    }
  // Number formats: ICH Q5A(R2), Q5A R2 and USP <85> remain searchable.
  terms.add(q.replace(/[\s<>()[\]（）、.-]/g, ""));
  return [...terms].filter(Boolean).slice(0, 20);
}
export const officialSearchSources = [
  {
    code: "FDA",
    name: "FDA",
    url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents",
    parameter: "search",
    scope: "已配置的 CBER 指南目录",
  },
  {
    code: "EMA",
    name: "EMA",
    url: "https://www.ema.europa.eu/en/search",
    parameter: "search_api_fulltext",
    scope: "已配置的科学指南目录",
  },
  {
    code: "NMPA",
    name: "NMPA",
    url: "https://www.nmpa.gov.cn/",
    scope: "已配置的药品公告目录；官网入口",
  },
  {
    code: "CDE",
    name: "CDE",
    url: "https://www.cde.org.cn/",
    scope: "指导原则目录；官网可能限制自动访问",
  },
  {
    code: "ICH",
    name: "ICH",
    url: "https://www.ich.org/page/ich-guidelines",
    scope: "Q / S / E / M 指南目录；实施状态需按地区核验",
  },
  {
    code: "PMDA",
    name: "PMDA",
    url: "https://www.pmda.go.jp/english/review-services/standards/0001.html",
    scope: "已配置的英文指南目录",
  },
  {
    code: "USP",
    name: "USP",
    url: "https://www.usp.org/harmonization-standards",
    scope: "公开协调文件目录；USP–NF 正文可能需授权登录",
  },
  {
    code: "EDQM",
    name: "EP / EDQM",
    url: "https://www.edqm.eu/en/knowledge-database",
    scope: "公开技术指南目录；Ph. Eur. 正文可能需授权登录",
  },
] as const;
export function officialSearchUrl(code: string, keyword: string) {
  const source = officialSearchSources.find((s) => s.code === code);
  if (!source) return null;
  const url = new URL(source.url);
  if ("parameter" in source && keyword.trim())
    url.searchParams.set(source.parameter, keyword.trim());
  return url.href;
}
