import { load } from "cheerio";
import { OfficialClient } from "./shared/client";
import { officialUrl } from "./shared/url";
import { normalizeDocument } from "./shared/normalizer";
import { clean } from "./shared/text";
import type { Adapter, Candidate } from "./shared/types";

export function pharmacopoeiaAdapter(code: "USP" | "EDQM"): Adapter {
  const hosts =
    code === "USP"
      ? ["www.usp.org", "usp.org"]
      : ["www.edqm.eu", "edqm.eu", "faq.edqm.eu"];
  const pages =
    code === "USP"
      ? [
          "https://www.usp.org/harmonized-standards/pdg/general-chapters",
          "https://www.usp.org/harmonized-standards/pdg/general-methods",
        ]
      : [
          "https://www.edqm.eu/en/ph-eur-technical-guides",
          "https://www.edqm.eu/en/harmonisation-status-for-general-texts-pdg-",
          "https://faq.edqm.eu/pages/viewpage.action?pageId=143130671",
          "https://faq.edqm.eu/display/FAQS/MICROBIOLOGY",
        ];
  return {
    code,
    pages,
    embeddedDocuments: true,
    client: new OfficialClient((url, base) =>
      officialUrl(url, base || pages[0], hosts),
    ),
    directoryLinks(html, page) {
      if (
        code !== "EDQM" ||
        new URL(page).pathname !== "/display/FAQS/MICROBIOLOGY"
      )
        return [];
      const $ = load(html);
      return $(".childpages-macro a[href]")
        .toArray()
        .flatMap((el) => {
          if (!/\?\s*$/.test(clean($(el).text()))) return [];
          try {
            return [officialUrl($(el).attr("href")!, page, hosts)];
          } catch {
            return [];
          }
        });
    },
    parseList(html, page) {
      const $ = load(html),
        records = new Map<string, Candidate>();
      $("nav,header,footer,aside,script,style").remove();
      if (code === "EDQM" && new URL(page).hostname === "faq.edqm.eu") {
        if ($(".childpages-macro").length) return [];
        const title = clean($("#title-text").text() || $("h1").first().text());
        const excerpt = clean(
          $(".wiki-content").text() || $("#main-content").text(),
        );
        if (title.length < 20 || excerpt.length < 20 || !/\?\s*$/.test(title))
          return [];
        return [
          {
            url: page,
            title,
            context: excerpt,
            sourcePage: page,
            document: {
              title,
              url: page,
              sourcePage: page,
              type: "Q&A",
              status: "",
              attachments: [],
              content: excerpt,
              metadata: {
                capture_scope: "public_official_faq",
                full_text_captured: false,
                related_chapters: title.match(/\b\d+\.\d+\.\d+\b/g) || [],
                access: "public_metadata",
              },
            },
          },
        ];
      }
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
        (type) => (type === "Q&A" ? "QA" : "OTHER"),
        () => "UNKNOWN",
      );
      normalized.data.country_or_region =
        code === "USP" ? "United States" : "Europe";
      normalized.relevant = true;
      return normalized;
    },
  };
}
