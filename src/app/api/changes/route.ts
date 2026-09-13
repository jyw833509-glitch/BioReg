import { db } from "@/server/db";
import { changeRepository } from "@/server/repositories/change-repository";
import { json, failure } from "@/server/http";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const q = z
      .object({
        regulationId: z.string().min(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
      })
      .strict()
      .parse(Object.fromEntries(new URL(request.url).searchParams));
    return json({
      data: await changeRepository(db()).list(q.regulationId, q.limit),
    });
  } catch (e) {
    return failure(e);
  }
}
