/** Read-only presentation of the immutable captured snapshot. */
export function VersionSnapshot({ snapshot }: { snapshot: string }) {
  let data: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) data = parsed as Record<string, unknown>;
  } catch { /* Older plain-text snapshots remain available below. */ }
  const text = (key: string) => typeof data?.[key] === "string" ? String(data[key]).trim() : "";
  const labels: Record<string, string> = { FINAL: "正式发布", DRAFT: "征求意见稿", EFFECTIVE: "已生效", WITHDRAWN: "已撤回", SUPERSEDED: "已被替代", UNKNOWN: "状态待核实", REVISED: "已修订", ARCHIVED: "已归档", REFLECTION_PAPER: "思考文件", GUIDELINE: "指南", FINAL_GUIDANCE: "最终指南", DRAFT_GUIDANCE: "指南征求意见稿", TECHNICAL_GUIDELINE: "技术指导原则", OTHER: "其他" };
  const fields = [["title_zh", "中文标题（当时记录）"], ["title_original", "原文标题"], ["regulator", "发布机构"], ["document_number", "文件编号"], ["document_type", "文件类型"], ["status", "发布状态"], ["publication_date", "发布日期"], ["effective_date", "生效日期"]];
  const urls = [...new Set([text("official_url"), text("pdf_url")].filter(url => /^https?:\/\//i.test(url)))];
  return <details className="version-snapshot"><summary>查看版本快照</summary>
    <p className="muted">以下为该版本保存时的信息，不代表当前状态；缺失字段不补填。</p>
    {data ? <>
      <dl>{fields.filter(([key]) => text(key)).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{labels[text(key)] || text(key)}</dd></div>)}</dl>
      {urls.map((url, i) => <a key={url} className="button" href={url} target="_blank" rel="noopener noreferrer">{url === text("official_url") ? "查看该版本官方原文" : "查看该版本官方 PDF"} ↗{i > 0 ? " " : ""}</a>)}
      {text("summary_zh") && <section><h3>当时保存的中文摘要</h3><p>{text("summary_zh")}</p></section>}
      {text("official_summary") && <details><summary>查看当时保存的官方摘要（原文）</summary><p>{text("official_summary")}</p></details>}
      {text("content_text") && text("content_text") !== text("official_summary") && <details><summary>查看已采集文本（不代表完整全文）</summary><p>{text("content_text")}</p></details>}
    </> : <p>此历史快照尚无可展示的结构化字段，可展开下方原始记录查看。</p>}
    <details><summary>查看原始数据（技术记录）</summary><pre>{snapshot}</pre></details>
  </details>;
}
