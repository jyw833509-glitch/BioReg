import { sequential } from "../sequential";
import type { Db } from "../db";
import { dayRange, regulationRepository } from "./regulation-repository";
import type { DashboardView } from "../../lib/view-types";
import { documentLabels } from "../../lib/labels";
import { regulationDto } from "../mappers";
import { officialOnly, visibleWhere } from "../visibility";
export async function getDashboard(client: Db): Promise<DashboardView> {
  const records = client.$extends({
    query: {
      regulation: {
        $allOperations({ args, query }) {
          if ("where" in args) args.where = visibleWhere(args.where);
          else Object.assign(args, { where: visibleWhere() });
          return query(args);
        },
      },
    },
  }).regulation;
  const now = new Date();
  const day = dayRange(now);
  const monday = new Date(day.gte);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const repo = regulationRepository(client);
  const updatedToday = {
    is_updated: true,
    versions: {
      some: { previous_version_id: { not: null }, detected_at: day },
    },
  };
  const [
    total,
    mockTotal,
    todayNew,
    todayUpdated,
    todayTotal,
    todayHigh,
    highPriority,
    thisWeek,
    monitoredAgencies,
    draft,
    final,
    lastSync,
    agencies,
    topics,
    types,
    recent,
    priority,
    changes,
  ] = await sequential([
    () => records.count(),
    () => records.count({ where: { is_mock: true } }),
    () =>
      records.count({
        where: { is_new: true, first_detected_at: day },
      }),
    () => records.count({ where: updatedToday }),
    () => repo.count({ today: true }),
    () =>
      records.count({
        where: {
          importance_level: { in: ["CRITICAL", "HIGH"] },
          OR: [{ is_new: true, first_detected_at: day }, updatedToday],
        },
      }),
    () =>
      records.count({
        where: { importance_level: { in: ["CRITICAL", "HIGH"] } },
      }),
    () =>
      records.count({
        where: {
          OR: [
            { first_detected_at: { gte: monday, lt: day.lt } },
            {
              is_updated: true,
              versions: {
                some: {
                  previous_version_id: { not: null },
                  detected_at: { gte: monday, lt: day.lt },
                },
              },
            },
          ],
        },
      }),
    () => client.source.count({ where: { enabled: true } }),
    () => records.count({ where: { document_type: "DRAFT_GUIDANCE" } }),
    () => records.count({ where: { document_type: "FINAL_GUIDANCE" } }),
    () =>
      client.source.findFirst({
        where: { last_sync_at: { not: null } },
        orderBy: { last_sync_at: "desc" },
        select: { last_sync_at: true },
      }),
    () => records.groupBy({ by: ["regulator"], _count: true }),
    () =>
      client.$queryRaw<
        { category: string; count: number }[]
      >`SELECT category, count(*)::int AS count FROM regulations CROSS JOIN LATERAL unnest(categories) category WHERE (${!officialOnly()} OR is_mock=false) GROUP BY category`,
    () => records.groupBy({ by: ["document_type"], _count: true }),
    () => repo.getRecent(4),
    () =>
      records.findMany({
        where: {
          importance_level: { in: ["CRITICAL", "HIGH"] },
          OR: [{ is_new: true, first_detected_at: day }, updatedToday],
        },
        take: 4,
        orderBy: [
          { importance_level: "asc" },
          { publication_date: { sort: "desc", nulls: "last" } },
          { id: "asc" },
        ],
        include: { versions: { take: 2, orderBy: { detected_at: "desc" } } },
      }),
    () => repo.getUpdated({ pageSize: 3, sort: "Recently Updated" }),
  ]);
  const [job, health] = await sequential([
    () =>
      client.syncJob.findFirst({
        orderBy: [{ started_at: "desc" }, { id: "desc" }],
      }),
    () =>
      client.source.findMany({
        select: { code: true, enabled: true, last_status: true },
      }),
  ]);
  return {
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
    date: day.gte.toISOString().slice(0, 10),
    total,
    mockTotal,
    todayNew,
    todayUpdated,
    todayTotal,
    todayHigh,
    highPriority,
    thisWeek,
    monitoredAgencies,
    draft,
    final,
    lastSync: lastSync?.last_sync_at?.toISOString() || null,
    byAgency: Object.fromEntries(agencies.map((x) => [x.regulator, x._count])),
    byTopic: Object.fromEntries(topics.map((x) => [x.category, x.count])),
    byDocumentType: Object.fromEntries(
      types.map((x) => [documentLabels[x.document_type], x._count]),
    ),
    recent: recent.data,
    priority: priority.map(regulationDto),
    changes: changes.data,
  };
}

export async function getTopicCounts(
  client: Db,
): Promise<Record<string, number>> {
  const rows = await client.$queryRaw<
    { category: string; count: number }[]
  >`SELECT category, count(*)::int AS count FROM regulations CROSS JOIN LATERAL unnest(categories) category WHERE (${!officialOnly()} OR is_mock=false) GROUP BY category`;
  return Object.fromEntries(rows.map((r) => [r.category, r.count]));
}
