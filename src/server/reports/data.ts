import { z } from "zod";
import type { Db } from "../db";
import type { Prisma } from "../../generated/prisma/client";
import { changeRepository } from "../repositories/change-repository";
export const reportTypes = [
  "regulations",
  "changes",
  "versions",
  "comparison",
  "digest",
  "watchlist",
  "summary",
  "sources",
  "notifications",
] as const;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Invalid date",
  );
export const reportQuery = z
  .object({
    type: z.enum(reportTypes).default("regulations"),
    format: z.enum(["json", "csv", "pdf"]).default("json"),
    start: date.optional(),
    end: date.optional(),
    agency: z.enum(["FDA", "EMA", "NMPA", "CDE", "ICH", "PMDA"]).optional(),
    category: z.string().min(1).max(100).optional(),
    product: z.string().min(1).max(100).optional(),
    watchlist: z.string().min(1).max(160).optional(),
    severity: z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional(),
    regulation: z.string().min(1).max(160).optional(),
    change: z.string().min(1).max(160).optional(),
    from: z.string().min(1).max(160).optional(),
    to: z.string().min(1).max(160).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(30),
  })
  .strict()
  .superRefine((q, c) => {
    const supported: Record<string, string[]> = {
      watchlist: ["watchlist", "notifications"],
      change: ["changes"],
      from: ["comparison"],
      to: ["comparison"],
      severity: [
        "regulations",
        "summary",
        "changes",
        "watchlist",
        "notifications",
      ],
      start: [
        "regulations",
        "summary",
        "changes",
        "versions",
        "digest",
        "watchlist",
        "sources",
        "notifications",
      ],
      end: [
        "regulations",
        "summary",
        "changes",
        "versions",
        "digest",
        "watchlist",
        "sources",
        "notifications",
      ],
    };
    for (const [field, types] of Object.entries(supported))
      if (q[field as keyof typeof q] && !types.includes(q.type))
        c.addIssue({
          code: "custom",
          path: [field],
          message: "Filter not supported for this report type",
        });
    if (q.start && q.end && q.start > q.end)
      c.addIssue({
        code: "custom",
        path: ["end"],
        message: "End must follow start",
      });
    if (
      q.type === "comparison" &&
      (!q.regulation || !q.from || !q.to || q.from === q.to)
    )
      c.addIssue({
        code: "custom",
        path: ["from"],
        message: "Select a regulation and two distinct versions",
      });
    if (
      ["digest", "sources"].includes(q.type) &&
      [
        q.category,
        q.product,
        q.watchlist,
        q.severity,
        q.regulation,
        q.change,
        q.from,
        q.to,
      ].some(Boolean)
    )
      c.addIssue({
        code: "custom",
        path: [],
        message: "Unsupported filters for this report type",
      });
    if (q.type === "digest" && q.agency)
      c.addIssue({
        code: "custom",
        path: ["agency"],
        message: "Saved digests retain complete original scope",
      });
  });
export type ReportQuery = z.infer<typeof reportQuery>;
export interface ReportRow {
  id: string;
  regulation_id: string;
  agency: string;
  official_url: string;
  timestamp: string;
  severity: string;
  evidence: string;
  details: Record<string, unknown>;
}
export interface Report {
  type: string;
  generated_at: string;
  parameters: ReportQuery;
  rows: ReportRow[];
  limited: boolean;
  notice: string;
}
const empty = "Not disclosed / Not available";
const value = (v: unknown): unknown =>
  v === null || v === undefined || v === ""
    ? empty
    : v instanceof Date
      ? v.toISOString()
      : v;
const fields = (r: object, keys: string[]) =>
  Object.fromEntries(
    keys.map((k) => [k, value((r as Record<string, unknown>)[k])]),
  );
const row = (
  id: string,
  details: Record<string, unknown>,
  r?: { id: string; regulator: string; official_url: string | null },
  timestamp?: Date | string,
  severity?: string,
  evidence = "Official Fact / BioReg Translation / BioReg System Summary",
): ReportRow => ({
  id,
  regulation_id: r?.id || "",
  agency: r?.regulator || "",
  official_url: r?.official_url || "",
  timestamp:
    timestamp instanceof Date ? timestamp.toISOString() : timestamp || "",
  severity: severity || "",
  evidence,
  details,
});
function notFound(): never {
  throw Object.assign(new Error("NOT_FOUND"), { code: "P2025" });
}
export async function buildReport(db: Db, q: ReportQuery): Promise<Report> {
  const range = {
    ...(q.start ? { gte: new Date(q.start) } : {}),
    ...(q.end ? { lt: new Date(Date.parse(q.end) + 86400000) } : {}),
  };
  const dated = q.start || q.end ? range : undefined;
  const where: Prisma.RegulationWhereInput = {
    is_mock: false,
    ...(q.regulation ? { id: q.regulation } : {}),
    ...(q.agency ? { regulator: q.agency } : {}),
    ...(q.category ? { categories: { has: q.category } } : {}),
    ...(q.product ? { product_types: { has: q.product } } : {}),
  };
  const rows: ReportRow[] = [];
  let limited = false;
  const take = q.limit + 1;
  if (q.type === "comparison") {
    const repo = changeRepository(db);
    const a = await repo.version(q.regulation!, q.from!),
      b = await repo.version(q.regulation!, q.to!);
    const r = await db.regulation.findFirst({ where });
    if (!a || !b || !r) notFound();
    const diff = await repo.compare(r.id, a.id, b.id);
    let unchanged: string[] | string = "Not available for legacy snapshot";
    try {
      const left = JSON.parse(a.content_snapshot),
        right = JSON.parse(b.content_snapshot);
      unchanged = Object.keys(left).filter(
        (k) => JSON.stringify(left[k]) === JSON.stringify(right[k]),
      );
    } catch {}
    rows.push(
      row(
        r.id,
        {
          version_a: a,
          version_b: b,
          comparison: diff,
          unchanged_fields: unchanged,
          unchanged_note:
            "Fields absent from changed_fields are unchanged within captured snapshots; unparsed PDFs are not compared.",
        },
        r,
        undefined,
        undefined,
        "BioReg Version Comparison / BioReg System Summary — not Official Regulatory Interpretation",
      ),
    );
  } else if (q.type === "sources") {
    const sources = await db.source.findMany({
      where: q.agency ? { code: q.agency } : {},
      orderBy: { code: "asc" },
    });
    for (const s of sources) {
      const logs = await db.syncLog.findMany({
        where: { source_id: s.id, is_mock: false, started_at: dated },
        orderBy: [{ started_at: "desc" }, { id: "asc" }],
        take: 10,
      });
      rows.push({
        ...row(
          s.id,
          {
            ...fields(s, [
              "code",
              "name",
              "enabled",
              "last_sync_at",
              "last_success_at",
              "last_failure_at",
            ]),
            current_status: s.enabled ? s.last_status : "DISABLED",
            recent_logs: logs,
          },
          undefined,
          s.last_sync_at || undefined,
          undefined,
          "BioReg System Summary · Source Health",
        ),
        agency: s.code,
      });
    }
  } else if (q.type === "digest") {
    const ds = await db.dailyDigest.findMany({
      where: {
        digest_date: {
          ...(q.start ? { gte: q.start } : {}),
          ...(q.end ? { lte: q.end } : {}),
        },
      },
      orderBy: { digest_date: "desc" },
      take,
    });
    limited = ds.length > q.limit;
    for (const d of ds.slice(0, q.limit)) {
      const grouped = await db.changeEvent.groupBy({
        by: ["severity"],
        where: {
          regulation: { is_mock: false },
          detected_at: { gte: d.window_start, lt: d.window_end },
        },
        _count: { _all: true },
      });
      const severity_counts = Object.fromEntries(
        ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => [
          s,
          grouped.find((g) => g.severity === s)?._count._all || 0,
        ]),
      );
      rows.push(
        row(
          d.id,
          {
            date: d.digest_date,
            timezone: d.timezone,
            window_start: d.window_start,
            window_end: d.window_end,
            summary: d.summary,
            severity_counts_current_saved_events: severity_counts,
            severity_note:
              "Saved HIGH may include CRITICAL; inspect linked ChangeEvents for exact severity.",
          },
          undefined,
          d.generated_at,
          undefined,
          "BioReg System Summary · Daily Digest / Watchlist Match",
        ),
      );
    }
  } else if (q.type === "changes") {
    const es = await db.changeEvent.findMany({
      where: {
        regulation: where,
        id: q.change,
        severity: q.severity,
        detected_at: dated,
      },
      include: {
        regulation: {
          select: {
            id: true,
            regulator: true,
            official_url: true,
            title_original: true,
          },
        },
      },
      orderBy: [{ detected_at: "desc" }, { id: "asc" }],
      take,
    });
    limited = es.length > q.limit;
    for (const e of es.slice(0, q.limit))
      rows.push(
        row(
          e.id,
          {
            ...fields(e, [
              "previous_version_id",
              "current_version_id",
              "change_types",
              "changed_fields",
              "sections",
              "change_summary",
            ]),
            official_title: e.regulation.title_original,
          },
          e.regulation,
          e.detected_at,
          e.severity,
          "BioReg Detected Change · deterministic system result",
        ),
      );
  } else if (q.type === "watchlist") {
    const matches = await db.watchlistMatch.findMany({
      where: {
        regulation: where,
        watchlist_id: q.watchlist,
        detected_at: dated,
        ...(q.severity
          ? {
              OR: [
                { change_event: { severity: q.severity } },
                {
                  change_event_id: null,
                  regulation: { ...where, importance_level: q.severity },
                },
              ],
            }
          : {}),
      },
      include: {
        watchlist: true,
        regulation: {
          select: {
            id: true,
            regulator: true,
            official_url: true,
            title_original: true,
            importance_level: true,
          },
        },
        change_event: true,
      },
      orderBy: [{ detected_at: "desc" }, { id: "asc" }],
      take,
    });
    limited = matches.length > q.limit;
    for (const m of matches.slice(0, q.limit))
      rows.push(
        row(
          m.id,
          {
            watchlist: m.watchlist,
            regulation_title: m.regulation.title_original,
            change_event: m.change_event,
            match_type: m.match_type,
            reasons: m.reasons,
          },
          m.regulation,
          m.detected_at,
          m.change_event?.severity || m.regulation.importance_level,
          "BioReg Watchlist Match · system result",
        ),
      );
  } else if (q.type === "notifications") {
    const ns = await db.notificationEvent.findMany({
      where: {
        watchlist_id: q.watchlist,
        OR: [{ regulation_id: null }, { regulation: { is_mock: false } }],
        severity: q.severity,
        created_at: dated,
        ...(q.agency ? { regulator: q.agency } : {}),
        ...(q.regulation || q.category || q.product
          ? { regulation: where }
          : {}),
      },
      include: {
        regulation: {
          select: { id: true, regulator: true, official_url: true },
        },
      },
      orderBy: [{ created_at: "desc" }, { id: "asc" }],
      take,
    });
    limited = ns.length > q.limit;
    for (const n of ns.slice(0, q.limit))
      rows.push(
        row(
          n.id,
          fields(n, [
            "title",
            "message",
            "notification_type",
            "read_at",
            "delivery_status",
            "watchlist_id",
            "change_event_id",
          ]),
          n.regulation || undefined,
          n.created_at,
          n.severity,
          "BioReg System Summary · Notification",
        ),
      );
  } else if (q.type === "versions") {
    const vs = await db.regulationVersion.findMany({
      where: { regulation: where, detected_at: dated },
      include: {
        regulation: {
          select: { id: true, regulator: true, official_url: true },
        },
      },
      orderBy: [{ detected_at: "desc" }, { id: "asc" }],
      take,
    });
    limited = vs.length > q.limit;
    for (const v of vs.slice(0, q.limit))
      rows.push(
        row(
          v.id,
          fields(v, [
            "version_name",
            "status",
            "publication_date",
            "document_url",
            "pdf_url",
            "content_hash",
            "source_hash",
            "previous_version_id",
            "content_snapshot",
          ]),
          v.regulation,
          v.detected_at,
          undefined,
          "Official Fact · captured snapshot / BioReg Internal Version",
        ),
      );
  } else {
    const rs = await db.regulation.findMany({
      where: {
        ...where,
        publication_date: dated,
        importance_level: q.severity,
      },
      include: {
        versions: { orderBy: { detected_at: "desc" }, take: 20 },
        change_events: { orderBy: { detected_at: "desc" }, take: 20 },
        _count: { select: { versions: true, change_events: true } },
      },
      orderBy: [{ publication_date: "desc" }, { id: "asc" }],
      take,
    });
    limited = rs.length > q.limit;
    for (const r of rs.slice(0, q.limit)) {
      limited ||= r._count.versions > 20 || r._count.change_events > 20;
      rows.push(
        row(
          r.id,
          {
            "Official Regulatory Information": fields(r, [
              "country_or_region",
              "title_original",
              "document_number",
              "document_type",
              "status",
              "publication_date",
              "effective_date",
              "official_url",
              "official_summary",
              "attachment_urls",
              "pdf_url",
            ]),
            "BioReg Translation": fields(r, ["title_zh", "summary_zh"]),
            "BioReg Metadata": fields(r, [
              "categories",
              "product_types",
              "development_stages",
              "importance_level",
              "version",
            ]),
            "Historical Versions": r.versions,
            "BioReg Detected Change": r.change_events,
          },
          r,
          r.publication_date || undefined,
          r.importance_level,
        ),
      );
    }
  }
  if (q.type === "summary") {
    const counts = (key: "agency" | "severity") =>
      Object.fromEntries(
        [...new Set(rows.map((r) => r[key]))].map((k) => [
          k,
          rows.filter((r) => r[key] === k).length,
        ]),
      );
    rows.unshift(
      row(
        "scope-summary",
        {
          scope: "Selected bounded records only; not a database-wide total",
          regulation_count: rows.length,
          by_agency: counts("agency"),
          by_severity: counts("severity"),
          limited,
          interpretation:
            "Descriptive counts only; no legal or AI interpretation",
        },
        undefined,
        undefined,
        undefined,
        "BioReg System Summary",
      ),
    );
  }
  const report: Report = {
    type: q.type,
    generated_at: new Date().toISOString(),
    parameters: q,
    rows,
    limited,
    notice:
      "Official Fact ≠ BioReg Translation ≠ BioReg System Summary ≠ External AI Interpretation. No external AI output included. Dates are UTC unless a saved Digest explicitly states its timezone. Report is derived output; missing fields are not inferred. Results are bounded; narrow filters when limited.",
  };
  if (JSON.stringify(report).length > 350000)
    throw Object.assign(new Error("Report too large; narrow scope"), {
      code: "REPORT_TOO_LARGE",
    });
  return report;
}
