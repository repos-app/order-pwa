# izakanpai QA — user-approved yuwaku remote D1 + real Android Emulator verdict

Date: 2026-10-11, Philippines time. User explicitly authorized testing,
updating and deleting test data in the **yuwaku** tenant's production D1.
No passwords, auth tokens or cookies are recorded in these QA scripts/evidence.

## Confirmed remote yuwaku CRUD test

- Used the already authenticated Cloudflare Wrangler account and exact
  `.tenant-provisioner-production-yuwaku.toml` configuration.
- Verified `DB=izakanpai-yuwaku` (database ID
  `b0aa5df0-1022-4013-91f6-51126331830b`), `TENANT_ID=yuwaku`,
  `TENANT_WRITE_FENCE_REQUIRED=1` and `AUTH_ENVIRONMENT=production`.
- `node scripts/android-qa-yuwaku-remote-d1-crud.mjs --execute` returned
  `status:PASS`: exactly one **uniquely marked** yuwaku expense inserted,
  read, updated, independently read, wrong-tenant update `RETURNING` zero,
  deleted and verified absent. Original expense count was **3**, final count
  **3**. Follow-up query `WHERE store_id='yuwaku' AND expense_id LIKE
  'android_qa_yuwaku_%'` returned **0**. SQL mutations used exact yuwaku
  ID and unique expense_id, never bulk deletion or any other tenant.
- `rows_written=4` at insert included triggers; the assertion correctly
  evaluates exactly **one returned targeted expense_id**, not trigger count.
- This is a backend fixture verification, **not a formal Android QA PASS**.

## New real Android QA PASS

- `OPR-REC-009` — native Android 16 Emulator
  `emulator-5554`, QA APK 910015: **PASS**.
- The independent native runner verified an authenticated management Hub
  with **seven visible tiles**, then used real Android `KEYCODE_SLEEP`,
  observed `mWakefulness=Asleep` continuously for **over 60 seconds**,
  woke using `KEYCODE_WAKEUP`, checked Awake / unlocked, and independently
  verified foreground app and the same authenticated Hub/WebView/tiles.
- Exact evidence file:
  `.android-qa-emulator/qa-screen-wake-20261011062412.json`.
- The case was written with `updateRunnerState` under the runner write lock,
  preserving all previous PASS/FAIL; the protected Emulator state increased
  to **PASS 4, FAIL 56, NOT_RUN 2,020** (60 terminal results).
- Following the exclusive device handoff, the Emulator parent was restored
  as **PID 13176**, dedicated supervisor **PID 10560**, and the 5-minute
  continuity task re-enabled. App, screen and radio state restored. The
  separate physical QA driver was not operated.
- Official runner at the last read had **PASS 427, FAIL 220,
  BLOCKED 288, SKIP 100, NOT_RUN 1,045**; results from other physical
  QA work are included, so do not ascribe all increments to this turn.

## Honest inconclusive native cases

- `OPR-OPEN-008/-009` actually exercised Emulator airplane mode, Wi-Fi/data
  disable, cold app start, and network recovery. Both remained **NOT_PROVEN**:
  the app restored its cached authenticated Hub while offline, rather than
  showing the explicit loading-view retry element required by the current
  conservative proof gate. It may have rendered a transient warning
  elsewhere; lack of that observation is **not** enough to call FAIL.
- Trace: `.android-qa-emulator/qa-offline-open-20261011T06154.json`.
  Android airplane mode was verified restored to `0`; Wi-Fi/data settings
  returned to `1`. The Emulator driver/supervisor were restored afterward.
- User-approved yuwaku **does not imply** the current Emulator is logged into
  yuwaku. A read-only local WebView session check proved the current
  cached workspace ID matched the previously authorized `teat`, **not**
  yuwaku. Do not mix yuwaku fixture evidence with teat Emulator UI evidence.

## Next formal QA targets

- `OPR-ORD-038` — order-entry app background/foreground x20, must show
  functional UI without stale state, require actual native events and
  repeated independent WebView checks.
- `OPR-TAKE-018` — takeout screen native display-off/on and functionality,
  requires safe authenticated in-app navigation to the correct screen.
- `OPR-ORD-031` — long menu product name; can use an explicitly marked
  menu fixture in the already-authorized QA `teat` tenant, but real native
  screen observation and no overflow/overlap proof are still required.
- `OPR-OPEN-008/-009` — retry with a more comprehensive read-only UI error
  banner observer so an offline cached Hub is not misclassified.

No commit, push, deployment or D1 migration was performed. No other
tenant's data was modified. APK 910015 was not changed in this task.
