import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
export function mapType(s: string): DocumentType {
  if (/concept/i.test(s)) return "CONCEPT_PAPER";
  if (/reflection/i.test(s)) return "REFLECTION_PAPER";
  if (/q&a|questions.*answers/i.test(s)) return "QA";
  if (/guideline/i.test(s)) return "GUIDELINE";
  return "OTHER";
}
export function mapStatus(s: string): RegulationStatus {
  if (/withdrawn/i.test(s)) return "WITHDRAWN";
  if (/superseded/i.test(s)) return "SUPERSEDED";
  if (/step [45]/i.test(s)) return "FINAL";
  if (/step 3/i.test(s)) return "UNDER_CONSULTATION";
  if (/step [12]/i.test(s)) return "DRAFT";
  return "UNKNOWN";
}
