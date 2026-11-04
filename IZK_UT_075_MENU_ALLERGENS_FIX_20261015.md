# IZK-UT-075 menu allergens — source-only fix (2026-10-15)

Previously `saveMenuItem` silently sliced allergens to 120 both when inserting and updating. A sanitized value of 121 now returns `{success:false,error:'allergens_too_long'}` at function entry, before translation, plan allowance, SQL reads or writes. The existing 120-character maximum remains unchanged. The already dirty loyalty settings edits in `src/admin.js` were preserved.

Native `mobile-app/web/menu_editor.html`, production `docs/yuwaku/menu_editor.html`, and TEST `docs/yuwaku/test/menu_editor.html` share localized explicit length-120 errors, paste/beforeinput overflow guards (selection replacement calculated, composition bypassed), and a save guard for programmatic overlength. **Removed the client-side `maxLength=120` assignment** after source review because browser maxlength could silently discard IME/pasted text before JS error. A real device IME composition completion is still not verified. The business limit stays 120 in the server and preflight; valid text is not clipped.

Actual evidence: `node test/izk_ut_075_menu_allergens_test.mjs` PASS for create/update 121 Japanese characters before any DB access and VM parse of three HTML scripts. `node --check src/admin.js` PASS; `git diff --check` PASS. Existing SQLite backend suite `test/backend_rounds_1_10_regression_test.mjs` passed its menu rename/uniqueness regressions (43 checks total). No formal QA/device execution, commit, push or deploy.

## Ten self-review observations

| ID | Review observation | Status |
|---|---|---|
| S01 | Existing upper bound exactly 120 in both branches | PASS |
| S02 | Guard placed before translation and SQL | PASS |
| S03 | 121-character create rejected with no DB access | PASS |
| S04 | 121-character update rejected with no DB access | PASS |
| S05 | Single normalized allergens value used in update and insert | PASS |
| S06 | Existing price/name/category semantics unchanged | PASS |
| S07 | Existing dirty loyalty changes retained | PASS |
| S08 | HTML inline JS syntax parsed for all mirrors | PASS |
| S09 | Existing 43-case backend SQLite regression suite run | PASS |
| S10 | Device and authenticated route behavior not exercised | PENDING |

## Ten horizontal-review observations

| ID | Review observation | Status |
|---|---|---|
| H01 | Native menu editor field and save | PASS |
| H02 | Web production editor field and save | PASS |
| H03 | Web TEST editor field and save | PASS |
| H04 | Create INSERT mapped to same sanitized field | PASS |
| H05 | Update UPDATE mapped to same sanitized field | PASS |
| H06 | Translation called after validation | PASS |
| H07 | Menu rename/uniqueness SQLite regressions | PASS |
| H08 | Japanese and English error message source inspected | PASS |
| H09 | Real Android/iOS IME and paste execution | PENDING |
| H10 | Built APK/Worker source attestation and formal QA | PENDING |

Official QA PASS/FAIL delta: **0/0**.
