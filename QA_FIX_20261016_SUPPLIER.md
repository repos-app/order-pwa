# QA2-KEEP-PT-INP-0272 — supplier email validation

## Evidence / root cause

- Android APK 910019, Realme, Playwright pilot `test-results/qa-v2-evidence/playwright-realme/2026-10-16T07-17-21-236Z/QA2-KEEP-PT-INP-0272/evidence.json`: five invalid entries were accepted and persisted (malformed, Japanese incomplete domain, emoji, HTML tag, SQL-style input); length 255 was rejected; valid padded and plus-tag addresses were accepted. Recorded QA remains FAIL until official rerun.
- `type=email` does not automatically prevent programmatic save; `window.save` skipped `checkValidity`; server `saveSupplier` checked length but not email grammar.
- Validate preflight in all three purchasing UI versions and server `saveSupplier` before database lookup/write. Existing invalid rows are refused by `sendPurchaseOrderEmail` before quota/provider use. No actual email sent by regression tests.
- Policy: optional blank allowed; trim leading/trailing space; local-part ASCII with common legal symbols (including apostrophe and plus); Unicode domain letters/numbers and dotted domain allowed; emoji, controls, tags, whitespace within address, missing dot, invalid label boundary rejected; existing 120-char cap unchanged. Quoted local-part syntax is intentionally unsupported by this UI.
- Independent integration follow-up: `sanitize(sup.email)` originally ran before grammar validation, so embedded ASCII controls could be silently removed and join two fragments into a valid address (e.g. `a@exam\\nple.com`). The server now explicitly rejects `[\\x00-\\x1f\\x7f]` on the **original** raw string before sanitize/trim, and each UI version checks `emailField.value` before trim. Ordinary surrounding spaces without controls remain accepted.

## Independent source reviews S01–S10 (each examined)

| ID | Method / observed evidence | Result |
|---|---|---|
| S01 | Trace failing probes against server `saveSupplier`: no grammar guard existed | FIXED |
| S02 | Inspect three `window.save` branches: early return occurs ahead of RPC | PASS |
| S03 | Inspect server method: grammar validation occurs before `db.first` / `db.batch` | PASS |
| S04 | Optional empty and surrounding ordinary spaces supported; CR/LF/control rejected before trim | PASS |
| S05 | Length threshold 120 retained with explicit preflight errors | PASS |
| S06 | Unicode address decomposition by one @ and dotted domain labels | PASS |
| S07 | Local-part punctuation including plus / apostrophe / dots tested | PASS |
| S08 | Emoji, HTML, SQL-like, embedded and leading/trailing CR/LF, NUL, tab, DEL tested against direct `saveSupplier` | PASS |
| S09 | Old invalid stored email prevented from reaching provider in purchase-send path | PASS |
| S10 | `node --check src/purchasing.js`, `git diff --check` executed exit 0 | PASS |

## Horizontal reviews H01–H10 (distinct scope/method)

| ID | Related area / examination | Result |
|---|---|---|
| H01 | Native source `mobile-app/web/purchasing.html` preflight updated | PASS |
| H02 | Production web source `docs/yuwaku/purchasing.html` preflight updated | PASS |
| H03 | TEST web source `docs/yuwaku/test/purchasing.html` preflight updated | PASS |
| H04 | Direct RPC server `src/purchasing.js`: original raw string control check before sanitize and any DB read/write | PASS |
| H05 | Existing supplier update path uses common validation before SQL | PASS |
| H06 | New supplier insert path uses same early validation | PASS |
| H07 | Duplicate request response path occurs after validation | PASS |
| H08 | Purchase email send uses server guard for historic invalid rows | PASS |
| H09 | Reorder email delegates to purchase-send guard | PASS |
| H10 | Focused offline regression checks 3 UI copies including raw-control guard and 23 email examples | PASS |

## Verification & outstanding

- `node test/supplier_email_validation_test.mjs` exit 0: 17 invalid (including seven control-joining/injection cases) and six valid inputs, 3 UI copies. Mocked D1 used; no provider called.
- `node --check src/purchasing.js` exit 0.
- `git diff --check -- src/purchasing.js mobile-app/web/purchasing.html docs/yuwaku/purchasing.html docs/yuwaku/test/purchasing.html` exit 0.
- Formal Playwright Android/device rerun, APK packaging, official verdict and D1 readback remain **PENDING**, handled by QA owner after rebuilt deployment. Local source fix does **not** change official verdict.

## Independent review execution log (2026-10-16, post control-character fix)

All S/H entries below were separately checked against the current sources or executed offline checks. `PASS` denotes only the named **source review**, never device QA. File:line references indicate the inspected source version; later edits may shift numbers.

| Pass | Independent examination and concrete evidence | Source review |
|---|---|---|
| S01 | Raw input preservation/order: `src/purchasing.js:149-151` reads `sup.email`, rejects controls, only then sanitizes | PASS |
| S02 | ASCII control class: `src/purchasing.js:150` covers NUL through US (CR/LF/tab included) and DEL | PASS |
| S03 | Grammar guard: `src/purchasing.js:45-56,155` checks @ count, local grammar, domain labels after raw guard | PASS |
| S04 | Optional/whitespace semantics: `test/supplier_email_validation_test.mjs:9-10,20-24` verifies blank and padded ordinary spaces | PASS |
| S05 | 120-character limit: `src/purchasing.js:152-155` preserves `supplier_email_too_long` before format error | PASS |
| S06 | International domain behavior: validator uses Unicode property classes for domain labels, test includes `sales@例え.テスト` | PASS |
| S07 | Common ASCII local punctuation: regression accepts plus, apostrophe, dots and subdomains | PASS |
| S08 | Direct API negative matrix: executed `node test/supplier_email_validation_test.mjs` exit 0 with 17 rejected inputs, including CR/LF/tab/NUL/DEL joins | PASS |
| S09 | Historic-row outbound check: `src/purchasing.js:394` blocks invalid supplier addresses before provider and monthly quota code | PASS |
| S10 | Static integrity: `node --check src/purchasing.js` and `git diff --check` both returned exit 0 | PASS |

| Pass | Independent related-path examination and concrete evidence | Source review |
|---|---|---|
| H01 | Native WebView source `mobile-app/web/purchasing.html:413-421`: raw guard precedes trim, grammar and RPC | PASS |
| H02 | Production web `docs/yuwaku/purchasing.html:404-412`: same ordered guards examined | PASS |
| H03 | Test web `docs/yuwaku/test/purchasing.html:404-412`: same ordered guards examined | PASS |
| H04 | Native UI edit form `mobile-app/web/purchasing.html:380,424-427`: edit reload routes through protected `window.save` | PASS |
| H05 | API direct action `src/index.js:834`: `handleSaveSupplier` forwards to guarded `purchasing.saveSupplier` | PASS |
| H06 | GAS-compatible RPC `src/gasApi.js:614`: dispatcher delegates to the same guarded `saveSupplier` | PASS |
| H07 | New/update/duplicate branches `src/purchasing.js:159-221`: all occur after top-level raw-input guard | PASS |
| H08 | Purchase-order send `src/index.js:866`, `src/purchasing.js:394`: routes through historic-row grammar guard | PASS |
| H09 | Reorder send `src/index.js:871`, `src/purchasing.js:418-423`: delegates to protected purchase-send path | PASS |
| H10 | UI source consistency assertion: executed focused Node regression exit 0, verifying raw guard exists in all 3 UI copies; it is source inspection, not rendered-browser execution | PASS |

**Physical Playwright QA — PENDING (separate from S01–S10 / H01–H10).** This worker did **not** connect to hardware, install an APK, interact with WebView, query a live D1, send email, or update any official QA ledger. Device acceptance remains the QA owner's task after a build containing these changes.
