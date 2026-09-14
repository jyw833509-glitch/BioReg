import { z } from "zod";
import { providers, templates, boundary } from "../../lib/external-ai";
export const promptRequest = z
  .object({
    kind: z.enum(["regulation", "change", "comparison", "digest"]),
    id: z.string().min(1).max(160),
    from: z.string().min(1).max(160).optional(),
    to: z.string().min(1).max(160).optional(),
    provider: z.string().default("deepseek"),
    template: z.string().default("explain"),
    level: z.enum(["compact", "standard", "detailed"]).default("standard"),
    language: z.enum(["Chinese", "English", "Bilingual"]).default("Chinese"),
  })
  .strict()
  .refine(
    (q) => q.kind !== "comparison" || !!(q.from && q.to && q.from !== q.to),
    { message: "请选择两个不同版本" },
  );
export type PromptRequest = z.infer<typeof promptRequest>;
export interface ContextBlock {
  label: string;
  data: unknown;
  body?: boolean;
}
export const limits = { compact: 6000, standard: 16000, detailed: 36000 };
export const truncation =
  "[Content truncated by BioReg due to prompt size limit]";
export function generate(
  q: PromptRequest,
  blocks: ContextBlock[],
  catalog = providers,
) {
  const provider = catalog.find((p) => p.id === q.provider && p.enabled);
  const template = templates.find(
    (t) =>
      t.id === q.template && t.enabled && t.applicable_context.includes(q.kind),
  );
  if (!provider || !template)
    throw new z.ZodError([
      {
        code: "custom",
        path: [],
        message: "Provider 或模板不适用于当前上下文",
      },
    ]);
  const max = limits[q.level];
  const context: string[] = [];
  let remaining = max;
  let truncated = false;
  // Reserve evidence metadata and deterministic diffs before allocating body text.
  for (const block of [...blocks].sort(
    (a, b) => Number(!!a.body) - Number(!!b.body),
  )) {
    if (block.body && q.level === "compact") {
      context.push(
        block.label + "\n[Content omitted by compact context policy]",
      );
      continue;
    }
    const text =
      typeof block.data === "string"
        ? block.data
        : JSON.stringify(block.data, null, 2);
    const cap = Math.min(
      remaining,
      block.body ? (q.level === "standard" ? 5000 : 22000) : 4500,
    );
    const clipped = text.length > cap;
    truncated ||= clipped;
    context.push(
      block.label +
        "\n" +
        text.slice(0, Math.max(0, cap)) +
        (clipped ? "\n" + truncation : ""),
    );
    remaining -= Math.min(text.length, cap);
  }
  const instructions =
    "Output language: " +
    q.language +
    ". " +
    (q.language === "English"
      ? "Use professional regulatory / CMC terminology."
      : q.language === "Bilingual"
        ? "English regulatory terminology + Chinese explanation."
        : "使用专业但清晰的中文。") +
    "\n" +
    template.template_body;
  const preview = context.join("\n\n");
  return {
    provider,
    template: {
      id: template.id,
      name: template.name,
      version: template.version,
    },
    truncated,
    context: preview,
    prompt: [
      "BioReg External AI Prompt",
      "Context: " + q.kind + " / " + q.id,
      "Source: Official Regulatory Data from BioReg",
      "Prompt Instructions\n" + instructions,
      "Evidence Boundary\n" + boundary,
      "BEGIN QUOTED EVIDENCE\n" + preview + "\nEND QUOTED EVIDENCE",
      "Output must label External AI Interpretation; verify against original official sources.",
    ].join("\n\n"),
  };
}
