import type { Regulation } from "../lib/types";
export function DocumentFacts({
  record: r,
  detailed = false,
}: {
  record: Regulation;
  detailed?: boolean;
}) {
  const meta = r.source_metadata || {};
  const titleProof = (meta.bioreg_title_label ||
    meta.bioreg_title_translation) as Record<string, unknown> | undefined;
  const titleSource =
    titleProof?.method === "official_catalog" ||
    titleProof?.method === "official_publication";
  const review = meta.bioreg_field_review as
    | {
        checked_at?: string;
        fields?: Record<string, { state: string; reason: string }>;
        checks?: { url: string; outcome: string; reason?: string }[];
      }
    | undefined;
  const future =
    r.effective_date &&
    r.effective_date > new Date().toISOString().slice(0, 10) &&
    !["Withdrawn", "Superseded", "Archived"].includes(r.status);
  const officialVersion =
    typeof meta.official_version === "string"
      ? meta.official_version
      : typeof meta.guideline_code === "string"
        ? meta.guideline_code
        : typeof meta.revision === "string"
          ? meta.revision
          : "未提供";
  const regions = Array.isArray(meta.regional_implementation)
    ? meta.regional_implementation
    : [];
  return (
    <div className="document-facts">
      {detailed && meta.adoption_status === "Adopted" && <p>官方采纳状态：已采纳（不等同于已生效）。</p>}
      {detailed && meta.full_text_captured === false && <p>资料范围：未获取完整正文。</p>}
      {!detailed && (
        <>
          <p>
            中文标题：{r.title_zh || "待翻译"}
            {r.title_zh &&
              r.title_zh !== r.title_original &&
              (titleSource
                ? "（官方机构公开中文标题）"
                : "（BioReg 译名，非官方中文标题）")}
          </p>
          <p>
            {r.document_number
              ? `编号：${r.document_number}`
              : r.regulator === "FDA" && r.docket_number
                ? `FDA Docket 编号：${r.docket_number}`
                : "编号：未提供"}{" "}
            ·{" "}
            {r.regulator === "USP" || r.regulator === "EDQM"
              ? "目录版本/协调状态（非生效状态）"
              : "官方版本"}
            ：{officialVersion} · 系统记录版本：v{r.version}
          </p>
          <p>
            发布日期：{r.publication_date || r.publication_date_raw || "未提供"}{" "}
            · 生效日期：{r.effective_date || "未提供"}
          </p>
        </>
      )}
      {titleSource && typeof titleProof?.source_url === "string" && (
        <p>
          <a
            href={titleProof.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            中文标题依据：{String(titleProof.publisher || "官方机构")}
          </a>
        </p>
      )}
      {detailed && review?.fields && (
        <details>
          <summary>字段核验依据及未补齐原因</summary>
          <p>
            最近核验：{review.checked_at?.slice(0, 10) || "未记录"}
            。资料补录不代表法规发生新的变更。
          </p>
          {Object.entries(review.fields).map(([key, value]) => (
            <p key={key}>
              {(
                {
                  document_number: "文件编号",
                  official_version: "官方版本",
                  publication_date: "发布日期",
                  effective_date: "生效日期",
                  status: "发布状态",
                } as Record<string, string>
              )[key] || key}
              ：{value.reason}
            </p>
          ))}
          {review.checks?.map((check, i) => (
            <p key={i}>
              <a href={check.url} target="_blank" rel="noopener noreferrer">
                官方依据 {i + 1}
              </a>
              ：
              {check.outcome === "captured_for_review"
                ? "已取得用于核验的资料"
                : /429/.test(check.reason || "")
                  ? "来源限制请求频率，本轮核验暂缓"
                  : /403/.test(check.reason || "")
                    ? "来源拒绝访问，本轮未完成核验"
                    : "本轮未取得可用资料，尚未完成核验"}
            </p>
          ))}
        </details>
      )}
      {detailed && officialVersion !== "未提供" && (
        <p>
          {r.regulator === "USP" || r.regulator === "EDQM"
            ? "目录版本/协调状态（非生效状态）"
            : "官方版本"}
          ：{officialVersion}
        </p>
      )}
      <p>
        {!detailed && (
          <>发布状态：{r.status === "Unknown" ? "状态待核实" : r.status} · </>
        )}
        生效信息：
        {future
          ? "尚未生效（所载生效日未到）"
          : r.status === "Effective"
            ? "已生效"
            : "未单独核验；发布不等于已生效"}
      </p>
      {r.regulator === "ICH" && (
        <>
          <p>
            ICH 发布阶段：
            {typeof meta.current_step === "string"
              ? meta.current_step
              : "未提供"}
            。Step 4 / 5 不代表所有地区已实施。
          </p>
          {detailed ? (
            <details>
              <summary>各地区实施记录（{regions.length}）</summary>
              {regions.length ? (
                regions.map((value, i) => {
                  const v = value as Record<string, unknown>;
                  return (
                    <p key={i}>
                      {String(v.region || "地区未提供")}：
                      {String(v.statement || "未提供")}{" "}
                      <a
                        href={"https://www.ich.org/page/ich-guidelines"}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        核验 ICH 官方实施目录
                      </a>
                    </p>
                  );
                })
              ) : (
                <p>当前未采集地区实施资料；不得据此推断已实施或未实施。</p>
              )}
            </details>
          ) : (
            <p>地区实施状态见文件详情，分别记录。</p>
          )}
        </>
      )}
      {(r.regulator === "USP" || r.regulator === "EDQM") && (
        <p>
          公开目录资料；药典正文需订阅或获得授权，本站未取得完整药典正文。协调／征求意见文件不等于现行药典正文，适用版本请在官网核验。
        </p>
      )}
      {typeof meta.catalog_excerpt === "string" && (
        <p>官方目录摘录（非完整正文）：{meta.catalog_excerpt}</p>
      )}
    </div>
  );
}
