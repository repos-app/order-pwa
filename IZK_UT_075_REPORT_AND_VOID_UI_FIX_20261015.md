# IZK-UT-075: report sender/recipients and void reason — Local UI + API

2026-10-15 local source only. src/integrations.js now rejects reportEmail and emailFromAddress over the existing 200-character limit before writing DB. src/orders.js now rejects overlong order void reasons before authorization or mutation; previous behavior silently truncated their strings to 200.

Native/Web production/Web TEST settings.html received explicit localized report recipient and sender validation before each RPC. The report emails are normalized using the existing comma/newline split before length comparison. All three admin.html pages received localized void reason validation prior to the POST. Original approval/auth rules, current cancellation logic and database rows remain unchanged. None of these HTML inputs use maxlength, so browser silently truncating typed/pasted values is not introduced.

## Independent evidence

- node test/izk_ut_075_backend_input_regression.mjs PASS: server 201 length rejection and DB writes zero.
- node test/izk_ut_075_admin_report_void_input_test.mjs 6/6 PASS: actual doVoid function in Node VM on three pages refuses 201 characters before HTTP, leaves approval button unchanged; settings UI guards are before corresponding RPC in each of three pages.
- git diff --check exit0. No physical 720px/IME test or live Worker/GAS deployment is claimed.

## Self review S01-S10

| # | Verification | Outcome |
|---|---|---|
| S01 | Original three 200-char silent truncation paths read | PASS source |
| S02 | Report destination normalized before length check | PASS source |
| S03 | Report sender trim and limit preserved | PASS source |
| S04 | Void reason sanitized and limit preserved | PASS source |
| S05 | Direct API input 201 rejects before DB | PASS offline |
| S06 | Native void UI 201 prevents HTTP | PASS VM |
| S07 | Web production void UI 201 prevents HTTP | PASS VM |
| S08 | Web TEST void UI 201 prevents HTTP | PASS VM |
| S09 | Sender/report UI error before RPC in all three surfaces | PASS source |
| S10 | Physical JA/EN IME, auth and live email delivery | PENDING |

## Horizontal review H01-H10

| # | Direction | Outcome |
|---|---|---|
| H01 | Report API direct access | PASS source regression |
| H02 | Native report UI | PASS source |
| H03 | Web production report UI | PASS source |
| H04 | Web TEST report UI | PASS source |
| H05 | Email from-address API direct access | PASS source regression |
| H06 | Cancellation accounting/permissions | Implementation unchanged; physical PENDING |
| H07 | Native manager void UI | PASS VM |
| H08 | Web production manager void UI | PASS VM |
| H09 | Web TEST manager void UI | PASS VM |
| H10 | Android/iOS/Web live auth, email and IME | PENDING |

The three field families are locally corrected. This is not evidence that all 914 static HTML input candidates or all live workflows pass. No commit, push, deploy, production DB, official QA, or device actions were performed.
