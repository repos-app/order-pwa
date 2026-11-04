# Commission numeric input — local fix evidence (2026-10-16)

Scope: QA2-KEEP-PT-INP-0031 and QA2-KEEP-PT-INP-0036; source-only remediation after formal Android 910019 FAIL. Source changes are not present in installed APK 910019. No device, official ledger, claim, deployment, build, or production DB touched.

Evidence: `test-results/qa-v2-evidence/playwright-realme/2026-10-16T08-31-54-433Z/QA2-KEEP-PT-INP-0031/evidence.json` (decimal-3 accepted); `.../2026-10-16T08-34-56-964Z/QA2-KEEP-PT-INP-0036/evidence.json` (abc accepted, persisted zero).

Root cause: `mobile-app/web/commission-app.js` converted the values with `Number()` without enforcing `step=0.01`. `cmScRate` converted an empty/invalid DOM number input to zero. `src/commission.js` likewise allowed excess decimals and `Number(null)` conversion. The server now validates the original decimal representation and safe integer hundredths before any plan lookup or write. The client rejects bad raw fields before RPC. Valid values round-trip as hundredths without truncation.

Validation: `node --test test/commission_input_precision_regression_test.mjs` exit 0, 3/3 tests PASS; `node --check src/commission.js` exit 0; `node --check mobile-app/web/commission-app.js` exit 0; `git diff --check` exit 0. Tests use mocked DB writes; they do not establish real D1 persistence, Android UI success, or official PASS. Follow-up required: role ② runs same Playwright cases against a newly built approved APK, confirms DB readback and official runner verdict.

## QA2-KEEP-PT-INP-0031: independent self-review S01–S10

| ID | Check / concrete evidence | Status |
|---|---|---|
| S01 | Incoming rule `value` checked as raw string/number before any numeric coercion (`commissionHundredths`) | PASS |
| S02 | Empty, null and alphabetic input rejected; regression test loops these values | PASS |
| S03 | Negative value rejected by unsigned decimal regex | PASS |
| S04 | `1234.567` and `0.001` rejected by two-fractional-digit grammar | PASS |
| S05 | `1234.56` accepted and passed without rounding to DB insert binding, test assertion index 6 | PASS |
| S06 | Percent-only upper bound 100 is enforced by both client and server | PASS (code review) |
| S07 | Invalid rule returns `invalid_value` before plan checks/DB read or mutation | PASS |
| S08 | Unsafe huge values rejected with `Number.isSafeInteger(units)` | PASS (code review) |
| S09 | `node --check` and `git diff --check` have exit 0 | PASS |
| S10 | Independent duplicate-request counterexample: same `clientRequestId` with malformed `12.345` returns `invalid_value` **before** idempotency lookup (new regression asserts zero lookup calls); request replay cannot bypass number validation | PASS (code + executed test) |

## QA2-KEEP-PT-INP-0031: independent horizontal H01–H10

| ID | Related path / method | Status |
|---|---|---|
| H01 | `commission.html#cmValue` min=0 step=.01 reconciled with JS validator | PASS |
| H02 | `commission-app.js` clear/edit flow reuses same save rule function | PASS |
| H03 | Fixed value bound unrestricted at <= safe hundredths, preserving fixed amount behavior | PASS |
| H04 | Percentage rule same field with additional max=100 | PASS |
| H05 | GAS RPC `saveCommissionRule` dispatches to hardened `src/commission.js` | PASS |
| H06 | Store scope persists via `storeId` arguments in unchanged commission DB SQL | PASS |
| H07 | Save idempotency clientRequestId and duplicate handling remain downstream of validation | PASS |
| H08 | `docs/yuwaku` and `/test` search: no independent commission rules form; native source in `mobile-app/web` | PASS (search) |
| H09 | Related discount calculation uses distinct `discountRules.js` interface; not modified without ownership | PASS (scope review) |
| H10 | Reverse HTTP/GAS path: `src/index.js` handles GAS actions; `handleGasCompatRequest` parses signed token, rejects `body.storeId` mismatch and uses `scopedTenantSql`; `dispatchRpc` revalidates token, calls `requireAuthenticatedStoreId`, page authorization; RPC handler delegates into `commissionMod.saveRule`, which requires manager role. Role counterexample test rejects `staff` without write | PASS (independent call-graph + regression) |

## QA2-KEEP-PT-INP-0036: independent self-review S01–S10

| ID | Check / concrete evidence | Status |
|---|---|---|
| S01 | `cmScRate` read as raw DOM value before RPC conversion | PASS |
| S02 | `field.validity.badInput` catches browser nonnumeric edit | PASS (code review) |
| S03 | `abc` on API rejected, zero is never substituted by `Number()` | PASS |
| S04 | Empty and null API values rejected | PASS |
| S05 | Negative and above-100 values rejected | PASS |
| S06 | Third decimal place rejected | PASS |
| S07 | 0, 12.34 and 100 accepted with exact string for SQL bind | PASS |
| S08 | Both settings statements are created only after validation and plan check | PASS |
| S09 | Local 3/3 test suite, client/server syntax and diff checks exit 0 | PASS |
| S10 | Independent authorization counterexample: direct service `saveSettings(..., 'staff')` rejects with `forbidden` before DB writes; test confirms same result for `saveRule` | PASS (code + executed test) |

## QA2-KEEP-PT-INP-0036: independent horizontal H01–H10

| ID | Related path / method | Status |
|---|---|---|
| H01 | `commission.html#cmScRate` min=0 max=100 step=.01 | PASS |
| H02 | `commission-app.js` saving error leaves button enabled and focuses invalid control | PASS |
| H03 | Equal allocation choice preserved in payload | PASS |
| H04 | Sales-weighted allocation choice preserved in payload | PASS |
| H05 | `gasApi.js` dispatch maps to `commissionMod.saveSettings` | PASS |
| H06 | `getSettings` reads both saved keys for rendering and downstream payout logic | PASS (code review) |
| H07 | `prepareEntriesForBill` uses stored `staffSharePercent` and retains previous rounding logic | PASS (code review) |
| H08 | `settings` SQL upsert always carries store_id, and no update proceeds for invalid rate | PASS |
| H09 | `docs/yuwaku` and `/test` search shows no parallel SC percent form to patch | PASS (search) |
| H10 | Reverse HTTP/GAS dispatch inventory: `src/index.js` -> `handleGasCompatRequest` signed token and request-store comparison -> `scopedTenantSql` -> `dispatchRpc` signed-store and page-permission check -> `saveCommissionSettings` -> manager gate and store_id-bound batch upserts. No separate direct commission mutation action located via `rg` call-site search | PASS (independent route trace) |

Review totals: **0031 self 10/10 and horizontal 10/10 code-level reviews complete; 0036 self 10/10 and horizontal 10/10 code-level reviews complete.** S10/H10 were independently redefined and executed above; no device check was relabeled as a code review. Code artifact SHA-256 (`Get-FileHash -Algorithm SHA256`): `src/commission.js` `FDA66E8BD43B186EFE8F0F2636DF543A9183AEE49F8EF88B8755D7D5C39211E6`; `mobile-app/web/commission-app.js` `74190139633211973E9ED504C4AC2F3C595C55AA98281474A80F20D8AB917D2B`. These hashes identify the source reviewed, not an APK.

**Separate physical E2E outstanding for both cases:** rebuilt and authorized Android APK; Playwright test; exact DB readback; reload/Back/reopen; official runner validation/record. All **PENDING** with role ②; APK 910019 remains an older failing build and official FAIL must not be changed based on code-level reviews.
