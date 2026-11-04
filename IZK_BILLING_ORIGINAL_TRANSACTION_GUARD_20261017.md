# RevenueCat original transaction guard — local source change, 2026-10-17

## Issue and acceptance

The prior revoke guard compared only `product_id`. A new purchase of the same SKU could be revoked by an unrelated older Apple `original_transaction_id` whose REFUND, EXPIRATION, or BILLING_ISSUE notification arrived with a later event timestamp. Accept only a revoke that belongs to the current known lineage, while retaining genuine current-lineage revocation and upgrades.

## Evidence

- BEFORE: added `same SKU but unrelated original transaction cannot revoke current Pro`; `node --test test/revenuecat_lifecycle_offline_test.mjs` exited **1**, 21 PASS / 1 FAIL; REFUND returned no `ignored` and revoked current Pro.
- AFTER: `node --test test/revenuecat_lifecycle_offline_test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs` exited **0**, **30/30 PASS**. Includes independent in-memory SQLite database with actual tenant schema, same-SKU separate-lineage REFUND/EXPIRATION/BILLING_ISSUE, current-lineage REFUND, SKU upgrade, customer/store isolation, event timestamp ordering and HMAC tests.
- `git diff --check` exited **0**.
- Changes are source/tests/additive migration only. No physical QA, Apple real purchase, remote schema apply, deploy, git commit or push.

## Source changes / compatibility

- `src/subscriptions.js`: stores `original_transaction_id` with the current subscription state and rejects revoke/billing issue if the state has a known different lineage. Missing incoming lineage also cannot revoke a known lineage. The retained SKU comparison still rejects previous-SKU revocations.
- `migrations/0047_revenuecat_original_transaction.sql`: nullable column added to existing `store_subscription_state`; existing rows need a subsequent authenticated active webhook to populate the lineage. Run only with the established tenant migration process after separate approval, never directly against live DB from this task.
- Until migration 0047 is installed, the source detects SQLite `no such column` and uses existing 0015-compatible statements. **This fallback lacks same-SKU transaction protection** and should not be mistaken for end-to-end deployed repair. A missing original ID on a legacy state also cannot establish safe lineage comparison. These are migration/readback gates for prime.
- On a new product, old lineage is not carried forward when the new active event omits its transaction ID. A same-product active event missing it preserves the known lineage.

## Actual self-review passes (source inspection plus tests)

| Pass | Distinct check | Result |
| --- | --- | --- |
| S01 | Prior product-only revoke condition reproduced with same SKU | FAIL before fix, PASS after |
| S02 | Actual current transaction `REFUND` | PASS, Pro revoked |
| S03 | Different transaction `EXPIRATION` | PASS, Pro retained |
| S04 | Different transaction `BILLING_ISSUE` | PASS, Pro retained |
| S05 | Missing original ID after known-lineage state | Code check: guarded, Pro retained |
| S06 | Event chronology check (`latest_event_at_ms`) | Existing late older event test PASS |
| S07 | Duplicate event state replay check | Existing duplicate integration PASS |
| S08 | Product-change informational event | Deferred PRODUCT_CHANGE integration PASS |
| S09 | New SKU active event without original ID | Code check: old SKU lineage cleared |
| S10 | SQL bind/columns and nullable additive migration on actual SQLite | SQLite test 30/30 PASS |

## Actual cross-impact reviews

| Pass | Distinct inspection method | Result |
| --- | --- | --- |
| H01 | `rg` reverse lookup of `applyVerifiedRevenueCatEvent` | Event handler callers identified in source/tests |
| H02 | `rg` reverse lookup of `handleRevenueCatWebhook` | HMAC ingress boundary unchanged |
| H03 | `rg` schema reads for `store_subscription_state` | New column isolated to tenant subscription state |
| H04 | `rg` original transaction references | New state field and tests accounted for |
| H05 | Customer-route SQL inspection | `billing_customers` store check still precedes update |
| H06 | RevenueCat environment/store allowlist inspection | Existing reject-before-write checks unchanged |
| H07 | Separate Control/Tenant in-memory SQLite DB | Existing separation integration PASS |
| H08 | Existing `0016_login_rate_limits.sql` collision check | Corrected migration to 0047; existing migrations preserved |
| H09 | Latest migration sequence filename inventory | 0046 followed by new 0047 |
| H10 | Git working-tree diff scope and whitespace | Limited to assigned files; `git diff --check` PASS |

Review passes above are source/offline scopes. Actual hardware purchase/revocation and formal QA remain **PENDING**.

## Independent read-only review of current Control dispatch (2026-10-17)

Scope: read current dirty working-tree `src/controlPlaneWorker.js` and `test/control_plane_routing_test.mjs`, leaving both prime-owned files unchanged. Ran `node --test test/control_plane_routing_test.mjs`: **exit 0, 48 internal checks reported, one node:test top-level PASS**. This is an offline check, not formal QA.

The 200 `ignored:'unknown_customer'` → 503 handling is present at Control lines 631–644 and records `failed`/`tenant_unknown_customer` for retry. The 200 `ok:false` → 502 handling appears at lines 645–650. `response.clone().json()` avoids consuming the original response body returned for other 2xx events. The race test at lines 359–397 verifies a second concurrent claim gets 503 while the first remains in-flight. The test at lines 399–462 exercises tenant identity repair and application rejection. Signed ingress, environment check, payload hash mismatch, tenant route generation, and immutable customer Store mapping precede forwarding.

**Finding C1 (moderate): insufficient 2xx success contract.** Lines 637–667 interpret unreadable/empty JSON, `{}`, and `{ok:true, ignored:'unmatched_entitlement'}` as an applied event. The latter is a meaningful intentional no-op in the current tenant source. Valid no-op policy needs to be explicit; malformed response should not certify delivery. Recommend strictly requiring an agreed tenant completion result (and specifying which intentional ignored states may be acknowledged). Existing Control routing test does not cover non-JSON 200 or unmatched entitlement 200.

**Finding C2 (moderate): previously unknown Control route cannot recover.** Lines 566–572 save `ignored_unknown` with no store and return 200. If the same event is delivered again after the missing customer route becomes available, lines 582–599 perform `INSERT OR IGNORE`, and atomic claim only accepts `received`, `failed`, or stale `dispatching`; `ignored_unknown` remains forever unclaimable. This is a delayed-provisioning limitation; it cannot be repaired solely by the new tenant-side unknown-customer 503 branch. Keep unknown identity/cross-store routing fail closed while defining a verified route-recovery transition.

**Finding C3 (moderate, long-running dispatch): stale claim lacks completion fencing.** Lines 590–599 allow another request to claim `dispatching` after five minutes, but the first request can still complete and write `applied`/`failed` at 640–671 without checking the claim attempt/token. Parallel forwarding can therefore occur after lease expiry and late completion can overwrite newer outcomes. The current race test covers only simultaneous fresh dispatch, not stale-claim takeover. Recommend claim ownership token/attempt conditioned completion or a fenced status update and an explicit downstream idempotency contract.

No edits made to Control source/test; findings passed to prime for triage. Apple Sandbox physical purchase and formal QA are still **PENDING**.
