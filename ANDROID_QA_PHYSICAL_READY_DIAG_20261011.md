# Physical approved-recipe readiness audit — 2026-10-11

Read-only audit of the existing Android QA artifacts; no device/process/runner interactions.

## Observed counts

- `node scripts/android-qa-recipe-queue.mjs next-approved 2080`: `approved=212`, `approvedPreviouslyCompleted=212`, `eligibleNotRun=0`, `selectedCount=0`, `groups=[]` (official run ID `android-20261009084154-recovered`).
- `node scripts/android-qa-recipe-queue.mjs list`, grouped by `screen`: `profit_sim.html=82` approved recipes; `settings.html=52` approved recipes. Together 134/212 approved, and **zero ready pending approved IDs** on either screen. The other 78 approved recipes are on other screens and also have no official `NOT_RUN` status.
- `.android-qa-autopilot/physical-windows-status.json` is a historic snapshot (modified 2026-10-11 04:34 UTC) reporting `active=true`, `currentPage=account.html`, and 1020 executed. This file is not proof the driver is presently alive or that a route was visited after its timestamp.
- Official runner file includes historical `deviceProbe` for `RMX3938`, Android 16, package `com.izakanpai.commissionpos.uitest`, but **live installed build identity cannot be proven from stored runner metadata**. No ADB/device query performed under the read-only constraint.

## Exact reason no batch event is emitted

In `scripts/android-qa-windows-driver.mjs` around 2632-2640, `broad_sweep_approved_recipe_batch` fires only when an already navigated physical route has at least one approved recipe satisfying all of: screen matches route page; kind is `safe-select` or `focus-input`; current **official** case status is `NOT_RUN`; and `isReady(item)` passes retry policy. With no official `NOT_RUN` approved recipes, this array is empty regardless of retry cooldown or installed build. The event is deliberately omitted for zero entries.

There is a second protective gate: `planPhysicalActionableRoutes` in `scripts/android-qa-physical-actionability.mjs` requires **both official and staged** statuses `NOT_RUN` for approved recipe eligibility, plus a supported read-only handler or assessor to retain the route. Watch mode adds route cooldown (`routeYieldDescriptor` and `yieldGate`) before navigation. Neither can convert completed approved recipes back to pending.

The installed build is **not the cause demonstrated by this evidence**: even a perfect matching current build would yield zero batch events while the formal statuses remain completed. Retry-policy readiness (`retryEligible`) is likewise irrelevant until an approved official `NOT_RUN` case exists. Existing `NOT_RUN` cases in the two pages may still be investigated through separately implemented physical operation/read-only assessors; they do not automatically become approved recipe cases.

## Next action for prime

Preserve all completed statuses and evidence. Identify *new* eligible formal `NOT_RUN` control cases with approved, manifest-pinned, no-write handlers; review and approve their recipes. Then reassess staged status, per-case cooldown, route cooldown, live app build identity and route reachability. Do not reset previously completed recipes to force a batch event.
