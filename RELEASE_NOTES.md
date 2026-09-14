# BioReg V1.0.0

Release candidate — publish only after PHASE9_REPORT.md release gate passes.

BioReg is a public-source biologics regulatory intelligence workspace on GitHub Actions, Supabase PostgreSQL and Netlify/Next.js.

## Capabilities
- FDA, EMA, NMPA, CDE, ICH and PMDA official-source connectors with isolated failures.
- Incremental scheduler, source health, SyncJob/SyncLog and sanitized artifacts.
- Deterministic metadata/hash/captured-text changes and immutable version history.
- Explainable Watchlists, deduplicated in-app Notifications and timezone-aware Daily Digest.
- External AI prompt tools for DeepSeek, Doubao, Qwen and Kimi using the user's own account; no API keys, automatic login or interpretation writeback.
- Read-only Regulation, Change, Version Comparison, Digest, Watchlist, Intelligence Summary and Source Health reports; PDF and UTF-8 CSV exports.
- Explicit Official Fact / Translation / System Summary / External AI Interpretation boundaries; safe errors and recovery documentation.

## Known limitations
CDE may remain DEGRADED under official verification. Full deep PDF parsing is not implemented: comparison uses available captured/parsed text, hashes and metadata, not every PDF's full contents. Production may have no naturally occurring ChangeEvent/multiple-version sample; isolated migrated PostgreSQL HTTP tests cover these paths without manufacturing production changes.

Browser automation may time out; report distinguishes HTTP/API checks from uncompleted clicks. External AI output is outside BioReg and must be verified against official evidence. Reports are bounded (100 rows maximum; 20 histories per regulation); oversized reports require narrower filters. PDF uses readable vertical fields rather than wide dense tables. PPTX is deferred as a non-blocking enhancement.

Shared workspace, not authenticated private multi-user tenancy. Do not add sensitive internal records without separately implementing access control. Free hosting/database availability and backup retention are not guaranteed; see RECOVERY_RUNBOOK.md. Regeneration cannot replace a backup of historical evidence.

