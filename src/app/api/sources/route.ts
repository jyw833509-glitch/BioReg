import { db } from "@/server/db";
import { sourceRepository } from "@/server/repositories/source-repository";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await sourceRepository(db()).list() });
  } catch (error) {
    return failure(error);
  }
}
