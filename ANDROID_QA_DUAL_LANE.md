# izakanpai Android QA: physical + emulator (local-only)

## Purpose

Continue Android physical-device QA on `RMX3938` while a separate Android
Emulator runs independent UI tests. Both lanes count completed, *fully verified*
PASS/FAIL against the **same official 2,080-case runner**. Emulator results
retain `[Android Emulator確認 / emulator-5554]` provenance and never impersonate
a physical observation. The 2,080 case definitions remain unchanged. No
production D1 or deployed code is modified.

## Environment (2026-10-10)

- Physical: `0O64B26I28103F70`, Android 16, package
  `com.izakanpai.commissionpos.uitest`.
- Emulator: `Izakanpai_QA_API37`, ADB `emulator-5554`, x86_64 Android API 37,
  1536 MB guest RAM, two cores, headless. Android API 36 image was incomplete
  / unrecognized by SDK Manager when checked; API 37 is **not identical** to
  the production Android 16 physical device.
- The host has ~16 GB RAM. Start one emulator maximum. The initial headless
  startup used ~4.4 GB process memory and reduced free memory to ~1 GB; the
  launch helper now refuses startup unless at least 7 GB is available first.
  The first smoke run confirmed boot, package install, app foreground and a
  WebView debug socket; the emulator was then stopped to protect physical QA.
  Stable *concurrent* execution is not yet established on this memory budget.
- ADB uses explicit device serials; physical CDP remains `127.0.0.1:9222`;
  emulator CDP uses `127.0.0.1:9232`. A driver owns only its own lane lock.

## How to use (PowerShell from repository root)

```powershell
# Prepare emulator case definitions (safe/idempotent)
node scripts/android-qa-emulator-lane.mjs prepare

# Start the existing dedicated emulator, or inspect its boot status
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Start
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Status

# After boot: install QA APK to emulator ONLY. Choose a QA APK whose build
# matches the cases under test; confirm package id before launching.
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -s emulator-5554 install -r .tmp-uitest-installed-now.apk

# Only after the QA app reaches the authenticated management hub:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Observe
# Record mode runs conservative, independently verified UI recipes; it will
# leave unsupported cases as NOT_RUN, not fabricate PASS. Verified emulator
# cases are automatically merged into the official physical runner after each
# completed page and again at the end of the run.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Record

# If an individual case was manually recorded into the emulator runner,
# explicitly sync it into the common official runner:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Sync

# See official counts, source annotations and candidate screens
node scripts/android-qa-emulator-lane.mjs status
node scripts/android-qa-emulator-lane.mjs plan
node scripts/android-real-device-gpt-runner.mjs summary
```

`Stop` affects **only** `emulator-5554`, never the RMX3938 device:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action Stop
```

## Performance improvements

1. Screen-scoped actionable queue: in `--record` mode the Windows driver skips
   pages without any currently supported, pending cases instead of scanning
   all menu pages every cycle.
2. The observer groups all **conclusive** outcomes from one screen observation
   into one validated batch and writes `state.json` once (rather than once per
   case). Concurrency guards reject stale snapshots and origin mismatches.
3. Physical and emulator runners/locks/CDP ports are isolated:
   - Physical: `.android-real-device-run/state.json` and `.android-qa-autopilot/`
   - Emulator: `.android-emulator-run/state.json` and `.android-qa-emulator/`
4. The runner's `probe` uses its recorded device serial when a second Android
   device is connected, so a physical probe cannot silently select emulator.
5. Emulator results are merged using one filesystem writer lock and a freshly
   read official runner. They become standard `PASS` / `FAIL` (including a
   previously `BLOCKED` case), with `result.deviceKind = "emulator"`, source
   serial and source run ID. Results already PASS/FAIL on the physical device
   are not overwritten. `RUNNING` is skipped until the physical operator
   releases it. Repeated sync is idempotent and conflicts are reported.

## Prepared-case execution engine (multi-chat work preparation)

Existing physical Windows navigation and on-device CDP/ADB are reused. Multiple
preparers can independently inspect source/manifest and write **non-executable**
case recipe proposals (one JSON file per case) under `.android-qa-prepared/`.
They **never** touch the device or formal runner. They must identify the full
acceptance criteria and assess side effects before approval.

```powershell
# Rank reachable screens with uncompleted work for preparers
node scripts/android-qa-recipe-queue.mjs plan 10

# Seed existing audited driver handlers (currently 12 known recipes)
node scripts/android-qa-recipe-queue.mjs seed-builtin

# Research worker proposes one additional compatible safe select case;
# the note must state concrete code-based safety findings.
node scripts/android-qa-recipe-queue.mjs prepare PT-CTL-0203 safe-select "Reviewed menu selection control and confirmed opening picker never persists business state."

# Separate review / safety verification before it can be dispatched:
node scripts/android-qa-recipe-queue.mjs approve PT-CTL-0203 --reviewed-no-write "Confirmed UI selection opening has no backend writes and the driver checks full case criteria."

# Inspect all runnable approved recipes
node scripts/android-qa-recipe-queue.mjs list
```

If a case does not match an implemented, safe recipe handler, do **not**
approve it as an executable case. Source research and candidate preparation
alone cannot generate PASS/FAIL. Adding a *new* case-complete handler requires
implementation and automated review before adding its recipe kind.

The single Windows driver groups approved recipes by screen, navigates once,
performs actual safe device interactions, validates every recipe's full
assertions, and records verified PASS/FAIL into the lane runner. Emulator
verified cases are automatically synced to the 2,080-case official runner.

```powershell
# Emulator; uses only emulator-5554. Boot and sign in first, check host memory.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Start-AndroidQaEmulator.ps1 -Action RecordPrepared

# Physical phone: ONLY after the existing ChatGPT physical operator hands off
# the phone and stops issuing ADB/touch commands. The explicit handoff flag is
# required to prevent accidental concurrent device control.
node scripts/android-qa-windows-driver.mjs once --record --prepared-only --physical-handoff
```

**Do not start the physical prepared-case engine while another chat actively
operates the same phone.** Preparers can work in parallel without handoff;
only execution needs the exclusive device.

## Switch from the existing physical test chat

There is **no runner reset, test rerun, or phone ownership transfer**. The
existing chat continues to use `.android-real-device-run/state.json`, with the
same Android physical device serial `0O64B26I28103F70`. The next `next` call
automatically skips emulator-completed cases. Other chats must not overwrite an
emulator result without a full physical retest and `--replace-emulator`.

The emulator worker uses `.android-emulator-run/state.json` for temporary
staging, then syncs completed cases to the same official runner. It must not
access physical ADB / CDP or reuse the physical worker's lock. Do not use
`init`, `reset`, `retry-failed`, or `reset-running` to switch lanes. Have the
current physical worker complete its current case before selecting the next.

If the physical worker is already testing one specific case, the simulator's
sync will leave its `RUNNING` status unchanged; after the physical result is
recorded, any subsequent sync will respect the result rather than replacing
it. Emulator source and physical source are available in `summary --json` via
`verificationSources` and each case's `result` object.

## Quality and safety rules

- A test is PASS only after its **entire** acceptance criteria have been
  performed, including actual touch, keyboard, rotation or server checks where
  required. A static DOM inspection alone can prove some unequivocal FAILs,
  but **cannot** prove generic CONTROL/INPUT PASS.
- Emulator PASS/FAIL joins official completion counts **only after** actual
  emulator verification with a full case summary. `NOT_RUN`/unproven candidate
  results never change official counts.
- No shared state reset, APK replacement or ADB command on the physical device
  is needed. Do not run two drivers against the same device.
- Tests that submit orders, change stock, refund, email or otherwise mutate
  backend records require a separate disposable QA tenant/database and reviewed
  test data. Until that exists, restrict emulator automation to safe reads and
  locally validated interactions.
- No per-case screenshots, screen recordings or logcat files are retained by
  these scripts. Internal control events and concise result reasons may remain
  in the separate QA runner/event files.
- AVD boot or launcher failures are infrastructure issues, not test FAILs.
  Do not mark cases as executed until the app and assertion actually run.

## Verification

```powershell
node test/android_qa_batch_recorder_test.mjs
node test/android_qa_emulator_lane_test.mjs
node scripts/android-qa-autopilot-selftest.mjs
node scripts/android-real-device-gpt-runner.mjs probe
```

The existing driver offers only a narrow class of automatically certifiable
checks. Further automation must be built as explicit case-complete recipes,
especially for INPUT and OPERATION tests. Mere candidate identification does
not increase PASS counts.
