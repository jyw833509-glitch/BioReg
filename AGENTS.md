<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BioReg maintenance rules

- Preserve GitHub Actions → Supabase PostgreSQL → Netlify + Next.js. Runtime DATABASE_URL uses Transaction Pooler; DIRECT_URL is for CLI/migrations/sync. Keep singleton and small connection pool; avoid parallel database fan-out.
- Official Fact, BioReg Translation, BioReg System Summary and External AI Interpretation are separate. Never invent or overwrite regulatory facts using AI.
- Ingest only supported official agency endpoints. Reject verification/login/empty/error pages; isolate failures and retain truthful source health.
- Preserve immutable versions and history. Never fabricate production changes or seed Mock records for acceptance. Test fixtures belong in isolated schemas.
- Reports and AI prompts are read-only derived outputs. Label missing fields, limits, source URLs, IDs and deterministic comparisons. Never imply complete PDF parsing when only captured text exists.
- No secrets in Git, browser bundles, logs or reports. No account credentials or private AI keys. Current external AI providers: DeepSeek, Doubao, Qwen, Kimi.
- Run lint, typecheck, all tests, build and production-mode HTTP smoke for functional changes. Release only after CI, production API/page/concurrency and data integrity gates pass.
- Consult RECOVERY_RUNBOOK.md before recovery; production deletion/restore requires explicit operator authorization. Keep backups private and encrypted.
