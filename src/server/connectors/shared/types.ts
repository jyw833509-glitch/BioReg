import type {
  Agency,
  Prisma,
  Regulation,
} from "../../../generated/prisma/client";
import type { HtmlClient } from "./client";
export type OfficialRecord = Pick<
  Regulation,
  | "title_original"
  | "document_number"
  | "document_type"
  | "status"
  | "publication_date"
  | "publication_date_raw"
  | "effective_date"
  | "updated_date"
  | "official_url"
  | "canonical_url"
  | "pdf_url"
  | "official_summary"
  | "content_text"
  | "issuing_offices"
  | "official_topics"
  | "docket_number"
  | "country_or_region"
  | "source_page_url"
  | "categories"
  | "subcategories"
  | "product_types"
  | "development_stages"
  | "affected_departments"
  | "keywords"
  | "is_mock"
  | "content_hash"
  | "source_hash"
> & {
  canonical_url: string;
  content_hash: string;
  source_hash: string;
  regulator: Agency;
  title_zh?: string;
  attachment_urls?: string[];
  source_metadata?: Prisma.InputJsonObject;
};
export interface Document {
  title: string;
  url: string;
  canonicalUrl?: string;
  sourcePage: string;
  documentNumber?: string | null;
  type: string;
  status: string;
  date?: string;
  effectiveDate?: string;
  updatedDate?: string;
  summary?: string | null;
  content?: string;
  attachments: string[];
  offices?: string[];
  topics?: string[];
  metadata?: Prisma.InputJsonObject;
}
export interface Candidate {
  url: string;
  title: string;
  context: string;
  sourcePage?: string;
  document?: Document;
}
export interface Adapter {
  embeddedDocuments?: boolean;
  code: Agency;
  pages: string[];
  client: HtmlClient;
  parseList(body: string, url: string): Candidate[];
  read(
    body: string,
    url: string,
    candidate: Candidate,
    sourcePage: string,
  ): { data: OfficialRecord; relevant: boolean; warnings: string[] };
}
