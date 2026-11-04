# Android Emulator QA startup-loop audit — 2026-10-11

Scope: read-only audit of `scripts/Watch-AndroidQaEmulatorSafe.ps1`, `scripts/Start-AndroidQaEmulator.ps1`, `scripts/android-qa-windows-driver.mjs`, the route-yield gate, and `.android-qa-emulator` logs/status. No device, process, runner, lock, source, deployment, or database state was changed.

## Conclusion

The visually noisy start/stop pattern has two different causes and must not be treated as one failure mode.

Most of the few-second `stop` records are expected child-process completions. The long-lived parent `android-qa-windows-driver.mjs watch` process launches `android-qa-autopilot.mjs once --record` synchronously for each viewport section, up to four sections per page. Each child emits its own terminal `type:"stop"` record, and the parent copies the tail of that child output into `qa_emulator_readonly_screen_assessment.result`. Different child PIDs every few seconds therefore do not prove that the parent driver crashed or restarted.

Real parent exits also exist. They fall into three classes: clean requested/controlled stops (`kind:"stopped"`), explicit caught safety stops (`kind:"safety_stop"`), and abrupt disappearance where the supervisor later finds a dead PID and recovers the stale driver lock without any preceding parent `stopped` or `safety_stop`. The last class is real, but the current evidence cannot prove whether the cause was Node, Windows memory pressure, an external termination, or another process-level failure.

There is also a concrete supervisor race: a cleanly stopped parent is automatically relaunched because the stop request is transient and there is no persistent "remain stopped / handoff" state. That makes an intentional `StopDriver` look like a restart loop and can defeat a safe handoff.

## Expected child lifecycle: not a parent crash

`android-qa-windows-driver.mjs` defines `AUTOPILOT` as `scripts/android-qa-autopilot.mjs` and invokes it with `execFileSync(... [AUTOPILOT,'once','--record'] ...)`. In the emulator route observer, this happens once per section in a loop capped at four sections. The child call is synchronous and bounded by a 25- or 30-second timeout.

Concrete log evidence from the current run:

- Parent driver PID `20652` starts at `2026-10-11T04:27:24.435Z`.
- On `reservations.html`, section 1 through 4 complete at `04:27:30`, `04:27:33`, `04:27:35`, and `04:27:38` with child PIDs `6940`, `14772`, `19252`, and `17188`. Each embedded child result ends in `type:"stop"`.
- The same parent PID continues across later pages; `admin.html`, `order-entry.html`, `inventory.html`, `profit_sim.html`, and others show new child PIDs for each section.
- The parent itself does not exit until the explicit low-memory safety stop at `2026-10-11T04:33:44.729Z`.

Therefore dashboards and human review must distinguish the outer parent event from the child JSON embedded inside the `result` string. Treating every nested `type:"stop"` as a driver restart produces a false startup-loop diagnosis.

## Real parent exit classes observed

### 1. Clean parent stop

The driver loop writes `kind:"stopped"` only after leaving its watch loop normally. It then writes status `STOPPED` and releases the ownership lock in `finally`.

The clearest current example is:

- `2026-10-11T04:27:06.962Z`: previous parent completes cycle 70.
- `2026-10-11T04:27:09.022Z`: parent logs `kind:"stopped"` with runner still at 59 emulator decisions.
- `2026-10-11T04:27:24.435Z`: a new parent starts as PID `20652`.
- `2026-10-11T04:27:26.345Z`: supervisor logs `emulator_test_driver_restarted`.

This is a controlled parent stop followed by supervisor restart, not a crash.

### 2. Caught safety stop

The parent catches an exception, records `kind:"safety_stop"`, writes status `STOPPED_ON_ERROR` or `STOPPED_LOW_MEMORY`, releases its lock, then exits nonzero. Examples include:

- `2026-10-11T02:55:06.393Z`: `emulator_low_memory_prioritize_physical:free=1.49GiB`.
- `2026-10-11T03:17:31.284Z`: `emulator_webview_bounds_missing_or_ambiguous`.
- `2026-10-11T04:33:44.729Z`: `emulator_low_memory_prioritize_physical:free=1.47GiB`; immediately followed by verified emulator release request.

The latest status is consequently `active:false`, `stage:"STOPPED_LOW_MEMORY"`, reason `emulator_low_memory_prioritize_physical:free=1.47GiB`, with the emulator runner still `59` decided (`56 FAIL`, `3 PASS`, `2021 NOT_RUN`). This latest shutdown is an intentional safety outcome.

### 3. Abrupt parent disappearance with stale lock

The supervisor has a conservative stale-lock recovery path. It requires the driver to report not running, the lock to contain a PID/token, the PID to be absent twice with a 250 ms separation, and the lock contents to remain unchanged before archiving it. Several parent PIDs reached this path without first writing `stopped` or `safety_stop`:

| Parent PID | Parent start | Last observed activity before disappearance | Supervisor stale-lock recovery | Next parent start |
| --- | --- | --- | --- | --- |
| 8516 | 02:25:54.297Z | 02:35:09.483Z | 02:35:23.047Z | PID 9068 at 02:35:45.519Z |
| 9068 | 02:35:45.519Z | 02:39:56.579Z | 02:40:11.121Z | PID 17728 at 02:40:33.298Z |
| 17728 | 02:40:33.298Z | 02:45:15.658Z | 02:45:18.928Z | PID 15664 at 02:45:41.162Z |
| 19508 | 03:18:13.140Z | 03:30:52.429Z | 03:31:04.890Z | PID 3704 at 03:31:26.940Z |

These are genuine unexpected parent disappearances. They should be classified as `ABRUPT_PARENT_TERMINATION_UNPROVEN_CAUSE`, not automatically as a Node crash. No terminal parent event survived to identify the cause.

The present stdout/stderr capture cannot close that gap because `Start-AndroidQaEmulator.ps1` redirects every new parent to the same `physical-windows-stdout.log` and `physical-windows-stderr.log` paths. A later launch can replace the evidence needed to diagnose a prior abrupt death.

## Concrete race and monitoring defects

### Intentional stop is not durable

`android-qa-windows-driver.mjs stop` writes `physical-windows.stop`. The active parent sees that file, exits normally, and releases `physical-device.lock`. On the next supervisor cycle, `Watch-AndroidQaEmulatorSafe.ps1` sees an otherwise ready emulator and no owner, so it calls `Start-AndroidQaEmulator.ps1 -Action WatchPrepared` again. The new parent removes any existing stop file at the beginning of `run()`.

This means the stop file is a one-process termination request, not a "stay stopped" state. The `04:27:09 -> 04:27:24` sequence proves that the supervisor can undo an intentional stop within one polling interval. It is unsafe for handoff semantics because a caller cannot express "stop this driver and keep it stopped until explicit resume."

### Route cooldown disappears on parent restart

The driver creates `new QaRouteYieldGate(...)` in memory for each parent process. Emulator watch mode uses 20-, 60-, and 120-minute backoffs after repeated zero-verdict route visits. The gate correctly worked before the latest restart: around `04:22`, many routes logged `qa_route_cooldown` with `unproductiveVisits:3` and roughly 45-51 minutes remaining, while cycles 67-69 reported `WAITING_FOR_ELIGIBLE_CASES` with no visited routes.

Every parent restart creates a fresh gate with no history. A clean restart, controlled error restart, low-memory restart, or abrupt-death recovery can therefore erase the no-result cooldown and allow expensive zero-yield sweeps again.

### Emulator route signatures overstate executable work

For the emulator lane, `routeYieldDescriptor()` initially collects all staged/official `NOT_RUN` cases for a screen. The physical lane has an additional executable-case narrowing step, but the emulator branch does not. This causes descriptors such as `settings.html` to report hundreds of pending candidates even when the page later reports no pending case with an implemented read-only observer.

This is conservative for verdict integrity, but inefficient for throughput: unsupported manifest rows can keep a page in the route plan and can change its cooldown signature even though the current driver has no safe handler capable of deciding them.

### Global observer mtime resets route signatures

The route signature includes the size and mtime of the whole `android-qa-autopilot.mjs` file. Any edit to that file changes the signature for every route, even when a page's observer behavior and eligible case set are unaffected. Because a signature change resets `QaRouteYieldGate` state, unrelated observer edits can re-enable many cooled-down screens at once.

### Parent stop reason is underspecified

The clean `stopped` event contains no reason. The driver internally knows whether it observed the STOP file or received SIGINT/SIGTERM, but that distinction is not recorded. The supervisor consequently cannot tell a requested handoff stop from a generic clean termination.

### Startup success check proves only two seconds of process life

`Start-AndroidQaEmulator.ps1 -Action WatchPrepared` starts Node, sleeps two seconds, and reports success if the process has not exited. It does not verify that the launched PID acquired the expected emulator lock and published an active status bound to that PID/token. A parent that dies shortly after the two-second window is reported as successfully started, then rediscovered as absent on a later supervisor poll.

### Repeated restart failures have no parent-level circuit breaker

The supervisor safely refuses duplicate owners and conservatively recovers stale locks, but after a verified parent disappearance it can start another parent on the next eligible cycle. There is no bounded restart budget tied to an unchanged failure fingerprint. Repeated failures therefore consume cycles until another guard, such as RAM, blocks the lane.

### Supervisor lifecycle itself is incompletely observable

`safe-supervisor-events.jsonl` contains many later `safe_supervisor_started` entries without a matching `safe_supervisor_stopped`. That alone does not prove a supervisor crash because external replacement/hot-swap can terminate it. It does show that current logs are insufficient to distinguish a normal supervisor replacement from abrupt supervisor termination.

## Recommended safe fixes

The following changes can be made without weakening runner integrity, ownership, or device identity checks.

1. **Add a durable emulator-only restart inhibit.** A manual/handoff stop should persist a small, versioned hold file in `.android-qa-emulator` before requesting parent termination. The supervisor must refuse `WatchPrepared` while the hold is valid and log `driver_restart_inhibited`. Only an explicit resume operation should clear the hold after validating emulator lane identity. Keep the transient STOP file for terminating the current process; do not use it as the only handoff state.

2. **Persist route-yield cooldown safely.** Store only non-verdict scheduling state such as `{page, signature, unproductive, eligibleAt, visits}` in a versioned emulator-only JSON file, written atomically. Reuse an entry only when the schema, lane, page, signature, and bounded future `eligibleAt` are valid. Reset it on meaningful candidate/handler change. This preserves 20/60/120-minute no-result backoff across a parent restart without changing PASS/FAIL/SKIP.

3. **Build emulator route descriptors from executable observers.** Use the same fail-closed principle as the physical actionable planner: include a case only when an implemented emulator read-only observer, approved recipe, or explicit safe handler can currently attempt it. Leave unsupported formal cases as `NOT_RUN`; simply avoid spending a sweep on them until a handler or fixture becomes available.

4. **Use page/handler-specific cooldown versions.** Replace the whole-autopilot mtime component with a stable fingerprint of the handlers and source inputs that can affect that page's eligible cases. A relevant handler, page source, approved recipe, or eligibility change should reset the cooldown; an unrelated observer edit should not.

5. **Separate parent and child telemetry.** Emit explicit fields such as `scope:"driver_parent"` for parent `start/stopped/safety_stop` and `scope:"autopilot_child"` with `childPid`, `page`, `section`, and exit status for child completion. Do not rely on an embedded raw child JSON tail whose `type:"stop"` can be mistaken for a parent stop.

6. **Record clean-stop reason.** Before the parent writes `stopped`, classify the terminating trigger as at least `stop_file`, `sigint`, `sigterm`, or `once_complete`. The supervisor should honor `stop_file` plus the durable hold as an intentional stop and should not auto-restart it.

7. **Preserve per-parent logs.** Redirect stdout/stderr to a filename containing launch UTC and parent PID, with an optional separate latest pointer/copy. This retains evidence for abrupt-death diagnosis. The supervisor's stale-lock recovery event should also include the dead PID, last driver status timestamp/stage, and last parent event timestamp.

8. **Verify startup ownership, not just liveness.** After launching a parent, use a short bounded verification window to require an emulator-lane status whose PID equals the launched PID and a matching live owner/lock. Failure should be classified as `PARENT_STARTUP_NOT_OWNED` and should not be logged as a successful restart.

9. **Add a restart circuit breaker.** For an unchanged parent failure fingerprint, permit at most two automatic restart attempts in a bounded window, then stay monitor-only until a material state change or explicit resume. A fingerprint can include the terminal classification, runner identity/hash, relevant source fingerprint, and emulator identity. This prevents a true parent fault from turning into an unbounded supervisor restart loop.

The current stale-lock recovery should remain strict. Its double dead-PID check, stable token check, and emulator-lane-only archive behavior are useful protections and do not explain the false child start/stop pattern.

## Error classification for monitoring

| Classification | Evidence | Restart policy |
| --- | --- | --- |
| `CHILD_ONCE_COMPLETED` | Outer parent event is `qa_emulator_readonly_screen_assessment` or hub observer; nested child output ends `type:"stop"`; parent PID remains live | Never count as parent failure or restart |
| `PARENT_STOP_REQUESTED` | Parent emits `stopped` and durable stop/handoff intent is present | Keep stopped until explicit resume |
| `PARENT_STOP_CLEAN_UNKNOWN_TRIGGER` | Parent emits `stopped` but trigger is not yet recorded | Do not immediately assume crash; improve telemetry before policy decision |
| `PARENT_SAFETY_LOW_MEMORY` | `safety_stop` reason begins `emulator_low_memory_`; status `STOPPED_LOW_MEMORY` | Release verified emulator as current code does; restart only after RAM/start guards and circuit policy allow |
| `PARENT_SAFETY_ERROR` | Parent emits `safety_stop` with another explicit reason | Bounded retry by failure fingerprint; preserve error evidence |
| `ABRUPT_PARENT_TERMINATION_UNPROVEN_CAUSE` | Supervisor verifies dead owner PID and stable stale lock; no preceding parent terminal event | Preserve logs, recover lock conservatively, bounded restart; do not label cause without evidence |
| `PARENT_STARTUP_NOT_OWNED` | Launched PID fails bounded ownership/status verification | Treat as startup failure, apply restart backoff/circuit |
| `ROUTE_NO_RESULT_COOLDOWN` | Route gate reports unproductive visits and future `eligibleAt` | Keep parent alive and idle/continue other eligible routes; do not restart parent |

## Current state at audit time

The latest emulator driver is stopped by the low-memory guard, not by the child lifecycle noise. `physical-windows-status.json` reports PID `20652`, `active:false`, `stage:"STOPPED_LOW_MEMORY"`, and reason `emulator_low_memory_prioritize_physical:free=1.47GiB`. No emulator driver ownership lock is present. The emulator runner remains at 59 decided cases: 56 FAIL, 3 PASS, and 2021 NOT_RUN.

No conclusion in this audit upgrades a formal case to PASS/FAIL/SKIP. The purpose is to make parent lifecycle, child observer lifecycle, and zero-yield cooldown behavior distinguishable so the emulator lane can resume only when the existing safety guards permit it.
