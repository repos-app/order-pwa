# AI credit monthly allowance v2 — 2026-11-03

## Agreed business contract

- Store-shared **Free 1 credit per UTC month**, promotional carryover capped at **5**.
- Store-shared **Pro/legacy 10 credits per UTC month**, promotional carryover capped at **30**.
- No first-time 3-point trial for new stores. Existing trial and promotional balances migrate once into the new capped pool.
- Purchased credits are separately accounted, have no accumulation cap, do not expire, and retain signed RevenueCat verification, duplicate and reversal handling. The 30/100/300 purchased packs and existing feature prices are unchanged.
- Free-to-Pro change in the same month yields 9 additional points (10 total monthly), not 11. Pro-to-Free limits promotional balance to the Free maximum. No same-month flip can mint repeated credits.
- The monthly grant event is idempotent per store/cycle/tier. Grant, reservation, settlement and refund operate using existing immutable per-store operations/ledger. Across-month failed scans restore only up to the applicable plan cap.
- Promotions are applied on authenticated wallet query/reservation, not via an unbounded scheduled global mutation. New stores start with 1 or 10 according to their verified plan.

## Deployment contract

1. Keep legacy production databases intact; take D1 time-travel bookmarks and verify all store identities before schema updates.
2. Apply schema migration 0049 to each existing physical tenant, with 0047 added only if independently missing; verify correct grant/finalize trigger names and update each independent schema marker.
3. Build tenant provisioner migration bundle through the existing generator for **future stores**. Avoid rewriting other billing migrations, legacy data and customer entitlements.
4. Integrate code into the **latest GitHub main** before deployment. Preserve purchase-receipt counters, Android/Apple purchase recovery, owner-only purchase admission and all prior remote commits. Do not deploy outdated local main.
5. Deploy the shared tenant template, then deploy the provisioner, then use the existing provenance/binding-checked rollout helper on existing workers; recheck desired/current digest for each.
6. Verify remote D1, worker deployments and store-specific binding integrity. Native subscription UI needs the normal Android/iOS app distribution; worker deployment does not publish an app update.

## Ten source-specific review checks (not formal device QA)

1. Initial Free balance is 1, Pro is 10; no new trial grant.
2. Free 5 and Pro 30 caps are enforced in SQLite trigger, atomically.
3. Month-end carries promotional credits forward instead of replacing them.
4. Same UTC month repeated reads never award a second grant.
5. Free-to-Pro upgrade does not award Free 1 plus Pro 10.
6. Pro-to-Free downgrade enforces Free 5 without affecting purchases.
7. Legacy 0048 trial and monthly promotional balances migrate and cap with ledger delta.
8. Across-month refund restores carried promotional credits without exceeding cap.
9. Missing/expired RevenueCat entitlement is never treated as active Pro in refund cap.
10. Grant/reservation operations continue to require verified authenticated store ID.

## Ten lateral review checks (not formal device QA)

1. Per-store isolation and different employees' shared credits.
2. Concurrent reservations cannot overspend.
3. Replay and failed-scan refund remain idempotent.
4. Refund-before-purchase debt is not mistaken for free credits.
5. Paid purchase grant and refund remain signed/event-deduplicated.
6. Purchased balance can exceed the promotional cap and does not expire.
7. Signed purchase receipt counts/verification in the latest remote main are preserved.
8. Client cannot request direct credit grants or alter store scope.
9. UI presents both tiers and purchased unlimited policies in Japanese and English.
10. Future-store migration generation and existing tenant rollout share the same schema and source.

## Evidence boundaries

- SQLite/Node/Chromium tests are development regression only, not Realme/iOS formal QA.
- Cloudflare live deployments, markers, D1 bookmarks, code digests and smoke checks must be reported separately with actual counts. A successful deploy command is not evidence of correct user balances without independent readback.

## Actual deployment checkpoint (2026-11-03 PHT; not a full production rollout)

- GitHub `main`: **fe11b142aece968ecd3cbb07a095002fea5dd835**, committed and pushed; remote SHA matched.
- Existing physical tenant D1 databases: **13/13 schema migrations verified**, 0 failures. Individual time-travel bookmarks, 0047/0049 application records and schema readbacks are in locally recorded `test-results/ai-credits-release/monthly-v2-d1-rollout-20261103.json`. Read-only independent checks on `teat`, `yuwaku` and `yuwakubar` confirmed both v2 triggers and marker 0049.
- New-store template Worker `izakanpai-tenant-template`: uploaded, version `96809c17-20e8-4472-9ee6-cceab974d9ab`. No public trigger is expected for a template.
- Provisioner Worker `izakanpai-tenant-provisioner`: deployed, version `d9cd4a00-0855-4871-b54c-b8ee5e81c9ac`, cron retained.
- **Existing tenant runtime rollout: NOT DONE**. The authenticated safe rollout helper reported `teat: update_required` in read-only mode. A subsequent attempt to apply via the secured operator connection was stopped by the host safety check; do not claim existing tenant Workers were updated. In particular `teat` and `yuwaku` still showed their 2026-10-31 Worker versions on independent readback.
- Until all 13 workers are updated and verified with the provenance-preserving `scripts/rollout-existing-tenant-runtime.mjs`, the new monthly entitlement is **not live end to end**. Do not use a generic `wrangler deploy` over an existing tenant Worker: its binding inventory (e.g. 23 bindings on `teat`) is larger than the simple local config and secret service bindings could be lost.
- Latest-main tests: 87 development regression tests PASS, 0 FAIL. These are **not formal physical-device QA**.
- The subscription explanation is committed in `mobile-app/web/subscription.html` but requires an actual native app release before existing phones display the new wording. No Android/iOS app publication was done.

## Follow-up deployment and boundary correction (2026-11-03 PHT)

- The existing, provenance-checked rollout helper **successfully deployed/verified 13/13 existing tenant Workers** against the v2 template (0049). The per-store records and preserved binding counts are in the local operational evidence `test-results/ai-credits-release/monthly-v2-runtime-rollout-20261103.json`; `teat` kept all 23 bindings. No generic Worker overwrite was used.
- An additional real SQLite boundary test caught **Pro spent to zero → same-month downgrade to Free granting one extra point**. This was not a valid completed QA state. Fixed in `src/aiCredits.js` and immutable follow-on migration `0050_ai_credit_plan_downgrade_no_regrant.sql`. The new downgrade event applies only the Free cap, never a fresh monthly grant; purchased points remain untouched.
- **Migration 0050 now applied and independently read back in 13/13 existing physical tenant D1s**. The audit, bookmarks, prior/current trigger and schema marker are recorded at `test-results/ai-credits-release/monthly-v2-0050-d1-rollout-20261103.json`. No new physical tenant D1 appeared in the comparison inventory.
- Updated **future-store** template Worker: Cloudflare version `dc96a750-72f5-4dbc-a0ef-1c0985e87a88`. Updated physical Provisioner Worker: Cloudflare version `65c48de7-4d1a-4c59-8a84-7fff78a37743`, original cron retained. The generated migration list has **49 tenant migrations**, with the wallet/allowance/correction in order 0048→0049→0050. Existing provisioning-service tests exercise registration, per-tenant Worker, D1 migration marker, ownership, and cleanup under mocks; no real new tenant was created for this change.
- GitHub `main` includes correction `729a9d6` and new-store migration-coverage regression `a1d5b56`. **90 development regressions PASS, 0 FAIL**, including the previously failing same-month downgrade test.
- **Outstanding blocker:** Final 0050-compatible code is not confirmed on the **existing 13 tenant Workers**. The previously authorized helper's final `--apply` was blocked twice by host safety checks after the new template/Provisioner had already been deployed. No generic deployment was substituted because it would not preserve tenant-specific secrets and bindings. Independent Worker version readback still shows the 0049 rollout versions for `teat` (`f335e2c9-b4c1-4e67-b7cc-b600e883ff68`), `yuwaku` (`b08abe11-c4ff-4e84-869f-cd840e3e0fdd`) and `yuwakubar` (`b3386fae-f90b-433c-ab59-d70629282976`).
- To complete the live existing-store rollout, run the **same** `scripts/rollout-existing-tenant-runtime.mjs` using the authorized Cloudflare operator credentials, the verified store/database-ID evidence, and `--apply` once per store; continue on individual failure. Require `updated_verified` or `already_current` for all 13 including exact current-template code digest and unchanged bindings. Only after that can the 0050 production rollout be marked complete. Do not claim real purchases or formal device QA without their own evidence.

## Final existing-store production rollout — COMPLETE (2026-11-03 PHT)

This latest checkpoint supersedes the previously recorded incomplete Worker rollout above.

- Used the existing `scripts/rollout-existing-tenant-runtime.mjs --apply` with live operator authentication, original database UUIDs and physical tenant provenance, for **all 13 existing tenant Workers**. Every tenant returned `updated_verified` or `already_current`, with successful *post-write* exact template code digest and unchanged binding-name checks. **13 / 13 verified, 0 failures**. `teat` preserved 23 bindings; `yuwaku` preserved 16. Source: `test-results/ai-credits-release/monthly-v2-final-runtime-20261103.json` (local operational record).
- In a **separate read-only verification pass**, all 13 Workers returned `already_current`, with matching earlier per-tenant binding counts. **13 / 13 independent code-and-binding readbacks**. Source: `test-results/ai-credits-release/monthly-v2-final-readback-20261103.json` (local operational record).
- All 13 tenant D1 migrations 0050 had already been independently verified, with stored Time Travel bookmarks and schema markers: `test-results/ai-credits-release/monthly-v2-0050-d1-rollout-20261103.json`. Additional live read-only query of `teat`, `yuwaku`, `yuwakubar` confirmed the 0050 grant trigger exists, 0049 grant trigger does not, and schema marker is `0050_ai_credit_plan_downgrade_no_regrant.sql`.
- Future-store template Worker `izakanpai-tenant-template` version `dc96a750-72f5-4dbc-a0ef-1c0985e87a88`; Provisioner `izakanpai-tenant-provisioner` version `65c48de7-4d1a-4c59-8a84-7fff78a37743`. The generated migration catalog ends at 0050 and future-store registration/provisioning regression checks passed. No live production scratch-store creation/deletion or real Apple/Google purchase was performed.
- Final relevant source regression rerun: **46 PASS, 0 FAIL** (wallet, AI billing, RevenueCat, native billing page and Provisioner cases). Earlier broader related suites achieved **90 PASS, 0 FAIL**. These are development and simulated-provisioning checks, not formal Android/iOS device QA.
- The 0050 release is therefore complete **for the 13 existing tenant Workers, their D1 schemas, and the deployed future-store template/Provisioner**. Native app UI publishing, signed mobile builds and actual purchase roundtrips remain separately scoped and are not claimed here.
