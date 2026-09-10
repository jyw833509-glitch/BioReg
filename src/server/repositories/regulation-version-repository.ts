import type { Prisma } from "../../generated/prisma/client";
import type { Db } from "../db";
import { versionDto } from "../mappers";
export function regulationVersionRepository(client: Db) {
  return {
    async list(regulationId: string) {
      return (
        await client.regulationVersion.findMany({
          where: { regulation_id: regulationId },
          orderBy: [{ detected_at: "desc" }, { id: "asc" }],
        })
      ).map(versionDto);
    },
    async create(data: Prisma.RegulationVersionUncheckedCreateInput) {
      return client.regulationVersion.create({ data });
    },
  };
}
