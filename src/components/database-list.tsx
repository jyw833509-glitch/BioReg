"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { Regulation } from "@/lib/types";
import type { Pagination } from "@/lib/view-types";
import { RegulationCard, FilterBar } from "./workspace";
export function DatabaseList({
  records,
  pagination,
  filters,
  initialQuery,
  initialSort,
  page,
  saved,
  onSave,
  onExplain,
}: {
  records: Regulation[];
  pagination: Pagination;
  filters: Record<string, string>;
  initialQuery: string;
  initialSort: string;
  page: string;
  saved: string[];
  onSave: (id: string) => void;
  onExplain: (record: Regulation) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  function navigate(values: Record<string, string>) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(values)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("agency");
    params.delete("topic");
    if (!("regulator" in values) && filters.regulator)
      params.set("regulator", filters.regulator);
    if (!("categories" in values) && filters.categories)
      params.set("categories", filters.categories);
    startTransition(() => router.push(`/${page}?${params}`));
  }
  return (
    <section aria-busy={pending}>
      <FilterBar
        records={records}
        filters={filters}
        onChange={(key, value) => {
          if (key === "*") {
            startTransition(() => router.push(`/${page}`));
          } else navigate({ [key]: value, page: "1" });
        }}
      />
      <div className="results-toolbar">
        <span>
          共 <b>{pagination.total}</b> 条法规 · 数据库查询
        </span>
        <form
          className="list-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: query, page: "1" });
          }}
        >
          <Search size={15} />
          <input
            aria-label="搜索当前法规"
            placeholder="输入关键词，按 Enter 搜索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="text-btn" type="submit">
            搜索
          </button>
        </form>
        <select
          aria-label="排序"
          value={initialSort}
          onChange={(e) => navigate({ sort: e.target.value, page: "1" })}
        >
          {["Newest", "Recently Updated", "Importance", "Regulator"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      {records.length ? (
        <div className="cards-grid">
          {records.map((r) => (
            <RegulationCard
              key={r.id}
              record={r}
              saved={saved.includes(r.id)}
              onSave={() => onSave(r.id)}
              onExplain={() => onExplain(r)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={30} />
          <h2>No regulatory records available yet.</h2>
          <p>
            {pagination.total
              ? "当前页无数据，请返回上一页。"
              : "没有符合条件的法规。可以调整关键词和筛选条件。"}
          </p>
          <p>Real regulatory sources will be connected in later phases.</p>
        </div>
      )}
      <div className="pagination">
        <label>
          每页{" "}
          <select
            aria-label="每页条数"
            value={pagination.pageSize}
            onChange={(e) => navigate({ pageSize: e.target.value, page: "1" })}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          第 {pagination.page} / {pagination.totalPages} 页 · 共{" "}
          {pagination.total} 条
        </span>
        <button
          className="button"
          disabled={pending || pagination.page <= 1}
          onClick={() => navigate({ page: String(pagination.page - 1) })}
        >
          <ChevronLeft size={14} />
          上一页
        </button>
        <button
          className="button"
          disabled={pending || pagination.page >= pagination.totalPages}
          onClick={() => navigate({ page: String(pagination.page + 1) })}
        >
          下一页
          <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}
