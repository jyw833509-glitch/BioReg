import type { Db } from "../db";
import type {
  Regulation,
  ChangeEvent,
  Watchlist,
} from "../../generated/prisma/client";
import { eventRecord } from "./snapshot";
import { matchWatchlist, priority } from "./matcher";
import { deliver } from "./notifications";
import { generateDueDigest } from "./digest";
// Persisted source checkpoint + notification are committed atomically. Baseline is silent.
export async function sourceHealthNotifications(db: Db) {
  for (const source of await db.source.findMany()) {
    await db.$transaction(async (tx) => {
      const current = source.enabled ? source.last_status : "DISABLED";
      await tx.sourceHealthCheckpoint.upsert({
        where: { source_id: source.id },
        create: { source_id: source.id, status: current },
        update: {},
      });
      const previous = await tx.sourceHealthCheckpoint.findUniqueOrThrow({
        where: { source_id: source.id },
      });
      if (previous.status === current) return;
      const updated = await tx.sourceHealthCheckpoint.updateMany({
        where: { source_id: source.id, revision: previous.revision },
        data: { status: current, revision: { increment: 1 } },
      });
      if (!updated.count) return;
      await tx.notificationEvent.create({
        data: {
          dedupe_key: "health:" + source.id + ":" + (previous.revision + 1),
          notification_type: "SOURCE_HEALTH",
          title: source.code + " Source Health",
          regulator: source.code,
          message: previous.status + " → " + current,
          severity:
            current === "UNAVAILABLE"
              ? "HIGH"
              : current === "DEGRADED"
                ? "MEDIUM"
                : "LOW",
        },
      });
    });
  }
}
async function persistMatch(
  db: Db,
  w: Watchlist,
  r: Regulation,
  event?: ChangeEvent,
) {
  const match = matchWatchlist(w, r, event);
  if (!match.matched) return;
  const type = event ? "CHANGE_EVENT" : "NEW_REGULATION";
  const key = [w.id, r.id, event?.id || "new", type].join(":");
  await db.$transaction(async (tx) => {
    await tx.watchlistMatch.upsert({
      where: { dedupe_key: key },
      create: {
        watchlist_id: w.id,
        regulation_id: r.id,
        change_event_id: event?.id,
        detected_at: event?.detected_at || r.first_detected_at,
        match_type: type,
        reasons: match.reasons,
        dedupe_key: key,
      },
      update: {},
    });
    await tx.notificationEvent.upsert({
      where: { dedupe_key: key },
      create: {
        dedupe_key: key,
        watchlist_id: w.id,
        regulation_id: r.id,
        change_event_id: event?.id,
        notification_type: type,
        title: r.title_original,
        regulator: r.regulator,
        change_types: event?.change_types || ["NEW_DOCUMENT"],
        message:
          "BioReg Watchlist Match · " +
          w.name +
          " · " +
          match.reasons.join("; ") +
          (event ? " · " + event.change_summary : ""),
        severity: priority(r, event),
      },
      update: {},
    });
  });
}
export async function matchSavedRecords(db: Db, watchlistId?: string) {
  let failures = 0;
  for (const w of await db.watchlist.findMany({
    where: { enabled: true, ...(watchlistId ? { id: watchlistId } : {}) },
  })) {
    try {
      // Re-scan since creation, with database dedupe. Retries recover partially completed runs.
      let cursor: string | undefined;
      for (;;) {
        const rows = await db.regulation.findMany({
          where: { is_mock: false, first_detected_at: { gte: w.created_at } },
          include: {
            versions: {
              orderBy: { detected_at: "asc" },
              take: 1,
              select: { content_snapshot: true },
            },
          },
          orderBy: { id: "asc" },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const r of rows)
          await persistMatch(
            db,
            w,
            r.versions[0] ? eventRecord(r, r.versions[0].content_snapshot) : r,
          );
        if (rows.length < 100) break;
        cursor = rows.at(-1)!.id;
      }
      cursor = undefined;
      for (;;) {
        const rows: (ChangeEvent & {
          regulation: Regulation;
          current_version: { content_snapshot: string };
        })[] = await db.changeEvent.findMany({
          where: {
            detected_at: { gte: w.created_at },
            regulation: { is_mock: false },
            NOT: { change_types: { has: "NEW_DOCUMENT" } },
          },
          include: {
            regulation: true,
            current_version: { select: { content_snapshot: true } },
          },
          orderBy: { id: "asc" },
          take: 100,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        for (const e of rows)
          await persistMatch(
            db,
            w,
            eventRecord(e.regulation, e.current_version.content_snapshot),
            e,
          );
        if (rows.length < 100) break;
        cursor = rows.at(-1)!.id;
      }
    } catch {
      failures++;
      console.error("BioReg engagement watchlist failed", {
        watchlist_id: w.id,
      });
    }
  }
  if (failures) throw new Error("One or more watchlists failed");
}
export async function engagementAfterSync(db: Db) {
  const outcomes: Record<string, string> = {};
  const stages: [string, () => Promise<unknown>][] = [
    ["matches", () => matchSavedRecords(db)],
    ["source_health", () => sourceHealthNotifications(db)],
    [
      "delivery",
      async () => {
        for (const event of await db.notificationEvent.findMany({
          where: {
            delivery_status: { in: ["PENDING", "FAILED"] },
            channel: "IN_APP",
          },
          take: 500,
          orderBy: { created_at: "asc" },
        })) {
          try {
            await deliver(db, event);
          } catch {
            console.error("BioReg delivery persistence failed", {
              id: event.id,
            });
          }
        }
      },
    ],
    ["digest", () => generateDueDigest(db)],
  ];
  for (const [name, run] of stages) {
    try {
      await run();
      outcomes[name] = "SUCCESS";
    } catch {
      outcomes[name] = "FAILED";
      console.error("BioReg engagement stage failed", { stage: name });
    }
  }
  return outcomes;
}
export async function watchlistMatches(db: Db, id: string) {
  const w = await db.watchlist.findUniqueOrThrow({ where: { id } });
  const recent = await db.watchlistMatch.findMany({
    where: { watchlist_id: id },
    orderBy: { detected_at: "desc" },
    take: 50,
  });
  const matches = [];
  let cursor: string | undefined;
  // On-demand preview is read-only; creating a rule never floods historical notifications.
  for (;;) {
    const rows = await db.regulation.findMany({
      where: { is_mock: false },
      orderBy: { id: "asc" },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const r of rows) {
      const result = matchWatchlist(w, r);
      if (result.matched)
        matches.push({
          id: r.id,
          title: r.title_original,
          reasons: result.reasons,
        });
    }
    if (rows.length < 100) break;
    cursor = rows.at(-1)!.id;
  }
  const updated = [];
  for (const e of await db.changeEvent.findMany({
    where: {
      regulation: { is_mock: false },
      NOT: { change_types: { has: "NEW_DOCUMENT" } },
    },
    include: { regulation: true, current_version: true },
    orderBy: { detected_at: "desc" },
    take: 100,
  })) {
    const result = matchWatchlist(
      w,
      eventRecord(e.regulation, e.current_version.content_snapshot),
      e,
    );
    if (result.matched)
      updated.push({
        id: e.regulation_id,
        event_id: e.id,
        title: e.regulation.title_original,
        reasons: result.reasons,
      });
  }
  return { recent, matches, updated };
}
