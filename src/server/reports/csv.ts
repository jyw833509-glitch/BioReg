import type { Report } from "./data";
export const columns = [
  "id",
  "regulation_id",
  "agency",
  "official_url",
  "timestamp",
  "severity",
  "evidence",
  "details",
] as const;
export function csvCell(v: unknown) {
  let s = typeof v === "string" ? v : JSON.stringify(v);
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function renderCSV(report: Report) {
  return (
    "\uFEFF" +
    [
      columns.join(","),
      ...report.rows.map((r) => columns.map((k) => csvCell(r[k])).join(",")),
    ].join("\r\n") +
    "\r\n"
  );
}
