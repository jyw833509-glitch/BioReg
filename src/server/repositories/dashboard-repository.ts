import { Prisma } from "../../generated/prisma/client";
import type { Db } from "../db";
import type { DashboardView } from "../../lib/view-types";
import { documentLabels } from "../../lib/labels";
import { regulationDto } from "../mappers";
import { officialOnly, visibleWhere } from "../visibility";
import { dayRange, whereQuery } from "./regulation-repository";
import { querySchema } from "../validation";

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
  const now = new Date(),
    day = dayRange(now);
  const aggregate = await dashboardAggregates(client, now);
  // Keep queries sequential on the existing single-connection runtime. The three
  // small card lists do not consume pagination totals or need count transactions.
  const recent = await client.regulation.findMany({
    where: visibleWhere(),
    take: 4,
    orderBy: [
      { publication_date: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
    include: {
      versions: { take: 2, orderBy: [{ detected_at: "desc" }, { id: "asc" }] },
    },
  });
  const priority = await client.regulation.findMany({
    where: visibleWhere({
      importance_level: { in: ["CRITICAL", "HIGH"] },
      OR: [
        { is_new: true, first_detected_at: day },
        {
          is_updated: true,
          versions: {
            some: { previous_version_id: { not: null }, detected_at: day },
          },
        },
      ],
    }),
    take: 4,
    orderBy: [
      { importance_level: "asc" },
      { publication_date: { sort: "desc", nulls: "last" } },
      { id: "asc" },
    ],
    include: { versions: { take: 2, orderBy: { detected_at: "desc" } } },
  });
  const changes = await client.regulation.findMany({
    where: whereQuery(querySchema.parse({ updates: true }), now),
    take: 3,
    orderBy: [{ updated_at: "desc" }, { id: "asc" }],
    include: {
      versions: { take: 2, orderBy: [{ detected_at: "desc" }, { id: "asc" }] },
    },
  });
  const job = await client.syncJob.findFirst({
    orderBy: [{ started_at: "desc" }, { id: "desc" }],
    select: { id: true, started_at: true, status: true },
  });
  const health = await client.source.findMany({
    select: {
      code: true,
      enabled: true,
      last_status: true,
      last_sync_at: true,
    },
  });
  const lastSync =
    health
      .map((s) => s.last_sync_at?.toISOString())
      .filter((s): s is string => !!s)
      .sort()
      .at(-1) || null;
  return {
    ...aggregate.stats,
    lastGlobalSync: job?.started_at.toISOString() || null,
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
    recent: recent.map(regulationDto),
    priority: priority.map(regulationDto),
    changes: changes.map(regulationDto),
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
