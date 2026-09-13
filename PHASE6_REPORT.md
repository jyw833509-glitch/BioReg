# Phase 6 — Change Detection & Version History

Status: NOT PASSED — implementation checks passed; production migration, sync and hosting acceptance pending.

## Implementation

Rule-based Metadata Diff, normalized SHA-256 fingerprints, and bounded LCS paragraph comparison run inside the existing shared Writer. No LLM/API is used. Existing unchanged records are compared semantically, so switching hash algorithms does not create versions. Changed records produce a new immutable RegulationVersion and ChangeEvent in the same transaction. Existing snapshots are never overwritten; a missing legacy snapshot is preserved before the current row is changed.

## Data and migration

Additive migration `202609120001_change_events` creates ChangeEvent with regulation/current/previous version references, detected time, types, old/new changed fields, section changes, rule summary and severity. Database triggers enforce chain consistency and prevent event update/delete. Existing RegulationVersion JSON snapshots already contain structured official fields, title, dates, URLs and captured content; no destructive schema migration is required. Labels explicitly say BioReg Internal Version, not official version numbers.

## Rules

Supported taxonomy: NEW_DOCUMENT, METADATA_CHANGED, TITLE_CHANGED, STATUS_CHANGED, DRAFT_TO_FINAL, FINAL_TO_REVISED, PUBLICATION_DATE_CHANGED, EFFECTIVE_DATE_CHANGED, PDF_CHANGED, ATTACHMENT_CHANGED, CONTENT_CHANGED, SECTION_ADDED, SECTION_REMOVED, SECTION_MODIFIED, DOCUMENT_WITHDRAWN, DOCUMENT_SUPERSEDED, UNKNOWN_CHANGE (unstructured legacy comparison fallback).

High: draft-to-final, final-to-revised, withdrawal, supersession, effective-date change. Medium: content/paragraph/PDF/attachment change. Low: other metadata and initial discovery. Rules live in `src/server/changes/detect.ts`.

Normalization: NFKC, whitespace/wrapping, HTML formatting, navigation/header/footer containers, repeated page-edge lines when form-feed page boundaries exist, explicit page-number lines, generated/download timestamps, sorted attachment/metadata arrays, tracking and temporary signed URL parameters. Semantic date and identity URL parameters are retained. A canonical URL is normalized before identity lookup.

## Capture safeguards

Existing HTTP/parser validation remains in force for all six sources, including 202 verification and access denial. Writer adds empty-content and verification checks. Valid CDE tables and PMDA attachment listings may remain metadata-only when their known parser metadata and attachments are present; no body text is invented. Invalid input never reaches version/event creation. Withdrawn and superseded records are retained.

## APIs and UI

- GET /api/changes?regulationId=…&limit=… (limit=1 returns latest event).
- GET /api/regulations/:id/versions (complete history).
- GET /api/regulations/:id/versions/:versionId.
- GET /api/regulations/:id/compare?from=…&to=… (same-regulation scope enforced).
- Updates displays stored events, severity, summary, old/new values and paragraph changes.
- Detail displays events and all historical snapshots, detected timestamps and internal version labels.
- Official facts and BioReg analysis are explicitly separated. Page visits do not create or persist detection events; explicit version comparison is read-only.

## Tests

84 automated tests cover metadata/status/content/attachments, added/removed/modified paragraphs, normalization and tracking noise, rejected captures, transactional event/version writes, immutable history, scoped comparison, and existing scheduler/isolation behavior. Production-mode smoke checks exercise the new APIs and event UI with fixtures in a disposable random schema only.

## Production acceptance

Baseline captured before deployment: 38 real regulations and 38 immutable snapshots. Pending migration and two syncs, historical snapshot comparison, production Changes/Updates/Detail checks, CI and bounded concurrent page requests.

## Known limits

Adapters retain their current capture scope: many provide metadata, introductions or summaries, not complete PDF text. Paragraph diffs apply only to text actually captured, not unavailable full documents. No binary PDF downloader was added. PDF/attachment URL changes are confirmed link facts, not proof of binary content changes; an adapter-supplied file_content_hash can detect a same-URL file replacement. Legacy opaque adapter hashes are not treated as independent evidence because they also change with formatting; canonical fingerprints are used instead.

Paragraph comparison is capped at 400 units by combining the remaining tail, preserving full text in snapshots. Page-edge removal requires page boundaries; it does not guess arbitrary recurring legal sentences are boilerplate. The first 50 events are displayed by default (API maximum 100); complete RegulationVersion history remains available. No Phase 7 work is included.
