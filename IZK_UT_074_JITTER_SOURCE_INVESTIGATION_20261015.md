# IZK-UT-074 Settings Scroll/Jitter — source-only follow-up (2026-10-15)

**Result:** one independently confirmed QA driver defect was locally corrected. **Physical app jitter root cause / formal QA PASS remain unverified**. This finding is not proof the Android APK 910017 contains new fixes. No QA state/claim/device, customer record, commit, push, deploy, or production DB changes.

## Original evidence versus current source

1. Android Realme 720x1600, APK 910017, screen recording `test-results/qa-v2-evidence/realme-screen-jitter-20261014-1620.mp4`, SHA-256 `67fae9a89afd121a86855e087a12f37f721cebda6089b6d6219bdaf85595d4ca`, shows alternating positions in Settings. **It does not establish sole cause.**
2. User removed a long discount master record; jitter visibly stopped. Current Native/Web/TEST `settings.html` already bounds list content with `min-width:0;overflow:hidden;` and `discount-rule-name` with `text-overflow:ellipsis`, preserving full DB strings. This fix is **not included in existing APK910017** until a verified new build is installed.
3. In `scripts/qa-v2-realme-native-batch-generic.mjs`, the retained 0342 driver's `findSaveButton()` was called repeatedly by `locateVisibleRealmeTarget` for observation and once just before native tap. **Previously each observation itself called `element.scrollIntoView({block:'center'})`**. A separate `scroll` callback already used an ADB `input swipe`. This mixed silent DOM scroll and explicit native swipe, risking repeated viewport jumps and invalid stored coordinates while keyboard is visible. This is a demonstrable source defect even though we cannot attribute every recorded jump to it.

## Correction and test

- Changed *only* the retained 0342 native driver's Save button **observation** to a pure `getBoundingClientRect()` + hit test, without `scrollIntoView` side effects.
- Preserved `locateVisibleRealmeTarget` ownership, the **explicit** native swipe for offscreen element, the fresh pre-tap observation, ADB coordinate guard and signed backend readback. No automatic tap of out-of-screen button.
- `node test/izk_ut_074_native_scroll_probe_test.mjs` runs actual extracted observation expression 20 times, requires zero scrolling, checks guarded native swipe path and three page CSS contracts. This is source/VM-only, **not device proof**.

## Self review: 10 concrete checks (not ten physical passes)

| # | Review | Scope/Result |
|---|---|---|
| S01 | Original APK/incident/video identity | Recorded, device proof is old APK; physical new build pending |
| S02 | Repeated probe previously had mutation | `findSaveButton` had direct `scrollIntoView`, fixed; VM negative zero-scroll witness |
| S03 | Pure probe return keeps tap coordinates | 20 VM observations keep finite x/y; PASS |
| S04 | Existing physical swipe still reachable | `locateVisibleRealmeTarget` callback contract inspected; PASS source |
| S05 | Native ownership verified before movement | `owner()` before ADB swipe unchanged; PASS source |
| S06 | Live hit/geometry re-evaluated prior to tap | `tap(await findSaveButton())` remains; PASS source |
| S07 | Out-of-screen target fails closed | `QA_RETAINED_NATIVE_COORDINATES_INVALID` remains; PASS source |
| S08 | Keyboard handling must not create repeated UI movement | Existing verified IME Back path preserved; device pending |
| S09 | Long-name layout mitigation across pages | Native/Web/TEST CSS 3-source regression PASS |
| S10 | Change isolation and diff review | Only driver probe source and test/report; physical source-build parity pending |

## Horizontal review: 10 scopes and honest boundary

| # | Direction | Current result |
|---|---|---|
| H01 | Native APK UI | New source mitigation exists; APK910017 uncorrected; device pending |
| H02 | iPhone | Same settings page CSS; no iOS jitter playback/new IPA verified |
| H03 | Web production | Long-name CSS source present; deployment pending |
| H04 | Web TEST | Long-name CSS source present; deployment pending |
| H05 | Discount editor/list | Full raw label in DOM, visual ellipsis; test source PASS |
| H06 | Backend discount names | No DB shortening in this QA driver change; backend range validation separately assigned |
| H07 | Database/persisted values | No DB writes in source test; original long record deleted by user, must not recreate automatically |
| H08 | Language/IME | JA/EN UI covered by prior 073 tests; current physical focus/IME pending |
| H09 | Other QA drivers | Several other locators still use `scrollIntoView` during observation; **not blanket modified** without device owner evidence; follow-up audit required |
| H10 | Independent reverse search/negative control | Driver ADB swipe and 20-loop zero-scroll VM tested; physical video comparison pending |

**Go/no-go:** Old official Android case `QA2-KEEP-PT-INP-0342` remains NOT_RUN; no official FAIL/PASS changes. New test build must prove no jump on a **QA-owned** 40/41-char discount, with/without IME, and physically tappable visible save, signed response/restore, before closing IZK-UT-074. Do not automatically reintroduce the previously removed long record.
