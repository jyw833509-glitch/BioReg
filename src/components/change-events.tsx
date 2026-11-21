import Link from "next/link";
const changeLabels: Record<string, string> = {
  NEW_DOCUMENT: "首次收录", METADATA_CHANGED: "基本信息变化", TITLE_CHANGED: "标题变化",
  STATUS_CHANGED: "状态变化", DRAFT_TO_FINAL: "征求意见稿转正式发布", FINAL_TO_REVISED: "正式文件修订",
  PUBLICATION_DATE_CHANGED: "发布日期变化", EFFECTIVE_DATE_CHANGED: "生效日期变化", PDF_CHANGED: "PDF 变化",
  ATTACHMENT_CHANGED: "附件变化", CONTENT_CHANGED: "正文变化", SECTION_ADDED: "新增章节",
  SECTION_REMOVED: "移除章节", SECTION_MODIFIED: "章节修改", DOCUMENT_WITHDRAWN: "文件撤回",
  DOCUMENT_SUPERSEDED: "文件被替代", UNKNOWN_CHANGE: "变化待核实",
};
export interface ChangeView {
  id: string;
  regulation_id: string;
  detected_at: string;
  change_types: string[];
  severity: string;
  change_summary: string;
  changed_fields: unknown;
  sections: unknown;
  regulation: { title_original: string; regulator: string };
  current_version: { version_name: string };
}
export function ChangeEvents({ events, compact = false }: { events: ChangeView[]; compact?: boolean }) {
  return (
    <section className="panel">
      {!compact && <h2>法规变化检测</h2>}
      {!compact && <p className="notice">
        规则检测结果，不是监管机构官方声明。版本编号为 系统记录版本。
      </p>}
      {!events.length && (
        <p>
          尚无检测事件。已有法规不会因启用检测功能而补造更新；首次真实变化将在同步时记录。
        </p>
      )}
      {events.map((e) => (
        <article className="version" key={e.id}>
          <div>
            {!compact && <Link href={`/regulations/${e.regulation_id}`}>
              <strong>{e.regulation.title_original}</strong>
            </Link>}
            <p>
              {e.regulation.regulator} · {e.detected_at} · {({ LOW: "低优先级", MEDIUM: "中优先级", HIGH: "高优先级" } as Record<string, string>)[e.severity] || e.severity} ·
              系统记录版本 v{e.current_version.version_name}
            </p>
            <p>{e.change_types.map(t => changeLabels[t] || t).join(" · ")}</p>
            <p>{e.change_summary === "New official document discovered by BioReg." ? "BioReg 首次收录此官方文件。" : e.change_summary}</p>
            <Link
              className="button"
              href={
                "/ai-tools#" +
                new URLSearchParams({
                  kind: "change",
                  id: e.id,
                  template: "change",
                })
              }
            >
              AI 解读此次变化
            </Link>
            <details>
              <summary>旧值 → 新值／章节差异</summary>
              {Array.isArray(e.changed_fields) &&
                e.changed_fields.map(
                  (
                    f: {
                      field: string;
                      old_value: unknown;
                      new_value: unknown;
                    },
                    i: number,
                  ) => (
                    <p key={i}>
                      <strong>{f.field}</strong>
                      <br />
                      {JSON.stringify(f.old_value)} →{" "}
                      {JSON.stringify(f.new_value)}
                    </p>
                  ),
                )}
              {Array.isArray(e.sections) &&
                e.sections.map(
                  (
                    s: {
                      section: string;
                      kind: string;
                      old_value: string;
                      new_value: string;
                    },
                    i: number,
                  ) => (
                    <div key={i}>
                      <h3>
                        {s.kind}: {s.section}
                      </h3>
                      <p>
                        <del>{s.old_value}</del>
                      </p>
                      <p>
                        <ins>{s.new_value}</ins>
                      </p>
                    </div>
                  ),
                )}
            </details>
          </div>
        </article>
      ))}
    </section>
  );
}
