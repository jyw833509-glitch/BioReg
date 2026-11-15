import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { directDb } from "../src/server/direct-db";
async function main() {
  const db = directDb();
  try {
    mkdirSync(".data", { recursive: true });
    if (process.argv[2] === "export") {
      const rows = await db.regulation.findMany({
        where: { is_mock: false, title_zh: "" },
        select: { id: true, title_original: true },
        orderBy: { id: "asc" },
      });
      writeFileSync(".data/title-input.json", JSON.stringify(rows));
      console.log(JSON.stringify({ pending: rows.length }));
    } else if (process.argv[2] === "import") {
      const rows = JSON.parse(
        readFileSync(".data/title-output.json", "utf8"),
      ) as { id: string; title_original: string; translation: string }[];
      let updated = 0;
      for (const row of rows) {
        if (
          !/[\u3400-\u9fff]/.test(row.translation) ||
          row.translation.length > 2000
        )
          throw new Error("INVALID_TRANSLATION");
        const r = await db.regulation.updateMany({
          where: {
            id: row.id,
            title_original: row.title_original,
            title_zh: "",
            is_mock: false,
          },
          data: { title_zh: row.translation },
        });
        updated += r.count;
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
