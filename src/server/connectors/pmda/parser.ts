import { load } from "cheerio";
import { clean } from "../shared/text";
import { officialUrl } from "../shared/url";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";

export function parseList(body: string, url: string): Candidate[] {
  const $ = load(body);
  const result: Candidate[] = [];
  const seen = new Set<string>();
  $("h2,h3")
    .filter((_, e) => /Related Guidelines.*Notifications/i.test($(e).text()))
    .nextUntil("h2,h3")
    .find("li")
    .each((_, li) => {
      const item = $(li);
      const links = item.find('a[href$=".pdf"]');
      if (!links.length) return;
      const attachments = links
        .map((_, a) => officialUrl($(a).attr("href")!, url, config.hosts))
        .get();
      const primary = attachments[0];
      if (seen.has(primary)) return;
      seen.add(primary);
      const linkedTitle = clean(links.first().text()).replace(
        /\s*\[[\d.,]+\s*[KM]?B\]/gi,
        "",
      );
      const clone = item.clone();
      clone.find("a").remove();
      const surrounding = clean(clone.text())
        .replace(/\[\s*\]/g, "")
        .trim();
      const title = /^(Japanese|English)$/i.test(linkedTitle)
        ? surrounding
        : linkedTitle;
      if (!title) return;
      const raw = clean(item.text());
      // Only a complete standalone date is a publication date; years and notification numbers are not dates.
      const date =
        /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/.exec(
          surrounding,
        )?.[0];
      const documentNumber =
        /(?:[A-Z]+(?:\/[A-Z]+)*\s+)?Notification No\.\s*[\d-]+(?:,\s*\d{4})?/i.exec(
          title,
        )?.[0] || null;
      const topic = url.includes("0005.html")
        ? "Biosimilars"
        : "Regenerative Medical Products";
      const d: Document = {
        title,
        url,
        canonicalUrl: primary,
        sourcePage: url,
        documentNumber,
        type: title,
        status: "",
        date,
        attachments,
        topics: [topic],
        metadata: {
          listing_text: raw,
          languages: links
            .map((_, a) =>
              /Japanese/i.test($(a).text()) ? "Japanese" : "English",
            )
            .get(),
          translation_notice:
            "English translations are for reference; the original Japanese text prevails.",
          date_basis: date
            ? "Date displayed beside the document on the official listing"
            : null,
        },
      };
      result.push({ url: primary, title, context: topic, document: d });
    });
  return result;
}
export function parseDetail(
  _body: string,
  _url: string,
  candidate: Candidate,
  source: string,
): Document {
  void source;
  if (!candidate.document)
    throw new Error("PMDA document absent from current official listing");
  return candidate.document;
}
