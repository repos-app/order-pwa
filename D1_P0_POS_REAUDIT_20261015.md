# IZK-UT-069 P0 — POS source re-audit (2026-10-15 PHT)

**Disposition: P0 OPEN / release HOLD.** This is a bounded local source review of HEAD `fa6ae41` in a concurrently modified working tree. No production D1 queries, deployment, migration, QA claim, or official verdict changes were performed. Prior 2026-10-12 reports are historic local evidence, not deployed-state evidence.

## Confirmed local checks

- `node --test test/d1_p0_orders_revision_regression_test.mjs test/d1_p0_commission_open_orders_test.mjs test/d1_p0_print_bridge_backoff_test.mjs`: **exit 0; 3/3 test files PASS**. The commission SQLite fixture includes 10,000 historic orders, 201 active orders and second-tenant data. The orders fixture includes all 45 migrations, tenant isolation, revision fallback and >80 IDs. All three bridge surfaces show adaptive backoff in the mock test.
- `python test/d1_p0_rows_read_benchmark.py`: **exit 0**, fixture with 10,000 historic orders / 30,000 old items; before/after returned 10/10 active items, VDBE work units 420,200 → 100 (99.976% local work reduction), EXPLAIN changed from `store_id=?` item seek + orders PK to `store_id=? AND order_id=?` keyed seek. The measured 26.5678ms → 0.0682ms is one local SQLite run; **not D1 meta.rows_read**.
- `git diff --check`: **exit 0** (existing unrelated CRLF warnings). The audited POS source targets `src/orders.js`, `src/commission.js`, `src/gasApi.js`, `src/index.js`, `src/tenantDb.js`, `migrations/0045_operations_revision_low_cost_poll.sql`, `mobile-app/web/admin.html`, `mobile-app/web/kds.html` had no tracked dirty diff at the opening check. Other parts of the worktree have concurrent changes.

## Still unresolved high-read / amplification candidates

1. **Feedback history materialization (local code fixed 2026-10-15)**: Native `src/index.js` and GAS `src/gasApi.js` now use `src/feedbackSummary.js`: `SELECT rating, COUNT(*) ... GROUP BY rating` replaces the unbounded individual rating result transfer; recent page `LIMIT` and response envelope stay intact. Grouped row count can still grow if a tenant writes arbitrarily many distinct invalid rating values. `migrations/0001_init.sql` has no feedback `(store_id,feedback_id)` index. Actual D1 rows-read improvement is **not established** because SQL aggregate can still scan history. No schema migration was made.
2. **Commission workspace parent scan**: `src/commission.js:181-184` uses `status NOT IN ('会計済','取消')` on `orders` despite `idx_orders_store_status(store_id,status)`. Even with the repaired indexed child queries, parent scanning can grow with paid history. Changing semantics to a positive status set requires validation of historical/unknown statuses (and a plan for future status values), so this is an index-plan/fixture gate rather than an unreviewed semantic change.
3. **Scheduled cross-tenant fan-out**: `src/index.js:1766-1787` executes `SELECT store_id FROM stores` and schedules one report job for every store each 15-minute cron when `TENANT_ID` is not pinned. SQL and read costs inside `runScheduledReportsForStore` need independent benchmark and a configuration gate; dedicated `TENANT_ID` path already restricts work to one store. No live job invocation was made.
4. **Polling and retries**: `mobile-app/web/admin.html:515-565` shares a cooldown across forced refresh and normal read; hidden timer is 45 seconds, visible uses 10/30/60 seconds. `mobile-app/web/kds.html:406-423` has 15/60-second delta polling, plus an independent 3-second `refreshKitchenPrint` loop and 180-second forced full refresh. Print polling and forced snapshots remain aggregate D1-budget risks across many device sessions. Local mock backoff PASS does not prove deployed code, concurrency, or print queue costs.
5. **Deployment gate**: 0045 revision table, 27 source-side revision triggers, child lookup index and generated provisioning migration must be matched against the **deployed** D1 schema. Without 0045, `getOperationsRevision()` intentionally returns null and `getOperationsDelta()` performs a full load. This safe correctness fallback does not protect rows-read quota until rollout is explicitly approved.

## Ten independent self-review checks (source/local scope)

| ID | Distinct test or inspection | Observed outcome |
|---|---|---|
| S01 | Compare original D1 incident SQL fingerprint to bounded active IDs (`orders.js:286-326`) | PASS source: historical item JOIN removed |
| S02 | Run historical SQLite VDBE benchmark, exact active rows and EXPLAIN | PASS local; D1 planner PENDING |
| S03 | Run commission 201 active-ID chunk and second-store fixture | PASS local |
| S04 | Trace `getOperationsRevision()` missing-0045 error and fallback (`orders.js:382-414`) | PASS source, release PENDING |
| S05 | Run revision mutation/cross-store regression test | PASS local |
| S06 | Inspect `orders.js:310-361` payload construction, created_at sort and detail binding | PASS source; actual screen PENDING |
| S07 | Inspect tenant-scoped parent/child SQL and `tenantDb.js` join wrapping | PASS scoped predicates source; deployed bindings PENDING |
| S08 | Inspect admin quota cooldown/forced refresh path and no internal read retry | PASS source, deployment PENDING |
| S09 | Inspect KDS 15/60s delta and independent print/full refresh timers | RISK: residual D1 amplification |
| S10 | Check worktree target conflicts, `git diff --check`, local-only tool scope | PASS local; new feedback helper shared across both entrypoints |

## Ten independent horizontal checks

| ID | Surface checked | Observed outcome |
|---|---|---|
| H01 | `src/orders.js` original active-order SQL and child fan-out | PASS local indexed-child proof |
| H02 | `src/commission.js` open-order parent status filtering | RISK: historic parent scan |
| H03 | `src/index.js` Native operations API dispatch | PASS source calls shared delta, live PENDING |
| H04 | `src/gasApi.js` GAS-compatible operations dispatch | PASS source calls shared delta, live PENDING |
| H05 | `mobile-app/web/admin.html` normal/force polling | PASS source cooldown; live PENDING |
| H06 | `mobile-app/web/kds.html` delta/print/forced polling | RISK: independent print requests |
| H07 | Bridge native, hosted production and hosted TEST mock tests | PASS 3 surfaces local |
| H08 | `migrations/0045_operations_revision_low_cost_poll.sql` revision triggers | PASS test fixture; production migration PENDING |
| H09 | `src/index.js` scheduled full store iteration | RISK: unbounded fan-out by tenant count |
| H10 | `src/index.js` and `src/gasApi.js` feedback aggregate | PASS local: both call shared helper; SQL rows-read still unknown |

## Feedback aggregate implementation and 10+10 focused review (2026-10-15)

**Change:** `src/feedbackSummary.js` is the single implementation for Native `handleGetFeedback` and GAS-compatible `getFeedback`. Existing response shape `{avg,count,dist,rows}` remains; entrypoints preserve their existing token/role/store enforcement and limit clamp (1..500, default 100). `GROUP BY rating` + `COUNT(*)` returns grouped counts, then the legacy JavaScript `Number()` conversion and `Math.round()` compute mean and histogram. SQLite numeric and null/text cases are preserved, including the legacy fractional `dist` property (`NaN`, serialized to JSON `null`). No D1 migration required. This removes unbounded per-rating record transfer for typical five-star data; it does **not** promise fewer D1 rows scanned.

**Focused evidence:** `node --test test/d1_p0_feedback_aggregate_test.mjs` exit 0, **1/1 PASS**. Real in-memory SQLite: 12,002 ratings for tenant A, 1,200 for tenant B, invalid text, NULL, zero and fractional values. Page size 8; grouped SQL returned **9 rows** for A vs 12,002 previous individual rating rows; the original mean/count/`dist` loop was reproduced independently, result matches, order preserved, missing store all zero, B returns only B and max page 500. Native and GAS handler wiring independently source asserted. An initial test failure exposed the fractional `dist[3.5]` original-`NaN` behavior; helper was corrected and test then passed. `node --check src/index.js` and `node --check src/gasApi.js` exit 0. Main D1 order/commission suites also rerun separately. No live API/integration/UI or D1 `meta.rows_read` measurement.

| Check | Self-review focus, method and evidence | Verdict |
|---|---|---|
| FS01 | Native prior `SELECT rating` identified and replaced with one shared helper | PASS source |
| FS02 | GAS prior `SELECT rating` independently identified and replaced | PASS source |
| FS03 | Empty-store response checked with SQLite | PASS local |
| FS04 | NULL, zero and invalid text remain excluded from legacy count | PASS local |
| FS05 | Fractional rating legacy NaN property reproduced with independent old-loop oracle | PASS local after detected regression fix |
| FS06 | 12,002 historical records versus 9 grouped SQL rows | PASS local; D1 scan PENDING |
| FS07 | A/B tenant values and comments checked independently | PASS local |
| FS08 | Recent page ORDER BY id DESC and limit 8/500 checked | PASS local |
| FS09 | Response avg/count/dist/rows exact deep equality and shape checked | PASS local |
| FS10 | Syntax and changed-file diff check; no migration or deployment | PASS local, live PENDING |

| Check | Horizontal review | Verdict |
|---|---|---|
| FH01 | `src/index.js` Native token-derived storeId guard intact | PASS source |
| FH02 | `src/gasApi.js` auth/store dispatch intact | PASS source |
| FH03 | `mobile-app/web/feedback.html` consumes unchanged keys | PASS source; UI PENDING |
| FH04 | `docs/yuwaku/feedback.html` consumes unchanged keys | PASS source; UI PENDING |
| FH05 | `docs/yuwaku/test/feedback.html` consumes unchanged keys | PASS source; UI PENDING |
| FH06 | Empty feedback tenant output preserved | PASS SQLite |
| FH07 | Foreign tenant B cannot enter A aggregates or page | PASS SQLite |
| FH08 | Histogram legacy fractional/invalid/null behavior | PASS SQLite |
| FH09 | SQL grouping cardinality benchmark and unbounded distinct-value risk | PASS measured local; D1 unknown |
| FH10 | Both Native/GAS entrypoints source-check call shared helper, old unbounded query absent | PASS local |

**Remaining gate:** evaluate commission positive-status semantics, benchmark Cron/print polling in isolation, determine whether feedback pagination index is justified, and measure actual D1 `meta.rows_read` after approved canary. Deployment approval, schema version proof, account-wide GraphQL usage and cross-service recovery remain pending. No evidence supports closing IZK-UT-069 or changing formal QA PASS/FAIL.
