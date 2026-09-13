import type { Regulation } from "../../generated/prisma/client";
// Replayed changes match their immutable captured facts, not a later title/status.
export function eventRecord(current: Regulation, snapshot: string): Regulation {
  try {
    const s = JSON.parse(snapshot);
    if (!s || typeof s !== "object") return current;
    const r = { ...current };
    for (const key of [
      "title_original",
      "title_zh",
      "content_text",
      "official_summary",
      "summary_zh",
      "status",
      "document_type",
      "country_or_region",
      "importance_level",
    ] as const)
      if (typeof s[key] === "string") Object.assign(r, { [key]: s[key] });
    for (const key of [
      "categories",
      "subcategories",
      "product_types",
      "development_stages",
      "affected_departments",
      "attachment_urls",
    ] as const)
      if (
        Array.isArray(s[key]) &&
        s[key].every((v: unknown) => typeof v === "string")
      )
        r[key] = s[key];
    return r;
  } catch {
    return current;
  }
}
