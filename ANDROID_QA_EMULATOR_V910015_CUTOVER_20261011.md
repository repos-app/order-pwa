# Emulator QA v910015 — authorized cutover evidence (2026-10-11)

## Scope and authorization

The owner gave explicit permission to apply the Emulator QA recovery/driver
improvements and to proceed with the correctly verified, QA-only APK. All
device commands in this cutover were scoped by ADB serial **`emulator-5554`**,
AVD **`Izakanpai_QA_Lite_API36`**, Android API 36. The physical RMX3938 QA
lane, D1 database, Cloudflare Worker, production services and Git remotes
were not operated.

## Runner and evidence retention

- Before updates, the dedicated Emulator runner was
  `android-emulator-20261010103308`, 2,080 cases: **PASS 3, FAIL 56,
  NOT_RUN 2,021**. None of the 59 existing terminal verdicts was changed.
- Pre-cutover files (Emulator runner, official point-in-time runner,
  emulator driver events, supervisor events) were copied to
  `.android-qa-emulator/safe-code-cutover-20261011T045147036Z/`.
  `cutover-manifest.json` records the snapshot count, source hash and copies.
- The independent official runner snapshot was **PASS 412, FAIL 220,
  BLOCKED 288, SKIP 100, NOT_RUN 1,060**. It is not to be restored over
  any later physical QA progress.

## Exact APK identity, provenance and rollback copy

| Evidence | Old installed QA APK | Installed updated QA APK |
| --- | --- | --- |
| Application ID | `com.izakanpai.commissionpos.uitest` | same |
| Version code | `910013` | **`910015`** |
| Version name | `1.0-current-native-read` | **`1.0-qa-retest-20261011`** |
| Signing cert SHA-256 | `e2456158189c02443265eac2050acd13827a15a5d484234fd0d6ce87a9fc30cf` | same |
| SHA-256 of actual APK | `ACA2B79C460CFA319CCAACD61A21FF7A34833864AE0BDB1CC04BE46B02135CFC` | `51AA8DD78879FC67A7DDC5B624B526DF63A93EB2E4F57DB517EB608E8C7EA2F1` |

Candidate `.android-qa-autopilot/izakanpai-qa-retest-20261011.apk`
was modified **2026-10-11 11:49:21 +08**, and its **102/102 Android
`assets/public/*` files match the current packaged QA assets** by SHA-256.
The packaged asset manifest SHA-256 is
`9656a19ea72cf6662837f564e99525b9c3bec9e01d1d72ac597eabf0a42cc7f9`.
The alternative `app-debug-ui-smoke.apk` has the WRONG package ID and was
**not installed**.

With the independent Emulator owner absent, auto-restart task disabled,
supervisor stopped, exact AVD verified, backup present, and the strict
`assessQaApkSwitch()` gate returning
`READY_FOR_SEPARATE_AUTHORIZED_INSTALL`, the QA APK was installed using
`adb -s emulator-5554 install -r ...` and returned **Success**. No uninstall,
`pm clear` or rollback of application data was done. The native first install
time remained 2026-10-10 12:26:42, while last update changed to
2026-10-11 05:05:03 UTC.

The installed new APK was then independently pulled from the **same AVD**
and independently verified to have exactly the candidate SHA-256, package,
versionCode **910015**, and the matching signing certificate. Exact backup
paths in `.android-qa-emulator/`:

- `installed-qa-before-v910015-20261011T050311020.apk` (old signed APK)
- `installed-qa-v910015-verified-*.apk` (pulled new signed APK)

## Android startup and ownership

- After the package install, Android 16 briefly displayed a **System UI ANR**.
  With the supervisor and driver both stopped, the native uiautomator dialog
  was verified to say **System UI isn't responding** with the exact **Wait**
  button at (360, 872); only that button was selected. The system returned to
  the launcher. This is **not** an izakanpai POS testcase FAIL.
- The QA-only MainActivity was launched by exact scoped `adb -s emulator-5554`.
  Both top-resumed activity and focused window were verified as
  `com.izakanpai.commissionpos.uitest`.
- The revised `scripts/android-qa-windows-driver.mjs` was started using
  `scripts/Start-AndroidQaEmulator.ps1 -Action WatchPrepared`. Parent PID
  **21400** acquired the Emulator-only lock and navigated live screens,
  including `profit_sim.html`, `takeout.html`, `commission.html`, and
  `coupons.html`. The runner SHA was unchanged across the install/start.
- The revised dedicated supervisor was then started as PID **19260**, with
  the `izakanpai-EmulatorQA-Continuity` Windows task re-enabled; it verified
  the already running parent and did not spawn a competing driver.
- Restart protection now distinguishes automatic child observer completions,
  clean parent exits, real parent failures and low-memory safety stops.
  Memory minimums and circuit limits were not disabled. Backoff was corrected
  to count only observed genuine parent failures, not healthy first boot or
  low-memory recovery.

## Current operational limitation

On latest verified turn-side inspection at ~13:08 +08, Emulator had **59**
total terminal results (PASS 3, FAIL 56, 2,021 NOT_RUN). The updated APK
and driver were genuinely running, but **no new PASS/FAIL** had yet been
proved. Measured progress toward **20 new confirmed cases/hour** is thus
zero at that checkpoint. The actual case blockers are unproven input/save
fixtures, conditional hidden controls, pending safe modal recipes and the
screen-only `PT-SCR-007` needing 2 independently validated WebView layout
observations. A file copy, new APK, source fix, mere page visit or a child
process `stop` event must never be counted as a formal verdict.

Neither the runner nor any existing PASS/FAIL was reinitialized,
overwritten, or rewound. No Git commit, push, deploy or D1 migration was
performed.
