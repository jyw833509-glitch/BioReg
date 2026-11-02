import { isAdmin } from "@/server/admin";
import { z } from "zod";
import { db } from "@/server/db";
import { notificationRepository } from "@/server/engagement/notifications";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
const filter = z
  .object({
    state: z.enum(["all", "unread", "read"]).optional(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    watchlist_id: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).max(10000).optional(),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const repo = notificationRepository(db());
    const q = filter.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const result = await repo.list(q);
    const statistics =
      q.state === "unread" && !q.severity && !q.watchlist_id
        ? { unread: result.total }
        : await repo.stats();
    return json({ ...result, statistics });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  if (!isAdmin(request))
    return json(
      {
        error: "ADMIN_REQUIRED",
        message: "公共工作区只读，请先在 /admin 登录。",
      },
      401,
    );
  try {
    const input = z
      .object({
        id: z.string().min(1).max(100).optional(),
        all: z.literal(true).optional(),
      })
      .strict()
      .refine((v) => !!v.id !== !!v.all)
      .parse(await readJson(request));
    return json({ data: await notificationRepository(db()).read(input.id) });
  } catch (e) {
    return failure(e);
  }
}
