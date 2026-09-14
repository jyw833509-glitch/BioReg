# Phase 9 Production Acceptance

Status: IN PROGRESS — no release tag created.

## Scope and architecture
Reports, PDF/CSV exports, production QA, recovery documentation and minimal page-load repair. Existing Next.js 16 / Netlify OpenNext / Prisma 7 / Supabase / GitHub Actions architecture is unchanged. No new paid services, scheduler or AI API.

## Reports
Read-only `/api/reports`: regulation, change, version history, version comparison, saved digest, watchlist matches, regulatory intelligence summary, source health, notifications. Bounded filters validate dates, agency, category, product, watchlist, severity, regulation and version ownership. Unsupported combinations return 400. Default 30 / maximum 100 rows; large reports return 413 instead of silently truncating. Embedded version/change lists are bounded and marked limited. Summary counts describe the selected scope only.

## PDF / CSV / evidence
PDFKit with embedded OFL Noto Sans SC regular font, searchable Chinese/English text, UTC generation timestamp, source URLs, page headers/footers and automatic pagination. Three local PDF samples verified with extraction and rendered long-text page inspection; no clipping or overlapping footer. CSV uses UTF-8 BOM, fixed ID/URL columns, quoting and spreadsheet formula protection. PPTX deferred (optional).
Official Fact, BioReg Translation, BioReg System Summary and External AI Interpretation remain distinguished. Missing information is not inferred. Reports do not store external AI output or mutate source records.

## Production hardening / database
Runtime remains Transaction Pooler 6543, adapter-pg pool max 1, global singleton; migration uses DIRECT_URL in existing GitHub workflow. Error responses expose code, message, request ID and timestamp rather than credentials/stack. Health reports application/database state and V1.0.0. No scheduler/connector logic changed.

## Local QA
141 automated tests pass; lint, typecheck, production build and isolated PostgreSQL HTTP smoke pass. Smoke covers reports, CSV/PDF, comparison ownership, invalid parameters, and equality of official records, snapshots, changes, watchlists, notifications and digests before/after exports and AI requests. Prior connector/change detection/deduplication tests remain included.

## Minimal performance repair
Before change all pages loaded full Dashboard, source details and a regulation list serially. Now Dashboard is loaded only for Dashboard/Topics; sources only for Dashboard/Agencies; lists only where consumed. Notifications/Digest no longer perform those unrelated SSR queries. No pool increase or new infrastructure. Before deployment this probe measured `/` 14.161s, Today 7.790s, Notifications 8.522s, Reports 8.565s and Agencies 8.766s. Production post-change and concurrency validation pending.

## Scheduler / connectors / derived features
Latest inspected natural Regulatory Sync: 34845772099, schedule, 2026-09-14T12:51:53Z, commit 4aa2aad75b364aeacfc5ac3256b650273a7e6e6c, success. Artifact/source results and post-deploy Source Health, Watchlist, Notification, Digest, Change Detection and Version History checks pending. No natural fetch records will be fabricated.

## UI / browser / responsive
Browser inventory works, but selecting the production tab times out and resets the controller. Therefore browser clicking, clipboard and live viewport interaction are not claimed. HTTP/HTML/API and PDF visual QA provide the permitted fallback. Existing responsive breakpoints are preserved; long filter inputs/preformatted report details constrained to available width. Final production HTML checks pending.

## Security / logging / recovery
Secrets remain in platform variables only; `.env.example` uses placeholders. npm audit returned zero vulnerabilities. Final repository/frontend/log scan pending. Reports log only type/format/count/duration. RECOVERY_RUNBOOK.md covers Netlify rollback, database incident checks, source isolation, encrypted offsite logical backup and isolated restore validation. Free Supabase automatic backup access/retention is not assumed. No production restore or backup was performed; immutable snapshots cannot be recreated from current source pages.

## Release / known limitations
README, AGENTS, CHANGELOG and RELEASE_NOTES updated. Shared workspace is not multi-tenant; full PDF-body semantic diff, PPTX, full performance optimization and live browser interaction remain outside this release or noted limitations. Empty production change data is tested through isolated real PostgreSQL fixtures rather than fabricated production events. Release decision pending production/CI/export/concurrency/data-integrity gates.
