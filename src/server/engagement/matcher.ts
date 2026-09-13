import { assertOfficialContent } from "../changes/normalize";
import type {
  Watchlist,
  Regulation,
  ChangeEvent,
} from "../../generated/prisma/client";
export const rank: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
};
export const normalize = (s: string) =>
  s.normalize("NFKC").toLocaleLowerCase("en-US").replace(/\s+/gu, " ").trim();
export function eligibleRegulation(r: Regulation) {
  if (r.is_mock) return false;
  const m = r.source_metadata as Record<string, unknown> | null;
  const metadataOnly =
    r.attachment_urls.length &&
    ((r.regulator === "ICH" &&
      (m?.guideline_code || m?.parent_guideline_code)) ||
      (r.regulator === "CDE" && m?.professional_category) ||
      (r.regulator === "PMDA" && m?.listing_text));
  try {
    assertOfficialContent(
      r.title_original,
      r.content_text ||
        r.official_summary ||
        (metadataOnly ? r.title_original : ""),
    );
    return true;
  } catch {
    return false;
  }
}
export function matchWatchlist(
  w: Watchlist,
  r: Regulation,
  event?: ChangeEvent,
) {
  const reasons: string[] = [];
  if (!w.enabled || !eligibleRegulation(r)) return { matched: false, reasons };
  const fields: [string, string[], string[]][] = [
    ["regulator", w.regulators, [r.regulator]],
    ["region", w.country_or_regions, [r.country_or_region]],
    ["category", w.categories, r.categories],
    ["subcategory", w.subcategories, r.subcategories],
    ["product_type", w.product_types, r.product_types],
    ["development_stage", w.development_stages, r.development_stages],
    ["affected_department", w.affected_departments, r.affected_departments],
    ["document_type", w.document_types, [r.document_type]],
    ["status", w.statuses, [r.status]],
    ["importance", w.importance_levels, [r.importance_level]],
    ["change_type", w.change_types, event?.change_types || ["NEW_DOCUMENT"]],
  ];
  for (const [key, wanted, actual] of fields) {
    if (!wanted.length) continue;
    const values = (actual || []).filter(Boolean).map(normalize);
    const found = wanted.filter((v) => values.includes(normalize(v)));
    if (!found.length)
      return { matched: false, reasons: [...reasons, key + ": no match"] };
    reasons.push(key + ": " + found.join(", "));
  }
  const severity = event?.severity || r.importance_level;
  if (w.minimum_severity && !(rank[severity] >= rank[w.minimum_severity]))
    return { matched: false, reasons: [...reasons, "severity: below minimum"] };
  if (w.minimum_severity) reasons.push("severity >= " + w.minimum_severity);
  if (w.keywords.length) {
    const text = normalize(
      [
        r.title_original,
        r.title_zh,
        r.official_summary,
        r.summary_zh,
        r.content_text,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const found = w.keywords.filter((k) => text.includes(normalize(k)));
    if (!found.length)
      return { matched: false, reasons: [...reasons, "keyword: no match"] };
    reasons.push("keyword: " + found.join(", "));
  }
  return {
    matched: true,
    reasons: reasons.length ? reasons : ["No field restrictions"],
  };
}
export function priority(
  r: Pick<Regulation, "importance_level">,
  e?: Pick<ChangeEvent, "severity" | "change_types">,
) {
  if (
    rank[r.importance_level] >= 2 &&
    e?.change_types.some((t) =>
      [
        "DOCUMENT_WITHDRAWN",
        "DOCUMENT_SUPERSEDED",
        "DRAFT_TO_FINAL",
        "EFFECTIVE_DATE_CHANGED",
      ].includes(t),
    )
  )
    return "CRITICAL" as const;
  if (rank[e?.severity || r.importance_level] >= 2) return "HIGH" as const;
  return e?.severity === "LOW" ? ("LOW" as const) : ("MEDIUM" as const);
}
