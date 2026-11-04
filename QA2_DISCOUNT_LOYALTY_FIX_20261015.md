# QA2-KEEP-PT-INP-0345 / 0375 local source remediation (2026-10-15)

Scope: LOCAL source only. No official QA, device execution, commit, deployment or database change. These notes refer to current source, not the installed Android 910017 package.

## Findings and repairs

- 0345: `normalizeDiscountRule` truncated/clamped sortOrder (`1.5` became `1`); all three settings UIs provided `step=1` but did not validate before RPC. Now any explicit non-integer, empty, nonfinite or out-of-range sortOrder returns `invalid_discount_sort_order` without DB write; valid integer [-9999,9999] preserved. All three UIs show JA/EN error without RPC.
- 0375: `Number(input)||20` silently sent 20 for zero; now explicit zero/blank/negative/nonfinite earn and redeem values trigger JA/EN client errors without RPC. `saveSettings` invokes `validateLoyaltySettings` before DB query/write and rejects invalid direct RPC even from other client paths; unrelated settings are unchanged. Existing persisted settings untouched.
- Existing `discountErr` triggered keyboard and possible scroll on invalid input. On three UI surfaces it now marks `aria-invalid`, shows status without calling `focus`. This is a source-level mitigation for possible IZK-UT-074 jerk, not verified hardware correction.

## Independent source review (each case individually assessed)

| ID | 0345 evidence/result | 0375 evidence/result |
|---|---|---|
| S01 spec | Fraction 1.5 rejected: PASS | zero not replaced: PASS |
| S02 cause | prior Math.trunc source, removed: PASS | prior `||20`, removed: PASS |
| S03 boundary | fraction, blank, null, infinite, bounds: PASS | zero, blank, negative, null, infinite: PASS |
| S04 role | existing saveDiscountRule role check unchanged: PASS source | existing saveSettings role check unchanged: PASS source |
| S05 failure path | validation returns before save/DB: PASS source | validation before DB query: PASS source |
| S06 valid data | -9999/0/9999 preserved: PASS test | positive 0.1/1/20 preserved: PASS test |
| S07 UI | bilingual error on 3 faces: PASS source; actual viewport PENDING | bilingual error on 3 faces: PASS source; actual viewport PENDING |
| S08 code | diff / JS syntax audit: PASS | small helper + early guard: PASS |
| S09 regression | `test/qa2_discount_loyalty_validation_boundary.mjs` PASS | same independent negative/positive test PASS |
| S10 scope | no DB schema/QA ledger edit: PASS | no DB schema/QA ledger edit: PASS |

## Horizontal review (10 distinct pathways per case)

| ID | 0345 independent pathway/result | 0375 independent pathway/result |
|---|---|---|
| H01 | Native settings save: PASS source | Native settings save: PASS source |
| H02 | Web production settings save: PASS source | Web production settings save: PASS source |
| H03 | Web TEST settings save: PASS source | Web TEST settings save: PASS source |
| H04 | Direct `src/discountRules.js` guard: PASS | Direct `src/admin.js` guard: PASS |
| H05 | GAS dispatch `src/gasApi.js` uses guarded method: PASS source | Other backend routes using saveSettings: PASS source |
| H06 | Fractional negative test: PASS | 0 and negative regression: PASS |
| H07 | Numeric upper/lower limits test: PASS | Infinity/null/blank test: PASS |
| H08 | Existing valid input retained: PASS test | Existing positive rates retained: PASS test |
| H09 | Error RPC short-circuit source review: PASS source | Error RPC short-circuit source review: PASS source |
| H10 | Actual Android/iOS visual / RPC response: PENDING, no device authorized | Actual Android/iOS visual / RPC response: PENDING, no device authorized |

## Local evidence

`node test/qa2_discount_loyalty_validation_boundary.mjs` exit 0, PASS. `node --check src/admin.js` exit 0. `git diff --check` scoped touched tracked files exit 0. Test is independent of deployed binary and official runner, so cannot be used as an official QA PASS. Backend integration with a real tenant DB and physical device remains PENDING.
