import { isAdmin } from "@/server/admin";
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
    return json({
      data: await db().digestSettings.upsert({
        where: { id: "workspace" },
        create: { id: "workspace", ...data },
        update: data,
      }),
    });
  } catch (e) {
    return failure(e);
  }
}
