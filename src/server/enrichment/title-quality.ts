import { createHash } from "node:crypto";

export const titleHash = (value: string) =>
  createHash("sha256").update(value.normalize("NFC")).digest("hex");

/** Conservative gates supplement sample review; they do not establish official facts. */
export function translationIssues(original: string, translated: string) {
  const issues: string[] = [];
  if (!/[\u3400-\u9fff]/u.test(translated)) issues.push("no_chinese");
  if (translated.length > 2000 || !translated.trim())
    issues.push("invalid_length");
  if (
    /\b(the|of|for|from|between|considerations|guideline|products|testing)\b/i.test(
      translated,
    )
  )
    issues.push("untranslated_words");
  const numbers = (s: string) => (s.match(/\d+/g) || []).sort().join("|");
  if (numbers(original) !== numbers(translated)) issues.push("number_mismatch");
  const terms: [RegExp, RegExp][] = [
    [/biosimilars?\b/i, /生物类似药/],
    [/biosimilarity/i, /生物相似性/],
    [/endotoxins?/i, /内毒素/],
    [/immunogenicity/i, /免疫原性/],
    [/therapeutic proteins?/i, /治疗性蛋白/],
    [/early consideration/i, /初步考虑/],
    [/cell lines?/i, /细胞系/],
    [/reference products?/i, /参照制剂|参比制剂/],
    [/sterility/i, /无菌/],
    [/potency/i, /效价|效力/],
    [/mycoplasma/i, /支原体/],
    [/pharmacokinetics/i, /药代动力学/],
    [/homeopathic/i, /顺势疗法/],
    [/performance status/i, /体能状态/],
    [/shedding/i, /脱落|排出/],
    [/unrelated allogeneic/i, /非亲缘同种异体/],
    [/active immunotherapy/i, /主动免疫治疗/],
  ];
  for (const [source, target] of terms)
    if (source.test(original) && !target.test(translated))
      issues.push(`terminology:${source.source}`);
  if (/生物不同物|不同生物|分析筛滤|家庭药|性能状态/.test(translated))
    issues.push("known_mistranslation");
  return issues;
}

export function retainTitleProvenance(
  original: string,
  previous: Record<string, unknown>,
  incoming: Record<string, unknown>,
) {
  const provenance = previous.bioreg_title_translation;
  if (
    provenance &&
    typeof provenance === "object" &&
    !Array.isArray(provenance) &&
    (provenance as Record<string, unknown>).original_sha256 ===
      titleHash(original)
  )
    return { ...incoming, bioreg_title_translation: provenance };
  return incoming;
}
