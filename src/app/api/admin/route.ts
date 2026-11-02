import {
  ADMIN_COOKIE,
  isAdmin,
  issueAdminSession,
  validAdminKey,
} from "@/server/admin";
import { json, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return json({ admin: isAdmin(request) });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  try {
    const body = await readJson(request);
    if (typeof body.key !== "string" || !validAdminKey(body.key))
      return json(
        { error: "ADMIN_REQUIRED", message: "管理员密钥无效或尚未配置。" },
        401,
      );
    const response = json({ admin: true });
    response.headers.set(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${issueAdminSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return response;
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_REJECTED" }, 403);
  const response = json({ admin: false });
  response.headers.set(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
  );
  return response;
}
