import type { Regulation } from "./types";
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface SourceView {
  id: string;
  code: string;
  name: string;
  country_or_region: string;
  official_base_url: string;
  enabled: boolean;
  sync_frequency: number;
  last_sync_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  health: string;
  official_count?: number;
  latest_regulation?: { id: string; title_original: string } | null;
  sync_status?: string;
  sync_error?: string | null;
}
export interface LogView {
  id: string;
  source: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  records_found: number;
  records_new: number;
  records_updated: number;
  records_failed: number;
  error_message: string | null;
  is_mock: boolean;
}
export interface WatchlistView {
  id: string;
  name: string;
  description: string;
  regulators: string[];
  categories: string[];
  subcategories: string[];
  product_types: string[];
  development_stages: string[];
  document_types: string[];
  keywords: string[];
  importance_levels: string[];
  country_or_regions: string[];
  affected_departments: string[];
  statuses: string[];
  change_types: string[];
  minimum_severity: string | null;
  enabled: boolean;
}
export interface DashboardView {
  lastGlobalSync: string | null;
  latestSyncResult: string;
  globalJobId: string | null;
  healthySources: number;
  degradedSources: number;
  sourceHealthSummary: Record<string, string>;
  date: string;
  total: number;
  mockTotal: number;
  todayNew: number;
  todayUpdated: number;
  todayTotal: number;
  todayHigh: number;
  highPriority: number;
  thisWeek: number;
  monitoredAgencies: number;
  draft: number;
  final: number;
  lastSync: string | null;
  byAgency: Record<string, number>;
  byTopic: Record<string, number>;
  byDocumentType: Record<string, number>;
  recent: Regulation[];
  priority: Regulation[];
  changes: Regulation[];
}
