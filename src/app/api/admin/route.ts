import {
  ADMIN_COOKIE,
  adminConfiguration,
  isAdmin,
  issueAdminSession,
  validAdminKey,
} from "@/server/admin";
import { json, sameOrigin, readJson } from "@/server/http";
export const runtime = "nodejs";
function rejected(error: string, message: string, status: number) {
  // Whitelisted fields only: never log request bodies, cookies or env values.
  console.warn("BioReg admin login rejected", { code: error, status });
  return json({ error, message }, status);
}
export async function GET(request: Request) {
  return json({ admin: isAdmin(request), configuration: adminConfiguration() });
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return rejected("ORIGIN_REJECTED", "登录地址与站点配置不一致，请从正式网站打开登录页。", 403);
  if (adminConfiguration() !== "ready")
    return rejected("ADMIN_NOT_CONFIGURED", "生产服务尚未读取到有效的 BIOREG_ADMIN_KEY，请检查 Netlify Production 的 Functions 环境变量并重新部署。", 503);
  try {
    const body = await readJson(request);
    if (typeof body.key !== "string" || !validAdminKey(body.key))
      return rejected("ADMIN_KEY_MISMATCH", "密码与生产环境配置不一致，请输入同一份密码，并检查前后空格。", 401);
    const response = json({ admin: true });
    response.headers.set(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${issueAdminSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    );
    return response;
  } catch {
    return rejected("INVALID_REQUEST", "登录请求格式无效，请刷新页面后重试。", 400);
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
