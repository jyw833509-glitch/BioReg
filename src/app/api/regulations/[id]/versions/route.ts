import { db } from "@/server/db";
import { regulationRepository } from "@/server/repositories/regulation-repository";
import { regulationVersionRepository } from "@/server/repositories/regulation-version-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const id = (await params).id;
    const client = db();
    if (!(await regulationRepository(client).getById(id)))
      return json({ error: "NOT_FOUND" }, 404);
    return json({ data: await regulationVersionRepository(client).list(id) });
  } catch (error) {
    return failure(error);
  }
}
