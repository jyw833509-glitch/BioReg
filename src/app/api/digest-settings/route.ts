import { isAdmin } from "@/server/admin";
import { invalidatePublicReads } from "@/server/public-read";
import { db } from "@/server/db";
import { digestSettings, settingsSchema } from "@/server/engagement/digest";
import { json, failure, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json({ data: await digestSettings(db()) });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  if (!isAdmin(request))
    return json(
      {
        error: "ADMIN_REQUIRED",
        message: "公共工作区只读，请先在 /admin 登录。",
      },
      401,
    );
  try {
    const data = settingsSchema.parse(await readJson(request));
    const settings = await db().digestSettings.upsert({
      where: { id: "workspace" },
      create: { id: "workspace", ...data },
      update: data,
    });
    invalidatePublicReads();
    return json({ data: settings });
  } catch (e) {
    return failure(e);
  }
}
