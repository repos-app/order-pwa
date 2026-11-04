# izakanpai AI credits: evidence-based release status

Date: 2026-10-31. This is an implementation status, not a formal mobile QA ledger.

## Verified delivery

- Platform D1: menu_document_vision and menu_document_japanese seed prompts,
  published v1. A seed version is not proof of real-world AI accuracy.
- Platform D1: account AI budget schema present; last readback had 0 claims.
- Control D1: credit receipt ownership table present; last readback 0 claims.
- Tenant D1: 13 of 13 active stores have 0048 credit tables; 1 retired skipped.
- Shared API, Control and template Worker: deployed; public API health HTTP 200.
- All 13 active tenant Workers now run the common tenant template; the nine
  onboarding tenant Workers were upgraded with strict binding inheritance,
  preserving their QA-only bindings and secrets. All 13 active tenants have
  `AI_CREDIT_FEATURE_ENABLED` set and read back; one retired tenant was skipped.
  All nine preexisting onboarding Workers also had their missing
  `PLATFORM_BILLING` binding supplied through the shared platform service
  (all existing binding names/types preserved and re-read). New tenants inherit
  the AI feature flag from the single common Provisioner binding definition.
- Public admin: order-pwa commit 61f7165, HTTP 200 with menu AI selector.
- App code: izakanpai main commits 1146277, 5d38719, 48bdbae.
- Automated related regression: 100 tests passed, 0 failed; not formal mobile QA.
- Apple: 30, 100, 300 consumable draft SKUs created and read back. Actions
  41216548501 and 41216659572.
- Apple: ja and en-US localizations (6) created and read back exact. Actions
  41217091387 and 41217151569.
- RevenueCat: the existing izakanpai POS project (`proj7fcf50db`) now has
  an `ai_credits` Offering with three App Store consumable products,
  `izakanpai.ai.credits.30`, `.100`, and `.300`. Each product is attached
  exactly once to its matching `credits_30`, `credits_100`, or
  `credits_300` package. V2 scoped key was supplied via a GitHub Actions
  secret; no key value was exported to source or logs.
  Action 41227273508 created and attached all three successfully.
  A separate read-only Action 41227444856 independently verified all three
  product/package attachments (`verified_attached`, one attachment each).
  The existing Pro Offering was not modified by either script.
- Public access to private budget route rejected: unauthenticated HTTP 404.

## Still blocked; no customer release

- Apple base territory USA prices were configured for all three consumable
  SKUs using the previously discussed USD 1.99 / 4.99 / 11.99 proposal and
  **independently read back** as matching all three price point IDs. GitHub
  Actions 41223020076 created the schedules; 41223409460 verified them.
  Regional prices are Apple equalizations and were not individually overridden.
  Apple product approval/availability and actual purchases remain unverified.
- RevenueCat product catalog / Offering setup is **complete for the App Store**.
  Actual StoreKit purchase, verified webhook fulfillment and balance credit
  remain unproven (the owner's formal QA responsibility), and a new app build
  with the purchasing UI has not been distributed.
- Google Play service account, purchasable consumables and sandbox tests
  are not available or verified. Do not claim Google purchases were tested.
- Native purchase flag is enabled **in source for the NEXT signed app build**,
  but no store package has been built or distributed. Purchase buttons render
  only with verified owner identity + exact RevenueCat offering/product +
  a working server credit wallet. Missing offering or wallet disables them.
  Inventory-credit rollout remains disabled; menu AI-credit runtime is enabled
  for all 13 active tenants.
  All 13 tenant Workers have the exact purchase SKU webhook allowlist in
  Cloudflare. This was independently confirmed through Worker settings readback
  and is also in the common Provisioner for newly created stores.
  Existing Pro billing stays intact. This does not authorize additional
  purchases or guarantee actual Cloudflare model-inference success.
- No new signed iOS/Android build was launched because unrequested GitHub
  builds are prohibited. Android ADB had zero devices at last check;
  current iOS physical QA connection was not verified.
- Formal mobile feature QA is delegated to the owner and remains zero confirmed PASS: actual AI model call,
  credit debit/refund, failed scan, duplicate webhook, cross-store attack,
  purchase, cancellation, and reconnection were not formally proven on device.
- Shared account Neuron guard is not a provider-enforced absolute cost cap;
  Cloudflare analytics may lag. Native purchase UI is enabled only in source
  for the next build, not in a signed release distributed to customers.
- The 8-page reference corpus consensus review is not blind model accuracy
  or verified production-camera performance. Always require human review.

Release gate: App Store product approval/availability, Google Play products
and RevenueCat Google app mapping, a provider-cost safety decision, a signed
app build, signed receipt and model execution evidence, and owner-performed
real-device formal QA. Do not confuse source tests with release.
