import { db } from "@/server/db";
import { notificationRepository } from "@/server/engagement/notifications";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await notificationRepository(db()).stats() });
  } catch (e) {
    return failure(e);
  }
}
