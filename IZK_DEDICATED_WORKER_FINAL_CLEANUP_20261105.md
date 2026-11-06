# Izakanpai: dedicated-store Worker source retirement (2026-11-05)

## Scope and invariants

- Current routing remains public `izakanpai-api` -> `izakanpai-control-plane` -> private `izakanpai-common-gateway` -> physically isolated D1/R2 for each store.
- Existing Control registry, D1, R2 and immutable owner records were not mutated. `workerName=izakanpai-api-<store>` is still an immutable D1/R2 ownership marker, **not** an actual script/dispatch target; removing this value would invalidate provenance checks.
- Removed 19 former ONB005-only scripts/tests, the per-store ES256 issuer uploader and test, the unused local migration bridge, and obsolete ONB005 runbook.
- Replaced direct references in 21 QA scripts/tests to retired `.tenant-provisioner-production-{teat,yuwaku}.toml` with `test/qa-d1/wrangler-physical-{teat,yuwaku}.toml` query manifests. These contain physical D1/R2 metadata but no Worker entrypoint, services, routes or secrets. Removed both old ignored TOML files from local disk. Independently verified remote physical D1 `SELECT` with the new config: exit 0, zero rows written.
- QA ES256 secret inventory now inspects the **common** gateway, not the retired `izakanpai-api-teat`. ONB007-010 live readback uses the common public endpoint. Neither inventory presence nor local tests can record a formal QA PASS.
- Developer console and system topology HTML now display the private common Worker. QA provider README updated for common-only reality; no legacy-worker secrets are auto-provisioned.
- Added `scripts/ci/no-dedicated-tenant-worker-gate.mjs` and negative/positive regression tests, included in the existing full project test pipeline.

## Verification

- `node scripts/ci/no-dedicated-tenant-worker-gate.mjs`: PASS, failures 0.
- `node scripts/common-only-source-gate.mjs`: 19 checks PASS.
- `node --test test/no_dedicated_tenant_worker_gate_test.mjs`: 3/3 PASS.
- Related onboarding and ES256 diagnostic source tests: 82/82 PASS.
- `npm test` after regeneration of static inventories: **all 207 ordered project steps PASS, process exit code 0**. Local evidence: `test-results/retire-dedicated-worker-full-regression-20261105-final.log` (not a formal device QA ledger).
- Current iOS and Android GitHub Actions build workflows remain manual. No mobile build, production D1 mutation, official physical QA verdict or Cloudflare deploy was triggered during this source cleanup.

## Outstanding QA boundary

ONB005's deprecated ad hoc deployable signer path was removed rather than silently replaced with an unverified signer. A formal ONB case may be admitted only when the reusable runtime proves its current RUNNING claim, device/build identity, authentic screenshot, ES256 issuer receipt, separately read Control/physical D1 provenance, independent oracle and finally cleanup. Keep QA tasks disabled until separately authorized.
