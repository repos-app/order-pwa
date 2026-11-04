# izakanpai common operational diagnostics — 2026-10-31

## Shared runtime

Uses the existing Control D1 as a cross-store diagnostic repository, separate
from business audit rows, provisioning audit and RevenueCat subscription ledger.
Schema: control-plane/0010_operational_diagnostics.sql.

- Records strict metadata only: timestamp, store, trace ID, origin, feature,
  operation, status category, safe error code and duration. No free text.
- Native client: mobile-app/web/api.js records failed and slow API calls and
  uncaught runtime failures; billing-native.js reuses the same public API.
- Offline errors: bounded local queue (50 entries, at most 7 days) with
  best-effort retry on connectivity return or subsequent app API activity.
- An authenticated client sends recordClientDiagnostic on the existing
  public API route. Control validates its live session with its own Tenant
  Worker before writing; the claimed store is never trusted.
- Control logs completed HTTP errors (>=400) and requests over five seconds.
  Small POSTs reuse the same client trace when available. Anonymous backend
  errors are recorded under the platform scope, never a spoofable store.
- Authenticated internal operator query, by store and optional trace ID, has
  a maximum of 200 rows. No public log-reader endpoint exists.
- Cron prunes after 30 days in batches of 1000. Per-store ingestion budget
  is 2000 records per rolling 24 hours to control D1 costs.

## Production application

Apply Control D1 migration before deploying the Control Worker:

    npx wrangler d1 execute izakanpai-control --remote --file control-plane/0010_operational_diagnostics.sql
    npx wrangler deploy --config wrangler.control-plane-production.toml --keep-vars

Preserve all service bindings and secrets; use pre- and post-deployment readback.
CLI read-only diagnostics for a single store:

    npx wrangler d1 execute izakanpai-control --remote --json --command "SELECT recorded_at,store_id,trace_id,source,feature,operation,outcome,error_code,duration_ms FROM operational_diagnostics WHERE store_id='yuwakubar' ORDER BY recorded_at DESC LIMIT 50;"

## Verification and limitations

    node --test test/operational_diagnostics_test.mjs
    node test/control_plane_routing_test.mjs
    node --test test/izk_ut_085_billing_qa_activation_test.mjs

No password, token, receipt, payment information, IP, raw error or user email
is stored. Diagnostic events are not proof of successful payment. Workers
Logs, StoreKit and RevenueCat histories remain independent evidence. An
abruptly killed Worker may have no completed HTTP trace, and an offline client
can lose local logs if removed before the queue is delivered. Production
end-to-end and physical device verification must be reported separately.
