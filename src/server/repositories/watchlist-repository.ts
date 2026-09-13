import type { Db } from "../db";
import { watchlistSchema, type WatchlistInput } from "../validation";
export function watchlistRepository(client: Db) {
  return {
    async list() {
      return client.watchlist.findMany({
        take: 100,
        orderBy: { created_at: "desc" },
      });
    },
    async getById(id: string) {
      return client.watchlist.findUnique({ where: { id } });
    },
    async create(data: WatchlistInput) {
      return client.watchlist.create({ data: watchlistSchema.parse(data) });
    },
    async update(id: string, data: Partial<WatchlistInput>) {
      return client.watchlist.update({
        where: { id },
        data: watchlistSchema.partial().parse(data),
      });
    },
    async remove(id: string) {
      return client.watchlist.delete({ where: { id } });
    },
  };
}
