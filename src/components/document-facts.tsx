import type { Regulation } from "../lib/types";
export function DocumentFacts({
  record: r,
  detailed = false,
}: {
  record: Regulation;
  detailed?: boolean;
}) {
  const meta = r.source_metadata || {};
  const future =
    r.effective_date &&
    r.effective_date > new Date().toISOString().slice(0, 10) &&
    !["Withdrawn", "Superseded", "Archived"].includes(r.status);
  const officialVersion =
    typeof meta.guideline_code === "string"
      ? meta.guideline_code
      : typeof meta.revision === "string"
        ? meta.revision
        : "未提供";
  const regions = Array.isArray(meta.regional_implementation)
    ? meta.regional_implementation
    : [];
  return (
    <div className="document-facts">
      <p>中文标题：{r.title_zh || "未提供（未自动翻译）"}</p>
      <p>
        编号：{r.document_number || "未提供"} ·{" "}
        {r.regulator === "USP" || r.regulator === "EDQM"
          ? "目录版本/协调状态（非生效状态）"
          : "官方版本"}
        ：{officialVersion} · BioReg 快照：v{r.version}
      </p>
      <p>
        发布日期：{r.publication_date || r.publication_date_raw || "未提供"} ·
        生效日期：{r.effective_date || "未提供"}
      </p>
      <p>
        发布状态：{r.status} · 生效信息：
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
          公开目录资料；未取得完整药典正文。协调／征求意见文件不等于现行药典正文，适用版本请在官网核验。
        </p>
      )}
      {typeof meta.catalog_excerpt === "string" && (
        <p>官方目录摘录（非完整正文）：{meta.catalog_excerpt}</p>
      )}
    </div>
  );
}
