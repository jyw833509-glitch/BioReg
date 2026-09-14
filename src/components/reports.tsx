"use client";
import { useState, useEffect } from "react";
import type { Regulation } from "@/lib/types";
import type { Report } from "@/server/reports/data";
const types = [
  ["regulations", "Regulation Report"],
  ["changes", "Regulation Change Report"],
  ["comparison", "Version Comparison Report"],
  ["digest", "Daily Digest Report"],
  ["watchlist", "Watchlist Report"],
  ["summary", "Regulatory Intelligence Summary"],
  ["sources", "Source Health Report"],
  ["versions", "Versions Export"],
  ["notifications", "Notifications Export"],
];
export function Reports({ records }: { records: Regulation[] }) {
  const [values, setValues] = useState<Record<string, string>>({
      type: "regulations",
      limit: "30",
    }),
    [report, setReport] = useState<Report | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const [watches, setWatches] = useState<{ id: string; name: string }[]>([]),
    [changes, setChanges] = useState<{ id: string; change_summary: string }[]>(
      [],
    ),
    [versions, setVersions] = useState<{ id: string; version_name: string }[]>(
      [],
    );
  useEffect(() => {
    let active = true;
    void Promise.all([fetch("/api/watchlists"), fetch("/api/changes")])
      .then(async (rs) => {
        if (rs.some((r) => !r.ok)) throw new Error("Context unavailable");
        const [w, c] = await Promise.all(rs.map((r) => r.json()));
        if (active) {
          setWatches(w.data);
          setChanges(c.data);
        }
      })
      .catch(() => {
        if (active) setError("部分选项暂不可用，请稍后重试");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    if (!values.regulation) return;
    void fetch(
      "/api/regulations/" + encodeURIComponent(values.regulation) + "/versions",
    )
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (active) setVersions(d.data);
      })
      .catch(() => {
        if (active) setVersions([]);
      });
    return () => {
      active = false;
    };
  }, [values.regulation]);
  function set(key: string, v: string) {
    setReport(null);
    setError("");
    setValues((old): Record<string, string> =>
      key === "type"
        ? { type: v, limit: "30" }
        : key === "regulation"
          ? { ...old, regulation: v, from: "", to: "" }
          : { ...old, [key]: v },
    );
  }
  async function generate() {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(values).filter(([, v]) => v)),
      ).toString();
      const res = await fetch("/api/reports?" + q);
      const d = await res.json();
      if (!res.ok)
        throw new Error(d.issues?.[0]?.message || d.message || "Report failed");
      setReport(d.data);
      setQuery(q);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const scope = !["digest", "sources"].includes(values.type);
  return (
    <section className="panel">
      <h2>Reports · 可追溯法规报告</h2>
      <p className="notice">
        Official Fact ≠ BioReg Translation ≠ BioReg System Summary ≠ External AI
        Interpretation。导出只读取已保存数据，不改写事实。日期筛选为 UTC；Digest
        按已保存的逻辑日期筛选。
      </p>
      <fieldset disabled={busy} style={{ border: 0, padding: 0 }}>
        <div className="settings-grid">
          <label>
            Report type
            <select
              value={values.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {types.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {["start", "end"].map((k) => (
            <label key={k}>
              {k === "start" ? "Start date" : "End date"}
              <input
                type="date"
                disabled={values.type === "comparison"}
                value={values[k] || ""}
                onChange={(e) => set(k, e.target.value)}
              />
            </label>
          ))}
          {values.type !== "digest" && (
            <label>
              Agency
              <select
                value={values.agency || ""}
                onChange={(e) => set("agency", e.target.value)}
              >
                <option value="">All</option>
                {["FDA", "EMA", "NMPA", "CDE", "ICH", "PMDA"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          )}
          {scope && (
            <>
              <label>
                Regulation
                <select
                  value={values.regulation || ""}
                  onChange={(e) => set("regulation", e.target.value)}
                >
                  <option value="">All / select for comparison</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title_original}
                    </option>
                  ))}
                </select>
              </label>
              {["category", "product"].map((k) => (
                <label key={k}>
                  {k}
                  <input
                    value={values[k] || ""}
                    onChange={(e) => set(k, e.target.value)}
                    placeholder="Exact classification / 留空不限"
                  />
                </label>
              ))}
              <label>
                Severity
                <select
                  value={values.severity || ""}
                  disabled={["versions", "comparison"].includes(values.type)}
                  onChange={(e) => set("severity", e.target.value)}
                >
                  <option value="">All</option>
                  {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          {["watchlist", "notifications"].includes(values.type) && (
            <label>
              Watchlist
              <select
                value={values.watchlist || ""}
                onChange={(e) => set("watchlist", e.target.value)}
              >
                <option value="">All</option>
                {watches.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {values.type === "changes" && (
            <label>
              Change event
              <select
                value={values.change || ""}
                onChange={(e) => set("change", e.target.value)}
              >
                <option value="">All</option>
                {changes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.change_summary}
                  </option>
                ))}
              </select>
            </label>
          )}
          {values.type === "comparison" &&
            ["from", "to"].map((k) => (
              <label key={k}>
                {k === "from" ? "Version A" : "Version B"}
                <select
                  value={values[k] || ""}
                  onChange={(e) => set(k, e.target.value)}
                >
                  <option value="">Select</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      Internal v{v.version_name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <label>
            Maximum records
            <input
              type="number"
              min={1}
              max={100}
              value={values.limit}
              onChange={(e) => set("limit", e.target.value)}
            />
          </label>
        </div>
        <button className="button primary" onClick={generate}>
          {busy ? "正在生成…" : "Generate / Preview"}
        </button>
      </fieldset>
      <p role="status">{error}</p>
      {report && (
        <>
          <h3>
            {report.rows.length} records · {report.generated_at}
          </h3>
          {report.limited && (
            <p className="notice">
              结果达到上限，请缩小筛选范围；历史最多展示 20 条。
            </p>
          )}
          <a
            className="button primary"
            href={"/api/reports?" + query + "&format=pdf"}
          >
            Download PDF
          </a>{" "}
          <a className="button" href={"/api/reports?" + query + "&format=csv"}>
            Download CSV · UTF-8
          </a>
          {!report.rows.length && <p>No matching records / 无符合条件的记录</p>}
          {report.rows.map((r, i) => (
            <details key={r.id + String(i)}>
              <summary>
                {r.agency} · {r.id} · {r.evidence}
              </summary>
              <p>{r.official_url}</p>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {JSON.stringify(r.details, null, 2)}
              </pre>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
