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

Cloud workflow 44083952562 at 0051ee3 completed successfully, including all enrichment gates: 593 records, 612 versions, 574 changes, 53 digests, Mock = 0, missing Chinese = 0. Regulatory source outcome remains PARTIAL_SUCCESS for the documented external restrictions. Production deployment and post-release verification passed as recorded below. This is acceptance of the implemented recovery and truthful partial coverage, not a claim that the externally restricted endpoints are fully recovered.

## Production data checks before deployment

- Initial 464 official records all retained. Final indexed count at repeat check: 593; Mock = 0; missing Chinese titles = 0.
- Source totals / additions: EMA 111 / +60; EDQM 4 / +1; CDE 69 / +68. Other sources unchanged (FDA 135, ICH 160, PMDA 72, NMPA 11, USP 31), including their record versions and content hashes.
- Run 44083952562: all three sources 0 new / 0 updated. EDQM 4 and CDE 69 existing documents skipped. EMA had 103 failed/deferred fetch operations and no successful recapture; its unchanged counts do not prove stable upstream availability. CDE retains the primary 202 failure and rejects three historical training-notice candidates as non-documents. EDQM retains both 403 failures.
- Between pre-repeat and repeat public API snapshots: 593 → 593 records; 0 missing records; 0 duplicate source/canonical URL keys; no system-version changes.
- Search checks: Q5A(R2) 3; ICH Q5A 3; 细胞治疗药品范围 1; 内毒素 3; general chapters 4; unique nonexistent query 0.
- Official-link labels resolve to the stored official URL. Sample EMA guideline, EDQM endotoxin FAQ and CDE cell-therapy announcement returned HTTP 200 from the verification host; this does not erase GitHub-hosted rate limits.
- Core pages, health/dashboard/sources APIs and two rounds of four concurrent page requests returned 200. Agencies remained relatively slow (about 7 seconds in this check); this task does not claim a new performance target.
- CI 44083950344 at 0051ee3 passed (lint, typecheck, 194 tests, production build, production-mode HTTP smoke).

## Published release and final acceptance

- Production SHA: `585fc91612a4235037bf89ad1e5f8bc1d99ef890`, verified through the live `/api/health` response header. Release CI `44088069771`: success.
- Post-release verification began 2026-11-17T13:02:21.107Z; health, dashboard, sources, core pages and eight concurrent page requests all returned HTTP 200. Concurrent timings: 615–2678 ms in this bounded check.
- All 593 records retain Chinese titles; original 464 records remain; source totals and query results match the preceding checks.
- Newly indexed records tested via rendered detail pages and their actual official links:
  - EMA: `cmwjvqrkr0022z14ytwbxtvae`; 关于草药药品和传统草药药品微生物学方面的思考文件; official HTTP 200; https://www.ema.europa.eu/en/scientific-guidelines/microbiological-aspects-herbal-medicinal-products-traditional-herbal-medicinal-products
  - EDQM: `cmwjuzvj100032j4y0z05zpb5`; 其他关于通则章节2.6.12、2.6.13、5.1.1、5.1.2、5.1.3和5.1.4的问题; official HTTP 200; https://faq.edqm.eu/display/FAQS/Other+questions+on+general+chapters+2.6.12%2C+2.6.13%2C+5.1.1%2C+5.1.2%2C+5.1.3+and+5.1.4
  - CDE: `cmwjv0n1900072j4yk7sqi6j7`; 细胞治疗药品范围和归类技术指导原则（2026年版）; official HTTP 200; https://www.ydcdei.org.cn/news/show/1271512308258189312

Final disposition: code, CI, real cloud synchronization, repeat-data integrity, production deployment and online search/link acceptance completed. EMA 429, EDQM main-directory 403 and CDE main-directory 202 remain external limitations. Their health remains DEGRADED and aggregate coverage remains PARTIAL_SUCCESS. EMA metadata-only fallback was exercised successfully in earlier runs; the final blocked repeat proves preservation, not successful detail recapture. Future due runs continue through the existing Monday workflow and enrichment/quality gates. No extra cron, infrastructure or subscription bypass was introduced.
