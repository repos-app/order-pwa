# IZK-UT-075 — Tasks / Todo input audit (2026-10-15)

## Finding and decision

No proven user-entered silent truncation in `src/tasks.js`. The two `.slice(0,120)` sites (line 32 `saveTodo`, line 98 `submitRequest`) normalize **protocol clientRequestId**, used for idempotency and unique tenant-bound lookup; preserving this contract is required. Date `.slice(0,19)` is timestamp formatting, not user input. Todo `title`, `assignee`, `due` are sanitized without truncation. All three `todo.html` variants contain free-text title, staff-select assignee, date due, and generate clientRequestId internally; no existing UI/DB business maximum for title/assignee was found. Accordingly no arbitrary maxlength, UI paste interception or backend new bounds were introduced. The request/response note/content fields have no such truncation either. Under this narrow ticket, changing the protocol ID is unsafe and unjustified.

Existing migration `0001_init.sql` defines todos/requests; `0032_print_claim_tokens.sql` adds client_request_id and `store_id,client_request_id` uniqueness. To introduce a real business title limit requires product maximum approval and a separate compatible UI/server specification. This tranche is an inventory/contract regression, with **no production source modification**.

## Validation

`node test/izk_ut_075_tasks_input_audit_test.mjs` PASS: backend saves an 850-character Japanese title and 190-character assignee unchanged using a recording DB stub, confirms generated protocol ID path and parses all three HTML inline JavaScript scripts; it checks that title, assignee and due are not sliced. `node --check src/tasks.js` PASS. `git diff --check -- src/tasks.js mobile-app/web/todo.html docs/yuwaku/todo.html docs/yuwaku/test/todo.html` PASS. First invocation of new test failed because the DB stub lacked `first()`; stub corrected and rerun PASS. This is not physical QA or SQLite execution.

## Ten self reviews

| ID | Distinct check | Result |
|---|---|---|
| S01 | Enumerated all `.slice` instances in `src/tasks.js` | PASS |
| S02 | Separated clientRequestId protocol from task title | PASS |
| S03 | Long title 850 chars preserved in recorded INSERT | PASS |
| S04 | Long assignee 190 chars preserved in recorded INSERT | PASS |
| S05 | Due retains ISO date from UI, no truncation | PASS |
| S06 | Backend store_id first/insert path inspected, no modification | PASS |
| S07 | Built-in idempotent retry semantics left intact | PASS |
| S08 | Verified three todo screens without new maxlength policy | PASS |
| S09 | VM parse + backend stub regression exit 0 | PASS |
| S10 | Git source unchanged, no prohibited files touched | PASS |

## Ten horizontal reviews

| ID | Distinct check | Result |
|---|---|---|
| H01 | Native todo.html fields and save payload | PASS |
| H02 | Web production todo.html fields and save payload | PASS |
| H03 | Web TEST todo.html fields and save payload | PASS |
| H04 | Todo internal generated ID and backend truncation classification | PASS |
| H05 | Requests submit ID uses same protocol bounding | PASS |
| H06 | requests status handling has no silent slice | PASS |
| H07 | Timestamp slice(0,19) represents canonical time | PASS |
| H08 | DB idempotency schema and index reviewed | PASS |
| H09 | Actual Android/iOS IME, paste/selection behavior | PENDING — no business limit exists |
| H10 | Authenticated SQLite/device formal QA | PENDING — no new UI limit or source behavior to release |

Official QA delta: 0 PASS / 0 FAIL.
