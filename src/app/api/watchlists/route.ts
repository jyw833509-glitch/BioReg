import { db } from "@/server/db";
import { watchlistRepository } from "@/server/repositories/watchlist-repository";
import { watchlistSchema } from "@/server/validation";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await watchlistRepository(db()).list() });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return json(
      {
        error: "ORIGIN_REJECTED",
        origin_policy: {
          configured: !!process.env.APP_ORIGIN,
          request_origin: new URL(request.url).origin,
          expected_origin: new URL(process.env.APP_ORIGIN || request.url)
            .origin,
          configured_has_path:
            !!process.env.APP_ORIGIN &&
            new URL(process.env.APP_ORIGIN).pathname !== "/",
          configured_trailing_slash:
            process.env.APP_ORIGIN?.endsWith("/") || false,
        },
      },
      403,
    );
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json({ error: "INVALID_JSON_OR_PAYLOAD_SIZE" }, 400);
  }
  try {
    return json(
      {
        data: await watchlistRepository(db()).create(
          watchlistSchema.parse(body),
        ),
      },
      201,
    );
  } catch (error) {
    return failure(error);
  }
}
