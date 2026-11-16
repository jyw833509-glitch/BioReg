import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { directDb } from "../src/server/direct-db";
import { titleHash } from "../src/server/enrichment/title-quality";
async function main() {
  const db = directDb();
  try {
    const rows = await db.regulation.findMany({
      where: { is_mock: false },
      select: {
        id: true,
        regulator: true,
        title_original: true,
        title_zh: true,
        document_number: true,
        publication_date: true,
        effective_date: true,
        status: true,
        source_metadata: true,
      },
    });
    const state = {
      at: new Date().toISOString(),
      records: rows.map((r) => ({
        id: r.id,
        titleHash: titleHash(r.title_original),
      })),
      versions: await db.regulationVersion.count(),
      changes: await db.changeEvent.count(),
      digests: await db.dailyDigest.count(),
      mock: await db.regulation.count({ where: { is_mock: true } }),
    };
    if (process.argv[2] === "before") {
      writeFileSync(
        ".data/enrichment-integrity-before.json",
        JSON.stringify(state),
      );
      console.log(
        JSON.stringify({
          before: rows.length,
          versions: state.versions,
          mock: state.mock,
        }),
      );
      return;
    }
    const before = JSON.parse(
      readFileSync(".data/enrichment-integrity-before.json", "utf8"),
    );
    const current = new Map(state.records.map((r) => [r.id, r.titleHash]));
    for (const row of before.records)
      assert.equal(
        current.get(row.id),
        row.titleHash,
        "Original record changed during enrichment",
      );
    assert.equal(
      state.versions,
      before.versions,
      "Enrichment must not fabricate regulatory versions",
    );
    assert.equal(
      state.changes,
      before.changes,
      "Enrichment must not fabricate regulatory changes",
    );
    assert.equal(state.digests, before.digests);
    assert.equal(state.mock, before.mock);
    const sources: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const m = r.source_metadata as Record<string, unknown>;
      const p = m.bioreg_title_translation as
        Record<string, unknown> | undefined;
      const c = (sources[r.regulator] ||= {
        records: 0,
        chinese: 0,
        officialChinese: 0,
        reviewedTranslation: 0,
        automaticTranslation: 0,
        documentNumber: 0,
        publicationDate: 0,
        effectiveDate: 0,
        knownStatus: 0,
        officialVersion: 0,
        fieldReview: 0,
      });
      c.records++;
      if (r.title_zh) c.chinese++;
      if (
        p?.method === "official_catalog" ||
        p?.method === "official_publication" ||
        r.title_zh === r.title_original
      )
        c.officialChinese++;
      if (p?.method === "reviewed_local_model") c.reviewedTranslation++;
      if (p?.method === "local_model_quality_checked") c.automaticTranslation++;
      if (r.document_number) c.documentNumber++;
      if (r.publication_date) c.publicationDate++;
      if (r.effective_date) c.effectiveDate++;
      if (r.status !== "UNKNOWN") c.knownStatus++;
      if (m.official_version || m.revision) c.officialVersion++;
      if (m.bioreg_field_review) c.fieldReview++;
    }
    const report = {
      ...state,
      records: rows.length,
      sources,
      missingChinese: rows.filter((r) => !r.title_zh).length,
      integrity: "passed",
    };
    writeFileSync(
      ".data/enrichment-integrity-after.json",
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
    assert.equal(
      report.missingChinese,
      0,
      "Some titles remain pending quality review",
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error("ENRICHMENT_ACCEPTANCE_FAILED (credentials suppressed)");
  process.exitCode = 1;
});
