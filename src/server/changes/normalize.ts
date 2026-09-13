import { createHash } from "node:crypto";
import { load } from "cheerio";

export function normalizedUrl(value: unknown): string {
  if (!value) return "";
  try {
    const u = new URL(String(value));
    for (const key of [...u.searchParams.keys()])
      if (
        /^(utm_.+|fbclid|gclid|mc_cid|mc_eid|_ga|x-amz-.+|x-goog-.+|signature|expires|token)$/i.test(
          key,
        )
      )
        u.searchParams.delete(key);
    u.searchParams.sort();
    u.hash = "";
    return u.toString();
  } catch {
    return String(value).trim();
  }
}
export function normalizedText(input: unknown): string {
  let text = String(input || "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n");
  if (/<\/?[a-z][^>]*>/i.test(text)) {
    const $ = load(text);
    $("head,script,style,nav,header,footer,[role=navigation]").remove();
    $("br").replaceWith("\n");
    $("p,div,h1,h2,h3,h4,h5,h6,li,section").append("\n\n");
    text = $.text();
  }
  // PDF extraction may retain page boundaries. Remove only repeated page-edge lines.
  const pages = text.split("\f");
  if (pages.length > 1) {
    const counts = new Map<string, number>();
    for (const page of pages) {
      const lines = page
        .trim()
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);
      for (const line of new Set([...lines.slice(0, 2), ...lines.slice(-2)]))
        counts.set(line, (counts.get(line) || 0) + 1);
    }
    text = pages
      .map((page) => {
        const lines = page.trim().split("\n");
        return lines
          .filter(
            (line, i) =>
              !(
                (i < 2 || i >= lines.length - 2) &&
                (counts.get(line.trim()) || 0) >= 2
              ),
          )
          .join("\n");
      })
      .join("\n\n");
  }
  return text
    .split("\n")
    .filter(
      (line) =>
        !/^\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|第\s*\d+\s*页(?:\s*共\s*\d+\s*页)?|Home|Back to top|Skip to main content|Print this page|Accept all cookies|Generated at\s*[:：].*|Downloaded at\s*[:：].*)\s*$/i.test(
          line,
        ),
    )
    .join("\n")
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const contentFingerprint = (text: unknown) =>
  hash(normalizedText(text).replace(/\s+/g, " "));
export function assertOfficialContent(title: string, content: string) {
  if (!title.trim() || !normalizedText(content).trim())
    throw new Error("EMPTY_OFFICIAL_DOCUMENT");
  if (
    /^(access denied|just a moment|verification required|request rejected|captcha|forbidden|403)(?:\b|$)/i.test(
      title.trim(),
    ) ||
    /(?:verify (?:that )?you are human|checking your browser|enable javascript and cookies to continue|访问验证|人机验证|访问被拒绝|\$_ts\.lcd|g-recaptcha|cf-chl-)/i.test(
      content,
    ) ||
    /^(?:access denied|verification page|captcha|403 forbidden)\s*[.!]?$/i.test(
      content.trim(),
    )
  )
    throw new Error("ACCESS_VERIFICATION_DOCUMENT_REJECTED");
}
