import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { directDb } from "../src/server/direct-db";
import {
  buildFieldReview,
  type EvidenceCheck,
} from "../src/server/enrichment/field-review";
import approved from "../src/server/enrichment/reviewed-official-fields.json";
import { titleHash } from "../src/server/enrichment/title-quality";
import { fingerprints } from "../src/server/changes/detect";
import {
  nmpaAnnouncementCandidates,
  emaTitleVersion,
  pmdaCoverCandidates,
  type FieldCandidate,
} from "../src/server/enrichment/official-fields";
import type { Prisma } from "../src/generated/prisma/client";

async function main() {
  const evidence = new Map(
    readdirSync(".data/official-field-evidence")
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const e = JSON.parse(
          readFileSync(`.data/official-field-evidence/${f}`, "utf8"),
        );
        return [e.url, e];
      }),
  );
  const db = directDb();
  const counts: Record<string, number> = { reviewed: 0 };
  try {
    const ids = await db.regulation.findMany({
      where: { is_mock: false },
      select: { id: true, source_id: true },
    });
    for (const id of ids)
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${id.source_id}))::text`;
        const row = await tx.regulation.findUniqueOrThrow({
          where: { id: id.id },
        });
        const urls = [
          ...new Set(
            [row.official_url, row.pdf_url, ...row.attachment_urls].filter(
              Boolean,
            ),
          ),
        ] as string[];
        const checks = urls.map((u) => evidence.get(u)).filter(Boolean);
        if (!checks.length) return;
        const reviewed = approved.find(
          (r) =>
            r.title_original === row.title_original &&
            r.official_url === row.official_url &&
            r.pdf_url === row.pdf_url,
        );
        let candidates: FieldCandidate[] = (reviewed?.fields ||
          []) as FieldCandidate[];
        const html = evidence.get(row.official_url);
        const pdf = evidence.get(row.pdf_url);
        // New records use the same narrowly scoped parsers; ambiguous dates stay unresolved.
        if (
          !reviewed &&
          row.regulator === "NMPA" &&
          html?.outcome === "captured_for_review"
        )
          candidates = nmpaAnnouncementCandidates(row.title_original, html);
        if (
          !reviewed &&
          row.regulator === "PMDA" &&
          pdf?.kind === "pdf" &&
          pdf.outcome === "captured_for_review"
        ) {
          const years = row.title_original.match(/\b(?:19|20)\d{2}\b/g) || [];
          candidates = pmdaCoverCandidates(pdf).filter(
            (c) =>
              c.field !== "publication_date" ||
              (new Set(years).size === 1 && years[0] === c.value.slice(0, 4)),
          );
        }
        const meta = {
          ...(row.source_metadata as Record<string, Prisma.InputJsonValue>),
        };
        if (row.regulator === "EMA" && row.official_url)
          candidates.push(
            ...emaTitleVersion(row.title_original, row.official_url, meta),
          );
        const previousProof = meta.bioreg_field_enrichment as
          Record<string, Prisma.InputJsonValue> | undefined;
        const values = {
          ...((previousProof?.values as Record<string, string>) || {}),
        };
        const verified: FieldCandidate[] = [];
        const updates: Prisma.RegulationUpdateInput = {};
        for (const c of candidates) {
          const checked = evidence.get(c.source_url);
          const verifiedTitle =
            c.basis === "previously_verified_official_title_sha256" &&
            c.content_sha256 === titleHash(row.title_original) &&
            row.regulator === "EMA";
          if (
            !urls.includes(c.source_url) ||
            (!verifiedTitle &&
              (checked?.outcome !== "captured_for_review" ||
                checked.content_sha256 !== c.content_sha256))
          )
            continue;
          if (c.field === "official_version") {
            if (meta.official_version || meta.revision) continue;
            meta.official_version = c.value;
          } else if (c.field === "status") {
            if (row.status !== "UNKNOWN" || c.value !== "FINAL") continue;
            updates.status = "FINAL";
          } else {
            if (row[c.field]) continue;
            if (c.field === "document_number")
              updates.document_number = c.value.trim();
            else updates[c.field] = new Date(c.value + "T00:00:00.000Z");
          }
          verified.push(c);
          values[c.field] = c.value;
          counts[c.field] = (counts[c.field] || 0) + 1;
        }
        const time = new Date().toISOString();
        if (verified.length) {
          const prior = {
            document_number: row.document_number,
            publication_date: row.publication_date?.toISOString() || null,
            effective_date: row.effective_date?.toISOString() || null,
            status: row.status,
            official_version:
              (row.source_metadata as Record<string, unknown>)
                .official_version || null,
          };
          writeFileSync(
            `.data/field-rollback-${row.id}.json`,
            JSON.stringify({ id: row.id, prior, verified }),
          );
          meta.bioreg_field_enrichment = JSON.parse(
            JSON.stringify({
              original_sha256: titleHash(row.title_original),
              values,
              changes: [
                ...(Array.isArray(previousProof?.changes)
                  ? previousProof.changes
                  : []),
                {
                  at: time,
                  kind: "metadata_backfill_not_new_regulatory_change",
                  prior,
                  verified,
                },
              ],
            }),
          );
        }
        const next = { ...row, ...updates, source_metadata: meta };
        meta.bioreg_field_review = JSON.parse(
          JSON.stringify(
            buildFieldReview(
              {
                ...row,
                document_number:
                  typeof updates.document_number === "string"
                    ? updates.document_number
                    : row.document_number,
                publication_date:
                  updates.publication_date || row.publication_date,
                effective_date: updates.effective_date || row.effective_date,
                status:
                  typeof updates.status === "string"
                    ? updates.status
                    : row.status,
                source_metadata: meta,
              },
              checks as EvidenceCheck[],
              time,
            ),
          ),
        );
        await tx.regulation.update({
          where: { id: row.id },
          data: {
            ...updates,
            source_metadata: meta,
            ...(verified.length ? fingerprints(next) : {}),
            updated_at: row.updated_at,
          },
        });
        counts.reviewed++;
      });
    writeFileSync(
      ".data/field-enrichment-summary.json",
      JSON.stringify(counts, null, 2),
    );
    console.log(JSON.stringify(counts));
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("FIELD_ENRICHMENT_FAILED (credentials suppressed)");
  process.exitCode = 1;
});
