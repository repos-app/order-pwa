# Android Emulator QA: ordinary business flow, 2026-10-11 PHT

## Objective

Run Emulator API36 QA like physical Android: prepare unique QA-only `teat`
fixture; use genuine Android ADB taps to receive and waste stock; compare
authenticated RPC/DB inventory and stock ledger before and after; clean up only
the fixture and re-prove original six-plus inventory baseline; record an exact
formal case only when complete and independently evidenced.

## Added local automation (uncommitted)

- `scripts/android-qa-emulator-business-e2e.mjs`
- `test/android_qa_emulator_business_e2e_test.mjs`
- `scripts/android-qa-emulator-business-handoff.mjs`
- `test/android_qa_emulator_business_handoff_test.mjs`
- `scripts/Watch-AndroidQaEmulatorSafe.ps1` cooperative handoff stop support

Both new test suites PASS offline: 34 business-flow assertions and 32 ownership
assertions as of 16:48 PHT. The flow uses real Emulator ownership, verified
`com.izakanpai.commissionpos.uitest` package, exact Android native ADB input,
CDP observation, same-store authenticated API readbacks, marker-only data
mutation, guaranteed attempted cleanup and sanitized audit evidence.
Emulator-only results must never be counted as physical-device PASS.

## Real Emulator execution attempts (not mock)

| Local time | Outcome | Stage | Fixture/DB writes |
| --- | --- | --- | --- |
| ~16:36 | NOT_PROVEN | AVD name returned trailing CR, corrected strict parser | 0 |
| ~16:40 | NOT_PROVEN | initial page order-entry rather than manage, native Back navigation added | 0 |
| ~16:43 | NOT_PROVEN | auth/store readiness after native Back not established, bounded 2-capture readiness added | 0 |
| ~16:47 | NOT_PROVEN | native route asserted false; previously opaque failure | 0 |
| ~16:49 | NOT_PROVEN | phase-tagged diagnostic `native_route/ASSERTION_FAILED`, actual subcondition not yet proven | 0 |

**No fresh Emulator business PASS or FAIL resulted from these new runs.**
The formal `.android-emulator-run/state.json` remains PASS 9, FAIL 56,
NOT_RUN 2015 at last inspection; official runner has independently progressed
through other physical QA work. There is no basis to count offline unit-test
PASS as formal Android case PASS.

## Ownership and recovery

Each live attempt first acquires exclusive Emulator ownership, disabling only
the exact `izakanpai-EmulatorQA-Continuity` scheduled monitoring task, and
releases or restores the original Emulator driver/supervisor. A legacy
pre-cooperative supervisor required a guarded exact-PID handoff during the
first attempt. Subsequent normal handoffs and recovery handlers were fixed
and offline tested. The final real run (~16:49) yielded verified restore
(`prior_enabled_supervisor_only_recovery`); journal cleanup is confirmed,
continuity task returned enabled/Ready. Emulator supervisor is running;
the **idle driver may remain STOPPED** due intentional low-memory / explicit
resume policy, which must not be represented as active throughput.

None of these procedures touched the physical Android QA owner or the
physical formal runner. No commit, push, deployment, APK publication,
or production DB mutation is authorized/performed.

## Next exact blocker

The current tested APK does not contain the newer native order-entry
`mgmtBackBtn` link. Genuine KEYCODE_BACK navigates to manage, but the
script's native route gate still failed in the last run. Determine the exact
CDP/ADB subcondition with **read-only** route snapshots and bounded assertions
before attempting the next business write. Accept only authenticated `teat`
origin, foreground WebView and current store; never synthesize location changes
or claim PASS from partial proof. If an updated QA-only APK is installed later,
verify its build identity before considering any repaired UI defect retested.
