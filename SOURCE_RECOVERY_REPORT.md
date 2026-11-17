# EMA / EDQM / CDE source recovery

## Scope and evidence

This repair preserves the existing Actions → Supabase → Netlify architecture, source-local document identity, immutable history, translations and field-review pipeline. No database migration, production deletion or mock records were introduced. A healthy workflow does not mean every agency endpoint was reachable.

## Verified causes and changes

- **EMA:** GitHub-hosted requests intermittently receive HTTP 429. Added the agency's documented scientific-guidelines JSON catalog, validated its declared row count and accepted only specific human-use biological guideline URLs. A newly fetched catalog can support metadata-only indexing when detail fetch fails; stale catalog data cannot be replayed as fresh evidence. Existing richer records are preserved. Honor Retry-After and defer further requests to a rate-limited host. Both original HTML directories remain configured and failures remain visible.
- **EDQM:** Both main-site technical-guide / harmonisation directories return HTTP 403. The public MICROBIOLOGY FAQ directory remains accessible. Its chapter-specific “Other questions…” page had been excluded by a parser requiring a question mark; corrected this. No subscription content is fetched and blocked main-site coverage remains DEGRADED.
- **CDE:** The primary guidance directory returns HTTP 202 verification content. Added the official regional center's public search with bounded pagination and verified announcement detail extraction. Accept the center's observed CDE source-attribution variants and ICH titles whose “guideline” qualifier is outside quotation marks. Consultation status is derived from explicit consultation announcements. Training notices are not regulatory documents. Retained historical candidates that cannot be verified remain visible as failures rather than being deleted.

## Cloud runs

| Run | Code | Result |
|---|---|---|
| 43973878500 | ad400cb | Workflow success; EMA blocked; EDQM +1; CDE +22 / 1 updated; source outcome PARTIAL_SUCCESS |
| 43976336966 | b28ea74 | EMA +59 / 1 updated; CDE +46 / 1 updated; EDQM unchanged; final title gate failed for 3 unapproved translations |
| 43980191178 | b28ea74 | Queued repeat cancelled to incorporate reviewed titles; not acceptance evidence |
| 43980605973 | 797fc91 | EMA +1; CDE and EDQM 0 new / 0 updated; final title gate still failed because review entries were not yet registered in import catalog |

The three vaccine-title corrections were subsequently registered in the hashed reviewed-title catalog in commit 0051ee3. They are BioReg translations, not official Chinese publications. Earlier failed gates are retained in this report.

## Coverage limitations

Specific official pages suffice for indexing. Catalog-only EMA records have no claimed full text or invented document dates. Page publication dates are not silently substituted for document publication dates. EDQM public FAQ supplements do not establish subscription pharmacopoeia coverage. CDE regional republications are not a complete CDE archive. No 403/202/429 response is treated as a successful document.

## Final acceptance

Cloud workflow 44083952562 at 0051ee3 completed successfully, including all enrichment gates: 593 records, 612 versions, 574 changes, 53 digests, Mock = 0, missing Chinese = 0. Regulatory source outcome remains PARTIAL_SUCCESS for the documented external restrictions. Production deployment verification will be recorded after publication.

## Production data checks before deployment

- Initial 464 official records all retained. Final indexed count at repeat check: 593; Mock = 0; missing Chinese titles = 0.
- Source totals / additions: EMA 111 / +60; EDQM 4 / +1; CDE 69 / +68. Other sources unchanged (FDA 135, ICH 160, PMDA 72, NMPA 11, USP 31), including their record versions and content hashes.
- Run 44083952562: all three sources 0 new / 0 updated. EDQM 4 and CDE 69 existing documents skipped. EMA had 103 failed/deferred fetch operations and no successful recapture; its unchanged counts do not prove stable upstream availability. CDE retains the primary 202 failure and rejects three historical training-notice candidates as non-documents. EDQM retains both 403 failures.
- Between pre-repeat and repeat public API snapshots: 593 → 593 records; 0 missing records; 0 duplicate source/canonical URL keys; no system-version changes.
- Search checks: Q5A(R2) 3; ICH Q5A 3; 细胞治疗药品范围 1; 内毒素 3; general chapters 4; unique nonexistent query 0.
- Official-link labels resolve to the stored official URL. Sample EMA guideline, EDQM endotoxin FAQ and CDE cell-therapy announcement returned HTTP 200 from the verification host; this does not erase GitHub-hosted rate limits.
- Core pages, health/dashboard/sources APIs and two rounds of four concurrent page requests returned 200. Agencies remained relatively slow (about 7 seconds in this check); this task does not claim a new performance target.
- CI 44083950344 at 0051ee3 passed (lint, typecheck, 194 tests, production build, production-mode HTTP smoke).
