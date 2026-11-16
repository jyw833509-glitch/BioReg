import { titleHash } from "./title-quality";

/** Do not erase verified enrichment merely because a listing parser has no value.
 * A changed title/PDF invalidates this fallback; actual incoming values always win. */
interface EnrichedRecord {
  title_original: string;
  pdf_url: string | null;
  document_number: string | null;
  publication_date: Date | null;
  effective_date: Date | null;
  status: string;
  source_metadata?: unknown;
}
export function retainVerifiedFields<T extends EnrichedRecord>(
  previous: EnrichedRecord,
  incoming: T,
): T {
  const old = (previous.source_metadata || {}) as Record<string, unknown>;
  const proof = old.bioreg_field_enrichment as
    Record<string, unknown> | undefined;
  if (
    previous.title_original !== incoming.title_original ||
    (proof && proof.original_sha256 !== titleHash(incoming.title_original)) ||
    previous.pdf_url !== incoming.pdf_url
  )
    return incoming;
  const values = { ...((proof?.values as Record<string, unknown>) || {}) };
  const result = { ...incoming };
  for (const field of [
    "document_number",
    "publication_date",
    "effective_date",
  ] as const) {
    if (!result[field] && values[field]) {
      // Assign only the known typed field, not arbitrary metadata keys.
      if (field === "document_number")
        result.document_number = previous.document_number;
      if (field === "publication_date")
        result.publication_date = previous.publication_date;
      if (field === "effective_date")
        result.effective_date = previous.effective_date;
    }
  }
  if (incoming.status === "UNKNOWN" && values.status)
    result.status = previous.status;
  result.source_metadata = {
    ...((incoming.source_metadata as object) || {}),
    ...(old.official_version ? { official_version: old.official_version } : {}),
    ...(proof ? { bioreg_field_enrichment: { ...proof, values } } : {}),
    ...(old.bioreg_field_review
      ? { bioreg_field_review: old.bioreg_field_review }
      : {}),
  };
  return result;
}
