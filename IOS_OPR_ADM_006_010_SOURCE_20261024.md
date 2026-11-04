# izakanpai iOS SOURCE lane — OPR-ADM-006–010

Date: 2026-10-24 (PHT). Scope: source preparation only, five exact iOS cases
`QA2-KEEP-OPR-ADM-006` through `010`. Canonical acceptance source:
`.qa-v2-official/manifest.json` (831 immutable cases), corroborated by
`test/plans/QA_V2_REALME_FULL_831_COVERAGE_20261014.json`. The official
Android PASS history is not an iOS verdict.

## Delivered source

- `scripts/qa-autonomy/ios-void-approval-family.mjs`: one reusable
  `makeIosVoidPlan` compiler using a separately observed UI target-rectangle
  map for the **current** iPhone screen/build. It binds the exact case ID and
  uses the existing `runIosClaimedCase` bridge. No guessed or permanently
  pinned tap position is executable. The existing bridge still requires live
  capture SHA, independent target-rectangle approval, DDI gate, owned formal
  claim, visual postcondition, proof validation and formal record.
  `verifyIosVoidManifest` checks the actual 831-case official manifest's
  exact expected checkpoint and legacy assertion before the physical bridge.
- `scripts/qa-v2-ios-persistent-session.py` and
  `scripts/qa-v2-persistent-transport.mjs`: guarded single-field HID `fill`
  operation (ASCII, max 100 chars), with a fresh image/rectangle and claim
  confirmation before the field receives input. It creates no general shell,
  clipboard, JavaScript execution or background service.
- `scripts/qa-v2-ios-claimed-bridge.mjs`: `fill` plans name only
  `reason`, `approverLogin`, `approverPass`; input text comes from the
  independent runtime field provider after its checked image. No password
  appears in the plan/receipt/status. Credential-provider exceptions are
  reduced to `IOS_FIELD_PROVIDER_FAILED`.
- `createIosVoidIndependentOracle`: captures independent owned-order/D1
  observations before the first action and after the final tap; verifies
  store, order, approval policy, actor/approver roles, order status and audit.
  Without completed readback, the supplied independent oracle cannot finalize.
- `scripts/qa-autonomy/ios-void-claim-d1.mjs`: actual claim-bound, remote,
  read-only D1 selector for this five-case family, using
  `qaReadOnlyD1Config` and the existing dedicated
  `test/qa-d1/wrangler-ui15-teat.toml`. It rechecks the currently owned
  official claim around every SQL call and verifies tenant/database marker,
  order ID/status, approval policy, active actor and approver names/roles,
  and per-order audit IDs/reason/action. All selectors are source-defined and
  bounded; passwords never enter SQL or results. The caller still must bind
  it to a genuine runner claim and an independently verified signed actor.
- `cleanupIosVoidFixture`: accepts only `teat`, explicitly owned case
  fixtures and an independent cleanup readback; permanent business audit
  history must remain. No cleanup ran in this source lane.

The provided APIs require an **external case-authorized** `readOwnedOrder`
implementation and independent UI oracle. Merely setting `owned: true`
in test code cannot establish fixture ownership. The formal runner's separate
proof validation and official claim checks remain mandatory.

## Exact case acceptance matrix

| Case | Actor and input | Business oracle | Fixture aftermath |
|---|---|---|---|
| 006 | Staff; reason; do not supply manager credentials | Manager approval required, status unchanged, audit delta 0 | Retain or independently clean only this owned order |
| 007 | Manager; reason; no external credential | Status `取消`, exactly one new `注文取消` audit, reason retained, actor=approver | Preserve audit history |
| 008 | Staff; manager login and deliberately incorrect password | Void rejected, status unchanged, audit delta 0 | Retain or independently clean owned order |
| 009 | Staff; staff login used as approver | Void rejected, status unchanged, audit delta 0 | Retain or independently clean owned order |
| 010 | Staff; valid manager login/credential | Status `取消`, exactly one `注文取消` audit, reason and manager role retained | Preserve audit history |

Current native `admin.html` source confirms `vdReason`, `vdLogin`,
`vdPass`, `vdGo`, `voidModal`, `voidNeedsExternalApproval`, and
`API.post('voidOrder',...)`. The service implementation is
`src/orders.js:voidOrder`: order update and audit insertion share the
transaction guard. The audit primary key is `audit_id` (migration
`0001_init.sql`), so source assertions compare *new IDs*, not array
position alone.

## Verified validation and physical boundaries

- `node --test scripts/qa-autonomy/ios-void-claim-d1.test.mjs scripts/qa-autonomy/ios-void-approval-family.test.mjs test/qa_v2_ios_persistent_fill_transport_test.mjs test/qa_v2_ios_claimed_bridge_test.mjs test/qa_v2_ios_lane_preflight_test.mjs test/qa_v2_ios_build_inspector_test.mjs`: **61 PASS / 0 FAIL**, process exit **0**. Synthetic captures, mocked HID transport and simulated independent DB snapshots/remote SELECTs are only **offline** fixtures.
- `.ios-coredevice-venv/Scripts/python.exe scripts/qa-v2-ios-persistent-session.py --offline-check`: **PASS**, process exit **0**, no physical device action.
- `git diff --check` over the edited bridge/transport/Python/test files: exit **0**.
- `node scripts/qa-v2-official-runner.mjs verify`: exit **0**,
  actual iOS formal state (read-only) **12 PASS, 0 FAIL, 2 BLOCKED,
  5 SKIP, 812 NOT_RUN** across all 831 manifest rows (830 iOS-applicable).
  All five target IDs `006`–`010` currently read **NOT_RUN**.
- **Formal iOS verdicts from this work: PASS 0 / FAIL 0.** No current case-specific screenshot, Apple TestFlight runtime verification, live D1 readback, official case claim, runner record, or official ledger change was performed.

Historical physical diagnosis (2026-10-21,
`docs/QA2_IOS_CLAIMED_BRIDGE_PHYSICAL_DIAG_20261021.md`) found a
CoreDevice RSD tunnel but **display, screenshot, HID services
`InvalidServiceError`** and unverified Developer Disk Image mount. This
is a **historical prerequisite**, not a claim that the service status was
retested today. A fresh exact-device, installed-build and DDI/HID service
check, physical calibration of each UI rectangle (including keyboard
position), independent role/credential fixture and signed D1 provider
are required before these five cases can execute physically. If the
current iOS service still fails, this lane remains physically blocked while
other source-only case families continue.

The 15-stage `ios-audit` inventory currently discovers **static JSON**
`qa.ios.claimed.scenario.v1` reviews; this source compiler needs live
calibration and has **not** been labeled an approved scenario by that
inventory. Do not infer SOURCE_CASE_CONTRACT approval from a successful
source compile or from a delivered chat task.

## Ten distinct source self-reviews

All outcomes below are **source-reviewed**; none establishes formal device QA.

1. S01 — Compared the five exact IDs, scenario titles and checkpoints to
   `QA_V2_REALME_FULL_831_COVERAGE_20261014.json`: aligned.
2. S02 — Reviewed staff/manager role and approval-ON requirements against
   `admin.html` and `src/orders.js`: explicit case actors enforced.
3. S03 — Checked case ID allowlist and `teat`/owned-order preconditions
   in `makeIosVoidPlan`: cross-store and unowned plans rejected.
4. S04 — Inspected credential serialization paths: plan contains field keys;
   explicit text prohibited; field-provider exceptions redacted.
5. S05 — Verified HID `fill` accepts bounded ASCII and one-action UI ticket;
   Python offline validator rejects invalid field/action variants.
6. S06 — Verified capture SHA and live rectangle gate remains in the shared
   claimed bridge, including keyboard-shift-sensitive coordinate validation.
7. S07 — Tested 006/008/009 denied attempts preserve exact status and audit
   count, with deliberately mutated snapshots rejected.
8. S08 — Tested 007/010 positive assertions on fresh `audit_id`, role,
   action `注文取消`, exact reason and exactly-one-new-audit.
9. S09 — Tested cleanup fails before executing on missing ownership, and
   fails after execution if audit preservation cannot be read back.
10. S10 — Checked finalization cannot run before independent observations;
    61 focused regressions pass, formal verdict untouched.

## Ten distinct cross-path reviews

1. X01 — Staff UI modal: `voidNeedsExternalApproval` requires approver fields.
2. X02 — Manager UI modal: `currentUserCanApprove` skips external fields.
3. X03 — Invalid password backend: `test/izk_ut_048_approval_regression_test.mjs`
   covers rejection; iOS case 008 keeps separate runtime assertion.
4. X04 — Non-manager approver backend: same regression plus iOS 009
   checks role/unchanged business effect.
5. X05 — Audit schema: checked `migrations/0001_init.sql` `audit_id`
   against `src/orders.js` transactional audit insertion.
6. X06 — Native input: compared existing `qa-v2-ios-hid-driver.py`
   keyboard clearing with persistent HID field entry.
7. X07 — Native session authorization: reused
   `qa-v2-persistent-transport.mjs` UI authorization/claim path.
8. X08 — Device/build consistency: included iOS build inspector and
   preflight regressions; wrong device or build cannot be accepted.
9. X09 — DDI/HID admission: reused `qa-v2-ios-ddi-admission.mjs`; this
   source work bypasses no physical-service gate.
10. X10 — Official evidence: reused `qa-v2-ios-claimed-bridge.mjs`
    and existing formal `validateProofs`; no source-only verdict promotion.

Physical screen states, D1 provenance, credential profiles, post-cleanup
physical evidence and formal results are **pending independent execution**.
No commit, push, deployment, D1 mutation, TestFlight build or official
QA ledger write is attributable to this lane.
