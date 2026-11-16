import reviewed from "./reviewed-titles.json";
import publications from "./official-chinese-publications.json";
import { titleHash, translationIssues } from "./title-quality";

export interface TitleApproval {
  id: string;
  title_original: string;
  translation: string;
  reviewed_sha256: string;
  method:
    | "reviewed_local_model"
    | "official_catalog"
    | "official_publication"
    | "local_model_quality_checked";
  model: string | null;
  revision: string | null;
  review: string;
  source_url?: string;
  publisher?: string;
  catalog_code?: string;
  issues?: string[];
}
export const officialChineseTitle = (original: string) =>
  publications.find((r) => r.original === original);
export function canUpgradeAutomaticTitle(
  original: string,
  current: string,
  metadata: Record<string, unknown>,
  approval: Pick<TitleApproval, "method" | "translation">,
) {
  const proof = metadata.bioreg_title_translation as Record<string, unknown> | undefined;
  return proof?.method === "local_model_quality_checked" &&
    proof.original_sha256 === titleHash(original) &&
    proof.translation_sha256 === titleHash(current) &&
    approval.method !== "local_model_quality_checked" &&
    approval.translation !== current;
}
const catalog = new Map(reviewed.map((r) => [r.original, r]));
export function reviewedTitle(original: string) {
  const r = catalog.get(original);
  if (
    !r ||
    r.reviewed_sha256 !== titleHash(original + "\n" + r.translation) ||
    translationIssues(original, r.translation).length
  )
    return null;
  return r;
}
export function validTitleApproval(row: TitleApproval) {
  if (
    row.reviewed_sha256 !==
    titleHash(row.title_original + "\n" + row.translation)
  )
    return false;
  if (row.method === "official_publication") {
    const p = officialChineseTitle(row.title_original);
    return (
      !!p &&
      p.translation === row.translation &&
      p.source_url === row.source_url &&
      p.publisher === row.publisher
    );
  }
  if (row.method === "local_model_quality_checked") {
    return (
      row.model === "Qwen/Qwen3-8B-GGUF" &&
      row.revision === "7c41481f57cb95916b40956ab2f0b139b296d974" &&
      row.review === "automated_terminology_numbers_and_abbreviation_checks" &&
      Array.isArray(row.issues) &&
      row.issues.length === 0 &&
      translationIssues(row.title_original, row.translation).length === 0 &&
      (row.title_original.match(/\b[A-Z]{2,}\b/g) || []).every((term) =>
        row.translation.includes(term),
      )
    );
  }
  if (row.method === "official_catalog") {
    try {
      const url = new URL(row.source_url || "");
      return (
        url.protocol === "https:" &&
        url.hostname === "ypjg.ln.gov.cn" &&
        !url.username &&
        !url.password &&
        !url.port &&
        url.pathname.startsWith("/ypjg/ztzl/ypyfcxxxfw/zcfgzq/ichzdyz") &&
        row.publisher === "辽宁省药品监督管理局" &&
        /^[QSEM]\d+[A-Z]?(?:\(R\d+\))?$/.test(row.catalog_code || "") &&
        /[\u3400-\u9fff]/u.test(row.translation)
      );
    } catch {
      return false;
    }
  }
  const match = reviewedTitle(row.title_original);
  return (
    row.method === "reviewed_local_model" &&
    row.review === "terminology_and_full_title_review" &&
    match?.translation === row.translation &&
    match.model === row.model &&
    match.revision === row.revision
  );
}
