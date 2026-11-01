import test from "node:test";
import assert from "node:assert/strict";
import { parseList } from "../src/server/connectors/ema/parser";
test("EMA discovers migrated guideline landing pages and retains legacy links", () => {
 const rows = parseList(`<main><a href="/en/scientific-guidelines/quality-biological-products">Quality</a><a href="/en/legacy-scientific-guideline">Legacy</a><a href="/en/scientific-guidelines">Index</a><a href="/en/documents/scientific-guideline/example.pdf">PDF</a></main>`, "https://www.ema.europa.eu/en/example");
 assert.equal(rows.length, 2);
 assert.equal(rows[0].url, "https://www.ema.europa.eu/en/scientific-guidelines/quality-biological-products");
});
