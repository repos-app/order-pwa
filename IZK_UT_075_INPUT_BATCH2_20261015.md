# IZK-UT-075 — input batch 2 (local source only, 2026-10-15)

## Scope, evidence, behavior

- Account deletion reason: `src/accountDeletion.js:300` previously used `.trim().slice(0,500)` and silently altered the reason that the owner submitted. All three existing account screens explicitly advertise 500 characters and set `maxlength="500"`.
- Replaced the server truncation with `reason_too_long` before the pending-request lookup and INSERT, following the original password and owner checks. This also prevents oversized retries from bypassing validation through an already-pending request. This is a source-only fix: no release, migration, physical QA or official PASS claim.
- Native `mobile-app/web/account.html`, production Web `docs/yuwaku/account.html`, TEST Web `docs/yuwaku/test/account.html`: beforeinput/paste reject an overflowing insertion, preserve existing value and show the localized error. Selection replacement is accounted for; IME composing beforeinput is left to the browser. Save click also rejects any overlength programmatic value before RPC. Server rejection protects direct RPC.
- Printed name inventory: `src/printers.js:217` silently truncates `p.name` at 60; three `printers.html` variants have name required but no documented or marked 60 character maximum. Changing the limit without business approval would invent a policy; **PENDING**. `src/printers.js:219` MAC truncate 40 likewise needs independent normalization policy review.
- Other audited paths requiring separate owners/policy: `src/orders.js:534` cancellation reason 200 (no client max proven); `src/attendance.js:33` generic sanitize 200 (widely shared); `src/aiPromptSettings.js:50` derived AI prompt labels 120 (not ordinary end-user field); `src/accountDeletion.js:238,626` store name/email preview and exception summaries are output caps, not submitted user input.

## Validation

`node test/izk_ut_075_account_deletion_reason_test.mjs` PASS: backend no-slice and guard plus all three distribution variants' 500 labels, paste/input/save guards, and VM JavaScript parsing. `node test/account_deletion_automatic_lifecycle_test.mjs` PASS 36 checks (request, cancel, email, deadline, UI). `node test/tenant_identity_mutation_test.mjs` PASS 26 A/B assertions on 46 migrations. `node --check src/accountDeletion.js` exit 0; `git diff --check -- src/accountDeletion.js mobile-app/web/account.html docs/yuwaku/account.html docs/yuwaku/test/account.html` exit 0. The new overlength rejection is checked in the source-contract test; a direct authenticated DB 501-character rejection case and native device evidence remain pending.

## Self review — ten separate aspects

| ID | Evidence and review | Status |
|---|---|---|
| S01 | Three screens state 500 and supply maxlength 500 | PASS |
| S02 | Server formerly sliced, now explicit return before SQL insert | PASS |
| S03 | Length 501 rejected by guard syntax/contract; runtime DB invocation still untested | PENDING |
| S04 | requireOwner and password checks remain ahead of reason handling; A/B tenant test absent | PENDING |
| S05 | Reason guard now precedes pending-request lookup; existing pending request idempotency lifecycle regression PASS | PASS |
| S06 | No schema or existing record transformation; existing request lifecycle 36 checks PASS | PASS |
| S07 | JA/EN error strings and 3 HTML inline scripts parse; real IME/browser device not tested | PENDING |
| S08 | No change to account erase/cancel code; node --check and diff --check exit 0 | PASS |
| S09 | Added source contract regression test; interactive browser and DB fixture pending | PENDING |
| S10 | Changes limited to account reason and three mirrors, preserved unrelated dirty files | PASS |

## Horizontal review — ten independent impact areas

| ID | Impact/source check | Status |
|---|---|---|
| H01 | Native account.html reason field, insert and click paths | PASS |
| H02 | Production Web account.html reason and localized errors | PASS |
| H03 | TEST Web account.html same behavior | PASS |
| H04 | GAS-compatible `requestAccountDeletion` call remains server-side bounded | PASS |
| H05 | Native RPC post path direct calls reach server guard | PASS |
| H06 | Password verification and owner role untouched; A/B tenant mutation 26 assertions PASS | PASS |
| H07 | Account deletion status/cancel lifecycle 36 checks PASS | PASS |
| H08 | Keyboard insertion, paste and selection replacement statically handled; IME real device pending | PENDING |
| H09 | Other entity-specific truncations inventories checked; printer name 60 policy undefined | PENDING |
| H10 | Deployment APK/Worker synchronization and formal Android/iOS QA intentionally not executed | PENDING |

Formal QA delta: **0 PASS / 0 FAIL**. All results concern local source only.
