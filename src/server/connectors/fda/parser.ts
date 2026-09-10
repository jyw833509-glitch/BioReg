import { load } from "cheerio";
export const RECENT_URL =
  "https://www.fda.gov/vaccines-blood-biologics/biologics-guidances/recently-issued-guidance-documents";
export const clean = (s: string) =>
  s.normalize("NFC").replace(/\s+/g, " ").trim();
export function canonicalUrl(raw: string, base = RECENT_URL) {
  const u = new URL(raw, base);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    !["www.fda.gov", "fda.gov"].includes(u.hostname) ||
    u.username ||
    u.password ||
    u.port
  )
    throw new Error("URL is not an FDA public URL");
  u.protocol = "https:";
  u.hostname = "www.fda.gov";
  u.hash = "";
  u.pathname = u.pathname.replace(/\/+$/, "") || "/";
  for (const key of [...u.searchParams.keys()])
    if (/^(utm_.*|fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  return u.toString();
}
export interface Candidate {
  url: string;
  title: string;
  context: string;
}
export function parseList(html: string, url: string): Candidate[] {
  const $ = load(html);
  const result = new Map<string, Candidate>();
  $("[role=main] a[href], main a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const target = canonicalUrl(href, url);
      if (
        !new URL(target).pathname.startsWith(
          "/regulatory-information/search-fda-guidance-documents/",
        )
      )
        return;
      const title = clean($(el).text());
      if (!title || $(el).closest("nav, aside").length) return;
      result.set(target, {
        url: target,
        title,
        context: clean($(el).closest("li, tr").text()),
      });
    } catch {
      /* Off-site links are not connector targets. */
    }
  });
  return [...result.values()];
}
export interface RawDocument {
  title: string;
  url: string;
  sourcePage: string;
  pdf: string | null;
  date: string;
  effectiveDate: string;
  updatedDate: string;
  status: string;
  type: string;
  documentNumber: string | null;
  docket: string | null;
  offices: string[];
  topics: string[];
  summary: string | null;
  context: string;
}
export function parseDetail(
  html: string,
  url: string,
  candidate: Candidate,
  sourcePage: string,
): RawDocument {
  const $ = load(html);
  const h = $("h1.content-title").first();
  if (
    !h.length ||
    !$(".content-type-label").text().includes("GUIDANCE DOCUMENT")
  )
    throw new Error("Unrecognized FDA guidance detail structure");
  const date = clean(h.find(".font-family-sans").text());
  const title = clean(h.clone().children().remove().end().text());
  if (!title || title.length < 5) throw new Error("Missing official title");
  const label = (name: string) => {
    let v = "";
    $("dt").each((_, e) => {
      if (
        clean($(e).text()).replace(/:$/, "").toLowerCase() ===
        name.toLowerCase()
      )
        v = clean($(e).next("dd").text());
    });
    return v;
  };
  const download = $(".lcds-toolbar a")
    .filter((_, el) => /download.*guidance/i.test($(el).text()))
    .first();
  let pdf: string | null = null;
  if (download.attr("href")) pdf = canonicalUrl(download.attr("href")!, url);
  // Direct introductory paragraphs are the official page's description, not navigation or submission instructions.
  const paragraphs = $("[role=main]")
    .first()
    .children("p")
    .map((_, e) => clean($(e).text()))
    .get()
    .filter(Boolean);
  const offices = $(".field--name-field-issuing-office-taxonomy .field--item")
    .map((_, e) => clean($(e).text()))
    .get();
  const topics = $(".field--name-field-guidance-topic .field--item")
    .map((_, e) => clean($(e).text()))
    .get();
  return {
    title,
    url: canonicalUrl(url),
    sourcePage,
    pdf,
    date,
    effectiveDate: label("Effective Date"),
    updatedDate: label("Revision Date"),
    status: clean($(".lcds-statusbar").text()),
    type: clean(download.text()) || clean($(".content-type-label").text()),
    documentNumber: label("Document Number") || null,
    docket: label("Docket Number") || null,
    offices,
    topics,
    summary: paragraphs.join("\n\n") || null,
    context: candidate.context,
  };
}
