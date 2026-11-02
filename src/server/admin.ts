import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
export const ADMIN_COOKIE = "bioreg_admin";
// Readiness only: never expose the value, length or a fingerprint.
export function adminConfiguration() {
  const value = process.env.BIOREG_ADMIN_KEY;
  if (!value) return "missing" as const;
  return value.length >= 32 ? "ready" as const : "invalid" as const;
}
const key = () => {
  const k = process.env.BIOREG_ADMIN_KEY;
  return k && k.length >= 32 ? k : null;
};
const equal = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export function validAdminKey(value: string) {
  const k = key();
  return !!k && equal(value, k);
}
export function issueAdminSession(now = Date.now()) {
  const k = key();
  if (!k) throw new Error("ADMIN_NOT_CONFIGURED");
  const payload = `${now + 8 * 3600000}.${randomBytes(16).toString("hex")}`;
  return payload + "." + createHmac("sha256", k).update(payload).digest("hex");
}
export function isAdmin(request: Request, now = Date.now()) {
  const k = key();
  if (!k) return false;
  const token =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith(ADMIN_COOKIE + "="))
      ?.slice(ADMIN_COOKIE.length + 1) || "";
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    Number(parts[0]) <= now ||
    Number(parts[0]) > now + 8 * 3600000
  )
    return false;
  return equal(
    parts[2],
    createHmac("sha256", k).update(parts.slice(0, 2).join(".")).digest("hex"),
  );
}
