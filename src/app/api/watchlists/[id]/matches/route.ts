import { db } from "@/server/db";
import { watchlistMatches } from "@/server/engagement/service";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return json({ data: await watchlistMatches(db(), (await params).id) });
  } catch (e) {
    return failure(e);
  }
}
