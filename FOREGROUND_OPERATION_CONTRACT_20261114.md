# Foreground processing contract (2026-11-14)

## Scope and decision

Applies to izakanpai Native (`mobile-app/web`), hosted Web (`docs/yuwaku`)
and hosted Test (`docs/yuwaku/test`). Reuse the existing `API.loading`,
`API.beginForegroundTask`, `API.runForegroundTask`, `API.post` and common mutation/navigation guard.
Do not create per-screen spinner implementations.

| Work type | UI while the client must remain alive | Release point |
|---|---|---|
| Foreground `API.post` write | Global spinner; all additional clicks, forms and navigation blocked; an uncertain write is never auto-replayed | Actual request settlement or guarded timeout |
| Foreground multi-request / direct transport | `API.runForegroundTask(name, work, {message})` and `work({update,progress})`; one spinner and one navigation lock across the whole workflow | Every client-dependent stage has completed, failed or timed out |
| Long finite work with a real denominator | `controls.progress(confirmedCount,totalCount)` after **authoritative acknowledgements**, not merely after dispatch | Same as owning foreground task |
| Background reads, polling | No blocking spinner; page-level skeleton/loading is acceptable | Not applicable |
| Durable server job (data deletion, restoration, import after staging) | Spinner only until the server confirms **job registration**; use the job status panel during server execution | Job acceptance ACK, **not** completion of server job |

`__silent` can suppress incidental error banners but **must not hide** a foreground
write's spinner. `__backgroundMutation:true` is for operations proven safe to
continue without the view, with independent persistence, retry and reconciliation.
Only reviewed legacy background print/notice actions belong in the common
background-mutation registry. `getOrCreateBridgeKey` is a write, even though
its name begins with `get`; it must not be automatically retried as a read.

## New feature gate

- Use `API.post` for standard authenticated RPCs; it already owns the global
  foreground write indicator and navigation lock.
- Use `API.runForegroundTask` for any new multi-request workflow or external
  transport that requires the client to stay open. Update its progress from
  genuine acknowledgements only. Keep the worker promise bounded and settle
  the lock in `finally`.
- For a workflow whose lifecycle is already managed by a screen (e.g. an AI
  import with resumable intermediate states), use
  `API.beginForegroundTask(name,{message,total?})` to obtain
  `{update,progress,close}`. `close` is idempotent; an old task cannot change
  or close a new overlay after `pagehide` / bfcache restoration.
- Do **not** create a second independent overlay, manually disable arbitrary
  navigation links, or leave the spinner indefinitely when the server result
  is unknown. Preserve reconciliation records and display an accurate error.
- `test/auto-ci/foreground-operation-contract.test.mjs` checks that all three
  surfaces expose the same contract and that new `fetch`/XHR call sites outside
  the reviewed transport owners are stopped by CI. It also rejects new manual
  spinner/navigation-lock implementations outside the reviewed read-only
  profit-simulation bootstrap. Inspect a newly flagged direct transport and
  wrap it or classify it explicitly before approving.

## Implemented consumers

1. Announcement center: manual diagnostic probe plus retained log re-upload;
   the spinner is above the modal. The completed count includes the signed
   confirmation probe and increments only on authenticated server ACK. Close,
   Escape, overlay dismissal, duplicate actions and navigation are blocked
   while the client still owns the send; failed/unsent log history stays local.
2. Data Admin CSV import: same spinner and lock across staging, uploading each
   chunk and server-side queue acceptance. The `n / N` value counts chunks
   acknowledged, never rows or server-side import progress. After acceptance,
   the job is server-owned and the UI becomes navigable.
3. All foreground `API.post` writes: common spinner even when `__silent` is
   used; actual background mutations and reads remain non-blocking.
4. Native AI menu import: the previous private spinner/navigation-lock pair
   was replaced with `API.beginForegroundTask`. Progress and retries still use
   the existing resumable paid workflow, without duplicating its operation.
5. Hosted Web/Test profit simulator: the read-only initial settings load keeps
   its existing spinner, but now uses the Native epoch/pagehide/bfcache contract
   so a stale response cannot overwrite the latest calculation or hide a new
   spinner. This is a read, not a blocking business mutation.
6. Automatic OS push callback registration/unregistration is classified as a
   background mutation. Its existing toggle-button state remains authoritative;
   startup delivery setup cannot freeze unrelated screens.

## Cross-screen ten-round review (local execution)

`test/auto-ci/foreground-ten-rounds.test.mjs` runs ten isolated Chromium
scenarios against the actual three API implementations:

1. Native UI spinner, acknowledged progress and navigation guard
2. Hosted Web production UI contract
3. Hosted Web test UI contract
4. Invalid and fractional progress rejected
5. Double click / Enter blocked
6. Beforeunload guarded and close idempotent
7. Failed task unlocks through `finally`
8. Nested silent write retains the owning workflow's specific message/progress
9. Stale pagehide cleanup cannot corrupt a newly restored overlay
10. Background read never produces a blocking overlay

The ten browser cases passed together with the shared source contract gate.
`test/profit_sim_lifecycle_epoch_test.mjs` now also executes stale-read and
bfcache restoration checks against the hosted production/test variants.
`test/auth_client_regression_test.mjs` includes the OS push/background case.

## Evidence boundary

The automated tests are source/Chromium/simulated transport checks, not a
physical-device or Control D1 readback. A mobile OS can terminate or suspend
the WebView despite navigation guards; device termination during a not-yet-
accepted upload is handled through retained diagnostics and retry, not claimed
to be an already-completed server-side job.
