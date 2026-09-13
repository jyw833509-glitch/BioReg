import {
  contentFingerprint,
  hash,
  normalizedText,
  normalizedUrl,
} from "./normalize";
export const CHANGE_TYPES = [
  "NEW_DOCUMENT",
  "METADATA_CHANGED",
  "TITLE_CHANGED",
  "STATUS_CHANGED",
  "DRAFT_TO_FINAL",
  "FINAL_TO_REVISED",
  "PUBLICATION_DATE_CHANGED",
  "EFFECTIVE_DATE_CHANGED",
  "PDF_CHANGED",
  "ATTACHMENT_CHANGED",
  "CONTENT_CHANGED",
  "SECTION_ADDED",
  "SECTION_REMOVED",
  "SECTION_MODIFIED",
  "DOCUMENT_WITHDRAWN",
  "DOCUMENT_SUPERSEDED",
  "UNKNOWN_CHANGE",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];
type Value = string | string[];
export type Snapshot = Record<string, Value>;
export interface FieldChange {
  field: string;
  old_value: Value;
  new_value: Value;
}
export interface SectionChange {
  section: string;
  kind: "Added" | "Removed" | "Modified";
  old_value: string;
  new_value: string;
}
export interface Detection {
  change_types: ChangeType[];
  changed_fields: FieldChange[];
  sections: SectionChange[];
  change_summary: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
}
const fields = [
  "title_original",
  "document_number",
  "document_type",
  "status",
  "publication_date",
  "effective_date",
  "updated_date",
  "official_url",
  "pdf_url",
  "attachment_urls",
  "issuing_offices",
  "official_topics",
  "docket_number",
  "official_summary",
  "content_text",
];
export function snapshot(input: object): Snapshot {
  const r = input as Record<string, unknown>;
  const out: Snapshot = {};
  for (const key of fields) {
    const v =
      r[key] ??
      (["attachment_urls", "issuing_offices", "official_topics"].includes(key)
        ? []
        : "");
    out[key] = Array.isArray(v)
      ? [
          ...new Set(
            v.map((x) =>
              key === "attachment_urls" ? normalizedUrl(x) : normalizedText(x),
            ),
          ),
        ].sort()
      : v instanceof Date
        ? v.toISOString().slice(0, 10)
        : key.endsWith("_date") &&
            typeof v === "string" &&
            /^\d{4}-\d{2}-\d{2}/.test(v)
          ? v.slice(0, 10)
          : key.endsWith("_url")
            ? normalizedUrl(v)
            : normalizedText(v);
  }
  // File hashes are trusted only when an adapter explicitly supplies a downloaded-file hash.
  const metadata = r.source_metadata as Record<string, unknown> | undefined;
  out.file_content_hash =
    typeof metadata?.file_content_hash === "string"
      ? metadata.file_content_hash
      : "";
  return out;
}
export function fingerprints(input: object) {
  const s = snapshot(input);
  return {
    content_hash: contentFingerprint(s.content_text),
    source_hash: hash(
      JSON.stringify({
        ...s,
        content_text: contentFingerprint(s.content_text),
        official_summary: contentFingerprint(s.official_summary),
      }),
    ),
  };
}
function paragraphs(text: string) {
  const p = normalizedText(text).split("\n\n").filter(Boolean);
  return p.length > 400 ? [...p.slice(0, 399), p.slice(399).join("\n\n")] : p;
}
export function sectionDiff(oldText: string, newText: string): SectionChange[] {
  if (contentFingerprint(oldText) === contentFingerprint(newText)) return [];
  const a = paragraphs(oldText),
    b = paragraphs(newText);
  const dp = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] =
        a[i] === b[j]
          ? 1 + dp[i + 1][j + 1]
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const result: SectionChange[] = [];
  let i = 0,
    j = 0,
    removed: string[] = [],
    added: string[] = [];
  const flush = () => {
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      const old = removed[k] || "",
        next = added[k] || "";
      result.push({
        section: (next || old).split(/[.!?。]/)[0].slice(0, 100) || "Paragraph",
        kind: old && next ? "Modified" : old ? "Removed" : "Added",
        old_value: old,
        new_value: next,
      });
    }
    removed = [];
    added = [];
  };
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j < b.length && (i === a.length || dp[i][j + 1] > dp[i + 1][j]))
      added.push(b[j++]);
    else removed.push(a[i++]);
  }
  flush();
  return result;
}
export function detectChange(
  previous: object | null,
  current: object,
): Detection {
  const next = snapshot(current);
  if (!previous)
    return {
      change_types: ["NEW_DOCUMENT"],
      changed_fields: [],
      sections: [],
      change_summary: "New official document discovered by BioReg.",
      severity: "LOW",
    };
  const old = snapshot(previous);
  const changed_fields: FieldChange[] = [];
  for (const field of Object.keys(next)) {
    const equal =
      field === "content_text" || field === "official_summary"
        ? contentFingerprint(old[field]) === contentFingerprint(next[field])
        : JSON.stringify(old[field]) === JSON.stringify(next[field]);
    if (!equal)
      changed_fields.push({
        field,
        old_value: old[field],
        new_value: next[field],
      });
  }
  const types = new Set<ChangeType>();
  const mapping: Record<string, ChangeType> = {
    title_original: "TITLE_CHANGED",
    status: "STATUS_CHANGED",
    publication_date: "PUBLICATION_DATE_CHANGED",
    effective_date: "EFFECTIVE_DATE_CHANGED",
    pdf_url: "PDF_CHANGED",
    attachment_urls: "ATTACHMENT_CHANGED",
    content_text: "CONTENT_CHANGED",
    file_content_hash: "CONTENT_CHANGED",
  };
  for (const f of changed_fields)
    types.add(mapping[f.field] || "METADATA_CHANGED");
  if (old.status !== next.status) {
    if (
      ["DRAFT", "UNDER_CONSULTATION"].includes(String(old.status)) &&
      ["FINAL", "EFFECTIVE"].includes(String(next.status))
    )
      types.add("DRAFT_TO_FINAL");
    if (
      ["FINAL", "EFFECTIVE"].includes(String(old.status)) &&
      next.status === "REVISED"
    )
      types.add("FINAL_TO_REVISED");
    if (next.status === "WITHDRAWN") types.add("DOCUMENT_WITHDRAWN");
    if (next.status === "SUPERSEDED") types.add("DOCUMENT_SUPERSEDED");
  }
  const sections = sectionDiff(
    String(old.content_text),
    String(next.content_text),
  );
  for (const s of sections)
    types.add(
      s.kind === "Added"
        ? "SECTION_ADDED"
        : s.kind === "Removed"
          ? "SECTION_REMOVED"
          : "SECTION_MODIFIED",
    );
  const high = [
    "DRAFT_TO_FINAL",
    "FINAL_TO_REVISED",
    "DOCUMENT_WITHDRAWN",
    "DOCUMENT_SUPERSEDED",
    "EFFECTIVE_DATE_CHANGED",
  ];
  const severity = high.some((t) => types.has(t as ChangeType))
    ? "HIGH"
    : [
          "CONTENT_CHANGED",
          "SECTION_ADDED",
          "SECTION_REMOVED",
          "SECTION_MODIFIED",
          "PDF_CHANGED",
          "ATTACHMENT_CHANGED",
        ].some((t) => types.has(t as ChangeType))
      ? "MEDIUM"
      : "LOW";
  const descriptions = changed_fields
    .filter((f) => f.field !== "content_text")
    .map(
      (f) =>
        `${f.field} changed from ${JSON.stringify(f.old_value)} to ${JSON.stringify(f.new_value)}.`,
    );
  descriptions.push(
    ...sections.map(
      (s) => `Section/paragraph “${s.section}” was ${s.kind.toLowerCase()}.`,
    ),
  );
  return {
    change_types: [...types],
    changed_fields,
    sections,
    change_summary:
      descriptions.join(" ") ||
      (types.size ? "Official content hash changed." : ""),
    severity,
  };
}
