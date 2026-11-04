# IZK-UT-075 purchasing input length — local source patch

## Scope and exact behavior

Existing server limits preserved: `saveSupplier` contact 80, items 200, memo 200, email 120; `saveOrderItem` unit 20, supplier 60, memo 200. Previous `.slice(0,N)` silently stored a different value. The seven fields now return `{success:false,error:'supplier_FIELD_too_long'}` or `order_item_FIELD_too_long` before any DB operation. Source still sanitizes exactly as before; there is no new maximum.

Supplier edit: `mobile-app/web/purchasing.html`, `docs/yuwaku/purchasing.html`, `docs/yuwaku/test/purchasing.html`. Reorder item master is **a separate screen**: `mobile-app/web/order_items.html`, `docs/yuwaku/order_items.html`, `docs/yuwaku/test/order_items.html`. Both get client paste/beforeinput refusal, JA/EN error and save preflight. Order item supplier is a selected option, not free-text: save preflight enforces 60 chars. IME composition is not interrupted in beforeinput; a subsequent save is rejected if browser composition produced an overlong value. No app bundle or live server updated.

Known limitations: maxlength on native HTML input may suppress some keyboard input at exactly N characters without firing cancelable beforeinput on particular browsers; physical Android/iOS IME check PENDING. Dedicated test checks SQL-free rejection using a DB stub that throws on any read/write, plus VM parse. Existing SQLite-backed 43-case suite passes, but no dedicated SQLite overlength integration has been executed. Existing `canonical(...,60/80)` localized name behavior and `clientRequestId.slice` remain outside this specific field family pending independent policy analysis.

## Actual validation

- `node test/izk_ut_075_purchasing_input_test.mjs`: PASS seven backend overlimit pre-write checks, six HTML inline-script VM parses and input contract checks.
- `node test/backend_rounds_1_10_regression_test.mjs`: PASS 43 existing SQLite-backed backend regressions, including supplier idempotency and rename.
- `git diff --check -- src/purchasing.js mobile-app/web/purchasing.html docs/yuwaku/purchasing.html docs/yuwaku/test/purchasing.html mobile-app/web/order_items.html docs/yuwaku/order_items.html docs/yuwaku/test/order_items.html`: PASS.
- No formal QA claims, migration, release, device tests, or production actions. Official QA PASS delta = 0.

## Ten substantive self-review lenses

| # | Check | Status |
|---|---|---|
| S01 | Seven exact limits match original backend numeric slice caps | PASS |
| S02 | All seven values keep sanitize normalization and never truncate | PASS |
| S03 | N+1 overlength return before DB read/write verified with throwing DB stub | PASS |
| S04 | `storeId` remains bound in update/create paths; tenant regression not independently executed | PENDING |
| S05 | SaveOrderItem guard now precedes idempotent priorCreate read; retry semantics 43-suite intact | PASS |
| S06 | No SQL/schema changes; existing supplier rename SQLite suite PASS | PASS |
| S07 | All six UI scripts VM parse and localized inline limits, but physical IME pending | PENDING |
| S08 | Existing 073 CSS and unrelated dirty code retained; diff check PASS | PASS |
| S09 | Positive existing supplier saves and stale update cases PASS in SQLite suite | PASS |
| S10 | No modifications to expenses/takeout/printers/account/QA ledger | PASS |

## Ten independent horizontal review lenses

| # | Check | Status |
|---|---|---|
| H01 | Native supplier four fields and save event | PASS |
| H02 | Web prod supplier four fields and save event | PASS |
| H03 | Web TEST supplier four fields and save event | PASS |
| H04 | Native order item unit/memo and supplier select | PASS |
| H05 | Web prod order item corresponding controls | PASS |
| H06 | Web TEST order item corresponding controls | PASS |
| H07 | GAS `saveSupplier` delegates to same backend validator | PASS |
| H08 | Direct API `saveOrderItem` uses same backend validator | PASS |
| H09 | Android/iOS IME native/paste selection replacement observations | PENDING |
| H10 | Full authenticated SQLite N/N+1 and release APK/Worker evidence | PENDING |
