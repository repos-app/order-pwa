# Android source preparation: genuine generic fixture binder gap, 2026-10-24

## Formal plan verdict and installed code

The canonical Android `scripts/qa-v2-realme-unattended-pilot.mjs --plan --user-authorized` was run read-only against the live repo. The separately available `signed-physical-v1.mjs` was also admitted in a **command-local environment only** by `QA_OFFICIAL_RUNTIME_PROVIDER=scripts/qa-autonomy/qa-runtime-providers/signed-physical-v1.mjs`. It returned `runtimeProvider.ready=true`, `pending.length=0`, `deferredRuntimeCases.length=68`, `nextAction=QA_PAIRED_RUNTIME_ADAPTER_REQUIRED`. This environment change was not saved to system settings or a Windows task. The plan exit was `0` in this admitted-source diagnostic mode, and no formal claim/verdict was written. Evidence: `test-results/qa-generic-binder-plan-after-source-20261024.json`.

`QA2-KEEP-OPR-BILL-049` still had **`CLAIM_SCOPED_GENERIC_FIXTURE_BINDER_NOT_INSTALLED`** after the source update. `QA2-KEEP-PT-INP-0078` separately reported `CLAIM_SCOPED_EXECUTABLE_SOURCE_NOT_ADMITTED` on the later plan; parallel sessions were actively changing source while this inspection ran. Do not treat the change of reason as a runnable case. Case 0344 remains excluded.

The case's canonical pair file `test/plans/qa-v2-realme-user-authorized/coverage-3b193d2b0f03f8748b0280.pair.json` accurately pins its data provisioner (SHA256 `21de05ae2b6fdb5d1a390008de7d599799a543387d8f2324374b4697d41674c9`). `QA2-KEEP-OPR-BILL-049.fixture.json` explicitly declares `fixtureVerified:false` and `state:UNVERIFIED`. Its source and offline contract therefore do not establish a prepared real backend fixture.

`claimScopedCaseContextBindingKind()` in the concurrently owned `claim-scoped-paired-composition.mjs` routes **SET012, SET013–016, BILL029–033** and returns `GENERIC_UNBOUND` for BILL049. The canonical `qa-v2-realme-unattended-pilot.mjs` expressly defers case-owned fixtures in this state before claim. This gate is correct until a verified binder is installed by its owner. Neither file was edited here. `QA_OFFICIAL_RUNTIME_PROVIDER` being configured alone does **not** solve that case binding.

## Prepared reusable connector, with remaining remote blocker

`scripts/qa-autonomy/qa-runtime-providers/claim-owned-generic-fixture-connector.mjs` is an optional, disconnected source connector. It enforces canonical RUNNING claim, store `teat`, case ownership, idempotency and only-owned-rows scope before and after calls. Real source operations must be injected from a separately pinned trusted composition root. The response returned to existing case lifecycle methods comes **only** from an independently verified remote ES256/D1 normalization function; raw fixture-operation responses are never accepted as signed verification. No verifier/remote callback, no adapter. No fixture is minted or claimed ready by this module.

Specifically, **none** of these BILL049 operations is implemented in a currently installed real backend adapter:

- `prepareDemoCheckout` — QA-only, owner-marked demo order creation and authenticated session
- `readDemoCheckout` — signed pre/post demo checkout, independent production-side-effect D1 read
- `reconcileDemoCheckout` — owned-only finally reconciliation and independent orphan check

Those function names presently occur in the case lifecycle and unit-test doubles; no authentic deployed implementation was found in the repo's other providers. An additional trusted `verifyIndependentSignedResponse` capability must cryptographically verify an actual external ES256 issuer response and separately read the relevant remote D1 tables for this claim. The existing read-only billing provider advertises `isSignedQaDbAdapter:false`, and the BILL029–033 provider requires distinct unsettled backend callbacks and does not include BILL049. Adopting either without real operations would be an unsafe bypass.

The remaining owner integration is concrete: (a) implement and independently attest the four trusted callbacks in the separate provider/Oracle layer, (b) install the BILL049 claim-owned fixture metadata and adapter through `createClaimScopedPairedComposition` with the canonical `assertClaim`, (c) change its corresponding pre-claim `claimScopedCaseContextBindingKind` branch only once runtime callbacks actually exist, and (d) rerun the **same official `--plan`** expecting `pending.length > 0` and the exact case absent from deferred, followed by a separate official claimed physical execution under the Formal Queue. Never set `fixtureVerified:true`, fabricate a receipt or adjust official state to open the gate.

## Verification and 10+10 review

Offline regression: `node --test scripts/qa-autonomy/qa-runtime-providers/claim-owned-generic-fixture-connector.test.mjs scripts/qa-autonomy/coverage-opr-bill-049.test.mjs scripts/qa-autonomy/coverage-opr-bill-049-source-regression.test.mjs`. This is a simulated integration contract, not a real signed issuer smoke, real Android run, or formal QA PASS.

The connector code was checked independently for (1) false initial readiness, (2) missing RPC callbacks, (3) missing independent verifier, (4) missing canonical claim function, (5) foreign tenant refusal, (6) cross-case owner refusal, (7) wrong idempotency marker, (8) before/after claim recheck, (9) raw source response rejection, and (10) immutable normalized output. All are source-level checks only. The independent horizontal inventory inspected (1) SET012, (2) SET013–016, (3) BILL029–033, (4) BILL049, (5) INP0078, (6) role fixture providers, (7) billing read-only provider, (8) common ES256 issuer path, (9) separate D1 verifier path and (10) official pre-claim partitioner. Only the new opt-in connector and its tests were edited; all unrelated families' runtime integration is **not examined as physical QA**.

**Official source-unblock result: 0 newly runnable; 68 deferred after source change. Official verdict changes: 0.** The P0 blocker is authentic QA fixture mutation/read/cleanup plus independent signed remote-D1 evidence and the shared composition owner's registration. This blocker applies to BILL049 without stopping independent Android/iOS QA lanes.

Final verification: connector/BILL049 test set **19 PASS, 0 FAIL, exit 0**; `git diff --check` exit 0. Connector source SHA256 `234B68A475B09658921E8D87FB80B676969BCD3F8195452B612355C4E9D7504B`, new test SHA256 `A3BE97334261F04E17337EB5E743BEFC8708FE66F79681477521CFAA59E00444`. Final actual read-only `--plan` (with process-local admitted physical provider) artifact `test-results/qa-generic-binder-final-plan-20261024.json`, SHA256 `F0C854F9739FC567E5A697E88B0A4F0A5E834E4B858D8F76CE3BE6F7B2184C94`.
