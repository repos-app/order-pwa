# QA2-NEW-ONB-001: tenant signup physical verification and backend repair (2026-10-21)

## Confirmed deployment and repaired failures

- The standalone ten-D1 limit was removed from the production physical tenant Provisioner. Live Cloudflare D1 inventory was 12 before the test; tenant QA DB became the 13th.
- The first post-deploy physical registration progressed to the actual Control DB reservation and created the tenant D1, but the R2 provisioning-owner marker was incorrectly uploaded as a multipart form instead of raw JSON. An independent `wrangler r2 object get` confirmed the marker was absent/unreadable. After checking the Control reservation and the immutable tenant D1 ownership marker, the QA-owned R2 object was repaired through Wrangler and read back successfully.
- A later registration progressed through tenant Worker creation and Control service-binding creation. Provisioning initially observed `control_route_binding_missing` while the updated Control deployment was becoming active; its deployed binding and 100% active version were subsequently verified.
- The actual physical registration then created an **active** tenant: Control `tenant_registry` and `provisioning_jobs` are active, and tenant D1 independently read back exactly one `stores`, one `store_owners`, and one Free `store_plans` row for the QA-owned store.
- The mobile UI still displayed an error because the physical signup Provisioner success response omitted outer `ok:true`, required by `mobile-app/web/api.js`. Both success and handled validation responses were repaired to match the existing GAS-compatible mobile API envelope. The raw JSON R2 marker fix was also applied to the common production source.
- Final deployed `izakanpai-tenant-provisioner` version: `7dde54d1-3b66-4c84-9ff1-0fa68b5ec49f` at 100%.

## QA-owned fixture and physical proofs

- Device: Realme `0O64B26I28103F70`, 720x1600, installed signed Android QA APK `910026`.
- QA tenant: `qa-onb001-20261021-c8`; Control route `TENANT_QA_ONB001_20261021_C8`.
- Tenant D1: `izakanpai-qa-onb001-20261021-c8` / `125c6210-2527-47a5-91ee-e262628e51a2`.
- Tenant Worker: `izakanpai-api-qa-onb001-20261021-c8`.
- R2: `izakanpai-images-qa-onb001-20261021-c8`. The corrected ownership record was verified using real remote put/get after matching independent Control/D1 markers.
- Evidence from the registration attempt and full actual provisioning is under `test-results/qa-v2-monitor/onb001-*`. Post-claim screenshots (Login, Signup, Terms and Privacy) are under `test-results/qa-v2-evidence/ONB001_POST_BACKEND_20261021/`.
- A disposable `example.invalid` email was intentionally used. Actual verification-email delivery was **not** established; do not claim `ONB-003` PASS from this fixture.

## Formal status (do not confuse with implementation success)

- The official Android row was BLOCKED before the backend repair; a corrected-backend retest was requeued and claimed using the protected official runner.
- During the claimed retest, the automation tool rejected the test-entry operation. It did not produce an after-fix success screen. The claim was **released**, and the independent Realme lease was also released; the row is now **NOT_RUN**, not PASS.
- Formal ledger from `node scripts/qa-v2-official-runner.mjs verify`: Android **PASS 380 / FAIL 62 / BLOCKED 5 / NOT_RUN 379 / SKIP 5**; iOS unchanged.
- To complete this case: run a newly claimed physical case on the now-corrected backend, confirm the registration success message on device, attach screenshots and signed independent DB readback to the acceptance check, and record formal PASS through the official Runner. Never re-use a prior unclaimed screen as a newly claimed proof.
- The QA-owned production tenant currently remains active solely for continued verification; cleanup should use the existing provenance-checked tenant deletion workflow when QA no longer needs it, not indiscriminate deletion.

## Regressions executed

- `node --test test/tenant_provisioner_service_test.mjs`: exit 0 (including over-ten inventory, Cloudflare create rejection, raw owner-marker serialization, and API envelope).
- `node test/tenant_provisioner_test.mjs`: exit 0, 38 checks.
- `git diff --check`: exit 0.
- Read-only physical Provisioner production-readiness: no blocker prior to release. Earlier and final live Worker versions were independently verified by Cloudflare deployments status.

Scope of authorization was the user's explicit approval of DB operations, production deploy, and testing. No unrelated tenant was altered or deleted.

## 2026-10-21 20:02 PH update: signed Android physical retest formally PASS

The earlier `NOT_RUN` statement above is historical. A new exclusive claim
of Android Realme RMX3938 (serial `0O64B26I28103F70`, signed APK
`910026`, native 720 x 1600) executed actual WebView onboarding against
the final production Provisioner `7dde54d1`. The new QA-only tenant is
`qa-onb001-20261021-r2` (separate from earlier `...-c8` repair tenant).
The user-authorized physical registration displayed the green **Store created**
message and verification resend link, without granting an authenticated session.
Real device captures, before/after rejection proof, public API settings readback,
independent Control and tenant D1 owner/store/Free plan/employee/5 initial tables,
legal-version settings and independent expected-value review are recorded under
`test-results/qa-v2-evidence/ONB001_REALME_POSITIVE_20261021_R4/`.

The exact installed APK SHA256 is
`05b79f0dc2d41a0f9ef4d016fb5c97fec8cec7198ca25181c1995f854666cef7`.
Its `index.html` differs from the local independently reviewed source by ONE
non-registration CSS `overflow-x` rule; packaged signup/legal JS lines are
identical. The current final run reuses genuinely captured same-build Terms
and Privacy screenshots from an earlier physical formally claimed attempt,
with immutable SHA256 verification. It does **not** claim those pages were
reopened during the latest physical claim. The 26 extra source-reviewed
expectations are checked separately (source-enforced isolation is distinguished
from a direct all-tenant before/after measurement).

The independent approved expectation:
`test/plans/qa-approved-oracles/QA2-NEW-ONB-001.json`.
Formal evidence:
`test-results/qa-v2-evidence/ONB001_REALME_POSITIVE_20261021_R4/formal-evidence-v2.json`.
The protected official Runner accepted the final result:
`QA2-NEW-ONB-001` **Android PASS**, 12 SHA-backed evidence refs,
`evidenceSHA256=3fc456d2a4de85f13801825220cd7bff2d54e409b2173926c1423f3755a6c2bf`.
The independent `verify` command completed successfully: Android
**PASS 381 / FAIL 62 / BLOCKED 5 / NOT_RUN 378 / SKIP 5**.
iOS remains unchanged and **not certified by this Android result**.
The official physical claim and Realme exclusive lock were both released.
The QA-owned tenant remains active for ONB002 or subsequent verification;
its verified ownership scope must be enforced if subsequently cleaned.
