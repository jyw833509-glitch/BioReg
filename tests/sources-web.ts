// Explicit post-sync verification, no external regulator requests or database writes.
import assert from "node:assert/strict";
const origin = process.env.BIOREG_TEST_ORIGIN || "http://localhost:3000";
async function main() {
  const results = [];
  for (const code of ["FDA", "EMA", "NMPA", "CDE", "ICH", "PMDA"]) {
    const response = await fetch(
      `${origin}/api/regulations?regulator=${code}&pageSize=100`,
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.ok(
      payload.data.every(
        (r: { is_mock: boolean; regulator: string }) =>
          !r.is_mock && r.regulator === code,
      ),
    );
    if (payload.data.length) {
      const r = payload.data[0];
      const page = await fetch(`${origin}/regulations/${r.id}`);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.ok(html.includes(r.official_url));
      assert.ok(html.includes("Real Official Data"));
    }
    results.push({
      source: code,
      official_records: payload.pagination.total,
      status: payload.pagination.total ? "REAL_DATA_VISIBLE" : "NO_REAL_DATA",
    });
  }
  for (const path of ["/", "/today", "/regulations", "/updates", "/agencies"]) {
    assert.equal((await fetch(origin + path)).status, 200);
  }
  assert.equal((await fetch(origin + "/regulations/mock-1")).status, 404);
  const agencies = await (await fetch(origin + "/agencies")).text();
  assert.ok(agencies.includes("Last Sync"));
  assert.ok(agencies.includes("Latest Regulation"));
  assert.ok(agencies.includes("Last Successful Sync"));
  assert.ok(agencies.includes("Health:"));
  const dashboard = await (await fetch(origin + "/")).text();
  for (const label of [
    "Last Global Sync",
    "Source Health Summary",
    "Healthy Sources",
    "Degraded Sources",
    "Latest Sync Result",
  ])
    assert.ok(dashboard.includes(label), label);
  console.log(
    JSON.stringify({ web_checks: "PASS", sources: results }, null, 2),
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
