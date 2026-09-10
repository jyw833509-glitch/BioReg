import type { Regulation } from "./types";
export function dailyRecords(records: Regulation[], date: string) {
  return records.filter(
    (r) =>
      r.first_detected_at.slice(0, 10) === date ||
      r.versions.some((v) => v.detected_at.slice(0, 10) === date),
  );
}
export function weekStart(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function agencyGradient(records: Regulation[], agencies: string[]) {
  if (!records.length) return "#e8edf5";
  let sum = 0;
  const colors = ["#5686e8", "#8c8edc", "#dfa189", "#e3bc82", "#81b9a6"];
  return `conic-gradient(${agencies
    .map((agency, i) => {
      const start = sum;
      sum +=
        (records.filter((r) => r.regulator === agency).length /
          records.length) *
        100;
      return `${colors[i % colors.length]} ${start}% ${sum}%`;
    })
    .join(",")})`;
}
