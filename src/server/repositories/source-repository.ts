import type { Db } from "../db";
export function sourceRepository(client: Db) {
  return {
    async list() {
      return client.source.findMany({
        orderBy: { code: "asc" },
        include: {
          _count: { select: { regulations: { where: { is_mock: false } } } },
          regulations: {
            where: { is_mock: false },
            take: 1,
            orderBy: [
              { publication_date: { sort: "desc", nulls: "last" } },
              { first_detected_at: "desc" },
            ],
            select: { id: true, title_original: true },
          },
          sync_logs: {
            where: { is_mock: false },
            take: 1,
            orderBy: { started_at: "desc" },
            select: {
              status: true,
              started_at: true,
              finished_at: true,
              error_message: true,
            },
          },
        },
      });
    },
    async listCompact() {
      const rows = await client.$queryRaw<
        Awaited<ReturnType<typeof this.list>>
      >`
        SELECT s.*,
          jsonb_build_object('regulations',(SELECT count(*)::int FROM regulations r WHERE r.source_id=s.id AND NOT r.is_mock)) AS "_count",
          COALESCE((SELECT jsonb_agg(r) FROM (SELECT id,title_original FROM regulations WHERE source_id=s.id AND NOT is_mock ORDER BY publication_date DESC NULLS LAST,first_detected_at DESC LIMIT 1) r),'[]'::jsonb) AS regulations,
          COALESCE((SELECT jsonb_agg(l) FROM (SELECT status,started_at,finished_at,error_message FROM sync_logs WHERE source_id=s.id AND NOT is_mock ORDER BY started_at DESC LIMIT 1) l),'[]'::jsonb) AS sync_logs
        FROM sources s ORDER BY s.code ASC`;
      return rows.map((s) => ({
        ...s,
        sync_logs: s.sync_logs.map((l) => ({
          ...l,
          started_at: new Date(l.started_at),
          finished_at: l.finished_at ? new Date(l.finished_at) : null,
        })),
      }));
    },
    async getByCode(code: "FDA" | "EMA" | "NMPA" | "CDE" | "ICH" | "PMDA") {
      return client.source.findUnique({ where: { code } });
    },
    async count() {
      return client.source.count({ where: { enabled: true } });
    },
  };
}
