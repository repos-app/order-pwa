# AI credit incident evidence and troubleshooting — 2026-11-03

## What is actually durable today

1. **Tenant D1 `ai_credit_operations`**: exact `(store_id, operation_id)` idempotency key, kind, state, units, spend allocation among trial/monthly/paid, source feature and SKU, UTC cycle, timestamps, and optional successful AI result.
2. **Tenant D1 `ai_credit_ledger`**: immutable, per-operation effective trial/monthly/paid/debt deltas, action and created_at. Grant, reservation, finalization, refund and reversal are committed atomically with the wallet. Ledger UPDATE is forbidden. A verified account-erasure backend can delete records; this is **not a statutory immutable archival store**.
3. **Tenant D1 `ai_credit_wallets`**: current separate promotional, paid and debt balances; the wallet alone is not transaction evidence.
4. **Control D1 `revenuecat_event_inbox`**: signed webhook event_id, tenant routing, payload hash, status, received/applied/updated times, attempts and latest categorized failure. `revenuecat_credit_purchase_owners` prevents cross-store receipt reuse. Encrypted retry envelopes have a separate bounded lifecycle.
5. **Operator aggregate audit**: Control `/internal/operator/ai-credit-audit/query` and `src/aiCreditOperationalStatus.js` summarize webhook success/failure. They do **not** list per-operation balances or prove external purchase fulfillment.

Do not present Cloudflare ephemeral console logs as the sole incident evidence. Their availability/retention is not independently verified here.

## What is NOT guaranteed

- Rejected **insufficient-funds requests** do not insert a reservation, so there is no persisted operation row documenting each rejected attempt.
- For a refunded AI reservation, the ledger records the **refund** but does **not** persist a sanitized *underlying model/budget/timeout error reason*. Reconstructing this requires correlated provider logs while they still exist.
- Control inbox retains the **latest status and error** plus a retry counter. It is not an append-only per-attempt timeline.
- A Control webhook `event_id` and a tenant `purchase:ENV:transaction_id` are different identifiers. Identity-safe cross-system correlation has to be performed by an authorized operator, not via a public log.
- The server wallet endpoint returns only a bounded recent history (default 20); **older rows remain in D1**, subject to verified account erasure.
- D1 historical ledger sums can differ from wallet after the *old* 0048 schema's pre-carryover grant and debt accounting. A mismatch needs investigation, not automatic account balance repair.
- No real completed AI-credit purchase/spend transaction was present in the 13 inspected physical tenant databases at this checkpoint; the absence of recorded events does not prove subsequent real-world logging.

## Investigating an incident — operator only

1. Identify the authenticated store ID and its **exact physical D1 UUID** from the Control tenant registry; do not guess from a store display name.
2. Run the read-only diagnostic on a trusted operator PC with authenticated Wrangler:

   `node scripts/ai-credit-incident-trace.mjs --store teat --database-id 988cc818-fb77-49ff-aacd-c925991257bd`

   For a known persisted operation ID, optionally add `--operation-id <exact-id>`. The CLI validates IDs, calls only D1 SELECT and limits results. The output uses a stable 20-character SHA-256 operation reference instead of printing raw transaction/receipt identifiers.
3. Check `consistency`, wallet and ledger deltas, unfinalized reservations, duplicate operation IDs and whether an operation has any ledger entries. `NO_WALLET_YET` is explicitly **not PASS**. `REVIEW_REQUIRED` is an investigation trigger, not authority to adjust a balance.
4. For purchase issues, inspect the existing **operator-authenticated Control webhook audit** and, with proper permissions, search the Control D1 inbox using the original verified event ID. Check failed/stale status, timestamps, last_error, attempt count and immutable purchase ownership. Do not export raw signed webhooks, private customer IDs or secrets into chat.
5. Correlate with Cloudflare runtime logs **when available**, using exact UTC time window and request/operation reference. If original logs are missing, report the evidence gap accurately; never claim an inferred reason as proven.
6. Record incident ID, investigation time, store, redacted operation reference, observed before/after balances, relevant ledger action/deltas, webhook outcome, error classification and approved remediation. Keep event logs immutable and protect customer privacy.

## Live read-only checkpoint

- 13/13 existing physical D1 databases were queried without writes; no missing-ledger records or wallet-vs-ledger imbalance appeared **because all 13 had zero initialized wallets, zero credit operations and zero ledger entries at this checkpoint**. This is a **baseline/schema readiness check**, not a successful transaction trace.
- Control inbox had 18 records in `applied` status at the read-only checkpoint; this is not evidence that these are all *AI-credit* purchase events.
- Diagnostic unit tests cover strict read-only queries, injection resistance, privacy redaction, event deltas, reconciled values, missing wallet, and mismatched balances. `teat` live diagnostic returned `NO_WALLET_YET`.

## Next improvements for complete incident traceability

1. Store an allowlisted **AI failure classification** on every failed/recovered reservation atomically, without saving provider response bodies or menu photos.
2. Persist distinct webhook retry attempt status transitions (bounded, identity-safe) or establish an audited export/retention policy. Existing Control inbox currently records the latest status only.
3. Offer a **protected, paginated per-store audit view** and alert when operation-to-ledger reconciliation fails, with clear user-facing owner/admin permissions. Aggregate admin counters are not enough.
4. Establish and verify an explicit retention/backup policy consistent with customer account deletion and local legal requirements.

Do not mark these four improvements as deployed or complete. No production Worker, schema or customer balance was changed by the read-only diagnostic.
