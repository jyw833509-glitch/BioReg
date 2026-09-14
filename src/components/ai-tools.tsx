"use client";
import { useEffect, useState, useRef } from "react";
import type { Regulation } from "@/lib/types";
import {
  providers,
  templates,
  disclaimer,
  privacyWarning,
} from "@/lib/external-ai";
type Option = { id: string; label: string };
export function AITools({
  records,
  initialId = "",
}: {
  records: Regulation[];
  initialId?: string;
}) {
  const [kind, setKind] = useState("regulation"),
    [id, setId] = useState(initialId || records[0]?.id || "");
  const [provider, setProvider] = useState("deepseek"),
    [template, setTemplate] = useState("explain"),
    [level, setLevel] = useState("standard"),
    [language, setLanguage] = useState("Chinese");
  const [options, setOptions] = useState<Option[]>([]),
    [versions, setVersions] = useState<Option[]>([]);
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    prompt: string;
    context: string;
    truncated: boolean;
  } | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const readHash = () => {
      const p = new URLSearchParams(window.location.hash.slice(1));
      if (p.get("kind")) setKind(p.get("kind")!);
      if (p.get("id")) setId(p.get("id")!);
      if (p.get("template")) setTemplate(p.get("template")!);
      generation.current++;
      setResult(null);
    };
    const timer = setTimeout(readHash, 0);
    window.addEventListener("hashchange", readHash);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", readHash);
    };
  }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const url =
          kind === "digest"
            ? "/api/digests"
            : kind === "change"
              ? "/api/changes"
              : "/api/regulations?pageSize=100";
        const res = await fetch(url);
        if (!res.ok) throw new Error("上下文列表暂不可用");
        const data = await res.json();
        const list: Option[] = data.data.map(
          (x: {
            id: string;
            title_original?: string;
            digest_date?: string;
            change_summary?: string;
          }) => ({
            id: x.id,
            label:
              x.title_original || x.digest_date || x.change_summary || x.id,
          }),
        );
        if (active) setOptions(list);
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [kind]);
  useEffect(() => {
    let active = true;
    if (kind !== "comparison" || !id) return;
    void fetch("/api/regulations/" + encodeURIComponent(id) + "/versions")
      .then(async (r) => {
        if (!r.ok) throw new Error("版本不可用");
        const d = await r.json();
        if (active)
          setVersions(
            d.data.map((v: { id: string; version_name: string }) => ({
              id: v.id,
              label: "Internal v" + v.version_name,
            })),
          );
      })
      .catch(() => {
        if (active) setVersions([]);
      });
    return () => {
      active = false;
    };
  }, [kind, id]);
  const available = templates.filter((t) =>
    t.applicable_context.includes(kind),
  );
  const selectedProvider = providers.find(
    (p) => p.id === provider && p.enabled,
  );
  function reset() {
    generation.current++;
    setResult(null);
    setError("");
  }
  async function generate() {
    reset();
    const requestGeneration = generation.current;
    setBusy(true);
    try {
      const params = new URLSearchParams({
        kind,
        id,
        provider,
        template,
        level,
        language,
      });
      if (kind === "comparison") {
        params.set("from", from);
        params.set("to", to);
      }
      const r = await fetch("/api/ai?" + params);
      const data = await r.json();
      if (!r.ok)
        throw new Error(data.issues?.[0]?.message || data.error || "生成失败");
      if (requestGeneration === generation.current) setResult(data);
    } catch (e) {
      if (requestGeneration === generation.current) setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>External AI Tools · 法规分析提示词</h2>
      <p>选择上下文 → 预览完整 Prompt → 复制 → 打开官方平台自行粘贴</p>
      <div className="notice">
        {disclaimer}
        <p>{privacyWarning}</p>
      </div>
      <div className="settings-grid">
        <label>
          AI Provider
          <select
            value={provider}
            onChange={(e) => {
              reset();
              setProvider(e.target.value);
            }}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id} disabled={!p.enabled}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Context
          <select
            value={kind}
            onChange={(e) => {
              reset();
              setKind(e.target.value);
              setId("");
              setFrom("");
              setTo("");
              setTemplate(
                e.target.value === "comparison"
                  ? "compare"
                  : e.target.value === "change"
                    ? "change"
                    : e.target.value === "digest"
                      ? "digest"
                      : "explain",
              );
            }}
          >
            {["regulation", "change", "comparison", "digest"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          BioReg record
          <select
            value={id}
            onChange={(e) => {
              reset();
              setId(e.target.value);
              setFrom("");
              setTo("");
            }}
          >
            <option value="">请选择</option>
            {!options.some((o) => o.id === id) && id && (
              <option value={id}>{id}</option>
            )}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prompt Template
          <select
            value={template}
            onChange={(e) => {
              reset();
              setTemplate(e.target.value);
            }}
          >
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Context Level
          <select
            value={level}
            onChange={(e) => {
              reset();
              setLevel(e.target.value);
            }}
          >
            {["compact", "standard", "detailed"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label>
          Language
          <select
            value={language}
            onChange={(e) => {
              reset();
              setLanguage(e.target.value);
            }}
          >
            {["Chinese", "English", "Bilingual"].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>
      {kind === "comparison" && (
        <div className="settings-grid">
          {[
            ["Version A", from, setFrom],
            ["Version B", to, setTo],
          ].map(([label, value, set]) => (
            <label key={label as string}>
              {label as string}
              <select
                value={value as string}
                onChange={(e) => {
                  reset();
                  (set as (v: string) => void)(e.target.value);
                }}
              >
                <option value="">请选择不同版本</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <p>
        compact：元数据与摘要；standard：有限正文片段；detailed：可用正文及版本差异。缺失内容不会补造。
      </p>
      <button
        className="button primary"
        disabled={
          busy ||
          !id ||
          (kind === "comparison" && (!from || !to || from === to))
        }
        onClick={generate}
      >
        {busy ? "正在生成…" : "Generate Prompt"}
      </button>
      <p role="status">{error}</p>
      {result && (
        <>
          <h3>Context Preview · Official Evidence / BioReg Metadata</h3>
          <pre
            style={{ whiteSpace: "pre-wrap", maxHeight: 350, overflow: "auto" }}
          >
            {result.context}
          </pre>
          {result.truncated && (
            <p className="notice">
              内容已截断，请查阅原文；完整 Prompt 中保留截断标记。
            </p>
          )}
          <h3>Generated Prompt · Prompt Instructions / Evidence Boundary</h3>
          <textarea
            aria-label="Generated Prompt"
            readOnly
            value={result.prompt}
            style={{ width: "100%", minHeight: 420 }}
          />
          <button
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(result.prompt);
                setError("Prompt 已复制");
              } catch {
                setError("请手动选择上方完整 Prompt 复制");
              }
            }}
          >
            Copy Prompt
          </button>{" "}
          {selectedProvider && (
            <a
              className="button"
              href={selectedProvider.homepage_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in {selectedProvider.name}
            </a>
          )}
        </>
      )}
    </section>
  );
}
