export type Agency = "FDA" | "EMA" | "NMPA" | "CDE" | "ICH" | "PMDA";
export type Status =
  | "Draft"
  | "Final"
  | "Effective"
  | "Revised"
  | "Superseded"
  | "Withdrawn"
  | "Under Consultation"
  | "Archived"
  | "Unknown";
export type Importance = "Critical" | "High" | "Medium" | "Low";
export interface RegulationVersion {
  id: string;
  regulation_id: string;
  version_name: string;
  document_url: string | null;
  pdf_url: string | null;
  publication_date: string;
  detected_at: string;
  status: Status;
  content_hash: string;
  source_hash?: string;
  created_at?: string;
  content_snapshot: string;
  previous_version_id: string | null;
  change_detected: string;
}
export interface Regulation {
  attachment_urls?: string[];
  source_metadata?: Record<string, unknown>;
  publication_date_raw?: string | null;
  issuing_offices?: string[];
  official_topics?: string[];
  docket_number?: string | null;
  id: string;
  source_id?: string;
  canonical_url?: string | null;
  regulator: Agency;
  country_or_region: string;
  title_original: string;
  title_zh: string;
  document_number: string;
  document_type: string;
  status: Status;
  publication_date: string;
  effective_date: string | null;
  updated_date: string;
  official_url: string | null;
  pdf_url: string | null;
  source_page_url: string | null;
  official_summary: string | null;
  summary_zh: string;
  content_text: string;
  categories: string[];
  subcategories: string[];
  keywords: string[];
  product_types: string[];
  development_stages: string[];
  affected_departments: string[];
  importance_level: Importance;
  version: string;
  previous_version_id: string | null;
  is_current_version: boolean;
  is_new: boolean;
  is_updated: boolean;
  content_hash: string;
  source_hash: string;
  first_detected_at: string;
  last_checked_at: string;
  created_at: string;
  updated_at: string;
  is_mock: boolean;
  versions: RegulationVersion[];
}
export interface SyncLog {
  id: string;
  source: Agency;
  started_at: string;
  finished_at: string | null;
  status: "Success" | "Failed" | "Partial Success" | "Not connected";
  records_found: number;
  records_new: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
}
