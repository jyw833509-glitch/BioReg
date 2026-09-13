import { eligibleRegulation } from "./matcher";
import { z } from "zod";
import type { Db } from "../db";
import type { Prisma } from "../../generated/prisma/client";
import { dayWindow, dueDate, localDate } from "./time";
export const settingsSchema = z
  .object({
    digest_enabled: z.boolean(),
    digest_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    timezone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Invalid IANA timezone"),
  })
  .strict();
export const digestSettings = (db: Db) =>
  db.digestSettings.upsert({
    where: { id: "workspace" },
    create: { id: "workspace" },
    update: {},
  });
export async function digestSummary(db: Db, date: string, timezone: string) {
  const { start, end } = dayWindow(date, timezone);
  const range = { gte: start, lt: end };
  const regulations = (
    await db.regulation.findMany({
      where: { is_mock: false, first_detected_at: range },
      orderBy: { first_detected_at: "desc" },
    })
  ).filter(eligibleRegulation);
  const allEvents = (
    await db.changeEvent.findMany({
      where: {
        detected_at: range,
        regulation: { is_mock: false },
      },
      include: { regulation: true },
      orderBy: { detected_at: "desc" },
    })
  ).filter((e) => eligibleRegulation(e.regulation));
  const events = allEvents.filter(
    (e) => !e.change_types.includes("NEW_DOCUMENT"),
  );
  const matches = await db.watchlistMatch.findMany({
    where: { detected_at: range, regulation: { is_mock: false } },
    include: { watchlist: { select: { name: true } } },
  });
  const sources = await db.source.findMany({
    select: {
      code: true,
      last_status: true,
      enabled: true,
      last_sync_at: true,
    },
  });
  const ids = [
    ...new Set([
      ...regulations.map((r) => r.id),
      ...events.map((e) => e.regulation_id),
    ]),
  ];
  const records = await db.regulation.findMany({
    where: { id: { in: ids }, is_mock: false },
  });
  const counts = (values: string[]) =>
    values.reduce<Record<string, number>>(
      (a, v) => ((a[v] = (a[v] || 0) + 1), a),
      {},
    );
  const item = (r: (typeof regulations)[number]) => ({
    id: r.id,
    title: r.title_original,
    regulator: r.regulator,
    official_url: r.official_url,
    detail_url: "/regulations/" + r.id,
    importance: r.importance_level,
  });
  return {
    date,
    timezone,
    window_start: start.toISOString(),
    window_end: end.toISOString(),
    new_count: regulations.length,
    updated_count: new Set(events.map((e) => e.regulation_id)).size,
    severity_counts: {
      HIGH: allEvents.filter(
        (e) => e.severity === "HIGH" || e.severity === "CRITICAL",
      ).length,
      MEDIUM: allEvents.filter((e) => e.severity === "MEDIUM").length,
      LOW: allEvents.filter((e) => e.severity === "LOW").length,
    },
    by_regulator: counts(records.map((r) => r.regulator)),
    by_topic: counts(records.flatMap((r) => r.categories)),
    watchlist_counts: counts(matches.map((m) => m.watchlist_id)),
    watchlist_matches: matches.map((m) => ({
      id: m.id,
      watchlist_id: m.watchlist_id,
      name: m.watchlist.name,
      regulation_id: m.regulation_id,
      type: m.match_type,
      reasons: m.reasons,
    })),
    new_regulations: regulations.map(item),
    updated_regulations: events.map((e) => ({
      ...item(e.regulation),
      event_id: e.id,
      severity: e.severity,
      change_types: e.change_types,
      summary: e.change_summary,
    })),
    high_priority: events
      .filter((e) => ["HIGH", "CRITICAL"].includes(e.severity))
      .map((e) => ({ ...item(e.regulation), summary: e.change_summary })),
    source_health: sources.map((s) => ({
      code: s.code,
      status: s.enabled ? s.last_status : "DISABLED",
      last_sync_at: s.last_sync_at?.toISOString() || null,
    })),
    evidence_label:
      "BioReg Digest Summary — based only on saved official facts and BioReg Change Detection",
  };
}
export async function generateDigest(db: Db, date: string) {
  const settings = await digestSettings(db);
  const summary = await digestSummary(db, date, settings.timezone);
  const data = {
    timezone: settings.timezone,
    window_start: new Date(summary.window_start),
    window_end: new Date(summary.window_end),
    generated_at: new Date(),
    summary: summary as unknown as Prisma.InputJsonObject,
  };
  return db.dailyDigest.upsert({
    where: { digest_date: date },
    create: { digest_date: date, ...data },
    update: data,
  });
}
export async function generateDueDigest(db: Db, now = new Date()) {
  const settings = await digestSettings(db);
  if (!settings.digest_enabled) return null;
  const date = dueDate(now, settings.timezone, settings.digest_time);
  if (!date) return null;
  const existing = await db.dailyDigest.findUnique({
    where: { digest_date: date },
  });
  return existing || generateDigest(db, date);
}
export async function todaySummary(db: Db) {
  const s = await digestSettings(db);
  return digestSummary(db, localDate(new Date(), s.timezone), s.timezone);
}
export function digestRepository(db: Db) {
  return {
    list: () =>
      db.dailyDigest.findMany({ orderBy: { digest_date: "desc" }, take: 90 }),
    get: (date: string) =>
      db.dailyDigest.findUnique({ where: { digest_date: date } }),
  };
}
