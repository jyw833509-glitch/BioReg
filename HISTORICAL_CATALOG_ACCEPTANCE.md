# Historical official catalog expansion — acceptance

Existing directory queue, Regulation/RegulationVersion, weekly scheduler and search routes are reused. Full text is not an admission requirement for verified directory records. No subscription bypass; no generic search portal counted as a document.

Completed full-source runs: 42336154814 and repeat 42336479199. Initial new records: FDA 45, EMA 29, ICH 91, USP 11, EDQM 1, PMDA 63, NMPA 0, CDE 0 (total 240). Repeat: every source new=0 and updated=0. First run ICH updated six existing records for specific official document links; immutable prior versions retained.

Remaining limitations: FDA general-biologics directory yielded no recognized document links; EMA clinical-pharmacology FAQ uses a different layout and was not ingested; EDQM two main directory endpoints HTTP403; CDE HTTP202. EDQM public 2.6.14 FAQ was successfully ingested through its supported official FAQ host. Source degradation remains truthful.

USP general-methods directory subsequently verified: contains bacterial endotoxins <85>, microbial enumeration <61>, limits for non-sterile products <1111>, sterility <71>. Follow-up run 42375465339 on d39b387c15ce25298bc016650ee20e8f11703bf8 added 12 records. Repeat 42375800718: found 31, new 0, updated 0, failed 0. Both succeeded, including engagement post-processing and summary artifact upload.

Total added across this expansion: 252 (FDA 45, EMA 29, ICH 91, USP 23, EDQM 1, PMDA 63, NMPA 0, CDE 0). Read-only production audit at 2026-11-07T13:15:52Z: 321 regulations, 335 immutable versions, 297 change events, 51 digests. All 69 baseline regulation IDs retained; Mock=0; duplicate (source_id, canonical_url) groups=0. Current source totals: FDA 61, EMA 50, NMPA 6, CDE 0, ICH 100, PMDA 72, USP 31, EDQM 1.

CI 42374737823 on d39b387 passed dependency install, isolated database preparation, lint, typecheck, all tests, production build and production-mode HTTP smoke. No schema change is required for this expansion. Existing production migration remains unchanged. Deployment and final production HTTP checks are recorded below after publication.

ICH Q5A and Q5A(R2) searches return separate ICH original and EMA regional implementation records. Q5A detail has directory summary (498 characters), not PDF full text. Each run is capped at 100 documents; subsequent incremental rotations continue the retained official directory queue.

## Follow-up ICH coverage and parser correction (2026-11-08)

Runs 42377015444 / 42377470407 / 42377969747 continued the existing ICH rotation: new 0 / 55 / 0, updated 0 throughout. The last run was a successful no-change recheck. The official directory contains trailing whitespace in Q3C(R9)'s code and Q12's Guideline group name. Trimming these structural fields fixes omitted records without inferring regulatory facts; a regression test covers both cases. CI 42439688600 on 46f5ceba25e3ef35b5bc4b747e14fcc4c018de67 passed all validation gates. Run 42439902567 added two records with no updates; the following rotation and final integrity checks are pending at this release checkpoint.

## Production HTTP acceptance

Release d82d192ea2d927ce6a88bb6da9218c0f7ef4e77b was served by Netlify (`X-BioReg-Commit`), /api/health HTTP 200. Its CI 42376272107 passed all gates. Dashboard, Today, Regulations, Updates, Agencies, Watchlist, Notifications, Digest and a document detail returned 200 without the database error view. Two rounds of four concurrent requests also returned 200 (observed response headers 0.4–2.8 seconds; this is not browser paint timing or a latency guarantee).

Searches: ICH Q5A and Q5A(R2) each returned 2 results (ICH and EMA separately); 内毒素/endotoxin each 2, 微生物/microbial each 4, 无菌 6; a synthetic absent query returned 0. Number searches <85>, <61>, <71> locate corresponding chapters but may also match references in other captured text. USP <61> (PDG Q-05b), <85> (PDG Q-06), <71> (PDG Q-11) official document pages and the EDQM 2.6.14 FAQ returned HTTP 200. USP records have full_text_captured=false, short public catalog excerpts only, unknown publication/effective dates and status; the detail displays the subscription notice. Q1A retains two immutable versions and its previous-version link.

Limits: no complete agency/pharmacopoeia archive claim; no full PDF extraction claim; no subscription content obtained. USP PDG sign-off information is not represented as a chapter effective date. EDQM coverage is currently one specific public FAQ, not the full European Pharmacopoeia chapters. Supplementary ICH materials and other sources may point to a public directory plus an attached official PDF. Final post-correction deployment and rotation evidence will be appended after verification.
