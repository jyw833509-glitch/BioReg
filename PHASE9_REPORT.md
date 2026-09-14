# Phase 9 Production Acceptance — BioReg V1.0.0

Acceptance UTC: 2026-09-14T16:32:38Z. Status: PASSED.

## 1. Phase 9 Scope

Reports / production hardening / QA / V1.0.0 release, including the requested minimal performance repair. Existing Netlify + Supabase + GitHub Actions architecture remains unchanged. No new infrastructure or Phase 10 work.

## 2. Reports architecture

Read-only GET `/api/reports`, validated bounded query → existing PostgreSQL records → JSON preview / PDFKit / UTF-8 CSV. No report writes or AI calls. Default 30 / maximum 100 records; per-regulation history/change lists limited to 20 with an explicit limited flag; oversized outputs return 413. The UI record picker is bounded by the supplied listing; the API supports explicit IDs.

## 3. Report types

Regulation, Change, Version Comparison, saved Daily Digest, Watchlist Matches, Regulatory Intelligence Summary and Source Health, plus Versions and Notifications exports. Summary counts are scoped to selected records, not database-wide totals. Date, agency, category, product, severity, watchlist, regulation/change and version parameters validated; unsupported combinations rejected.

## 4. PDF implementation

PDFKit; embedded static Noto Sans SC regular (OFL license in assets/fonts/OFL.txt), searchable Chinese/English, URL links, UTC generation stamp and page headers/footers. Three local long-text samples pass extraction and rendered pagination inspection. Production Regulation PDF 7 pages, Change empty-state PDF 1 page and Digest PDF 5 pages; all contain extractable Chinese and page numbering. Production regulation page visually inspected: no clipping/overlapping footer. Fonts correctly packaged by Netlify.

## 5. CSV implementation

Stable id/regulation_id/agency/official_url/timestamp/severity/evidence/details columns, UTF-8 BOM, CRLF, quoted cells and formula prefix protection. Eight production CSV export types returned 200 and correct BOM. Unit tests cover embedded quote/newline/formula behavior.

## 6. PPTX status

Deferred as permitted; PDF and CSV are the required delivered formats.

## 7. Evidence Boundary

Official Fact ≠ BioReg Translation ≠ BioReg System Summary ≠ External AI Interpretation. Missing fields remain Not disclosed / Not available. No legal conclusions inferred, no external AI interpretation persisted. Derived counts do not overwrite official records.

## 8. Production Hardening

Safe bounded errors with request_id/code/message/timestamp, report size limit, no-store exports, nosniff download headers. No increase in database pool, no new cron, no Redis or paid services.

## 9. DB connection verification

Prisma 7 + adapter-pg global singleton with max 1; Netlify runtime DATABASE_URL uses Supabase Transaction Pooler 6543. DIRECT_URL reserved for existing migration/CLI workflow. No schema migration added in Phase 9. Runtime health/database queries pass.

## 10. Connector QA

Manual Regulatory Sync run 34868132806 on debc4b8520206515e809164d89a7de27ebf42db9, workflow_dispatch, conclusion success. FDA/EMA/NMPA/ICH/PMDA SUCCESS (8/8/6/8/8 found); CDE FAILED/DEGRADED safely isolated. Job PARTIAL_SUCCESS; 0 new / 0 updated records. No verification page stored.

## 11. Scheduler QA

Existing natural run 34845772099 at 2026-09-14T12:51:53Z, schedule, commit 4aa2aad75b364aeacfc5ac3256b650273a7e6e6c, success. Six SKIPPED_NOT_DUE normal outcomes; engagement matches/source_health/delivery/digest SUCCESS. Artifact regulatory-sync-summary-34845772099 verified. This natural run did not fetch; no claim otherwise. Existing manual artifact and prepare/scheduler steps also success. No new schedule created.

## 12. Change Detection QA

Existing deterministic detection and idempotence tests remain passing. Production has zero ChangeEvents; non-empty change/comparison and same-version/ownership errors verified in isolated migrated PostgreSQL HTTP smoke, not by injecting production events.

## 13. Version History QA

2026-09-14T16:32:35.239Z recheck: all 38 historical snapshots retained and compared against prior baseline; 38 real regulations, Mock=0. No history rewritten.

## 14. Watchlist QA

Matching/post-processing SUCCESS in manual and natural artifacts. Existing matching/persistence tests and production page/API pass. Report smoke compares Watchlist data before/after read-only exports.

## 15. Notification QA

Delivery/source-health processing SUCCESS, 0 production notifications after repeated scheduler runs, no duplicate flood. Deduplication/non-empty transitions covered by automatic tests. No email or external messaging added.

## 16. Digest QA

2 saved production Digests, unique logical dates after manual sync; natural/manual digest post-processing SUCCESS. Stored digest exports preserve original timezone/window/summary. Exact event severity counts explicitly separated from legacy saved HIGH totals that may include CRITICAL.

## 17. AI Tools QA

DeepSeek / Doubao / Qwen / Kimi, 12 templates. Four production CMC prompts passed evidence-boundary assertions; core context variants tested locally. AI Tools page/API 200; no GPT/ChatGPT/OpenAI provider reintroduced. No external AI account interaction or output claimed.

## 18. Source Health QA

FDA HEALTHY; EMA HEALTHY; NMPA HEALTHY; ICH HEALTHY; PMDA HEALTHY; CDE DEGRADED. Last sync/success/failure preserved. CDE does not mark the application unavailable.

## 19. Security audit

npm audit: 0 vulnerabilities. No relaxed authentication/SSL or paid services. Shared public workspace limitations retained. Report API rejects malformed dates, excessive limits and invalid comparison parameters with 400, without credential/stack disclosure.

## 20. Secrets audit

197 tracked/unignored files scanned for credential/private-key/database URL patterns: no suspicious hits. 11 generated frontend JavaScript bundles: no credential-pattern hits. 12 downloaded GitHub sync log files: no credential-pattern hits. This is a bounded pattern audit, not a claim of exhaustive historical or private-provider-log inspection. DATABASE_URL/DIRECT_URL remain platform settings; .env.example placeholders only.

## 21. Logging

Report export logs limited to type/format/count/duration. Safe error responses do not serialize credentials/stack. SyncLog and summary artifacts available; manual job cmu1gbntt0000rl42btozxohj correlated with six source records. No direct Netlify private error-console audit was available; observed HTTP tests contain no P1000/P2028/EMAXCONNSESSION or 500.

## 22. Health endpoint

/api/health HTTP 200, status ok, application ok, PostgreSQL/Prisma, phase 9, version 1.0.0. Source health independently reported.

## 23. Performance tests

Root cause: all routes loaded complete Dashboard statistics plus sources and list serially. getPageData now loads only consumed datasets. Topics uses one category aggregation; Dashboard singleton/max1 unchanged. No broad architecture rewrite or caching consistency tradeoff.

| Page | Before (s) | Final ordinary request (s) |
|---|---:|---:|
| / | 14.161 | 7.271 |
| /today | 7.790 | 1.706 |
| /notifications | 8.522 | 0.943 |
| /reports | 8.565 | 2.398 |
| /agencies | 8.766 | 1.635 |

## 24. Concurrency results

Final 21 simultaneous page/API requests all 200, no database error/fallback. All 13 HTML page responses within 2.398–7.875 seconds; Dashboard API peak 10.575 seconds under concurrent load is a non-blocking full-optimization follow-up. These are end-to-end HTTP timings from this client, not browser interaction or an SLA.

| Path | HTTP | Seconds |
|---|---:|---:|
| / | 200 | 6.473 |
| /today | 200 | 2.792 |
| /regulations | 200 | 7.301 |
| /regulations/cmtwhaiwp001vxt42g60o0mnd | 200 | 6.884 |
| /updates | 200 | 7.875 |
| /watchlist | 200 | 2.398 |
| /notifications | 200 | 5.101 |
| /digest | 200 | 5.249 |
| /reports | 200 | 7.220 |
| /ai-tools | 200 | 7.834 |
| /agencies | 200 | 2.803 |
| /settings | 200 | 6.265 |
| /topics | 200 | 5.907 |
| /api/health | 200 | 5.514 |
| /api/dashboard | 200 | 10.575 |
| /api/changes | 200 | 5.927 |
| /api/watchlists | 200 | 2.149 |
| /api/notifications | 200 | 5.909 |
| /api/digests | 200 | 5.323 |
| /api/sources | 200 | 2.374 |
| /api/ai | 200 | 1.106 |

## 25. Database integrity

Before/after production exports/concurrent checks: regulations, change list, watchlists, notifications and digests unchanged by hash. Isolated DB smoke also compares complete records, versions and derived models. Production 38 real regulations / 38 snapshots / Mock 0. No migration, delete, restore or mock fallback.

## 26. Production deployment

Netlify https://creative-starship-b64072.netlify.app serves V1.0.0 Reports and the selective Topics payload. Netlify deploy badge success observed. Accepted application commit 6ad5c4bdc4b83d8038bde1acebd732733735d141; CI 34868769098 success (previous report CI 34867142916 success). Final documentation-only commit carries this acceptance without application changes.

## 27. UI validation

Production HTML for Dashboard, Today, Regulations, detail, Updates, Watchlist, Notifications, Digest, Reports, AI Tools, Agencies, Settings and Topics returns 200 without error fallback. Report UI includes preview, filters, downloads and visible empty/error states. Live clicks are not claimed.

## 28. API validation

Health/Dashboard/changes/watchlists/notifications/digests/sources/AI 200 in concurrent round. All report previews and CSV types 200; three PDF types 200; invalid-date/limit/comparison tests 400. Local comparison export with two actual fixture versions returned unchanged_fields. Full automatic suite 141/141; lint/typecheck/build/isolated PostgreSQL production smoke passed.

## 29. Browser validation

CUA inventory succeeded; getTab timed out and reset its kernel. Used the explicitly allowed HTTP/HTML/API plus PDF visual fallback. Clipboard, external AI login and actual browser click navigation were not verified.

## 30. Responsive validation

Existing 640/900/1200 CSS breakpoints preserved; report inputs/preformatted content constrained with min-width/overflow wrapping. Build/HTML/CSS inspection completed. Live mobile viewport/interaction inspection unavailable due to the browser-control timeout; non-blocking limitation, not falsely recorded as a visual pass.

## 31. Backup / recovery strategy

RECOVERY_RUNBOOK.md documents rollback, incident diagnosis, secure logical backup and isolated restore validation. Free Supabase backup entitlement/retention not assumed. No backup/restore drill or backup availability verified in private console. Operator should maintain encrypted offsite exports. Immutable history cannot be regenerated from only the latest official page.

## 32. Known limitations

CDE access verification; full PDF-body semantic parsing not implemented; production changes currently empty; bounded report/picker scope; PDF uses vertical fields; PPTX deferred; shared workspace is not private multi-tenancy; browser interaction unavailable; full performance optimization including Dashboard peak and cold starts remains separate. None changes the agreed minimum release scope.

## 33. Release notes

README.md, AGENTS.md, CHANGELOG.md, RELEASE_NOTES.md, RECOVERY_RUNBOOK.md and this report maintained. Main implementation files: src/server/reports/*, src/components/reports.tsx, src/app/api/reports/route.ts, src/server/page-data.ts, src/server/repositories/dashboard-repository.ts, src/components/workspace.tsx, src/app/[[...slug]]/page.tsx, health/http/CSS, next.config.ts, font/license, package files and report/smoke tests.

## 34. Final release decision

Phase 9: PASSED. Required production, reports, Chinese export, read-only, six-source isolation, data integrity, CI and minimal page-performance gates passed. BioReg V1.0.0 release authorized; tag/release created after this report commit is verified. No Phase 10 work.
