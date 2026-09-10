import type { Prisma } from "../../generated/prisma/client";
import type { Db } from "../db";
export function syncLogRepository(client: Db) {
  return {
    async list() {
      return client.syncLog.findMany({
        take: 30,
        orderBy: { started_at: "desc" },
        include: { source: { select: { code: true } } },
      });
    },
    async create(data: Prisma.SyncLogUncheckedCreateInput) {
      return client.syncLog.create({ data });
    },
  };
}
