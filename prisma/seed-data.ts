import { createHash } from "node:crypto";
import type { Db } from "../src/server/db";
import type {
  Prisma,
  DocumentType,
  RegulationStatus,
  Importance,
} from "../src/generated/prisma/client";
import { regulations } from "../src/lib/data";
import { documentCode, statusCode } from "../src/lib/labels";
import { sourceDefaults as sources } from "../src/server/scheduler/config";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function seedDatabase(client: Db) {
  await client.$transaction(
    async (tx) => {
      const now = new Date();
      const old = new Date(now.getTime() - 8 * 86400000);
      for (const source of sources)
        await tx.source.upsert({
          where: { code: source.code },
          update: {},
          create: {
            ...source,
            id: `source-${source.code.toLowerCase()}`,
            enabled: true,
          },
        });
      for (const r of regulations) {
        if (
          await tx.regulation.findUnique({
            where: { id: r.id },
            select: { id: true },
          })
        )
          continue;
        const data: Prisma.RegulationUncheckedCreateInput = {
          id: r.id,
          source_id: `source-${r.regulator.toLowerCase()}`,
          regulator: r.regulator,
          country_or_region: r.country_or_region,
          title_original: r.title_original,
          title_zh: r.title_zh,
          document_number: r.document_number,
          document_type: documentCode(r.document_type) as DocumentType,
          status: statusCode(r.status) as RegulationStatus,
          publication_date: new Date(r.publication_date),
          effective_date: null,
          updated_date: new Date(r.updated_date),
          official_url: null,
          canonical_url: null,
          pdf_url: null,
          source_page_url: null,
          official_summary: null,
          summary_zh: r.summary_zh,
          content_text: r.content_text,
          categories: r.categories,
          subcategories: r.subcategories,
          keywords: r.keywords,
          product_types: r.product_types,
          development_stages: r.development_stages,
          affected_departments: r.affected_departments,
          importance_level: r.importance_level.toUpperCase() as Importance,
          version: r.version,
          is_current_version: true,
          is_new: r.is_new,
          is_updated: r.is_updated,
          content_hash: hash(r.content_text),
          source_hash: hash(
            JSON.stringify({
              mock: true,
              title: r.title_original,
              status: r.status,
            }),
          ),
          first_detected_at: r.is_updated ? old : now,
          last_checked_at: null,
          is_mock: true,
        };
        await tx.regulation.create({ data });
        for (const [index, v] of r.versions.entries())
          await tx.regulationVersion.create({
            data: {
              id: v.id,
              regulation_id: r.id,
              version_name: v.version_name,
              document_url: null,
              pdf_url: null,
              publication_date: new Date(v.publication_date),
              detected_at: index === 0 && r.is_updated ? old : now,
              status: statusCode(v.status) as RegulationStatus,
              content_hash: hash(v.content_snapshot),
              source_hash: hash(`Development / Mock Data:${v.id}`),
              content_snapshot: v.content_snapshot,
              previous_version_id: v.previous_version_id,
              change_detected: v.change_detected,
            },
          });
        if (r.previous_version_id)
          await tx.regulation.update({
            where: { id: r.id },
            data: { previous_version_id: r.previous_version_id },
          });
      }
      for (const source of sources.filter((s) => s.code !== "PMDA"))
        await tx.syncLog.upsert({
          where: { id: `mock-log-${source.code}` },
          update: {},
          create: {
            id: `mock-log-${source.code}`,
            source_id: `source-${source.code.toLowerCase()}`,
            started_at: now,
            finished_at: now,
            status: "SUCCESS",
            records_found: 3,
            records_new: 3,
            records_updated: 0,
            records_failed: 0,
            error_message:
              "Development / Mock Data — seed example only; no source was contacted.",
            is_mock: true,
          },
        });
      await tx.watchlist.upsert({
        where: { id: "mock-watch-cmc" },
        update: {},
        create: {
          id: "mock-watch-cmc",
          name: "Biologics CMC",
          description: "Development / Mock Data · 单用户关注示例",
          regulators: ["FDA", "EMA", "NMPA", "CDE", "ICH"],
          categories: ["CMC / Quality"],
          subcategories: ["Comparability", "Process Validation"],
          product_types: ["Monoclonal Antibody", "Biosimilar"],
          development_stages: ["BLA / MAA"],
          document_types: ["FINAL_GUIDANCE", "DRAFT_GUIDANCE"],
          keywords: ["Viral Safety"],
          importance_levels: ["CRITICAL", "HIGH"],
          enabled: true,
        },
      });
    },
    { timeout: 30000 },
  );
}
