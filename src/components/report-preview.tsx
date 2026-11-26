import type { ReactNode } from "react";
import type { Report, ReportRow } from "../server/reports/data";
import {
  reportDates,
  reportLabels,
  reportNames,
  reportText,
  reportTime,
} from "../lib/report-display";
import { syncLogDisplayStatus } from "../lib/sync-status";
import { VersionSnapshot } from "./version-snapshot";

type Data = Record<string, unknown>;
const object = (value: unknown): Data =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Data)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const present = (value: unknown) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  value !== "Not disclosed / Not available";
const url = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//i.test(value) ? value : "";
function capturedTitle(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const snapshot = object(JSON.parse(value));
    return [snapshot.title_zh, snapshot.title_original].find(present);
  } catch {
    return "";
  }
}
const hidden = new Set([
  "content_hash",
  "source_hash",
  "content_snapshot",
  "source_metadata",
  "evidence_label",
  "dedupe_key",
]);

function OfficialLink({
  value,
  children = "查看官方原文",
}: {
  value: unknown;
  children?: ReactNode;
}) {
  const href = url(value);
  return href ? (
    <a className="button" href={href} target="_blank" rel="noopener noreferrer">
      {children} ↗
    </a>
  ) : null;
}

function Value({ value, field = "" }: { value: unknown; field?: string }) {
  if (Array.isArray(value))
    return value.length ? (
      <ul className="report-values">
        {value.map((v, i) => (
          <li key={i}>
            <Value value={v} field={field} />
          </li>
        ))}
      </ul>
    ) : (
      <span>无记录</span>
    );
  if (value && typeof value === "object")
    return (
      <Fields
        data={object(value)}
        keys={Object.keys(value).filter((k) => !hidden.has(k))}
      />
    );
  if (
    ["official_url", "pdf_url", "document_url", "attachment_urls"].includes(
      field,
    )
  )
    return url(value) ? (
      <OfficialLink value={value}>
        {field.includes("pdf") ? "查看官方 PDF" : "查看官方链接"}
      </OfficialLink>
    ) : (
      <span>未提供</span>
    );
  if (field === "detail_url")
    return typeof value === "string" &&
      /^\/regulations\/[a-z0-9]+$/i.test(value) ? (
      <a href={value}>查看法规详情</a>
    ) : (
      <span>未提供</span>
    );
  if (field.endsWith("_at") || ["window_start", "window_end"].includes(field))
    return <span>{reportTime(value)}</span>;
  if (field.endsWith("_date")) return <span>{reportTime(value, true)}</span>;
  if (field === "country_or_region") {
    const regions: Record<string, string> = {
      "United States": "美国",
      "European Union": "欧盟",
      China: "中国",
      Japan: "日本",
      Global: "全球",
      International: "国际",
    };
    return <span>{regions[String(value)] || reportText(value)}</span>;
  }
  return <span className="report-text">{reportText(value)}</span>;
}

function Fields({ data, keys }: { data: Data; keys: string[] }) {
  return (
    <dl className="report-facts">
      {keys.map((key) => (
        <div key={key}>
          <dt>{reportLabels[key] || reportText(key)}</dt>
          <dd>
            <Value value={data[key]} field={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="report-fold">
      <summary>{title}</summary>
      {children}
    </details>
  );
}

function Changes({ data }: { data: Data }) {
  const fields = list(data.changed_fields).map(object);
  const sections = list(data.sections).map(object);
  return (
    <>
      {list(data.change_types).length > 0 && (
        <p>{list(data.change_types).map(reportText).join(" · ")}</p>
      )}
      {!fields.length && !sections.length && (
        <p>
          {present(data.change_summary)
            ? reportText(data.change_summary)
            : "已采集的结构化内容中没有字段或章节差异。"}
        </p>
      )}
      {fields.length > 0 && (
        <div className="report-table-wrap">
          <table className="report-diff">
            <caption>字段变化（仅限已保存内容）</caption>
            <thead>
              <tr>
                <th>字段</th>
                <th>旧值</th>
                <th>新值</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i}>
                  <th scope="row">
                    {reportLabels[String(f.field)] || String(f.field)}
                  </th>
                  <td>
                    <Value field={String(f.field)} value={f.old_value} />
                  </td>
                  <td>
                    <Value field={String(f.field)} value={f.new_value} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sections.length > 0 && (
        <Fold title={`章节变化（${sections.length} 项）`}>
          {sections.map((s, i) => (
            <section key={i}>
              <h4>
                {reportText(s.kind)} · {reportText(s.section)}
              </h4>
              <dl className="report-facts">
                <div>
                  <dt>旧内容</dt>
                  <dd>
                    <Value value={s.old_value} />
                  </dd>
                </div>
                <div>
                  <dt>新内容</dt>
                  <dd>
                    <Value value={s.new_value} />
                  </dd>
                </div>
              </dl>
            </section>
          ))}
        </Fold>
      )}
    </>
  );
}

function Version({
  data,
  currentSummary,
  currentSummaryZh,
}: {
  data: Data;
  currentSummary?: string;
  currentSummaryZh?: string;
}) {
  return (
    <section className="report-version">
      <h4>系统记录版本 v{reportText(data.version_name)}</h4>
      <p>
        发现时间：{reportTime(data.detected_at)} · 发布日期：
        {reportTime(data.publication_date, true)} · 状态：
        {reportText(data.status)}
      </p>
      {typeof data.content_snapshot === "string" ? (
        <VersionSnapshot
          snapshot={data.content_snapshot}
          currentSummary={currentSummary}
          currentSummaryZh={currentSummaryZh}
        />
      ) : (
        <p>该记录暂无可展示的快照。</p>
      )}
    </section>
  );
}

function RegulationContent({ details }: { details: Data }) {
  const facts = object(details["Official Regulatory Information"]);
  const translation = object(details["BioReg Translation"]);
  const metadata = object(details["BioReg Metadata"]);
  const versions = list(details["Historical Versions"]);
  const changes = list(details["BioReg Detected Change"]);
  return (
    <>
      {present(translation.title_zh) &&
        translation.title_zh !== facts.title_original && (
          <p className="report-muted">
            原文标题：{reportText(facts.title_original)}
            <br />
            中文标题沿用已保存内容，译名来源见法规详情。
          </p>
        )}
      <Fields
        data={facts}
        keys={[
          "document_number",
          "document_type",
          "country_or_region",
          "publication_date",
          "effective_date",
          "status",
        ]}
      />
      {present(facts.official_summary) && (
        <section className="report-summary">
          <h4>官方摘要（原文）</h4>
          <Value value={facts.official_summary} />
        </section>
      )}
      {present(translation.summary_zh) && (
        <section className="report-summary">
          <h4>中文摘要译文（非官方，供参考）</h4>
          <Value value={translation.summary_zh} />
        </section>
      )}
      {url(facts.pdf_url) && facts.pdf_url !== facts.official_url && (
        <OfficialLink value={facts.pdf_url}>查看官方 PDF</OfficialLink>
      )}
      <Fold title="系统分类与记录版本">
        <Fields
          data={metadata}
          keys={[
            "categories",
            "product_types",
            "development_stages",
            "importance_level",
            "version",
          ]}
        />
      </Fold>
      {list(facts.attachment_urls).length > 0 && (
        <Fold title="官方附件">
          <Value value={facts.attachment_urls} field="attachment_urls" />
        </Fold>
      )}
      {changes.length > 0 && (
        <Fold title={`已保存的变更记录（${changes.length} 条）`}>
          {changes.map((v, i) => {
            const c = object(v);
            return (
              <section key={i} className="report-version">
                <h4>
                  {reportTime(c.detected_at)} · {reportText(c.severity)}
                </h4>
                <Changes data={c} />
                <p className="report-muted">变更 ID：{reportText(c.id)}</p>
              </section>
            );
          })}
        </Fold>
      )}
      {versions.length > 0 && (
        <Fold title={`历史版本（${versions.length} 个）`}>
          {versions.map((v, i) => (
            <Version
              key={i}
              data={object(v)}
              currentSummary={
                typeof facts.official_summary === "string"
                  ? facts.official_summary
                  : undefined
              }
              currentSummaryZh={
                typeof translation.summary_zh === "string"
                  ? translation.summary_zh
                  : undefined
              }
            />
          ))}
        </Fold>
      )}
    </>
  );
}

function DigestContent({ data }: { data: Data }) {
  const summary = object(data.summary);
  return (
    <>
      <p>
        汇总归属日期：
        {String(data.date || "未提供").replace(/^weekly:/, "周汇总 · ")}
      </p>
      <Fields data={data} keys={["timezone", "window_start", "window_end"]} />
      {Object.keys(summary).length ? (
        <>
          <Fields
            data={summary}
            keys={["period", "new_count", "updated_count"]}
          />
          {[
            "severity_counts",
            "by_regulator",
            "by_topic",
            "new_regulations",
            "updated_regulations",
            "high_priority",
            "watchlist_counts",
            "watchlist_matches",
            "source_health",
          ]
            .filter((k) => present(summary[k]))
            .map((k) => (
              <Fold key={k} title={reportLabels[k]}>
                <Value value={summary[k]} />
              </Fold>
            ))}
        </>
      ) : (
        <Value value={data.summary} />
      )}
      <Fold title="当前已保存事件的重要程度统计">
        <Value value={data.severity_counts_current_saved_events} />
        <p>
          按该统计时段的当前已保存事件计数；与汇总保存时的统计可能不同。历史汇总的“高”可能包含“紧急”。
        </p>
      </Fold>
    </>
  );
}

function SourceContent({ data }: { data: Data }) {
  return (
    <>
      <Fields
        data={data}
        keys={[
          "enabled",
          "current_status",
          "last_sync_at",
          "last_success_at",
          "last_failure_at",
        ]}
      />
      <h4>所选时段内的同步记录</h4>
      {!list(data.recent_logs).length && <p>该时段内没有已保存的同步记录。</p>}
      {list(data.recent_logs).map((v, i) => {
        const log = object(v);
        const status = syncLogDisplayStatus({
          status: String(log.status),
          finished_at:
            typeof log.finished_at === "string" ? log.finished_at : null,
        });
        return (
          <Fold
            key={i}
            title={`${reportTime(log.started_at)} · ${reportText(status)}`}
          >
            <Fields
              data={log}
              keys={[
                "finished_at",
                "records_found",
                "records_new",
                "records_updated",
                "records_failed",
                "error_message",
              ]}
            />
          </Fold>
        );
      })}
    </>
  );
}

function Content({ row, type }: { row: ReportRow; type: string }) {
  const d = row.details;
  if (row.id === "scope-summary")
    return (
      <>
        <p>
          本次法规数：{reportText(d.regulation_count)}
          。仅统计本次选中的记录，不代表全库总量。
        </p>
        <h4>机构分布</h4>
        <Value value={d.by_agency} />
        <h4>重要程度分布</h4>
        <Value value={d.by_severity} />
        <p>以上为系统计数，不含法规解释或 AI 分析。</p>
      </>
    );
  switch (type) {
    case "regulations":
    case "summary":
      return <RegulationContent details={d} />;
    case "changes":
      return (
        <>
          <p>以下为系统检测结果，具体要求请核对官方文件。</p>
          <Changes data={d} />
        </>
      );
    case "comparison":
      return (
        <>
          <p>
            系统记录版本 v{reportText(object(d.version_a).version_name)} → v
            {reportText(object(d.version_b).version_name)}
            。仅比较已采集的内容，不代表对完整 PDF 的比对。
          </p>
          <Changes data={object(d.comparison)} />
          {Array.isArray(d.unchanged_fields) && (
            <Fold title={`未变化字段（${d.unchanged_fields.length} 项）`}>
              <p>
                {d.unchanged_fields
                  .map((k) => reportLabels[String(k)] || String(k))
                  .join("、") || "无"}
              </p>
            </Fold>
          )}
          <Fold title="对比使用的历史版本">
            <Version data={object(d.version_a)} />
            <Version data={object(d.version_b)} />
          </Fold>
        </>
      );
    case "versions":
      return <Version data={{ ...d, detected_at: row.timestamp }} />;
    case "digest":
      return <DigestContent data={d} />;
    case "sources":
      return <SourceContent data={d} />;
    case "watchlist":
      return (
        <>
          <p>
            关注规则：{reportText(object(d.watchlist).name)} · 匹配类型：
            {reportText(d.match_type)}
          </p>
          <h4>匹配依据</h4>
          <Value value={d.reasons} />
          {d.change_event && (
            <Fold title="关联变化">
              <Changes data={object(d.change_event)} />
            </Fold>
          )}
        </>
      );
    case "notifications":
      return (
        <>
          <p className="report-text">{reportText(d.message)}</p>
          <Fields data={d} keys={["notification_type", "delivery_status"]} />
          <p>
            阅读状态：
            {present(d.read_at) ? "已读 · " + reportTime(d.read_at) : "未读"}
          </p>
        </>
      );
    default:
      return <p>此报告暂无可展示的内容。</p>;
  }
}

function title(row: ReportRow, type: string) {
  const d = row.details;
  if (row.id === "scope-summary") return "本次范围统计";
  const translated = object(d["BioReg Translation"]).title_zh;
  const original = object(d["Official Regulatory Information"]).title_original;
  return reportText(
    [
      translated,
      original,
      d.official_title,
      d.regulation_title,
      d.title,
      d.name,
      capturedTitle(d.content_snapshot),
      capturedTitle(object(d.version_b).content_snapshot),
    ].find(present) ||
      (type === "versions"
        ? "历史版本记录"
        : type === "comparison"
          ? "版本对比结果"
          : type === "digest"
            ? "已保存的汇总"
            : "报告记录"),
  );
}

export function ReportPreview({ report }: { report: Report }) {
  const dateLabel =
    report.type === "digest"
      ? "汇总生成时间"
      : report.type === "sources"
        ? "最近同步时间"
        : reportDates[report.type as keyof typeof reportDates]?.label ||
          "记录时间";
  return (
    <div className="report-results">
      {report.rows.map((row, i) => (
        <article className="report-card" key={row.id + i}>
          <header>
            <p className="report-muted">
              {row.agency ? row.agency + " · " : ""}
              {reportNames[report.type as keyof typeof reportNames]}
            </p>
            <h3>{title(row, report.type)}</h3>
            {(row.timestamp || row.severity) && (
              <p>
                {row.timestamp &&
                  `${dateLabel}：${reportTime(row.timestamp, ["regulations", "summary"].includes(report.type))}`}
                {row.severity &&
                  `${row.timestamp ? " · " : ""}重要程度：${reportText(row.severity)}`}
              </p>
            )}
          </header>
          <Content row={row} type={report.type} />
          {row.id !== "scope-summary" && (
            <footer>
              <div className="report-actions">
                {row.regulation_id && (
                  <a
                    className="button"
                    href={`/regulations/${encodeURIComponent(row.regulation_id)}`}
                  >
                    查看法规详情
                  </a>
                )}
                <OfficialLink value={row.official_url} />
              </div>
              <p className="report-muted">
                记录 ID：{row.id}
                {row.regulation_id && row.regulation_id !== row.id
                  ? ` · 法规 ID：${row.regulation_id}`
                  : ""}
              </p>
            </footer>
          )}
        </article>
      ))}
    </div>
  );
}
