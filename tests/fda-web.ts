// Explicit, read-only verification after a real CLI sync. Not part of default tests.
import assert from "node:assert/strict";
const origin = process.env.BIOREG_TEST_ORIGIN || "http://localhost:3000";
async function main() {
  const response = await fetch(
    origin + "/api/regulations?regulator=FDA&pageSize=100",
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  const records = payload.data.filter((r: { is_mock: boolean }) => !r.is_mock);
  assert.ok(records.length > 0, "Run a real FDA sync first");
  const r = records[0];
  assert.match(r.official_url, /^https:\/\/www\.fda\.gov\//);
  assert.ok(r.last_checked_at);
  for (const route of [
    "/",
    "/today",
    "/regulations?regulator=FDA",
    "/updates",
    `/regulations/${r.id}`,
  ]) {
    const page = await fetch(origin + route);
    assert.equal(page.status, 200, route);
    const html = await page.text();
    assert.ok(
      records.some((record: { id: string }) => html.includes(record.id)),
      `${route} must contain real FDA data`,
    );
    if (route.startsWith("/regulations/")) {
      assert.ok(html.includes("Real Official Data"));
      assert.ok(html.includes(r.official_url));
      if (r.pdf_url) assert.ok(html.includes(r.pdf_url));
      assert.ok(html.includes("Last Checked"));
    }
  }
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        real_fda_records: records.length,
        detail_id: r.id,
        pages: 5,
        official_source: r.official_url,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
