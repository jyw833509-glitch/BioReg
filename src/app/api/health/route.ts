import { measuredResponse } from "@/server/performance";
import { db } from "@/server/db";
import { json, failure } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  return measuredResponse("api.health", async () => {
    try {
      await db().$queryRaw`SELECT 1`;
      return json({
        status: "ok",
        database: "PostgreSQL",
        orm: "Prisma",
        phase: 9,
        version: "1.0.0",
        application: "ok",
        live_sources_connected: await db().source.findMany({
          where: { last_sync_at: { not: null } },
          select: {
            code: true,
            last_sync_at: true,
            last_success_at: true,
            last_failure_at: true,
            last_status: true,
          },
        }),
      });
    } catch (error) {
      return failure(error);
    }
  });
}
