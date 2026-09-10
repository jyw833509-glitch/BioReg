import type {
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
export function mapType(s: string): DocumentType {
  if (/公告|^(?:NMPA )?Announcement/i.test(s)) return "ANNOUNCEMENT";
  if (/通知/.test(s)) return "NOTICE";
  if (/技术/.test(s)) return "TECHNICAL_GUIDELINE";
  if (/法规|规章/.test(s)) return "REGULATION";
  return "OTHER";
}
export function mapStatus(s: string): RegulationStatus {
  if (/废止|撤回/.test(s)) return "WITHDRAWN";
  if (/已生效|^有效$/.test(s)) return "EFFECTIVE";
  if (/征求意见/.test(s)) return "UNDER_CONSULTATION";
  if (/正式发布|颁布/.test(s)) return "FINAL";
  return "UNKNOWN";
}
