export const documentLabels: Record<string, string> = {
  FINAL_GUIDANCE: "Final Guidance",
  DRAFT_GUIDANCE: "Draft Guidance",
  GUIDELINE: "Guideline",
  REVISED_GUIDELINE: "Revised Guideline",
  QA: "Q&A",
  REFLECTION_PAPER: "Reflection Paper",
  CONCEPT_PAPER: "Concept Paper",
  POSITION_PAPER: "Position Paper",
  RECOMMENDATION: "Recommendation",
  TECHNICAL_GUIDELINE: "Technical Guideline",
  NOTICE: "Notice",
  ANNOUNCEMENT: "Announcement",
  REGULATION: "Regulation",
  REGULATION_AMENDMENT: "Regulation Amendment",
  CONSULTATION_DRAFT: "征求意见稿",
  OTHER: "Other",
};
export const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  FINAL: "Final",
  EFFECTIVE: "Effective",
  REVISED: "Revised",
  SUPERSEDED: "Superseded",
  WITHDRAWN: "Withdrawn",
  UNDER_CONSULTATION: "Under Consultation",
  ARCHIVED: "Archived",
  UNKNOWN: "Unknown",
};
export const importanceLabels: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
export function documentCode(value: string) {
  const aliases: Record<string, string> = {
    指导原则: "GUIDELINE",
    技术指导原则: "TECHNICAL_GUIDELINE",
    公告: "ANNOUNCEMENT",
    通知: "NOTICE",
  };
  return (
    aliases[value] ||
    Object.keys(documentLabels).find(
      (k) => k === value || documentLabels[k] === value,
    ) ||
    value
  );
}
export function statusCode(value: string) {
  return (
    Object.keys(statusLabels).find(
      (k) => k === value || statusLabels[k] === value,
    ) || value
  );
}
