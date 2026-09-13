import Link from "next/link";
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
export function ChangeEvents({ events }: { events: ChangeView[] }) {
  return (
    <section className="panel">
      <h2>Changes · BioReg Change Detection</h2>
      <p className="notice">
        规则检测结果，不是监管机构官方声明。版本编号为 BioReg Internal Version。
      </p>
      {!events.length && (
        <p>
          尚无检测事件。已有法规不会因启用检测功能而补造更新；首次真实变化将在同步时记录。
        </p>
      )}
      {events.map((e) => (
        <article className="version" key={e.id}>
          <div>
            <Link href={`/regulations/${e.regulation_id}`}>
              <strong>{e.regulation.title_original}</strong>
            </Link>
            <p>
              {e.regulation.regulator} · {e.detected_at} · {e.severity} ·
              Internal v{e.current_version.version_name}
            </p>
            <p>{e.change_types.join(" · ")}</p>
            <p>{e.change_summary}</p>
            <details>
              <summary>旧值 → 新值 / Sections</summary>
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
