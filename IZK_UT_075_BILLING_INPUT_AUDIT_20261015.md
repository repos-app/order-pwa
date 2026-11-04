# IZK-UT-075 Billing input audit — 2026-10-15

LOCAL source changes only; formal QA, D1, deployment, commit and push PENDING.

Reviewed existing slice limits: table 40; rule ID 80; personal discount ID 60; discount name 60; approver login 100. All five now reject overlength values without selecting a matching prefix or silently truncating receipt evidence. Validation occurs before demo order mutation. No change to price math, tenant SQL binding, idempotent receipts, coupons built from stored orders or historical records.

Native, production Web and TEST admin checkout now verify lengths before payment confirmation and again before finalize. UI displays an error and keeps the previous value.

## Self review — ten independent checks
S01 source inventory of all five slices: PASS
S02 table label exact lookup boundary: PASS
S03 table occupancy write before SQL guard: PASS
S04 occupancy read returns null on invalid label: PASS
S05 discount rule canonical lookup before prefix mutation: PASS
S06 personal discount ID required and receipt storage: PASS
S07 discount name receipt snapshot exactness: PASS
S08 approver login exact authentication lookup: PASS
S09 finalize preflight precedes demo cancellation: PASS
S10 node syntax, boundary regression, diff whitespace: PASS

## Horizontal review — ten independent checks
H01 direct API billing entrypoint in src/index.js: PASS static
H02 GAS compatibility entrypoint src/gasApi.js: PASS static
H03 Native admin cash/card/QR shared preapproval: PASS static
H04 Web production admin validation: PASS static
H05 Web TEST admin validation: PASS static
H06 three finalize entrypoints boundary checks: PASS static
H07 discountRules canonical ID max 80: PASS static
H08 stored coupon synthesis and receipt sequencing unchanged: PASS static
H09 D1 settlement/refund replay and historical data: PENDING
H10 real mobile IME, JA/EN and cash/card/QR flow: PENDING

## Evidence
node --check src/billing.js: exit 0.
node test/izk_ut_075_billing_input_boundaries_test.mjs: PASS exit 0.
git diff --check scoped to four existing files: exit 0.
Dynamic SQL settlement/refund and physical formal QA are PENDING. Static PASS is not formal QA PASS.
