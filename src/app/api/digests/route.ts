import { z } from "zod";
import { db } from "@/server/db";
import {
  digestRepository,
  generateDigest,
  todaySummary,
} from "@/server/engagement/digest";
import { calendarDate } from "@/server/validation";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const q = z
      .object({
        date: calendarDate.optional(),
        today: z.literal("true").optional(),
      })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return json({
      data: q.today
        ? await todaySummary(db())
        : q.date
          ? await digestRepository(db()).get(q.date)
          : await digestRepository(db()).list(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  try {
    const { date } = z
      .object({ date: calendarDate })
      .strict()
      .parse(await readJson(request));
    return json({ data: await generateDigest(db(), date) });
  } catch (e) {
    return failure(e);
  }
}
