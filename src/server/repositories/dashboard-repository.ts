import { Prisma } from "../../generated/prisma/client";
import type { Db } from "../db";
import type { DashboardView } from "../../lib/view-types";
import { documentLabels } from "../../lib/labels";
import { regulationJsonDto } from "../mappers";
import { officialOnly } from "../visibility";
import { dayRange } from "./regulation-repository";
import { publicRead } from "../public-read";

type Counts = Pick<
  DashboardView,
  | "total"
  | "mockTotal"
  | "todayNew"
  | "todayUpdated"
  | "todayTotal"
  | "todayHigh"
  | "highPriority"
  | "thisWeek"
  | "draft"
  | "final"
>;
export function dashboardAggregateQuery(now = new Date()) {
  const day = dayRange(now),
    monday = new Date(day.gte);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return Prisma.sql`
 WITH visible AS MATERIALIZED (
   SELECT r.*,
     (r.is_new AND r.first_detected_at >= ${day.gte}::timestamptz AND r.first_detected_at < ${day.lt}::timestamptz) AS new_today,
     (r.is_updated AND EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL AND v.detected_at >= ${day.gte}::timestamptz AND v.detected_at < ${day.lt}::timestamptz)) AS updated_today,
     (r.first_detected_at >= ${monday}::timestamptz AND r.first_detected_at < ${day.lt}::timestamptz OR r.is_updated AND EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL AND v.detected_at >= ${monday}::timestamptz AND v.detected_at < ${day.lt}::timestamptz)) AS in_week
   FROM regulations r WHERE (${!officialOnly()} OR r.is_mock=false)
 )
 SELECT jsonb_build_object(
  'total',count(*),'mockTotal',count(*) FILTER(WHERE is_mock),
  'todayNew',count(*) FILTER(WHERE new_today),'todayUpdated',count(*) FILTER(WHERE updated_today),
  'todayTotal',count(*) FILTER(WHERE new_today OR updated_today),
  'todayHigh',count(*) FILTER(WHERE importance_level IN ('CRITICAL','HIGH') AND (new_today OR updated_today)),
  'highPriority',count(*) FILTER(WHERE importance_level IN ('CRITICAL','HIGH')),
  'thisWeek',count(*) FILTER(WHERE in_week),
  'draft',count(*) FILTER(WHERE document_type='DRAFT_GUIDANCE'),
  'final',count(*) FILTER(WHERE document_type='FINAL_GUIDANCE')
 ) AS stats,
 COALESCE((SELECT jsonb_object_agg(k,n) FROM (SELECT regulator::text k,count(*) n FROM visible GROUP BY regulator) a),'{}'::jsonb) AS agencies,
 COALESCE((SELECT jsonb_object_agg(k,n) FROM (SELECT category k,count(*) n FROM visible CROSS JOIN LATERAL unnest(categories) category GROUP BY category) a),'{}'::jsonb) AS topics,
 COALESCE((SELECT jsonb_object_agg(k,n) FROM (SELECT document_type::text k,count(*) n FROM visible GROUP BY document_type) a),'{}'::jsonb) AS types
 FROM visible`;
}
export async function dashboardAggregates(client: Db, now = new Date()) {
  const [result] = await client.$queryRaw<
    {
      stats: Counts;
      agencies: Record<string, number>;
      topics: Record<string, number>;
      types: Record<string, number>;
    }[]
  >(dashboardAggregateQuery(now));
  return result;
}
export async function getDashboard(client: Db): Promise<DashboardView> {
  return publicRead("dashboard", () => buildDashboard(client));
}
async function buildDashboard(client: Db): Promise<DashboardView> {
  const now = new Date(),
    day = dayRange(now);
  const cards = (
    filter: Prisma.Sql,
    order: Prisma.Sql,
    take: number,
  ) => Prisma.sql`
    (SELECT COALESCE(jsonb_agg(to_jsonb(r) - ARRAY['content_text','source_metadata','attachment_urls'] ORDER BY ${order}), '[]'::jsonb)
      FROM (SELECT r.* FROM regulations r WHERE (${!officialOnly()} OR NOT r.is_mock) AND ${filter} ORDER BY ${order} LIMIT ${take}) r)`;
  const recentOrder = Prisma.sql`r.publication_date DESC NULLS LAST, r.id ASC`;
  const priorityOrder = Prisma.sql`r.importance_level ASC, r.publication_date DESC NULLS LAST, r.id ASC`;
  const changesOrder = Prisma.sql`r.updated_at DESC, r.id ASC`;
  const todayFilter = Prisma.sql`((r.is_new AND r.first_detected_at >= ${day.gte} AND r.first_detected_at < ${day.lt}) OR (r.is_updated AND EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL AND v.detected_at >= ${day.gte} AND v.detected_at < ${day.lt})))`;
  type Snapshot = Awaited<ReturnType<typeof dashboardAggregates>> & {
    recent: Record<string, unknown>[];
    priority: Record<string, unknown>[];
    changes: Record<string, unknown>[];
    job: { id: string; started_at: string; status: string } | null;
    health: {
      code: string;
      enabled: boolean;
      last_status: string;
      last_sync_at: string | null;
    }[];
  };
  // One snapshot/round trip, not concurrent work on the single-connection pool.
  const [aggregate] = await client.$queryRaw<Snapshot[]>(Prisma.sql`
    WITH aggregate AS (${dashboardAggregateQuery(now)})
    SELECT aggregate.*,
      ${cards(Prisma.sql`TRUE`, recentOrder, 4)} AS recent,
      ${cards(Prisma.sql`r.importance_level IN ('CRITICAL','HIGH') AND ${todayFilter}`, priorityOrder, 4)} AS priority,
      ${cards(Prisma.sql`(r.is_new OR r.is_updated OR EXISTS (SELECT 1 FROM regulation_versions v WHERE v.regulation_id=r.id AND v.previous_version_id IS NOT NULL))`, changesOrder, 3)} AS changes,
      (SELECT to_jsonb(j) FROM (SELECT id, started_at, status FROM sync_jobs ORDER BY started_at DESC, id DESC LIMIT 1) j) AS job,
      (SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (SELECT code, enabled, last_status, last_sync_at FROM sources) s) AS health
    FROM aggregate`);
  const { recent, priority, changes, job, health } = aggregate;
  const lastSync =
    health
      .map((s) =>
        s.last_sync_at ? new Date(s.last_sync_at).toISOString() : undefined,
      )
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) || null;
  return {
    ...aggregate.stats,
    lastGlobalSync: job ? new Date(job.started_at).toISOString() : null,
    latestSyncResult: job?.status || "NOT_RUN",
    globalJobId: job?.id || null,
    healthySources: health.filter(
      (s) => s.enabled && s.last_status === "HEALTHY",
    ).length,
    degradedSources: health.filter(
      (s) => s.enabled && s.last_status === "DEGRADED",
    ).length,
    sourceHealthSummary: Object.fromEntries(
      health.map((s) => [s.code, s.enabled ? s.last_status : "DISABLED"]),
    ),
    monitoredAgencies: health.filter((s) => s.enabled).length,
    lastSync,
    date: day.gte.toISOString().slice(0, 10),
    byAgency: aggregate.agencies,
    byTopic: aggregate.topics,
    byDocumentType: Object.fromEntries(
      Object.entries(aggregate.types).map(([key, n]) => [
        documentLabels[key as keyof typeof documentLabels],
        n,
      ]),
    ),
    recent: recent.map(regulationJsonDto),
    priority: priority.map(regulationJsonDto),
    changes: changes.map(regulationJsonDto),
  };
}
export async function getTopicCounts(
  client: Db,
): Promise<Record<string, number>> {
  const rows = await client.$queryRaw<
    { category: string; count: number }[]
  >`SELECT category,count(*)::int AS count FROM regulations CROSS JOIN LATERAL unnest(categories) category WHERE (${!officialOnly()} OR is_mock=false) GROUP BY category`;
  return Object.fromEntries(rows.map((r) => [r.category, r.count]));
}
