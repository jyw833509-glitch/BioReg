import { load } from "cheerio";
import { clean } from "./text";
import { parseDate, contentHash } from "./scalars";
import { classify } from "./rules";
import type {
  Agency,
  DocumentType,
  RegulationStatus,
} from "../../../generated/prisma/client";
import type { Document, OfficialRecord } from "./types";
export const text = (html: string) => clean(load(html).text());
export function date(
  raw: string | undefined,
  agency: Agency,
  warnings: string[],
): Date | null {
  if (!raw) return null;
  let s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) s = s.slice(0, 10);
  if (/^\d{8}$/.test(s)) s = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`;
  s = s.replace(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
    (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
  );
  if (agency === "EMA")
    s = s.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1");
  s = s.replace(/^(\d{1,2}) ([A-Za-z]+) (\d{4})$/, "$2 $1, $3");
  return parseDate(s, warnings);
}
export const relevance =
  /regenerative|biologic|biotechnolog|antibod|bispecific|biosimilar|recombinant|vaccine|cell.*therap|gene.*therap|\bADC\b|CMC|manufactur|quality|comparability|stability|analytical|specification|impurit|viral safety|clinical|immunogenic|pharmacovigilance|submission|lifecycle|post.approval|生物制品|抗体|单抗|双抗|生物类似药|疫苗|细胞治疗|基因治疗|重组蛋白|质量|工艺|分析|临床|稳定性|注册|免疫原性|病毒安全|药品/i;
export function normalizeDocument(
  d: Document,
  agency: Agency,
  mapType: (s: string) => DocumentType,
  mapStatus: (s: string) => RegulationStatus,
) {
  if (!d.title.trim() || !d.url)
    throw new Error("Missing official document title or URL");
  const warnings: string[] = [];
  const corpus = [d.title, d.content, d.summary, ...(d.topics || [])].join(" ");
  const tags = classify(
    d.title,
    d.content || d.summary || "",
    d.offices || [],
    "",
  );
  if (/质量|工艺|稳定性|可比性|控制策略/.test(corpus))
    tags.categories.push("CMC / Quality");
  if (/临床/.test(corpus)) tags.categories.push("Clinical");
  if (/生物类似药/.test(corpus)) tags.product_types.push("Biosimilar");
  if (/疫苗/.test(corpus)) tags.product_types.push("Vaccine");
  if (/基因治疗/.test(corpus)) tags.product_types.push("Gene Therapy");
  const official = {
    title_original: clean(d.title),
    document_number: d.documentNumber || null,
    document_type: mapType(d.type),
    status: mapStatus(d.status),
    publication_date: date(d.date, agency, warnings),
    publication_date_raw: d.date || null,
    effective_date: date(d.effectiveDate, agency, warnings),
    updated_date: date(d.updatedDate, agency, warnings),
    official_url: d.url,
    canonical_url: d.canonicalUrl || d.url,
    pdf_url: d.attachments.find((u) => /\.pdf(?:\?|$)/i.test(u)) || null,
    official_summary: d.summary || null,
    content_text: d.content || d.summary || "",
    issuing_offices: d.offices || [],
    official_topics: d.topics || [],
    docket_number: null,
    attachment_urls: d.attachments,
    source_metadata: {
      raw_status: d.status || null,
      raw_document_type: d.type || null,
      ...d.metadata,
    },
  };
  const data: OfficialRecord = {
    ...official,
    regulator: agency,
    country_or_region:
      agency === "EMA"
        ? "European Union"
        : agency === "ICH"
          ? "International"
          : agency === "PMDA"
            ? "Japan"
            : "China",
    title_zh:
      (agency === "NMPA" || agency === "CDE") &&
      /[\u3400-\u9fff]/.test(official.title_original)
        ? official.title_original
        : "",
    source_page_url: d.sourcePage,
    categories: [...new Set(tags.categories)],
    subcategories: [],
    product_types: [...new Set(tags.product_types)],
    development_stages: tags.development_stages,
    affected_departments: tags.affected_departments,
    keywords: [],
    is_mock: false,
    content_hash: contentHash(official),
    source_hash: contentHash(official),
  };
  return {
    data,
    warnings,
    relevant: agency === "ICH" || relevance.test(corpus),
  };
}
