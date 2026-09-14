"use client";
import { ChangeEvents, type ChangeView } from "./change-events";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Bookmark,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FlaskConical,
  Globe2,
  LayoutDashboard,
  Menu,
  Radar,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import {
  agencies,
  departments,
  documentTypes,
  products,
  stages,
  statuses,
  topics,
} from "@/lib/data";
import { AITools } from "./ai-tools";
import { Reports } from "./reports";
import type { Regulation, Agency } from "@/lib/types";
import { SyncStatus } from "./sync-status";
import type {
  DashboardView,
  Pagination,
  SourceView,
  LogView,
  WatchlistView,
} from "@/lib/view-types";
import { DatabaseList } from "./database-list";
import { FavoriteRegulations } from "./favorite-regulations";
import { NotificationBell } from "./notification-bell";
import { EngagementPanel } from "./engagement-panel";
import { WatchlistEditor } from "./watchlist-editor";

import { usePreference } from "@/lib/preferences";
const nav = [
  ["dashboard", "Overview", "总览", LayoutDashboard],
  ["today", "Today", "今日动态", CalendarDays],
  ["regulations", "Regulations", "法规数据库", BookOpen],
  ["updates", "Updates", "法规更新", Activity],
  ["notifications", "Notifications", "站内通知", Bell],
  ["digest", "Daily Digest", "每日摘要", CalendarDays],
  ["watchlist", "Watchlist", "我的关注", Bookmark],
  ["topics", "Topics", "主题分类", FlaskConical],
  ["agencies", "Agencies", "监管机构", Building2],
  ["reports", "Reports", "情报报告", FileText],
  ["ai-tools", "AI Tools", "AI 辅助工具", Sparkles],
  ["settings", "Settings", "设置", Settings],
] as const;
function href(page: string) {
  return page === "dashboard" ? "/" : `/${page}`;
}
export function AgencyBadge({ agency }: { agency: string }) {
  return (
    <span className={`agency agency-${agency.toLowerCase()}`}>{agency}</span>
  );
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${["Final", "Effective"].includes(status) ? "green" : "neutral"}`}
    >
      {status}
    </span>
  );
}
export function ImportanceBadge({ importance }: { importance: string }) {
  return (
    <span className={`badge importance-${importance.toLowerCase()}`}>
      <span className="dot" />
      {importance}
    </span>
  );
}
export function RegulationCard({
  record: r,
  saved,
  onSave,
  onExplain,
}: {
  record: Regulation;
  saved: boolean;
  onSave: () => void;
  onExplain: () => void;
}) {
  return (
    <article className="reg-card">
      <div className="card-meta">
        <AgencyBadge agency={r.regulator} />
        <span>{r.document_type}</span>
        <span className="meta-date">
          {r.publication_date || r.publication_date_raw || "日期未提供"}
        </span>
        <button
          className={`icon-btn ${saved ? "saved" : ""}`}
          aria-label={saved ? "取消收藏" : "收藏法规"}
          onClick={onSave}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <Link className="record-title" href={`/regulations/${r.id}`}>
        {r.title_zh || r.title_original}
      </Link>
      <p className="original">{r.title_original}</p>
      <div className="tags">
        <ImportanceBadge importance={r.importance_level} />
        <StatusBadge status={r.status} />
        <span className="tag">{r.categories[0]}</span>
      </div>
      <p className="record-summary">
        {r.summary_zh || r.official_summary || "官方摘要未提供"}
      </p>
      <footer>
        <span className={r.is_updated ? "updated" : "new"}>
          <span className="dot" />
          {r.is_updated ? "Updated" : "New"}{" "}
          <span className="mock-small">
            · {r.is_mock ? "Mock" : "Real Official Data"}
          </span>
        </span>
        <button className="text-btn" onClick={onExplain}>
          <Sparkles size={14} /> AI Explain
        </button>
        <Link className="text-btn detail-link" href={`/regulations/${r.id}`}>
          查看详情 <ArrowRight size={14} />
        </Link>
      </footer>
    </article>
  );
}
export function AIExplainModal({
  records,
  onClose,
}: {
  records: Regulation[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} className="ai-modal" onCancel={onClose}>
      <button className="button" onClick={onClose}>
        关闭
      </button>
      <p>选择法规进入完整上下文工作台：</p>
      {records.map((r) => (
        <p key={r.id}>
          <Link
            href={
              "/ai-tools#" +
              new URLSearchParams({
                kind: "regulation",
                id: r.id,
                template: "explain",
              })
            }
            onClick={onClose}
          >
            {r.title_original} · AI Explain
          </Link>
        </p>
      ))}
    </dialog>
  );
}
export function FilterBar({
  records,
  filters,
  onChange,
}: {
  records: Regulation[];
  filters: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = [
    ["regulator", "监管机构", [...agencies, "PMDA"]],
    ["categories", "主题领域", topics],
    ["product_types", "产品类型", products],
    ["status", "法规状态", statuses],
    ["importance_level", "重要程度", ["Critical", "High", "Medium", "Low"]],
    [
      "subcategories",
      "子分类",
      Array.from(new Set(records.flatMap((r) => r.subcategories))),
    ],
    ["development_stages", "研发阶段", stages],
    ["affected_departments", "影响部门", departments],
    ["document_type", "文件类型", documentTypes],
    ["change", "变化类型", ["New", "Updated"]],
  ] as const;
  return (
    <div className="filter-bar">
      {fields
        .slice(0, expanded ? fields.length : 5)
        .map(([key, label, values]) => (
          <select
            aria-label={label}
            key={key}
            value={filters[key] || ""}
            onChange={(e) => onChange(key, e.target.value)}
          >
            <option value="">{label} · 全部</option>
            {values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
      <button className="button" onClick={() => setExpanded(!expanded)}>
        <SlidersHorizontal size={14} />
        {expanded ? "收起" : "更多筛选"}
      </button>
      {expanded && (
        <label className="date-label">
          发布于{" "}
          <input
            aria-label="起始发布日期"
            type="date"
            value={filters.date || ""}
            onChange={(e) => onChange("date", e.target.value)}
          />{" "}
          之后
        </label>
      )}
      {Object.values(filters).some(Boolean) && (
        <button className="text-btn" onClick={() => onChange("*", "")}>
          清除筛选
        </button>
      )}
    </div>
  );
}
export function Workspace({
  changeEvents = [],
  page,
  record,
  initialQuery,
  initialFilters,
  regulations,
  syncLogs,
  databaseKind,
  dashboard,
  sources,
  watchlists,
  pageInfo,
  initialSort,
}: {
  changeEvents?: ChangeView[];
  page: string;
  record?: Regulation;
  initialQuery: string;
  initialFilters: Record<string, string>;
  regulations: Regulation[];
  syncLogs: LogView[];
  databaseKind: string;
  dashboard: DashboardView | null;
  sources: SourceView[];
  watchlists: WatchlistView[];
  pageInfo: Pagination;
  initialSort: string;
}) {
  const router = useRouter();
  const agencies = sources.map((s) => s.code as Agency);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState(initialQuery);

  const [saved, setSaved] = usePreference("bioreg-saved");
  const [ai, setAi] = useState<Regulation[] | null>(null);

  const [toast, setToast] = useState("");
  function save(id: string) {
    const next = saved.includes(id)
      ? saved.filter((x) => x !== id)
      : [...saved, id];
    try {
      setSaved(next);
    } catch {
      setToast("浏览器存储不可用，收藏仅在当前页面有效。");
    }
  }
  const DEMO_DATE = dashboard?.date ?? new Date().toISOString().slice(0, 10);

  const latest = dashboard?.recent ?? [];
  const updates = dashboard?.changes ?? [];
  const high = dashboard?.priority ?? [];
  const active = nav.find((n) => n[0] === page)!;
  function cards(list: Regulation[]) {
    return (
      <div className="cards-grid">
        {list.map((r) => (
          <RegulationCard
            key={r.id}
            record={r}
            saved={saved.includes(r.id)}
            onSave={() => save(r.id)}
            onExplain={() => setAi([r])}
          />
        ))}
      </div>
    );
  }
  async function download() {
    try {
      const response = await fetch("/api/regulations?today=true&pageSize=100");
      if (!response.ok) throw new Error();
      const payload = await response.json();
      const url = URL.createObjectURL(
        new Blob(
          [
            JSON.stringify(
              {
                label: "Official / Development data; see each record.is_mock",
                date: DEMO_DATE,
                coverage:
                  payload.pagination.total > 100
                    ? "First 100 records only"
                    : "Complete daily digest",
                ...payload,
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "bioreg-digest-" + DEMO_DATE + ".json";
      link.click();
      URL.revokeObjectURL(url);
      setToast("数据库日报已导出。");
    } catch {
      setToast("日报导出失败，请重试。");
    }
  }
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Radar size={27} />
          </span>
          <span>
            BioReg <b>Radar</b>
            <small>REGULATORY INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace-label">
          WORKSPACE <span>V1.0.0</span>
        </div>
        <nav>
          {nav.map(([key, label, zh, Icon], i) => (
            <Link
              key={key}
              onClick={() => setMobile(false)}
              className={`${page === key ? "active" : ""} ${i === 7 ? "nav-divider" : ""}`}
              href={href(key)}
            >
              <Icon size={18} />
              <span>
                {label}
                <small>{zh}</small>
              </span>
              {key === "today" && (
                <b className="nav-count">{dashboard?.todayTotal ?? ""}</b>
              )}
              {key === "updates" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="source-health">
            <ShieldCheck size={18} />
            <span>
              官方来源优先<small>可追溯 · 可比较 · 可关注</small>
            </span>
          </div>
          <div className="profile">
            <span className="avatar">BR</span>
            <div>
              Research Workspace<small>Official / Mock 标识</small>
            </div>
            <Settings size={16} />
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-btn mobile-menu"
            onClick={() => setMobile(!mobile)}
            aria-label="打开导航"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{record ? "Regulation Detail" : active[1]}</strong>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/regulations?q=${encodeURIComponent(query)}`);
            }}
          >
            <Search size={16} />
            <input
              aria-label="全局搜索"
              placeholder="搜索法规、关键词、文件编号…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
            />
            <kbd>↵</kbd>
          </form>
          <span className="top-divider" />
          <NotificationBell />
          <Link className="icon-btn" href="/settings" aria-label="设置">
            <Settings size={19} />
          </Link>
          <span className="avatar small">BR</span>
        </header>
        <main>
          <div className="demo-banner">
            <span>
              <FlaskConical size={14} /> Official / Development Data{" "}
              <span className="banner-separator">|</span> 数据库驱动 ·
              官方数据与 Mock 示例逐条标识 · 各源接入状态见监管机构页
            </span>
            <span className="phase-label">V1.0.0 · BIOREG RADAR</span>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">BIOLOGICS REGULATORY INTELLIGENCE</div>
              <h1>
                {record
                  ? "法规详情"
                  : page === "dashboard"
                    ? "全球法规，一览掌握"
                    : active[2]}
                {page === "dashboard" && dashboard && dashboard.total === 0 && (
                  <section className="empty-state">
                    <h2>No regulatory records available yet.</h2>
                    <p>
                      Real regulatory sources will be connected in later phases.
                    </p>
                  </section>
                )}
                {page === "dashboard" && dashboard && (
                  <span className="live-label">
                    <span className="dot" /> LIVE
                  </span>
                )}
              </h1>
              <p>
                {record
                  ? "官方信息、主题标签与历史版本"
                  : page === "dashboard"
                    ? "聚合全球生物药监管动态，让每一次决策都有据可依。"
                    : `${active[1]} · 全球生物药研发、注册与生命周期情报`}
              </p>
            </div>
            <div className="heading-actions">
              <span className="date-chip">
                <CalendarDays size={15} />
                {DEMO_DATE} <small>UTC</small>
              </span>
              <button className="button" onClick={download}>
                <ArrowDownToLine size={15} /> 导出日报
              </button>
            </div>
          </div>
          {page === "dashboard" && dashboard && (
            <>
              <section className="panel sync-overview">
                <h2>Source Health Summary</h2>
                <p>
                  Last Global Sync: {dashboard.lastGlobalSync || "尚未运行"}
                </p>
                <p>
                  Latest Sync Result:{" "}
                  <strong>{dashboard.latestSyncResult}</strong>
                </p>
                <p>
                  Healthy Sources: <strong>{dashboard.healthySources}</strong> ·
                  Degraded Sources: <strong>{dashboard.degradedSources}</strong>
                </p>
                <div className="sync-health-list">
                  {Object.entries(dashboard.sourceHealthSummary).map(
                    ([source, health]) => (
                      <span
                        key={source}
                        className={`health-badge health-${health.toLowerCase()}`}
                      >
                        {source} · {health}
                      </span>
                    ),
                  )}
                </div>
                <p className="muted">
                  DEGRADED 表示当前运行受限，历史法规继续保留。
                </p>
              </section>
              <div className="kpi-grid">
                {[
                  [
                    "今日新增",
                    dashboard.todayNew,
                    FileText,
                    "new",
                    "当日首次发现",
                  ],
                  [
                    "今日更新",
                    dashboard.todayUpdated,
                    Activity,
                    "updated",
                    "版本变化追踪",
                  ],
                  [
                    "高优先级",
                    dashboard.highPriority,
                    TrendingUp,
                    "priority",
                    "需要重点关注",
                  ],
                  [
                    "监管机构",
                    dashboard.monitoredAgencies,
                    Globe2,
                    "agency",
                    "已配置来源",
                  ],
                ].map(([label, value, Icon, color, sub]) => {
                  const I = Icon as typeof FileText;
                  return (
                    <div className="kpi" key={String(label)}>
                      <div className="kpi-label">
                        {String(label)}
                        <span className={`kpi-icon ${color}`}>
                          <I size={18} />
                        </span>
                      </div>
                      <strong>
                        {String(value)}
                        <span>{label === "监管机构" ? "家" : "条"}</span>
                      </strong>
                      <small>
                        <span className="dot" />
                        {String(sub)}
                        <em>数据库统计</em>
                      </small>
                    </div>
                  );
                })}
              </div>
              <div className="mini-stats">
                <span>
                  Draft Guidance <b>{dashboard.draft}</b>
                </span>
                <span>
                  Final Guidance <b>{dashboard.final}</b>
                </span>
                <span>
                  This Week <b>{dashboard.thisWeek}</b>
                </span>
                <span>
                  <Clock3 size={14} /> Last Sync{" "}
                  <b>{dashboard.lastSync?.slice(11, 16) || "尚未同步"}</b>
                </span>
              </div>
              <div className="dashboard-columns">
                <div>
                  <div className="section-head">
                    <div>
                      <h2>
                        <span className="section-marker" />
                        今日重点法规{" "}
                        <span className="count">{dashboard.todayHigh}</span>
                      </h2>
                      <p>值得关注的重要监管动态</p>
                    </div>
                    <Link href="/today" className="text-btn">
                      查看全部 <ArrowRight size={14} />
                    </Link>
                  </div>
                  {cards(high)}
                  <div className="section-head lower">
                    <div>
                      <h2>最近法规</h2>
                      <p>持续关注生物药研发全生命周期</p>
                    </div>
                    <Link className="text-btn" href="/regulations">
                      法规数据库 <ArrowRight size={14} />
                    </Link>
                  </div>
                  <div className="recent-table">
                    {latest.slice(0, 4).map((r) => (
                      <Link key={r.id} href={`/regulations/${r.id}`}>
                        <AgencyBadge agency={r.regulator} />
                        <span>
                          {r.title_zh || r.title_original}
                          <small>
                            {r.document_type} ·{" "}
                            {r.is_mock ? "Mock" : "Official"}
                          </small>
                        </span>
                        <span className="table-date">
                          {r.publication_date
                            ? r.publication_date.slice(5)
                            : r.publication_date_raw || "未提供"}
                        </span>
                        <ChevronRight size={15} />
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="right-column">
                  <section className="panel">
                    <div className="section-head">
                      <h2>机构分布</h2>
                      <span className="muted">全部法规</span>
                    </div>
                    <div className="donut-wrap">
                      <div
                        className="donut"
                        style={{
                          background: !dashboard.total
                            ? "#e8edf5"
                            : "conic-gradient(" +
                              agencies
                                .map((a, i) => {
                                  const colors = [
                                    "#5686e8",
                                    "#8c8edc",
                                    "#dfa189",
                                    "#e3bc82",
                                    "#81b9a6",
                                  ];
                                  const start = agencies
                                    .slice(0, i)
                                    .reduce(
                                      (n, x) =>
                                        n + (dashboard.byAgency[x] || 0),
                                      0,
                                    );
                                  return (
                                    colors[i] +
                                    " " +
                                    (dashboard.total
                                      ? (start / dashboard.total) * 100
                                      : 0) +
                                    "% " +
                                    (dashboard.total
                                      ? ((start +
                                          (dashboard.byAgency[a] || 0)) /
                                          dashboard.total) *
                                        100
                                      : 0) +
                                    "%"
                                  );
                                })
                                .join(",") +
                              ")",
                        }}
                      >
                        <div>
                          <strong>{dashboard.total}</strong>
                          <small>法规</small>
                        </div>
                      </div>
                    </div>
                    <div className="agency-legend">
                      {agencies.map((a, i) => (
                        <Link href={`/regulations?agency=${a}`} key={a}>
                          <span className={`legend-dot legend-${i}`} />
                          {a}
                          <b>{dashboard.byAgency[a] || 0}</b>
                          <small>
                            {dashboard.total
                              ? Math.round(
                                  ((dashboard.byAgency[a] || 0) /
                                    dashboard.total) *
                                    100,
                                )
                              : 0}
                            %
                          </small>
                        </Link>
                      ))}
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-head">
                      <h2>主题分布</h2>
                      <Link href="/topics" aria-label="全部主题">
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                    {topics.map((t) => (
                      <Link
                        href={`/regulations?topic=${encodeURIComponent(t)}`}
                        className="topic-bar"
                        key={t}
                      >
                        <span>
                          {t}
                          <b>{dashboard.byTopic[t] || 0}</b>
                        </span>
                        <div>
                          <i
                            style={{
                              width: `${((dashboard.byTopic[t] || 0) / Math.max(1, ...Object.values(dashboard.byTopic))) * 100}%`,
                            }}
                          />
                        </div>
                      </Link>
                    ))}
                  </section>
                  <section className="ai-callout">
                    <Sparkles size={21} />
                    <h3>从法规到洞察</h3>
                    <p>基于文件生成专业提示词，在您熟悉的 AI 平台深入解读。</p>
                    <Link href="/ai-tools">
                      探索 AI 工具 <ArrowRight size={14} />
                    </Link>
                  </section>
                </div>
              </div>
              <div className="bottom-grid">
                <section className="panel">
                  <div className="section-head">
                    <h2>最近法规变化</h2>
                    <Link href="/updates" className="text-btn">
                      全部更新 <ArrowRight size={14} />
                    </Link>
                  </div>
                  {updates.slice(0, 3).map((r) => (
                    <Link
                      className="change-row"
                      key={r.id}
                      href={`/regulations/${r.id}`}
                    >
                      <span className="change-icon">
                        <Activity size={16} />
                      </span>
                      <div>
                        {r.title_zh || r.title_original}
                        <small>
                          {r.regulator} ·{" "}
                          {r.versions[0]?.change_detected || "New"} ·{" "}
                          {r.is_mock ? "Mock" : "Official"}
                        </small>
                      </div>
                      <ChevronRight size={14} />
                    </Link>
                  ))}
                </section>
                <section className="panel">
                  <div className="section-head">
                    <h2>文件类型分布</h2>
                    <FileText size={17} />
                  </div>
                  <div className="type-grid">
                    {Object.keys(dashboard.byDocumentType).map((t) => (
                      <span key={t}>
                        {t}
                        <b>{dashboard.byDocumentType[t] || 0}</b>
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
          {["today", "regulations"].includes(page) && !record && (
            <DatabaseList
              key={JSON.stringify([
                initialFilters,
                initialQuery,
                pageInfo,
                initialSort,
              ])}
              records={regulations}
              pagination={pageInfo}
              filters={initialFilters}
              initialQuery={initialQuery}
              initialSort={initialSort}
              page={page}
              saved={saved}
              onSave={save}
              onExplain={(r) => setAi([r])}
            />
          )}
          {["today", "digest", "notifications", "settings"].includes(page) && (
            <EngagementPanel page={page} />
          )}
          {page === "watchlist" && (
            <>
              <WatchlistEditor items={watchlists} />
              <FavoriteRegulations
                saved={saved}
                onSave={save}
                onExplain={(r) => setAi([r])}
              />
            </>
          )}
          {record && (
            <>
              <Link href="/regulations" className="text-btn">
                <ChevronLeft size={15} />
                返回法规数据库
              </Link>
              <section className="panel detail-panel">
                <div className="tags">
                  <AgencyBadge agency={record.regulator} />
                  <StatusBadge status={record.status} />
                  <ImportanceBadge importance={record.importance_level} />
                  <span className="badge neutral">
                    {record.is_mock
                      ? "Development / Mock Data"
                      : "Real Official Data"}
                  </span>
                </div>
                <h1>{record.title_zh || record.title_original}</h1>
                <p className="detail-original">{record.title_original}</p>
                <div className="heading-actions">
                  <button
                    className="button primary"
                    onClick={() => setAi([record])}
                  >
                    <Sparkles size={16} />
                    AI Explain
                  </button>
                  <button className="button" onClick={() => save(record.id)}>
                    <Bookmark size={16} />
                    {saved.includes(record.id) ? "已收藏" : "收藏法规"}
                  </button>
                  {record.official_url ? (
                    <a
                      className="button"
                      href={record.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official Source ↗
                    </a>
                  ) : (
                    <button className="button" disabled>
                      Official Source · 未提供
                    </button>
                  )}
                  {record.pdf_url ? (
                    <a
                      className="button"
                      href={record.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Official PDF ↗
                    </a>
                  ) : (
                    <button className="button" disabled>
                      PDF · 未提供
                    </button>
                  )}
                </div>
                <h2>Official Information</h2>
                <div className="notice">
                  {record.is_mock
                    ? "以下元数据为模拟字段，未经监管机构发布或确认。"
                    : "官方字段来自对应监管机构公开页面。主题标签使用确定性规则；未提供的官方字段保持空值。"}
                </div>
                <dl className="info-grid">
                  {[
                    ["Regulator", record.regulator],
                    ["Document Number", record.document_number],
                    ["Document Type", record.document_type],
                    ["Status", record.status],
                    [
                      "Publication Date",
                      record.publication_date ||
                        (record.publication_date_raw
                          ? `${record.publication_date_raw}（官方未提供完整日期）`
                          : "未提供"),
                    ],
                    ["Effective Date", record.effective_date || "未提供"],
                    [
                      "Issuing Office",
                      record.issuing_offices?.join("; ") || "未提供",
                    ],
                    ["Docket Number", record.docket_number || "未提供"],
                    ["BioReg Internal Version", `v${record.version}`],
                    ["Official URL", record.official_url || "未提供"],
                    ["PDF", record.pdf_url || "未提供"],
                    ["First Detected", record.first_detected_at],
                    ["Last Checked", record.last_checked_at],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v || "未提供"}</dd>
                    </div>
                  ))}
                </dl>
                <h2>Official Attachments</h2>
                <div className="tags">
                  {record.attachment_urls?.map((url) => (
                    <a
                      key={url}
                      className="button"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      官方附件 ↗
                    </a>
                  ))}
                </div>
                {record.source_metadata &&
                  Object.keys(record.source_metadata).length > 0 && (
                    <details>
                      <summary>来源原始元数据（状态 / 阶段 / 修订）</summary>
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {JSON.stringify(record.source_metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                <h2>Regulatory Tags</h2>
                {[
                  ["Categories", record.categories],
                  ["Subcategories", record.subcategories],
                  ["Product Types", record.product_types],
                  ["Development Stages", record.development_stages],
                  ["Affected Departments", record.affected_departments],
                ].map(([k, values]) => (
                  <div className="tag-detail" key={String(k)}>
                    <span>{k}</span>
                    <div className="tags">
                      {(values as string[]).map((v) => (
                        <span className="tag" key={v}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                <h2>Official Summary</h2>
                <p>
                  {record.official_summary ||
                    (record.is_mock
                      ? "未提供官方摘要。此记录为模拟数据，不能作为监管事实引用。"
                      : "官方页面未提供官方摘要。")}
                </p>
                <h2>
                  Chinese Overview{" "}
                  <span className="badge neutral">非监管机构原文</span>
                </h2>
                <p className="notice">
                  {record.summary_zh
                    ? "System-generated summary / 非监管机构原文"
                    : "尚未生成中文解读，本阶段不调用 AI API。"}
                </p>
                <p>{record.summary_zh}</p>
                <ChangeEvents events={changeEvents} />
                <h2>Version History · BioReg Internal Version</h2>
                <Link
                  className="button"
                  href={
                    "/ai-tools#" +
                    new URLSearchParams({
                      kind: "comparison",
                      id: record.id,
                      template: "compare",
                    })
                  }
                >
                  Compare with AI · 选择 Version A / B
                </Link>
                {record.versions.map((v) => (
                  <div className="version" key={v.id}>
                    <span className="version-dot" />
                    <div>
                      <strong>BioReg Internal v{v.version_name}</strong>{" "}
                      <StatusBadge status={v.status} />
                      <p>
                        {v.publication_date || "日期未完整提供"} ·{" "}
                        {v.change_detected} · 检测时间 {v.detected_at} ·{" "}
                        {record.is_mock ? "Mock" : "Official"}
                      </p>
                      <details>
                        <summary>查看版本快照</summary>
                        <p>{v.content_snapshot}</p>
                      </details>
                    </div>
                  </div>
                ))}
                <h2>Related Regulations</h2>
                <p className="muted">关联法规接口预留，尚未接入。</p>
              </section>
            </>
          )}
          {page === "updates" && (
            <>
              <ChangeEvents events={changeEvents} />
              <div className="notice">
                Official Fact：法规原文及状态来自官网。BioReg Change
                Detection：变化类型、差异及严重程度由系统规则生成。
              </div>
              <DatabaseList
                key={JSON.stringify([
                  initialFilters,
                  initialQuery,
                  pageInfo,
                  initialSort,
                ])}
                records={regulations}
                pagination={pageInfo}
                filters={initialFilters}
                initialQuery={initialQuery}
                initialSort={initialSort}
                page={page}
                saved={saved}
                onSave={save}
                onExplain={(r) => setAi([r])}
              />
            </>
          )}
          {page === "topics" && dashboard && (
            <div className="topic-grid">
              {topics.map((t, i) => (
                <Link
                  className="panel topic-tile"
                  href={`/regulations?topic=${encodeURIComponent(t)}`}
                  key={t}
                >
                  <span className="tile-number">0{i + 1}</span>
                  <FlaskConical size={24} />
                  <h2>{t}</h2>
                  <p>{dashboard.byTopic[t] || 0} 条法规</p>
                  <ArrowRight size={18} />
                </Link>
              ))}
            </div>
          )}
          {page === "agencies" && (
            <div className="topic-grid">
              {agencies.map((a) => (
                <section className="panel" key={a}>
                  <AgencyBadge agency={a} />
                  <h2>
                    {
                      {
                        FDA: "美国食品药品监督管理局",
                        EMA: "欧洲药品管理局",
                        NMPA: "国家药品监督管理局",
                        CDE: "国家药监局药品审评中心",
                        ICH: "国际人用药品注册技术协调会",
                        PMDA: "日本医药品医疗器械综合机构",
                      }[a]
                    }
                  </h2>
                  <p>
                    {sources.find((s) => s.code === a)?.official_count || 0}{" "}
                    条官方法规
                  </p>
                  <p>
                    Health:{" "}
                    <strong>
                      {sources.find((s) => s.code === a)?.health ||
                        "UNAVAILABLE"}
                    </strong>
                  </p>
                  <p>
                    Last Sync:{" "}
                    {sources.find((s) => s.code === a)?.last_sync_at ||
                      "尚未尝试同步"}
                  </p>
                  <p>
                    Last Successful Sync:{" "}
                    {sources.find((s) => s.code === a)?.last_success_at ||
                      "尚无成功记录"}
                  </p>
                  <p>
                    Last Failure:{" "}
                    {sources.find((s) => s.code === a)?.last_failure_at || "无"}
                  </p>
                  <p>
                    Latest Regulation:{" "}
                    {sources.find((s) => s.code === a)?.latest_regulation ? (
                      <Link
                        href={
                          "/regulations/" +
                          sources.find((s) => s.code === a)!.latest_regulation!
                            .id
                        }
                      >
                        {
                          sources.find((s) => s.code === a)!.latest_regulation!
                            .title_original
                        }
                      </Link>
                    ) : (
                      "暂无官方记录"
                    )}
                  </p>
                  <p className="source-status">
                    <span className="dot" /> 同步状态（Mock 日志为示例）:{" "}
                    {sources.find((s) => s.code === a)?.sync_status ||
                      "NOT_CONNECTED"}
                  </p>
                  {sources.find((s) => s.code === a)?.sync_error && (
                    <p className="notice">
                      {sources.find((s) => s.code === a)?.sync_error}
                    </p>
                  )}
                  <Link href={`/regulations?agency=${a}`} className="text-btn">
                    查看法规 <ArrowRight size={14} />
                  </Link>
                </section>
              ))}
            </div>
          )}
          {page === "reports" && <Reports records={regulations} />}
          {page === "ai-tools" && <AITools records={regulations} />}
          {["settings", "agencies"].includes(page) && (
            <SyncStatus logs={syncLogs} kind={databaseKind} />
          )}
          {page === "settings" && (
            <div className="settings-grid">
              <section className="panel">
                <h2>工作区设置</h2>
                <p>数据库与浏览器本地偏好</p>
                <div className="setting-row">
                  <span>
                    数据模式<small>官方记录与开发示例逐条标识</small>
                  </span>
                  <span className="badge blue">Official / Mock</span>
                </div>
                <div className="setting-row">
                  <span>显示语言</span>
                  <span>简体中文 / English</span>
                </div>
                <div className="setting-row">
                  <span>统计日期（UTC）</span>
                  <span>{DEMO_DATE}</span>
                </div>
                <div className="setting-row">
                  <span>收藏法规</span>
                  <b>{saved.length}</b>
                </div>
                <div className="setting-row">
                  <span>关注规则</span>
                  <b>{watchlists.length}</b>
                </div>
              </section>
              <section className="panel">
                <h2>数据与通知连接</h2>
                <p>
                  六个来源共用统一调度。云端运行记录请查看 GitHub
                  Actions；站内通知已接入，其他渠道未启用。
                </p>
                {[
                  "Browser Notification",
                  "Email / Webhook",
                  "企业微信 / 飞书 / 钉钉 / Slack",
                ].map((t) => (
                  <div className="setting-row" key={t}>
                    <span>{t}</span>
                    <span className="badge neutral">未接入</span>
                  </div>
                ))}
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              BioReg Radar <span>·</span> 全球生物药法规情报平台
            </span>
            <span>
              <ShieldCheck size={13} /> Official sources first <span>·</span>{" "}
              Daily Digest / Watchlist / Notification
            </span>
          </footer>
        </main>
      </div>
      {ai && <AIExplainModal records={ai} onClose={() => setAi(null)} />}{" "}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            className="icon-btn"
            onClick={() => setToast("")}
            aria-label="关闭提示"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
