import { officialUrl } from "../shared/url";
import { text } from "../shared/normalizer";
import type { Candidate, Document } from "../shared/types";
import { config } from "./config";
import { z } from "zod";
const itemSchema = z.object({
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  details: z
    .object({
      stepDate: z.string().optional(),
      stepDateLabel: z.string().optional(),
    })
    .optional(),
  fileGroups: z
    .array(
      z.object({
        title: z.string(),
        files: z
          .array(z.object({ uri: z.string(), title: z.string() }))
          .default([]),
      }),
    )
    .default([]),
});
export function parseList(body: string, url: string): Candidate[] {
  const root: unknown = JSON.parse(body);
  const result: Candidate[] = [];
  const alias = new URL(url).searchParams.get("alias");
  if (!alias) throw new Error("Missing ICH category alias");
  const publicUrl = `https://www.ich.org${alias}`;
  const category = alias.split("/").pop()!.replace("-guidelines", "");
  function walk(value: unknown) {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (
      (node.entityInfo as { bundle?: string })?.bundle === "guideline" &&
      Array.isArray(node.items)
    )
      for (const raw of node.items) {
        const parsed = itemSchema.safeParse(raw);
        if (!parsed.success) continue;
        const item = parsed.data;
        // Supplemental papers have their own identities and do not inherit the
        // parent guideline's Step or adoption date.
        for (const group of item.fileGroups) {
          if (
            /^guideline$/i.test(group.title) ||
            /training|presentation/i.test(group.title)
          )
            continue;
          for (const file of group.files) {
            if (
              !/concept paper|reflection paper|q&a|questions.*answers/i.test(
                file.title,
              )
            )
              continue;
            const attachment = officialUrl(file.uri, url, config.hosts);
            const d: Document = {
              title: file.title,
              url: publicUrl,
              canonicalUrl: attachment,
              sourcePage: url,
              type: file.title,
              status: "",
              attachments: [attachment],
              topics: [category],
              metadata: {
                parent_guideline_code: item.code,
                file_group: group.title,
                independent_document: true,
              },
            };
            result.push({
              url: attachment,
              title: d.title,
              context: category,
              document: d,
            });
          }
        }
        const group = item.fileGroups.find((g) => /^guideline$/i.test(g.title));
        if (!group?.files.length) continue;
        const attachments = group.files.map((f) =>
          officialUrl(f.uri, url, config.hosts),
        );
        const stableCode = item.code.replace(/\(R\d+\)/g, "");
        if (!/^[QSEM]\d+[A-Z]?$/.test(stableCode)) continue;
        const d: Document = {
          title: item.title,
          url: publicUrl,
          canonicalUrl: attachments[0],
          sourcePage: url,
          documentNumber: stableCode,
          type: group.title,
          status: item.status || "",
          attachments,
          summary: item.description ? text(item.description) : null,
          topics: [category],
          metadata: {
            guideline_code: item.code,
            current_step: item.status || null,
            revision: item.code.match(/\(R\d+\)/)?.[0] || null,
            adoption_date_raw: item.details?.stepDate || null,
            adoption_date_label: item.details?.stepDateLabel
              ? text(item.details.stepDateLabel)
              : null,
          },
        };
        // Step date is adoption metadata, not a claimed publication date.
        result.push({
          url: attachments[0],
          title: d.title,
          context: category,
          document: d,
        });
      }
    for (const v of Object.values(node)) if (typeof v === "object") walk(v);
  }
  walk(root);
  return result;
}
export function parseDetail(
  _body: string,
  _url: string,
  c: Candidate,
  _source: string,
): Document {
  void _source;
  if (!c.document)
    throw new Error(
      "ICH guideline not present in current official category response",
    );
  return c.document;
}
