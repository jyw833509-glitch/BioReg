import type { Prisma } from "../../../generated/prisma/client";
import type { Db } from "../../db";
import type { OfficialRecord } from "./types";
export function identity(
  sourceId: string,
  data: OfficialRecord,
): Prisma.RegulationWhereInput {
  const OR: Prisma.RegulationWhereInput[] = [
    { canonical_url: data.canonical_url },
  ];
  if (data.document_number) OR.push({ document_number: data.document_number });
  // Title/date fallback only merges legacy rows without stronger identities.
  if (data.publication_date)
    OR.push({
      canonical_url: null,
      document_number: null,
      title_original: data.title_original,
      publication_date: data.publication_date,
    });
  return { source_id: sourceId, is_mock: false, OR };
}
export async function writeRecord(
  db: Db,
  sourceId: string,
  data: OfficialRecord,
  dryRun = false,
) {
  async function apply(tx: Prisma.TransactionClient) {
    const matches = await tx.regulation.findMany({
      where: identity(sourceId, data),
      take: 2,
    });
    if (matches.length > 1)
      throw new Error(
        "Conflicting source document identities; manual review required",
      );
    const existing = matches[0];
    const outcome = !existing
      ? "new"
      : existing.content_hash === data.content_hash
        ? "existing"
        : "updated";
    if (dryRun) return outcome;
    const now = new Date();
    if (outcome === "existing") {
      await tx.regulation.update({
        where: { id: existing.id },
        data: {
          last_checked_at: now,
          updated_at: existing.updated_at,
          categories: data.categories,
          subcategories: data.subcategories,
          product_types: data.product_types,
          development_stages: data.development_stages,
          affected_departments: data.affected_departments,
        },
      });
      return outcome;
    }
    const previous = existing
      ? await tx.regulationVersion.findFirst({
          where: { regulation_id: existing.id },
          orderBy: [{ detected_at: "desc" }, { created_at: "desc" }],
        })
      : null;
    const version = existing
      ? String(
          (await tx.regulationVersion.count({
            where: { regulation_id: existing.id },
          })) + 1,
        )
      : "1";
    const row = existing
      ? await tx.regulation.update({
          where: { id: existing.id },
          data: {
            ...data,
            is_new: false,
            is_updated: true,
            last_checked_at: now,
            version,
            previous_version_id: previous?.id || null,
          },
        })
      : await tx.regulation.create({
          data: {
            ...data,
            source_id: sourceId,
            is_new: true,
            is_updated: false,
            first_detected_at: now,
            last_checked_at: now,
            version,
          },
        });
    await tx.regulationVersion.create({
      data: {
        regulation_id: row.id,
        version_name: version,
        document_url: data.official_url,
        pdf_url: data.pdf_url,
        publication_date: data.publication_date,
        status: data.status,
        content_hash: data.content_hash,
        source_hash: data.source_hash,
        content_snapshot: JSON.stringify(data),
        previous_version_id: previous?.id || null,
        detected_at: now,
        change_detected: existing
          ? "Official fields changed (hash comparison; no paragraph diff)"
          : "Initial official capture",
      },
    });
    return outcome;
  }
  if (dryRun) return apply(db);
  return db.$transaction(async (tx) => {
    // Serialize this source's identity decisions, including concurrent CLI runs.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${sourceId}))::text`;
    return apply(tx);
  });
}
