# Commission raw SQL security review (2026-10-17)

**Outcome:** Two *reviewed* additional read-only SQL sites. No P0 tenant escape found in these two new statements. The new count is 38 vs prior ratchet 36. Source `src/commission.js` already dirty and **not edited**. Only `test/tenant_raw_sql_inventory_test.mjs` ratchet and specific SQL-shape assertions were changed. No build, deployment, official QA, commit or push.

## Before/after and SQL inventory

`git diff -- src/commission.js` against HEAD shows two new `db.first` calls at lines 107 and 113, both introduced in `saveRule` before its idempotency lookup and INSERT/UPDATE:

1. `SELECT item_id FROM menu_items WHERE store_id=? AND item_id=? AND status IN ('on_sale','販売中') LIMIT 1` with positional arguments **`storeId, scopeValue`** when `scopeType === 'item'`.
2. `SELECT category FROM menu_items WHERE store_id=? AND category=? AND status IN ('on_sale','販売中') LIMIT 1` with positional arguments **`storeId, scopeValue`** when `scopeType === 'category'`.

Both have fixed SQL strings: no interpolation, derived table, JOIN, subquery, dynamic identifier, writes or cross-store fallback. They can read at most one active row per operation, using an exact store and item ID/category predicate; indexes/query plans are not separately proven in production. The `scopeValue` is rejected when missing, longer than 120 characters, or containing control characters; the strict role and scope checks run before these statements. A failed lookup rejects with `invalid_scope_value` *before* replay/idempotency, plan selection or mutation. An all-scope rule performs neither query.

**Trusted source:** `src/gasApi.js:1159–1185` authenticates the bearer, obtains `storeId=requireAuthenticatedStoreId(auth)` rather than request-body storeId, checks the `commission` page in `RPC_PERMISSION_GROUPS:1090`, applies plan feature requirements, then passes storeId/role into `RPC_HANDLERS:495–502`. `src/commission.js:74` `requireManager(actorRole)` also denies nonmanagers. `src/gasApi.js:1189–1192` logs successful save operations separately. The two queries are D1 SELECT only; they add at most one indexed/bounded row lookup each to the matching conditional branch, no new D1 row writes. Existing `commission_rules` INSERT/UPDATE/idempotency and decimal validation remain unchanged by this review. Physical D1 query-plan/rows_read telemetry not measured; concurrency/idempotency stress is outside the two added statements.

## Ten separate source investigations (S01–S10)

| ID | Concrete inspection / evidence | Result |
|---|---|---|
| S01 | `git diff -U3 -- src/commission.js` enumerated only two *new SQL call sites* | 2 confirmed |
| S02 | `db.first` item query source text: `store_id=? AND item_id=?` and `LIMIT 1` | bounded |
| S03 | `db.first` category query: `store_id=? AND category=?` and `LIMIT 1` | bounded |
| S04 | Positional values after item SQL `storeId, scopeValue` | bound |
| S05 | Positional values after category SQL `storeId, scopeValue` | bound |
| S06 | `requireManager` runs at saveRule entry before SQL; test nonmanager refusal | PASS |
| S07 | Input `scopeType`, control-character and length validation before SQL | PASS |
| S08 | Invalid scope returns prior to `clientRequestId` idempotency read | PASS |
| S09 | Both queries constant literals, no `${...}` dynamic SQL / interpolated table names | PASS |
| S10 | `node test/tenant_raw_sql_inventory_test.mjs` before ratchet exit 1; after scoped ratchet+query assertions exit 0 | PASS |

## Ten different horizontal investigations (H01–H10)

| ID | Actual checked path/evidence | Result |
|---|---|---|
| H01 | `gasApi.dispatchRpc` signed-session tenant source, ignores body tenant | reviewed |
| H02 | RPC permission page `commission` maps `saveCommissionRule` | reviewed |
| H03 | `commissionMod.saveRule` manager-role gate before reads | PASS |
| H04 | Cross-store item fixture in `commission_scope_tenant_validation_test.mjs` | PASS |
| H05 | Foreign/nonexistent category fixture in same test | PASS |
| H06 | Retired/inactive item fixture in `qa_horizontal_commission_review_20.test.mjs` | PASS |
| H07 | Malformed, spliced controls and long-truncated input fixture | PASS |
| H08 | Existing-edit and idempotency replay cannot bypass new validation | PASS |
| H09 | D1 historic orders chunk-query regression, tenant A/B separation | PASS |
| H10 | Source inventory global ceiling and explicit unique query-shape per site assert; no arbitrary +2 SQL admitted by semantic claim alone | reviewed |

## Commands / limits

`node test/tenant_raw_sql_inventory_test.mjs`: originally exit **1**, `commission.js` above 36; after scoped update exit **0** (65 JS files, 47 modules, **936** syntactic SQL sites). `node --test test/commission_scope_tenant_validation_test.mjs test/qa_horizontal_commission_review_20.test.mjs`: exit **0**, 27/27. `node test/d1_p0_commission_open_orders_test.mjs`: exit **0**, test reports 10k historical rows skipped, 201 active ID chunks, index seeking and A/B isolation. `git diff --check -- test/tenant_raw_sql_inventory_test.mjs`: exit **0** (CRLF warning only).

**Limits:** SQL regex census does not prove global P0 safety, source-only assessment cannot establish real D1 query-plan or production metrics, and the existing dirty source was not modified. Review applies specifically to these two new read-only lookups. No permission was granted to lift limits for any future SQL call.
