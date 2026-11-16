import { date } from "../connectors/shared/normalizer";
import { titleHash } from "./title-quality";

export function emaTitleVersion(
  title: string,
  url: string,
  metadata: Record<string, unknown>,
): FieldCandidate[] {
  if (
    metadata.metadata_verified !== true ||
    metadata.capture_scope !== "official_guideline_metadata" ||
    new URL(url).hostname !== "www.ema.europa.eu" ||
    !new URL(url).pathname.startsWith("/en/scientific-guidelines/")
  )
    return [];
  const match = title.match(
    /(?:\bRevision\s+\d+(?:\.\d+)?\b|\bRev\.\s*\d+(?:\.\d+)?\b|\b[QSEM]\d+[A-Z]?\(R\d+\))/i,
  );
  if (!match) return [];
  return [
    {
      field: "official_version",
      value: match[0],
      quote: title,
      source_url: url,
      content_sha256: titleHash(title),
      page: 0,
      basis: "previously_verified_official_title_sha256",
    },
  ];
}

export interface PdfEvidence {
  url: string;
  content_sha256: string;
  inspected_pages: { page: number; text: string }[];
}
export interface FieldCandidate {
  field:
    | "document_number"
    | "publication_date"
    | "effective_date"
    | "status"
    | "official_version";
  value: string;
  quote: string;
  source_url: string;
  content_sha256: string;
  page: number;
  basis: string;
}

export function nmpaAnnouncementCandidates(
  title: string,
  evidence: { url: string; content_sha256: string; text: string },
): FieldCandidate[] {
  if (
    new URL(evidence.url).hostname !== "english.nmpa.gov.cn" ||
    !/^(?:NMPA )?Announcement\b/i.test(title)
  )
    return [];
  const text = evidence.text.replace(/\s+/g, " ");
  const result: FieldCandidate[] = [];
  const add = (
    field: FieldCandidate["field"],
    value: string,
    quote: string,
    basis: string,
  ) =>
    result.push({
      field,
      value,
      quote,
      basis,
      source_url: evidence.url,
      content_sha256: evidence.content_sha256,
      page: 0,
    });
  const number =
    title.match(/\(No\.\s*(\d+),\s*(\d{4})\)/i) ||
    title.match(/\(\[(\d{4})\]\s*No\.\s*(\d+)\)/i);
  if (number) {
    const bracketYear = title.includes("([");
    add(
      "document_number",
      `${bracketYear ? number[1] : number[2]}年第${bracketYear ? number[2] : number[1]}号`,
      number[0],
      "announcement_title",
    );
  }
  // A signature date is an issuance date, not necessarily the public release date.
  // Do not resolve "effective on publication" against a signature or web update.
  const effective = text.match(
    /shall come into force as of ((?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4})/i,
  );
  if (effective) {
    const value = date(effective[1], "NMPA", [])?.toISOString().slice(0, 10);
    if (value)
      add("effective_date", value, effective[0], "explicit_effective_clause");
  }
  if (
    /It is hereby announced\.|(?:is|are) hereby (?:promulgated|announced)/i.test(
      text,
    )
  )
    add(
      "status",
      "FINAL",
      text.match(
        /It is hereby announced\.|(?:is|are) hereby (?:promulgated|announced)/i,
      )![0],
      "issued_announcement_not_draft",
    );
  return result;
}
export function japaneseDate(raw: string): string | null {
  const m = raw
    .normalize("NFKC")
    .replace(/\s/g, "")
    .match(/^(令和|平成)(元|\d+)年(\d+)月(\d+)日$/);
  if (!m) return null;
  const year =
    (m[1] === "令和" ? 2018 : 1988) + (m[2] === "元" ? 1 : Number(m[2]));
  const value = `${year}-${m[3].padStart(2, "0")}-${m[4].padStart(2, "0")}`;
  return date(value, "PMDA", [])?.toISOString().slice(0, 10) || null;
}

/** Only a document's own cover/header is eligible. References in body text are not metadata. */
export function pmdaCoverCandidates(evidence: PdfEvidence): FieldCandidate[] {
  if (new URL(evidence.url).hostname !== "www.pmda.go.jp") return [];
  const page = evidence.inspected_pages.find((p) => p.page === 1);
  if (!page) return [];
  const text = page.text.normalize("NFKC");
  const header = text.split(/\bTo\s*:|各都道府県/i)[0].slice(0, 1000);
  const lines = header
    .split(/\r?\n/)
    .slice(0, 25)
    .map((s) => s.trim());
  const compactHeader = lines.map((s) => s.replace(/\s/g, "")).join("\n");
  const candidates: FieldCandidate[] = [];
  const add = (
    field: FieldCandidate["field"],
    value: string,
    quote: string,
    basis: string,
  ) => {
    candidates.push({
      field,
      value,
      quote,
      source_url: evidence.url,
      content_sha256: evidence.content_sha256,
      page: 1,
      basis,
    });
  };
  const englishNumbers = [
    ...header.matchAll(
      /^[ \t]*[A-Z]{2,}(?:\/[A-Z]{2,})* Notification No\.[ \t]*\d+(?:-\d+)?[ \t]*$/gm,
    ),
  ].map((m) => m[0]);
  const japaneseNumbers = [
    ...compactHeader.matchAll(
      /^(?:医薬|薬生|薬食)[\u4e00-\u9fff]{0,10}発\d{3,6}第\d+号$/gm,
    ),
  ].map((m) => m[0]);
  const numbers = englishNumbers.length ? englishNumbers : japaneseNumbers;
  if (numbers.length)
    add(
      "document_number",
      numbers.join("; "),
      numbers.join("; "),
      "notification_header",
    );
  const japanese = compactHeader.match(
    /^(?:令和|平成)(?:元|\d+)年\d+月\d+日$/m,
  );
  // '...日版' is a dated edition, not proof of a publication date.
  if (japanese && !compactHeader.includes(japanese[0] + "版")) {
    const value = japaneseDate(japanese[0]);
    if (value)
      add("publication_date", value, japanese[0], "notification_issuance_date");
  } else if (!japanese) {
    const english = header.match(
      /^[ \t]*(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}[ \t]*$/m,
    );
    if (english) {
      const value = date(english[0], "PMDA", [])?.toISOString().slice(0, 10);
      if (value)
        add("publication_date", value, english[0], "document_cover_date");
    }
  }
  const edition = compactHeader.match(
    /^(?:令和|平成)(?:元|\d+)年\d+月\d+日版$/m,
  );
  if (edition)
    add("official_version", edition[0], edition[0], "explicit_dated_edition");
  // Deliberately do not convert cited law dates or an application-scoped clause
  // into a global effective date. Those clauses require record-specific review.
  return candidates;
}
