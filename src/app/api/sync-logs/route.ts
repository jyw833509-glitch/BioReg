import { db } from "@/server/db";
import { syncLogRepository } from "@/server/repositories/sync-log-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await syncLogRepository(db()).list() });
  } catch (error) {
    return failure(error);
  }
}
