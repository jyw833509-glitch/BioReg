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

Second real sync `42465008027` is in progress at release preparation. Final duplicate, production data, HTTP/UI and official-link evidence will be appended after deployment; these gates are not yet claimed as passed.

## Known limits

- EDQM `https://www.edqm.eu/en/ph-eur-technical-guides` and `https://www.edqm.eu/en/harmonisation-status-for-general-texts-pdg-` return HTTP 403; retained as failures, not removed to produce a healthy badge.
- CDE `https://www.cde.org.cn/zdyz/index` returns HTTP 202; the regional-center announcement is a limited official fallback, not a full guidance archive or full-text capture.
- FDA processing is bounded to 100 selected documents per acceptance run. Discovery of 525 links does not mean 525 relevant documents were ingested.
- Public FAQ/announcement metadata does not unlock subscription content. No source is claimed to have complete archive coverage.
