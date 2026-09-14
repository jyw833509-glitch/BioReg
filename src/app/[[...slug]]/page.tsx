import Link from "next/link";
import { notFound } from "next/navigation";
import { getPageData } from "@/server/page-data";
import { parseQuery } from "@/server/validation";
import { Workspace } from "@/components/workspace";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug = [] } = await params;
  const page = slug[0] || "dashboard";
  if (
    ![
      "dashboard",
      "today",
      "regulations",
      "updates",
      "watchlist",
      "notifications",
      "digest",
      "topics",
      "agencies",
      "reports",
      "ai-tools",
      "settings",
    ].includes(page) ||
    slug.length > 2 ||
    (slug.length === 2 && page !== "regulations")
  )
    notFound();
  const raw = await searchParams;
  const search = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  let query;
  try {
    query = parseQuery(search);
  } catch {
    return (
      <main>
        <section className="panel">
          <h1>筛选参数无效</h1>
          <p>请检查日期、页码或筛选值。</p>
          <Link href="/regulations" className="button">
            重置筛选
          </Link>
        </section>
      </main>
    );
  }
  const data = await getPageData(page, query, slug[1]);
  if (slug[1] && !data.record) notFound();
  const filters: Record<string, string> = {};
  for (const key of [
    "regulator",
    "categories",
    "subcategories",
    "product_types",
    "development_stages",
    "affected_departments",
    "status",
    "document_type",
    "importance_level",
    "date",
    "change",
  ]) {
    const value =
      search[key] ||
      (key === "regulator"
        ? search.agency
        : key === "categories"
          ? search.topic
          : undefined);
    if (value) filters[key] = value;
  }
  return (
    <Workspace
      key={slug.join("/") + "?" + JSON.stringify(search)}
      page={page}
      record={data.record || undefined}
      initialQuery={query.q}
      initialFilters={filters}
      initialSort={query.sort}
      regulations={data.regulations}
      syncLogs={data.logs}
      databaseKind="postgres"
      sources={data.sources}
      watchlists={data.watchlists}
      changeEvents={data.changeEvents}
      dashboard={data.dashboard}
      topicCounts={data.topicCounts}
      pageInfo={data.pagination}
    />
  );
}
