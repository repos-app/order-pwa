# iOS billing Sandbox native transport — local only (2026-10-17)

## Result and activation

`mobile-app/web/billing-native.js` now supports a strictly optional read-only owner transport. Existing production and Android continue to call `API.post('checkToken')` and `API.post('rpc', getBillingIdentity)`. The extra mode requires **all**: `APP_CONFIG.TEST_ENV === true`, `APP_CONFIG.BILLING_SANDBOX_OWNER_TRANSPORT === true`, Capacitor native platform `ios`, `API.currentStoreId() === 'billingqa'`, and the fixed `APP_CONFIG.BILLING_SANDBOX_OWNER_API_URL === 'https://izakanpai-billing-sandbox-owner.izakanpai.workers.dev/owner'`. The committed `mobile-app/web/config.js` defines none of these opt-in keys, so this mode is **off**. Test-only config must be generated through an explicitly isolated QA packaging process, including a valid test auth origin/audience; it must not be enabled by URL parameters, localStorage, or server-supplied untrusted flags.

Calls are exclusively POST `{action:'checkToken'|'getBillingIdentity',token,storeId:'billingqa'}`; no proxy, login, or arbitrary RPC. HTTPS URL is an exact allowlisted string. `credentials:'omit'`, `cache:'no-store'`, and `redirect:'error'` avoid cookie/redirect ambient authority. Both HTTP errors and unexpected response content prevent RevenueCat initialization. Billing identity requires SANDBOX environment and `appl_` SDK key; Test Store is not accepted as Apple Sandbox. Ordinary role restrictions and purchase UI state continue unchanged.

### Known blockers (not ready for device/IPA)

* Isolated Owner API URL above is a proposed fixed hostname for an eventual dedicated Worker and has **not** been verified or deployed. Before preparing a QA IPA, the provisioning owner must confirm the actual isolated hostname and update the allowlist and test-only config together.
* `src/billingSandboxOwnerApi.js` currently lacks CORS preflight `OPTIONS` handling and `Access-Control-Allow-Origin`. Browser/WebView `fetch` with JSON and Capacitor local origin will require preflight, therefore real frontend-to-Owner API transport remains **BLOCKED** until the separate Owner API owner implements an exact-origin allowlist, or an approved native HTTP transport is used. The owner API source belongs to another worker; no change made here.
* A real test-audience `billingqa` owner login/session plus `store_owners` registration and `settings` permission is still required; ordinary production credentials are invalid for the isolated Worker. Existing `API.pageReady` and environment mismatch checks also require coherent test-specific build config (`AUTH_STORAGE_PREFIX`, database prefix, API_URL); merely flipping the billing transport flag is insufficient.
* CI/`codemagic.yaml` was reviewed but not edited. No IPA created/uploaded, no Apple interface or iPhone touched, no remote deployment, commit, push or formal QA action. Source-only tests are not Apple StoreKit purchase verification.

## Actual validation

`node --test test/billing_sandbox_native_transport_test.mjs`: 4/4 PASS, exit 0. Cases verify unchanged normal iOS/Android routing; authorized opt-in action payload; fail-closed misconfigured/production/Android/wrong-store mode; denial/cross-store/Test Store rejection. Existing `test/izk_ut_085_billing_qa_activation_test.mjs` was updated only to reflect the helper refactor in its source assertion, preserving other expectations. `node --check mobile-app/web/billing-native.js` exit 0. `git diff --check` exit 0. Read-only call mocks cannot prove CORS behavior or a live authenticated response.

## Self-review S01–S10 (separate source concerns)

| ID | Actual source inspection | Finding |
| --- | --- | --- |
| S01 | `sandboxOwnerUrl` platform check | only `ios` selected |
| S02 | opt-in flag and `TEST_ENV` equality | explicit booleans required |
| S03 | `API.currentStoreId()` comparison | exact `billingqa` tenant selected |
| S04 | anchored HTTPS endpoint regex | caller cannot change target or add URL query |
| S05 | `requested && !url` branch | malformed opt-in fails closed rather than falling back |
| S06 | original `API.post` branch | existing action names and platform argument preserved |
| S07 | Owner API body construction | only named read actions, fixed store identifier, token |
| S08 | fetch options | cookies omitted, cache disabled, redirects refused |
| S09 | response branch | HTTP and `{ok:false}` rejected |
| S10 | identity schema and SDK key | requires SANDBOX and Apple `appl_`, Test Store refused |

## Horizontal review H01–H10 (distinct interactions)

| ID | Inspected interface | Outcome |
| --- | --- | --- |
| H01 | `mobile-app/web/config.js` defaults | no transport opt-in; production remains normal |
| H02 | `mobile-app/web/api.js` environment guard | test app requires coherent test config; production prefix still present |
| H03 | `mobile-app/web/api.js` token audience | test token has independent audience requirement |
| H04 | `mobile-app/web/subscription.html` page | billing-native entrypoint remains unchanged |
| H05 | `src/billingSandboxOwnerApi.js` action dispatcher | named actions and `/owner` POST contract agree |
| H06 | `src/billingSandboxOwnerApi.js` CORS response | **BLOCKER:** no OPTIONS/preflight allowlist |
| H07 | `src/billingSandboxOwnerApi.js` owner authorization | dedicated owner record/settings/privileged role required |
| H08 | `test/izk_ut_085_billing_qa_activation_test.mjs` integration | legacy API tests maintained through refactor |
| H09 | `codemagic.yaml` iOS build path | no dedicated sandbox configuration in this change; IPA not built |
| H10 | `test/billing_sandbox_native_transport_test.mjs` negative surfaces | mocked production/Android/wrong-store/forged URL denied |

All listed reviews are local source-level observations; the CORS, remote endpoint, packaging, and live owner identity limitations are explicitly unresolved.

## 22:xx PHT — isolated iOS build-preparation gate

Added `scripts/qa-ios-billing-sandbox-build-prep.mjs` and `test/qa_ios_billing_sandbox_build_prep_test.mjs`. Existing `npm run mobile:prepare` calls `scripts/build-mobile-assets.mjs`, which **deletes and recreates `mobile-dist`**. `npm run mobile:sync` calls that same preparation followed by Capacitor sync, so neither may be run on the shared production/native working tree for Sandbox packaging. The new script copies only `mobile-app/web` to an isolated destination after all checks; it does not execute either npm command and does not edit the tracked production config, `mobile-dist`, `ios`, or installed native app.

The default command `node scripts/qa-ios-billing-sandbox-build-prep.mjs` emits JSON and exits 1 with `ready:false`, including the verified blocker `owner_endpoint_unrouted`. `wrangler.owner.toml` explicitly sets `workers_dev=false` and has no route. Even a caller asking for `--stage` must provide an exact dedicated owner URL, distinct test login API URL, and `--probe`. The script also checks the repo's owner Tenant binding, explicit owner enablement, frontend transport, production config baseline and shared auth guard. It fails closed **before reaching the network or writing any files** when a prerequisite is absent. The exact proposed login URL is deliberately not trusted as deployed proof; it remains a future integration contract to be coordinated with Owner API owners. The live gate tests unauthenticated HTTP status before staging and refuses redirects; no token or credentials are sent. On future verified readiness it rewrites a temporary copy of `config.js` for test audience, isolated storage/database prefixes and the Sandbox frontend switch, and atomically renames the temporary directory into a caller-selected new destination outside protected paths.

New dedicated tests: **3/3 PASS exit 0** — currently unrouted Owner blocks readiness, malformed/non-Sandbox endpoint combinations fail, and failed preparation leaves production `config.js` byte-identical with no generated stage directory. `node --check` exits 0. Deliberately blocked CLI `node scripts/qa-ios-billing-sandbox-build-prep.mjs`: **exit 1, `ready:false`, `staged:false`** (expected gate outcome). A successful stage and IPA are **not verified**, pending a reachable test login proxy, a dedicated Owner API endpoint plus CORS handling, real `billingqa` test credentials and packaging ownership. No build, sync, deploy, upload, device or official QA performed.

Additional build-gate source reviews (B01–B10): B01 inspected `mobile:prepare` destructive output behavior, B02 confirmed `mobile:sync` shares it, B03 verified isolated copy source, B04 inspected test-only replacement keys, B05 verified strict owner hostname, B06 verified distinct login hostname, B07 verified owner `workers_dev=false`, B08 verified no staging on blocker, B09 verified protected output paths, B10 verified temporary staging cleanup and atomic rename. All observations are source-level; successful isolated build and remote reachability remain PENDING.
