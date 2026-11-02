import type { Candidate } from "./types";
export function rotateCandidates(
  listed: Candidate[],
  rechecks: Candidate[],
  limit: number,
  cursor: number,
) {
  const unique = [...new Map(listed.map((c) => [c.url, c])).values()];
  const candidates = [
    ...new Map(rechecks.map((c) => [c.url, c])).values(),
  ].slice(0, Math.max(0, limit - 1));
  const seen = new Set(candidates.map((c) => c.url));
  let scanned = 0;
  const start = unique.length ? cursor % unique.length : 0;
  while (scanned < unique.length && candidates.length < limit) {
    const c = unique[(start + scanned) % unique.length];
    scanned++;
    if (!seen.has(c.url)) {
      candidates.push(c);
      seen.add(c.url);
    }
  }
  return {
    candidates,
    nextCursor: unique.length ? (start + scanned) % unique.length : cursor,
  };
}
