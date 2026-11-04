# IZK-UT-090 / QA2-SET-001 local source fix

## State and root cause

Local source edited, **signed APK physical retest pending; formal QA remains FAIL**. Original evidence: `test-results/qa-v2-evidence/playwright-realme/2026-10-17T07-52-27-056Z/QA2-SET-001/formal-fail-evidence-reviewed.json`, APK 910019, original table label `テーブル 1/2`, saved `QAmyxb_tableLabelJa` validated through settings readback. The old `seatLabel` regular expression only accepted `テーブル1`, not `テーブル 1`; the display therefore passed the stored stable seat ID through unchanged. Startup only used bootstrap settings. Three admin surfaces now accept Japanese and English legacy prefixes with or without whitespace and load authenticated current `getSettings` before the initial order render, preserving bootstrap values as a fallback if refreshing fails. Raw seat IDs sent to APIs and stored in orders remain unchanged.

Changed: `mobile-app/web/admin.html`, `docs/yuwaku/admin.html`, `docs/yuwaku/test/admin.html`. Regression: `node test/izk_ut_090_admin_seat_label_test.mjs` exit **0**, 13 value assertions per surface and authenticated settings refresh pattern checks; `git diff --check` exit **0**. Original dirty CSS changes preserved. No build, phone QA, commit, deploy or formal state update.

## S01–S10 independently checked code concerns

| Pass | Method and concrete finding | State |
|---|---|---|
| S01 | Inspected original matching expression and supplied `テーブル 1`: no match; replaced with optional-whitespace legacy prefix | reviewed |
| S02 | Executed `テーブル1` case against each extracted live function: maps `卓QA 1` | reviewed |
| S03 | Executed `Table 2` / `TABLE2` against each: maps `卓QA 2` | reviewed |
| S04 | Executed numeric-only `2`: maps `卓QA 2` | reviewed |
| S05 | Executed `カウンター 3` and `カウンター3`: maps `窓口QA 3` | reviewed |
| S06 | Executed `Counter 4`: maps `窓口QA 4` | reviewed |
| S07 | Executed custom `個室VIP`, `テーブル A` and `テーブル 1号`: unchanged, avoiding reinterpretation of arbitrary IDs | reviewed |
| S08 | Switched `lang` to `en` in each extracted function: `DeskQA 1` and `BarQA 3` | reviewed |
| S09 | Inspected startup `API.post('bootstrap', {token:TOKEN})` and added subsequent `getSettings` merge before `load()`; test inspects all three | reviewed, runtime API response pending |
| S10 | Ran `git diff --check` and examined specific three-file diff; unrelated existing CSS changes preserved | reviewed |

## H01–H10 separate cross-impact inspection

| Pass | Inspected code/path and result | State |
|---|---|---|
| H01 | `rg seatLabel(` across three admin files: order cards call formatter | reviewed |
| H02 | Same call graph: staff calls and void detail use formatter | reviewed |
| H03 | Same call graph: partial payment table and payment result use formatter | reviewed |
| H04 | Same call graph: receipt-preview HTML uses formatter with escaping | reviewed |
| H05 | Compared Native, hosted production, hosted TEST seat formatter and refresh with dedicated regression: same behavior | reviewed |
| H06 | Searched `src/admin.js` / `src/orders.js` table_label usage: database identity carries raw `table_label`; UI fix does not rewrite it | reviewed |
| H07 | Read `src/gasApi.js` `bootstrapGas`: gets per-store `getSettingsGas`; code-level setting source exists | reviewed; deployed runtime not verified |
| H08 | Read `src/index.js` `handleBootstrap`: public settings retrieved per store; frontend authenticated refresh reduces stale bootstrap risk | reviewed; deployed runtime not verified |
| H09 | Reverse search `mobile-app/web/kds.html`, `feedback.html`, `receipts.html`, `settings.html`: same spaced-label gap remains outside file ownership; separate fix required | external dependency |
| H10 | Reverse search `src/regionalSettings.js:formatSeatLabel` and `src/ereceipt.js`/`src/integrations.js`: backend formatter also lacks spaced prefix; separate fix required | external dependency |

## Follow-up for owning agent and QA

Other owners should normalize old spaced seat IDs in `kds.html`, `feedback.html`, `receipts.html`, `settings.html`, their hosted equivalents, and `src/regionalSettings.js`, plus independently check any affected ordering/booking renderers. Rebuild signed QA APK and rerun QA2-SET-001 with fresh `tableLabelJa` value, authenticated settings readback, actual populated admin table UI before/after app restart, other screens and locale variants. Formal runner and evidence must decide any new PASS/FAIL; no local test asserts physical success.

## Follow-up extension (2026-10-17, same issue)

After explicit scope expansion, the previously reported gap was fixed in the **nine existing** `kds.html`, `feedback.html`, `receipts.html` files under Native `mobile-app/web/`, hosted production `docs/yuwaku/`, hosted TEST `docs/yuwaku/test/`, and `src/regionalSettings.js`. Only the display formatter changed: historical and current raw table IDs, database keys, API request values, seat matching, checkout and order persistence were not modified. Existing unrelated dirty changes in kitchen/receipts CSS and layout were retained.

Local automated regression `node test/izk_ut_090_cross_surface_test.mjs`: first attempt exit 1 due to test harness missing global `I18n` alias in VM, corrected independently in the **test only**; second attempt **exit 0**. Twelve labels per surface × nine HTML files + twelve backend labels = **120 PASS assertions**. Prior `node test/izk_ut_090_admin_seat_label_test.mjs`: exit 0 (39 label checks plus refresh assertions). `git diff --check` exit 0 (CRLF normalization warnings on four hosted files; no whitespace errors). This is local source validation only.

### Additional independent source-review passes (S01–S10)

| Pass | Inspection / concrete result |
|---|---|
| S01 | Original nine function definitions enumerated by `rg`; all retained single `seatLabel` entry point |
| S02 | Inspected each formatter's old Japanese table regexp; now optional space and historical Japanese prefix |
| S03 | Inspected alternate English table prefix path; case insensitive `Table` and `TABLE` recognized |
| S04 | Checked numeric-only identifier path; still matches existing `^(\d+)$` branch |
| S05 | Checked spaced Japanese counter values; `カウンター 3` mapped to customized counter label |
| S06 | Checked English counter legacy path; `Counter4` maps to customized label |
| S07 | Executed unknown custom seat IDs `個室VIP`, `テーブル A`, `テーブル 1号`; preserved literally |
| S08 | Re-executed function under dynamically selected English locale; exact configured `DeskQA` and `BarQA` observed |
| S09 | Inspected `src/regionalSettings.js` formatter; its existing opposite-language fallback and term sanitizer preserved |
| S10 | Ran two regression programs and `git diff --check`; 120/120 extension assertions pass, pre-existing admin test remains green |

### Additional independent cross-impact passes (H01–H10)

| Pass | Scope / actual finding |
|---|---|
| H01 | Native kitchen (`mobile-app/web/kds.html`) formatter verified; existing ticket HTML still calls `seatLabel` |
| H02 | Hosted production kitchen (`docs/yuwaku/kds.html`) formatter verified independently |
| H03 | Hosted TEST kitchen (`docs/yuwaku/test/kds.html`) formatter verified independently |
| H04 | Native feedback (`mobile-app/web/feedback.html`) formatter and Japanese/English invocation verified |
| H05 | Hosted production + TEST feedback formatters compared with Native via executed common cases |
| H06 | Native receipt history (`mobile-app/web/receipts.html`) renderer verified without touching payment amount calculation |
| H07 | Hosted production + TEST receipt history formatters verified against the same saved labels |
| H08 | Server receipt/email format imports `formatSeatLabel` (`src/ereceipt.js`) and integration print path (`src/integrations.js`) inspected in prior audit; common formatter now recognizes legacy spaces; integration execution **PENDING** |
| H09 | Reverse search settings Native/prod/TEST (`_seatLabel`) still shows old spaced-prefix regexp; **OPEN**, excluded from edits by concurrent ownership |
| H10 | Confirmed raw order and receipt DB identity fields referenced through `src/orders.js`, `src/admin.js`, `src/billing.js` in prior audit; no modifications to those files or their identifiers; live data integrity **PENDING** |

**Remaining limitations:** `settings.html` in three variants requires its separate owner's fix. Formal Playwright Android signed APK rerun, actual business fixture/physical evidence, and backend print/e-receipt integration verification remain pending. Source-only checks do not change original official FAIL.

## Settings three-surface extension — 2026-10-17

The prime explicitly authorized changing only the existing `_seatLabel` rendering expression in `mobile-app/web/settings.html`, `docs/yuwaku/settings.html`, and `docs/yuwaku/test/settings.html`. The previous gap is now locally fixed on all three surfaces. Their saved label inputs, other settings, points logic, QR data values, and existing unrelated dirty changes were retained. The display function recognizes old `テーブル 1`, `Table 1`, `カウンター 3`, `Counter3`, and numeric seat IDs using the same format as the previously changed admin, KDS, feedback, receipts, and backend formatter.

Dedicated test `node test/izk_ut_090_settings_display_test.mjs`: **exit 0**, 12 dynamically executed label expectations per surface (36 assertions), plus confirmation of both established QR rendering call sites in each file. The first test invocation failed with exit 1 because the isolated VM fixture had not exposed the global `I18n` alias, corrected only in the test fixture; rerun passed. Existing `node test/izk_ut_090_cross_surface_test.mjs` and `node test/izk_ut_090_admin_seat_label_test.mjs` each exited 0 in this continuation. `git diff --check` for three settings files exited 0, with two Windows CRLF-to-LF warnings. Existing settings changes outside `_seatLabel` were present before this extension and preserved.

### Settings-specific independent source reviews

| ID | Distinct evidence and result |
|---|---|
| S01 | Searched all 3 `_seatLabel` definitions: before they rejected spaced `テーブル 1`; repaired solely rendering matcher |
| S02 | Executed old unspaced Japanese `テーブル1` against each live-extracted function: configured `卓QA 1` |
| S03 | Executed spaced Japanese `テーブル 1`: configured `卓QA 1` |
| S04 | Executed `Table 2` and uppercase `TABLE2`: case-insensitive configured table label |
| S05 | Executed standalone number `2`: preserved numeric-seat conversion |
| S06 | Executed old spaced Japanese counter `カウンター 3`: configured `窓口QA 3` |
| S07 | Executed `Counter4`: English-origin legacy counter recognition |
| S08 | Executed custom `個室VIP`, `テーブル A`, `テーブル 1号`: unchanged arbitrary identifiers |
| S09 | Switched VM's actual `_seatTerm` language dependency to English: `DeskQA 1` and `BarQA 3` |
| S10 | Compared precise new `_seatLabel` hunk with pre-existing dirty settings changes and ran `git diff --check` exit 0 |

### Settings-specific independent horizontal reviews

| ID | Distinct code-path observation and status |
|---|---|
| H01 | Native settings QR preview at line ~461 calls escaped `_seatLabel(tableNum)`; verified target exists |
| H02 | Native settings printable QR cards at line ~536 call escaped `_seatLabel(tableNum)`; verified second use |
| H03 | Hosted production settings QR preview at line ~448 uses same escaped formatter |
| H04 | Hosted production settings printable QR cards at line ~523 use same escaped formatter |
| H05 | Hosted TEST settings QR preview at line ~448 uses same escaped formatter |
| H06 | Hosted TEST settings printable QR cards at line ~523 use same escaped formatter |
| H07 | Actual `_seatTerm` source executed inside VM for each distribution; persisted JA/EN input values select expected locale |
| H08 | Compared previous admin seat parser through `node test/izk_ut_090_admin_seat_label_test.mjs` exit 0; historical-space policy consistent |
| H09 | Compared previously changed KDS/feedback/receipts and backend through `node test/izk_ut_090_cross_surface_test.mjs` exit 0 |
| H10 | Inspected `git diff -U0` on three settings files: new functional change confined to `_seatLabel` line; old changes to other settings/points code remain untouched |

**Outstanding:** Physical QA/UI rendering, actual QR print content, signed APK confirmation, deployed server behavior and official QA adjudication **PENDING**. Official QA remains FAIL as previously recorded. No build, deploy, commit, push, DB mutation or formal-QA edit.
