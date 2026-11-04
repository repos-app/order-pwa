# iOS Stage 10 source progression: ATT-001 / 009 / 011 (2026-10-24 PHT)

## Decision on requested foreign-ID navigation

`ADM-026`/`ADM-027` cannot be executed by HID on the existing native `mobile-app/web/admin.html`. `render()` constructs `askVoid(id)` buttons solely from `orders` returned for the logged-in local store, and `askVoid()` explicitly returns when that ID is absent from `orders` (lines 373–448). `renderCalls()` similarly constructs `resolveCall(id)` buttons solely from local `calls` (lines 411–434). Neither UI has an input or independently observed navigation route for the manifest's approved `yuwaku` foreign IDs. Direct backend RPC injection is **not** a valid native HID substitute; both remain **NOT_REGISTERED**, reasons `FOREIGN_ORDER_ID_NOT_NAVIGABLE_IN_STOCK_IOS_ADMIN` and `FOREIGN_CALL_ID_NOT_NAVIGABLE_IN_STOCK_IOS_ADMIN`. The remaining source dispatcher skips these two until an independently reviewed native route actually exists.

## Next reusable family

Actual next manifest cases selected were `QA2-KEEP-OPR-ATT-001`, `002`, `003`, `009`, `011`. The existing `ios-attendance-family.mjs` provides exact 831-case manifest checkpoints, real callable HID-plan factory, independently injectable screenshot/business Oracle, QA-owned cleanup and formal claimed bridge. `mobile-app/web/clock.html` has real authenticated own-staff tile and punch control (`canOperate`, `__open`, `__punch`), and view-only unauthorized employee/admin tiles; authenticated cross-employee/admin denial must still be confirmed by separate API trace. No invented screens or click targets.

The common `ios-attendance-claim-d1.mjs` uses the approved `teat` D1 config and read-only Wrangler remote SELECTs for provisioning marker/DB UUID, store timezone, exact enrolled staff, and original attendance rows for that **store-local day**. Status is derived from actual persisted kinds; attendance ID, exact `client_request_id`, private photo ID, GPS, ordering and duplicate constraints are preserved. Official iOS claim is revalidated around every DB query; no D1 writes occur. It requires a separately sourced fixture ownership reader providing exact case, fixture, employee, claim, DB identity, phase, provenance SHA and foreign-store-isolation attestations. No callback, mismatched identity or unowned data means **fail closed**, not a guessed valid fixture. SHA format validation does not by itself authenticate the callback or cryptographically verify its evidence; the actual provider must be independently authenticated in a claimed run. A test-only mock of these readers never proves actual Cloudflare production/QA rows.

| Case | Registered source? | Why |
| --- | --- | --- |
| `ATT-001` | **Yes** | Current stock self clock-in HID; actual D1 row, camera/GPS and `client_request_id` check contract |
| `ATT-009` | **Yes** | Existing view-only other-staff tile; separate authenticated cross-employee denial and unchanged D1 required |
| `ATT-011` | **Yes** | Existing view-only admin tile; separate authenticated admin self-punch denial and unchanged D1 required |
| `ATT-002` | **No** | Two taps within 500 ms require an independently timed atomic HID burst that the per-gesture claimed bridge has not supplied |
| `ATT-003` | **No** | Actual response lost *after* dispatch and manual retry using original idempotency ID need a real network/controller trace; none bound |

`ATT-012/013/014/015/016` in the next candidate family already have a separate source-only `ios-attendance-break-family.mjs`. In particular `ATT-013` explicitly rejects the physical runner until an atomic 500ms HID burst exists. This continuation did **not** register them or imply their before/after business-day lifecycle is already bound to a trusted reader.

## Independently reconciled counters

- Original 831-case Manifest: iOS applicable 830; unfinished formal iOS 813.
- **`sourceAdaptersPrepared: 13 -> 16`, `sourceAdaptersRemaining: 800 -> 797`.** These are source-only callable functions, not formally executable iOS cases.
- Actual dashboard `makeReadOnlySnapshot()` reports `sourceReady=16`, `sourceRemaining=797`, **full Stage10 done=0/813**, `physical=0`, integrity `CURRENT_OFFICIAL_SCOPE`; physical scenario and runtime oracle/cleanup remain unverified in all 813 pending cases.
- Original `.qa-v2-official/ios/state.json` SHA-256 before/after:
  `CD9F913B748A5CFC734C3CCBEF4FA482689EADB6047FC829F5AB7A17DC5D3BFC`; official verdict changes 0, claims created by audit 0.
- Offline Node source/audit/selector/dashboard tests: **49 PASS, 0 FAIL, exit 0**. The 20 dedicated attendance adapter+family tests exercise real 831 Manifest identities, independent reader shape, scoped SELECTs, missing claim, unsupported timezone, tampered fixture identity, foreign D1 rows, duplicated punch IDs, authenticated negative requirements and no formal verdict. The other 29 verify separate Stage10 source, selector and dashboard invariants.
- Real Windows audit integration, including PowerShell 5.1 launch, parallel sidecar replacement, nonzero failure propagation and formal-ledger guard: **7 PASS, 0 FAIL, exit 0**.
- Actual Windows `Start-ScheduledTask -TaskName ChatOnSteroids-QA-Source-ios` invoked once in this turn, task last run **2026-10-24 19:43:39 PHT**, `LastTaskResult=0`, next 19:59 PHT. Last dispatcher state: `COS_DELIVERY_BACKLOG` / `QUEUED_INPUTS_NOT_DELIVERED` (8 queued) at `2026-10-24T11:43:40.408Z`. This **does not** prove a new Chat On Steroids worker delivery or iPhone QA.

## Ten source self-review checks

1. **S01 Manifest:** direct immutable checkpoint and legacy assert checks via `verifyIosAttendanceManifest` for three exact iOS 831-case IDs; PASS source.
2. **S02 Screen path:** verified native `clock.html` staff-only `__open`, `__punch` and admin/foreign tile view-only gate; PASS source.
3. **S03 HID accuracy:** plan requires current real iPhone build, screen bounds and independently observed target rectangles, rejects guessed positions; PASS source, physical unverified.
4. **S04 Auth:** official RUNNING claim must match exact iOS serial, owner and ID before each SELECT, with immediate revocation rejection; PASS offline.
5. **S05 Tenant:** dedicated `teat` config UUID must equal D1 provisioning marker and every read row must belong to that store; PASS offline, remote not executed.
6. **S06 Clock date:** obtains store timezone from `stores`, derives store-local today's attendance with SQLite `datetime` offset; unsupported timezone rejected; PASS offline.
7. **S07 Staff isolation:** exact enrolled own employee and (for 009) distinct second employee required; missing/foreign staff or rows rejected; PASS offline.
8. **S08 Real business provenance:** row IDs, original `client_request_id`, photo ID and GPS are independently read, never synthesized; negative duplicate/foreign row tests PASS.
9. **S09 Fixture trust:** signed/provenance-bound independent ownership callback required; missing or fake callback fails. This is an interface only: actual third-channel provider physical binding PENDING.
10. **S10 No promotion:** tests and actual sidecar confirm source 16, full Stage10 0, formal state SHA unmodified, `git diff --check` exit0; PASS.

## Ten horizontal reviews (different source entry points)

1. **X01 Android attendance source:** `src/attendance.js` current status transition semantics compared to D1 status reducer, same punch kind mapping; source review PASS.
2. **X02 Idempotency schema:** `migrations/0034_attendance_idempotency.sql` original `client_request_id` column and unique `(store_id,client_request_id)` verified; PASS.
3. **X03 QA D1 config:** `test/qa-d1/wrangler-ui15-teat.toml` isolated QA DB and tenant write fence preserved; PASS source.
4. **X04 Existing claim-bound void D1:** reused exact claimed guard, marker and separate read-only SQL policy pattern without copying iPhone physical result; PASS.
5. **X05 Clock native UI:** current `mobile-app/web/clock.html` capture/getGPS and original ID dispatch verified, runtime camera/GPS remain PENDING.
6. **X06 Independent attendance event:** original `checkIosAttendanceEffect` demands independent trace for punch/negative API, now receives actual D1-shaped rows, physical trace still PENDING.
7. **X07 Cleanup:** original `cleanupIosAttendanceFixture` preserves audit and requires independent post-cleanup fixture read; no cleanup performed in this source turn; PASS source.
8. **X08 Unsupported rapid/loss:** source selector keeps 002/003 pending with explicit controller gaps instead of turning source READY; PASS.
9. **X09 Admin cross-tenant test:** `admin.html` local-only foreign IDs stay missing and excluded; regression of 026/027 source blockers PASS.
10. **X10 Windows/dashboard coupling:** Source-ios task execution result reconciled with undelivered COS queue and actual independent Stage10 E2E=0 dashboard; no fake completion; PASS audit, delivery BLOCKED.

No Android official runner, `root-cause-director`, iPhone/ADB, remote D1, Apple TestFlight, live tenant data, official QA ledger, commit/push or deployment was modified by this work. Product release readiness remains unchanged. Live external fixture ownership, authenticated negative request traces, current HID frames and verified cleanup are **still required** to promote any source case to real Stage10 E2E.
