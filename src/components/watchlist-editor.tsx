"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WatchlistView } from "@/lib/view-types";
import { documentCode } from "@/lib/labels";
const fields = [
  ["regulators", "监管机构（FDA, EMA 等）"],
  ["country_or_regions", "国家 / 地区"],
  ["affected_departments", "受影响部门"],
  ["statuses", "法规状态（FINAL, DRAFT 等）"],
  ["change_types", "变化类型（CONTENT_CHANGED 等）"],
  ["categories", "领域分类"],
  ["subcategories", "子分类"],
  ["product_types", "产品类型"],
  ["development_stages", "研发阶段"],
  ["document_types", "文件类型（如 Final Guidance）"],
  ["keywords", "关键词"],
  ["importance_levels", "重要度（High, Critical 等）"],
] as const;
const blank = {
  id: "",
  name: "",
  description: "",
  regulators: [],
  categories: [],
  subcategories: [],
  product_types: [],
  development_stages: [],
  document_types: [],
  keywords: [],
  importance_levels: [],
  country_or_regions: [],
  affected_departments: [],
  statuses: [],
  change_types: [],
  minimum_severity: null,
  enabled: true,
} satisfies WatchlistView;
export function WatchlistEditor({ items }: { items: WatchlistView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<WatchlistView>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      name: form.get("name"),
      description: form.get("description"),
      minimum_severity: form.get("minimum_severity") || null,
      enabled: form.get("enabled") === "on",
    };
    for (const [key] of fields) {
      let values = String(form.get(key) || "")
        .split(/[,，\n]/)
        .map((v) => v.trim())
        .filter(Boolean);
      if (key === "document_types") values = values.map(documentCode);
      if (
        [
          "importance_levels",
          "regulators",
          "statuses",
          "change_types",
        ].includes(key)
      )
        values = values.map((v) => v.toUpperCase());
      body[key] = Array.from(new Set(values));
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        editing.id ? `/api/watchlists/${editing.id}` : "/api/watchlists",
        {
          method: editing.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.message || "保存失败，请检查机构、文件类型与重要度格式。",
        );
      }
      setEditing({ ...blank });
      setRevision((v) => v + 1);
      setMessage("已保存到 PostgreSQL。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/watchlists/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error();
      setMessage("关注已删除。");
      if (editing.id === id) setEditing({ ...blank });
      router.refresh();
    } catch {
      setMessage("删除失败，请重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel watch-panel">
        <div className="section-head">
          <h2>我的关注规则</h2>
          <span className="badge green">PostgreSQL · 单用户工作区</span>
        </div>
        <p>
          BioReg Watchlist Match：字段之间 AND，同一字段多个值
          OR；空字段不限制。关键词匹配标题、摘要和已抓取正文。通知从关注创建后的新发现和变化开始。
        </p>
        <form key={(editing.id || "new") + revision} onSubmit={save}>
          <div className="watch-fields">
            <label>
              关注名称
              <input
                name="name"
                aria-label="关注名称"
                defaultValue={editing.name}
                required
                maxLength={120}
              />
            </label>
            <label>
              描述
              <input
                name="description"
                aria-label="关注描述"
                defaultValue={editing.description}
                maxLength={1000}
              />
            </label>
            {fields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  aria-label={label}
                  defaultValue={editing[key].join(", ")}
                  placeholder="多个值用逗号分隔"
                />
              </label>
            ))}
          </div>
          <label>
            最低严重度{" "}
            <select
              name="minimum_severity"
              defaultValue={editing.minimum_severity || ""}
            >
              <option value="">不限制</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="watch-enabled">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={editing.enabled}
            />
            启用
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "保存中…" : editing.id ? "保存修改" : "创建关注"}
          </button>
          {editing.id && (
            <button
              className="button"
              type="button"
              onClick={() => setEditing({ ...blank })}
            >
              取消编辑
            </button>
          )}
        </form>
        <p role="status">{message}</p>
      </section>
      {items.length ? (
        items.map((item) => (
          <section key={item.id} className="panel">
            <div className="section-head">
              <h2>{item.name}</h2>
              <span className="badge neutral">
                {item.enabled ? "已启用" : "已暂停"}
              </span>
            </div>
            <p>{item.description}</p>
            <div className="tags">
              {fields.flatMap(([key]) =>
                item[key].map((v) => (
                  <span className="tag" key={key + v}>
                    {v}
                  </span>
                )),
              )}
            </div>
            <WatchlistResults id={item.id} />
            <div className="heading-actions" style={{ marginTop: 15 }}>
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await fetch(`/api/watchlists/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ enabled: !item.enabled }),
                    });
                    if (!r.ok) throw new Error();
                    router.refresh();
                  } catch {
                    setMessage("启停失败，请重试");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {item.enabled ? "禁用" : "启用"}
              </button>
              <button
                className="button"
                onClick={() => {
                  setEditing(item);
                  setMessage("");
                }}
              >
                编辑
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => remove(item.id)}
              >
                删除
              </button>
            </div>
          </section>
        ))
      ) : (
        <section className="empty-state">
          <h2>还没有关注规则</h2>
          <p>创建一条关注，数据库会在刷新和重启后保留设置。</p>
        </section>
      )}
    </>
  );
}

function WatchlistResults({ id }: { id: string }) {
  const [result, setResult] = useState<{
    matches: { id: string; title: string; reasons: string[] }[];
    updated: {
      id: string;
      event_id: string;
      title: string;
      reasons: string[];
    }[];
    recent: {
      id: string;
      regulation_id: string;
      match_type: string;
      detected_at: string;
    }[];
  } | null>(null);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className="button"
        onClick={async () => {
          try {
            const r = await fetch("/api/watchlists/" + id + "/matches");
            if (!r.ok) throw new Error();
            setResult((await r.json()).data);
            setError("");
          } catch {
            setError("匹配查询失败，请重试");
          }
        }}
      >
        查看匹配结果和最近命中
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <p>
            当前匹配 {result.matches.length} 条；最近命中 {result.recent.length}{" "}
            条（最多展示 50 条）
          </p>
          {result.matches.map((r) => (
            <p key={r.id}>
              <a href={"/regulations/" + r.id}>{r.title}</a>
              <small> · {r.reasons.join("; ")}</small>
            </p>
          ))}
          <h4>最近更新匹配（最近 100 个变化中）</h4>
          {result.updated.map((r) => (
            <p key={r.event_id}>
              <a href={"/regulations/" + r.id}>{r.title}</a> ·{" "}
              {r.reasons.join("; ")}
            </p>
          ))}
          {result.recent.map((r) => (
            <p key={r.id}>
              {r.match_type} · {r.detected_at} ·{" "}
              <a href={"/regulations/" + r.regulation_id}>查看法规</a>
            </p>
          ))}
        </>
      )}
    </div>
  );
}
