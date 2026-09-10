import { db } from "@/server/db";
import { getDashboard } from "@/server/repositories/dashboard-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await getDashboard(db()) });
  } catch (error) {
    return failure(error);
  }
}
