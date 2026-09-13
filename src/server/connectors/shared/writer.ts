import { detectChange, fingerprints } from "../../changes/detect";
import { assertOfficialContent, normalizedUrl } from "../../changes/normalize";
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
  data = { ...data, canonical_url: normalizedUrl(data.canonical_url) };
  assertOfficialContent(
    data.title_original,
    data.content_text ||
      data.official_summary ||
      (data.attachment_urls?.length &&
      ((data.regulator === "CDE" &&
        data.source_metadata?.professional_category) ||
        (data.regulator === "PMDA" && data.source_metadata?.listing_text) ||
        (data.regulator === "ICH" &&
          (data.source_metadata?.guideline_code ||
            data.source_metadata?.parent_guideline_code)))
        ? data.title_original
        : ""),
  );
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
    const change = detectChange(existing || null, data);
    const outcome = !existing
      ? "new"
      : change.change_types.length
        ? "updated"
        : "existing";
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
    let previous = existing
      ? await tx.regulationVersion.findFirst({
          where: { regulation_id: existing.id },
          orderBy: [{ detected_at: "desc" }, { created_at: "desc" }],
        })
      : null;
    // Legacy rows without a snapshot must be preserved before overwriting current fields.
    if (existing && !previous) {
      previous = await tx.regulationVersion.create({
        data: {
          regulation_id: existing.id,
          version_name: "1",
          document_url: existing.official_url,
          pdf_url: existing.pdf_url,
          publication_date: existing.publication_date,
          status: existing.status,
          content_hash: existing.content_hash,
          source_hash: existing.source_hash,
          content_snapshot: JSON.stringify(existing),
          detected_at: existing.first_detected_at,
          change_detected: "Baseline preserved before Phase 6 change detection",
        },
      });
    }
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
            ...fingerprints(data),
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
            ...fingerprints(data),
            source_id: sourceId,
            is_new: true,
            is_updated: false,
            first_detected_at: now,
            last_checked_at: now,
            version,
          },
        });
    const currentVersion = await tx.regulationVersion.create({
      data: {
        regulation_id: row.id,
        version_name: version,
        document_url: data.official_url,
        pdf_url: data.pdf_url,
        publication_date: data.publication_date,
        status: data.status,
        ...fingerprints(data),
        content_snapshot: JSON.stringify(data),
        previous_version_id: previous?.id || null,
        detected_at: now,
        change_detected: change.change_summary,
      },
    });
    await tx.changeEvent.create({
      data: {
        regulation_id: row.id,
        previous_version_id: previous?.id || null,
        current_version_id: currentVersion.id,
        detected_at: now,
        change_types: change.change_types,
        changed_fields: JSON.parse(JSON.stringify(change.changed_fields)),
        sections: JSON.parse(JSON.stringify(change.sections)),
        change_summary: change.change_summary,
        severity: change.severity,
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
