# izakanpai iOS Sandbox Native Billing Risk Review — 2026-10-17

## Result and evidence

Source under review: `mobile-app/web/billing-native.js`. The isolated iOS `billingqa` opt-in transport previously accepted a `getBillingIdentity` response containing `configured:true` with absent `customerId` or `entitlementId`; it could call `Purchases.configure({appUserID:undefined})`, risking an anonymous RevenueCat identity. A `checkToken` response could omit `storeId` because of the optional `data.storeId &&` check. The new strict regression produced **1 PASS / 2 FAIL, process exit 1 before** the fix. After the source fix, all **17 Node test cases PASS, exit 0** across `billing_native_sandbox_risk_test`, `billing_sandbox_native_transport_test`, `izk_ut_085_billing_qa_activation_test`, and `subscription_integration_test`; `git diff --check` exit 0. Test cases are local and simulated; no physical StoreKit purchase, official QA verdict, or external RevenueCat receipt verification occurred.

Now the isolated Owner transport requires an explicit `storeId=billingqa`; `checkToken` must supply a boolean owner flag and `valid:true`; a configured SDK identity requires the `appl_` key, `rc_billingqa_<UUID>` customer ID and exact `pro` entitlement. The existing production and Android API routing remains intact. No credentials, customer secrets, production config, remote DB or deployed files were changed.

## Source reviews, distinct checks

| ID | Check and observed evidence | Result |
| --- | --- | --- |
| S01 | Sandbox opt-in requires iOS, TEST_ENV true, flag true, storeId billingqa (`sandboxOwnerUrl`) | PASS source |
| S02 | Explicit HTTPS allowlisted Owner endpoint, no query or redirect accepted | PASS source + existing negative test |
| S03 | Owner endpoint fetch omits credentials and rejects redirects | PASS source + existing test |
| S04 | Owner response HTTP non-2xx throws before using payload | PASS source |
| S05 | Owner response `ok:true` and exact storeId required | PASS regression |
| S06 | `checkToken` requires valid true, owner field boolean and me object | PASS regression |
| S07 | Configured Apple key must be `appl_` identifier, Test Store `test_` rejected | PASS regression |
| S08 | Configured identity requires billingqa UUID-format customerId for exact store | PASS regression |
| S09 | Configured identity requires exact `pro` entitlement and boolean configured | PASS regression |
| S10 | Native plugin configure invoked only after these validations, supplied appUserID unchanged | PASS positive/negative mock |

## Horizontal reviews, independent impact checks

| ID | Adjacent contract checked | Result |
| --- | --- | --- |
| H01 | `src/subscriptions.js:getBillingIdentity` issues `rc_${storeId}_${crypto.randomUUID()}` identities | PASS source |
| H02 | `src/subscriptions.js` responds with entitlement from `REVENUECAT_ENTITLEMENT_ID` (expected `pro` for POS Sandbox) | PASS source; remote secret value not inspected |
| H03 | `src/billingSandboxOwnerApi.js` action allowlist includes only checkToken and getBillingIdentity | PASS source |
| H04 | Owner API calls Tenant RPC with hard-coded iOS platform | PASS source |
| H05 | Native `sandboxOwnerUrl` Android and production opt-in invalid scenarios | PASS existing test |
| H06 | Regular production iOS and Android still call `API.post` | PASS existing test |
| H07 | Mock iOS and Android purchase initialization/owner-only billing | PASS existing activation test |
| H08 | Subscription integration contracts (webhook, free, legacy and active Pro) | PASS existing integration test |
| H09 | Mobile subscription standard POS entitlement `pro` and Apple/Google prefix split | PASS standard source review |
| H10 | Store catalogue derives localized prices from Offering product.priceString; no hard-coded yen/peso in billing UI | PASS source review; real JP/PH StoreKit price not verified |

## Remaining constraints

Sandbox Owner endpoint routing and usable Owner login remain external readiness blockers. There is still **0 official Apple Sandbox PASS and 0 official Apple Sandbox FAIL** from this change. `Purchases.restorePurchases()` displays a local SDK result, while Pro authorization remains server-side; separate end-to-end confirmation is still necessary. The current price and trial eligibility require real App Store locale/transaction validation; this code does not independently certify them. No commit, push, deploy, IPA creation, official runner action, device claim or production changes.
