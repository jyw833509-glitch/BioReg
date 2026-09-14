# Phase 8 — External AI Tools

Status: NOT PASSED — implementation and local acceptance complete; CI and production acceptance pending.

## Architecture and scope

Phase 7 is PASSED. Existing Netlify + Supabase + GitHub Actions architecture and scheduler remain unchanged. A read-only `/api/ai` service assembles saved official context and deterministic prompts. No migration, AI API, credentials, automatic login, provider scraping, AI output ingestion or official-data writes are introduced. Users preview and copy a prompt, then open their own external AI account and paste it themselves.

Unified configuration: `src/lib/external-ai.ts`. Context builder and generator: `src/server/ai/`. UI: `src/components/ai-tools.tsx`, integrated into existing AI Tools, regulation detail/card entry, ChangeEvents and saved Digest pages. Version History links to a two-version selector. The server verifies both version IDs belong to the requested regulation; identical IDs and missing records are rejected.

## Providers and templates

Official HTTPS homepages only, without prompt parameters, credentials or tokens:

- DeepSeek: https://chat.deepseek.com/ (official reference: https://deepseek.com/en/news/deepseek-v3-1/)
- Doubao: https://www.doubao.com/ (official reference: https://www.doubao.com/about)
- Qwen: https://chat.qwen.ai/
- ChatGPT: https://chatgpt.com/

Provider records contain id, name, homepage_url, enabled and description. Disabled providers cannot generate prompts. Templates have applicable contexts, instructions, body, version and enabled status. Twelve templates: Regulation Explain; Regulatory Impact Analysis; CMC / Quality Analysis; Clinical Analysis; Nonclinical Analysis; Change Analysis; Version Comparison; Department Impact; Action Items; Chinese Explanation; Bilingual Summary; Daily Digest Analysis.

CMC includes all requested quality topics and requires explicit non-confirmation for unsupported topics. Product types and departments are analysis context, not inferred official requirements. Chinese / English / Bilingual output instructions are supported.

## Evidence and size controls

Official Fact, BioReg Translation, BioReg System Summary and External AI Interpretation are separately labeled. Missing summaries/text are explicitly unavailable. Change context contains previous/current captured versions, changed fields, old/new values, sections and deterministic summary. Comparison reuses the existing deterministic diff. Saved Digest context is labeled system summary, including its persisted Watchlist Match aggregates.

Context levels allocate 6,000 / 16,000 / 36,000 data characters for compact / standard / detailed. Metadata and diff receive priority before bodies; each metadata block is limited to 4,500 characters and body blocks to 5,000 or 22,000. Compact explicitly omits body text. Labels, instructions and truncation notices add bounded overhead. Longer content is clipped in labeled blocks with `[Content truncated by BioReg due to prompt size limit]`; the UI also flags truncation. This is deterministic character budgeting, not a provider-specific token estimator. Standard uses leading available excerpts, not semantic retrieval.

Full prompt and context remain visible before Copy. Prompts require evidence citations, distinction between fact/inference/gaps, and “当前提供的官方资料不足以确认。” for insufficient evidence. Captured text is untrusted quoted evidence. External interpretations must not redefine or overwrite official facts or deterministic changes.

## Security and isolation

No private developer API Key, third-party password, cookie or secret is read or stored. API input is strictly validated; only record IDs/options are accepted, not arbitrary URLs or hidden instructions. Context uses allowlisted regulation fields and excludes source_metadata. All regulation contexts exclude Mock. The generator has no network dependency on providers; external outages cannot block sync, matching, notifications or digests. Links use noopener/noreferrer. Privacy warning and bilingual external-AI disclaimer are visible. No optional Notes workspace is implemented. Future API support requires a separately approved BYOK or organization gateway design.

## Local acceptance

135 automated tests passed, including existing Phase 5 Scheduler, Phase 6 Change Detection / Version History and Phase 7 engagement regression tests. Added all four context generators, CMC, language/size modes, truncation, provider allowlist/disabled provider, missing evidence, version ownership and read-only checks.

Lint, typecheck and production build passed. Production-mode HTTP smoke passed in a disposable database schema, exercising real regulation/change/comparison/digest prompt APIs, 400/404 behavior and AI Tools. All Regulation, RegulationVersion and ChangeEvent rows were compared before/after generation and remained identical. No synthetic records were inserted into production.

## CI and production acceptance

Pending deployment of this implementation and remote verification. Do not interpret this report as PASSED yet.

## Known limitations

No AI output is produced inside BioReg. Provider availability/login is controlled by the third party. Generated instructions constrain use but cannot guarantee third-party accuracy. Existing shared-workspace access model is retained. Selectors show up to 100 regulations, 50 recent changes and saved digest history; direct record links carry the selected ID. Full browser interaction and remote acceptance are pending. Phase 9 is not included.
