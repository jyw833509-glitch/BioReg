export const sourceDefaults = [
  {
    code: "PMDA",
    name: "Pharmaceuticals and Medical Devices Agency",
    country_or_region: "Japan",
    official_base_url: "https://www.pmda.go.jp/",
    sync_frequency: 24,
  },
  {
    code: "FDA",
    name: "U.S. Food and Drug Administration",
    country_or_region: "United States",
    official_base_url: "https://www.fda.gov/",
    sync_frequency: 12,
  },
  {
    code: "EMA",
    name: "European Medicines Agency",
    country_or_region: "European Union",
    official_base_url: "https://www.ema.europa.eu/",
    sync_frequency: 12,
  },
  {
    code: "NMPA",
    name: "国家药品监督管理局",
    country_or_region: "China",
    official_base_url: "https://www.nmpa.gov.cn/",
    sync_frequency: 12,
  },
  {
    code: "CDE",
    name: "国家药监局药品审评中心",
    country_or_region: "China",
    official_base_url: "https://www.cde.org.cn/",
    sync_frequency: 12,
  },
  {
    code: "ICH",
    name: "International Council for Harmonisation",
    country_or_region: "International",
    official_base_url: "https://www.ich.org/",
    sync_frequency: 24,
  },
] as const;
