import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import {
  pmdaCoverCandidates,
  nmpaAnnouncementCandidates,
  type PdfEvidence,
} from "../src/server/enrichment/official-fields";
type Row = {
  id: string;
  regulator: string;
  title_original: string;
  pdf_url?: string;
  official_url?: string;
  status?: string;
  document_number?: string;
  publication_date?: string;
  source_metadata?: Record<string, unknown>;
};
const rows = JSON.parse(
  readFileSync(process.argv[2] || ".data/enrichment-baseline.json", "utf8"),
) as Row[];
const folder = ".data/official-field-evidence";
const evidence = new Map(
  readdirSync(folder)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const e = JSON.parse(readFileSync(`${folder}/${f}`, "utf8"));
      return [e.url, e];
    }),
);
const output = rows.map((row) => {
  const e = evidence.get(row.pdf_url);
  let candidates =
    row.regulator === "PMDA" &&
    e?.kind === "pdf" &&
    e.outcome === "captured_for_review"
      ? pmdaCoverCandidates(e as PdfEvidence)
      : [];
  const html = evidence.get(row.official_url);
  if (row.regulator === "NMPA" && html?.outcome === "captured_for_review")
    candidates = nmpaAnnouncementCandidates(row.title_original, html);
  return {
    id: row.id,
    title_original: row.title_original,
    regulator: row.regulator,
    candidates: candidates.filter((c) =>
      c.field === "official_version"
        ? !row.source_metadata?.revision
        : c.field === "status"
          ? row.status === "Unknown" || row.status === "UNKNOWN"
          : !row[c.field as keyof Row],
    ),
    conflicts: candidates.filter(
      (c) =>
        c.field !== "official_version" &&
        row[c.field as keyof Row] &&
        row[c.field as keyof Row] !== c.value,
    ),
  };
});
writeFileSync(
  ".data/official-field-candidates.json",
  JSON.stringify(output, null, 2),
);
console.log(
  JSON.stringify({
    records: output.length,
    candidates: output.flatMap((r) => r.candidates).length,
    conflicts: output.flatMap((r) => r.conflicts).length,
    databaseWrites: 0,
  }),
);
