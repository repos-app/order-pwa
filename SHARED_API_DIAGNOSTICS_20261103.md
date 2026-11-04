# Shared server diagnostics — 2026-11-03

## Objective and common infrastructure used

Extend the **existing** authenticated Control D1 operational diagnostics,
not a new credit-only table or a new Windows Task. Every public request enters
the existing izakanpai-api hybrid Router, traverses the Control plane when a
physical tenant is selected, and then reaches the per-store Worker.

Existing durable source-of-truth business records remain in tenant-specific
AI credit operations and immutable ledger; verified purchase notifications
remain in the Control revenuecat_event_inbox.

## Shared trace path

1. Public Router overwrites any incoming internal trace header. For an
   existing native API request, a structurally valid __diagnosticTraceId can
   be reused to correlate with the already-installed native diagnostic queue.
   Other requests get a cryptographically random server trace.
2. The sanitized action and trace pass from the Router to the Control Worker
   and onwards to the tenant Worker as headers. They grant no permissions,
   substitute for no token validation, and do not establish a trusted store.
3. The public /?api=1 response includes x-izakanpai-trace-id and a narrowly
   scoped CORS Expose-Headers, so operators can identify the failing request.
4. Control's existing operational_diagnostics records errors, slow calls,
   completed AI-credit consumption and RevenueCat webhook attempts (including
   successful deliveries). For errors it records only an
   allowlisted error code from a bounded response stream, otherwise http_NNN.
5. The Router also sends safe diagnostic metadata to the same Control D1
   using a new **secret-authenticated internal sink**. This captures failures
   that did not even reach the Control business route (malformed JSON,
   route/provisioner failures), plus successful AI-credit consumption
   and payment webhook delivery acknowledgements.
   Gateway and Control entries have the **same trace ID**, distinguished by
   feature=gateway or feature=api.
6. Existing operator-only diagnostics/query can retrieve events by trace ID.
   No customer-facing transaction-log API or new unrestricted endpoint exists.

## Privacy, budget, retention and scope

- Persist only trace ID, fixed feature, short operation name, outcome,
  allowlisted error category, bounded elapsed time and UTC recorded timestamp.
  Never persist body, image, receipt, freeform error text, IP, token, email,
  query parameters or private Worker secret.
- General successful read requests are **not** written to D1 to control
  billing and avoid overflowing the existing 2,000 events/day rate limit
  for the shared platform scope. Errors, requests slower than 5 seconds,
  successful AI-credit usage, and webhook attempts are logged. The existing 30-day bounded
  retention/pruning applies unchanged.
- Backend log writes are best effort (fail open): a Control/D1 diagnostic
  outage must not change a purchase, response, CORS, routing or permissions.
- A client-requested store is **not trusted** as the log's tenant identity;
  shared gateway/API diagnostics use store_id=platform. The authenticated
  per-store ledger is the authoritative credit accounting record. Use a
  trace ID and a time window to correlate the two.
- Dedicated tenant Worker scripts and their existing data bindings need not
  be touched; only the shared public Router and Control Worker are changed.
- Source review: login/login failures; admin auth; signup/provisioning;
  existing/native RPCs; RevenueCat webhook; images; CloudPRNT; AI credit
  reservations; billing notification; operator endpoints.
- Cross-surface review: CORS and OPTIONS; malformed JSON; oversized bodies;
  arbitrary client trace spoofing; secret header controls; error redaction;
  streaming and large responses; absence of Control; log sink outage;
  D1 sampling/rate and retention.

## Verification boundary

Run source tests server_common_diagnostics_test, hybrid_public_router_test,
operational_diagnostics_test, ai_credit_operational_status_test,
control_plane_routing_test, ai_credit_wallet_sqlite_test and
project pipeline contract test. The combined SQLite test asserts the
same trace appears in two persistent rows for one physical tenant error,
without storing image or token data.

Deployment is complete only when the existing live bindings (including
secrets and all tenant services) are preserved, Control and hybrid Router
are active, and a harmless real request produces a retrievable Control D1
diagnostic row. A unit test alone is not production evidence.

## Real production deployment and authenticated D1 readback — VERIFIED

- GitHub main code commits: 344282a (common gateway/Control logging),
  dc06937 (shared RevenueCat acknowledgement logging).
- Actual live Cloudflare deployed Workers:
  - izakanpai-control-plane: version
    2c3ec090-a6c1-4b18-ae67-53fd841d7a32, 100% active.
  - izakanpai-api: version
    14c404cd-e858-404e-b26a-da898a3018ae, 100% active.
- Before and **after** deployment, Cloudflare Workers settings were read
  independently over the authenticated settings API. The existing Control
  Worker has all **21/21** original bindings, including **4/4** secrets.
  The public Router has **25/25** original bindings, including **8/8**
  secrets and AI. No services, D1 bindings, vars or secrets were lost.
  Preflight comparison:
  test-results/ai-credits-release/common-diagnostics-binding-preflight-20261103.json
  (local operator evidence).
- The source regression suite including Control routing, tenant isolation,
  credit accounting, RevenueCat, Provisioner and project test pipeline
  passed **75 tests / 0 failures**, plus the existing hybrid public Router
  test. Following webhook extension, the focused diagnostics suite passed
  **52/52** and the direct webhook metadata test passed. These remain
  **source/SQLite regressions, not formal mobile-device QA**.
- Live smoke #1: unauthenticated malformed JSON on the public API returned
  HTTP 400, trace 35ba3eb8939e452593b512eac7265a5c. Independent Control
  D1 SELECT returned **one gateway row** with error_code=invalid_json.
- Live smoke #2: a read-only lookup of a nonexistent tenant returned HTTP
  404, trace e17b1893c51448f2923aabb4259a777f. Independent Control D1
  SELECT returned **two rows** with the **same** trace: one gateway and one
  api/control, both with error_code=store_not_found.
- No production customer purchase, refund, points or tenant settings were
  altered for the smoke tests. No fake RevenueCat purchase event was sent.

## Operator lookup and remaining limits

Run an authenticated read-only Control D1 query using an **exact trace ID**
obtained from the API response or native diagnostics:

  SELECT recorded_at,feature,source,operation,outcome,error_code,duration_ms
  FROM operational_diagnostics
  WHERE store_id='platform' AND trace_id='<validated-trace-id>'
  ORDER BY recorded_at,event_id;

Or reuse the existing authenticated operator
  /internal/operator/diagnostics/query
endpoint with storeId=platform and traceId.

The Control diagnostic table is **bounded to 30 days** and at most **2,000
events/day per store scope** to avoid unbounded Cloudflare D1 charges.
For an incident older than that, rely on original durable business ledgers,
the signed webhook inbox and approved backup retention. The shared log
does not persist private provider payloads or a full stack trace; genuine
external payment receipts must be correlated with verified RevenueCat records.
An additional admin-screen follow-up uses the existing server operator
action `getOperationalDiagnostics`: `src/index.js` authenticates
`PLATFORM_ADMIN_TOKEN` **before** routing the search to the already secured
Control operator endpoint. The only allowed query scope is the platform
gateway/API diagnostic stream, with at most 50 displayed rows and a
strictly validated optional trace ID. Only allowlisted metadata leaves the
server. Both mirrored `docs/admin.html` and `docs/admin/index.html` have
a read-only trace search with escaped result cells. These HTML source files
are not a native app release. The **actual** public admin hosting is the
existing `repos-app/order-pwa` GitHub Pages repository, not the
`repos-app/izakanpai` GitHub Pages endpoint.

## Operator search actual publication — VERIFIED

- API and operator-only server handler committed in `izakanpai` main
  `0eb6140532f29c99765ad2d8e6617e1b5933d10a`, and deployed to the
  public `izakanpai-api` Worker, version
  `1ae7c90f-d3eb-4531-98ea-b0ad981293c9` (100% active).
- Operator log search rejects unauthenticated or invalid admin tokens:
  a production POST without a valid token returned HTTP **403 forbidden**
  in two independent live tests. No live admin token was exposed or
  invented to claim an authenticated production query; the authenticated
  code path was covered by backend source tests.
- Mirrored static admin pages committed to the actual production website
  repository `repos-app/order-pwa` main
  `8445590cb3f8d8f376beac4447205632bf0e5c20`, preserving the prior
  site's newer AI-credit monitoring updates (only 51 new lines per page).
- GitHub Pages native build **SUCCESS**, exact commit `8445590...`.
  Independent HTTPS GET of both
  `https://izakanpai.com/admin.html` and
  `https://izakanpai.com/admin/` returned HTTP **200** with the new
  `serverDiagnosticsSection`, `serverDiagTraceId` and
  `getOperationalDiagnostics` action present.
- Source tests: **71/71 PASS** on cross-surface backend regressions,
  **44/44 PASS** for operator Admin HTML and behavior, legacy Router tests
  PASS. These are source tests; no formal Android/iOS device QA was claimed.
- The existing `operational_diagnostics` Control D1, which was already
  independently smoke-verified via two real public error requests and three
  persisted trace rows, remains the sole common diagnostics sink.

Long-term archival/export and automatic alert thresholds remain separate
outstanding operations improvements. The 30-day Control D1 diagnostics
retention remains unchanged and is not suitable as the sole financial
purchase record; the tenant ledger and signed RevenueCat Control inbox
are the durable sources of truth.
