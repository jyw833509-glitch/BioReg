export function officialUrl(
  raw: string,
  base: string,
  hosts: readonly string[],
) {
  const u = new URL(raw, base);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    !hosts.includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error("URL is not an allowed official source");
  u.protocol = "https:";
  u.hash = "";
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  for (const k of [...u.searchParams.keys()])
    if (/^(utm_.*|fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
  u.searchParams.sort();
  return u.toString();
}
