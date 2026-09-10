import { parseDate, contentHash } from "../shared/scalars";
export { parseDate, contentHash } from "../shared/scalars";
import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
import { clean, type RawDocument } from "./parser";
import { classify } from "./rules";
export function mapStatus(raw: string): RegulationStatus {
  for (const [pattern, value] of [
    [/withdrawn/i, "WITHDRAWN"],
    [/archived/i, "ARCHIVED"],
    [/revised/i, "REVISED"],
    [/effective/i, "EFFECTIVE"],
    [/draft/i, "DRAFT"],
    [/final/i, "FINAL"],
  ] as const)
    if (pattern.test(raw)) return value;
  return "UNKNOWN";
}
export function mapType(raw: string, title: string): DocumentType {
  if (
    /questions.*answers|frequently asked questions|q\s*&\s*a/i.test(
      title + " " + raw,
    )
  )
    return "QA";
  if (/draft guidance/i.test(raw)) return "DRAFT_GUIDANCE";
  if (/final guidance/i.test(raw)) return "FINAL_GUIDANCE";
  if (/guidance/i.test(raw)) return "GUIDELINE";
  if (/notice/i.test(raw)) return "NOTICE";
  return "OTHER";
}
export function normalize(raw: RawDocument) {
  const warnings: string[] = [];
  const tags = classify(raw.title, raw.summary || "", raw.offices, raw.context);
  const official = {
    title_original: clean(raw.title),
    document_number: raw.documentNumber,
    document_type: mapType(raw.type, raw.title),
    status: mapStatus(raw.status),
    publication_date: parseDate(raw.date, warnings),
    publication_date_raw: raw.date || null,
    effective_date: raw.effectiveDate
      ? parseDate(raw.effectiveDate, warnings)
      : null,
    updated_date: raw.updatedDate ? parseDate(raw.updatedDate, warnings) : null,
    official_url: raw.url,
    canonical_url: raw.url,
    pdf_url: raw.pdf,
    official_summary: raw.summary,
    content_text: raw.summary || "",
    issuing_offices: raw.offices,
    official_topics: raw.topics,
    docket_number: raw.docket,
  };
  return {
    relevant: tags.relevant,
    warnings,
    data: {
      ...official,
      regulator: "FDA" as const,
      country_or_region: "United States",
      source_page_url: raw.sourcePage,
      categories: tags.categories,
      subcategories: [],
      product_types: tags.product_types,
      development_stages: tags.development_stages,
      affected_departments: tags.affected_departments,
      keywords: [],
      is_mock: false,
      content_hash: contentHash(official),
      source_hash: contentHash(official),
    },
  };
}
export type FdaRecord = ReturnType<typeof normalize>["data"];
