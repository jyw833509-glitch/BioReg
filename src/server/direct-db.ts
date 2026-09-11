import { createClient } from "./db";
// CLI processes need a stable session for migrations and advisory locks.
export function directConnection() {
  const value = process.env.DIRECT_URL;
  if (!value) throw new Error("DIRECT_URL_REQUIRED");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DIRECT_URL_INVALID");
  }
  if (!/^postgres(?:ql)?:$/.test(url.protocol))
    throw new Error("DIRECT_URL_INVALID");
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543")
    throw new Error("DIRECT_URL_SESSION_REQUIRED");
  return value;
}
export function directDb() {
  return createClient(directConnection());
}
