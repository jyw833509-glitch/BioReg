# Workspace protection and weekly coverage

## Release scope

- Shared workspace reads stay public. Watchlist mutations, notification read-state changes, digest generation and digest settings require an administrator session.
- Set `BIOREG_ADMIN_KEY` only in Netlify environment variables (32 or more random characters). Enter it at `/admin`, never in chat or source control. The signed HttpOnly, SameSite=Strict session expires after eight hours. Rotating the key invalidates existing sessions. HTTPS login cookies are Secure.
- Existing GitHub Actions schedule remains Monday 01:17 UTC / 09:17 Asia/Shanghai. Sync post-processing generates one `weekly:YYYY-MM-DD` digest on Monday in the configured digest timezone. Retries update that same weekly record; historical daily records are retained.
- The weekly window covers seven calendar dates ending on that Monday, including its newly ingested records. Monday is partial at generation time. Reports summarize saved evidence, not every agency publication in that period.
- Incremental connectors rotate through deduplicated links discovered on their configured listing pages, reserving space for historical rechecks. `Source.sync_cursor` persists progress. This is bounded coverage of configured listings, not complete agency archive pagination. Verification/error pages remain rejected and failures remain isolated.
- Production workspace copy describes official data and weekly coverage. Individual provenance and missing-data limitations remain visible.

## Deployment ordering

Functional commit: `739a72d4729f8505da13e5adf07f8881bf646105` (Netlify skipped deliberately).

CI run `41368677711` passed lint, typecheck, automated tests, production build and production-mode HTTP smoke. Smoke tests use a disposable database schema and a generated test-only admin key, including successful login and authorized writes. No production credentials are logged.

The additive `202611010001_weekly_coverage` migration adds a cursor with default zero; no historical records are removed. Apply it through the existing Regulatory Sync workflow before deploying web code that reads this column.

Production acceptance is recorded after deployment. A public HTTP test can verify rejected unauthenticated writes and login-page availability; it cannot prove a successful login with the operator's private key without the operator entering that key in their browser.

Production Regulatory Sync run `41368863501` succeeded on 2026-11-02 at 00:47 UTC. Database preparation/migration succeeded before deployment. Its summary artifact records EMA HEALTHY, eight selected records, zero failures and no new/changed documents in this batch. Matching, source-health notifications, delivery and digest post-processing all succeeded. This was an explicit manual validation run, not natural cron evidence.

## Production verification — 2026-11-02 00:54 UTC

- Netlify serves release `7ec75a935829ba41ef43c8c5784652dc89ec10da`, confirmed by both health and dashboard response headers. Release CI `41369128843` passed all gates.
- Two rounds of bounded two-request concurrency: `/`, `/today`, `/regulations`, `/updates`, `/agencies`, `/watchlist`, `/digest`, `/notifications`, `/admin`, `/api/dashboard` all returned 200 with no database error page. Measured page responses were approximately 0.4–2.9 seconds; these are HTTP timings, not browser paint metrics or a sustained-load guarantee.
- Anonymous watchlist create/delete, notification mutation, digest generation and settings mutation returned 401. Invalid-key login returned 401; anonymous admin-session lookup returned false. Successful login/authorized mutation passed CI HTTP smoke. Production login with the operator's private key remains an operator browser check; the key was not accessed.
- Second bounded EMA manual run `41369348803` succeeded: eight selected records, six new official records, zero updates/failures. Cursor advanced from 7 to 15 (initial value zero). Both runs have summary artifacts and successful engagement stages. This validates actual persisted rotation; it does not claim complete archive coverage.
- Production now has 52 real regulations, Mock=0, with all prior 46 IDs preserved. All 50 historical daily digest IDs remain. Weekly key `weekly:2026-11-02` retained the same ID `cmvyjhqux00024v0douzonjut` across both runs; no duplicate digest keys.
- Date-filtered weekly digest JSON/CSV/PDF exports returned 200. JSON/CSV contained the weekly key; PDF had a valid `%PDF-` header (not a full visual PDF audit).
- FDA, EMA, NMPA, ICH and PMDA remain HEALTHY. CDE remains truthfully DEGRADED because official access is restricted; no bypass or fabricated success.
- Weekly cron remains unchanged. These two manual checks are not represented as natural scheduled executions.
