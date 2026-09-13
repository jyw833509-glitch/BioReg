"use client";
import { useEffect, useState } from "react";
import type { digestSummary } from "@/server/engagement/digest";
type Summary = Awaited<ReturnType<typeof digestSummary>>;
type Notice = {
  id: string;
  title: string;
  message: string;
  regulator: string | null;
  change_types: string[];
  severity: string;
  created_at: string;
  read_at: string | null;
  regulation_id: string | null;
  watchlist: { name: string } | null;
};
export function EngagementPanel({ page }: { page: string }) {
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [state, setState] = useState("unread"),
    [severity, setSeverity] = useState(""),
    [watchlist, setWatchlist] = useState("");
  const [watches, setWatches] = useState<{ id: string; name: string }[]>([]);
  const [digests, setDigests] = useState<
    { id: string; digest_date: string; summary: Summary }[]
  >([]);
  const [today, setToday] = useState<Summary | null>(null);
  const [settings, setSettings] = useState<{
    digest_enabled: boolean;
    digest_time: string;
    timezone: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        async function get(path: string) {
          const r = await fetch(path);
          if (!r.ok) throw new Error("读取失败，请重试");
          return r.json();
        }
        if (page === "notifications") {
          const q = new URLSearchParams({ state, page: String(pageNumber) });
          if (severity) q.set("severity", severity);
          if (watchlist) q.set("watchlist_id", watchlist);
          const r = await get("/api/notifications?" + q);
          if (active) {
            setNotices(r.data);
            setUnread(r.statistics.unread);
            setTotal(r.total);
          }
          const w = await get("/api/watchlists");
          if (active) setWatches(w.data);
        }
        if (page === "digest" || page === "today") {
          const d = await get("/api/digests");
          if (active) setDigests(d.data);
          if (page === "today") {
            const t = await get("/api/digests?today=true");
            if (active) setToday(t.data);
          }
        }
        if (page === "settings") {
          const s = await get("/api/digest-settings");
          if (active) setSettings(s.data);
        }
        if (active) setError("");
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "读取失败");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, state, severity, watchlist, revision, pageNumber]);
  async function mutate(path: string, method: string, body: unknown) {
    try {
      const r = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("操作失败，请检查输入后重试");
      setRevision((v) => v + 1);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }
  return (
    <section className="panel">
      <h2>
        {page === "notifications"
          ? "Notifications · 站内通知"
          : page === "settings"
            ? "Daily Digest 设置"
            : "Daily Digest · 每日摘要"}
      </h2>
      <p>
        单工作区 · BioReg Digest Summary / Watchlist Match
        属于规则分析；Official Source 为官方事实来源。
      </p>
      {error && <p role="alert">{error}</p>}
      {page === "notifications" && (
        <>
          <p>
            未读 {unread} · 筛选结果 {total}
          </p>
          <div className="heading-actions">
            <select
              aria-label="通知读取状态"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPageNumber(1);
              }}
            >
              {["unread", "read", "all"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="通知严重度"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPageNumber(1);
              }}
            >
              <option value="">全部严重度</option>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              aria-label="关注筛选"
              value={watchlist}
              onChange={(e) => {
                setWatchlist(e.target.value);
                setPageNumber(1);
              }}
            >
              <option value="">全部关注</option>
              {watches.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              className="button"
              onClick={() =>
                mutate("/api/notifications", "PATCH", { all: true })
              }
            >
              全部标为已读
            </button>
          </div>
          {notices.length === 0 && <p>当前筛选下没有通知。</p>}
          {notices.map((n) => (
            <article key={n.id} className="panel">
              <h3>{n.title}</h3>
              <p>
                {n.regulator} · {n.severity} · {n.change_types.join(", ")} ·{" "}
                {n.created_at} · {n.watchlist?.name || "Source Health"}
              </p>
              <p>{n.message}</p>
              {n.regulation_id && (
                <a href={"/regulations/" + n.regulation_id}>
                  法规详情 · BioReg
                </a>
              )}{" "}
              {!n.read_at && (
                <button
                  className="button"
                  onClick={() =>
                    mutate("/api/notifications", "PATCH", { id: n.id })
                  }
                >
                  标为已读
                </button>
              )}
            </article>
          ))}
          <button
            className="button"
            disabled={pageNumber === 1}
            onClick={() => setPageNumber((p) => p - 1)}
          >
            上一页
          </button>
          <span> {pageNumber} </span>
          <button
            className="button"
            disabled={pageNumber * 50 >= total}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            下一页
          </button>
        </>
      )}
      {page === "settings" && settings && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void mutate("/api/digest-settings", "PATCH", {
              digest_enabled: settings.digest_enabled,
              digest_time: settings.digest_time,
              timezone: settings.timezone,
            });
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={settings.digest_enabled}
              onChange={(e) =>
                setSettings({ ...settings, digest_enabled: e.target.checked })
              }
            />
            启用每日摘要
          </label>
          <label>
            当地生成时间{" "}
            <input
              type="time"
              required
              value={settings.digest_time}
              onChange={(e) =>
                setSettings({ ...settings, digest_time: e.target.value })
              }
            />
          </label>
          <label>
            IANA 时区{" "}
            <input
              required
              value={settings.timezone}
              onChange={(e) =>
                setSettings({ ...settings, timezone: e.target.value })
              }
            />
          </label>
          <button className="button">保存摘要设置</button>
          <p>
            到达设置时间后的首次 Scheduler
            运行生成前一完整自然日摘要。当前按小时检查，GitHub
            可能延迟。邮件未启用。
          </p>
        </form>
      )}
      {today && (
        <>
          <h3>今日实时统计（尚未结束的自然日）</h3>
          <DigestSummary data={today} />
        </>
      )}
      {(page === "digest" || page === "today") && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void mutate("/api/digests", "POST", { date: form.get("date") });
            }}
          >
            <label>
              摘要日期 <input type="date" name="date" required />
            </label>
            <button className="button">生成 / 更新该日摘要</button>
          </form>
          <h3>历史 Digest（最近 90 份）</h3>
          {digests.length === 0 && <p>尚无已保存的摘要。可选择日期生成。</p>}
          {digests.map((d) => (
            <details key={d.id}>
              <summary>
                {d.digest_date} · 新增 {d.summary.new_count} · 更新{" "}
                {d.summary.updated_count}
              </summary>
              <DigestSummary data={d.summary} />
            </details>
          ))}
        </>
      )}
    </section>
  );
}
function DigestSummary({ data: d }: { data: Summary }) {
  return (
    <div>
      <p>
        {d.date} · {d.timezone} · {d.window_start} 至 {d.window_end}
        （不含结束时刻）
      </p>
      <p>
        New Regulations {d.new_count} · Updated Regulations {d.updated_count} ·
        Watchlist Matches {d.watchlist_matches.length} · High Priority{" "}
        {d.high_priority.length}
      </p>
      <p>
        HIGH {d.severity_counts.HIGH} / MEDIUM {d.severity_counts.MEDIUM} / LOW{" "}
        {d.severity_counts.LOW}
      </p>
      <p>
        监管机构：
        {Object.entries(d.by_regulator)
          .map(([k, v]) => k + " " + v)
          .join(" · ") || "无"}
      </p>
      <p>
        主题：
        {Object.entries(d.by_topic)
          .map(([k, v]) => k + " " + v)
          .join(" · ") || "无"}
      </p>
      <h4>New Regulations · Official Fact</h4>
      {d.new_regulations.map((r) => (
        <p key={r.id}>
          <a href={r.detail_url}>{r.title}</a> ·{" "}
          {r.official_url && (
            <a href={r.official_url} target="_blank" rel="noreferrer">
              Official Source
            </a>
          )}
        </p>
      ))}
      <h4>Updated Regulations · BioReg Change Detection</h4>
      {d.updated_regulations.map((r) => (
        <p key={r.event_id}>
          <a href={r.detail_url}>{r.title}</a> · {r.severity} · {r.summary} ·{" "}
          {r.official_url && (
            <a href={r.official_url} target="_blank" rel="noreferrer">
              Official Source
            </a>
          )}
        </p>
      ))}
      <h4>High Priority Changes</h4>
      {d.high_priority.map((r, i) => (
        <p key={r.id + i}>
          <a href={r.detail_url}>{r.title}</a> · {r.summary}
        </p>
      ))}
      <h4>BioReg Watchlist Match</h4>
      {d.watchlist_matches.map((m) => (
        <p key={m.id}>
          {m.name} ({d.watchlist_counts[m.watchlist_id]}) ·{" "}
          <a href={"/regulations/" + m.regulation_id}>{m.type}</a>
        </p>
      ))}
      <h4>Source Health Summary（生成时状态）</h4>
      <p>{d.source_health.map((s) => s.code + ": " + s.status).join(" · ")}</p>
    </div>
  );
}
