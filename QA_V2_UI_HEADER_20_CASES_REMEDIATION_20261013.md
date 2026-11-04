# QA V2 Android header remediation — 2026-10-13

Per-case 10 + 10 audit matrix: [QA_V2_UI_20_CASE_REVIEW_MATRIX_20261013.md](QA_V2_UI_20_CASE_REVIEW_MATRIX_20261013.md). It reports source observations separately from device pending checks; none of its 20 case entries claims full rendered QA acceptance.

Scope: QA2-NEW-VIS-001 and 19 named QA2-UI cases. Official QA state remains FAIL pending newly built APK and native physical QA. Supported minimum is **720 physical pixels**, at 320dpi approximately **360 CSS pixels**. A 600-physical-pixel-only failure is not acceptance evidence.

## Root cause and remediation

The shared header forces `flex-wrap:nowrap` and `white-space:nowrap;overflow:hidden;text-overflow:ellipsis` on titles and nested headings. Width reserved for account details, local buttons and page-specific controls can consume the title region even on supported native devices. Added narrow-CSS-viewport overrides to **mobile-app/web/header.js**, **docs/yuwaku/header.js**, **docs/yuwaku/test/header.js**: header elements may wrap, full titles and nested titles can wrap rather than ellipsize, actions keep their own flex allocation, and extra controls/account metadata flow below when necessary. Existing 44px coarse-touch button rules remain. Native fixed-header spacer is ResizeObserver-updated; Web headers are sticky. Existing authentication, language switching, navigation, print/notification actions and IME correction were left intact. Web production and Web TEST remain byte-identical.

## Case-by-case status

| Case | Prior evidence / current scope | Source fix | Physical retest |
| --- | --- | --- | --- |
| QA2-NEW-VIS-001 | 720px order-management + order-entry titles clipped on physical 910017 | Shared title layout applied | Pending |
| QA2-UI-birthdays | 720px birthday coupon title clipped; table columns separately reported | Header applied; table behavior unresolved | Pending |
| QA2-UI-coupons | Physical 910015 coupon page FAIL; precise form evidence requires reinspection | Header applied to common control; other failures unverified | Pending |
| QA2-UI-data_admin | 720px backup/administration title clipped, 910017 | Header applied | Pending |
| QA2-UI-expenses | Physical 910015 expenses form/list FAIL; page-specific issues unverified | Header applied | Pending |
| QA2-UI-inventory | 720px inventory title clipped, 910017 | Header applied | Pending |
| QA2-UI-kds | Physical 910017 kitchen title collision with printer/bell | Header/extra wrap applied | Pending |
| QA2-UI-members | Physical 910015 member form FAIL; unverified other controls | Header applied; form issues unresolved | Pending |
| QA2-UI-moves | 720px movement-history title clipped, 910017 | Header applied | Pending |
| QA2-UI-order-entry | 910017 seat-modal overflow observed at **600px only**; separate 720px title failure is covered by NEW-VIS-001 | Header applied; 600px modal not a supported acceptance target | Pending 720px title |
| QA2-UI-printers | 720px printer title and account chip clipped, 910017 | Header applied; narrow account wrap applied | Pending |
| QA2-UI-profit | Physical 910015 gross-profit screen FAIL; detailed table/field concerns unverified | Header applied | Pending |
| QA2-UI-profit_sim | Physical 720px JA/EN operating profit simulation title clipped | Header applied | Pending |
| QA2-UI-receipts | Physical 910015 receipts screen FAIL; other issues unverified | Header applied | Pending |
| QA2-UI-recipe | Physical 910015 recipe/cost screen FAIL; other issues unverified | Header applied | Pending |
| QA2-UI-reservations | 720px EN title clipped; customer name column also clipped | Header applied; table truncation remains for dedicated re-evaluation | Pending |
| QA2-UI-sales | 910015 title clipped only when shrunk to **600px**; 720px Sales was visible | No additional supported-width fix proved necessary; shared header enhancement applied | Pending other checks |
| QA2-UI-todo | 720px Todo title clipped; assignee selector also affected | Header applied; selector remains for dedicated re-evaluation | Pending |
| QA2-UI-users | 720px user-admin title/account clipped, 910017 | Header applied | Pending |
| QA2-UI-audit | Physical 720px English Audit log title clipped, third table column clipped | Header applied; table overflow remains for dedicated re-evaluation | Pending |

The source fix is a **candidate** common-header fix, not a claim that every historical case is resolved; no APK was built/installed and no physical rerun occurred in this worker.

## Validation and traceable checks

- `node --check` on each of three header.js surfaces: PASS (3/3).
- `node --test test/header_component_test.mjs`: PASS (44/44; existing tests contain legacy ellipsis assertions which inspect the original CSS and do not constitute 720px visual acceptance).
- `node --test test/qa2_ui_header_720_regression_test.mjs`: PASS (4/4); checks minimum-width media rule, nested title wrapping, action allocation, extra/meta wrapping, native spacer, Web sticky handling, 44px hit areas and mirror equality. This tests source contracts, **not rendered layout dimensions**.
- `git diff --check -- mobile-app/web/header.js docs/yuwaku/header.js docs/yuwaku/test/header.js`: PASS.

Review axes checked for the common fix: (self) 1) media cutoff, 2) physical/CSS density conversion, 3) nested h1 title, 4) action flex reservation, 5) extra controls wrapping, 6) metadata wrapping, 7) 44px hit area, 8) native fixed offset, 9) Web sticky positioning, 10) syntax/tests; (horizontal) 1) Native, 2) Web production, 3) Web TEST, 4) Japanese title, 5) English title, 6) signed-in user, 7) page-specific actions, 8) back/refresh/language buttons, 9) dynamic header height, 10) orientation-width media. These are **common-component inspection axes**, not proof of 10 independent rendered inspections per case. No per-case 10×self / 10×horizontal completion can be certified without supported-width device executions and evidence.

## Remaining acceptance checks

Run fresh APK at Realme physical native 720x1600 320dpi, authenticated role(s), JA and EN, each listed page; confirm title fully visible, no buttons overlapping or disappearing, each control at least 44 CSS px, no content hidden beneath the expanded fixed header, and page-specific tables scroll horizontally with discoverable access or reflow to show all cells. Repeat at larger standard size and rotate to landscape. Record screenshots and DOM/view geometry when available. In particular prioritize KDS printer/sound, order-entry store label and seat modal at supported width, long English profit-simulator, audit/reservation/birthday tables and TODO assignee selector. Preserve all official FAIL results until this evidence passes.

No commit, push, deploy, official QA edits, backend or package updates performed.

## Follow-up: supported-width page details (same day)

The following are scoped **source remediations** at <=430 CSS px, covering 720 native physical pixels / 320dpi. None has a new physical screenshot and all require device verification:

| Case | Additional file | Targeted behavior and substantive review |
| --- | --- | --- |
| audit | mobile-app/web/audit.html | Both pre-existing horizontal table containers remain scrollable; third column has minimum 72px and may wrap long table values. Verify a physical swipe reveals fourth through seventh columns, with no control overlay. |
| birthdays | mobile-app/web/birthdays.html | Table retains 520px intrinsic width with horizontal touch scrolling; birthday third column gets 80px minimum and wrap support. Verify scroll affordance and issue-coupon button accessibility. |
| reservations | mobile-app/web/reservations.html | Long customer names wrap in third column; URL input becomes its own row within the card and may be tapped to select/copy. Verify URL retains full `store=` query value via select/copy and link opening, not visual input width alone. |
| todo | mobile-app/web/todo.html | Assignee and date selection fields stack full-width rather than squeeze two 50%-width fields on 360px CSS screens. Verify dropdown labels in JA/EN, date picker and submission button. |
| receipts | mobile-app/web/receipts.html | OR numbers and refund target wrap; action column gains minimum width, refund dialog inputs use border-box. Verify long receipt item details, linked refund ID, text visibility and refund approval controls. |
| inventory | mobile-app/web/inventory.html | Stock history/action cells allow wrapped 44px buttons, 164px minimum and independently scrolling stock table. Verify action buttons do not overlap after swiping right, including history link. |
| moves | mobile-app/web/moves.html | Legacy page header back actions wrap instead of exiting right viewport; common header continues to collect and hide redundant legacy actions. Verify actual common-back button and scrollable history. |
| recipe | mobile-app/web/recipe.html | Ingredient heading wraps while table remains horizontally scrollable; ingredient selects keep 44px minimum height. Verify long product/ingredient labels remain readable when focused/opened. |

Inspect each acceptance with JA/EN, account chip present, initial viewport and horizontal-scroll end at native 720x1600/320dpi. Explicitly unsupported 600 physical pixel-only historical failures: QA2-UI-order-entry seat modal overflow and QA2-UI-sales title collapse. Both need supported-width retest before deciding a case disposition. The follow-up CSS cannot repair a truncated native select-option popup when the platform renders its options outside the DOM; exercise the actual dropdown.

Review evidence available so far is inspection of CSS constraints and actual DOM structures, previous QA descriptions, native/Web common header test suite, and the whitespace diff check. No 10×10 per-case review evidence and no visual rendering PASS is asserted. Other page-specific issues beyond these scoped adjustments remain possible.
