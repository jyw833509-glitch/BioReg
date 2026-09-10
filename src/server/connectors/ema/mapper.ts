import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
export function mapType(s: string): DocumentType {
  if (/reflection paper/i.test(s)) return "REFLECTION_PAPER";
  if (/concept paper/i.test(s)) return "CONCEPT_PAPER";
  if (/questions.*answers|q&a/i.test(s)) return "QA";
  if (/guideline/i.test(s)) return "GUIDELINE";
  return "OTHER";
}
export function mapStatus(s: string): RegulationStatus {
  for (const [p, v] of [
    [/superseded/i, "SUPERSEDED"],
    [/withdrawn/i, "WITHDRAWN"],
    [/archived/i, "ARCHIVED"],
    [/current effective|^effective$/i, "EFFECTIVE"],
    [/consultation (?:open|ongoing)/i, "UNDER_CONSULTATION"],
    [/draft/i, "DRAFT"],
    [/adopted/i, "FINAL"],
    [/revised/i, "REVISED"],
  ] as const)
    if (p.test(s)) return v;
  return "UNKNOWN";
}
