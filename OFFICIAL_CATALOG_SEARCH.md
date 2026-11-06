# Official catalog search — implementation and acceptance

Status: implemented and pushed; production migration/deployment not yet accepted.

Reuses Regulation, RegulationVersion, existing search routes and weekly Regulatory Sync. CatalogEntry is a discovery queue, not a parallel document index. Existing version history and change tracking remain intact. No additional cron.

Coverage: existing six configured sources plus public USP PDG directory and EDQM technical-guide/PDG directories. FDA additionally discovers historical cell/gene-therapy guidance. Directory links persist for gradual rotation; these are not counted as validated search results. Embedded metadata absent from a refreshed directory is not replayed as fresh evidence. No claim of complete historical coverage.

Search: curated bilingual synonyms, document numbers, title/summary/captured-body matching, relevance/date ordering and source/region/type/status/date/effect filters. Missing fields remain marked. ICH publication step and separately captured regional implementation statements are distinct. Internal snapshots are not claimed as official version designations.

Official extensions are explicitly labeled navigation entries, not live external search results. FDA/EMA carry keywords; other entries open official portals. USP/EP content is public catalog metadata only; no subscription credentials, access bypass or complete PDF extraction. Local live probe read the USP directory; EDQM returned HTTP 403. Cloud access may differ and must be recorded after synchronization.

Validation so far: local lint, typecheck and production build passed; eight focused search/product tests passed. Full CI run 41741824722 on 5d928e3ade569422f4a98dc044613ac93113e8a3 pending at this checkpoint. Required remaining gates: full database/smoke suite, migration through existing workflow, bounded official sync, production deployment, historical/identifier/bilingual/link/version/empty-result and integrity checks.

The previously withheld agency/update-page performance experiment was reverted before this feature, keeping that user decision out of this release.

## Production backup and restore gate — 2026-11-06
- Encrypted full database custom-format dump completed 2026-11-06 01:15:19 UTC; private local storage outside Git, AES-256-GCM, key protected with Windows DPAPI. Original retained.
- SHA-256: 889557a4e7299abe8c7959a4b8d575d5470c78f005acceccf1fcb444fcad8b53.
- Official isolated Docker image supabase/postgres:17.6.1.136, digest sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00. Network disabled, no published ports.
- pg_restore exited 0 with all database schema/data restored. Test restore uses no-owner/no-acl; this validates structure/data recovery, not a production permission/credential cutover. Cluster roles/passwords are not contained in pg_dump.
- Production and restored table row counts AND canonical row-content hashes matched: regulations 52; regulation_versions 60; change_events 22; daily_digests 51; notification_events 2; watchlists 0; watchlist_matches 0; sync_jobs 272; sync_logs 460.
- Vault is installed but unused by application code and has zero production secrets. Isolated create/decrypt test passed inside a rolled-back transaction; no test secret retained. No claim of recovering production Vault encryption keys.
- Full CI run 41833038566 on 04a45420119c74c5b77ab90490787b119070162d passed, including lint/typecheck/tests/build/HTTP smoke.
- Existing Regulatory Sync run 42191797036 dispatched after restore verification. Migration/sync and release acceptance remain pending until actual results are inspected.

## Migration and bounded initial catalog sync
2026-11-06: existing workflow 42193589906 completed successfully; migration/source preparation succeeded. Scheduler result PARTIAL_SUCCESS (truthful source isolation): FDA +3, EMA +6, USP +8, NMPA +0; CDE/EDQM unavailable, ICH/PMDA partial. EDQM official endpoints returned HTTP 403. No whole-archive coverage claim. This release commit enables Netlify auto-deployment after the database gate; production HTTP acceptance remains pending.

## Live deployment checks
Release 2c732e686e230dff2b580970412aa58482079f87 confirmed by production /api/health HTTP 200 X-BioReg-Commit. Core pages /regulations,/today,/updates,/agencies,/watchlist,/notifications,/digest returned 200 without database-unavailable fallback. Live queries: stability=4, 稳定性=4, ICH Q5A=1, G-01=1; deliberately unmatched query=0. Returned official URLs include ICH/EMA/USP. Production totals after bounded sync: regulations 69, versions 77, changes 39, digests 51 (same digest content as backup); 17 new regulations/versions/changes match sync totals. Mock in all 69 API records: 0. No complete archive/full-text or visual browser validation claimed. Source access/parse limitations remain as recorded above.
