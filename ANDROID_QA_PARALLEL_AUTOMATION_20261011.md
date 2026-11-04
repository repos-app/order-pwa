# izakanpai Android QA — ongoing formal execution + parallel test automation

## Goal and scope

User approved using `teat`, `yuwaku`, and new QA-only tenants with real create/save/update/delete; **the application is not released**. Formal QA remains the 2,080-case `.android-real-device-run/state.json`. Source tests, mock passes, direct RPC tests, CDP observations, and Emulator-only outcomes **must not be added** to this formal runner as PASS without verified device case completion. No commit/push/deploy performed.

This branch/workspace has many concurrent owners. **Do not interrupt** any live physical/emulator controller or reset/rewrite their runner/state. Every device automation must hold exclusive ownership of its own serial. The new scripts below are additions only; none replace the current owner driver.

## Automation modules built in parallel

| Target | New file | Applicable formal IDs | Verified now |
| --- | --- | --- | --- |
| Authenticated test-tenant inventory RPC fixture, full before/after and cleanup | `scripts/android-qa-inventory-write-autocase.mjs` | OPR-INV-003, -005, -006, -012, -013 | Offline selftest **16 checks PASS**; corrected live authenticated Android QA WebView run **RPC_VERIFIED**, no new official Android verdict asserted |
| Exclusive existing Android auth/session/tenant CDP bridge | `scripts/android-qa-existing-android-session-adapter.mjs` | Inventory fixture support | Offline lock, target, security tests PASS. **No credentials are requested or logged** |
| Settings label save/reopen/impact/restoration orchestrator | `scripts/android-qa-settings-label-e2e.mjs` | PT-SET-005 through -016 (12 IDs) | Offline unit tests PASS (5/5); live native UI adapter not yet provided |
| Real-device owner's settings native IO contract (authenticated RPC + native touch/edit/save/Back/reopen/impact/restoration) | `scripts/android-qa-settings-native-io-adapter.mjs` | PT-SET-005 through -016 (12 IDs) | Added; simulated owner integration tests PASS. Real physical Android transport still pending |
| Native RMX3938 settings driver transport with exact native tap/keyboard/save and independent impact check | `scripts/android-qa-physical-settings-label-live-io.mjs` | PT-SET-005 through -016 | Offline tests PASS; actual authenticated `teat` preflight verified 10 settings baseline and stopped **before mutation** because a native /manage.html link was unavailable from the initial screen. Navigational recovery is pending |
| Emulator native lifecycle/IME plan and evidence assessor | `scripts/android-qa-emulator-operation-recipes.mjs` | OPR-OPEN-014, OPR-ORD-038, OPR-TAKE-018, OPR-REC-030 | Offline Node tests PASS (6/6); actual owning driver has not integrated this helper |
| Emulator exclusive native lifecycle executor / proof reader | `scripts/android-qa-emulator-native-autocase.mjs` | OPR-ORD-038, OPR-OPEN-014 | Added, offline selftests PASS. Both target cases have since been formally PASS through other authorized QA processes, so duplicate execution is not needed |
| Android native stock double-tap executor | `scripts/android-qa-physical-inventory-native-autocase.mjs` | OPR-INV-003 | Added, offline selftest PASS. OPR-INV-003 already formally PASS; do not rerun as new work |
| Genuine native PO failure evidence gate | `scripts/android-qa-physical-po-failure-proof.mjs` | OPR-INV-015 to -019 | Added; **no formal FAIL inferred from static source alone**. Full independent native/UI/backend evidence still needed |
| Emulator pending CONTROL exact-case screener with touch-size and focus evidence contract | `scripts/android-qa-emulator-pending-controls-candidates.mjs` | Cross-runner 244 official NOT_RUN controls | Live source-only screen found 43 concrete sub-44px touch validation candidates and 18 focus candidates. This **61-wide integration queue is not 61 verified cases** |
| Native Emulator batch for four independent control-size captures on each screen | `scripts/android-qa-emulator-touch44-native-batch.mjs` | 43 pending target buttons, grouped by page | Offline test PASS. First live attempt stopped before control geometry at Android 36 rotation-proof mismatch, then parser corrected using WindowManager. Emulator driver subsequently reclaimed lock, so **0 control cases from this new script measured/recorded** |

Companion regression tests:
`test/android_qa_inventory_write_autocase_test.mjs`,
`test/android_qa_existing_android_session_adapter_test.mjs`,
`test/android_qa_settings_label_e2e_test.mjs`,
`test/android_qa_settings_native_io_adapter_test.mjs`,
`test/android_qa_physical_settings_label_live_io_test.mjs`,
`test/android_qa_emulator_operation_recipes_test.mjs`,
`test/android_qa_emulator_native_autocase_test.mjs`,
`test/android_qa_emulator_pending_controls_candidates_test.mjs`,
`test/android_qa_emulator_touch44_native_batch_test.mjs`,
`test/android_qa_physical_inventory_native_autocase_test.mjs`.

Formal statuses can change while these helpers are authored, and some target cases may already be PASS through a *different* authorized Android QA lane. Always read the current runner by exact case ID before attempting or recording a result. The modules cover **21 named IDs**, not 21 new completed results or 21 currently pending results.

## Executable commands

```powershell
# Pure offline regression, no Android/device/DB access:
node --test test/android_qa_inventory_write_autocase_test.mjs test/android_qa_existing_android_session_adapter_test.mjs test/android_qa_settings_label_e2e_test.mjs test/android_qa_emulator_operation_recipes_test.mjs
node scripts/android-qa-settings-label-e2e.mjs --plan
node scripts/android-qa-emulator-operation-recipes.mjs --contract

# Physical QA owner only, once ALL conditions below are true:
# (1) physical driver is STOPPED and exclusive physical-device.lock absent;
# (2) one real logged-in teat or yuwaku WebView on inventory.html;
# (3) CDP port 9222 pre-existing, correctly forwarded to the QA app process;
# (4) independently captured inventory baseline and no concurrent owner.
$env:ANDROID_QA_EXCLUSIVE_WRITE = 'YES'
$adapter = Join-Path (Get-Location).Path 'scripts/android-qa-existing-android-session-adapter.mjs'
node scripts/android-qa-inventory-write-autocase.mjs --execute --adapter "$adapter" --store teat
Remove-Item Env:ANDROID_QA_EXCLUSIVE_WRITE -ErrorAction SilentlyContinue
```

The inventory adapter exclusively acquires `.android-qa-autopilot/physical-device.lock` atomically, validates device, native package, selected WebView process, authenticated currentStoreId/workspace, then restricts RPC to inventory calls. The token stays inside the authenticated Android WebView. Any conflicting active owner, wrong tenant/screen, ambiguous target, missing CDP forward, or missing auth stops the test without proceeding.

This inventory run is an **RPC/DB subproof**, not proof that the user physically tapped Android inventory controls. A formal OPR-INV-003 PASS also needs the native double-tap + exact single stock-movement evidence. The other cases need their own native interaction and acceptance assertions.

Settings E2E exports `executeLabelCase({row,storeId,marker,adapter,sourceHtml})`. `createSettingsNativeIoAdapter(owner,{storeId})` in `scripts/android-qa-settings-native-io-adapter.mjs` converts an **existing, exclusive physical Android device owner's native transport** into the five required E2E callbacks. The owner must supply real session/bound-tenant proof, authenticated `getSettingsBundle` RPC, fresh in-app native-tap navigation, real keyboard replacement and native `saveShop` tapping, independently rendered seat labels on order/admin, and native package restart. It verifies exactly one setting changes, unaffected settings stay the same, impact labels show on actual order/admin UI, and finally the full original snapshot/label visibility are restored. `E2E_EVIDENCE_READY` still needs official QA-owner review. Current settings screen applies a 30-character label maxlength: generated QA marker values are now truncated to 30 characters without losing the unique QA prefix, verified in local tests.

Emulator recipes export `buildAdbPlan(caseId,{tap})` and `assessOperationProof(evidence)`. Execution requires **one owning Emulator driver** and uniquely captured real ADB power/activity/window and WebView evidence. Native tap coordinates must be based on fresh CDP hit tests and native WebView bounds; never replay stale hardcoded positions. Do not run these plans concurrently with the current emulator driver, watchdog or supervisor. It deliberately provides a fail-closed `--evidence` command rather than taking emulator ownership in an independent process.

## Actual live evidence and issue found

The authenticated physical QA WebView was reached on `inventory.html` with an existing teat session. A temporary QA-only inventory row was created and stock received; the first live run concluded `NOT_PROVEN` because the test expected a movement of type `初期` for an item created with **zero initial stock**. In the existing inventory backend a zero-stock creation does not generate that initial movement. This was a **test expectation mismatch**, not evidence of an application inventory defect. The fixture script's strict `finally` cleanup ran.

The movement expectation was corrected to one `入荷` after receive and `入荷` + `廃棄` after waste. At **14:48 PHT**, the real authenticated `teat` Android WebView rerun exited **0** with `status:RPC_VERIFIED`, verifying one receive movement, request-idempotent repeat (no extra movement), low-stock threshold entered/cleared, waste clamped at zero, and exact original inventory rows unchanged. This is **direct authenticated RPC and DB evidence**; it was not a physical double-tap UI proof and did not alter the formal runner.

Independent Cloudflare D1 readback after the rerun confirmed `teat` `drink_inventory` contained **0 QA2080_ rows** and the **six original rows remained**. The physical device exclusive lock was absent. Old and new snapshots were compared by the script, including existing row stockVersion values. The movement audit history was intentionally retained. Review all new live verdicts separately from the 2,080 formal runner.

## Next required integration

1. Under an exclusive physical owner, add real native tap/keyboard/screenshot captures and official-case matching for the pending inventory scenario(s), then record only actually completed cases. The backend/RPC fixture is now proven repeatable.
2. Integrate the Emulator native plan/assessor with its **own existing owner driver** after stopping conflicting control loops. Prioritize only currently NOT_RUN IDs.
3. Implement the Android UI adapter for the twelve label-propagation cases; do not call partial RPC readbacks complete scenarios.

## PO lifetime gap discovered

Formal OPR-INV-015 to -019 require supplier/PO create, PO edit, PO receive, duplicate receive and partial receive. `mobile-app/web/purchasing.html` currently holds an ephemeral `PO_ROWS` array and uses `sendPurchaseOrderEmail`, while `src/gasApi.js` and `src/purchasing.js` expose supplier/reorder-item CRUD and email send but no persistent PO lifecycle create/edit/receive RPC. This is a source-verified **likely functional gap** affecting five pending formal cases, **not** five formally recorded FAILs. Require native on-device attempt, same-store D1 readbacks, and safe QA marker cleanup to establish the actual failure before marking formal FAIL. A dedicated fail-closed `scripts/android-qa-physical-po-failure-proof.mjs` checks this evidence; it does not fake outcomes.

No source commit, push, deploy, APK publishing, process interruption, or formal runner manual edits are part of these new automation modules.

## Native order screen management-back repair

`mobile-app/web/order-entry.html` did not include the `mgmtBackBtn` anchor that `mobile-app/web/app.js` already explicitly updates on authenticated staff sessions, while `docs/yuwaku/index.html` does contain it. This prevented reliable native UI navigation from an in-app order screen to the management hub. An exact `<a id="mgmtBackBtn" href="./manage.html" style="display:none...">` was restored in canonical native HTML, the mobile distribution and identical Android/iOS asset mirrors. It remains initially hidden for unauthenticated/QR visitors, and existing `app.js` decides when to show it. New `test/android_qa_order_native_manage_back_test.mjs` PASS **2/2**; `test/distribution_parity_test.mjs` PASS with 100 files matched per platform and seven PWA shell scopes. This is a source-only fix; it **does not update the currently installed QA APK or any public Worker**. Until QA APK renewal, the native device driver must use independently observed genuine back/navigation events.

## Source-fix retest gate as of 15:04 PHT

The read-only audit `scripts/android-qa-retest-readiness.mjs` reports **220/220 source-repair claims still `release_or_install_pending`**, with 0 official repair retest PASS. `scripts/android-qa-apk-readiness.mjs` confirms the local Android Web assets match canonical source, but the newest locally retained debug APK predates the changed source; installed-device APK/Worker/schema identity is not proven. Before 220 genuine defect rechecks, coordinate a QA-only APK update and, for cases needing them, the approved backend/schema rollout. Never mark source-fixed as device-PASS.
