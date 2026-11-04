# AI credit wallet: ten additional SQLite accounting cases and boundary review

Date: 2026-11-03 PHT. This report covers local production SQL behavior and source accounting, **not formal Android/iOS QA**.

## Business contract verified

- Free accrues one new promotional point per UTC calendar month, with a **total promotional balance cap of 5**.
- Pro accrues ten promotional points per UTC calendar month, with a **total promotional balance cap of 30**.
- Existing unused promotional points carry forward, but the monthly allowance never bypasses the respective cap.
- Purchased points are stored in an **independent paid balance**, do not expire and have no promotional cap.
- Charge order: promotional monthly balance, old trial transitional balance, then purchased points.
- Exact store ownership and immutable operation IDs prevent duplicate granting, spending or refunding.

## Ten independent additional executable cases

The existing `test/ai_credit_wallet_sqlite_test.mjs` fixture applies actual SQLite migrations 0048, 0049, 0050 and 0051, and calls the production `src/aiCredits.js` functions.

| Case | Scenario | Expected result |
| --- | --- | --- |
| ADDITIONAL-01 | UTC Dec 31→Jan 1 with a paid pack | Free monthly 1→2, purchased 30 persists, duplicate reads do not award again |
| ADDITIONAL-02 | Free cumulative cap, spend, more months | Cap 5, spend 2→3, next two months 4→5 |
| ADDITIONAL-03 | Pro cumulative cap with paid 30+100 | Promo caps at 30, spend uses all 30 then 5 purchased, next month +10 |
| ADDITIONAL-04 | Refunded reserved mixed paid/promo credits in another month | Refund restores the right source balances, without duplication |
| ADDITIONAL-05 | Free point consumed before upgrade to Pro | Upgrade gives 9 additional, next month gives 10 |
| ADDITIONAL-06 | Pro→Free→Pro same-month flip and separate purchase | Promo cap 5 on downgrade; re-upgrade does not remint; purchased 30 unchanged |
| ADDITIONAL-07 | 25 simultaneous one-point Pro requests | Exactly 10 allowed and 15 denied, no negative balance |
| ADDITIONAL-08 | Two-unit paid pack, duplicate receipt and duplicate refund | One 200-point grant and one reversal, verified signed receipt counters |
| ADDITIONAL-09 | Paid usage, later signed purchase reversal, then new top-up | Negative purchased exposure becomes debt, later purchase offsets the debt |
| ADDITIONAL-10 | Old 3-trial + 30-monthly + purchased wallet conversion | Free promotional capped at 5; paid preserved; later Pro upgrade adds only 9 |

## Additional adverse-case finding and source fix

Independent adversarial accounting review exposed a **real SQL defect** in earlier migration 0049: when a signed purchase was reversed while purchased credits were reserved by an in-flight AI job, and the AI job later failed, the previous finalize trigger returned those purchased credits to spendable balance **without first clearing the reversal debt**.

This was reproduced in the new `ADDITIONAL-RISK` test: the Free point is consumed, a 30-point purchase arrives, one subsequent AI job reserves one paid point, the 30-point purchase is reversed, then the AI job fails. **Old SQL mechanism would return one now-refunded purchased point to spendable balance while leaving one point of purchase debt.** An earlier 31-point synthetic reservation reproduced the same defect with 30 points; the final persisted regression uses the product's real one-point feature charge.

The additional `0051_ai_credit_refund_purchase_debt_netting.sql` migration replaces only the reservation-finalize trigger. On a failed reservation it uses any returning purchased units to discharge `paid_debt` first and makes only the remainder spendable. Debt and available-balance ledger deltas remain separately auditable. A newly created store receives 0051 after migrations 0048/0049/0050. No client-side grant, product prices, Pro entitlements, account routing, or subscribed store policies were changed.

**Corrected actual SQLite result:** purchased balance 0, debt 0, promotional balance 0 (already spent). The other 10 additional cases continue to pass.

## Live-data safety boundary

Prior to applying 0051, perform a read-only preflight of all 13 physical tenant D1 databases to confirm their current 0049 refund trigger and inspect aggregate counts of wallets with `paid_balance>0 AND paid_debt>0` and pending reservations. Never mutate customer balances to satisfy a test. Only deploy the additive trigger replacement to correctly identified stores, with Time Travel bookmarks, post-migration trigger and marker readback.

The completion conditions for **production remediation** are 13/13 0051 D1 installations, verified Provisioner migration catalog for future stores, and unchanged existing Worker code/bindings (0051 has no JavaScript Worker change). Local PASS is not production PASS.

## Actual delivery checkpoint — production remediation complete

- **Ten requested additional accounting cases PASS** (`ADDITIONAL-01` through `ADDITIONAL-10`), plus the separately discovered failed-purchase-refund `ADDITIONAL-RISK` case. Latest focused complete source suite: **101 PASS / 0 FAIL**, including purchase webhook, UI, tenant provisioner and menu-AI regression tests.
- The risk test **failed before 0051** (returned refunded paid credit as usable balance) and **passed after 0051**. The final test uses the authentic *one point per AI page* usage contract, not an unrealistic multi-page debit.
- Before rollout, 13/13 physical D1 databases were inspected read-only: **0 wallets** had both positive purchased balance and outstanding reversal debt; **0 outstanding reservations**, with all old finalizer triggers present. Report: `test-results/ai-credits-release/0051-preflight-20261103.json`.
- **13/13 existing physical D1 stores received migration 0051 and independently passed post-migration schema/trigger checks**. Every step captured its own Time Travel bookmark. Report: `test-results/ai-credits-release/monthly-v2-0051-d1-rollout-20261103.json`.
- Additional production read-only verification for `teat`, `yuwaku`, and `yuwakubar` confirmed `trg_0051_credit_finalize` present, old `trg_0049_credit_finalize` absent, marker 0051, and no mixed purchased/debt anomaly.
- The **existing new-store Provisioner Worker** was deployed with the generated 50 tenant migrations through 0051. Cloudflare active version **`8acefd93-b77a-4630-b21f-d45b68ca0478` (100%)** and original 15-minute cron preserved.
- GitHub `main` source fix and additional tests: **`593c6ad`**. No existing customer Worker JS changes were needed, and no customer balance, receipt, subscription, or staff data was synthetically modified.
- This is a **real production SQL/provisioner remediation** and source regression result. Real-store signed purchase webhook evidence and Android/iOS device QA remain separately unperformed in this specific review.
