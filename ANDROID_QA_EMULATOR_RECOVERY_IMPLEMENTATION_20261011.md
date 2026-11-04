# izakanpai Android Emulator QA — local improvements and safe cutover

## Scope and immutability

Dedicated Emulator: `emulator-5554` / AVD `Izakanpai_QA_Lite_API36`, package
`com.izakanpai.commissionpos.uitest`, independent runner
`.android-emulator-run/state.json` (`android-emulator-20261010103308`).
Official 2,080-case runner belongs to the independent physical QA lane.
Do **not** reset or overwrite either runner, or alter existing PASS/FAIL.
No Git commit/push/deploy, D1 migration, production API call, device operation,
APK installation or process restart was performed for this implementation.

## Root cause, not conflated

- `android-qa-autopilot.mjs once --record` is an intentionally short-lived
  **child**. Thousands of `type:start` / `type:stop` pairs belong to separate
  4-section read-only observations; they are NOT parent crashes.
- Separate real **parent** failures exist: low-RAM `safety_stop`, failure to
  locate a genuine WebView, and abrupt missing parent PID after stale-lock
  recovery. A normal parent `stopped` followed by a new supervisor launch
  is another distinct event and must not be called an abnormal exit.
- On 2026-10-11 at 04:33:44Z the parent stopped at **1.47GiB host free**,
  `STOPPED_LOW_MEMORY`. It correctly preserved 3 PASS, 56 FAIL, 2,021 NOT_RUN.
  That is an intentional safety stop, not a passed case or a DB defect.
- See `ANDROID_QA_EMULATOR_STARTUP_LOOP_AUDIT_20261011.md` for trace chronology.

## Code prepared and locally verified (not yet guaranteed active)

1. `scripts/AndroidQaEmulatorRecoveryPolicy.ps1` supplies a pure classifier
   for alive owner, foreign lock, manual stop, authorized-login wait,
   eligible-case wait, crash, and low-RAM wait. `Watch-AndroidQaEmulatorSafe.ps1`
   filters **parent supervisor restart events only**, not child telemetry.
   After low-RAM stop, **3.7GiB** host free is required before new parent
   launch. Rapid genuine failures use bounded 120s/600s backoff and a 1h
   circuit after four parent starts within 30 minutes.
2. `scripts/Start-AndroidQaEmulator.ps1` preserves parent stdout and stderr
   using distinct UTC/GUID log names. Previous fixed files were overwritten
   on every restart, making abrupt death investigations ambiguous.
3. `scripts/android-qa-windows-driver.mjs` now annotates parent `stopped` and
   `safety_stop` records, distinguishing stop-file, SIGINT/SIGTERM, and
   bounded one-shot completion. It does not weaken the exclusive device lock.
4. `scripts/android-qa-emulator-executable-plan.mjs` and the driver use
   **actual supported case IDs** for read-only 44px, persistent-input-label,
   exact input-constraint, approved gesture recipe, and the audited
   `PT-SCR-007` negative overflow check. Unsupported manifest rows do not
   inflate a route's executable count. A screen can produce FAIL only with
   proven measured failure; partial checks never produce PASS.
5. `scripts/android-qa-route-yield-checkpoint.mjs` persists only Emulator
   non-verdict scheduling state (`route-yield-checkpoint.json`) across normal
   parent restarts. A page/source/handler fingerprint change invalidates the
   previous route cooldown. Malformed/old/foreign checkpoints fail closed.
6. `scripts/android-qa-emulator-fixture-readiness.mjs` checks seven strictly
   in-memory `QA_TEST_STORE_A` fixtures and validates rollback checksum and
   no foreign-store references. **No fixture is installed into the app/DB**.
7. `scripts/android-qa-emulator-apk-switch-gate.mjs` demands a matching
   QA-only package, signer identity, current asset hash, positive build ID,
   isolated runner snapshot, exclusive handed-off device and exact user-approved
   candidate SHA. The gate never installs an APK itself.

## Local APK is NOT an approved replacement

`android/app/build/outputs/apk/debug/app-debug-ui-smoke.apk`:

- APK package: **`com.izakanpai.commissionpos`**, not QA's `.uitest` package.
- versionCode: **900056**; versionName: **1.0-ui-smoke**.
- SHA-256: `E496E0554AC4943EF56BB0A939F1A729E8E551F7A68A0AEF0E346FB19FADB96B`.
- Android debug certificate SHA-256:
  `90bd9619a300e120c679c3487069db30786626bbb80acbea96ae5cc379b4e868`.
- Built 2026-10-08; packaged/source assets last changed 2026-10-11,
  hence APK predates the current source. APK is **ineligible** for QA install.
- Current installed QA package signature, APK SHA, versionCode, and assets
  have not been independently verified in this change set.

## Case-ID blockers / measured velocity

| ID | Current official status | Blocker |
| --- | --- | --- |
| `PT-SCR-007` (`audit.html`) | NOT_RUN | Repeated read-only layout observation returned `visible_unzoomed_screen_not_verified`; no conclusive overflow proof, NOT_PROVEN |
| `PT-CTL-0392` (`purchasing.html`) | NOT_RUN | `poPickSel` needs a verified safe picker-open + cancel recipe; selecting or confirming may write |
| `PT-CTL-0261` (`printers.html`) | NOT_RUN | `printLangSel` has possible settings-save on change; cannot autoapprove |
| `OPR-FIN-016` | NOT_RUN | Profit Sim must show no production writes in a controlled QA fixture; no on-app isolated fixture is provisioned |
| `PT-CTL-0051`, `PT-CTL-0140/0142/0143` | SKIP | Existing live modal fields need genuine data and correct safe modal-opening recipe. Official SKIP is immutable without separately reviewed requeue |
| `PT-CTL-0204/0208` | SKIP | New-category fields are dynamically hidden until mode changes. No CSS/DOM forced reveal or synthetic PASS |

At audit time, the Emulator had **59** unique PASS/FAIL across 2,080 rows,
with **0 new verified verdicts in the current session**. No evidence supports
20 new PASS/FAIL per hour. Recording runner `SKIP`, `NOT_PROVEN`, fixture
generation, DOM presence, and child process starts as completed cases is banned.

## Safety handoff sequence before activation

1. Confirm the independent physical QA owner and new driver/APK deployment
   coordinator are not operating `emulator-5554` and no APK installation is
   underway. Verify the exact serial, AVD, and emulator/physical owner tokens.
2. Disable **only** `izakanpai-EmulatorQA-Continuity`, then stop the dedicated
   supervisor under its PID/token. At the next `WAITING_NEXT_CYCLE` /
   `WAITING_FOR_ELIGIBLE_CASES` boundary, gracefully stop the Emulator driver.
   Do NOT kill it during an active case; do NOT operate the phone.
3. Archive hashes and runId for both runners and all Emulator evidence. Keep
   a before/after count by unique case ID. Never reset official status.
4. Check new QA APK package `.uitest`, signer, versionCode, SHA, source and
   packaged-assets fingerprint, and user-specific approval **before** any
   installation. Existing `app-debug-ui-smoke.apk` fails the package gate.
5. With the permitted new driver/APK, verify actual installed identity on
   `emulator-5554`, foreground QA session, one CDP target, portrait/IME and
   memory headroom. Do not presume a repaired source makes an old FAIL PASS.
6. Start exactly one Emulator parent, confirm its owner PID/token and active
   stage, then re-enable its dedicated supervisor and continuity task once.
7. Measure verdict throughput from a 60-minute before/after **unique**
   PASS+FAIL delta. Report case IDs and NOT_PROVEN reasons if below 20/h.

This is a local code/test handoff only. It does **not** assert that the
running supervisor has hot-reloaded the new recovery policy or that a new
Emulator APK has been installed.
