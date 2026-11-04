# Android Emulator QA — isolated test data execution, 2026-10-11

## Completed local test-data preparation

The user authorized preparing QA-only test data and prioritizing formal case
completion. The native app currently points to the **production Cloudflare
Worker** in `mobile-app/web/config.js`, including production auth/storage
prefixes; an isolated QA tenant in that backend has **not** been independently
proven. No production D1 or other user's store was mutated.

The isolated, writable **local SQLite** databases were generated using
`scripts/android-qa-create-isolated-sqlite-fixtures.mjs`, with 40 applicable
migrations applied to each of the 7 independent databases in:

`.android-qa-emulator/qa-fixture-sqlite-20261011051934/`

| Variant | Items | Orders | Order line items |
| --- | ---: | ---: | ---: |
| empty | 0 | 0 | 0 |
| single | 1 | 1 | 1 |
| normal | 12 | 12 | 12 |
| large | 100 | 100 | 100 |
| long-text | 12 | 12 | 12 |
| ja | 12 | 12 | 12 |
| en | 12 | 12 | 12 |
| Total | **149** | **149** | **149** |

All local tables for menus, orders, order items and tables are scoped to
`QA_TEST_STORE_A`. The generated databases are separate from `.wrangler/`
state, the official/Emulator runner, the AVD, and any remote DB. The
per-database SHA-256 and row counts are in the destination `manifest.json`.

## Executed assertions

1. `node test/android_qa_create_isolated_sqlite_fixtures_test.mjs`:
   all seven databases load, schema migrations complete, tenant scope and
   foreign key constraints check out; rejects non-synthetic store IDs, old
   destination overwrites and destination paths outside the QA directory.
2. `node test/test_seed_after_0026.mjs`: fresh migrated local seed PASS
   (seven child records, four orders, all foreign keys valid).
3. `node test/tenant_populated_all_tables_intrusion_test.mjs`: PASS with
   72 populated tenant tables and 648 explicit A/B isolation checks.
4. `node test/android_qa_readonly_profit_proof_test.mjs`: pure, fail-closed
   proof evaluator PASS for nine manifest-pinned readonly profit-simulator
   targets; **synthetic evaluator fixtures do not count as Android case PASS**.

## Next on-device blockers and safe route

- The native QA app currently calls `https://izakanpai-api.izakanpai.workers.dev`.
  It must **not** upload these fixtures to production or silently modify the
  current store just to force formal cases to pass.
- An isolated QA backend and QA-native config with app-accepted workspace
  spelling are required before real form-saving tests. Uppercase underscore
  `QA_TEST_STORE_A` is deliberately restricted to local SQL fixtures and is
  **not** a verified native login workspace ID; the application currently
  normalizes workspace IDs to lowercase and validates their syntax.
- The user is prioritizing formal 2,080-case completion. Do not count
  SQL test cases, code-only unit tests, route sweeps, fixture generation or
  NOT_PROVEN as an Android result. Count only uniquely proven PASS/FAIL,
  with build identity and Android Emulator observation.
- Emulator `emulator-5554` is under separate owner lock. The 1.5GiB host RAM
  stop floor remains required so the physical QA lane can operate. A fixed
  memory-recovery policy in `scripts/AndroidQaEmulatorRecoveryPolicy.ps1`
  now distinguishes safe cold-boot headroom (3.7GiB policy + 4.6GiB AVD
  launch guard) from post-boot headroom (2.4GiB) when the exact AVD is
  independently confirmed booted.

No commit, push, production deploy, D1 migration or real DB change was
performed. The separate SQLite dataset exists as a reviewable prerequisite
to a genuinely isolated end-to-end test backend, not as purported formal
Emulator QA evidence.
