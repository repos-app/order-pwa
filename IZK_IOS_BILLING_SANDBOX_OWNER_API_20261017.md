# Apple Sandbox Owner API — isolated local staging (2026-10-17)

## Outcome / boundaries

Added `src/billingSandboxOwnerApi.js` and `test/billing_sandbox_owner_api_test.mjs` only. This is a **new, unbound, undeployed** Worker entrypoint; existing RevenueCat webhook ingress remains webhook-only. No current public owner URL, real logged-in sandbox owner session, iPhone purchase or official QA PASS exists.

The adapter accepts `POST /owner` with `{ "action": "checkToken" | "getBillingIdentity", "token": "<existing sandbox access token>", "storeId": "billingqa" }` (storeId may be omitted). It refuses every other action, request path or method. It is disabled unless **all three** environment conditions hold: `AUTH_ENVIRONMENT=test`, `TENANT_ID=billingqa`, `SANDBOX_OWNER_API_ENABLED=1`. It requires the `TENANT` service binding to point exclusively at `izakanpai-billing-sandbox-tenant`. Do not expose a wildcard/main app API route.

For authentication the adapter calls the existing `src/index.js` direct `checkToken` (without `?api=1`), which checks signature, audience, current employee, and live session. It checks the returned store and known privileged role. **Both exposed actions** then call only the `src/gasApi.js` RPC `getBillingIdentity` with iOS fixed as platform; this prevents an admin who is not the registered owner from receiving a successful checkToken owner verdict. That RPC additionally checks `settings` permission and `src/subscriptions.js` registered active `store_owners` row; only a SANDBOX-marked response is accepted. The `checkToken` action returns `{ok:true, valid:true, me:{accountOwner:true}, role, storeId}` *after* RPC confirmation without exposing SDK key; billing identity returns the billing data only on its named action. Production sessions cannot pass `test`-audience verification in a separately secreted test Tenant. The adapter deliberately has no `login` action, no raw SQL/D1 binding, and no caller-selected RPC or proxy target.

## Acceptance and remaining blocker

Before activation, provision an **actual test-owner employee** in isolated `billingqa` Tenant D1, with active `store_owners` record, verified owner email, settings permission, separate `AUTH_SECRET`, and valid active test session; use existing login/session creation through strictly private isolated tenant administration. No plaintext credentials in repository. Confirm exact tenant Worker binding and isolated D1 IDs against the existing billing sandbox manifests. Only after a human-coordinated deployment of this **separate** restricted entrypoint and the expected iOS test build should tests use the endpoint. **No deploy in this worker task.** The bootstrap of that owner session is still a blocker: adapter cannot mint or authenticate new users, by design.

**Frontend integration remains PENDING:** `mobile-app/web/billing-native.js` currently calls `API.post('checkToken')` and `API.post('rpc',{fn:'getBillingIdentity',...})` through the ordinary application API. Although the adapter's owner-check result now includes its required `valid/me.accountOwner` fields, this separate Worker exposes `/owner` and a named `getBillingIdentity` action, so an unmodified iOS UI cannot use it. A coordinated *sandbox-only* native API transport mapping and isolated owner login/session provisioning are needed before E2E. Do not change the existing public `billingSandboxIngress.js`; do not add an Owner action to webhook ingress, update production routes, use production D1 or claim Apple purchases. The device/remote tests must check invalid token, other-store token, revoked employee, ordinary staff, owner without settings permission, owner missing active `store_owners`, test vs production audience, and actual API readback. Approval and iPhone exclusive claim are separate.

## Evidence

Before implementation: `node --test test/billing_sandbox_owner_api_test.mjs` **exit 1**, `ERR_MODULE_NOT_FOUND` for the intentional missing adapter (setup-level red; it does not establish behavior-level red). After implementation and additional owner-check hardening: **11/11 PASS exit 0**, same command. `node --check src/billingSandboxOwnerApi.js` exit 0 and `git diff --check` exit 0 before final test additions. All tests are offline mocks: neither a remote OAuth/owner login nor a live session was demonstrated.

## S01–S10 source self-review (distinct checks)

| Pass | Inspection | Outcome |
| --- | --- | --- |
| S01 | Read adapter environment conditions | test audience exact match and enable switch required |
| S02 | Inspect tenant selector and upstream URL construction | fixed `billingqa`, no caller-selected backend |
| S03 | Enumerate accepted actions | exactly two readonly-intent actions; billing identity may create billing customer via existing RPC |
| S04 | Inspect HTTP method and path handling | `POST /owner` only |
| S05 | Inspect request body parsing | JSON error and 4096-byte limit enforced |
| S06 | Trace missing/oversized tokens | refused before forwarding |
| S07 | Trace forged caller store | mismatch denied prior to Tenant fetch |
| S08 | Trace returned session store | backend store must match, otherwise 403 |
| S09 | Trace returned role and registration | allowed privileged labels AND live registered owner RPC required for both actions |
| S10 | Trace upstream errors/environment | service failures 503, no production-marked billing output |

## H01–H10 horizontal integration review (distinct entrypoints)

| Pass | Path examined | Outcome |
| --- | --- | --- |
| H01 | `src/billingSandboxIngress.js` ingress route | webhook-only, unchanged |
| H02 | isolated ingress `wrangler.ingress.toml` | bound to Control only, unchanged |
| H03 | isolated Tenant `wrangler.tenant.toml` | `TENANT_ID=billingqa`, `AUTH_ENVIRONMENT=test`; unchanged |
| H04 | isolated Control `wrangler.control.toml` | Control owns isolated DB, unchanged |
| H05 | `src/index.js` direct `checkToken` | canonical current-session validation, direct `/` path |
| H06 | `src/gasApi.js` compatibility `checkToken` | returns `valid/me`; avoided to prevent wrong response contract |
| H07 | `src/gasApi.js` RPC dispatch | verified auth and `settings` permission |
| H08 | `src/subscriptions.js` billing identity | active registered owner row is mandatory |
| H09 | `src/auth.js` audience signing | `test` audience and test-specific secret are required by existing core |
| H10 | negative tests for binding/method/store/role/env | test suite rejects bad cross-surface conditions without D1 mutation |

All S/H rows describe **source-level reviews only**. Live Worker binding, account owner fixture and physical Apple StoreKit purchase remain PENDING.

## 22:39 PHT remote owner preflight and unrouted Worker config

Read-only remote queries against **only** `.tenant-provisioner/billing-sandbox/wrangler.tenant.toml` / `izakanpai-billing-sandbox-tenant-db` returned `stores=1`, active `employees=1`, active `store_owners=1` for the fixed `billingqa` store. A second aggregate join found **one** active owner whose employee role meets the wrapper allowlist. Neither query returned a person's identifier, name, email, password, or row content. Both Wrangler D1 commands exited **0**, `rows_written=0` / `changed_db=false`.

Remote `wrangler secret list --config .tenant-provisioner/billing-sandbox/wrangler.tenant.toml --name izakanpai-billing-sandbox-tenant` exited **0** and listed only `CONTROL_SERVICE_SECRET` and `REVENUECAT_IOS_PUBLIC_SDK_KEY` by name. **`AUTH_SECRET` is absent** in that remote Worker secret list. The actual `src/index.js` employee login invokes `issueSession(..., env.AUTH_SECRET, ...)`; the owner wrapper cannot authenticate a real employee or mint a session itself. Existing owner employee/owner-row linkage is present, so do not create a duplicate employee or circumvent the canonical login. A functional owner-session smoke is **BLOCKED** until a separately isolated test `AUTH_SECRET` exists and canonical session issuance and readback prove success. Store credential values and access tokens only in an approved secret channel; never put them into source, docs, terminal output, or handoff.

Added `.tenant-provisioner/billing-sandbox/wrangler.owner.toml` as a distinct Owner API Worker definition: fixed billingqa test vars, exactly one `TENANT` service binding to the sandbox Tenant; `workers_dev=false`, `preview_urls=false`, no custom route, public login, D1 binding, or cron. `npx wrangler deploy --dry-run --config .tenant-provisioner/billing-sandbox/wrangler.owner.toml --outdir .tenant-provisioner/billing-sandbox/build-owner-dryrun` exited **0** and displayed the expected service/vars. This is **local dry-run only**; it did not deploy or create a public endpoint. New tests check the config and that `/owner` refuses login attempts without calling the Tenant. `node --test test/billing_sandbox_owner_api_test.mjs` exited **0**, **13/13 offline PASS**. `git diff --check` exit **0**. The dry-run creates local build output under the isolated sandbox directory; it is not production deployment evidence.

### Additional 10 source and 10 horizontal review checks (22:39)

| Check | Actual inspection / result |
| --- | --- |
| S01 | New config `main` refers to exact existing owner entrypoint: PASS |
| S02 | Config `workers_dev=false`: PASS |
| S03 | Config `preview_urls=false`: PASS |
| S04 | Config has no route/custom domain: PASS |
| S05 | Config excludes any direct D1 binding: PASS |
| S06 | Config contains only fixed `test` audience: PASS |
| S07 | Config contains only `billingqa` tenant ID: PASS |
| S08 | Config has named enable switch `1`: PASS |
| S09 | Config has exactly one sandbox Tenant service binding: PASS in dry-run bindings |
| S10 | Owner adapter rejects `login` action without upstream call: PASS in offline regression |
| H01 | Remote sandbox Tenant metadata target checked by named Wrangler config: PASS |
| H02 | Remote D1 scoped store count checked without customer row readback: PASS |
| H03 | Remote D1 active employee aggregate checked: PASS |
| H04 | Remote D1 active store owner aggregate checked: PASS |
| H05 | Remote D1 actual owner/employee role join checked: PASS |
| H06 | Remote Tenant secret name inventory checked: **BLOCKED (`AUTH_SECRET` absent)** |
| H07 | `src/index.js` login/session issuance references `env.AUTH_SECRET`: PASS source trace |
| H08 | `src/index.js` `checkToken` validates live employee session: PASS source trace |
| H09 | `src/gasApi.js` canonical login and `checkToken` paths independently inspected: PASS source trace |
| H10 | `src/subscriptions.js` `requireBillingOwner` joins active owner to active employee: PASS source trace |

All 20 checks reflect distinct documented inspections. H06 blocks an end-to-end verified session; no real session or official Apple Sandbox QA result is claimed. Deployment, owner token issuance, private transport attachment, native integration and signed iOS purchase flow remain pending separate coordinated work.

### Additional canonical login fixture blockers and CORS fix

Remote aggregate of the **existing active owner employee**: owner rows `1`, nonempty `login_id` `0`, nonempty `password_hash` `0`, exit **0**, no write. The original isolated `seed-tenant.sql` intentionally inserted this employee without login credentials. An additional remote query testing `store_owners.email_verified_at` failed with **`SQLITE_ERROR no such column: o.email_verified_at`**; that query did not mutate rows. `src/loginAuth.js` relies on precisely this column (and demands a nonempty verified timestamp when an owner exists), so a test signing secret by itself will **not** unblock real login. A private, tenant-scoped fixture migration must first add and verify that schema field where missing, securely generate/set a password hash and login ID on the **existing** owner employee, and mark the synthetic owner verified; then canonical login and checkToken readback can validate a session using a separately generated isolated test `AUTH_SECRET`. No changes to DB or credentials were made in this worker task. Never disclose the generated password or access token in terminal output.

Native JSON requests need a WKWebView CORS preflight. Both `capacitor.config.json` and `ios/App/App/capacitor.config.json` specify `server.hostname=app.izakanpai.local` without a custom iOS scheme. The owner adapter permits `OPTIONS /owner` for exactly `capacitor://app.izakanpai.local`, `POST` and `content-type` only. It never emits wildcard origin or `Access-Control-Allow-Credentials`; the speculative `capacitor://localhost` and `ionic://localhost` were removed. Actual WKWebView runtime Origin still requires real-device confirmation. The Owner wrapper has no public login. Offline CORS/invalid-origin regression is separate from remote E2E proof.

### Bootstrap handoff after primary migration

Primary operator is independently backing up the isolated billingqa D1 and applying existing additive migrations `0016_login_rate_limits.sql`, `0017_email_verification.sql`, `0020_auth_sessions.sql`; primary also registered isolated Tenant `AUTH_SECRET`. **Do not repeat either operation.** After its schema readback, bootstrap only the existing synthetic billingqa owner employee, using the active `store_owners` employee relation as an exact store-scoped update target. Generate a distinct nonproduction login ID and strong random password privately; derive `password_hash` using canonical `makePasswordHash` (`src/auth.js`), never print or persist plaintext credentials in repository or logs. Store only the derived hash and login ID on the existing employee, verifying one row changed. Since this is an isolated synthetic QA owner, set that owner's `email_verified_at` to a verified timestamp through narrowly scoped D1 update; never do this for real accounts. Verify aggregated counts for nonempty login ID, password hash, and email_verified_at are each exactly one. Do not add duplicate employees or owners.

Private login smoke after fixture setup: use existing direct Tenant `login` internally with `storeId=billingqa`, verify v3 access token issued; call canonical `checkToken` and verify store, role, current session; call Owner API `checkToken` then `getBillingIdentity` with iOS fixed and verify `environment=SANDBOX` and Apple `appl_` SDK key presence. Test invalid/foreign-store/non-owner/revoked credentials and log out via existing session action. Never log token, password, SDK key, hash, or actual login ID. Owner Worker remains unrouted, so service-binding-only smoke needs a private harness. **This is a staged plan; no actual login has yet been performed in this worker task.**

### Follow-up status: migration ready, fixture bootstrap blocked

Primary agent confirmed fresh isolated SQL backup, additive migrations 0016/0017/0020 applied, and isolated Tenant `AUTH_SECRET` registered. Subsequent **read-only remote** Wrangler query exited 0 and confirmed `store_owners.email_verified_at` exists, `login_rate_limits`/`auth_sessions` exist (two required tables), and the exact existing billingqa owner employee still has missing login/password fields. No duplicate migration or secret registration was attempted. A prepared one-shot DPAPI bootstrap implementation was blocked at the tooling safety gate **before** file creation and execution. No credential or hash was produced, no remote DB update occurred, and no real login/session was confirmed.

Minimal safe Owner iPhone access plan: retain canonical Tenant authentication and its existing session issuance, refresh rotation, revocation and rate limiting. First bootstrap only the synthetic owner after private DPAPI credential preparation, prove canonical login plus owner identity by private service binding, and only then consider a separate tightly controlled sandbox Owner transport. An optional `login` or `refreshSession` owner action must allow **only** the fixed `billingqa` synthetic employee, verify the active `billingqa-owner` registration, preserve generic authentication failure responses and existing throttle, forbid arbitrary RPC forwarding, and restrict its request Origin to the actual Capacitor host. Public reachability additionally requires an explicit deployment and threat review; current Owner Worker has `workers_dev=false` and no route, so an iPhone cannot reach it. Source and offline tests cannot be represented as a successful live device login.
