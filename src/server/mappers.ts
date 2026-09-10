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
export function versionDto(v: DbVersion): RegulationVersion {
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
  r: DbRegulation & { versions?: DbVersion[] },
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
