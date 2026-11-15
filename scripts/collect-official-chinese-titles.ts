import { readFileSync, writeFileSync } from "node:fs";
import { load } from "cheerio";
import { OfficialClient } from "../src/server/connectors/shared/client";
import { officialUrl } from "../src/server/connectors/shared/url";

// A provincial medicines regulator's public bilingual directory. Attribution is
// to this catalog, never an assertion that BioReg authored an official translation.
const pages = [
  "https://ypjg.ln.gov.cn/ypjg/ztzl/ypyfcxxxfw/zcfgzq/ichzdyzzl/2026071918475410332/index.shtml",
  "https://ypjg.ln.gov.cn/ypjg/ztzl/ypyfcxxxfw/zcfgzq/ichzdyzaqx/2026071918514569926/index.shtml",
  "https://ypjg.ln.gov.cn/ypjg/ztzl/ypyfcxxxfw/zcfgzq/ichzdyzyxx/2026071918540149628/index.shtml",
];
const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
async function main() {
  const input = process.argv[2] || ".data/title-input.json";
  const rows = JSON.parse(readFileSync(input, "utf8")) as {
    id: string;
    regulator: string;
    title_original: string;
    document_number?: string;
    source_metadata?: Record<string, unknown>;
  }[];
  const client = new OfficialClient((url, base) =>
    officialUrl(url, base || pages[0], ["ypjg.ln.gov.cn"]),
  );
  const matches: Record<string, unknown>[] = [];
  for (const page of pages) {
    const { html } = await client.get(page);
    const $ = load(html);
    $("table tr").each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((_, td) => $(td).text().replace(/\s+/g, " ").trim())
        .get();
      for (let i = 0; i < cells.length - 1; i++) {
        const english = cells[i];
        const chinese = cells[i + 1];
        const codeMatch = english
          .normalize("NFKC")
          .match(/^([QSEM]\d+[A-Z]?(?:\(R\d+\))?)\s*[:：]\s*(.+)$/);
        if (!codeMatch || !/[\u3400-\u9fff]/u.test(chinese)) continue;
        const [, code, title] = codeMatch;
        for (const row of rows) {
          if (
            row.regulator !== "ICH" ||
            normalize(row.title_original) !== normalize(title)
          )
            continue;
          const rowCode =
            row.source_metadata?.guideline_code || row.document_number || "";
          if (normalize(String(rowCode)) !== normalize(code)) continue;
          matches.push({
            id: row.id,
            title_original: row.title_original,
            translation: chinese,
            method: "official_catalog",
            source_url: page,
            publisher: "辽宁省药品监督管理局",
            catalog_code: code,
            checked_at: new Date().toISOString(),
            official_english_title: english,
          });
        }
      }
    });
  }
  const counts = new Map<string, number>();
  matches.forEach((row) =>
    counts.set(String(row.id), (counts.get(String(row.id)) || 0) + 1),
  );
  const unambiguous = matches.filter((row) => counts.get(String(row.id)) === 1);
  writeFileSync(
    ".data/official-chinese-titles.json",
    JSON.stringify(unambiguous, null, 2),
  );
  console.log(
    JSON.stringify({
      officialCatalogMatches: unambiguous.length,
      ambiguous: matches.length - unambiguous.length,
      databaseWrites: 0,
    }),
  );
}
main().catch(() => {
  console.error("OFFICIAL_CHINESE_CATALOG_UNAVAILABLE");
  process.exitCode = 1;
});
