import type { Db } from "../../db";
import type { Candidate } from "./types";
import type { Prisma } from "../../../generated/prisma/client";

// Retain discovery independently of recent changes. This is a queue, not a second search index.
export async function retainCatalog(
  db: Db,
  sourceId: string,
  discovered: Candidate[],
) {
  for (const c of discovered) {
    await db.catalogEntry.upsert({
      where: { source_id_url: { source_id: sourceId, url: c.url } },
      create: {
        source_id: sourceId,
        url: c.url,
        candidate: JSON.parse(JSON.stringify(c)) as Prisma.InputJsonObject,
      },
      update: {
        candidate: JSON.parse(JSON.stringify(c)) as Prisma.InputJsonObject,
        last_seen_at: new Date(),
      },
    });
  }
  const history = await db.catalogEntry.findMany({
    where: { source_id: sourceId },
    orderBy: [{ discovered_at: "asc" }, { url: "asc" }],
  });
  const current = new Set(discovered.map((c) => c.url));
  // Historical list-only metadata is not replayed as fresh official evidence.
  // Direct HTML documents can be fetched again even after disappearing from a current list.
  return [
    ...discovered,
    ...history
      .filter((row) => !current.has(row.url))
      .map((row) => row.candidate as unknown as Candidate)
      .filter((c) => !c.document),
  ];
}
