import fs from "node:fs";
import { load } from "cheerio";
const base = "https://creative-starship-b64072.netlify.app";
const label = process.argv[2] || "baseline";
const samples = [];
async function probe(route, phase) {
  const start = performance.now();
  try {
    const r = await fetch(base + route, {
      signal: AbortSignal.timeout(45000),
      headers: { "Cache-Control": "no-cache" },
    });
    const headersMs = performance.now() - start;
    const b = Buffer.from(await r.arrayBuffer());
    let pageMetrics = null;
    if ((r.headers.get("content-type") || "").includes("text/html")) {
      const raw = load(b.toString())('meta[name="bioreg-performance"]').attr(
        "content",
      );
      if (raw) pageMetrics = JSON.parse(raw);
    }
    const row = {
      pageMetrics,
      commit: r.headers.get("x-bioreg-commit"),
      route,
      phase,
      status: r.status,
      ms: performance.now() - start,
      headersMs,
      bytes: b.length,
      serverTiming: r.headers.get("server-timing"),
      ok:
        r.ok &&
        !/数据库暂不可用|页面暂时无法加载|P2028|EMAXCONNSESSION|P1000/.test(
          b.toString(),
        ),
    };
    samples.push(row);
    return row;
  } catch (e) {
    const row = {
      route,
      phase,
      ms: performance.now() - start,
      ok: false,
      error: e.name,
    };
    samples.push(row);
    return row;
  }
}
const pct = (a, p) =>
  a.slice().sort((x, y) => x - y)[Math.ceil(a.length * p) - 1];
(async () => {
  const r = await fetch(base + "/api/regulations?pageSize=1");
  const j = await r.json();
  const routes = [
    "/",
    "/today",
    "/regulations",
    "/regulations/" + j.data[0].id,
    "/updates",
    "/watchlist",
    "/notifications",
    "/digest",
    "/reports",
    "/ai-tools",
    "/agencies",
    "/settings",
    "/api/health",
    "/api/dashboard",
  ];
  for (const route of routes) {
    await probe(route, "first-observed");
    for (let i = 0; i < 5; i++) await probe(route, "warm");
    console.log(JSON.stringify({ route, finished: 6 }));
    fs.writeFileSync(
      ".data/performance-" + label + "-partial.json",
      JSON.stringify(samples),
    );
  }
  for (const n of [20, 40]) {
    const round = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        probe(routes[i % routes.length], "concurrent-" + n),
      ),
    );
    console.log(
      JSON.stringify({
        concurrent: n,
        success: round.filter((x) => x.ok).length,
      }),
    );
    if (round.some((x) => !x.ok)) break;
  }
  const summary = routes.map((route) => {
    const a = samples.filter((x) => x.route === route && x.phase === "warm");
    return {
      route,
      samples: a.length,
      min: Math.min(...a.map((x) => x.ms)),
      p50: pct(
        a.map((x) => x.ms),
        0.5,
      ),
      p95: pct(
        a.map((x) => x.ms),
        0.95,
      ),
      max: Math.max(...a.map((x) => x.ms)),
      success: a.filter((x) => x.ok).length,
      firstObserved: samples.find((x) => x.route === route).ms,
    };
  });
  const out = {
    at: new Date().toISOString(),
    label,
    coldVerified: false,
    note: "First observed request is not verified platform cold start. Missing server-timing remains null.",
    samples,
    summary,
  };
  fs.writeFileSync(
    ".data/performance-" + label + ".json",
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(summary));
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
