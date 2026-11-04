# 2026-10-10 BACKEND NG ??????????

> ???????????????????????????????????????????????????????????????? docs/BACKEND_NG_ISSUE_REGISTER_20261010.md ????????????Android??QA?PASS???????????????

---

# Backend NG fix handoff — 2026-10-10

## Scope
Isolated worktree: `C:\Users\user\OneDrive\_work\izakanpai-ng-fix`
Base HEAD: `681ef40`. Main repo, QA runner and Android phone remain unchanged.
No commit, push, merge, deployment, migration or APK build.

## Current local changes
- `src/attendance.js`: deny admin/system self-punch; reflect `canPunch=false`.
- `src/gasApi.js`, `src/index.js`: pass role into attendance; API authentication 401 handling.
- `src/orders.js`: store-local sold-out date; order served status/stock checks in one D1 batch with transition guard.
- `src/inventory.js`: recipe-driven served consumption; atomic consumption ledger, stock request-ID duplicate checks; snapshot opening stock, manual count changes and item deletion record a movement with the original quantity adjustment in the same D1 batch.
- `test/backend_inventory_ledger_void_regression_test.mjs`: new isolated regression (18 passed assertions).

## Spec and results
- OPR-RACE-036: candidate repair; stock exhaustion prevents a second served transition locally.
- OPR-RACE-042: receive, waste, stocktake same-ID retries and different-payload negative cases passed locally.
- PT-AGGREGATE-074/075: receipt of inventory, waste, recipe use, manual adjustment and initial/deletion histories reconcile in the new local fixture. Older records still require reconciliation.
- PT-CANCEL-003: provided order can be canceled once; audit/order items and completed print history persist, pending print removed, consumed stock stays consumed, second cancel rejected; sales excludes canceled order.
- OPR-ATT-011: role policy change implemented; existing `gas_compat_smoke_test.mjs` has a stale assertion expecting admin `canPunch=true`, so the full legacy test fails. Existing test definition was not edited.
- OPR-AUTH-027/028 and OPR-ORD-011: previously implemented; physical/HTTP boundary retest not completed here.

## Verification
- New inventory/cancellation regression: **18/18 PASS**.
- Existing backend rounds: **43/43 PASS**.
- Critical backend regression: **34/34 PASS**.
- Attendance idempotency: PASS.
- Tenant defense: SQL runtime 35, all physical table isolation 434, parent FK integrity 29, full API intrusion 453 and backup/import 22 checks all PASS.
- JS syntax and `git diff --check`: PASS.
- Full GAS compat smoke: FAIL at obsolete admin `getEmployeeStatuses.canPunch` expectation.
- Approval regression: STOP due to missing `mobile-dist/receipts.html` in this isolated worktree, after earlier checks passed.

## Remaining risks and review decisions
1. Historical stock movements are keyed by item name, not immutable `item_id`. Old untracked initial stocks or renamed/swap items cannot always be reconstructed without a deliberate historical reconciliation/schema design.
2. Existing `sameWasteRequest` accepts an ambiguous retry if original waste was clamped to zero. Exact requested quantity is not stored; the different-payload case that exhausts stock needs a durable payload fingerprint solution.
3. The stock history UIs `docs/yuwaku/moves.html`, `docs/yuwaku/test/moves.html` and `mobile-app/web/moves.html` only translate 入荷/廃棄/棚卸. New 初期 and 消費 types need localization and KPI review by the UI owner.
4. Actual dual-device concurrency, HTTP 401 boundary and Android physical NG case PASS remain unverified. Worktree fixes have not been integrated/deployed.
5. `handoff/APP_STORE_PROGRESS.md` does not exist in this detached worktree; release percentage was intentionally not changed.

## Cross-surface reviews
1. Searched data writers and native/GAS public handlers: inventory quantity mutations are confined to inventory.js; integration and purchasing paths change metadata only.
2. Reverse-scanned UI consumption and all stock-history pages; identified a missing translation for new movement types. Existing backend movement queries keep tenant-scoped store conditions.

## Continued backend repair checkpoint (2026-10-10, local only)

This checkpoint supersedes earlier open items where subsequent regression evidence is documented. No D1 migration, deployment, build, commit, push, reset, or physical-device action occurred.

### New repairs in the isolated backend worktree
- Waste at zero: persist exact originally requested discard quantity in a versioned internal suffix in movement `reason`. Public getStockMoves strips it. Same ID+same request is idempotent, a changed over-limit quantity is `request_conflict`. Pre-upgrade ambiguous zero-stock movement is rejected to avoid a false duplicate success.
- Receive: persist original requested unit cost in a versioned movement `reason` marker so two prices that round to the same cost_estimate no longer share the same idempotency success. Public reason remains blank. Historical untagged receive rows preserve legacy rounded-cost comparison.
- Rename: append paired close/open `move_type=Rename` movements in the same D1 batch as the guarded inventory rename. This keeps historical movement rows immutable and supports A/B name swap and simultaneous stock adjustment for newly tracked movements.
- Stocktake: every stocktake uses an exact client_request_id, or a unique internal generated identity when the client omitted one. Return its own movement delta after the transaction, even if another stocktake occurs before the response query. getStockMoves orders by created_at DESC, move_id DESC.
- Static raw SQL allowlist has been security-reviewed and adjusted to 48 inventory.js call sites (from 43), with all five added statements bound to store_id+item_id and atomic batch guards.

### New verified tests
- `test/backend_inventory_ledger_void_regression_test.mjs`: 29 assertions PASS, including receive cost rounding collision, waste clamp/legacy fail-closed, rename swap and simultaneous adjustment, response race, ledger sums, cancellation, and tenant A/B.
- `test/backend_auth_attendance_401_regression_test.mjs`: 12 assertions PASS. Admin/system self-punch rejected, staff punch succeeds; Native+GAS authenticated routes return HTTP 401 for missing/invalid bearer tokens. GAS public `getSettings` without bearer is intentionally public.
- `test/backend_store_soldout_boundary_regression_test.mjs`: 7 assertions PASS across Manila, Tokyo, UTC and local-midnight boundary.
- Existing backend rounds 43/43 PASS, critical backend 34/34 PASS, attendance idempotency PASS, raw SQL inventory audit PASS (909 syntactic sites).
- Tenant defense 5 independent suites PASS: runtime guard 35 assertions, all-tables 434, parent FK 29, API A/B 453, backup/import 22.

### Five independent cross-impact reviews
1. Inventory write locations: inventory.js owns stock quantity mutation, while purchasing/integrations only edit supplier/localized metadata.
2. Native+GAS action entrypoints: both route receive, waste, stocktake, getStockMoves and attendance to the shared modules; roles are forwarded on punch.
3. SQL posture: all new stock ledger writes use authenticated store_id and item_id, stay within the same batch and are subject to existing tenant DB defenses.
4. Mobile/Web production and Web TEST consumers: three `moves.html` pages show only labels for Receive, Waste and Stocktake. The fallback `typeLabel` labels every unknown new type **as Receive**. This is a confirmed UI bug for Opening Balance, Consumption and Rename and needs UI owner change in all three surfaces.
5. Historical/backup compatibility: backups export raw version-tagged `reason` values; getStockMoves strips the markers for users. Existing untracked pre-fix balances and old name changes cannot be recreated reliably without separately scoped data reconciliation.

### Remaining limitations and dependencies
- Physical Android 2,080-case PASS, live D1 concurrency and production deployment are not verified here.
- Historical inventory balances and legacy pre-tag request payloads cannot always be reconstructed. A controlled historical repair policy must be agreed before any live data changes.
- The preexisting GAS full smoke test expects admin canPunch=true, contradicting the current security policy. It stops at that old assertion. Do not change official Android QA case definitions. `test/izk_ut_048_approval_regression_test.mjs` requires missing `mobile-dist/receipts.html` in this detached worktree.
- UI worktree owner must add movement type translations and KPI handling in `docs/yuwaku/moves.html`, `docs/yuwaku/test/moves.html`, `mobile-app/web/moves.html`; backend worktree has not edited UI.

## Continued audit and matching fixes (second pass, 2026-10-10)

### Implementation
- Added fail-closed fuzzy inventory matching to buildServedOrderDeductionPlan. It prioritizes an exact stock name and accepts a substring match only when one candidate exists. Ambiguous matches are rejected with ambiguous_inventory_match before modifying the order, stock, or ledger.
- A menu with an explicit inventory_link pointing to a missing inventory row is rejected with inventory_mapping_missing, including when inventory is empty. Unlinked/untracked menus retain legacy behavior.
- Native /status API returns HTTP 409 for insufficient_stock, ambiguous_inventory_match and inventory_mapping_missing. GAS-compatible updateOrderStatus returns explicit error data. Existing protected tenant selection stays attached to signed auth.storeId.
- Added auditInventoryLedger(db,storeId) to src/inventory.js as an internal read-only diagnostic with per-name stock, recorded-movement balance, delta, and categories possible_missing_opening_balance / historical_name_or_deleted_item / movement_balance_mismatch. It is not exposed by a public API and never creates adjustment movements.
- Added scripts/audit-inventory-ledger-local.mjs to inspect a pre-existing local SQLite snapshot in read-only and query_only mode. Requires --db FILE --store STORE_ID; rejects unknown stores. Optional --details prints all items. Example:
  node scripts/audit-inventory-ledger-local.mjs --db "C:/path/to/local-snapshot.sqlite" --store "STORE_ID" --details
- The audit compares multiple reads rather than pinning a live D1 transaction; run against a consistent local snapshot to eliminate transient false positives. Historical source rows do not have immutable movement item_id, and no blanket data repair is safe.

### New tests and evidence
- Inventory + cancellation + mapping + audit regression: 34/34 PASS (test/backend_inventory_ledger_void_regression_test.mjs).
- Native/GAS HTTP conflict status + tenant boundary: 9/9 PASS (test/backend_order_inventory_http_regression_test.mjs).
- Local SQLite audit execution: 3 PASS, including required store validation, no B-tenant leakage and unchanged source SQLite snapshot.
- Existing attendance/auth 12/12 and sold-out time-zone boundary 7/7 PASS.
- Existing backend rounds 43/43 and critical backend 34/34 PASS.
- SQL call-site audit PASS (909 syntactic calls), tenant SQL guard PASS (35), all-tables intrusion PASS (434), parent FK PASS (29), API A/B intrusion PASS (453), backup/import PASS (22).
- JS syntax checks and git diff --check PASS.

### Outstanding decisions / surface handoff
- UI owner: show user-facing messages for insufficient_stock, ambiguous_inventory_match, inventory_mapping_missing in all three admin.html and all three kds.html surfaces. These files are not modified in this worktree.
- UI owner: movement type labels and statistics in docs/yuwaku/moves.html, docs/yuwaku/test/moves.html, mobile-app/web/moves.html require Opening Balance, Consumption, Rename support. Current fallback calls unknown types Receive.
- Historical balances for previously untracked stocks, reused product names and legacy untagged request payloads require an approved offline reconciliation policy. This task only diagnoses; never repairs historical production rows.
- Recipes can contain untracked ingredients; only explicit inventory_link errors now fail closed. Turning missing recipe ingredients into blocking order errors would change existing storefront operations and requires product-level approval.
- Previously reported stale GAS smoke expectation (admin canPunch=true), old order-status test browser mock (window.addEventListener missing), and missing mobile-dist receipts fixture remain test harness issues. None of the existing official Android QA definitions were changed.
- All changes remain in the isolated backend worktree; no commit, push, deploy, integration, D1 migration, APK build or physical-device interaction.
