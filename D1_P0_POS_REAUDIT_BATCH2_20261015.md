# IZK-UT-069 — POS batch 2, commission parent and print-poll (2026-10-15)

**Result: source change withheld; P0 remains OPEN.** Existing `src/commission.js:getOpenOrders()` reads parent `orders` through `WHERE store_id=? AND status NOT IN ('会計済','取消')`, then fetches only the selected `order_items` in keyed groups of 80. The established `idx_orders_store_status(store_id,status)` index is used only for `store_id=?` in the local SQLite plan; history may still be traversed. Replacing `NOT IN` with the three current statuses is **not equivalent**: legacy/unknown values must remain visible. A new partial index covering nonfinal orders might address the parent scan, but would require a versioned migration and deployed schema proof; neither is authorized in this batch. No unverified application change was applied.

## Local evidence

- `python test/d1_p0_commission_parent_plan_batch2.py` — exit 0. SQLite fixture: tenant A 10,000 paid + active + unknown legacy + void; tenant B 5,000 paid + active. A returns precisely active and unknown legacy; `EXPLAIN QUERY PLAN`: `SEARCH orders USING INDEX idx_orders_store_status (store_id=?)`. Positive status-list loses the legacy row. No statement about D1 `meta.rows_read` follows from this SQLite result.
- `node --test test/d1_p0_commission_open_orders_test.mjs test/d1_p0_print_bridge_backoff_test.mjs` — exit 0; **2/2 test files PASS**. Existing commission fixture checks 10,000 historic parents, 201 active IDs, keyed children and tenant isolation. The print bridge mock exercises Native-hosted, production-hosted and TEST-hosted pages; no actual print-job workload benchmark.
- `git diff --check -- src/commission.js src/orders.js src/printers.js` — exit 0; these three source files were not changed by this task. Shared dirty worktree preserved. No official QA/real device, commit, push, deploy, production DB or migration actions.

## Ten self-review perspectives

| ID | Distinct check and evidence | Result |
| --- | --- | --- |
| S01 | Source query `commission.js:177-184` compared with `orders.js:310-321` positive-status list | PASS source: different contracts |
| S02 | SQLite historic paid fixture and `EXPLAIN QUERY PLAN` | PASS local: store seek only; residual scan risk |
| S03 | Explicit legacy unknown status in SQL fixture | PASS local: positive list changes behavior |
| S04 | Second tenant A/B in fixture | PASS local: no foreign parent returned |
| S05 | Empty/no-active behavior from preexisting `if (!active.length) return []` and fixture suite | PASS source/local |
| S06 | Existing child lookups by `store_id` plus <=80 `order_id` keys (`commission.js:186-205`) | PASS source/local |
| S07 | Local result ordering by created_at + item ID (`commission.js:204-205`) | PASS source; screen PENDING |
| S08 | Current `(store_id,status)` index in `migrations/0001_init.sql:87` | PASS source; deployed schema PENDING |
| S09 | Existing commission regression executed; 201 active parent chunk behavior | PASS local |
| S10 | Scope protection: read-only source review, added isolated benchmark and doc | PASS source; live impact PENDING |

## Ten horizontal perspectives

| ID | Independent surface/contract check | Result |
| --- | --- | --- |
| H01 | `orders.js` active-status feed only supports three current statuses | PASS source; commission cannot inherit narrowing |
| H02 | `orders.js` cancellation guards use `NOT IN` and support nonfinal legacy status | PASS source |
| H03 | `orders.js` table-label occupancy guards use `NOT IN` | PASS source |
| H04 | `commission.js` allocation guard joins orders with identical `NOT IN` | PASS source; compatibility risk if narrowed |
| H05 | `commission.js` downstream localization and menu metadata needs unchanged parent IDs | PASS source |
| H06 | `commission.js` employee allocation lookup uses order_item_ids and store_id | PASS source |
| H07 | `printers.js` printer list counts pending jobs per scoped printer | PASS source; D1 volume PENDING |
| H08 | `printers.js:640-673` print claim queries and tenant predicates inspected | PASS source; D1 plan PENDING |
| H09 | `printers.js:937-948` CloudPRNT pending claim ordered by `created_at LIMIT 1` | RISK: print_queue index/workload independent audit needed |
| H10 | Three print bridge distributions pass existing backoff mock | PASS local; concurrent sessions/live D1 PENDING |

**Next gated remedy:** benchmark a versioned partial `(store_id, created_at)` index with predicate `status NOT IN ('会計済','取消')` against a representative migration-complete SQLite copy; confirm D1 SQLite partial-index compatibility and schema propagation across tenant creation/migrations. Account for writes/index footprint and the `status NULL` contract. Print-queue claim plans should be profiled separately; no claim that a code-only modification can eliminate underlying polling volume. Obtain explicit production migration/deployment authorization before any live rollout, and verify real D1 `meta.rows_read` afterwards.
