# Official source repair and UI acceptance — 2026-11-08

## Scope and evidence

Preserves the existing scheduler, PostgreSQL schema, immutable history, auth and Netlify deployment flow. No migration or data deletion is required. Monday cron remains unchanged. Full text is not required for an individually verified official document; missing regulatory facts remain missing.

Baseline: 381 official records (FDA 61, EMA 50, NMPA 6, CDE 0, ICH 160, PMDA 72, USP 31, EDQM 1). Private read-only baseline audit saved under `.data/source-repair-before.json`; no credentials in this report.

## Repairs

- FDA: traverse the eight official subdirectories linked by the general biologics guidance hub, with bounded depth, host validation and preserved child errors. A directory is not a document result. Admit verified official guidance metadata even when body text is absent.
- EMA: parse the specific scientific clinical pharmacology / pharmacokinetics HTML Q&A, in addition to existing attachment cards. Do not fabricate dates or claim PDF extraction.
- EDQM: retain both restricted main endpoints and add the official microbiology FAQ directory, indexing only specific public question pages. Directory navigation is not indexed as a document.
- CDE: retain the restricted main directory and index an attributed official NMPA Yangtze River Delta review-center republication of the biosimilar labeling guideline. The republication date is not treated as the original guideline publication date. Reuse the verified embedded document during normalization rather than reparsing empty HTML.
- Status: distinguish latest task outcome from aggregate source coverage; expose partial success, affected URLs, error categories/counts and last complete successful sync. Unfinished logs display RUNNING rather than their provisional storage status.
- UI: remove homepage admin and daily-export entry points; link administrator login from Settings. Existing session and authorization checks remain intact.

## First real cloud sync

Run [42462163677](https://github.com/jyw833509-glitch/BioReg/actions/runs/42462163677), commit `d0168252d3b4332bb415b2eed1a7e30c6118f34e`, manual initial mode, limit 100 per source. Workflow success; actual job PARTIAL_SUCCESS, correctly distinct.

| Source | New | Updated | Actual result |
|---|---:|---:|---|
| FDA | 74 | 0 | SUCCESS / HEALTHY; 100 selected from 525 discovered links |
| EMA | 1 | 0 | SUCCESS / HEALTHY; 51 selected |
| EDQM | 2 | 1 | PARTIAL_SUCCESS / DEGRADED; three public FAQ records; two main endpoints HTTP 403 |
| CDE | 0 | 0 | FAILED / DEGRADED; main HTTP 202 and embedded-document normalization defect subsequently fixed |

Other sources introduced no new or updated records in this run. EDQM's one update records the verified FAQ type and cleaned captured content; previous immutable history is retained.

## Validation and release gate

CI [42464745615](https://github.com/jyw833509-glitch/BioReg/actions/runs/42464745615) on `8f87e70b721f79a72084ea06e15877258bf9ae3d`: lint, typecheck, all automated tests, production build and production-mode HTTP smoke PASS. Smoke includes Settings admin navigation, homepage entry removal, valid isolated admin login and unauthorized access rejection.

Release CI [42465077501](https://github.com/jyw833509-glitch/BioReg/actions/runs/42465077501) also passed all gates. Netlify production serves release commit `69ecbac333f36af8f86ad07354c3c523496fe187`, verified using the production `/api/health` response header on 2026-11-08 at 13:57 UTC. No schema migration was needed.

## Completed cloud and duplicate acceptance

Second all-source sync [42465008027](https://github.com/jyw833509-glitch/BioReg/actions/runs/42465008027), commit `8f87e70b721f79a72084ea06e15877258bf9ae3d`, ran 08:57:26–09:06:32 UTC. Workflow success, actual job PARTIAL_SUCCESS. FDA (100 selected), EMA (51), EDQM (3) each produced **zero new and zero updated records**. CDE successfully added its one verified official republication; only its original main directory remained failed. Other sources had zero new/updated records. All engagement post-processing stages succeeded.

CDE duplicate recheck [42487347413](https://github.com/jyw833509-glitch/BioReg/actions/runs/42487347413), release commit, ran 13:58:05–13:58:21 UTC: one selected, zero new, zero updated, one unchanged; main directory HTTP 202 remains recorded. Workflow success, actual job PARTIAL_SUCCESS. Sanitized summary artifact upload succeeded on these runs; corresponding SyncLogs were checked directly in production.

| Source | Total new in this repair | Current records | Current fetch state |
|---|---:|---:|---|
| FDA | 74 | 135 | HEALTHY; no failed selected endpoints/documents |
| EMA | 1 | 51 | HEALTHY; HTML scientific Q&A now indexed |
| EDQM | 2 | 3 | DEGRADED / partial; public microbiology FAQs work, two main directories 403 |
| CDE | 1 | 1 | DEGRADED / partial; official regional announcement works, main directory 202 |

Final read-only integrity audit at 14:00:27 UTC: **459 regulations, 474 immutable versions, 436 change events, 51 daily digests**. All 381 baseline regulation IDs retained; Mock = 0; duplicate `(source_id, canonical_url)` groups = 0. CDE recheck left regulation/version/change/digest counts unchanged. No production records were deleted.

## Production search, links and UI

- `/api/health`, `/api/dashboard`, `/`, `/today`, `/regulations`, `/updates`, `/agencies`, `/settings`, `/admin`, `/watchlist`: HTTP 200, no database-unavailable page.
- Homepage HTML has neither the admin link nor “导出日报”; it displays PARTIAL_SUCCESS. Settings HTML contains the `/admin` link; login page responds 200. Agencies exposes actual failed URLs and the last-complete-success label.
- Production `/api/admin` returns `admin: false`, configuration ready for an unauthenticated request. An invalid login returns 401. A valid login/session and protected actions were tested with an isolated CI credential, not by exposing or resetting the production key. Browser screenshot/interactive visual inspection was not performed; UI checks inspect rendered HTML and HTTP behavior.
- Search `biosimilar` filtered to FDA returned seven results; `Clinical pharmacology and pharmacokinetics` to EMA returned the newly indexed HTML Q&A; `生物类似药说明书` to CDE returned its new official republication; `2.6.12` to EDQM returned the new microbial-strain FAQ. Representative official links for all four returned HTTP 200, without a verification-page marker.
- Metadata-only FDA record **Quality Management System Information for Certain Premarket Submission Reviews** has no captured body. Exact-title production search found its ID, and its official detail page returned HTTP 200. This verifies body text is not an ingestion/search prerequisite.
- Existing ICH `Q5A(R2)` search still returns its guideline. An additional direct ICH PDF probe timed out during this acceptance; it is not reported as a successful official-link check and was outside the four repaired sources.
- Two rounds of four concurrent core-page requests: all eight returned 200 without database-unavailable content. Observed response-header latency was 0.425–6.672 seconds; this is not a browser paint metric or a guarantee of a 1.5-second performance target.

Representative verified links:

- [FDA metadata-only guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-management-system-information-certain-premarket-submission-reviews)
- [EMA scientific HTML Q&A](https://www.ema.europa.eu/en/scientific-guidelines/clinical-pharmacology-pharmacokinetics-questions-answers)
- [CDE official regional-center republication](https://www.ydcdei.org.cn/news/show/1085607283813265408)
- [EDQM microbiology FAQ](https://faq.edqm.eu/pages/viewpage.action?pageId=89489423)

Local sanitized evidence: `.data/backfill-summary-42462163677.json`, `.data/backfill-summary-42465008027.json`, `.data/backfill-summary-42487347413.json`, `.data/source-repair-live.json`, `.data/source-repair-integrity.json`, `.data/source-repair-metadata-only.json`. These generated files remain outside Git; the report records the outcomes without database credentials.

## Known limits

- EDQM `https://www.edqm.eu/en/ph-eur-technical-guides` and `https://www.edqm.eu/en/harmonisation-status-for-general-texts-pdg-` return HTTP 403; retained as failures, not removed to produce a healthy badge.
- CDE `https://www.cde.org.cn/zdyz/index` returns HTTP 202; the regional-center announcement is a limited official fallback, not a full guidance archive or full-text capture.
- FDA processing is bounded to 100 selected documents per acceptance run. Discovery of 525 links does not mean 525 relevant documents were ingested.
- Public FAQ/announcement metadata does not unlock subscription content. No source is claimed to have complete archive coverage.
