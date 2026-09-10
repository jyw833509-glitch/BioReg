import { db } from "@/server/db";
import { regulationRepository } from "@/server/repositories/regulation-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const data = await regulationRepository(db()).getById((await params).id);
    return data ? json({ data }) : json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    return failure(error);
  }
}
