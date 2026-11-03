import type {
  Regulation as DbRegulation,
  RegulationVersion as DbVersion,
} from "../generated/prisma/client";
import type {
  Regulation,
  RegulationVersion,
  Status,
  Importance,
} from "../lib/types";
import { documentLabels, statusLabels, importanceLabels } from "../lib/labels";
type ListVersion = Omit<DbVersion, "content_snapshot"> &
  Partial<Pick<DbVersion, "content_snapshot">>;
type ListRecord = Omit<
  DbRegulation,
  "content_text" | "source_metadata" | "attachment_urls"
> &
  Partial<
    Pick<DbRegulation, "content_text" | "source_metadata" | "attachment_urls">
  >;
/** Decode PostgreSQL JSON aggregates through the same DTO mapping as Prisma rows. */
export function regulationJsonDto(input: Record<string, unknown>): Regulation {
  const row = { ...input };
  for (const field of [
    "publication_date",
    "effective_date",
    "updated_date",
    "first_detected_at",
    "last_checked_at",
    "created_at",
    "updated_at",
  ]) {
    if (typeof row[field] === "string") row[field] = new Date(row[field]);
  }
  return regulationDto(row as unknown as ListRecord);
}
export function versionDto(v: ListVersion): RegulationVersion {
  return {
    ...v,
    publication_date: v.publication_date?.toISOString().slice(0, 10) || "",
    detected_at: v.detected_at.toISOString(),
    status: statusLabels[v.status] as Status,
    content_hash: v.content_hash || "",
    source_hash: v.source_hash || "",
    created_at: v.created_at.toISOString(),
  };
}
export function regulationDto(
  r: ListRecord & { versions?: ListVersion[] },
): Regulation {
  return {
    ...r,
    source_metadata:
      r.source_metadata &&
      typeof r.source_metadata === "object" &&
      !Array.isArray(r.source_metadata)
        ? r.source_metadata
        : {},
    document_number: r.document_number || "",
    document_type: documentLabels[r.document_type],
    status: statusLabels[r.status] as Status,
    importance_level: importanceLabels[r.importance_level] as Importance,
    publication_date: r.publication_date?.toISOString().slice(0, 10) || "",
    effective_date: r.effective_date?.toISOString().slice(0, 10) || null,
    updated_date: r.updated_date?.toISOString().slice(0, 10) || "",
    content_hash: r.content_hash || "",
    source_hash: r.source_hash || "",
    first_detected_at: r.first_detected_at.toISOString(),
    last_checked_at: r.last_checked_at?.toISOString() || "",
    created_at: r.created_at.toISOString(),
    updated_at: r.updated_at.toISOString(),
    versions: (r.versions || []).map(versionDto),
  };
}
