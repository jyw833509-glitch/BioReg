import type { Db } from "../../db";
import { FdaClient, type HtmlClient } from "./client";
import { RECENT_URL, parseList, parseDetail, directoryLinks } from "./parser";
import { normalize } from "./normalizer";
import { syncSource, type SyncOptions } from "../shared/sync";
export type { SyncOptions } from "../shared/sync";
export const fdaAdapter = {
  code: "FDA" as const,
  pages: [
    "https://www.fda.gov/drugs/biosimilars/industry-information-and-guidance",
    "https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/general-biologics-guidances",
    RECENT_URL,
    "https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/cellular-gene-therapy-guidances",
  ],
  client: new FdaClient(),
  parseList,
  directoryLinks,
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
