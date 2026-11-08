# Historical official catalog expansion — final acceptance

Accepted on 2026-11-08 for the bounded coverage described below. Existing directory queue, Regulation/RegulationVersion, search, official-link UI and weekly Monday 09:17 Asia/Shanghai scheduler are reused. No new infrastructure, workflow, schema migration or subscription bypass was introduced. Full text is not required for a verified official document record.

## Production data

Read-only audit at 2026-11-08T05:22:20Z: **381 regulations**, **395 immutable versions**, 357 change events, 51 daily digests, 283 sync jobs and 492 sync logs. All **69 baseline regulation IDs retained**. Mock=0. Duplicate (source_id, canonical_url) groups=0.

| Source | Added in this expansion | Current total | Actual coverage / limitation |
|---|---:|---:|---|
| FDA | 45 | 61 | Official biosimilar industry guidance, recent and cell/gene therapy directories. General-biologics directory returned no recognized document links; remains DEGRADED. |
| EMA | 29 | 50 | Configured official scientific/biological/biosimilar guideline directories. One clinical-pharmacology FAQ layout is unsupported; remains DEGRADED. |
| ICH | 151 | 160 | Four official guideline categories, selected related Q&A/concept/reflection papers; 26 numbered Q-series main guidelines verified. Not a complete historical revision/training archive. |
| USP | 23 | 31 | Public PDG general-chapters and general-methods directories, including <85>, <61>, <1111>, <71>. No subscribed chapter body obtained. |
| EDQM | 1 | 1 | Specific public FAQ about chapter 2.6.14; two main directory endpoints remain HTTP 403. No claim to have indexed all European Pharmacopoeia chapters or its microbiology/sterility content. |
| PMDA | 63 | 72 | Configured public official review/guidance directories; not the whole agency archive. |
| NMPA | 0 | 6 | Existing configured records retained; no new document from this pass. |
| CDE | 0 | 0 | HTTP 202 verification/access limitation; no error page ingested. |
| Total | **312** | **381** | Partial official coverage, not a complete global catalog. |

ICH Q-series main identifiers verified in the database: Q1A/B/C/D/E, Q2, Q3A/B/C/D, Q4B, Q5A/B/C/D/E, Q6A/B, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14. Revisions and regional implementation statements remain separate metadata; ICH originals and EMA regional records remain separate. Supplemental documents do not inherit their parent's adoption date/status.

## Sync and deduplication evidence

All run IDs refer to the existing GitHub Actions Regulatory Sync workflow; these are explicitly manual historical backfill/recheck runs, not natural scheduled-run claims.

- 42336154814: all-source initial batch, 240 new; ICH updated six existing records for official links, preserving prior versions.
- 42336479199: repeat all-source batch, every source new=0 and updated=0; restricted endpoints remained honestly degraded.
- 42375465339: USP general-methods addition, 12 new; repeat 42375800718 found 31, new=0, updated=0, failed=0.
- ICH incremental rotation: 42377015444 new=0; 42377470407 new=55; 42377969747 new=0. No version updates in these runs.
- Real official JSON contained trailing whitespace in Q3C(R9)'s code and Q12's Guideline group name. Structural trimming plus a regression test corrected the omissions without inventing facts. Runs 42439902567 and 42440256734 added 2 and 3 records respectively (including other affected directory items), updated=0.
- Final ICH recheck **42440574881** on 69a8d23ab478d885df7425074d0c9e5e9cf64f70: found=100, new=0, updated=0, failed=0, skipped=100, SUCCESS. Watchlist matching, source health, delivery and digest post-processing succeeded. Summary artifacts uploaded by the existing workflow.

Each batch is limited to 100; existing incremental cursor rotation covered the remaining discovered ICH candidates. The weekly schedule and default limit were not changed. The earlier 200-limit attempt failed validation before ingest; the manual limit is now validated as 1–100.

## Code and release checks

Changes are confined to shared candidate rechecks (reuse current official embedded metadata), FDA directory configuration/test fixtures, ICH links and structural whitespace normalization, pharmacopoeia public directory/FAQ parsing, microbial search synonyms, subscription wording, catalog tests and a bounded manual workflow limit.

CI 42439688600 on 46f5ceba25e3ef35b5bc4b747e14fcc4c018de67 and release CI **42440337120** on **69a8d23ab478d885df7425074d0c9e5e9cf64f70** passed: lint, typecheck, all automated tests, production build and production-mode HTTP smoke. Earlier expansion CI 42374737823 and release CI 42376272107 also passed. No new production schema migration was needed; the previously applied catalog migration remains in place.

Netlify production https://bioreg-global.netlify.app served commit **69a8d23ab478d885df7425074d0c9e5e9cf64f70**, confirmed with X-BioReg-Commit; /api/health returned 200. This final report-only commit uses [skip netlify] to avoid a redundant deployment.

## Online acceptance

- ICH Q5A and Q5A(R2): each returns 2 results, ICH original and EMA separately. Q3C and Q12 exact-number records now exist and have direct official PDF links.
- 内毒素 / endotoxin: each 2 results; 微生物 / microbial: each 4; 无菌: 6. Searches <85>, <61>, <71> find the corresponding USP records and may also match references within other captured text.
- Synthetic absent query BioRegNoSuchDocument987654 returns 0; this means no result within indexed scope, not that no regulation exists.
- USP Microbial Enumeration <61> (PDG Q-05b), Bacterial Endotoxins <85> (Q-06), Sterility Test <71> (Q-11): full_text_captured=false; only 116/83/90-character public catalog excerpts. Official document pages returned HTTP 200. Title/identifier/synonym search works without full chapter text. Publication/effective dates remain missing and status Unknown; PDG sign-off information is not treated as a chapter effective date. Detail renders the subscription notice.
- EDQM specific chapter 2.6.14 FAQ official link returned HTTP 200, without verification-page content.
- ICH Q5A contains a 498-character directory summary, not PDF full text. Its PDF link is verified from the official directory, but direct PDF fetching from this test client encountered a connection reset; no claim of full PDF extraction or universal link reachability.
- Existing Q1A retains two versions with a valid previous-version link. New representative USP entries each retain one version after repeated syncs.
- Dashboard, Today, Regulations, Updates, Agencies, Watchlist, Notifications, Digest and a USP detail returned 200 without the database error view. Two rounds of four concurrent core-page requests ultimately returned 200. Some client connections reset and required retry. Successful concurrent responses ranged approximately 0.4–8.4 seconds in the final run; this is HTTP evidence, not browser rendering QA or a 1.5-second performance guarantee.

Official representative pages:
- https://www.usp.org/harmonization-standards/pdg/general-methods/microbial-enumeration
- https://www.usp.org/harmonization-standards/pdg/general-methods/bacterial-endotoxins
- https://www.usp.org/harmonization-standards/pdg/general-methods/sterility-test
- https://faq.edqm.eu/pages/viewpage.action?pageId=143130671

No generic search portal was counted as a document. Some supplemental ICH/other-source records retain a directory page plus official PDF attachment. Missing metadata is not inferred; official facts, translations and system summaries remain distinct. No credential values, private backup contents or subscription bodies are included in this report.
