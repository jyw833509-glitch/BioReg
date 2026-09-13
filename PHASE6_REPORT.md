# Phase 6 — Change Detection & Version History

Status: PASSED — production acceptance completed on 2026-09-13 (UTC).

Application commit: `b5c1289606059037453718218b4d89804bd196ae` on main. Hosting remains Netlify, database remains Supabase PostgreSQL, and scheduling remains GitHub Actions.

## Implementation

Rule-based Metadata Diff, normalized SHA-256 fingerprints, and bounded LCS paragraph comparison run inside the existing shared Writer. No LLM/API is used. Existing unchanged records are compared semantically, so switching hash algorithms does not create versions. Changed records produce a new immutable RegulationVersion and ChangeEvent in the same transaction. Existing snapshots are never overwritten; a missing legacy snapshot is preserved before the current row is changed.

## Data and migration

Additive migration `202609120001_change_events` creates ChangeEvent with regulation/current/previous version references, detected time, types, old/new changed fields, section changes, rule summary and severity. Database triggers enforce chain consistency and prevent event update/delete. Existing RegulationVersion JSON snapshots already contain structured official fields, title, dates, URLs and captured content; no destructive schema migration is required. Labels explicitly say BioReg Internal Version, not official version numbers.

## Rules

Supported taxonomy: NEW_DOCUMENT, METADATA_CHANGED, TITLE_CHANGED, STATUS_CHANGED, DRAFT_TO_FINAL, FINAL_TO_REVISED, PUBLICATION_DATE_CHANGED, EFFECTIVE_DATE_CHANGED, PDF_CHANGED, ATTACHMENT_CHANGED, CONTENT_CHANGED, SECTION_ADDED, SECTION_REMOVED, SECTION_MODIFIED, DOCUMENT_WITHDRAWN, DOCUMENT_SUPERSEDED, UNKNOWN_CHANGE (unstructured legacy comparison fallback).

High: draft-to-final, final-to-revised, withdrawal, supersession, effective-date change. Medium: content/paragraph/PDF/attachment change. Low: other metadata and initial discovery. Rules live in `src/server/changes/detect.ts`.

Normalization: NFKC, whitespace/wrapping, HTML formatting, navigation/header/footer containers, repeated page-edge lines when form-feed page boundaries exist, explicit page-number lines, generated/download timestamps, sorted attachment/metadata arrays, tracking and temporary signed URL parameters. Semantic date and identity URL parameters are retained. A canonical URL is normalized before identity lookup.

## Capture safeguards

Existing HTTP/parser validation remains in force for all six sources, including 202 verification and access denial. Writer adds empty-content and verification checks. Valid CDE tables, PMDA attachment listings and ICH structured file catalog entries may remain metadata-only when their known parser metadata and attachments are present; no body text is invented. Invalid input never reaches version/event creation. Withdrawn and superseded records are retained.

## APIs and UI

- GET /api/changes?regulationId=…&limit=… (limit=1 returns latest event).
- GET /api/regulations/:id/versions (complete history).
- GET /api/regulations/:id/versions/:versionId.
- GET /api/regulations/:id/compare?from=…&to=… (same-regulation scope enforced).
- Updates displays stored events, severity, summary, old/new values and paragraph changes.
- Detail displays events and all historical snapshots, detected timestamps and internal version labels.
- Official facts and BioReg analysis are explicitly separated. Page visits do not create or persist detection events; explicit version comparison is read-only.

## Tests

85 automated tests cover metadata/status/content/attachments, added/removed/modified paragraphs, normalization and tracking noise, rejected captures, transactional event/version writes, immutable history, scoped comparison, and existing scheduler/isolation behavior. Production-mode smoke checks exercise the new APIs and event UI with fixtures in a disposable random schema only.

## Production acceptance

Baseline captured before deployment: 38 real regulations and 38 immutable snapshots. Post-deployment verification at 2026-09-13T15:42:13Z confirms all 38 original snapshot IDs and exact snapshot contents retained, 38 total versions, 38 real regulations and zero Mock records. Unchanged official captures generated no additional versions or events.

- Production additive migration succeeded in [initial sync](https://github.com/jyw833509-glitch/BioReg/actions/runs/34752662449); subsequent preparation steps also succeeded.
- [Main CI](https://github.com/jyw833509-glitch/BioReg/actions/runs/34753486942): success. Lint, typecheck, all 85 tests, production build and isolated production-mode smoke checks passed.
- [Manual six-source sync](https://github.com/jyw833509-glitch/BioReg/actions/runs/34753072705): success; all sources had zero new/updated records. Initial validation identified valid ICH metadata-only concept papers being rejected by the empty-body guard. The explicit structured-metadata exception and regression test fixed this without inventing body text or weakening denial-page rejection.
- [Natural scheduled sync](https://github.com/jyw833509-glitch/BioReg/actions/runs/34762572041): event `schedule`, main application commit, success. Database preparation, sequential scheduler and sanitized summary steps all succeeded. This was a real natural trigger, not manual dispatch.
- [Production website](https://creative-starship-b64072.netlify.app): new Phase 6 routes and labels are live. Netlify official deployment-status badge reports success.
- At 2026-09-13T15:38:27Z, three rounds of eight concurrent requests to `/`, `/today`, `/regulations`, `/updates`, `/agencies`, `/watchlist`, `/api/health` and `/api/dashboard` passed: **24/24 HTTP 200 with valid content**, no database-error fallback. Slowest request per round: 13,612 ms, 8,481 ms and 8,736 ms. Cold/network latency remains material; this is a bounded stability test, not a latency SLA.
- `/api/changes` returned HTTP 200 and zero events, consistent with unchanged captures. Specific historical version and regulation detail returned HTTP 200; comparing a version with itself returned no changes. Missing version returned HTTP 404. Detail rendered both internal-version and BioReg-analysis labels.
- Event creation and changed-content rendering were tested in the disposable integration/smoke database; no synthetic events were inserted into production for demonstration.

Source health after natural sync: FDA HEALTHY; EMA HEALTHY; NMPA HEALTHY; ICH HEALTHY; PMDA HEALTHY; CDE DEGRADED (official access restriction, isolated). No unexpected version growth occurred after the natural trigger.

## Modified areas and connection architecture

Changes include `prisma/schema.prisma`, the additive migration, `src/server/changes/normalize.ts`, `src/server/changes/detect.ts`, the shared connector Writer, change repository and API routes, page-data integration, change-events/workspace UI, and unit/integration/smoke tests. The ICH metadata-only exception is in the shared Writer and covered by a database test.

Web runtime continues to use the Supabase Transaction Pooler DATABASE_URL with the existing small singleton pool. Migration/CLI and scheduler locking retain the established DIRECT_URL connection. No hosting, secrets or scheduler infrastructure was replaced; credentials were not added to committed files.

Acceptance evidence is from actual HTTP responses, preserved snapshot comparisons, GitHub Actions and the official Netlify status badge. Private Netlify function logs were not accessible; this report does not assert that all historical logs are error-free or guarantee indefinite availability.

## Known limits

Adapters retain their current capture scope: many provide metadata, introductions or summaries, not complete PDF text. Paragraph diffs apply only to text actually captured, not unavailable full documents. No binary PDF downloader was added. PDF/attachment URL changes are confirmed link facts, not proof of binary content changes; an adapter-supplied file_content_hash can detect a same-URL file replacement. Legacy opaque adapter hashes are not treated as independent evidence because they also change with formatting; canonical fingerprints are used instead.

Paragraph comparison is capped at 400 units by combining the remaining tail, preserving full text in snapshots. Page-edge removal requires page boundaries; it does not guess arbitrary recurring legal sentences are boilerplate. The first 50 events are displayed by default (API maximum 100); complete RegulationVersion history remains available. No Phase 7 work is included.
