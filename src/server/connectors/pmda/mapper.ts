import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
export function mapType(s: string): DocumentType {
  if (/questions.*answers|q&a/i.test(s)) return "QA";
  if (/guideline|guidance/i.test(s)) return "GUIDELINE";
  return "OTHER";
}
// Listing a document does not establish its current legal status.
export function mapStatus(s: string): RegulationStatus {
  if (/^withdrawn$/i.test(s)) return "WITHDRAWN";
  if (/^superseded$/i.test(s)) return "SUPERSEDED";
  return "UNKNOWN";
}
