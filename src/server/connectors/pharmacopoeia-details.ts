import { load } from "cheerio";
import catalog from "./pharmacopoeia-catalog.json";
import { clean } from "./shared/text";
import type { Candidate, Document } from "./shared/types";

// Reviewed discovery targets, not cached facts: each synchronization fetches the
// public official page again and verifies its document identity before indexing.
export const chapterPages = (source: "USP" | "EDQM") =>
  catalog.filter((r) => r.source === source).map((r) => r.url);

export function publicChapter(html: string, page: string): Candidate[] | null {
  const target = catalog.find((r) => r.url === page);
  if (!target) return null;
  const $ = load(html);
  $("script,style,noscript").remove();
  let document: Document;
  if (target.source === "USP") {
    const title = clean($("#text-area > .title").text());
    const number = title === "General Notices and Requirements" ? "General Notices" : title.match(/[〈〈<](\d+(?:\.\d+)?)[〉〉>]/)?.[1];
    const excerpt = clean($("#text-area > .body").text());
    if (number !== target.number || !excerpt || /page not found|unpublished version/i.test(title + excerpt))
      throw new Error("Unverified USP public chapter preview");
    document = {
      title, url: page, sourcePage: page, documentNumber: number === "General Notices" ? null : `<${number}>`,
      type: "General Chapter", status: /^BRIEFING\b/i.test(excerpt) ? "proposal" : "",
      content: excerpt, summary: excerpt, attachments: [],
      metadata: {
        capture_scope: "public_pharmacopoeia_preview", full_text_captured: false,
        access: "subscription_required", citation: clean($(".citation").text()),
        doi: clean($(".identifiers").text()),
        publication_status: "verify_current_authorized_edition",
      },
    };
  } else {
    const fields: Record<string, string> = {};
    const allowed = ["Status", "Monograph Number", "English Name", "French Name", "Latin Name", "Chinese Name", "Pharmeuropa", "Last published in English", "On-going", "State of work", "Description"];
    $("tr").each((_, el) => {
      const cells = $(el).children("td");
      const key = clean(cells.eq(0).text());
      if (cells.length === 2 && allowed.includes(key)) fields[key] = clean(cells.eq(1).text());
    });
    const id = new URL(page).pathname.split("/").pop();
    if (!fields["English Name"] || !fields["Monograph Number"] || Number(fields["Monograph Number"]) !== Number(id))
      throw new Error("Unverified EDQM Knowledge document identity");
    const title = fields["English Name"];
    document = {
      title, url: page, sourcePage: page, documentNumber: target.number,
      type: "Pharmacopoeia text", status: /^in use$/i.test(fields.Status) ? "published" : /^elaboration$/i.test(fields.Status) ? "proposal" : "",
      content: Object.entries(fields).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n"),
      attachments: [],
      metadata: {
        capture_scope: "public_pharmacopoeia_metadata", full_text_captured: false,
        access: "subscription_required", knowledge_fields: fields,
        official_version: fields["Last published in English"] || null,
        // In use means published according to Knowledge's legend, not proof of
        // current applicability or a product-specific effective date.
        publication_status: fields.Status || "not_verified",
      },
    };
  }
  return [{ url: page, title: document.title, context: "Public official pharmacopoeia metadata", sourcePage: page, document }];
}
