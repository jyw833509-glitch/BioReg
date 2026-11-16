export interface ReviewedRecord {
  regulator: string;
  title_original: string;
  document_number?: string | null;
  publication_date?: unknown;
  publication_date_raw?: string | null;
  effective_date?: unknown;
  status: string;
  source_metadata?: Record<string, unknown>;
}
export interface EvidenceCheck {
  url: string;
  outcome: string;
  reason?: string;
  checked_at?: string;
  content_sha256?: string;
  inspected_pages?: { page: number }[];
  total_pages?: number;
}
export function buildFieldReview(
  record: ReviewedRecord,
  checks: EvidenceCheck[],
  checkedAt: string,
) {
  const meta = record.source_metadata || {};
  const version =
    meta.official_version ||
    meta.revision ||
    (typeof meta.guideline_code === "string"
      ? meta.guideline_code.match(/\(R\d+\)/)?.[0]
      : null);
  const values: Record<string, unknown> = {
    document_number: record.document_number,
    official_version: version,
    publication_date: record.publication_date,
    effective_date: record.effective_date,
    status: /^unknown$/i.test(record.status) ? null : record.status,
  };
  const failed = checks.filter((c) => c.outcome !== "captured_for_review");
  const captured = checks.filter((c) => c.outcome === "captured_for_review");
  const fields: Record<string, { state: string; reason: string }> = {};
  for (const [field, value] of Object.entries(values)) {
    if (value) {
      fields[field] = {
        state: "available",
        reason: "已有官方来源记录；具体依据见来源元数据及原文。",
      };
      continue;
    }
    let reason = captured.length
      ? "已检查关联官方页面或附件，尚未提取到能明确归属于本文件的该项信息；不据此认定该信息不存在。"
      : "本轮未能取得可用于核验的官方页面或附件，无法确认该字段。";
    let state = captured.length ? "not_verified" : "access_limited";
    if (field === "publication_date" && record.publication_date_raw) {
      state = "partial_date";
      reason = `官方保留的日期原文为“${record.publication_date_raw}”，尚未核实可精确到日的发布日期，不补造日期。`;
    }
    if (
      field === "publication_date" &&
      record.regulator === "ICH" &&
      meta.adoption_date_raw
    ) {
      reason = `目录另载采纳日期“${meta.adoption_date_raw}”（${meta.adoption_date_label || "采纳日期"}）；未将采纳日自动当成发布日期。`;
    }
    if (field === "publication_date" && record.regulator === "NMPA") {
      reason =
        "英文页面更新时间、公告成文日期和公开发布日期可能不同；尚未核实本文件的明确公开发布日期，不以翻译网页更新时间或落款日期代填。";
    }
    if (field === "effective_date" && record.regulator === "NMPA") {
      reason =
        "尚未取得可无歧义确定具体日期的生效条款；‘自发布/印发之日起’需与对应事件日期核对，不自动套用网页更新时间或成文日期。";
    }
    if (field === "effective_date" && record.regulator === "ICH") {
      state = "regional_only";
      reason =
        "ICH 指南的地区实施资料单独保存；本字段未核验统一生效日期，不能以 Step 4/5 或某一地区实施日替代。";
    }
    if (field === "effective_date" && /USP|EDQM/.test(record.regulator)) {
      reason =
        "当前采集的是公开目录、协调资料或 FAQ，未取得可确认适用药典正文及其生效日期的完整授权资料。";
    }
    if (
      field === "document_number" &&
      /Policy Interpretation/i.test(record.title_original)
    ) {
      reason =
        "这是政策解读文件；尚未核实其独立文件编号，不借用被解读公告的编号。";
    }
    if (failed.length)
      reason += ` 本轮有 ${failed.length} 个关联入口未完成核验，具体原因见下方检查记录。`;
    if (
      checks.some(
        (c) =>
          c.total_pages &&
          c.inspected_pages &&
          c.inspected_pages.length < c.total_pages,
      )
    )
      reason += " PDF 仅检查首页起15页及末2页，并非全文核验。";
    fields[field] = { state, reason };
  }
  return {
    schema: 1,
    checked_at: checkedAt,
    fields,
    checks: checks.map((c) => ({
      url: c.url,
      outcome: c.outcome,
      reason: c.reason || null,
      checked_at: c.checked_at || checkedAt,
      content_sha256: c.content_sha256 || null,
      total_pages: c.total_pages || null,
      inspected_pages: c.inspected_pages?.map((p) => p.page) || [],
    })),
  };
}
