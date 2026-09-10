import { createHash } from "node:crypto";
import { clean } from "./text";
export function parseDate(raw: string, warnings: string[] = []): Date | null {
  if (!raw) {
    warnings.push("Missing official date");
    return null;
  }
  let year: number, month: number, day: number;
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) [, year, month, day] = m.map(Number);
  else if ((m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {
    month = +m[1];
    day = +m[2];
    year = +m[3];
  } else if ((m = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/))) {
    month =
      [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ].indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
    day = +m[2];
    year = +m[3];
  } else {
    warnings.push(`Incomplete or unrecognized official date: ${raw}`);
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !month ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    warnings.push(`Invalid official date: ${raw}`);
    return null;
  }
  return date;
}
export function contentHash(value: unknown): string {
  function stable(v: unknown): unknown {
    if (typeof v === "string") return clean(v);
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, stable(x)]),
      );
    return v;
  }
  return createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}
