# Sandbox Owner/login gateway gap — source preparation only

## Prepared

- `src/billingSandboxLoginGateway.js`: fixed `billingqa` login/refresh/logout forwarder, backed by private `TENANT` and `OWNER` service bindings. `login`/`refresh` return tokens only after the existing Owner worker confirms active owner and sandbox billing identity. Uses existing Tenant authentication, password hashing, rate limiting and D1 session rotation. Discards arbitrary action/tenant selection. Does not log credentials or tokens.
- `.tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml`: disabled (`SANDBOX_LOGIN_GATEWAY_ENABLED=0`), `workers_dev=false`, preview disabled and no routes. No deploy or remote change.
- Existing Owner worker `src/billingSandboxOwnerApi.js` stays private and delegates authorization to `src/index.js`/`src/gasApi.js`/`src/subscriptions.js`.

## Blocking issues before external use

1. **Owner response contract mismatch — resolved in local source only:** `mobile-app/web/billing-native.js` requires top-level `storeId === 'billingqa'` for both actions. `src/billingSandboxOwnerApi.js` originally omitted it for `getBillingIdentity`; the setting-focused continuation added it to the success response. **Not deployed; formal validation is owned by the separate QA chat.**
2. **No tested public app path:** Login gateway configuration deliberately has neither public route nor enabled flag. Owner URL in `billing-native.js` is hardcoded to `https://izakanpai-billing-sandbox-owner.izakanpai.workers.dev/owner`, yet `wrangler.owner.toml` sets `workers_dev=false`. A separate controlled test-only external ingress and corresponding staged config wiring require explicit integration and live reachability proof. Never embed Cloudflare Access service tokens or other secrets inside the IPA.
3. **No credential fixture:** Existing `billingqa-employee` has no usable login/hash; use approved existing credential and DPAPI workflow once authorized. Do not regenerate secrets via blocked bootstrap method. `email_verified_at` and exact owner/employee association need readback.
4. **Unverified authentication:** This gateway has not run offline or remote tests, so no readiness/PASS claim. Before exposure, confirm login failure rate limits reflect original client IP (service binding generally does not preserve the original `CF-Connecting-IP` automatically), refresh token replay semantics, owner denial and session revocation, CORS on iOS, origin spoofing limitations, and public endpoint abuse protection. A Capacitor `Origin` check alone is insufficient authorization for internet-facing use.
5. **Safe staging gate:** Existing `scripts/qa-ios-billing-sandbox-build-prep.mjs` must continue fail-closed until actual isolated HTTPS owner endpoint and test login endpoint are reachable with correct readback. No IPA build, QA state changes, production routing, deploy, commit or push performed.

## Source evidence

- `src/index.js` lines 147–182: common login/refresh/logout/checkToken, D1 session lifecycle; lines 1664–1746: RPC routing and store permission checks.
- `src/gasApi.js` lines 966–1001: existing compatible login/refresh/checkToken paths.
- `src/subscriptions.js` lines 11–82: active Owner employee join, `appl_` SDK key requirement, sandbox billing identity.
- `src/billingSandboxOwnerApi.js` lines 22–63: sandbox gate, checkToken then billing RPC, strict iOS Origin.
- `.tenant-provisioner/billing-sandbox/wrangler.tenant.toml`, `wrangler.owner.toml`, `wrangler.ingress.toml`: isolated bindings; ingress remains webhook-only.

**Post-audit configuration update:** the existing Native `API.post('login', {storeId,loginId,pass})` sends `POST /?api=1` rather than `/login`; the local disabled gateway now accepts that exact canonical protocol for login/refresh/logout only. Unknown actions and cross-store requests remain denied. It is still private and disabled. Full chronology and release blockers: `docs/IZK_IOS_BILLING_SETTINGS_ONLY_HANDOFF_20261017.md`.

Status: prepared source only, not deployed or tested; formal QA increments 0.
