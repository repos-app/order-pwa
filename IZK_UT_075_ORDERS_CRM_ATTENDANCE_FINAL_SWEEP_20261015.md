# IZK-UT-075 final sweep: orders, CRM, attendance (2026-10-15)

Scope: LOCAL source only. Existing dirty diffs preserved. No commit/push/deploy/prod DB/formal QA.

## Findings and fix
orders.js void reason 200 was already fail-closed and all three admin entrypoints already reject overlength. Existing approverLoginId input was silently truncated at 100 before looking up employees. Replaced with exact normalized value and explicit `approver_login_too_long`, before identity lookup and order mutation. All three admin entrypoints now show Japanese/English validation before posting. `actorName` and `actorRole` are authenticated actor metadata, not user-entered cancellation fields; their historical audit normalization remains unchanged.
CRM prepareOrderRewards orderId100 derives from established order identifier; reversal order_id100 and coupon_code64 come from persisted reward snapshot, whose key must match ledger exactly. Rewriting truncation without a migration/history study risks incorrect reversal; PENDING. CRM reservation status20 is a finite canonical enum (受付/確定/来店済/キャンセル) with explicit allowed transition check before update; no permitted status reaches 20 characters, so no user data truncation observed. Date10, birthday digest and QA synthetic ID canonical transformations unchanged.
Attendance sanitize200 applies to punch memo (user input), plus comparison in existing idempotency path. This is a plausible silent text truncation but UI entrypoint and historical replay/idempotency consequences need end-to-end verification; left unchanged, PENDING. Attendance requestId100 and timezone formats derive protocol canonical values; unchanged.

## Self review 10 independent checks
S01 enumerate slice usages in all three modules PASS
S02 verify existing reason 200 backend rejection PASS
S03 verify existing reason 200 Native/Web/TEST preflight PASS
S04 inspect approverLogin auth SQL exact equality PASS
S05 enforce approver boundary before identity SQL PASS
S06 preserve authenticated actorName and actorRole audit fields PASS
S07 CRM order source ID provenance reviewed PASS (source inspection)
S08 CRM reversal coupon code historical provenance reviewed PASS (source inspection)
S09 reservation status finite-state transitions reviewed PASS
S10 attendance memo/ID and date transformations classified PASS (source inspection)

## Horizontal review 10 independent checks
H01 Native admin cancellation path new approver guard PASS static
H02 Web production admin same guard PASS static
H03 Web TEST admin same guard PASS static
H04 direct API voidOrder shared implementation PASS static
H05 GAS voidOrder shared implementation PASS static
H06 coupon usage reversal SQL references full stored snapshot PENDING dynamic history
H07 CRM reservation Native/Web source finite UI status values PASS static
H08 attendance note storage vs idempotency comparison PENDING dynamic replay
H09 actual D1 tenant isolation and refunds PENDING real DB
H10 actual device keyboard/IME and bilingual alerts PENDING physical QA

## Local validation
Dedicated source contract test `test/izk_ut_075_orders_crm_attendance_final_sweep_test.mjs` verifies guards and three UI preflights. Dynamic coupon reversal and attendance replay are not marked PASS.
