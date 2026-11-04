# QA2-UI-todo / 360 CSS px assignee visibility — 2026-10-17

Formal original: `.qa-v2-official/android/state.json` QA2-UI-todo `FAIL`, Android Emulator QA APK910017, screenshot `test-results/qa-v2-evidence/QA2-UI-todo-910017-720.png` SHA256 `8741fcd7448d42065f51971cac86d4bb9c2d071ef8cd47ffc774ef13135f6539`; original observation: selected unassigned/shared option truncated. Device resolution was 720 physical px with 320 dpi; browser emulation therefore uses **360 CSS px + DPR2** as representative geometry, not 720 CSS px and not proof of physical QA.

Current Native `mobile-app/web/todo.html` already contained a one-column responsive grid: Chromium `#newAssignee` width **294 px**, original Japanese default text measured **128 px**, English **144.24 px**, estimated available 250 px; both visible. Before changes, two hosted mirrors still rendered a narrow `.row` with `flex:2/1/1`: `#newAssignee` **120 px**, available 76 px, Japanese required 120 px and English 135.23 px. `node test/qa2_ui_todo_360_geometry_test.mjs` **exit1** on hosted production. Repair migrated hosted production/TEST form markup to existing Native `.todo-form` grid and mirrored its styling; changed only this Todo form's layout and additional select-name presentation. No task RPC/persistence behavior changed.

Post-change real headless Chrome at 360×800 CSS, DPR2: three environments each `#newAssignee` 294 px (`left=33,right=327`), `documentElement.scrollWidth=360`, default JA/EN option fully legible. Very long Japanese 304px and English 374px names exceed the native closed-select available 250px; a read-only `#newAssigneeFull` below it now echoes selected `option.textContent` exactly and wraps via `overflow-wrap:anywhere`. Actual selected option `change` event was dispatched in Chromium, app's `syncTodoAssigneeLabel()` executed, resulting text equality asserted for each of 4 JA/EN/default/long combinations across all 3 distributions. `node test/qa2_ui_todo_360_geometry_test.mjs` **exit0**, `git diff --check -- mobile-app/web/todo.html docs/yuwaku/todo.html docs/yuwaku/test/todo.html` **exit0** (hosted files have existing CRLF conversion warnings). Formal FAIL unmodified; signed APK Playwright real-device verdict pending.

## Independent code self-review S01–S10

| ID | Actual inspection / result |
|---|---|
| S01 | Original QA state shows selected-value clipping at 720 physical/320dpi, not a 720 CSS contract; regression uses 360 CSS/DPR2. |
| S02 | Before Chrome: hosted form `row` flex shrank assignee to exactly 120; available 76 against Japanese label width 120; test exited 1. |
| S03 | Compared Native `.todo-form` to hosted markup; current Native measured 294 and both standard languages fit; reused this working structure. |
| S04 | After Chrome: hosted production `#newAssignee` measured 294, x33..327, no document overflow. |
| S05 | After Chrome: hosted TEST independently measured 294, x33..327, no document overflow. |
| S06 | Measured JA `未定・共有タスク` in actual Chrome canvas font: 128/250 available, passed on all three pages. |
| S07 | Measured EN `Unassigned / shared`: 144.24/250 available, passed on all three pages. |
| S08 | Deliberately long Japanese 304/250 and English 374/250 would be clipped in select; exact full text exposed in adjacent wrapable field after actual selection change. |
| S09 | Confirmed `syncTodoAssigneeLabel()` is called after `renderAssigneeOptions()` and reset-on-success, with no network request. |
| S10 | Chrome 12 selected-value cases and `git diff --check` exit0; existing unrelated dirty task-card word wrapping retained. |

## Independent horizontal source review H01–H10

| ID | Scope / evidence and outstanding checks |
|---|---|
| H01 | Native Todo HTML asset: 360 CSS geometry meets default-language display and 44px selector minimum (294px wide). |
| H02 | Hosted Web production Todo now uses identical responsive grid and long-label mirroring. |
| H03 | Hosted Web TEST Todo independently passes same real Chrome suite. |
| H04 | Native Japanese `I18n.t('unassignedOpt')` supplies expected value; checked source string and rendered fixture text. |
| H05 | Native English dictionary contains `Unassigned / shared`; checked exact text and measured. |
| H06 | Custom long JA selection read-only caption uses `textContent`, preventing HTML execution; Chrome fired `change` event. |
| H07 | Custom long EN selection analog verified; `overflow-wrap:anywhere` protects horizontal width. |
| H08 | Form save still reads `$('newAssignee').value`, untouched; helper reads selected option only. No task write in test. |
| H09 | Existing due date remains separate `.due-field`; grid applies full-width columns at <=430 CSS px, date picker code unchanged. Date-picker native overlay E2E pending. |
| H10 | Historical QA 910017 and pending signed APK remain separate; common header title fix IZK-UT-078 is unrelated to selected value and is not retested here. |

Limits: Headless Chromium metrics represent a local DOM/font model. They establish before/after geometry and selection behavior, not real Android device or native system dropdown popup screenshots. Very long values may be clipped in the collapsed native select; the adjacent selection caption displays them in full. Actual signed APK and formal physical QA verdict remain pending.
