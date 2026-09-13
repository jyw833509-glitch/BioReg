import { db } from "@/server/db";
import { changeRepository } from "@/server/repositories/change-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const { id, versionId } = await params;
    const result = await changeRepository(db()).version(id, versionId);
    return result ? json({ data: result }) : json({ error: "NOT_FOUND" }, 404);
  } catch (e) {
    return failure(e);
  }
}
