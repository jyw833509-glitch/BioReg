import type { Db } from "../../db";
import { FdaClient, type HtmlClient } from "./client";
import { RECENT_URL, parseList, parseDetail } from "./parser";
import { normalize } from "./normalizer";
import { syncSource, type SyncOptions } from "../shared/sync";
export type { SyncOptions } from "../shared/sync";
export const fdaAdapter = {
  code: "FDA" as const,
  pages: [RECENT_URL],
  client: new FdaClient(),
  parseList,
  read: (
    html: string,
    url: string,
    candidate: Parameters<typeof parseDetail>[2],
    source: string,
  ) => normalize(parseDetail(html, url, candidate, source)),
};
export function syncFda(db: Db, options: SyncOptions, client?: HtmlClient) {
  return syncSource(db, fdaAdapter, options, client);
}
