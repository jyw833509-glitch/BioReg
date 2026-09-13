import { changeRepository } from "./repositories/change-repository";
import { sequential } from "./sequential";
import { db } from "./db";
import { regulationRepository } from "./repositories/regulation-repository";
import { getDashboard } from "./repositories/dashboard-repository";
import { sourceRepository } from "./repositories/source-repository";
import { syncLogRepository } from "./repositories/sync-log-repository";
import { watchlistRepository } from "./repositories/watchlist-repository";
import type { Query } from "./validation";
import type { LogView, SourceView, WatchlistView } from "../lib/view-types";
export async function getPageData(page: string, query: Query, id?: string) {
  const client = db();
  const repo = regulationRepository(client);
  const [dashboard, sources, logs, watchlists, record, result] =
    await sequential([
      () => getDashboard(client),
      () => sourceRepository(client).list(),
      () =>
        ["settings", "agencies"].includes(page)
          ? syncLogRepository(client).list()
          : Promise.resolve([]),
      () =>
        ["watchlist", "settings"].includes(page)
          ? watchlistRepository(client).list()
          : Promise.resolve([]),
      () => (id ? repo.getById(id) : Promise.resolve(null)),
      () =>
        id
          ? Promise.resolve({
              data: [],
              pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
            })
          : page === "today"
            ? repo.getToday(query)
            : page === "updates"
              ? repo.getUpdated(query)
              : repo.list(query),
    ]);
  return {
    dashboard,
    changeEvents:
      page === "updates" || id ? await changeRepository(client).list(id) : [],
    sources: sources.map((s) => ({
      ...s,
      last_sync_at: s.last_sync_at?.toISOString() || null,
      last_success_at: s.last_success_at?.toISOString() || null,
      last_failure_at: s.last_failure_at?.toISOString() || null,
      health: s.enabled ? s.last_status : "DISABLED",
      official_count: s._count.regulations,
      latest_regulation: s.regulations[0] || null,
      sync_status: s.sync_logs[0]?.status || "NOT_CONNECTED",
      sync_error: s.sync_logs[0]?.error_message || null,
    })) as SourceView[],
    logs: logs.map((l) => ({
      ...l,
      source: l.source.code,
      started_at: l.started_at.toISOString(),
      finished_at: l.finished_at?.toISOString() || null,
    })) as LogView[],
    watchlists: watchlists.map((w) => ({ ...w })) as WatchlistView[],
    record,
    regulations: result.data,
    pagination: result.pagination,
  };
}
