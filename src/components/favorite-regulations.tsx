"use client";
import { useEffect, useState } from "react";
import type { Regulation } from "@/lib/types";
import { RegulationCard } from "./workspace";
export function FavoriteRegulations({
  saved,
  onSave,
  onExplain,
}: {
  saved: string[];
  onSave: (id: string) => void;
  onExplain: (r: Regulation) => void;
}) {
  const [items, setItems] = useState<Regulation[]>([]);
  const [error, setError] = useState("");
  const ids = JSON.stringify(saved.slice(0, 100));
  useEffect(() => {
    const abort = new AbortController();
    Promise.all(
      (JSON.parse(ids) as string[]).map(async (id) => {
        const response = await fetch(
          `/api/regulations/${encodeURIComponent(id)}`,
          { signal: abort.signal },
        );
        if (response.status === 404) return null;
        if (!response.ok) throw new Error("收藏读取失败，请刷新重试。");
        return (await response.json()).data as Regulation;
      }),
    )
      .then((values) => {
        setItems(values.filter((r): r is Regulation => !!r));
        setError("");
      })
      .catch((error) => {
        if (!abort.signal.aborted) setError(error.message);
      });
    return () => abort.abort();
  }, [ids]);
  return (
    <section>
      <div className="section-head">
        <div>
          <h2>已收藏法规</h2>
          <p>收藏保留在当前浏览器，法规内容从数据库按 ID 读取。</p>
        </div>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : items.length ? (
        <div className="cards-grid">
          {items.map((r) => (
            <RegulationCard
              key={r.id}
              record={r}
              saved
              onSave={() => onSave(r.id)}
              onExplain={() => onExplain(r)}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <h2>还没有可显示的收藏法规</h2>
          <p>点击法规卡片上的收藏图标，将重要内容保存在这里。</p>
        </section>
      )}
      {saved.length > 100 && <p>当前显示前 100 条收藏。</p>}
    </section>
  );
}
