# IZK-UT-092: Print queue local-time double shift

## Registry and cause

Checked `handoff/GPT_実機テスト障害台帳.md` and project docs for the exact ID `IZK-UT-092`; no prior match was found before registration. **The master ledger and issue-dashboard now register IZK-UT-092 with WAIT_TEST / LOCAL SOURCE FIXED**, so the provisional ID has been reconciled. Earlier `OPR-PRINT-010` covers expired lease recovery and `IZK-UT-058` covers reprint status text, not timezone conversion.

Read-only source chain: SQLite `print_queue.created_at` is UTC (`datetime('now')`). `src/printers.js:getPrintQueue` reads it, obtains `getTzOffsetHours(db,storeId)`, and returns `created: toLocalDateTimeString(r.created,off)` after `toQueueRow`: API `created` is **already local wall time**. The shared `src/settings.js:toLocalDateTimeString` explicitly interprets suffix-less SQLite as UTC. For example UTC `2026-10-17 04:05:06` with offset +08 becomes API `2026-10-17 12:05:06`. The old `DateDisplay.formatUtcDateTime(r.created)` interpreted that 12:05 again as UTC and could show 20:05. `formatDateTime` recognizes a suffix-less local datetime and formats it without converting time zones.

## Change boundary and execution

Only changed `renderQueue` in `mobile-app/web/printers.html`, `docs/yuwaku/printers.html`, `docs/yuwaku/test/printers.html`: `formatUtcDateTime(r.created)` -> `formatDateTime(r.created)`, retaining `escText` protection and fallback. Did not change the backend, other screens, DB, builds or deployment. Did not modify `test/printer_settings_persistence_test.mjs` because its original expectation is correct.

- **Before**: `node --test test/printer_settings_persistence_test.mjs` exit **1**, failure `印刷キュー描画は定義済みescape関数を使用する`, caused by its expected `escText(window.DateDisplay?DateDisplay.formatDateTime(r.created):r.created)` not matching three current pages.
- **After**: same test exit **0**, internal checks **12/12 PASS**.
- New independent `test/izk_ut_092_print_queue_timezone_regression_test.mjs`: **4/4 PASS**, exit **0**. VM executes the real exported converter source for UTC 04:05:06 -> local 12:05:06, and each page's actual `DateDisplay.formatDateTime` source for 12:05:06 -> 12:05:06, while checking the real `renderQueue` body to prevent UTC-format regression. No device/production QA was run.

## Actual independent source reviews: S01–S10

| Review | Method and outcome |
|---|---|
| S01 | Inspected UTC DB-created timestamp provenance and `src/settings.js` conversion comment: confirmed UTC suffix-less input |
| S02 | Inspected `getPrintQueue` tenantDb select/order: reads `created_at` |
| S03 | Inspected server `getTzOffsetHours` call: store-specific shift |
| S04 | Inspected return mapping `toLocalDateTimeString(r.created,off)`: conversion occurs before response |
| S05 | Inspected DateDisplay `formatUtcDateTime` parser: adds `Z` to naive timestamp |
| S06 | Inspected DateDisplay `formatDateTime` local-regex branch: no additional shift |
| S07 | Compared Native printer queue `renderQueue` expression; replaced UTC-specific formatter only |
| S08 | Compared Web PROD printer queue `renderQueue` expression; same minimal replacement |
| S09 | Compared Web TEST printer queue `renderQueue` expression; same minimal replacement |
| S10 | Executed unchanged pre-existing printer persistence test before FAIL / after PASS; no broad assertion relaxation |

## Actual cross-impact source reviews: H01–H10

| Review | Method and outcome |
|---|---|
| H01 | Verified `escText` call wraps time output in all three screens: injection escaping preserved |
| H02 | Verified null/empty `DateDisplay` fallback remains `r.created` in all three |
| H03 | Verified `refreshQueue` continues calling `getPrintQueue` before `renderQueue` in Native |
| H04 | Verified hosted PROD queue calls the same `getPrintQueue` path |
| H05 | Verified hosted TEST queue calls the same `getPrintQueue` path |
| H06 | Verified queue status, table and printer labels not modified around rendering |
| H07 | Verified failed/pending/printing retry affordance remains unchanged around row creation |
| H08 | Ran VM from actual backend converter with Asia/Manila +08 representative case |
| H09 | Ran VM of actual `formatDateTime` from each of 3 DateDisplay distributions; confirmed unchanged local value |
| H10 | Verified absence of `formatUtcDateTime(r.created)` in each extracted real `renderQueue`; 4/4 regression checks passed |

Source reviews do not imply a signed Android/iOS or actual print-device verification. Formal QA state is unchanged.
