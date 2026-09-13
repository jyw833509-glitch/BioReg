import { db } from "@/server/db";
import { watchlistRepository } from "@/server/repositories/watchlist-repository";
import { watchlistSchema } from "@/server/validation";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: "INVALID_JSON_OR_PAYLOAD_SIZE" }, 400);
  }
  try {
    return json({
      data: await watchlistRepository(db()).update(
        (await params).id,
        watchlistSchema.partial().parse(body),
      ),
    });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  try {
    await watchlistRepository(db()).remove((await params).id);
    return json({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
