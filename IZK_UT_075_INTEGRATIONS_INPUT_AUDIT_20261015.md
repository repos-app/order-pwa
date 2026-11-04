# IZK-UT-075 integrations input audit — 2026-10-15

Scope: `src/integrations.js`, Native `mobile-app/web/settings.html`, Web production and Web TEST settings, existing direct API boundary tests. Source-only review; no live D1, mail send, physical QA, commit or deployment.

## Finding and decision

The former silent `slice(0,200)` on submitted `reportEmail` and `emailFromAddress` has already been replaced in the dirty shared source by explicit errors (`report_email_too_long`, `email_from_address_too_long`) **before writes**. Native/Web/TEST settings pages already reject the normalized recipient list over 200 with a localized message before RPC. Preserve these existing modifications rather than competing with the owner.

The remaining `.slice(0,120)` names in this module are (1) **third-party Workers AI vision response keys** in `normalizeVisionCounts`, limited to 100 entries, and (2) **already persisted** tenant-scoped `drink_inventory.name` values copied into a bounded AI prompt (`LIMIT 200`). Neither is the save path for the inventory user's editable name; changing these slices to hard input errors would affect inference behavior instead of correcting a silent DB write. Existing source also truncates the request id to 100, an idempotency identity, so it requires separate protocol compatibility analysis. There is no integration-category name save in this module. No production source edit was justified by these findings.

## Executed verification

`node test/izk_ut_075_integrations_input_audit_test.mjs`: validates 201-character API refusal with zero writes, 200-character successful write with exact store key, all three localized report UI checks and both 120-character AI paths. `node test/izk_ut_075_backend_input_regression.mjs` checks existing backend boundary behavior. These are offline tests, not formal physical QA.

## Ten independent self-review aspects

| ID | Evidence / disposition |
|---|---|
| S01 | Direct `saveReportSettings` 201 rejected before admin persistence: offline regression |
| S02 | Exactly 200 report chars saved, no truncation: offline regression |
| S03 | Direct `saveEmailFromAddress` 201 rejected before `setSetting`: offline regression |
| S04 | Exactly 200 sender chars persisted: offline regression |
| S05 | Report destination remains sanitized and trimmed: source review |
| S06 | Sender remains trimmed before length comparison: source review |
| S07 | `normalizeVisionCounts` derives names from AI JSON, not UI: call chain reviewed |
| S08 | `inventoryCandidateNames` reads scoped DB values and builds prompt only: SQL/caller reviewed |
| S09 | Count request SHA, cache identity, usage and claim semantics are unchanged: source review |
| S10 | Real provider responses, long item rendering, email delivery: PENDING live integration |

## Ten independent horizontal review aspects

| ID | Evidence / disposition |
|---|---|
| H01 | Native settings list-length warning: test of source markup |
| H02 | Web production settings warning: test of source markup |
| H03 | Web TEST settings warning: test of source markup |
| H04 | Direct Worker dispatch uses `saveReportSettings`: `src/index.js` call reviewed |
| H05 | GAS bridge delegates report settings: `src/gasApi.js` call reviewed |
| H06 | Sender direct Worker dispatch uses `saveEmailFromAddress`: `src/index.js` call reviewed |
| H07 | Sender GAS bridge uses same function: `src/gasApi.js` call reviewed |
| H08 | Vision candidate SQL has `store_id = ?` and upper bound: offline/source review |
| H09 | AI vision normalization is response-only, no inventory mutation: source review |
| H10 | Physical Native/Web JA/EN IME and real external sender/provider: PENDING |

Source boundary reviewed; these checks do not assert live store isolation, actual provider precision, or QA PASS. The earlier dedicated UI+API remediation is recorded in `docs/IZK_UT_075_REPORT_AND_VOID_UI_FIX_20261015.md`.
