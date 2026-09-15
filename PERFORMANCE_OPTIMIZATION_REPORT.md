# Post-release Performance Optimization

Status: Measurement in progress. Not Phase 10. v1.0.0 remains b1276fd54eb2550c7470cabd223d5cf28dd443f2.

## Baseline / methodology
V1 production: 14 routes, one first-observed request plus five sequential warm requests per route, then 20 and 40 mixed concurrent requests. Both concurrency rounds succeeded. First-observed is NOT a verified Netlify cold start; server-side durations were unavailable before instrumentation. HTTP timing includes network and response download, not browser click experience. Benchmark tool: scripts/performance-benchmark.mjs, results under ignored .data/performance-*.json.

Dashboard warm p50/p95 6.358/6.458s; Dashboard API 5.694/5.732s. Other page warm p95 0.431–2.848s. Health p95 0.775s. Original baseline preserved before changes.

## Diagnostic scope
Driver completion counters measure actual SQL statements including transaction commands; no SQL text/parameters/credentials retained. Prisma driver callbacks cross async contexts, so driver values represent a runtime observation window. `overlapping_scopes=true` explicitly warns that driver totals cannot be attributed to one request. Non-overlapping sequential diagnostic probes are used for before/after query-count comparisons. Acquisition includes connection establishment or waiting; query duration includes remote execution/network. These values do not isolate DNS/TLS or prove region placement. Page metadata measures page-data building, not React rendering. Server-Timing measures API work before response transmission; serialization is measured separately. Unavailable platform cold-start/render timing will not be fabricated.

Runtime remains max1, singleton, Transaction Pooler with existing compatibility parameters; external pg Pool is owned/disposed by Prisma adapter. No index/cache/SQL behavior changes in the diagnostic stage. 142 tests pass, including real driver query counter checks. SQL optimization, production diagnostics, final benchmarks and full report pending.
