import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
export function mapType(s: string): DocumentType {
  if (/征求意见/.test(s)) return "CONSULTATION_DRAFT";
  if (/指导原则/.test(s)) return "TECHNICAL_GUIDELINE";
  return "OTHER";
}
export function mapStatus(s: string): RegulationStatus {
  if (/废止|撤回/.test(s)) return "WITHDRAWN";
  if (/征求意见/.test(s)) return "UNDER_CONSULTATION";
  if (/修订/.test(s)) return "REVISED";
  if (/颁布|正式发布/.test(s)) return "FINAL";
  return "UNKNOWN";
}
