# Historical official catalog expansion — acceptance

Existing directory queue, Regulation/RegulationVersion, weekly scheduler and search routes are reused. Full text is not an admission requirement for verified directory records. No subscription bypass; no generic search portal counted as a document.

Completed full-source runs: 42336154814 and repeat 42336479199. Initial new records: FDA 45, EMA 29, ICH 91, USP 11, EDQM 1, PMDA 63, NMPA 0, CDE 0 (total 240). Repeat: every source new=0 and updated=0. First run ICH updated six existing records for specific official document links; immutable prior versions retained.

Remaining limitations: FDA general-biologics directory yielded no recognized document links; EMA clinical-pharmacology FAQ uses a different layout and was not ingested; EDQM two main directory endpoints HTTP403; CDE HTTP202. EDQM public 2.6.14 FAQ was successfully ingested through its supported official FAQ host. Source degradation remains truthful.

USP general-methods directory subsequently verified: contains bacterial endotoxins <85>, microbial enumeration <61>, limits for non-sterile products <1111>, sterility <71>. Follow-up run 42375465339 on d39b387c15ce25298bc016650ee20e8f11703bf8 added 12 records. Repeat 42375800718: found 31, new 0, updated 0, failed 0. Both succeeded, including engagement post-processing and summary artifact upload.

Total added across this expansion: 252 (FDA 45, EMA 29, ICH 91, USP 23, EDQM 1, PMDA 63, NMPA 0, CDE 0). Read-only production audit at 2026-11-07T13:15:52Z: 321 regulations, 335 immutable versions, 297 change events, 51 digests. All 69 baseline regulation IDs retained; Mock=0; duplicate (source_id, canonical_url) groups=0. Current source totals: FDA 61, EMA 50, NMPA 6, CDE 0, ICH 100, PMDA 72, USP 31, EDQM 1.

CI 42374737823 on d39b387 passed dependency install, isolated database preparation, lint, typecheck, all tests, production build and production-mode HTTP smoke. No schema change is required for this expansion. Existing production migration remains unchanged. Deployment and final production HTTP checks are recorded below after publication.

ICH Q5A and Q5A(R2) searches return separate ICH original and EMA regional implementation records. Q5A detail has directory summary (498 characters), not PDF full text. No claim of full Q-series or complete agency archives: each initial source run capped at 100 documents.
