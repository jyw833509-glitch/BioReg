# BioReg V1 Recovery Runbook

## Credentials and access
Never paste credentials into tickets, reports, source files or commands recorded in shell history. DATABASE_URL is Netlify runtime only (Supabase Transaction Pooler 6543); DIRECT_URL is GitHub Secrets for migrations/sync (Direct or Session 5432). Keep TLS verification enabled.

## Hosting failure
Inspect Netlify deployment for the affected commit and function logs. Health HTTP 200 proves application/database availability; source DEGRADED alone is not downtime. For a bad release, use Netlify's previously verified deploy rollback, then repair main and redeploy. Do not rollback database history by deleting rows.

## Database unavailable
Web/API display a safe error with request_id/timestamp; no Mock fallback. Check Supabase project availability, pooler endpoint and runtime environment settings. Do not raise each function's pool size blindly. Restore connectivity before replaying operations. Do not run destructive migrations or seed mock records in production.

## Scheduler or source failure
Inspect Regulatory Sync run event, SHA, steps and regulatory-sync-summary artifact; correlate SyncJob ID and per-source SyncLogs. After repairing a genuine failure, use existing workflow_dispatch, source all, mode incremental. GitHub concurrency and database advisory lock prevent overlapping execution. SKIPPED_NOT_DUE is normal. CDE verification pages remain DEGRADED, isolated; retry later, do not bypass verification or store challenge content.

## Backups and restoration
The project was created on Supabase Free. No paid backup/PITR entitlement is assumed; no live private backup inventory was accessible during this audit. Supabase recommends regular off-site logical exports for Free projects: https://supabase.com/docs/guides/platform/backups. No automatic backup retention or RPO is promised.

Use an authorized administrator's Supabase CLI db dump or PostgreSQL pg_dump with connection supplied securely via the environment/console, not pasted into chat. Store encrypted dumps in controlled private off-site storage, never in this public Git repository or public CI artifacts. Take a backup before destructive maintenance. No new paid service or automatic backup workflow is introduced.

Restore a logical backup to a NEW isolated PostgreSQL database first. Use the matching source commit and migrations, validate row counts, foreign keys, source health, immutable snapshot IDs/content, notification/digest dedupe and the application's tests. Only switch production credentials after review. Restore is an operator action because it can replace data; do not execute an overwrite automatically.

Migrations rebuild schema, not lost history. Official current documents can be re-synced, but removed historical documents/snapshots, prior ChangeEvents, user Watchlists, read states and historic source logs cannot reliably be recreated without backups. Report files are derived and can be regenerated while underlying data remains. Digests/matches may be recalculated only within retained evidence and original rules; their historical semantics are not guaranteed after rule changes.

## Verification after recovery
Health 200; Dashboard, Regulations, detail/history, Updates, Watchlist, Notifications, Digest, Reports and AI Tools load. Check real counts and Mock=0. Run a bounded report export and compare IDs/content; check one scheduler execution and its artifact without changing due times. Record UTC incident time, commit, request_id, affected source/job ID and resolution; never credentials.

