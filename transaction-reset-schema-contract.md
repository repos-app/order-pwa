# izakanpai: Transaction-only reset and new-table admission (IZK-UT-162)

## Operator behavior

The **Data Backup & Management** screen contains **Reset transaction data only**.
It is available to the System role only, requires the current password and the
exact confirmation phrase `RESET TRANSACTIONS`, and operates on the signed-in
store only. It shows row counts before confirmation. Nothing is deleted by
opening the page or requesting a preview.

- Deletes: order, checkout, receipt/refund, staff commission and SC settlement,
  purchase-order history, checkout payment ledger and relevant runtime queues,
  table occupancy/VIP session clocks, and the referenced transaction children.
- Preserves: store, menu, staff, seating, VIP rates, suppliers, reorder item and
  commission rules, inventory records and quantities, recipes, members, coupon
  master and usage_count, settings, audit/attendance/expenses and unrelated mail
  delivery/idempotency metadata.
- **Master counters are NOT automatically rewound.** For example, coupon
  usage_count or member point balances remain unchanged when their transaction
  history is erased. The reset clears historical rows, not financial side
  effects outside the reviewed delete boundary.
- Each reset creates a restorable `__transactions__` backup in the existing
  Data Admin backup history, and backup plus deletion share a D1 batch.

## New tables: automatic discovery, never arbitrary deletion

1. The real D1 schema is introspected with read-only `PRAGMA table_list`,
   `PRAGMA table_info` and `PRAGMA foreign_key_list` through the authenticated
   tenant guard. Cloudflare's internal `_cf_` metadata is excluded.
2. New FK children of transaction roots are **automatically classified as
   transactions**, recursively; independent tables named with recognized
   transaction suffixes also enter the transaction boundary.
3. All other newly introduced tables — including global/unscoped tables —
   **fail closed** until reviewed as a new transaction root or an explicit
   protected master/system table. An unscoped child cannot be tenant-purged.
4. Every reset-target table must have INSERT, UPDATE and DELETE write-lock
   triggers to block concurrent changes during snapshot. When an addition
   requires these locks, create the next additive migration using:

   `node scripts/ci/transaction-reset-schema-gate.mjs --write-next-lock-migration`

   Then regenerate the tenant provisioning migration bundle using:

   `node scripts/build-tenant-provisioning-migrations.mjs`

5. Automatic schema classification/lock verification runs at pre-commit,
   PR/main GitHub CI, and again in the required Worker production release gate.
   The live reset preflight independently checks the same policy and the
   installed D1 trigger names. An unapplied schema migration blocks the
   destructive operation.

This design **does not silently delete unfamiliar masters** or falsely claim
an unknown transaction was reset. Creating a standalone transaction table with
a new name may require classification review. The check is automatic; adding a
missing database migration is a deliberate reviewed change.

## Validation

- `node --test test/auto-ci/transaction-reset-schema.test.mjs test/auto-ci/transaction-reset-workerd.test.mjs`
- `node scripts/ci/transaction-reset-schema-gate.mjs`
- `node test/data_admin_orders_regression_test.mjs`
- `node test/tenant_raw_sql_inventory_test.mjs`
- `node --test test/tenant_schema_release_hard_gate_test.mjs`

Local tests create disposable in-memory SQLite or isolated workerd D1 fixtures;
they do **not** authorize or execute a production deletion. Before production
use, apply all tenant migrations and verify a store-scoped preview and backup
recovery, without erasing real customer history as a test.
