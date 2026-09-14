# Phase 7 — Daily Digest / Watchlist / Notification

Status: NOT PASSED — production page/API acceptance passed; waiting for natural scheduled run of Phase 7.

## Implementation and data

Existing Watchlist CRUD extended with countries/regions, departments, statuses, change types and minimum severity. Existing arrays retained. Partial updates support enable/disable without erasing other fields. Multiple independent rules remain persisted. New additive migration: 202609130001_watchlist_digest_notifications. New tables: WatchlistMatch, NotificationEvent, DigestSettings, DailyDigest, SourceHealthCheckpoint. Regulation, immutable versions and ChangeEvent are not rewritten.

## Matching and priority

Deterministic Unicode NFKC/case/whitespace normalization. AND across constrained fields, OR within each field; blank arrays unrestricted. Keywords search title, summary and captured content. Missing values fail a constrained field. New documents use NEW_DOCUMENT and importance for severity threshold. Changes use their immutable version snapshot. Matching reasons are retained. Mock, empty and denial captures are excluded; recognized metadata-only captures retain Phase 6 safeguards.

Priority is centralized: high-importance withdrawal/supersession/draft-to-final/effective-date changes are CRITICAL; high severity/importance HIGH; other changes MEDIUM or LOW. No AI, official website fetch or external messaging service is used.

## Events, delivery and deduplication

Watchlist ID + regulation ID + change-event ID (or new) + type is the unique key. Match and event creation are atomic; delivery occurs separately and can retry FAILED/PENDING records. InAppSender is implemented; other channels are not enabled. A channel failure preserves the event. Read/unread is workspace-level and persisted. Deleting a rule removes its match rows but retains notification records and saved digest snapshots.

Automatic matching starts at watchlist creation; pre-existing records are available via read-only preview. Re-running scans saved records since rule creation in batches of 100; unique keys avoid duplicate notifications. A disabled rule is skipped. Re-enabling recovers unmatched saved records since creation. Rule edits apply to still-unmatched saved candidates; already-delivered notices are not withdrawn.

Source health baseline is silent. Later real status changes atomically increment a checkpoint revision and create one event. Repeated unchanged DEGRADED does not notify. Notification/digest processing is after the existing six-source sync and isolated from its status; failures appear in scheduler engagement summary and sanitized logs.

## Digest

One workspace digest per local calendar date (unique key). Manual regeneration updates the same row. Configurable digest_enabled, digest_time and IANA timezone; defaults 08:00 Asia/Shanghai. Natural generation uses the previous complete local day at the first existing hourly scheduler run after the configured time. UTC boundaries account for 23/25-hour DST days. GitHub scheduling can be delayed; no exact-minute guarantee. Today displays a live partial-day summary separately.

Only saved non-Mock records/events are used. New counts use first_detected_at, updates count distinct regulations with non-NEW_DOCUMENT events, severity counts include all events. Counts by regulator/topic use distinct affected regulations. Watchlist counts use persisted match rows. Official links, detail links, captured change summaries and source health at generation are included. No historical official data is modified.

## UI and APIs

Watchlist editor, match preview/recent hits, Notifications filters/read actions/pagination, real unread bell, Today live summary, historical Digest page and Settings schedule form implemented. All four evidence types remain labeled. No SQL in pages.

APIs: /api/watchlists and /:id (existing extended); /:id/matches; /api/notifications GET/PATCH; /api/notifications/statistics; /api/digests GET/POST (date or today); /api/digest-settings GET/PATCH. Mutations retain same-origin checks. Single shared workspace, no new authentication system; existing access model retained.

## Validation

113 tests passed, including existing Phase 5/6 tests, matching fields/Unicode, DST, CRUD, new/change notifications, retry dedupe, delivery failure, read state, digest reuse/counts, source transitions, immutable history, and post-processing failure isolation. Production HTTP smoke passed. Final lint, typecheck, build and production-mode HTTP smoke passed.

## Production acceptance

Application commit: 078a06734d24088803b342199d569f0a7080e4ce. [CI 34791546566](https://github.com/jyw833509-glitch/BioReg/actions/runs/34791546566) succeeded.

[Manual sync 34768207852](https://github.com/jyw833509-glitch/BioReg/actions/runs/34768207852) on implementation commit 35f210e completed successfully, including additive migration. Actual logs confirmed matches/source_health/delivery/digest all SUCCESS. FDA, EMA, NMPA, ICH and PMDA HEALTHY; CDE DEGRADED.

Production acceptance at 2026-09-14T00:06:20Z:
- Netlify official deployment badge: success; new pages/API live.
- Watchlist create, edit, disable, enable, delete: success. Temporary rule matched 8 real FDA regulations; only the temporary rule was removed.
- Digest for 2026-09-12 generated twice with the same ID, zero new/updated records for that window.
- Notification list/filter/read-all/statistics APIs succeeded. Zero notifications is expected without new matching events or source-state changes; populated delivery and individual/all-read behavior were verified in isolated database/HTTP tests rather than inserting fake production notices.
- Three rounds, eight concurrent requests each: 24/24 HTTP 200 with valid content. Paths: /, /today, /regulations, /updates, /watchlist, /notifications, /digest, /api/health. Round maximum times 13,208 / 8,379 / 7,986 ms.
- Production total 38, Mock 0. The 38 original immutable snapshot IDs/content were confirmed retained after migration. Final post-cron recheck pending.
- Natural scheduled run and automatically generated 2026-09-13 digest pending.

Production writing initially returned ORIGIN_REJECTED because Netlify rewrote request.url to its deploy permalink while browser Origin used the stable site hostname. next.config.ts now embeds only the public Netlify build URL as BIOREG_SITE_ORIGIN; http.ts validates against this trusted canonical origin (explicit APP_ORIGIN still overrides). No forwarded client headers or wildcard origins are trusted. Diagnostic output was removed. Regression tests reject unrelated origins, spoofed forwarded hosts, missing origins and cross-site requests. See [Netlify domain documentation](https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/) for deploy permalink semantics.

Browser automation could not create a tab in this session (repeated provider timeout). Validation used actual production HTTP/API responses and isolated production-mode HTTP tests; no claim of a completed browser click-through or private Netlify log review is made.

## Limits

Email/Webhook/Slack/Teams/enterprise messengers are not activated. No additional paid infrastructure or secret is required. Full PDF parsing remains outside scope. UI shows recent 50 hits, 100 changes in preview, 90 historical digests and paged 50 notifications. Current data scale is small; digest aggregation reads a full day from PostgreSQL. This is a shared workspace, not private multi-user notifications. Phase 8 is not included.
