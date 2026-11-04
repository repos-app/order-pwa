# Windows QA 11 tasks: scheduling recovery and source review (2026-10-25 PHT)

Scope: existing `ChatOnSteroids-QA-*` Windows Task Scheduler registrations, the
shared finite-task child watcher, approved formal queue and source dispatch
handoff. This document records **source review only**. These 20 inspections
are neither device executions nor formal QA PASS. No commit, push, deploy,
official runner verdict mutation, or direct official ledger edit was made.

## Actual scheduler and formal evidence

- At initial inspection all **11 existing QA tasks** were Disabled. The active
  user stop marker `.qa-v2-official/qa-execution-paused-by-user.json` was absent.
  Registration verification checked all 11 concrete task names, actions,
  arguments, and `MultipleInstances=IgnoreNew`; no new task was registered.
- `scripts/qa-autonomy/resume-scheduled-qa.ps1 -Apply` enabled **11 / 11**;
  immediate independent `Get-ScheduledTask` readback: **Ready 11 / Disabled 0**.
  The script is also safe to run without `-Apply` as a read-only audit.
- At 14:33:35 PHT `Start-ScheduledTask ChatOnSteroids-QA-Formal-Queue` was
  accepted and completed, `LastTaskResult=2`. The actual supervisor record at
  `2026-10-25T06:33:47.081Z` was `NO_USER_AUTHORIZED_CASE_READY` with **76**
  deferred direct-physical cases, **0** executable pending. The Android
  official state retained `updatedAt=2026-10-24T10:52:26.004Z` and counts
  **PASS 383 / FAIL 62 / BLOCKED 5 / SKIP 5 / NOT_RUN 376 / RUNNING 0**.
  Hence this restart created **zero confirmed formal verdicts**.
- At 14:33:35 PHT `Start-ScheduledTask ChatOnSteroids-QA-Source-driver` was
  also accepted and completed. Source stdout had `COS_DELIVERY_BACKLOG`,
  three queued inputs, `COS_DELIVERY_STALLED`, but earlier Task Scheduler
  displayed success (`0`). The independent `scheduled-qa-outcome.mjs` now
  reads only fresh per-source-lane status. At **14:36:25 PHT**, manually waking
  the existing Source-evidence task proved the correction end-to-end:
  `cause=SOURCE_COS_DELIVERY_BACKLOG`, `childExit=0`,
  `effectiveExitCode=2`, **Task Scheduler LastTaskResult=2**. No CoS actual
  browser delivery or completed AI turn was inferred from queue acceptance.
  The reporter also retains the fresh reason (`COS_DELIVERY_STALLED`) and
  queued-input count (3) for transport diagnosis without resending inputs.

## S01-S10: 10 independent self-review viewpoints

Each check used source paths/functions and a different failure boundary.
`Verified` below means the code/path was inspected, not a formal QA verdict.

| ID | Scope / source checked | Independent observation and disposition |
|---|---|---|
| S01 | `resume-scheduled-qa.ps1` registered names | Enumerates the 11 explicit pre-existing task names and fails when actual task count or an exact name differs; verified live dry run against Task Scheduler. |
| S02 | `resume-scheduled-qa.ps1` launcher/arguments | Compares real `wscript.exe`, launcher path and per-lane command argument including quoted/unquoted source forms; rejects unexpected command owner. |
| S03 | `resume-scheduled-qa.ps1` transactional activation | `-Apply` required for changes, active stop checked before and during, and any partially enabled subset is rolled back on failure; successful 11/11 readback. |
| S04 | `hidden-task-launcher.vbs` mapping | Inspected each of 11 mode-to-script branches and ensured the nine finite modes reuse one bounded supervisor; continuity observer and dashboard retain their original lifecycle. |
| S05 | `start-scheduled-qa-supervised.ps1` process lifetime | Five-minute no-progress watchdog observes actual child output and formal event files; `taskkill /PID <child> /T /F` is scoped to the launched child rather than all QA processes. |
| S06 | `start-scheduled-qa-supervised.ps1` stop behavior | Checks active user pause before spawn, again immediately before spawn, and every two seconds while running; reports user stop as exit3. |
| S07 | `start-scheduled-qa-supervised.ps1` task result transfer | Preserves child exit and independently verified semantic result; existing reporter’s `effectiveExitCode` is forwarded to Task Scheduler, demonstrated using real Source-evidence exit2. |
| S08 | `scheduled-qa-outcome.mjs` evidence freshness | Source backlog can override child exit0 only when that specific lane's journal timestamp overlaps the current run; stale/missing journal exits2 instead of borrowing another run. |
| S09 | `scheduled-qa-outcome.mjs` recovery bound | Fingerprint excludes unverified time/heartbeat, caps identical automated task wakes, and records scheduler acknowledgment instead of assuming delivery success. |
| S10 | `start-formal-queue.ps1` and `formal-queue-supervisor.mjs` entry guards | Independent top-of-command stop checks prevent recovery or queue preparation during pause; normal physical plan still requires actual official claims and evidence through its existing runner. |

## H01-H10: 10 independent horizontal source-review viewpoints

| ID | Related code / comparison surface | Inspected boundary, result and remaining condition |
|---|---|---|
| H01 | `onboarding-running-reconciliation.mjs` | Existing Realme RUNNING recovery re-reads exact claim identity and user stop both before and after quiesce, and verifies official INTERRUPTED status; no global claim reset introduced. |
| H02 | `onboarding-matrix-autopilot.mjs` | Independent onboarding cases are assessed separately and continue after a deferred/failing case; physical success requires real official status and screenshot plus structured evidence. |
| H03 | `start-readiness.ps1` | Runtime activation is sourced in each process and partial repair failures are preserved; the reused source lane receives adapter blockers without inventing a second global orchestrator. |
| H04 | `start-runtime-diagnostics.ps1` | Existing diagnostics trigger root-cause and self-healing components in a separate owner; failure of one is reported without crossing into formal ledger writes. |
| H05 | `start-source-lane.ps1` | Existing source driver/data/evidence/pairs dispatch shares `source-lane-dispatcher.mjs`; the generic per-lane status is independently recorded and used to correct misleading Task Scheduler exit0. |
| H06 | `source-lane-dispatcher.mjs` | Queued CoS inputs remain pending when browser delivery fails; the real three-item backlog prevents duplicate submits and is not counted as a completed chat. This external delivery blocker remains. |
| H07 | `qa-cos-browser-target-recovery.mjs` | Existing one-target wake tries to reopen the exact queued chat, with daily limit and no duplicate POST; target-open request does not establish actual browser delivery. |
| H08 | `start-15-work-validation.ps1` | Independent read-only five-job audit checks produced snapshot freshness and iOS contract counts; failure remains nonzero and cannot promote official QA. |
| H09 | `start-qa-dashboard-logon.ps1` | Existing localhost dashboard validates actual listener ownership, API shape and snapshot freshness; it never terminates an unrelated owner on the same port. |
| H10 | `scheduled-qa-outcome.mjs` ↔ formal official state | Official PASS/FAIL deltas require same-run canonical ledger before/after; recovery wake, Source offline tests, and a fresh Windows task run are explicitly distinct from a formal verdict. |

## Concrete verification and outstanding work

- `node --test scripts/qa-autonomy/start-formal-queue.test.mjs scripts/qa-autonomy/formal-queue-supervisor.test.mjs scripts/qa-autonomy/scheduled-qa-outcome.test.mjs scripts/qa-autonomy/scheduled-task-safety.test.mjs`: **50/50 passed**.
- `node --check` on the two edited `.mjs` modules: exit0. PowerShell AST
  parsing of entry, supervisor and restore scripts: no errors. `git diff --check`:
  exit0. No end-to-end five-minute *timeout* simulation was run; test covers
  configuration/behavior and live Source-evidence recording.
- Still blocked: **76** direct-physical candidates need real claim-scoped
  adapters; **three** CoS inputs are waiting for actual browser delivery. The
  scheduler has resumed; this does not constitute source repair completion or
  a new formal QA verdict. Follow the existing source owner and CoS transport
  recovery with independent proof; do not resend ambiguous inputs.
