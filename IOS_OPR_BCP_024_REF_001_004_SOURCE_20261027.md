# izakanpai iOS SOURCE — BCP-024 / REF-001..004

2026-10-27 PHT | Stage: 15-stage ios-audit SOURCE | Git HEAD at start: `b7c277979817ea339fb3721df606073511596425`

## Completion boundary

New, shared `ios-business-integrity-family.mjs` contains SOURCE-only manifest and fixture validation, reusable claimed-iOS/HID/DDI physical requirements, independent readback business-effect checks, and claimed-fixture cleanup expectations. The case-specific state and cleanup differences live in the sole data file `test/plans/qa-v2-ios-source/operation-integrity-cases.json`. No per-case/per-group JavaScript driver, publisher, registry helper, unreviewed physical coordinate or formal runner claim was generated. `ios-source-contract-registry.mjs` reuses its existing gap inventory to publish all five specific remaining real-hardware prerequisites without misrepresenting them as executable/registered source adapters.

The one reusable module models the business transition and refuses dispatch whenever a reviewed physical controller, live claim, real screenshots, independent HTTP timeline and independent D1 observer are unavailable. Device, TestFlight, D1, official ledger, formal verdict and Oracle approval state were **not** changed.

| Case | Exact 831-manifest action/checkpoint | Source Oracle and cleanup contract |
| --- | --- | --- |
| BCP-024 | `2tenant同時営業` → `データ混在0` | Two independently authenticated, distinct physical session IDs; aligned clocks and strict overlap of committed operation intervals; real owned effects on teat and yuwaku, zero cross-tenant rows/effects; four distinct scoped D1 reads, two owned baselines restored, lease release and session revocation |
| REF-001 | `正常全額返金` → `negative receipt 1、元receiptは保持` | Exactly one negative `RF-` receipt and one linked `receipt_refunds` row in teat; original receipt immutable, negative amount and approver identity match; independent baseline and audit-preserving fixture reconciliation |
| REF-002 | `Staff返金 + Manager承認` → `approver認証必須` | Real Staff actor with independently verified Manager approver; exactly one linked refund and negative total, zero unrelated rows affected; only QA-owned receipt chain may be reconciled |
| REF-003 | `wrong Manager password` → `返金0` | Active same-store manager with independently confirmed invalid synthetic password; native `refund_auth` RPC, visible `refundAuth` translation key, dialog retained, no refund/commission/order-link/print/audit mutation |
| REF-004 | `Staffをapprover指定` → `返金0` | Actual same-store Staff approver, nonempty synthetic password, native `refund_auth` and dialog retained; untouched original, refund/commission/print/audit state, independent readback |

## Reuse and source evidence

1. Canonical `.qa-v2-official/manifest.json` has exactly 831 rows. All five legacy IDs and exact actions/acceptance checkpoints were validated by executable Node regression.
2. Existing shared iOS physical infrastructure is `scripts/qa-v2-ios-claimed-bridge.mjs`, `scripts/qa-v2-ios-hid-driver.py` / persistent session, and `scripts/qa-v2-ios-ddi-admission.mjs`. New requirements identify these unchanged transport interfaces. These interfaces currently do not implement verified dual concurrent business operations or authenticated native refund submission with claim-correlated independent scoped D1.
3. `src/refunds.js:23-53` performs role/password validation and rejects `refund_auth` before business writes; `src/refunds.js:73-153` inserts the negative receipt, refund link, audit and commission/reward reversals. `src/gasApi.js:503-505` passes the authenticated actor to the backend. `mobile-app/web/receipts.html:220-229` calls `refundReceipt`, maintains the rejection dialog, and renders translated `refundAuth`. No app source was changed in this SOURCE lane.
4. Existing `test/plans/qa-approved-oracles/QA2-KEEP-OPR-REF-003.json` and `REF-004.json` were read and reused as independent historical expectation inputs; no new Oracle approval is asserted. The Android evidence and Android status do not constitute iOS proof.

## Local validation evidence

New regression file: `scripts/qa-autonomy/ios-business-integrity-family.test.mjs`.

- Five canonical-case data/manifest contracts, required iOS steps, rejection of unreviewed physical dispatch, and cleanup provider invocation all asserted.
- Deliberate bad evidence is rejected: sequential tenant sessions, aliased session or D1 read, forged overlap clock, foreign-origin rows, no committed business effect, missing native refund RPC, malformed negative receipt, cross-linked original receipt, denied refund changing audit rows, `RF-` original, aliased cleanup observers and incorrect restored baseline hash.
- First common-family regression: 4/4 PASS, exit 0. After final controls were strengthened, focused iOS family/audit/BCP regression: **27/27 PASS, exit 0**. The final six-file integrated iOS audit + prior BCP families + new family regression: **50/50 PASS, exit 0**, 0 failures. `node --check` exit 0; `git diff --check` exit 0.

## Review coverage and limits

Distinct self-review checks performed from source: (S01) Manifest/legacy parity; (S02) case-data uniqueness and type mapping; (S03) exact receipt input/positive amount; (S04) role, password and store scope; (S05) concurrency overlap, rejection and monotonic event order; (S06) immutable original, negative link and unowned baseline; (S07) modal/error key and original native route; (S08) cleanup failure and separate reader requirements; (S09) mutation-based negative regression source; (S10) dirty change preservation and source-only dispatch gate. These were manual source checks and focused regression, not a completed formal S01-S10 evidence-file approval.

Distinct horizontal source inspections performed: (H01) Android receipts asset refund path; (H02) iOS Native source `mobile-app/web/receipts.html`; (H03) Web prod `docs/yuwaku/receipts.html`; (H04) Web TEST `docs/yuwaku/test/receipts.html`; (H05) receipt link/role modal UI; (H06) `src/gasApi.js` and `src/refunds.js` RPC; (H07) SQL store scoping, receipt_refunds/commission/rewards/print references; (H08) `refundAuth` JA/EN; (H09) 2-store fixture/session and physical lease preconditions; (H10) independent reverse search from `refundReceipt`/iOS registry and existing cross-tenant source family. No application business-code patch or distribution synchronization was required for a SOURCE contract extension. No formal 20-review evidence gate or rollout is claimed.

## Blocking physical prerequisites

- BCP-024: two separately authenticated, observable simultaneous business operation sessions, real iOS HID/DDI/build binding, synchronized independent operation timing and independent per-tenant D1 readbacks. Sequential store switch is insufficient.
- REF-001/002: reviewed claimed iPhone refund UI controls and actual Manager authorization, real native RPC and independently correlated refund/negative receipt/approver/commission readback, followed by audited QA-owned cleanup.
- REF-003/004: actual Staff login, live on-device Manager password rejection / Staff role rejection, independently observed server response and zero D1 mutation, legitimate real iOS PNGs, restored authorized QA state.

Only the verified QA stores `teat` and `yuwaku` are permitted in this source contract. This change does not start physical tests or a scheduler, grant Oracle approval, mutate D1/formal ledgers, commit, push, build or deploy. All five remain **SOURCE-contract prepared / physical proof missing / formal iOS verdict unchanged**.
