# Phase 7 — Daily Digest / Watchlist / Notification

Status: PASSED — natural scheduled Phase 7 post-processing and production acceptance passed under the explicitly agreed acceptance scope below.

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
- Production total 38, Mock 0. The 38 original immutable snapshot IDs/content were confirmed retained after migration and in the post-cron recheck below.
- Natural scheduled execution and the automatically generated 2026-09-13 digest are verified below.

Production writing initially returned ORIGIN_REJECTED because Netlify rewrote request.url to its deploy permalink while browser Origin used the stable site hostname. next.config.ts now embeds only the public Netlify build URL as BIOREG_SITE_ORIGIN; http.ts validates against this trusted canonical origin (explicit APP_ORIGIN still overrides). No forwarded client headers or wildcard origins are trusted. Diagnostic output was removed. Regression tests reject unrelated origins, spoofed forwarded hosts, missing origins and cross-site requests. See [Netlify domain documentation](https://docs.netlify.com/manage/domains/domains-fundamentals/understand-domains/) for deploy permalink semantics.

Browser automation could not create a tab in this session (repeated provider timeout). Validation used actual production HTTP/API responses and isolated production-mode HTTP tests; no claim of a completed browser click-through or private Netlify log review is made.

## Final natural schedule acceptance — 2026-09-14

The owner explicitly clarified that SKIPPED_NOT_DUE is a normal Scheduler business result, not a failure. Phase 7 acceptance concerns the Daily Digest / Watchlist / Notification pipeline. An additional due-source fetch on this commit is not required to repeat the previously verified Phase 5 connector/scheduler acceptance. No actual fetch is claimed for this run.

- Run: [34794601862](https://github.com/jyw833509-glitch/BioReg/actions/runs/34794601862).
- Triggered: 2026-09-14T01:02:40Z (2026-09-14 09:02:40 Asia/Shanghai).
- Event: schedule, naturally triggered by the existing GitHub Actions cron; not workflow_dispatch.
- Commit: e7cb1a589bbf0b51937a47f1ee7ddf56ce7e4267 (Phase 7; no Phase 8).
- Workflow conclusion: success. Scheduler mode: incremental; dry_run: false.
- Persisted SyncJob: cmu0jh7qk0000r942a4v7acp7, confirmed against the production dashboard API. Job interval: 2026-09-14T01:03:14.513Z to 2026-09-14T01:03:25.402Z; aggregate status SKIPPED.
- Artifact: regulatory-sync-summary-34794601862, artifact ID 10329440993; downloaded and inspected successfully.

| Source | Scheduler result | Retained source health |
| --- | --- | --- |
| FDA | SKIPPED_NOT_DUE | HEALTHY |
| EMA | SKIPPED_NOT_DUE | HEALTHY |
| NMPA | SKIPPED_NOT_DUE | HEALTHY |
| CDE | SKIPPED_NOT_DUE | DEGRADED |
| ICH | SKIPPED_NOT_DUE | HEALTHY |
| PMDA | SKIPPED_NOT_DUE | HEALTHY |

All six sources were evaluated normally and were not due. Found/new/updated/failed counts were zero and error_kind was null for every source. This run did not fetch documents or create fresh per-source fetch SyncLogs. Existing actual-fetch SyncLogs from manual run 34768207852 remained available: five successful sources and an isolated CDE access limitation. The natural run's persisted evidence is its SyncJob and summary artifact; these are not represented as new fetch logs.

The artifact reports matches, source_health, delivery and digest all SUCCESS. This is the Phase 7 post-processing chain actually exercised by the natural run. Production NotificationEvent count remained zero, consistent with no new matching events or health transitions; no notification storm occurred. Populated notification delivery and retry deduplication were covered by the previously passing isolated tests, not fabricated production events.

The natural run generated the 2026-09-13 DailyDigest at 2026-09-14T01:03:25.256Z, ID cmu0jhetm0001r942wv611kgk. Its Asia/Shanghai day window is [2026-09-12T16:00:00Z, 2026-09-13T16:00:00Z). Production digest dates were unique (September 12 and September 13); the earlier same-day regeneration test reused the same row. No duplicate Digest was observed.

Post-cron production recheck at 2026-09-14T04:46:45Z confirmed 38 real regulations, Mock 0, and all 38 original snapshot IDs and exact captured content retained. ChangeEvent count remained zero, consistent with no detected changes. Change Detection and Version History regression tests remain passed; no duplicate versions or historical data loss was observed.

Post-cron concurrent HTTP validation completed at 2026-09-14T04:48:48Z: two rounds of eight simultaneous requests, 16/16 HTTP 200 with valid content, covering /, /today, /watchlist, /notifications, /digest, /api/health, /api/dashboard and /agencies. Round maximum response times were 12,842 ms and 8,172 ms. No database fallback or HTTP 500 was observed in these checks. Together with the prior successful Netlify deployment, CI, 113 tests, lint, typecheck, production build, manual sync and production CRUD checks, the agreed Phase 7 acceptance is PASSED.

Non-blocking known item: 尚未额外等待 Phase 7 commit 上的来源 due-run 实际抓取，该能力已在前序阶段和手动同步中验证。

This acceptance update changes only this report. No Scheduler changes, artificial due state, extra cron, manual sync, or manual redeployment were performed. Phase 8 may begin separately; no Phase 8 code is included.

## Limits

Email/Webhook/Slack/Teams/enterprise messengers are not activated. No additional paid infrastructure or secret is required. Full PDF parsing remains outside scope. UI shows recent 50 hits, 100 changes in preview, 90 historical digests and paged 50 notifications. Current data scale is small; digest aggregation reads a full day from PostgreSQL. This is a shared workspace, not private multi-user notifications. Phase 8 is not included.
