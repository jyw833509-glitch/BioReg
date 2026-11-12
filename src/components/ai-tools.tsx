"use client";
import { useEffect, useState, useRef } from "react";
import type { Regulation } from "@/lib/types";
import {
  providers,
  templates,
  disclaimer,
  privacyWarning,
} from "@/lib/external-ai";
const labels: Record<string, string> = {
  regulation: "法规文件",
  change: "法规变更",
  comparison: "版本对比",
  digest: "每周汇总",
  compact: "精简：基本信息与摘要",
  standard: "标准：增加已采集正文片段",
  detailed: "详细：更多可用正文与版本资料",
  Chinese: "中文",
  English: "英文",
  Bilingual: "中英双语",
  explain: "法规解读",
  impact: "法规影响分析",
  cmc: "CMC／质量分析",
  clinical: "临床分析",
  nonclinical: "非临床分析",
  compare: "版本比较",
  department: "部门影响分析",
  actions: "建议行动清单",
  chinese: "中文解读",
  bilingual: "双语摘要",
};
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Regulation | null>(null);
  const [detailError, setDetailError] = useState("");
  useEffect(() => {
    if (!id || !["regulation", "comparison"].includes(kind)) return;
    const controller = new AbortController();
    fetch("/api/regulations/" + encodeURIComponent(id), {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        setSelected(d.data);
        setDetailError("");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSelected(null);
          setDetailError("文件资料加载失败，请重新选择后重试。");
        }
      });
    return () => controller.abort();
  }, [id, kind]);
  const currentRecord =
    selected?.id === id && ["regulation", "comparison"].includes(kind)
      ? selected
      : null;
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
              : "/api/regulations?pageSize=100&sort=Relevance&q=" +
                encodeURIComponent(search);
        const res = await fetch(url);
        if (!res.ok) throw new Error("上下文列表暂不可用");
        const data = await res.json();
        const list: Option[] = data.data.map(
          (x: {
            id: string;
            title_original?: string;
            regulator?: string;
            document_number?: string;
            digest_date?: string;
            change_summary?: string;
          }) => ({
            id: x.id,
            label: x.title_original
              ? [x.regulator, x.document_number, x.title_original]
                  .filter(Boolean)
                  .join(" · ")
              : x.digest_date || x.change_summary || x.id,
          }),
        );
        if (active) setOptions(list);
      } catch (e) {
        if (active) setError(String(e));
      }
    }
    const timer = setTimeout(() => void load(), 300);
    return () => {
      clearTimeout(timer);
      active = false;
    };
  }, [kind, search]);
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
              label: "系统记录版本 v" + v.version_name,
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
      <h2>法规分析提示词助手</h2>
      <p>
        ① 选择文件或资料 → ② 选择分析任务 → ③ 生成并检查提示词 → ④ 复制到外部 AI
      </p>
      <div className="notice">
        AI
        解读不代表监管机构意见，请核对官方原文。点击按钮复制并跳转后，请手动粘贴；本站不会自动发送。
        <details>
          <summary>使用与隐私说明</summary>
          <p>{disclaimer}</p>
          <p>{privacyWarning}</p>
        </details>
      </div>
      <div className="settings-grid">
        <label>
          分析对象
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
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          选择文件或记录
          {["regulation", "comparison"].includes(kind) && (
            <input
              aria-label="搜索文件标题或编号"
              placeholder="搜索标题、编号或关键词"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          )}
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
              <option value={id}>
                {currentRecord?.title_original ||
                  records.find((r) => r.id === id)?.title_original ||
                  "已选记录（正在加载）"}
              </option>
            )}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          分析任务
          <select
            value={template}
            onChange={(e) => {
              reset();
              setTemplate(e.target.value);
            }}
          >
            {available.map((t) => (
              <option key={t.id} value={t.id}>
                {labels[t.id] || t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          提供给 AI 的资料范围
          <select
            value={level}
            onChange={(e) => {
              reset();
              setLevel(e.target.value);
            }}
          >
            {["compact", "standard", "detailed"].map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          输出语言
          <select
            value={language}
            onChange={(e) => {
              reset();
              setLanguage(e.target.value);
            }}
          >
            {["Chinese", "English", "Bilingual"].map((k) => (
              <option key={k} value={k}>
                {labels[k]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {id && (
        <section
          className="notice"
          aria-label="已选资料与可用范围"
          style={{ overflowWrap: "anywhere" }}
        >
          <h3>已选资料</h3>
          {currentRecord ? (
            <>
              <p>
                <strong>{currentRecord.title_original}</strong>
              </p>
              {currentRecord.title_zh &&
                currentRecord.title_zh !== currentRecord.title_original && (
                  <p>{currentRecord.title_zh}</p>
                )}
              <p>
                来源：{currentRecord.regulator} · 编号：
                {currentRecord.document_number || "尚未获取"}
              </p>
              <p>
                官方摘要：
                {currentRecord.official_summary?.trim() ? "已获取" : "未获取"} ·
                已采集文本：
                {currentRecord.content_text?.trim()
                  ? currentRecord.content_text.length +
                    " 字符（不代表完整正文）"
                  : "未获取"}
              </p>
              <p>
                {level === "compact"
                  ? "本次仅提供基本信息和可用摘要，不包含正文。"
                  : kind === "comparison"
                    ? "对比使用所选历史快照；当前文件文本不等于历史版本文本，请核对生成后的资料预览。"
                    : currentRecord.content_text?.trim()
                      ? "本次可使用已采集文本；过长内容会截断，具体范围以生成后的资料预览为准。"
                      : "当前缺少正文，只能依据已获取的基本信息及摘要提供分析线索，不能据此解读完整法规要求。"}
              </p>
              {currentRecord.official_url && (
                <a
                  href={currentRecord.official_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看官方原文 ↗
                </a>
              )}
            </>
          ) : ["regulation", "comparison"].includes(kind) ? (
            <p>{detailError || "正在核对文件资料…"}</p>
          ) : (
            <>
              <p>{options.find((o) => o.id === id)?.label || "记录 " + id}</p>
              <p>
                {kind === "digest"
                  ? "使用已保存的系统汇总，不等于法规全文。"
                  : "使用已保存的变更记录和相关版本信息。"}
                实际字段与缺失项请核对生成后的资料预览。
              </p>
            </>
          )}
        </section>
      )}
      {kind === "comparison" && (
        <div className="settings-grid">
          {[
            ["系统记录版本 A", from, setFrom],
            ["系统记录版本 B", to, setTo],
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
        资料范围只决定使用多少已取得的内容，不会自动下载全文或补造缺失信息。
      </p>
      <div className="settings-grid">
        {" "}
        <label>
          使用的外部 AI 平台
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
      </div>
      <button
        className="button primary"
        disabled={
          busy ||
          !id ||
          (kind === "comparison" && (!from || !to || from === to))
        }
        onClick={generate}
      >
        {busy ? "正在生成…" : "生成分析提示词"}
      </button>
      <p role="status">{error}</p>
      {result && (
        <>
          <h3>实际提供的资料 · 官方信息与系统记录</h3>
          <pre
            style={{ whiteSpace: "pre-wrap", maxHeight: 350, overflow: "auto" }}
          >
            {result.context}
          </pre>
          {result.truncated && (
            <p className="notice">
              内容已截断，请查阅原文；完整提示词中保留截断标记。
            </p>
          )}
          <h3>完整分析提示词</h3>
          <textarea
            aria-label="完整分析提示词"
            readOnly
            value={result.prompt}
            style={{ width: "100%", minHeight: 420 }}
          />
          <button
            className="button primary"
            disabled={!selectedProvider}
            onClick={async () => {
              if (!selectedProvider) return;
              try {
                await navigator.clipboard.writeText(result.prompt);
              } catch {
                setError("复制失败，请允许剪贴板权限后重试；尚未跳转。");
                return;
              }
              window.location.assign(selectedProvider.homepage_url);
            }}
          >
            复制并打开 {selectedProvider?.name || "外部 AI"}
          </button>
          <p className="muted">
            复制成功后在当前标签页打开所选平台，请在对话框中粘贴。不会自动发送提示词。
          </p>
        </>
      )}
    </section>
  );
}
