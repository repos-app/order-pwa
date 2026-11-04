# izakanpai: physical store signup interruption (2026-10-25 PHT)

## Incident / evidence

- User-visible incident: iOS native signup for workspace `test1` at about 10:45 PHT showed a red **order-processing** message even though the operation was store registration.
- Confirmed shared native cause: `mobile-app/web/api.js` converted every HTTP 5xx into an *order* failure, and discarded the Provisioner 503 body. Both `index.html` and `manage.html` then showed the wrong generic message, allowing another submit.
- Read-only Control D1 inspection: `tenant_registry(test1).state=provisioning`; `provisioning_jobs(test1).state=reserved`, `attempts=0`, `last_error=NULL`; created `2026-10-25 02:45:35 UTC`.
- Read-only resource inspection: dedicated `izakanpai-test1` D1 exists, provisioning marker schema `0047_revenuecat_original_transaction.sql`; R2 bucket `izakanpai-images-test1` exists; Cloudflare reported missing Worker `izakanpai-api-test1` (10007).
- Proven boundary: signup did not reach successful Worker creation / tenant activation. Exact Cloudflare error (HTTP 403 vs 5xx vs another failure) **not captured** in the original request. Never claim a verified Cloudflare root cause without this evidence.

## Changes

- Shared native API: use operation-neutral messages for HTTP 5xx; preserve only allowlisted Provisioner 503 codes instead of displaying an order failure or raw infrastructure detail.
- Both native signup pages: treat HTTP 5xx / physical provisioning / network timeouts as outcome-uncertain, prohibit immediate duplicate submit, direct users to check support or email. Preserve known validation rejections and existing successful flows.
- Web production/TEST and public API: update shared HTTP 5xx error wording consistently.
- Provisioner: return a bounded, non-sensitive `diagnostic: {stage,code,cfStatus?}` alongside its safe error on exception. For a transient Worker upload 500/502/503/504, GET the exact Worker name and retry only if proven absent, at most once. No automatic retry on 401/403/429, no destructive cleanup, no tenant-body replay.
- Production deployment `izakanpai-tenant-provisioner`: version `c233e11f-db63-4e83-a8a1-2e9cb5a60557`, Wrangler exit 0, 2026-10-25 PHT. This **does not** activate `test1` by itself.

## Local test / distribution evidence

- `node test/tenant_provisioner_service_test.mjs`: PASS, including transient 503 retry and 403 stop, full provenance/cleanup guards.
- `node --test test/signup_provisioning_failure_regression_test.mjs test/plans/qa-approved-oracles/ONB003_EMAIL_SENT_INDEPENDENT_SOURCE.test.mjs`: 13 PASS, 0 FAIL. Shared iOS/Android pages, JA/EN, 10 repeated rounds of failure handling. Mocked API only.
- `node test/hybrid_public_router_test.mjs`: PASS; `node test/error_message_hygiene_test.mjs`: 17 checks PASS.
- `npm run mobile:sync`: exit 0, iOS and Android bundled assets synchronized.
- `npm run verify:distribution`: exit 0, 101 native source files equal iOS/Android build assets; Web production/TEST parity 88/88.

## Outstanding acceptance criteria

1. Capture the original or a reproducible Cloudflare Provisioner `tenant_worker` diagnostic and resolve any persistent permission/quota cause if present. The original request's exact `cfStatus` is not available.
2. Perform **one carefully controlled continuation** of `test1` with its original registration credentials inside the app; first ensure it has not become active. Do not invent the user's password, do not create a different store, do not wipe its D1/R2.
3. Verify Control `active` + Tenant Worker existence and ownership + successful store login/email verification. No change to formal Android/iOS QA ledger without independent device evidence.
4. Build/sign/distribute the updated iOS/Android app to users; source synchronization is not an already installed TestFlight update.

**Actual state:** backend diagnostic/retry deployment completed; shared client code locally corrected and checked; `test1` activation and native app distribution **not yet confirmed**.
