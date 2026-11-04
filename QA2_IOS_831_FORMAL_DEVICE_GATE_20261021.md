# QA2 iOS official lane — 831-case readiness / USB device gate (2026-10-21)

Scope: iOS physical TestFlight only. Android/common-factory ownership remains with the prime agent. No official claim, device gesture, ledger update, deployment, store submission, or push occurred.

## Official state, before and after

Source: `.qa-v2-official/ios/state.json` and `node scripts/qa-v2-official-runner.mjs verify` (exit 0). Manifest contains 831 cases, of which 830 are iOS-applicable.

| Formal status | Before | After |
|---|---:|---:|
| PASS | 12 | 12 |
| FAIL | 0 | 0 |
| BLOCKED | 2 | 2 |
| SKIP | 5 | 5 |
| NOT_RUN | 812 | 812 |
| RUNNING | 0 | 0 |

`updatedAt` is still `2026-10-17T15:31:04.410Z`. No additional formal verdict or READY case was produced. The existing BLOCKED cases are `QA2-NEW-ONB-001` (old TestFlight build 106 hides signup) and `QA2-KEEP-OPR-ORD-005` (old build 107 authorization/API retry failure). The existing 12 PASS cases refer to historical captured physical TestFlight evidence and must not be presented as current-run proofs.

## Real runtime admission gate

- `scripts/qa-v2-ios-windows-readiness.ps1`: Apple Mobile Device Service `Running`, `appleUsbDevices=[]`, so iPhone is **not connected**.
- Current local `scripts/qa-v2-ios-build-inspector.mjs` read-only report after repair: `pythonAvailable=true`, `status=IPHONE_NOT_CONNECTED`, `installed=null`. There is no present installed TestFlight version/IPA SHA proof.
- `.qa-v2-official/ios-login-device.lock` absent; no identified live iOS CoreDevice/Python HID worker process. Absence of a lock does **not** establish that a phone is available.
- Historical PNGs under `test-results/qa-v2-evidence/ios-windows-bridge/` are retained, including build-108 snapshots, but none proves a currently connected, claimed device or acceptance checkpoints for a new case.
- Guarded HID entrypoint: `scripts/Start-IzakanpaiIosQaLogin.ps1` uses a separate login-specific lock and DPAPI credential profile. Read-only and persistent session pilots are **not** an independent formal QA PASS oracle.
- `.github/workflows/ios-build.yml` and `izakanpai-ios-simulator-smoke.yml` are manual `workflow_dispatch`; GitHub iOS signing path produces an artifact but does not install on the iPhone or submit to store. CI smoke/simulator evidence cannot substitute for required formal physical iOS proof.

**Admission decision: zero iOS cases safely executable in this session.** Any fresh claim requires the specific paired USB iPhone, a contemporaneous installed signed build/version check, no competing device owner, scoped official `claim --platform ios --kind ios-physical` with required physical screen dimensions and source/case eligibility, real checkpoints/screenshots and independent expectation verification, followed by the official `record` operation. No fake PASS or implicit historical carry-forward.

## Specific common iOS runtime defects fixed

`scripts/qa-v2-ios-build-inspector.mjs` formerly trusted the **first** USB iPhone and unscoped `apps query` results as if they belonged to the official QA iPhone. Added fail-closed exact QA UDID gate, rejection of ambiguous multi-device or missing-ID cases, and second USB identity attestation after the app query to suppress build proofs when the connected device changes. Tests inject synthetic serials; live QA default is pinned to the already-paired TestFlight iPhone.

The inspector also searched only an override/TEMP Python environment, while the actual guarded iOS login HID bridge uses `%LOCALAPPDATA%/izakanpai-ios-qa/pyenv/Scripts/python.exe`. Before repair, live read-only inspector emitted `IOS_INSPECTOR_UNAVAILABLE` despite the login bridge's working local Python. This common environment location is now resolved before the TEMP fallbacks. This fixes the false-negative Python readiness blocker without pretending the currently disconnected phone exists.

## Red/green evidence

- USB serial/ambiguity tests introduced before source repair: `node --test test/qa_v2_ios_build_inspector_test.mjs` → exit 1, **3 PASS / 5 FAIL**. After serial gate source repair and test fixture correction → four-file focused batch **11 PASS / 0 FAIL** (Node test runner).
- Python environment discovery regression introduced before its source repair: same single file → exit 1, **8 PASS / 1 FAIL**. After source repair, the four-file batch below → exit 0, **12 PASS / 0 FAIL / 0 SKIP**.
- Repeated green command: `node --test test/qa_v2_ios_build_inspector_test.mjs test/qa_v2_ios_login_bridge_test.mjs test/ios_github_build_workflow_test.mjs test/ios_release_readiness_test.mjs`.
- The separately executed iOS workflow script assertions: **13/13 PASS**; iOS release-readiness safeguard assertions: **41/41 PASS**. They are source/CI checks, not formal device results.
- `node --check scripts/qa-v2-ios-build-inspector.mjs` PASS; `git diff --check -- scripts/qa-v2-ios-build-inspector.mjs test/qa_v2_ios_build_inspector_test.mjs` PASS.
- `node scripts/qa-v2-official-runner.mjs verify` exit 0, with iOS formal counters unchanged.

Changed code/tests only: `scripts/qa-v2-ios-build-inspector.mjs` and `test/qa_v2_ios_build_inspector_test.mjs`; this note is new. Existing unrelated dirty files preserved. No claims, CI workflow changes, devices, or official state changed.
