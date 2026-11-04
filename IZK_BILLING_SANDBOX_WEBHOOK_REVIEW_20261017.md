# RevenueCat Apple Sandbox Webhook independent source audit (2026-10-17)

Scope: local source and synthetic offline tests only. No RevenueCat delivery, real Apple transaction, remote D1 mutation, deploy, official QA, commit or push. Existing unrelated dirty changes preserved.

## Verified topology

`billingSandboxIngress.js` exposes only `POST /webhooks/revenuecat`, caps bodies at 65536 bytes and forwards raw JSON plus `authorization` and `x-revenuecat-webhook-signature` to fixed private `CONTROL` binding. `controlPlaneWorker.js:517-649` authenticates, parses, enforces `SANDBOX` under `AUTH_ENVIRONMENT=test`, looks up Control D1 `billing_customer_routes` and `tenant_registry`, journals to `revenuecat_event_inbox` and forwards to the tenant binding with private control secret and route generation. `subscriptions.js:148-269` checks environment, optional configured store/product allowlists, customer-to-tenant binding, tenant event ledger and subscription plan updates via tenant D1 batch. These are three Worker roles (ingress/control/tenant) and two distinct D1 databases (control/tenant).

## Blocking findings / counterexamples

1. **P1: Auth header is optional in verifier** (`subscriptions.js:113-114`). If `REVENUECAT_WEBHOOK_AUTH` is missing, a valid HMAC alone passes. HMAC remains mandatory and protects the payload, so this is configuration defense-in-depth, not a demonstrated bypass of HMAC. Require both the RevenueCat dashboard HMAC secret and expected Authorization to be configured/matched before real E2E; reject unset Authorization configuration in hardened implementation. Also configure HMAC signing explicitly on the RevenueCat integration: the official documentation says HMAC is **optional** and unsigned integration deliveries would be rejected by this handler. Official source: https://www.revenuecat.com/docs/integrations/webhooks.
2. **LOCAL FIX: Concurrent same-event delivery now exclusively claimed** (`controlPlaneWorker.js`, `test/control_plane_routing_test.mjs`). Original code could dispatch the same event twice. Conditional atomic SQLite/D1 `UPDATE` claims only `received`/`failed` events or a `dispatching` row with `updated_at` at least five minutes old; only an affected-row count of exactly one can call Tenant. A live competitor gets retryable HTTP 503. The existing schema, persisted statuses, production bindings and historical rows remain compatible. **Residual:** a tenant request held longer than five minutes can overlap with a stale reclaim; tenant event IDs remain the ultimate idempotency layer. This is a bounded crash-recovery window, not an exactly-once cross-service transaction.
3. **P1: Unknown-customer event is permanently acknowledged** (`controlPlaneWorker.js:549-573`). When customer/route is not yet present, Control logs `ignored_unknown` and returns HTTP 200. If tenant billing identity provisioning/routing catches up later, RevenueCat will not retry that accepted notification automatically. Control also cannot restore a previously ignored event from its inbox without the signed original payload. End-to-end requires owner `getBillingIdentity` before the real Apple purchase and a verified active Control route; design safe reconciliation or a replay queue for out-of-order customer registration.
4. **P1: Same product can represent different subscription lineage** (`subscriptions.js:212-232`). Newer `REFUND`/`EXPIRATION` for the same product is allowed to cancel current Pro even if its `original_transaction_id` differs from the active subscription. Current state stores `product_id` but not original transaction ID. Add lineage binding and negative test before relying on upgrade/re-subscribe/refund correctness.
5. **P1: Tenant provenance checks are optional at runtime** (`subscriptions.js:174-184`). Empty `REVENUECAT_ALLOWED_STORE` or `REVENUECAT_ALLOWED_PRODUCT_IDS` disables the check; local sandbox TOML currently supplies both. Fail closed on missing allowlists for the isolated sandbox, and verify runtime values after authorized deploy.
6. **P1: Successful status can conceal tenant no-op** (`controlPlaneWorker.js:625-642`). Any tenant HTTP 2xx is recorded `applied`, including 200 `ignored: unknown_customer` or `informational_event`. Informational events may be intentional, but unknown customer within a resolved Control route indicates divergent tenant identity and should be classified as failed/reconcilable instead of applied.
7. **Readiness blocker:** No observed signed APP_STORE Sandbox webhook or two-D1 readback. The handoff reports absent sandbox iOS `appl_` SDK key and owner-authenticated purchase API path; real StoreKit purchase must precede genuine RevenueCat event. A dashboard TEST event cannot establish a paid Apple transaction.

## Confirmed protections

- Fixed ingress path, method, content length and header allowlist; no caller-chosen tenant.
- Time-limited HMAC-SHA256 of `timestamp + '.' + raw payload`; invalid signatures refused; Control authenticates before parsing/routing.
- Environment equality (`SANDBOX`/`PRODUCTION`) at both Control and Tenant.
- Immutable Control billing customer store mapping and route generation comparison; Tenant validates routed customer store ID.
- Tenant product/store allowlists when configured; expired plan checks; old SKU refund/expiration protections; atomic tenant state/plan batch.
- Control inbox event ID/payload SHA conflict rejection and post-apply duplicate acknowledgement (serial case).

## Actual offline validation (same checkout, 2026-10-17)

| Command | Actual result | Meaning |
| --- | --- | --- |
| `node test/control_plane_routing_test.mjs` | exit 0, 43 checks PASS | Control routing, serial replay and immutable tenant route fixture |
| `node --test test/billing_sandbox_ingress_test.mjs test/revenuecat_lifecycle_offline_test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs` | exit 0, 34/34 PASS | Ingress, signature, lifecycle and isolated SQLite D1 schema fixture |

### Concurrent claim fix, actual red/green

Before change, `node test/control_plane_routing_test.mjs` **exit 1**, assertion `concurrent webhook cannot claim an already-dispatching inbox event` failed. A first delivery was blocked at the Tenant binding while an identical signed event was delivered again; the old code allowed both to enter tenant. With the new atomic claim, the same test returns **exit 0, 45 checks PASS** (including the concurrent competitor 503 and successful first completion). Independent ingress/lifecycle/SQLite regression suite again returned **exit 0, 34/34 PASS**; `git diff --check` for source and test returned exit 0. No migrations introduced.

Total post-fix local checks: **79 PASS**. Same-product transaction lineage, unknown-customer/no-op reconciliation, real RevenueCat configuration, Apple Sandbox entitlement and remote D1 evidence remain **PENDING**.

## Source-review coverage and cross-impact

Self-review paths examined: (S01) ingress only URL; (S02) POST restriction; (S03) 64 KiB limit; (S04) forwarded headers; (S05) Control HMAC; (S06) timestamp/replay; (S07) Control customer/route; (S08) event inbox claim/retry; (S09) Tenant allowlists; (S10) tenant plan/idempotency and expiry. Each point was checked against the named source regions above; S08 and S10 show open findings, not PASS.

Cross-impact examined: (H01) Sandbox ingress vs production entrypoints; (H02) Control D1 route registry; (H03) Tenant D1 billing customer; (H04) Tenant D1 webhook ledger; (H05) tenant plan state batch; (H06) configured APP_STORE allowlist; (H07) `SANDBOX` environment; (H08) RevenueCat dashboard signature setting (remote **PENDING**); (H09) iOS SDK key / owner endpoint (remote **PENDING**); (H10) Apple transaction → two-D1 roundtrip (physical **PENDING**). H08-H10 are evidence gaps and not completed reviews of live systems.

**Disposition:** Local concurrency source fix and regression PASS; remote Apple Sandbox E2E **NOT RUN**, official QA **0 new PASS**. Other root-cause issues remain open for separately scoped changes.
