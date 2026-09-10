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
