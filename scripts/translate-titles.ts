import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { directDb } from "../src/server/direct-db";
import { titleHash } from "../src/server/enrichment/title-quality";
import {
  reviewedTitle,
  officialChineseTitle,
  validTitleApproval,
  canUpgradeAutomaticTitle,
  type TitleApproval,
} from "../src/server/enrichment/title-review";
import type { Prisma } from "../src/generated/prisma/client";
async function main() {
  const db = directDb();
  try {
    mkdirSync(".data", { recursive: true });
    if (process.argv[2] === "export") {
      const rows = await db.regulation.findMany({
        where: { is_mock: false },
        select: {
          id: true,
          title_original: true,
          title_zh: true,
          regulator: true,
          official_url: true,
          pdf_url: true,
          attachment_urls: true,
          document_number: true,
          publication_date: true,
          publication_date_raw: true,
          effective_date: true,
          status: true,
          source_metadata: true,
        },
        orderBy: { id: "asc" },
      });
      writeFileSync(".data/title-input.json", JSON.stringify(rows));
      console.log(JSON.stringify({ pending: rows.length }));
    } else if (process.argv[2] === "prepare-reviewed") {
      const input = JSON.parse(readFileSync(".data/title-input.json", "utf8"));
      const official = JSON.parse(
        readFileSync(".data/official-chinese-titles.json", "utf8"),
      );
      const rows: TitleApproval[] = [];
      for (const row of input) {
        const publication =
          row.regulator === "NMPA"
            ? officialChineseTitle(row.title_original)
            : null;
        const found =
          publication ||
          official.find(
            (r: { id: string; title_original: string }) =>
              r.id === row.id && r.title_original === row.title_original,
          );
        const reviewed = reviewedTitle(row.title_original);
        if (!found && !reviewed) continue;
        const value = found || reviewed;
        if (row.title_zh && !canUpgradeAutomaticTitle(row.title_original, row.title_zh, row.source_metadata || {}, {
          method: publication ? "official_publication" : found ? "official_catalog" : "reviewed_local_model",
          translation: value.translation,
        })) continue;
        rows.push({
          id: row.id,
          title_original: row.title_original,
          translation: value.translation,
          reviewed_sha256: titleHash(
            row.title_original + "\n" + value.translation,
          ),
          method: publication
            ? "official_publication"
            : found
              ? "official_catalog"
              : "reviewed_local_model",
          model: value.model || null,
          revision: value.revision || null,
          review: "terminology_and_full_title_review",
          ...(found
            ? {
                source_url: found.source_url,
                publisher: found.publisher,
                catalog_code: found.catalog_code || null,
              }
            : {}),
        });
      }
      writeFileSync(
        ".data/title-approved.json",
        JSON.stringify({ schema: 1, batch: "reviewed-titles-v1", rows }),
      );
      console.log(
        JSON.stringify({
          approved: rows.length,
          unreviewed:
            input.filter((r: { title_zh: string }) => !r.title_zh).length -
            rows.length,
        }),
      );
    } else if (process.argv[2] === "prepare-generated") {
      const candidates = JSON.parse(
        readFileSync(".data/title-output.json", "utf8"),
      );
      const rows: TitleApproval[] = candidates
        .filter((r: { method?: string }) => !r.method)
        .map((r: TitleApproval) => ({
          ...r,
          reviewed_sha256: titleHash(r.title_original + "\n" + r.translation),
          method: "local_model_quality_checked",
          review: "automated_terminology_numbers_and_abbreviation_checks",
        }))
        .filter(validTitleApproval);
      writeFileSync(
        ".data/title-approved.json",
        JSON.stringify({
          schema: 1,
          batch: "automatic-" + new Date().toISOString().slice(0, 10),
          rows,
        }),
      );
      console.log(
        JSON.stringify({
          automaticApproved: rows.length,
          pendingReview: candidates.length - rows.length,
        }),
      );
    } else if (process.argv[2] === "rollback") {
      const batch = process.argv[3];
      if (!batch || !/^[a-zA-Z0-9_-]{1,80}$/.test(batch))
        throw new Error("BATCH_REQUIRED");
      let restored = 0,
        skipped = 0;
      const rows = await db.regulation.findMany({
        where: { is_mock: false },
        select: { id: true, source_id: true },
      });
      for (const row of rows)
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${row.source_id}))::text`;
          const current = await tx.regulation.findUniqueOrThrow({
            where: { id: row.id },
          });
          const meta = current.source_metadata as Record<
            string,
            Prisma.InputJsonValue
          >;
          const proof = meta.bioreg_title_translation as
            Record<string, Prisma.InputJsonValue> | undefined;
          if (proof?.batch !== batch) return;
          if (
            proof.original_sha256 !== titleHash(current.title_original) ||
            proof.translation_sha256 !== titleHash(current.title_zh || "")
          ) {
            skipped++;
            return;
          }
          const next = { ...meta };
          if (proof.previous_provenance)
            next.bioreg_title_translation = proof.previous_provenance;
          else delete next.bioreg_title_translation;
          await tx.regulation.update({
            where: { id: row.id },
            data: {
              title_zh: String(proof.previous_title_zh || ""),
              source_metadata: next,
              updated_at: current.updated_at,
            },
          });
          restored++;
        });
      console.log(JSON.stringify({ restored, skipped }));
    } else if (process.argv[2] === "import") {
      // Candidate output is deliberately not an import format. A reviewed, hashed
      // manifest is required, so a successful model job cannot silently publish it.
      const manifest = JSON.parse(
        readFileSync(".data/title-approved.json", "utf8"),
      ) as {
        schema: number;
        batch: string;
        rows: TitleApproval[];
      };
      if (
        manifest.schema !== 1 ||
        !/^[a-zA-Z0-9_-]{1,80}$/.test(manifest.batch)
      )
        throw new Error("REVIEW_MANIFEST_REQUIRED");
      const rows = manifest.rows;
      if (new Set(rows.map((r) => r.id)).size !== rows.length)
        throw new Error("DUPLICATE_REVIEW");
      for (const row of rows) {
        if (!validTitleApproval(row))
          throw new Error("TITLE_QUALITY_GATE_FAILED");
      }
      let updated = 0;
      for (const row of rows) {
        const initial = await db.regulation.findUnique({
          where: { id: row.id },
          select: { source_id: true },
        });
        if (!initial) throw new Error("REVIEWED_RECORD_NOT_FOUND");
        await db.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.source_id}))::text`;
          const current = await tx.regulation.findUniqueOrThrow({
            where: { id: row.id },
          });
          if (current.is_mock || current.title_original !== row.title_original)
            throw new Error("REVIEWED_TITLE_CHANGED");
          const meta = current.source_metadata as Prisma.InputJsonObject;
          if (current.title_zh && !canUpgradeAutomaticTitle(current.title_original, current.title_zh, meta, row)) return;
          if (
            row.method === "official_catalog" &&
            (current.regulator !== "ICH" ||
              (meta.guideline_code || current.document_number) !==
                row.catalog_code)
          )
            throw new Error("OFFICIAL_CATALOG_IDENTITY_MISMATCH");
          const proof = {
            batch: manifest.batch,
            original_sha256: titleHash(row.title_original),
            translation_sha256: titleHash(row.translation),
            method: row.method,
            source_url: row.source_url || null,
            publisher: row.publisher || null,
            catalog_code: row.catalog_code || null,
            model: row.model,
            revision: row.revision,
            review: row.review,
            translated_at: new Date().toISOString(),
            previous_title_zh: current.title_zh,
            previous_provenance: meta.bioreg_title_translation || null,
          };
          // Save rollback material before mutation, and also retain it with the row.
          writeFileSync(
            `.data/title-rollback-${manifest.batch}-${row.id}.json`,
            JSON.stringify({ id: row.id, ...proof }),
          );
          await tx.regulation.update({
            where: { id: row.id },
            data: {
              title_zh: row.translation,
              source_metadata: { ...meta, bioreg_title_translation: proof },
              updated_at: current.updated_at,
            },
          });
          updated++;
        });
      }
      console.log(
        JSON.stringify({ translated: updated, officialFactsModified: false }),
      );
    } else throw new Error("INVALID_MODE");
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("TITLE_TRANSLATION_FAILED (credentials suppressed)");
  process.exitCode = 1;
});
