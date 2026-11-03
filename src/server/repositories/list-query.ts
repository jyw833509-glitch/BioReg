import { Prisma } from "../../generated/prisma/client";
import type { Query } from "../validation";
import type { Db } from "../db";
import { officialOnly } from "../visibility";
import { regulationJsonDto } from "../mappers";
import { searchTerms } from "../../lib/search";

// One PostgreSQL statement gives count and page rows the same MVCC snapshot.
// SQL identifiers/orderings come only from static allowlists; inputs are parameters.
export async function compactList(client: Db, q: Query, now = new Date()) {
  const and: Prisma.Sql[] = [Prisma.sql`(${!officialOnly()} OR NOT r.is_mock)`];
  const term = q.q.trim();
  if (term) {
    const alternatives = searchTerms(term).map((term) => {
      const pattern = `%${term}%`;
      return Prisma.sql`(r.title_original ILIKE ${pattern} OR r.title_zh ILIKE ${pattern} OR r.document_number ILIKE ${pattern} OR r.official_summary ILIKE ${pattern} OR r.content_text ILIKE ${pattern} OR ${term}=ANY(r.keywords))`;
    });
    and.push(Prisma.sql`(${Prisma.join(alternatives, " OR ")})`);
  }
  if (q.region) and.push(Prisma.sql`r.country_or_region=${q.region}`);
  if (q.effect === "not-yet-effective")
    and.push(
      Prisma.sql`r.effective_date > ${now} AND r.status NOT IN ('WITHDRAWN','SUPERSEDED','ARCHIVED')`,
    );
  if (q.effect === "effective") and.push(Prisma.sql`r.status='EFFECTIVE'`);
  if (q.effect === "unspecified")
    and.push(Prisma.sql`r.effective_date IS NULL AND r.status <> 'EFFECTIVE'`);
  for (const column of [
    "regulator",
    "status",
    "document_type",
    "importance_level",
  ] as const) {
    if (q[column])
      and.push(Prisma.sql`${Prisma.raw("r." + column)}::text = ${q[column]}`);
  }
  for (const column of [
    "categories",
    "subcategories",
    "product_types",
    "development_stages",
    "affected_departments",
  ] as const) {
    if (q[column])
      and.push(Prisma.sql`${q[column]} = ANY(${Prisma.raw("r." + column)})`);
  }
  if (q.date)
    and.push(Prisma.sql`r.publication_date >= ${new Date(q.date)}::date`);
  if (q.dateTo)
    and.push(Prisma.sql`r.publication_date <= ${new Date(q.dateTo)}::date`);
  if (q.change)
    and.push(
      q.change === "New" ? Prisma.sql`r.is_new` : Prisma.sql`r.is_updated`,
    );
  if (q.is_new !== undefined) and.push(Prisma.sql`r.is_new = ${q.is_new}`);
  if (q.is_updated !== undefined)
    and.push(Prisma.sql`r.is_updated = ${q.is_updated}`);
  if (q.today) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 86400000);
    and.push(
      Prisma.sql`((r.is_new AND r.first_detected_at >= ${start} AND r.first_detected_at < ${end}) OR (r.is_updated AND EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL AND v.detected_at >= ${start} AND v.detected_at < ${end})))`,
    );
  }
  if (q.updates)
    and.push(
      Prisma.sql`(r.is_new OR r.is_updated OR EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL))`,
    );
  const scores = searchTerms(q.q).map(
    (t) =>
      Prisma.sql`(CASE WHEN lower(COALESCE(r.document_number,''))=${t} THEN 100 WHEN r.document_number ILIKE ${"%" + t + "%"} THEN 80 WHEN r.title_original ILIKE ${"%" + t + "%"} OR r.title_zh ILIKE ${"%" + t + "%"} THEN 40 WHEN r.official_summary ILIKE ${"%" + t + "%"} THEN 20 ELSE 0 END)`,
  );
  const relevance = scores.length
    ? Prisma.sql`GREATEST(${Prisma.join(scores)})`
    : Prisma.sql`0`;
  const order =
    q.sort === "Relevance"
      ? Prisma.sql`${relevance} DESC, r.publication_date DESC NULLS LAST, r.id ASC`
      : q.sort === "Importance"
        ? Prisma.sql`r.importance_level ASC, r.publication_date DESC NULLS LAST, r.id ASC`
        : q.sort === "Regulator"
          ? Prisma.sql`r.regulator ASC, r.publication_date DESC NULLS LAST, r.id ASC`
          : q.sort === "Recently Updated"
            ? Prisma.sql`r.updated_at DESC, r.id ASC`
            : Prisma.sql`r.publication_date DESC NULLS LAST, r.id ASC`;
  const [result] = await client.$queryRaw<
    { total: number; items: Record<string, unknown>[] }[]
  >(Prisma.sql`
    WITH filtered AS MATERIALIZED (SELECT r.* FROM regulations r WHERE ${Prisma.join(and, " AND ")}),
    page AS (SELECT r.*, row_number() OVER (ORDER BY ${order}) AS list_rank FROM filtered r ORDER BY ${order} LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize})
    SELECT (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg((to_jsonb(p) - ARRAY['content_text','source_metadata','attachment_urls','list_rank']) || jsonb_build_object('source_metadata',jsonb_strip_nulls(jsonb_build_object('guideline_code',p.source_metadata->'guideline_code','revision',p.source_metadata->'revision','current_step',p.source_metadata->'current_step','capture_scope',p.source_metadata->'capture_scope','catalog_excerpt',p.source_metadata->'catalog_excerpt'))) ORDER BY p.list_rank) FROM page p), '[]'::jsonb) AS items`);
  const data = result.items.map(regulationJsonDto);
  return {
    data,
    pagination: {
      page: q.page,
      pageSize: q.pageSize,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / q.pageSize)),
    },
  };
}
