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
    async getByCode(code: "FDA" | "EMA" | "NMPA" | "CDE" | "ICH" | "PMDA") {
      return client.source.findUnique({ where: { code } });
    },
    async count() {
      return client.source.count({ where: { enabled: true } });
    },
  };
}
