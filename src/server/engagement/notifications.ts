import type { Db } from "../db";
import type { NotificationEvent, Prisma } from "../../generated/prisma/client";
export interface NotificationSender {
  channel: string;
  send(event: NotificationEvent): Promise<void>;
}
export const inAppSender: NotificationSender = {
  channel: "IN_APP",
  async send() {
    /* Persistence is in-app delivery. */
  },
};
export async function deliver(
  db: Db,
  event: NotificationEvent,
  sender: NotificationSender = inAppSender,
) {
  if (event.delivery_status === "DELIVERED") return;
  try {
    if (event.channel !== sender.channel)
      throw new Error("Unsupported channel");
    await sender.send(event);
    await db.notificationEvent.update({
      where: { id: event.id },
      data: {
        delivery_status: "DELIVERED",
        delivered_at: new Date(),
        failure_reason: null,
      },
    });
  } catch {
    await db.notificationEvent.update({
      where: { id: event.id },
      data: {
        delivery_status: "FAILED",
        failure_reason: "Channel delivery failed; retry pending",
      },
    });
  }
}
export function notificationRepository(db: Db) {
  return {
    async list(
      filter: {
        state?: string;
        severity?: string;
        watchlist_id?: string;
        page?: number;
      } = {},
    ) {
      const where: Prisma.NotificationEventWhereInput = {
        channel: "IN_APP",
        delivery_status: "DELIVERED",
      };
      if (filter.state === "unread") where.read_at = null;
      if (filter.state === "read") where.read_at = { not: null };
      if (filter.severity)
        where.severity = filter.severity as Prisma.EnumImportanceFilter;
      if (filter.watchlist_id) where.watchlist_id = filter.watchlist_id;
      const data = await db.notificationEvent.findMany({
        where,
        include: { watchlist: { select: { name: true } } },
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        take: 50,
        skip: ((filter.page || 1) - 1) * 50,
      });
      const total = await db.notificationEvent.count({ where });
      return { data, total };
    },
    async stats() {
      return {
        unread: await db.notificationEvent.count({
          where: {
            channel: "IN_APP",
            delivery_status: "DELIVERED",
            read_at: null,
          },
        }),
      };
    },
    async read(id?: string) {
      return db.notificationEvent.updateMany({
        where: {
          ...(id ? { id } : {}),
          channel: "IN_APP",
          delivery_status: "DELIVERED",
          read_at: null,
        },
        data: { read_at: new Date() },
      });
    },
  };
}
