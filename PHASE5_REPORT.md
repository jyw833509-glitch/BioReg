# Phase 5 Production Acceptance

## Status

**Phase 5: PASSED** — acceptance window: 2026-09-12 01:26:56 UTC (09:26:56 Asia/Shanghai).

Application fix: `0b76682602f35486b56f4a5ec41c341fc5efb642`.
Production: https://creative-starship-b64072.netlify.app

## Root causes and fixes

1. Netlify serverless instances previously retained up to five connections each through Supabase Session Pooler, exhausting its 15-session capacity (`EMAXCONNSESSION`). Web runtime now uses the user-configured official Transaction Pooler (6543); each instance retains one global Prisma client with pg `max: 1` and a 10-second idle timeout.
2. Dashboard launched 18 operations concurrently, including paginated RepeatableRead transactions, while page-data launched Dashboard plus further reads concurrently. Prisma's default transaction acquisition budget was shorter than the queue on a single connection. A real local PostgreSQL reproduction holding the connection for three seconds produced `P2028` before the fix and succeeded afterward.
3. Dashboard and page-data now start operations sequentially through lazy callbacks. Transaction acquisition and execution each have explicit 10-second bounds. RepeatableRead pagination, mock exclusion, and the six-source scheduler are preserved; the connection pool was not increased.

## Changed files

- `src/server/db.ts`: one-connection pool, global singleton, bounded transaction options.
- `src/server/direct-db.ts`: explicit CLI connection; rejects the Supabase transaction endpoint for session-dependent tasks.
- `prisma.config.ts`: migrations use DIRECT_URL, not web DATABASE_URL.
- `src/server/sequential.ts`, `src/server/page-data.ts`, `src/server/repositories/dashboard-repository.ts`: bounded query scheduling.
- CLI entry points under `scripts/`, `prisma/seed.ts`: separate direct/session connection.
- `.github/workflows/ci.yml`, `.github/workflows/regulatory-sync.yml`: DIRECT_URL wiring; scheduling and source isolation unchanged.
- `.env.example`, local DB helper, hosting/scheduler documentation: placeholder-only configuration and connection roles.
- `tests/connection.test.ts`, `tests/database.test.ts`, `tests/smoke.ts`: URL routing, isolated migration and queued single-connection regression coverage.

## Production database architecture

- Supabase PostgreSQL remains the sole production database.
- Netlify Functions use DATABASE_URL through Transaction Pooler 6543. Netlify needs no DIRECT_URL for runtime or Prisma generation.
- GitHub Actions migration and scheduler use DIRECT_URL through Direct / Session Pooler 5432. Dedicated session advisory locks remain intact.
- Prisma 7.10 adapter-pg issues unnamed queries when statementNameGenerator is absent. The user configured pgbouncer=true; this legacy engine flag is not relied on to configure the pg driver's pool.
- No database schema change or historical record deletion was required for this fix.

## Tests and CI

Local lint, typecheck, all **57 tests**, production build and production HTTP smoke checks passed. The new database regression holds the only connection for three seconds, then verifies a paginated read and six concurrent Dashboard requests complete.

GitHub CI: **success** — https://github.com/jyw833509-glitch/BioReg/actions/runs/34664569300

## GitHub Actions and Source Health

Manual six-source incremental sync on the final application commit: **workflow success** — https://github.com/jyw833509-glitch/BioReg/actions/runs/34664632176

Logs confirm migrations applied, six Source configurations ensured, no mock seed, all six sources invoked. Application result is **PARTIAL_SUCCESS**, correctly reflecting the allowed CDE restriction rather than hiding it.

| Source | Health | Real regulations |
| --- | --- | ---: |
| FDA | HEALTHY | 8 |
| EMA | HEALTHY | 8 |
| NMPA | HEALTHY | 6 |
| CDE | DEGRADED | 0 |
| ICH | HEALTHY | 8 |
| PMDA | HEALTHY | 8 |

Total: **38**; production Dashboard mockTotal: **0**. CDE failure did not stop ICH or PMDA. Health responses retain last attempt, last success and last failure timestamps; the dashboard exposes the persisted latest SyncJob.

Natural schedule executed successfully with DIRECT_URL: https://github.com/jyw833509-glitch/BioReg/actions/runs/34663742649 . Additional successful natural runs: 34654555009, 34640154867, 34622000988. The hourly cron remains `17 * * * *`, incremental mode with per-source due checks; a successful scheduled run need not fetch a source that is not due. Execution is hosted by GitHub and does not require the user's computer.

## Netlify production verification

Production is publicly published and serving the repair. Netlify's official deployment-status badge reports **success**:
https://api.netlify.com/api/v1/badges/38396ee5-87b5-4ac1-a87e-1f00840f6460/deploy-status

Five rounds of **8 concurrent requests**, 40 requests total, checked the following exact URLs without unsupported query parameters:

| Endpoint | Result |
| --- | --- |
| /api/health | 200, status=ok |
| /api/dashboard | 200, real totals and source status |
| / | 200, server-rendered application content |
| /today | 200, server-rendered application content |
| /regulations | 200, server-rendered application content |
| /updates | 200, server-rendered application content |
| /agencies | 200, server-rendered application content |
| /watchlist | 200, server-rendered application content |

**40/40 passed**, with no 500/503 or error-page fallback. No EMAXCONNSESSION, P1000, P2010 or P2028 was observed in these responses. JSON health and Dashboard contents were validated, not just HTTP status. Reports, AI Tools and an existing real regulation detail separately returned 200.

Latency under this concurrency: median **7.54 s**, p95 **11.61 s**, maximum **12.71 s**. This passes the requested stability check but remains a performance limitation.

Local raw evidence (ignored, no credentials): `.data/phase5-production-verification.json`, `.data/phase5-actions.json`, `.data/netlify-status.png`.

## Security and acceptance limits

Secrets remain exclusively in GitHub Secrets / Netlify Environment Variables; production secret values were not read or committed. Examples contain placeholders only. No paid infrastructure or mock fallback was introduced.

The acceptance is a bounded production test, not a guarantee against all future incidents. Private Netlify logs were not available in the current browser session, so the report does not claim a global log audit or the absence of errors outside the observed window. Browser automation timed out; rendering verification used actual server-rendered HTML, not a visual browser screenshot. Earlier 200 responses produced by an unsupported acceptance query parameter were invalid evidence and are excluded from this acceptance.

CDE remains access-restricted. Serial database reads trade latency for bounded connection use; further query consolidation can improve performance without increasing pool size. No Phase 6 implementation was started.
