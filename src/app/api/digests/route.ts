import { isAdmin } from "@/server/admin";
import { publicRead, invalidatePublicReads } from "@/server/public-read";
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
        ? await publicRead("today-summary", () => todaySummary(db()))
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
  if (!isAdmin(request))
    return json(
      {
        error: "ADMIN_REQUIRED",
        message: "公共工作区只读，请先在 /admin 登录。",
      },
      401,
    );
  try {
    const { date } = z
      .object({ date: calendarDate })
      .strict()
      .parse(await readJson(request));
    const data = await generateDigest(db(), date);
    invalidatePublicReads();
    return json({ data });
  } catch (e) {
    return failure(e);
  }
}
