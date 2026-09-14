import type { Db } from "../db";
import { changeRepository } from "../repositories/change-repository";
import type { PromptRequest, ContextBlock } from "./generator";
function missing(): never {
  throw Object.assign(new Error("NOT_FOUND"), { code: "P2025" });
}
export async function buildContext(
  db: Db,
  q: PromptRequest,
): Promise<ContextBlock[]> {
  if (q.kind === "digest") {
    const d = await db.dailyDigest.findUnique({ where: { id: q.id } });
    if (!d) return missing();
    return [
      {
        label: "Context · DailyDigest",
        data: { id: d.id, date: d.digest_date, generated_at: d.generated_at },
      },
      {
        label:
          "BioReg System Summary · Digest / Watchlist Match (not official statements)",
        data: d.summary,
      },
    ];
  }
  const change =
    q.kind === "change"
      ? await db.changeEvent.findFirst({
          where: { id: q.id, regulation: { is_mock: false } },
        })
      : null;
  if (q.kind === "change" && !change) return missing();
  const id = change?.regulation_id || q.id;
  const r = await db.regulation.findFirst({ where: { id, is_mock: false } });
  if (!r) return missing();
  const blocks: ContextBlock[] = [
    {
      label:
        "Official Fact · Regulation (current record; historical versions separately labeled)",
      data: {
        id: r.id,
        regulator: r.regulator,
        title: r.title_original,
        document_number: r.document_number,
        document_type: r.document_type,
        status: r.status,
        publication_date: r.publication_date,
        effective_date: r.effective_date,
        official_summary: r.official_summary || "[Not supplied]",
        official_url: r.official_url,
      },
    },
    {
      label: "BioReg Translation",
      data: {
        title_zh: r.title_zh || "[Not supplied]",
        summary_zh: r.summary_zh || "[Not supplied]",
      },
    },
    {
      label: "BioReg Metadata · classification / analysis context only",
      data: {
        categories: r.categories,
        product_types: r.product_types,
        affected_departments: r.affected_departments,
      },
    },
  ];
  if (change)
    blocks.push({
      label: "BioReg System Summary · ChangeEvent deterministic detection",
      data: {
        id: change.id,
        previous_version_id: change.previous_version_id,
        current_version_id: change.current_version_id,
        change_types: change.change_types,
        changed_fields: change.changed_fields,
        sections: change.sections,
        change_summary: change.change_summary,
      },
    });
  if (q.kind === "comparison" || change) {
    const from = change?.previous_version_id || q.from;
    const to = change?.current_version_id || q.to;
    const repo = changeRepository(db);
    for (const [label, versionId] of [
      ["Version A", from],
      ["Version B", to],
    ]) {
      if (!versionId) {
        blocks.push({
          label: label + " · Official Fact",
          data: "[No previous version supplied]",
        });
        continue;
      }
      const v = await repo.version(id, versionId);
      if (!v) return missing();
      blocks.push({
        label:
          label +
          " · Official Fact captured snapshot / BioReg Internal Version",
        data: { id: v.id, version: v.version_name, detected_at: v.detected_at },
      });
      blocks.push({
        label: label + " · Available captured content",
        data: v.content_snapshot,
        body: true,
      });
    }
    if (from && to)
      blocks.push({
        label: "BioReg System Summary · deterministic version diff",
        data: await repo.compare(id, from, to),
      });
  } else
    blocks.push({
      label: "Official Fact · available captured content",
      data: r.content_text || "[Full text not available; metadata only]",
      body: true,
    });
  return blocks;
}
