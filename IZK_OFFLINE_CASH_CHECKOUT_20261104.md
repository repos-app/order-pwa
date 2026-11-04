# izakanpai POS — Offline cash checkout

Date: 2026-11-04 (PHT). This is the implementation and release evidence index;
source regression PASS is never a substitute for actual signed-device QA.

## Operator contract

1. A staff member must have authenticated and downloaded the order snapshot
   while online. On that same authenticated session/device, the Orders screen
   can restore a cached snapshot while disconnected. Never use another store's
   or another staff session's cached orders.
2. Only fully served, non-demo, non-prepaid orders are eligible for offline
   **cash without a discount**. Offline card, QR and privileged discounts are
   not accepted. The screen displays the expected amount before cash receipt.
3. After cash collection, write the settlement and unique transaction ID to
   IndexedDB before showing any success-like UI. The UI must display
   **Cash received · awaiting server sync**, never a settled official receipt.
   Do not collect cash a second time for pending, rejected or confirmed records.
4. On network restoration or the next authenticated launch, the existing
   outbox sends exactly the same transaction ID, amount, order IDs, original
   served-order snapshot and cash acceptance timestamp to the tenant server.
5. The server recalculates fees using the original cash acceptance time,
   validates exact order set, prices, status, payment method, authenticated
   store and snapshot, and performs the receipt/order updates with a unique
   immutable reconciliation record in one D1 batch. The same request ID returns
   the original official receipt, never a second settlement.
6. On definitive conflict, retain a visible **rejected — manual reconciliation
   required** record. On timeout/transport uncertainty, retain **pending** and
   retry safely with the same ID. An official receipt number is displayed
   only after a matching server acknowledgement.

The current solution requires an existing authenticated offline-ready device
and cached orders. A completely new offline-only device cannot invent a current
order snapshot. Offline devices cannot independently coordinate with other
cashier devices: **the store must designate one cash-accepting offline
terminal during an outage** to prevent duplicate physical cash collection.
Server-side idempotency prevents duplicate official receipts but cannot undo
cash handed to two disconnected physical terminals.

## Shared release surfaces

- Native Android/iOS: `mobile-app/web/admin.html`,
  `mobile-app/web/api.js`, `mobile-app/web/sw.js`; copies synchronized to
  Capacitor through `npm run mobile:sync`.
- Hosted production and test: `docs/yuwaku/{admin.html,api.js,sw.js}`
  and `docs/yuwaku/test/{admin.html,api.js,sw.js}`.
- Common backend: `src/billing.js`, `src/gasApi.js`, tenant Worker
  source template. Offline cash schema `0054_offline_cash_settlements.sql`.
- Future-store generated catalog: `src/tenantProvisioningMigrations.generated.js`.

## Validation — source and simulated D1, not official device QA

- `node test/offline_checkout_backend_test.mjs`: 27 PASS, 0 FAIL.
- `node test/offline_checkout_frontend_test.mjs`: 90 executable frontend
  assertions PASS across native/Web prod/Web test.
- `node test/offline_cash_checkout_release_gate_test.mjs`: 39 PASS.
- `node test/admin_checkout_preflight_regression_test.mjs`: 69 PASS.
- `node test/gas_compat_smoke_test.mjs`: 562 PASS.
- `npm run mobile:sync` and `npm run verify:distribution`: PASS.
- A complete fresh `npm test` run, not a `--start` diagnostic tail,
  **ALL 215 ORDERED PROJECT TEST STEPS PASSED (exit 0)** after
  refreshing source inventory baselines and correcting stale harnesses.
- `node test/account_deletion_automatic_lifecycle_test.mjs`,
  `test/account_deletion_db_first_regression_test.mjs`,
  `test/izk_ut_075_account_deletion_reason_test.mjs`: all PASS.
- Live Control tenant registry and Wrangler physical D1 list: 13/13 match.
  Live 0054 additive rollout: 13/13 migrated, 0 errors; a separate live
  read-only `tenant-d1-schema-contract-gate.mjs --all` verified all 13/13.
- Future-store template Worker version
  `306fb6e6-b65c-43a9-b324-9f830a3755ed` (post-release account deletion
  integrity refresh); Provisioner version
  `8bb8b861-6750-4bef-9bc4-b3152c36796e`. Deployment succeeded and
  existing provisioner secret names were checked afterward.

## Final rollout and device checks

The database schema is live, but a store can execute offline reconciliation
only after its existing tenant Worker has been independently verified against
the new template, and users have obtained updated Web/static/native assets.
The OAuth-compatible existing-worker rollout uses
`scripts/rollout-existing-tenant-runtime-oauth.mjs`; it rechecks full
nonsecret binding identity (including the account-specific Workers AI project),
Control service routing and module digest before/after code-only upload, using
strict binding inheritance. Never replace it with a generic Wrangler deploy.

### Production tenant Worker rollout and independent readback (2026-11-04)

- Applied via Wrangler OAuth and strict inherited bindings:
  `node scripts/rollout-existing-tenant-runtime-oauth.mjs --all --apply --confirm-runtime-rollout`.
  **13/13 complete, 0 blocked**, with full nonsecret binding fingerprints unchanged.
- Independently rechecked without writes using:
  `node scripts/rollout-existing-tenant-runtime-oauth.mjs --all`.
  **13/13 complete, 0 blocked**; every tenant reported
  `runtimeStatus: "already_current"`, `preflightReady: true`, and
  `schemaVersion: "0054_offline_cash_settlements.sql"`.
- Existing physical tenant D1 migration 0054 and independent schema contract
  readback: **13/13 successful**, no business or purchase fixture writes.
- The full 0054 SQLite fixtures also verified store deletion and exact-store
  backup/recovery with immutable offline-cash receipt linkage: a 0053 operator
  checkpoint or completed 0054 cash transaction no longer causes an FK failure;
  other-store data and unfinished transaction state are preserved. This is
  local simulated D1 regression evidence, not an online purchase or a live
  account erasure.
- `npm run mobile:sync` and `npm run verify:distribution` were rerun after
  later admin/header changes; native source, iOS, Android, and hosted prod/test
  source asset parity passed (0 mismatches). This is source parity, not a
  TestFlight/signed-device acceptance test.
- `docs/yuwaku` production static files are distributed separately through
  public `repos-app/order-pwa` GitHub Pages, not by a push to the private
  `repos-app/izakanpai` main repository. Local `docs/yuwaku/test` is an
  intentionally unpublished regression fixture; do **not** publish it.
- Local project-test pipeline has 215 registered steps after adding the
  common native-confirmation regression. Record the full pipeline final
  outcome and public mirror publication evidence separately; never infer
  success from the count of registered steps alone.

### Final release evidence (2026-11-04 PHT)

- Fresh complete `npm test`: **215/215 ordered project steps PASS (exit 0)**.
  This is source, simulated D1 and browser testing, **not** formal real-device QA.
- Private `repos-app/izakanpai` main: commit
  `c0a0b46148d6c05ebe5653262943d69fc2dc9b4c` pushed and independently
  read back from `origin/main`; 79 changed files were included.
- Public `repos-app/order-pwa` main: commit
  `e1a1f66bd112fa1a2d1ecd82bdd68b6d91685fb3` pushed with existing
  `publish_pwa_mirror.bat`, preserving the no-publish test tree policy.
  Independent cache-bypassing HTTPS GETs of the public production
  `https://izakanpai.com/yuwaku/api.js` and `/yuwaku/admin.html` returned
  HTTP 200 and verified the new `queueOfflineCashSettlement`,
  `saveOfflineCheckoutSnapshot`, and `submitDurableCash` implementation.
- The final future-store Template Worker was deployed with version
  `306fb6e6-b65c-43a9-b324-9f830a3755ed` (including 0053 checkpoint
  account-deletion integrity fix). Existing 13 tenant Workers were then
  code-only refreshed with strict binding inheritance: **13/13
  updated_verified, 0 blocked**, all nonsecret binding fingerprints unchanged.
- An **independent final read-only** tenant Worker pass subsequently returned
  **13/13 already_current, 0 blocked, exit 0**, with every store's
  `preflightReady: true`, D1 schema `0054_offline_cash_settlements.sql` and
  unchanged per-store binding fingerprint.
- `npm run mobile:sync` and `npm run verify:distribution` after frontend
  changes: PASS, 111 files identical among canonical native source, iOS,
  Android and native output. No signed native build or TestFlight distribution
  was performed by this release.
- Realistic local SQLite D1 fixtures also found and fixed the 0053 operator
  checkpoint FK blocking full account erasure; safe erasure/retry, 0054 cash
  reconciliation parent-child links, exact-store export/copy and foreign-store
  isolation were regression-verified. No production user data deletion was run.

Official Android/Realme and iOS/TestFlight cash-in-hand, reboot, disconnection,
resend, printer/receipt, conflict and cross-device QA evidence remains separate
from the tests above.
