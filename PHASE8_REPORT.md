# Phase 8 — External AI Tools

Phase 8: PASSED

Acceptance completed on 2026-09-14. Browser interaction and production dataset limitations are explicitly recorded below; no unperformed click-through or fabricated production changes are claimed.

## Architecture and scope

Phase 7 is PASSED. Existing Netlify + Supabase + GitHub Actions architecture and scheduler remain unchanged. A read-only `/api/ai` service assembles saved official context and deterministic prompts. No migration, AI API, credentials, automatic login, provider scraping, AI output ingestion or official-data writes are introduced. Users preview and copy a prompt, then open their own external AI account and paste it themselves.

Unified configuration: `src/lib/external-ai.ts`. Context builder and generator: `src/server/ai/`. UI: `src/components/ai-tools.tsx`, integrated into existing AI Tools, regulation detail/card entry, ChangeEvents and saved Digest pages. Version History links to a two-version selector. The server verifies both version IDs belong to the requested regulation; identical IDs and missing records are rejected.

## Providers and templates

Official HTTPS homepages only, without prompt parameters, credentials or tokens:

- DeepSeek: https://chat.deepseek.com/ (official reference: https://deepseek.com/en/news/deepseek-v3-1/)
- Doubao: https://www.doubao.com/ (official reference: https://www.doubao.com/about)
- Qwen: https://chat.qwen.ai/
- Kimi: https://www.kimi.com/ (official reference: https://www.kimi.com/en/help/new-user-guide/overview)

Provider records contain id, name, homepage_url, enabled and description. Disabled providers cannot generate prompts. Templates have applicable contexts, instructions, body, version and enabled status. Twelve templates: Regulation Explain; Regulatory Impact Analysis; CMC / Quality Analysis; Clinical Analysis; Nonclinical Analysis; Change Analysis; Version Comparison; Department Impact; Action Items; Chinese Explanation; Bilingual Summary; Daily Digest Analysis.

Scope correction: GPT / ChatGPT / OpenAI 已从当前产品范围彻底移除。No corresponding provider, adapter, environment variable dependency, button or future integration remains. This sentence records removal, not supported functionality. Only DeepSeek, Doubao, Qwen and Kimi are supported; the common provider architecture is retained. Existing Git history was not rewritten.

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

Correction commit: `0f578b44838281efc461fdacdc5f0866796e783c`, following implementation `ae868c9ad1fac0865d76ce39247b69e3ccd7f425`.

[CI 34835238588](https://github.com/jyw833509-glitch/BioReg/actions/runs/34835238588): completed / success, job 103947453267. Corrected implementation passed 135 tests, lint, typecheck, production build and real production-mode Prompt API HTTP smoke. A local smoke attempt initially found the local test PostgreSQL stopped; restarting that existing test instance and rerunning succeeded. This was not a production failure.

Netlify official deployment badge returned success. The [production site](https://creative-starship-b64072.netlify.app/ai-tools) and `/api/ai` served the corrected four-provider catalog including Kimi, matching the corrected commit's product configuration. No private Netlify console/log access is claimed. No new environment variables or migration were needed.

Production HTTP/API acceptance at 2026-09-14T10:55:38.066Z:

- Catalog: exactly deepseek, doubao, qwen, kimi; 12 templates. The AI Tools HTML contains the corrected selector without removed providers.
- Regulation/CMC prompt generation succeeded for each of the four providers. Chinese/compact, English/standard and Bilingual/detailed requests succeeded, with evidence constraints and correct selected provider URL. Saved Digest prompt generation succeeded with the system-summary evidence label.
- Two rounds of ten simultaneous requests: 20/20 HTTP 200, no database fallback page. Routes: Dashboard `/`, `/regulations`, a real Regulation Detail (including Version History), `/updates`, `/today`, `/watchlist`, `/notifications`, `/digest`, `/ai-tools`, `/api/health`. Health returned status ok.
- Four official provider homepages independently returned HTTP 200. Doubao redirected to its official `/chat/` path. No login or prompt submission was performed.
- Before/after public API data were identical for the complete regulation list, selected regulation with history, ChangeEvents, Watchlists, Notifications and Digests. No AI-generated facts or writes occurred. Production has 38 regulations, Mock 0, 0 ChangeEvents, 0 Notifications, 2 Digests and 30 visible SyncLogs.
- Independent historical check at 2026-09-14T10:55:47.850Z confirmed all 38 original version IDs and exact captured content retained. FDA / EMA / NMPA / ICH / PMDA HEALTHY; CDE DEGRADED, correctly isolated. Existing Phase 5–7 regression tests passed; Regulatory Sync run 34812709046 also completed successfully on the preceding Phase 8 implementation commit.

Production currently has zero ChangeEvents and only one captured version per regulation. Consequently a populated ChangeEvent → AI and two-distinct-versions → AI success case cannot be exercised against existing production data. Both are verified via real HTTP APIs against an isolated migrated PostgreSQL database, including complete before/after official-row equality. No artificial production event/version was created. These are explicit dataset coverage limits, not evidence of failed generators.

Browser interaction verification: 未完全完成。Reason: browser control tool timeout. Retrying `cua.createBrowserTab` for production AI Tools returned `js execution timed out; kernel reset, rerun your request` after 20.6 seconds. HTTP/API production verification: PASSED as above. Copy Prompt uses the browser clipboard API with a visible manual-copy fallback and provider links use normal safe anchors; actual clipboard clicking and third-party browser navigation were not completed by the unavailable tool. No third-party AI output was read.

## Known limitations

No AI output is produced inside BioReg. Provider availability/login is controlled by the third party. Generated instructions constrain use but cannot guarantee third-party accuracy. Existing shared-workspace access model is retained. Selectors show up to 100 regulations, 50 recent changes and saved digest history; direct record links carry the selected ID. Browser interaction and absent production change fixtures have the coverage limits described above. Future API/BYOK support requires a separate scoped design; no implementation or provider-specific interface is reserved. Phase 9 is not included and work stops after this acceptance.
