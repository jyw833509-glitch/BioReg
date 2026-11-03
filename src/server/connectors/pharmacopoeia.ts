import { load } from "cheerio";
import { OfficialClient } from "./shared/client";
import { officialUrl } from "./shared/url";
import { normalizeDocument } from "./shared/normalizer";
import { clean } from "./shared/text";
import type { Adapter, Candidate } from "./shared/types";

export function pharmacopoeiaAdapter(code: "USP" | "EDQM"): Adapter {
  const hosts =
    code === "USP" ? ["www.usp.org", "usp.org"] : ["www.edqm.eu", "edqm.eu"];
  const pages =
    code === "USP"
      ? ["https://www.usp.org/harmonized-standards/pdg/general-chapters"]
      : [
          "https://www.edqm.eu/en/ph-eur-technical-guides",
          "https://www.edqm.eu/en/harmonisation-status-for-general-texts-pdg-",
        ];
  return {
    code,
    pages,
    embeddedDocuments: true,
    client: new OfficialClient((url, base) =>
      officialUrl(url, base || pages[0], hosts),
    ),
    parseList(html, page) {
      const $ = load(html),
        records = new Map<string, Candidate>();
      $("nav,header,footer,aside,script,style").remove();
      $(
        "main a[href], [role=main] a[href], .journal-content-article a[href]",
      ).each((_, el) => {
        try {
          const url = officialUrl($(el).attr("href")!, page, hosts);
          if (
            !(
              code === "USP"
                ? /\/harmonization-standards\/pdg\/(?:general-chapters|general-methods|excipients)\//i
                : /\/documents\//i
            ).test(url)
          )
            return;
          const label = clean($(el).text());
          const context = clean($(el).closest("tr,li,p").text());
          if (
            label.length < 8 ||
            /privacy|cookie|annual report|newsletter/i.test(label)
          )
            return;
          const cells = $(el)
            .closest("tr")
            .find("td")
            .toArray()
            .map((c) => clean($(c).text()));
          const title = code === "USP" && cells.length >= 5 ? cells[1] : label;
          const excerpt = context || label;
          records.set(url, {
            url,
            title,
            context: excerpt,
            sourcePage: page,
            document: {
              title,
              url,
              sourcePage: page,
              canonicalUrl: url,
              type: "Other",
              status: "",
              documentNumber:
                code === "USP" && cells.length >= 5 ? cells[0] : undefined,
              attachments: [url],
              content: excerpt,
              metadata: {
                capture_scope: "public_catalog_excerpt",
                catalog_excerpt: excerpt,
                access: "public_metadata",
                full_text_captured: false,
                publication_status: "not_verified",
                regional_implementation: [],
                ...(cells.length >= 5
                  ? { revision: cells[3], revision_kind: "PDG sign-off status" }
                  : {}),
              },
            },
          });
        } catch {
          /* Only explicitly allowed public document links are accepted. */
        }
      });
      return [...records.values()];
    },
    read(_html, _url, candidate) {
      if (!candidate.document)
        throw new Error(
          "Public catalog document metadata required; no subscription fetch attempted",
        );
      const normalized = normalizeDocument(
        candidate.document,
        code,
        () => "OTHER",
        () => "UNKNOWN",
      );
      normalized.data.country_or_region =
        code === "USP" ? "United States" : "Europe";
      normalized.relevant = true;
      return normalized;
    },
  };
}
