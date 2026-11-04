# izakanpai Emulator QA memory/throughput optimization — 2026-10-11

## Hardware and measured load

- Windows host physical memory approximately **15.37 GiB**, free ranging
  **2.4–4.2 GiB** during the investigation. These are changing snapshots,
  not a durable RAM saving claim.
- Dedicated AVD `Izakanpai_QA_Lite_API36` is already headless / no audio,
  no Play Store, 2 vCPU, 720x1560, Android 16/API 36, **1536 MiB guest**.
  Its QEMU host working set is typically **2.2–2.3 GiB**, private pages
  about **3.1 GiB**. Guest RAM and host working set are not interchangeable.
- Windows process groups at 13:35 +08 showed **ChatGPT ~2052 MiB** (16
  subprocesses), **Node ~1533 MiB** (18 subprocesses), and QEMU **2294 MiB**.
  Some processes serve active ChatGPT sessions, Codex, connected MCP tools,
  and independently owned physical QA. Do **not** bulk-kill by executable.
- Earlier Chrome had ~2.2 GiB working set; later it was not a top group.
  Background Chrome cache trim or tab sleep can temporarily help but is
  not guaranteed permanent savings and can harm tab performance. No
  browser windows or user apps were closed by this work.

## Source changes actually deployed to Emulator driver

1. `scripts/android-qa-emulator-sync-efficiency.mjs` and regression test:
   existing trusted `android-qa-emulator-lane.mjs sync` Node subprocess runs
   only when SHA-256 of the staged **or** official runner content changes
   since the last **complete successful** sync. Failure, partial physical
   RUNNING skip, or evidence conflict causes recheck; new verdicts therefore
   cannot be suppressed. No reduction in formal audit/provenance rules.
2. In `scripts/android-qa-windows-driver.mjs`, only the **Emulator's**
   short-lived `android-qa-autopilot.mjs once` observation child has
   `--max-old-space-size=128`. The physical QA driver and its child flags
   are unchanged. The 128 MiB setting is a V8 old-generation heap ceiling,
   **not** a process RAM or Windows working-set limit.
   A proposed 256MiB old-generation V8 heap cap for the long-lived parent
   was **rolled back**: inserting a leading Node argument broke the Windows
   `Start-Process -ArgumentList` quoting of the absolute script path. This
   caused parent startup `MODULE_NOT_FOUND` failures every ~24s until the
   tested original launch argument format was restored. This rollback does
   **not** affect the independently configured Emulator-only **128MiB**
   short-lived observer cap.
3. The existing no-verdict route cooldown/persistence remains enabled;
   the improved driver skips unsupported screens and retains exact case
   provenance. Both 1.5 GiB host free safety stop and independent physical
   QA device ownership remain enforced.
4. QA parent and dedicated supervisor were switched only at stable
   `WAITING_FOR_ELIGIBLE_CASES` cycle boundary, gracefully stopping
   previous Emulator parent PID 17516 and supervisor PID 18868. Hash-matched
   copies of Emulator runner, point-in-time official runner, and event log:
   `.android-qa-emulator/memory-efficiency-cutover-20261011T053912072Z/`.
   No driver/device hard kill, runner reset or result overwrite.
5. Updated Emulator parent **PID 1660** started successfully with
   `scripts/Start-AndroidQaEmulator.ps1 -Action WatchPrepared`. New dedicated
   supervisor **PID 20948** was verified, the five-minute continuity
   task re-enabled. Emulator app and QA build unchanged in this step.
6. `scripts/Trim-AndroidQaEmulatorIdleChromeCache.ps1` is a **manual-only**
   dry-run-by-default utility for cache pressure. The script requires an
   exclusively safely stopped Emulator, host free RAM below the 4.6 GiB
   startup watermark, at most three verified Chrome renderer children,
   zero window handles, and negligible CPU use measured over two seconds.
   It calls Windows `EmptyWorkingSet` only with explicit `-Apply`; it never
   closes tabs or processes. The actual dry run rejected two Chrome
   renderers as **active**, so none was trimmed, preserving user sessions.

## Tests and evidence

- `node test/android_qa_emulator_sync_efficiency_test.mjs` PASS:
  unchanged complete sync skipped, staged or official change triggers,
  conflict/skipped physical RUNNING triggers recheck, invalid hashes fail.
- `node test/android_qa_emulator_lane_test.mjs` PASS:
  cross-lane dedup, full proof, merge, physical conflict, blocked, and
  no overwriting existing PASS/FAIL.
- `node test/android_qa_memory_efficient_observer_plan_test.mjs` PASS:
  proof-aware source-only scheduling helper created for future integration;
  **not wired in without corresponding observed section evidence**.
- `node --max-old-space-size=128 scripts/android-qa-autopilot.mjs plan`
  executed successfully on the existing 2080-case manifest. Actual
  foreground `once --record` under the new limit still requires an
  eligible case during live driver execution.
- `node --check scripts/android-qa-windows-driver.mjs` PASS.
- `scripts/Start-AndroidQaEmulator.ps1` and the Chrome cache tool:
  PowerShell parser checks PASS. The launcher was restored to known-good
  `Start-Process` argument order; revised parent PID **16152** was verified
  `RUNNING` with stderr file length zero at 13:53 +08.

## Important limitations

- 1280 MiB guest RAM would save at most 256 MiB of configured guest RAM,
  not a guaranteed 256 MiB of Windows RAM. Android 16/System UI already
  suffered ANR during QA updates; risking it on the active AVD now would
  reduce QA throughput. Keep stable 1536 MiB until a separate benchmark
  proves a smaller guest can repeatedly cold-boot, log in, run QA and restore
  rotation/IME without an ANR. **No RAM/resolution density setting changed**.
- Duplicate Playwright/GitHub/CUA MCP process trees under a single Codex
  app-server are present, but each may serve separate active sessions.
  Without proving which connector is idle, terminating them could disrupt
  current work. No Codex/MCP or browser process was terminated.
- The number of **new formal PASS/FAIL is still zero** immediately after
  cutover. Performance improvement is unquantified until the next real
  eligible test executes. Do not count route visits, compiler tests,
  screenshots, or offline synthetic fixture tests as formal 2080-case QA.
- Follow-up around 13:42 +08 showed Chrome working set briefly increasing
  to **~3.7 GiB**, after which the host fell below 1.5 GiB and QA correctly
  entered `STOPPED_LOW_MEMORY` without losing results. A working-set cache
  trim would be unreliable for currently active Chrome renderer processes,
  so the reviewed script intentionally did not act on them. Browser tab
  Memory Saver / safe closure of unneeded tabs may be needed for stable
  simultaneous QA on 16 GiB RAM.

## Explicitly authorized background application cleanup (13:49–13:53 +08)

The user reported having closed unneeded tabs and authorized closing clearly
unneeded applications. Two processes were independently verified as
**no visible window**, **CPU delta zero** across three seconds, and launch
command lines proving they were started only in the background:

- Microsoft Edge root PID **7456** with `--no-startup-window
  --win-session-start` (151 MiB root plus descendants).
- Microsoft 365 Copilot root PID **9992** with `autostart reason=AutoStarter`
  (132 MiB root plus embedded WebView2 descendants).

Only these two parent processes were stopped. Both were confirmed exited;
their embedded descendants closed as expected. The immediately measured
Windows free memory rose from **2.55 GiB to 2.68 GiB** (approximately
**0.14 GiB**), though free RAM fluctuates and this is not a persistent
guaranteed saving.

The remaining main Chrome process is explicitly launched by the **active
Chat On Steroids desktop process**, and its tabs are the current plugin
settings plus two **distinct** `Coding agent instructions` chats with
different URLs. These tabs are not proven idle, and closing them could
interrupt active coding agents. They were left open. Windows SearchHost,
ChatGPT, physical QA process trees and OneDrive were likewise untouched.

The revised Emulator parent restarted with PID **16152**, verified
`WAITING_FOR_ELIGIBLE_CASES` and existing runner **PASS 3, FAIL 56,
NOT_RUN 2021**. This is a valid case-cooldown wait, **not** a startup-loop
failure and not evidence of increased test throughput.

## Further zero-verdict idle-load reduction (13:59 +08)

- `scripts/android-qa-emulator-idle-backoff.mjs`: when the Emulator has
  **zero executable routes**, its route-candidate scan backoff increases
  from 20 to **60 seconds** (bounded; a newly available test is rechecked
  within that interval). Real device QA and active Emulator test routes
  remain at their existing polling cadence. Memory safety is still
  checked every **10 seconds** during the wait.
- `scripts/android-qa-windows-driver.mjs` now coalesces repeated identical
  cooldown-event messages by page/fingerprint/streak. Changed candidates
  and fresh cooldown periods remain logged, preserving diagnosability.
- `node test/android_qa_emulator_idle_backoff_test.mjs`, Emulator runner
  synchronization and cooldown checkpoint regression tests all passed.
- The previous dedicated Emulator driver PID **16152** was gracefully
  stopped only while it was at `WAITING_FOR_ELIGIBLE_CASES`; the supervisor
  owner and scheduled restart were temporarily disabled. Hashed copies of
  the Emulator runner, official runner *point-in-time* and original event
  log were preserved under
  `.android-qa-emulator/qa-idle-backoff-handoff-20261011T055833457/`.
- Improved parent PID **18260** acquired the exact Emulator lock and
  emitted `qa_zero_verdict_idle_backoff` with `intervalSeconds:60` after
  an actual zero-route cycle. Its stderr was empty. Dedicated supervisor
  PID **21784** was then restored and 5-minute Windows continuity task
  re-enabled. Both formal 2,080-case runners retain their existing results.

This reduces redundant CPU/disk/OneDrive writes rather than guaranteeing
any specific number of MiB saved. **No new Emulator formal PASS/FAIL** was
earned by this optimization. Test throughput now requires newly verified
executable cases, not another empty page sweep.

No commit, push, deploy, D1 migration, production DB change, or physical
QA device operation was made in this optimization.
