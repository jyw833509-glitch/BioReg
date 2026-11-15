import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { directDb } from "../src/server/direct-db";
import {
  titleHash,
  translationIssues,
} from "../src/server/enrichment/title-quality";
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
          effective_date: true,
          status: true,
          source_metadata: true,
        },
        orderBy: { id: "asc" },
      });
      writeFileSync(".data/title-input.json", JSON.stringify(rows));
      console.log(JSON.stringify({ pending: rows.length }));
    } else if (process.argv[2] === "import") {
      // Candidate output is deliberately not an import format. A reviewed, hashed
      // manifest is required, so a successful model job cannot silently publish it.
      const manifest = JSON.parse(
        readFileSync(".data/title-approved.json", "utf8"),
      ) as {
        schema: number;
        batch: string;
        rows: {
          id: string;
          title_original: string;
          translation: string;
          reviewed_sha256: string;
          model: string;
          revision: string;
          review: string;
        }[];
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
        if (
          row.review !== "terminology_and_full_title_review" ||
          row.reviewed_sha256 !==
            titleHash(row.title_original + "\n" + row.translation) ||
          translationIssues(row.title_original, row.translation).length
        )
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
          if (current.title_zh) return; // Never replace existing official/reviewed Chinese text.
          const meta = current.source_metadata as Prisma.InputJsonObject;
          const proof = {
            batch: manifest.batch,
            original_sha256: titleHash(row.title_original),
            translation_sha256: titleHash(row.translation),
            method: "reviewed_local_model",
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
