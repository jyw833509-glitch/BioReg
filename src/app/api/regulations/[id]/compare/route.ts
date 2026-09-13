import { db } from "@/server/db";
import { changeRepository } from "@/server/repositories/change-repository";
import { json, failure } from "@/server/http";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { from, to } = z
      .object({ from: z.string().min(1), to: z.string().min(1) })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    const result = await changeRepository(db()).compare(
      (await params).id,
      from,
      to,
    );
    return result ? json({ data: result }) : json({ error: "NOT_FOUND" }, 404);
  } catch (e) {
    return failure(e);
  }
}
