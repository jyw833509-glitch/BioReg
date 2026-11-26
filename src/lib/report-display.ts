import type { ReportQuery } from "../server/reports/data";

export const reportNames: Record<ReportQuery["type"], string> = {
  regulations: "法规清单报告",
  changes: "法规变更报告",
  comparison: "系统记录版本对比",
  digest: "汇总报告（周汇总／历史日报）",
  watchlist: "关注匹配报告",
  summary: "法规情报汇总",
  sources: "来源运行情况报告",
  versions: "历史版本报告",
  notifications: "站内通知报告",
};

export const reportDates: Record<
  ReportQuery["type"],
  { label: string; hint: string }
> = {
  regulations: {
    label: "法规发布日期",
    hint: "按法规发布日期筛选（UTC，含起止日）。设置日期范围后，不包含发布日期尚未核实的记录。",
  },
  summary: {
    label: "法规发布日期",
    hint: "按法规发布日期筛选（UTC，含起止日）。统计仅基于本次选中的记录，不代表全库总量。",
  },
  changes: {
    label: "变更发现日期",
    hint: "按系统发现法规变化的日期筛选（UTC，含起止日），并非文件发布日期。",
  },
  versions: {
    label: "版本发现日期",
    hint: "按系统发现并保存版本的日期筛选（UTC，含起止日），并非官方版本发布日期。",
  },
  comparison: {
    label: "",
    hint: "选择同一法规的两个不同系统记录版本进行对比，不使用日期筛选。对比仅覆盖已采集内容。",
  },
  digest: {
    label: "汇总归属日期",
    hint: "按汇总保存的归属日期筛选（含起止日）。周汇总使用记录标记的周一日期；所覆盖的统计时段及原时区见预览，不按生成时间或时段交集筛选。",
  },
  watchlist: {
    label: "关注事件发现日期",
    hint: "按匹配记录中的事件发现日期筛选（UTC，含起止日），并非创建关注规则的日期。",
  },
  notifications: {
    label: "通知创建日期",
    hint: "按站内通知创建日期筛选（UTC，含起止日），并非阅读日期或法规发布日期。",
  },
  sources: {
    label: "同步开始日期",
    hint: "日期仅筛选同步运行记录（UTC，含起止日）。来源列表及当前状态不随日期范围改变；每个来源最多显示最近 10 次运行。",
  },
};

export const reportLabels: Record<string, string> = {
  title_original: "原文标题",
  title_zh: "中文标题",
  document_number: "文件编号",
  document_type: "文件类型",
  status: "状态",
  publication_date: "发布日期",
  effective_date: "生效日期",
  updated_date: "更新日期",
  official_url: "官方原文",
  pdf_url: "官方 PDF",
  attachment_urls: "官方附件",
  issuing_offices: "发布部门",
  official_topics: "官方主题",
  docket_number: "案卷编号",
  official_summary: "官方摘要（原文）",
  content_text: "已采集文本",
  country_or_region: "国家或地区",
  categories: "主题分类",
  product_types: "产品类型",
  development_stages: "研发阶段",
  importance_level: "重要程度",
  severity: "重要程度",
  version: "系统记录版本",
  detected_at: "发现时间",
  name: "名称",
  enabled: "已启用",
  regulators: "监管机构",
  description: "说明",
  keywords: "关键词",
  match_type: "匹配类型",
  reasons: "匹配依据",
  current_status: "当前运行状态",
  last_sync_at: "最近同步时间",
  last_success_at: "最近成功时间",
  last_failure_at: "最近失败时间",
  started_at: "开始时间",
  finished_at: "结束时间",
  records_found: "发现文件数",
  records_new: "新增数",
  records_updated: "更新数",
  records_failed: "失败数",
  error_message: "失败原因",
  notification_type: "通知类型",
  delivery_status: "投递状态",
  read_at: "阅读时间",
  title: "标题",
  message: "通知内容",
  date: "汇总归属日期",
  timezone: "记录时区",
  period: "汇总周期",
  window_start: "统计开始（含）",
  window_end: "统计结束（不含）",
  new_count: "首次收录数",
  updated_count: "更新文件数",
  severity_counts: "保存时的重要程度统计（高含紧急）",
  by_regulator: "机构分布",
  by_topic: "主题分布",
  watchlist_counts: "关注规则匹配数",
  watchlist_matches: "关注匹配记录",
  new_regulations: "首次收录法规",
  updated_regulations: "发生变化的法规",
  high_priority: "重点变化",
  source_health: "保存时的来源状态",
  code: "来源",
  regulator: "发布机构",
  importance: "重要程度",
  summary: "系统记录说明",
  change_types: "变化类型",
  id: "记录 ID",
  watchlist_id: "关注规则 ID",
  regulation_id: "法规 ID",
  event_id: "变更 ID",
  type: "匹配类型",
  detail_url: "法规详情",
  regulator_filter: "监管机构",
  region: "地区",
  category: "主题分类",
  subcategory: "子分类",
  product_type: "产品类型",
  development_stage: "研发阶段",
  affected_department: "涉及部门",
  change_type: "变化类型",
  keyword: "关键词",
};

const valueLabels: Record<string, string> = {
  CRITICAL: "紧急",
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
  UNKNOWN: "状态待核实",
  DRAFT: "征求意见稿",
  FINAL: "正式发布",
  EFFECTIVE: "已生效",
  REVISED: "已修订",
  SUPERSEDED: "已被替代",
  WITHDRAWN: "已撤回",
  UNDER_CONSULTATION: "征求意见中",
  ARCHIVED: "已归档",
  FINAL_GUIDANCE: "最终指南",
  DRAFT_GUIDANCE: "指南征求意见稿",
  GUIDELINE: "指南",
  REVISED_GUIDELINE: "修订指南",
  QA: "问答",
  REFLECTION_PAPER: "思考文件",
  CONCEPT_PAPER: "概念文件",
  POSITION_PAPER: "立场文件",
  RECOMMENDATION: "建议",
  TECHNICAL_GUIDELINE: "技术指导原则",
  NOTICE: "通知",
  ANNOUNCEMENT: "公告",
  REGULATION: "法规",
  REGULATION_AMENDMENT: "法规修订",
  CONSULTATION_DRAFT: "征求意见稿",
  OTHER: "其他",
  HEALTHY: "正常",
  DEGRADED: "受限",
  UNAVAILABLE: "不可用",
  DISABLED: "已停用",
  SUCCESS: "成功",
  PARTIAL_SUCCESS: "部分成功",
  FAILED: "失败",
  RUNNING: "执行中",
  SKIPPED: "已跳过",
  NOT_RUN: "尚未运行",
  PENDING: "待处理",
  SENT: "已发送",
  DELIVERED: "已投递",
  IN_APP: "站内通知",
  SOURCE_HEALTH: "来源运行情况变化",
  CHANGE_EVENT: "法规变化匹配",
  NEW_REGULATION: "首次收录匹配",
  weekly: "周汇总",
  daily: "日报",
  NEW: "首次收录",
  UPDATED: "发生变化",
  CHANGE: "变化匹配",
  NEW_DOCUMENT: "首次收录",
  METADATA_CHANGED: "基本信息变化",
  TITLE_CHANGED: "标题变化",
  STATUS_CHANGED: "状态变化",
  DRAFT_TO_FINAL: "征求意见稿转正式发布",
  FINAL_TO_REVISED: "正式文件修订",
  PUBLICATION_DATE_CHANGED: "发布日期变化",
  EFFECTIVE_DATE_CHANGED: "生效日期变化",
  PDF_CHANGED: "PDF 变化",
  ATTACHMENT_CHANGED: "附件变化",
  CONTENT_CHANGED: "正文变化",
  SECTION_ADDED: "新增章节",
  SECTION_REMOVED: "移除章节",
  SECTION_MODIFIED: "章节修改",
  DOCUMENT_WITHDRAWN: "文件撤回",
  DOCUMENT_SUPERSEDED: "文件被替代",
  UNKNOWN_CHANGE: "变化待核实",
  Added: "新增",
  Removed: "移除",
  Modified: "修改",
  "New official document discovered by BioReg.": "BioReg 首次收录此官方文件。",
  "No field restrictions": "未限制匹配条件",
  "Official content hash changed.": "已采集官方内容的校验值发生变化。",
  "Legacy snapshot is not structured; inspect original snapshots.":
    "旧版记录缺少结构化信息，暂无法生成字段对比。",
};

export function reportText(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "Not disclosed / Not available"
  )
    return "未提供";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value !== "string" && typeof value !== "number") return "未提供";
  const text = String(value);
  if (text.startsWith("severity >= "))
    return "重要程度不低于" + reportText(text.slice(12));
  const reason = text.match(
    /^(regulator|region|category|subcategory|product_type|development_stage|affected_department|document_type|status|importance|change_type|keyword): (.+)$/,
  );
  if (reason)
    return (
      (reportLabels[reason[1]] || reason[1]) +
      "：" +
      reason[2].split(", ").map(reportText).join("、")
    );
  return valueLabels[text] || text;
}

export function reportTime(value: unknown, dateOnly = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value))
    return reportText(value);
  if (dateOnly) return value.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

export function reportError(error: {
  code?: string;
  error?: string;
  issues?: { field?: string }[];
}) {
  const code = error.code || error.error;
  if (code === "REPORT_TOO_LARGE")
    return "报告超过大小上限，请缩小日期范围或减少记录数后重试。";
  if (code === "NOT_FOUND") return "所选法规或版本暂不可用，请重新选择。";
  if (code === "INVALID_PARAMETERS") {
    const field = error.issues?.[0]?.field || "";
    if (["start", "end"].includes(field))
      return "请填写有效的起止日期，结束日期不能早于开始日期。";
    if (["from", "to"].includes(field))
      return "请选择同一法规的两个不同系统记录版本。";
    if (field === "limit") return "导出条数须为 1 至 100 的整数。";
    return "筛选条件无效，请检查当前报告类型支持的选项后重试。";
  }
  return "报告暂时无法生成，请稍后重试。";
}
