# IZK-UT-075 attendance memo final sweep 2026-10-15

Local source only; no commit, deploy, D1 or formal QA.

## Root cause and change
src/attendance.js sanitize applied silent 200-character truncation to memo, altering stored note and samePunchRequest comparison. Existing limit 200 from source. Removed shared sanitizer truncation, added explicit memo_too_long before request lookup, photo save, SQL, and status mutation. Request ID retains existing explicit 100-character canonical slice. For inputs <=200 (after control stripping), persisted normalized text and legacy replay equality are unchanged.
Native clock.html, Web production clock.html and Web TEST clock.html now reject overlength memo before camera capture/request key creation, retain full pasted/IME text, and flag input invalid on input/compositionend. Bilingual preflight uses I18n where supported.

## Self review 10
S01 attendance all sanitizer callers inspected PASS source
S02 known memo 200 existing cap confirmed PASS
S03 normalization strips control characters, no data suffix lost PASS test
S04 exactly 200 accepted PASS test
S05 201 unchanged sanitizer and explicit reject PASS test/source
S06 guard before idempotent duplicate lookup PASS source
S07 guard before photo upload PASS source
S08 guard before SQL changes PASS source
S09 same request idempotent replay unchanged <=200 PASS VM test
S10 different memo suffix cannot alias prior replay PASS VM test

## Horizontal review 10
H01 Native clock input guard PASS static
H02 Web prod clock guard PASS static
H03 Web TEST clock guard PASS static
H04 paste input triggers invalid styling PASS source
H05 IME compositionend triggers invalid styling PASS source
H06 original memo preserved for correction PASS source
H07 role and employee authorization unchanged PASS source
H08 idempotency requestId100 unchanged PASS source
H09 concurrent unique constraint recovery with actual D1 PENDING
H10 device photo/GPS/IME/live physical UI PENDING

## Local evidence
node test/izk_ut_075_attendance_memo_test.mjs PASS exit0.
node --check src/attendance.js exit0.
Scoped git diff --check exit0.
VM tests validate comparison and guard ordering, not physical/API integration.
