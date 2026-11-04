# izakanpai POS — AI credits implementation and release gate (2026-10-31)

## Backend deployed; customer AI-credit feature still disabled

As of 2026-10-31 the common backend, Platform/Control and tenant DB
schemas are deployed; the customer credit feature remains disabled pending
approved store prices, RevenueCat/Play setup and genuine purchase QA. Apple
has three unpriced consumable drafts with bilingual draft metadata. See the
release-status document for evidence. Source implementation and a successful
deployment do not imply customer availability or formal mobile QA PASS.

Credit wallet is scoped to authenticated `store_id` and shared by all authorized
employees of a store. The primary billing owner must initiate App Store/Play
payments via existing verified RevenueCat customer identity. No employee or
client can submit a balance adjustment. All platform sources must remain
server-side verified.

- Free: one-time 3 promotional credits. Existing Free 10-menu-item limit stays
  enforced at actual registration. Pro/legacy: 30 promotional credits per
  **UTC calendar month** while entitled. These credits do not roll over.
- Paid credits: 30/100/300 packs, balance never expires. Credits applied only
  after validated RevenueCat `NON_RENEWING_PURCHASE` webhook. Refund/cancel
  using the same transaction reverses unspent credits, or produces a **paid-
  only** debt to offset future paid top-ups if funds were consumed. Ledger
  identity is environment + transaction ID and store ID.
- Each menu image/page: 1 credit including 2-pass Japanese inference. Consume
  only on successful extraction. Failure returns the reserved credit; all
  attempts are tracked with a stable client-generated request ID and image
  hash. Identical retries replay saved output; changed-image retries with
  same ID are rejected. All candidates require review; no automatic menu DB
  registration.
- Menu import uses local, bundled PDF.js to rasterize up to 15 source pages
  (no paid PDF converter). Images and PDFs use the SAME page-image backend.
  The user must explicitly consent to credit usage; on low balances, only
  available page credits can run. A Free store stops AI inference once the
  first 10 recognized items have been found and exposes the first 10 items
  only. This avoids paying AI for unnecessary subsequent pages. The original
  existing 10-item server-side Free limit remains authoritative.
- Before registration, compare recognized products against the current
  authenticated store's menu. When at least 50% of the extracted names
  match registered names at the strict per-product similarity threshold,
  warn about duplicate documents. A matched individual item shows a
  choice to overwrite using the existing editor's `oldName` contract,
  create another item, or cancel. New items cannot bypass the Free count.
- After scanning, show recognized products, missing/uncertain text and prices,
  excluded section titles and model warnings. **Measured accuracy** is the
  percentage of human-reviewed items explicitly marked Correct. Before any
  reviews it is `not measured`: invisible missed source items cannot be
  counted without a reference list. AI's own confidence is not a measured
  correctness percentage.
- `src/aiCredits.js` and `migrations/0048_ai_credit_wallet.sql`: atomic
  reserve/commit/refund/paid grant; D1 operations/ledger; no overdraft, no
  double purchase grant, operation state immutability, account erasure support.
- `src/subscriptions.js`: attaches consumable webhook fulfillment **after**
  existing signature, account/tenant routing and environment checks, with
  separate subscription handling left intact. Product allowlist from
  `AI_CREDIT_PACK_PRODUCT_IDS` must be explicitly configured; otherwise
  purchases cannot grant credits.
- `control-plane/0011_ai_credit_receipt_claims.sql` and
  `src/revenueCatCreditOwnership.js`: once a signed consumable transaction
  has been bound to a physical tenant, the same storefront/environment
  transaction cannot mint credits at a different store, even if a different
  RevenueCat webhook event ID is received. Tenant route changes fail closed.
- Both `src/index.js` and `src/gasApi.js` (native + GAS-compatible protocol)
  route `getAiCreditWallet` (settings permission) and
  `analyzeMenuImageWithCredits` (menu_editor permission). All operations use
  the signed access token's store ID, not client request `storeId`.
- `src/aiCreditRuntime.js` is the single shared reserve/budget/commit/refund
  transaction path. The preexisting inventory photo AI can use the same
  wallet when explicitly enabled; it requires the updated client's visible
  `ai-credit-v1` consent and rejects silent charging of older clients.
  Background translations retain their existing system quota and are not
  separately charged to the customer without a decided price/consent model.
- `src/aiPromptSettings.js` / `platform-plane/0005_menu_document_prompt_seeds.sql`
  add `menu_document_vision` and `menu_document_japanese` to the EXISTING
  admin prompt selector. Reuse inventory's stored draft, real-image test
  approval, publish, history and rollback. Tenant inference uses ONLY the
  signed internal platform relay's published prompt and records both versions
  in the result. No per-store prompt copies.
- `src/aiCreditBudgetWorker.js` and `platform-plane/0004_ai_credit_budget.sql`:
  authenticated Cloudflare account-wide guard; fail closed if unavailable;
  reserve 250 estimated Neurons per menu image, stop at a conservative
  8,500-Neuron daily estimate for the **shared account**.
  This is now served by the EXISTING `src/hybridPublicRouter.js` internal
  platform service endpoint, with the already configured `PLATFORM_SERVICES`
  binding, `CONTROL_SERVICE_SECRET`, `CLOUDFLARE_ANALYTICS_TOKEN`, and
  `izakanpai-platform` D1. No extra Worker/secret is required.
  The GraphQL query matches the existing admin dashboard's Cloudflare
  `aiInferenceAdaptiveGroups.sum.totalNeurons`, counting all AI models rather
  than estimating image usage from text token counts. This protects against
  omitting image-only AI workloads.
- `mobile-app/web/subscription.html` and `billing-native.js`: bilingual
  balance/credit packs, storefront-supplied prices, single-attempt IAP,
  explicit pending-until-server-confirmation; and config switch
  `AI_CREDIT_PURCHASES_ENABLED:false` by default. No simulated prices or
  client-authorized grants.

## Verify the actual completion state

This is source implementation with offline SQLite/HTTP mocked backend tests,
not a live payment completion. Until the following requirements are met,
the new AI action is disabled by default and purchased credit packs cannot
be offered. Existing Pro subscription purchases remain unaffected.

1. Check the current product IDs and prices with owner, then create real
   Apple **consumable** IAPs and Google **one-time consumable** products for
   the approved SKUs: `izakanpai.ai.credits.30`, `.100`, `.300`. The product
   price/currency comes from the current store, never from app source.
2. In RevenueCat, create a separate offering with identifier `ai_credits`,
   with exact platform-appropriate packages mapped to those product IDs.
   Reuse existing platform-specific public SDK keys, billing customer ID,
   webhook authentication and store-to-customer routing. Do **not** configure
   RevenueCat In-App Currency for the same SKU if maintaining the server-side
   custom wallet, as it would introduce another credit ledger.
3. Deploy the additive physical tenant migration 0048 through existing
   supervised tenant migration process. The generated migration bundle in
   `src/tenantProvisioningMigrations.generated.js` includes this schema.
   Also apply platform-plane 0004 to **existing platform D1**, and Control
   migration 0011 to the **existing Control D1** before enabling any credit
   pack. A missing cross-store transaction registry must block payments.
4. Deploy the updated existing hybrid Platform Worker with the private
   `/internal/ai-credit-budget/reserve` route. Test through the current
   `PLATFORM_SERVICES` service binding and existing control secret;
   DO NOT provision a duplicate billing Worker. Measure and negotiate
   safe Neuron limits across **all** Workers AI apps using
   the same Cloudflare account. Account analytics may lag; the 8,500-Neuron
   guard is NOT an absolute zero-billing guarantee without a provider-level
   enforceable spend cap.
5. Configure the **exact** approved
   `AI_CREDIT_PACK_PRODUCT_IDS` allowlist. In sandbox only, turn on
   `AI_CREDIT_FEATURE_ENABLED=true`; keep the native
   `AI_CREDIT_PURCHASES_ENABLED:false` until end-to-end StoreKit/Play test.
6. Run iOS TestFlight Sandbox and Google Play licensed test flows including
   purchase, webhook validation, store switching, duplicate webhook, refund
   after usage, reopen after interruption, offline queue, renewal and expiry,
   owner-only purchase, concurrent employees, and actual credit consumption.
   Assert external receipts and true D1 state; offline PASS is not formal QA.
7. Release only after signed production account/tenant binding readiness,
   cost guard and store purchase confirmation PASS. Any blocker leaves the
   feature disabled; no unsupported claim of live launch.

## Local commands (no build, deploy or store billing)

```powershell
node --test test/ai_credit_wallet_sqlite_test.mjs test/ai_credit_budget_and_api_test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs
node --test test/ai_credit_control_claim_test.mjs
node --check src/aiCredits.js
node --check src/aiCreditActions.js
node --check src/aiCreditBudgetWorker.js
node --check mobile-app/web/billing-native.js
node scripts/build-tenant-provisioning-migrations.mjs
git diff --check
```

## Not implemented or proven yet

- Production migrations, shared Worker deployment and Apple consumable draft
  creation are completed. A signed build containing this UI, approved IAP
  prices, RevenueCat/Play offering, and actual Sandbox payment remain unproven.
- Existing inventory AI continues to run under its original quotas by
  default. Opt-in credit consumption is implemented behind the separate
  server/client inventory feature flags and explicitly blocked for old
  clients without credit consent. Automatic background translation is not
  monetized by credits until the operator explicitly sets its economics.
- PDF rasterization and editor review are SOURCE-implemented, and a local
  headless Chrome UI path loaded an actual PDF and verified duplicate popup,
  free limit and correctness review. Real Android/iOS native camera,
  TestFlight, offline interruptions and live model execution remain UNTESTED
  on the new app integration; do not call them formally PASS.
- Existing unrelated status/CI modifications are not touched and are not
  treated as this feature's PASS.
- Control's transaction-owner record persists with the retired tenant route
  to prevent a previously consumed receipt from being reused after account
  erasure. Assess data-retention/legal policy before general availability.
