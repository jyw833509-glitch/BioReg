# Navigation performance — 2026-11-03

## Scope and freshness

Public listing pages use compact database projections: body text, attachment metadata and full version snapshots remain available from detail/evidence endpoints, rather than being repeated in every listing payload. Dashboard cards no longer issue three additional version queries. Detailed reports and AI contexts retain their original evidence paths.

Public read-only data has a bounded per-server-runtime cache (64 keys, 30 seconds from successful completion). Identical in-flight loads are coalesced. Expired entries are reloaded; failures are not cached or served as stale successes. Day rollover uses a new cache namespace. Cold instances and expired entries still query PostgreSQL, so cold requests are not promised a one-second SLA. No external cache infrastructure, database pool enlargement or source schedule changes.

Administrator session and mutable workspace state are excluded. Health checks and report exports remain live. Sidebar prefetch only follows hover/focus/touch intent and excludes Watchlist, Settings and Admin; full prefetched pages expire after 30 seconds. Combined data/prefetch freshness can be up to approximately one minute, disclosed in the interface. No blanket prefetch of all modules. Report/AI tools are split into on-demand bundles.

## Baseline

Production sequential reads before changes: homepage ~2.1s warm (~5.2s first measurement); Regulations ~2.1s; Updates ~2.2s; Agencies ~1.6s; Today ~1.5s. Query instrumentation measured roughly 175ms per database round trip, six queries for Regulations and nine for Dashboard/Updates. Regulations HTML was ~272KB and Updates ~310KB (decoded response sizes).

## Validation

Tests verify cache expiration, filter-key separation, coalescing, bounded eviction and failed-read retry. Database tests compare every dashboard display field against the frozen reference while explicitly excluding evidence fields intentionally moved off card payloads; detail endpoints retain those fields. Cold-query benchmarking disables the cache. Full CI and production HTTP acceptance are required before release.

A loading boundary was removed after HTTP smoke revealed it would turn missing-detail 404 responses into streamed 200 responses. Loading placeholders are not counted as performance success.

Release gates: CI 41556053109 passed lint, typecheck, all automated tests, production build and production-mode HTTP smoke on b94beff7de7afdd2e14797ed112847f482397bd7. Today's aggregate also uses the public 30-second cache; successful digest/settings writes invalidate this runtime's public cache, while other instances expire within the TTL. Settings reads now fetch existing settings without an unnecessary upsert transaction.

Cold-query follow-up: compact UI lists now obtain their filtered total and ordered page in one parameterized PostgreSQL statement. Dashboard counters, cards, latest job and health also share one statement/snapshot. Legacy full evidence endpoints remain unchanged. CI 41557265385 and 41557648084 passed all gates; equivalence tests cover list filters, sort orders, empty/out-of-range pagination, official-only visibility, and every dashboard display field. Both cold queries are asserted to use exactly one SQL statement. No database migration is required.

