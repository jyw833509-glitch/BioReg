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
