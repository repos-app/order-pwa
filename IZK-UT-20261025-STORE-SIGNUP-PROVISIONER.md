# IZK-UT-20261025-STORE-SIGNUP-PROVISIONER

Date: 2026-10-25 (Asia/Manila).
Status: SYSTEMIC ROOT CAUSE CONFIRMED / worker recovery verified / owner activation not completed / formal QA verdicts unchanged. Original Cloudflare error code not recoverable.

## Verified production facts

- iPhone signup displayed a generic order-processing error, unrelated to new store creation.
- Control D1 tenant_registry: test1 = provisioning.
- Control D1 provisioning_jobs: test1 = reserved, attempts = 0, last_error = NULL.
- D1 izakanpai-test1 exists, provisioning marker schema_version = 0047_revenuecat_original_transaction.sql.
- R2 bucket izakanpai-images-test1 exists.
- At 02:45 UTC, Worker izakanpai-api-test1 did not exist (API 404 / code 10007).
- Template Worker content/v2 is reachable and exposes one valid multipart index.js module, 938173 bytes.
- Historical Workers Observability API and Account Audit API both returned HTTP 403 using the available Wrangler OAuth.

## Root-cause boundary and limitations

The D1 schema and R2 owner marker were written correctly; the target Worker was not created, and Control activation was not attempted. The original failure boundary is **after R2 owner-marker PUT and before Worker creation completed**. A failed R2 marker read-back, template read, Worker settings check or Worker upload can all lead to this state. No Cloudflare API error from the original attempt was saved, so the exact failing substep cannot be asserted.

**Verified persistent defect:** the original physical Provisioner stopped immediately when any later D1/R2/Worker provisioning operation threw. Control recorded the reservation before the failing operation but did not persist the failure stage or vendor error. There was no background resumption of the reserved signup and the client mislabelled HTTP 5xx as an order error. The signup UI disabled manual retry even for a definite provisioning failure. A single transient infrastructure error therefore stranded the store indefinitely. This causal chain is source-confirmed, tests reproduce it, and the same backend Worker creation route later recovered the actual store.

The **specific upstream event** (Cloudflare API 5xx, transport loss, or another exception) at the original 02:45 request cannot be confirmed: the old Provisioner discarded its error body, Control last_error stayed NULL, and historical logs are not accessible with this Wrangler OAuth. Do not assert a specific original HTTP status, error code, or outage.

An ongoing insufficient Workers Scripts permission or permanently invalid multipart metadata is excluded by successful creation of the exact target Worker from the same Provisioner environment and token. Worker count was only 29, below the Workers per-account limit.

## Local remediation evidence

- src/tenantProvisionerService.js now records bounded Cloudflare error metadata: HTTP status, numeric API code, allowlisted operation label, without exposing raw response text or credentials. Prior in-progress retry and stage-error changes were retained.
- test/tenant_provisioner_service_test.mjs mocks Cloudflare Worker upload rejection (HTTP 403, API code 10000), and verifies no unsafe retry and sanitized diagnostics.
- Safe read-before-retry logic now handles HTTP 500/502/503/504 and missing HTTP replies (TypeError/AbortError), only if the exact Worker is independently confirmed absent; permanent errors (for example 403) are not retried. The common signup UI presents a safe same-ID resume for definite physical_provisioning_failed and keeps unknown network failures blocked.
- Local suite passed: tenant_provisioner_service_test, tenant_provisioner_control_deployment_readiness_test, node --check, git diff --check; signup UI source QA 11/11 passed. Provisioner and signup VM suites were each repeated in 10 independent test rounds (20 suite executions), zero failures. These are not formal OS verdicts.
- **Actual 2026-10-25 remote recovery:** using an isolated Wrangler remote-preview scheduled invocation with real Provisioner Cloudflare bindings, the already-owned D1 and R2 markers were validated and ensureTenantWorker returned {ok:true,stage:tenant_worker,created:true}. Cloudflare confirmed Worker izakanpai-api-test1 deployment 982175f6-0d51-4db2-8a80-f4170523d511 and version 9dafb8b9-b49e-4116-accd-d23e024d1597, created 03:38:30Z.
- Temporary Production private Cron diagnostic was deployed in version e7cebd25-e853-418b-a0ca-8089a4d396e7, then **removed**; ordinary */15 cron restored in Production version 18e74307-206f-47bd-a716-295ab8814813. No public diagnostic endpoint remains.
- These are not Android/iOS formal QA results. Formal PASS delta: 0.

## Remaining proof and recovery

1. Final safe transport-loss retry improvement was deployed to Production Provisioner version c41a5263-f628-4eb9-b36f-748ac424d8e4 (ordinary */15 cron only). Client signup UI changes are **local only** and still require the distribution build/TestFlight/Android release path.
2. Existing store test1 is still Control provisioning / reserved (attempts=0, owner_count=0). The dedicated Worker is now created. Resume the **same** registration with the original user-chosen password, which is not available to the investigator; never set a substitute credential.
3. Confirm dynamic Control binding, active state, owner login, verification mail and both mobile screens using real evidence.
4. For future interrupted signups, consider generalized server-side reconciliation of reserved jobs and explicit failure recording in the canonical Control ledger. User credentials cannot be safely reconstructed by an unattended process.
5. Run independent Android/iOS QA evidence and update the formal ledger only on an actual PASS/FAIL.

Production Provisioner was deployed during this incident and the test1 Worker was created. No tenant business rows, user credentials, owner accounts, production customer stores, or existing other tenant bindings were intentionally modified; no deletion occurred. Store activation is NOT complete.

## Cross-cutting validation (10 distinct existing suites)

2026-10-25: all passed with process exit 0, total 10/10 (these are offline tests, not formal OS QA):

1. tenant_provisioner_service_test.mjs: staged creation, provenance, bounded 5xx/network retry and hard rejection.
2. tenant_provisioner_control_deployment_readiness_test.mjs: Control version and route readiness.
3. tenant_internal_provisioning_boundary_test.mjs: tenant isolation during provisioning.
4. control_plane_provisioning_test.mjs: reservation/activation invariants.
5. hybrid_public_router_test.mjs: public registration routing.
6. auth_client_regression_test.mjs: common API and credential lifecycle.
7. qa2_login_signup_ime_regression_test.mjs: mobile signup accessibility.
8. ONB003_EMAIL_SENT_INDEPENDENT_SOURCE.test.mjs: shared iOS/Android source handlers, JA/EN, error and retry UX.
9. error_message_hygiene_test.mjs: public error redaction and cross-surface messages.
10. runtime_dynamic_i18n_test.mjs: localized API error handling.

Additionally, the Provisioner service suite and signup-handler VM suite were executed in ten repeated rounds (20 suite invocations) with zero failures. The work did not change the official Android/iOS QA verdicts.
