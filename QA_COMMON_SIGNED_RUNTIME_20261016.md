# izakanpai QA: signed readback + formal Realme execution (common foundation)

Scope: official Android physical QA 831-case runner. User-authorized isolated QA store `teat`. **No new PASS is recorded by preparation code.**

## ① Signed, authenticated database proof — common pathway

1. In the active logged-in Android WebView, `scripts/qa-autonomy/qa-webview-attestation.mjs` sends the existing current session token directly over HTTPS to the Worker at `POST /qa/attest/readback`. The Node process does not retrieve or persist the token.
2. `src/index.js` verifies its signed token and current employee session using the existing backend boundary. `src/qaAttestation.js` requires a QA-only enabled store, an authorized manager role, a caller challenge and official claim reference, and issues an ES256 receipt for a bounded read-only query.
3. Readback `kind` uses a **finite common allowlist**: `reservation`, `members`, `birthdays`, `settings`. The SQL always pins `store_id`; settings keys are additionally whitelisted; phone numbers are hashed before being signed; reservation names and notes are not returned. No user-provided SQL is executed.
4. `scripts/qa-autonomy/qa-d1-independent-readback.mjs` reads the same row through an independent Wrangler connection to the dedicated QA D1. It specifies the exact tenant Wrangler config with `--config`, first checks `tenant_provisioning_marker`, and then executes only allowlisted SELECT statements. It compares the independently read values with the cryptographically verified Worker receipt. A valid Worker receipt **alone** does not count as an independent D1 check.
5. `scripts/qa-autonomy/physical-formal-evidence.mjs` requires actual screenshot files, matching SHA-256, signed DB receipt verification, independent physical/DB assertion callbacks, and coverage of every legacy and acceptance check before producing any PASS candidate.

**Server configuration (not provisioned in this change):** Set `QA_DB_ATTESTATION_ENABLED=1`, `QA_DB_ATTESTATION_STORE_ID=teat`, and a strong generated private EC P-256 JWK in the Worker secret `QA_DB_ATTESTATION_PRIVATE_JWK` on the dedicated QA tenant Worker only. Provision the matching **public** JWK in the runner through a separately pinned local verifier configuration. Private signing keys must never be copied into files in the repo, screenshots, logs, test output or AI chat. The endpoint defaults to unavailable until configured; deploying a QA Worker/server change requires its own rollout authorization.

## ② Generic real-device execution — shared pipeline

- `official-claim-binding.mjs`: Derives a stable run-scoped claim ID from the canonical ledger and verifies the exact official RUNNING claim, physical device, approved build and exclusive owner lock on every physical action.
- `official-paired-runtime.mjs`: Common lifecycle in fixed order: verify source-pinned driver, verified signed & independent DB read before gestures, real driver execution, then claim-bound cleanup/reconciliation even when execution fails; results remain PASS_CANDIDATE until independent verification.
- `official-runtime-registry.mjs`: Maps a source-pinned `runtimeAdapterKey` to an actually configured runtime provider. Paired packages that have only a driver and data declaration do **not** become executable by themselves. Existing non-paired driver cases remain independent.
- `official-runtime-bootstrap.mjs`: Loads a common provider only from `scripts/qa-autonomy/qa-runtime-providers/<name>.mjs` when `QA_OFFICIAL_RUNTIME_PROVIDER` and matching `QA_OFFICIAL_RUNTIME_PROVIDER_SHA256` are set. The provider must expose `createQaOfficialRuntimeProviders()` with actual signed-DB and physical evidence verification callbacks. Otherwise the registry stays empty and the affected cases are deferred individually.
- `qa-v2-realme-unattended-pilot.mjs`: Once the configured provider is runnable, acquires the canonical claim under the exclusive Realme lock, passes the bound context to the registered shared runtime **instead of spawning a case driver blindly**, verifies its outcome, and submits genuine PASS evidence to the unchanged official `qa-v2-official-runner.mjs` for its complete checkpoint/file verification.
- `qa-v2-realme-user-authorized-admission.mjs`: Assigns `paired-physical-v1` to correctly source-pinned `*.pair.json` bundles. This is a runtime key, not a reviewer approval or pre-execution fixture PASS claim.
- `qa-v2-realme-expense-fixture-adapter.mjs`: Existing authenticated CDP bridge now supports read-only birthdays alongside members/reservations with page-specific RPC allowlisting.

### Execution and verification (Windows PowerShell 5.1)

```powershell
node --test scripts/qa-autonomy/*.test.mjs
node --test test/qa_attestation_test.mjs test/qa_v2_realme_worker_bridge_contract_test.mjs
node scripts/qa-v2-realme-user-authorized-runner.mjs --plan --scr012
```

`--plan` shows eligible cases separately from `deferredRuntimeCases`; deferred source packages must not be silently counted as executable. `--run` without an activated signed provider fails **before** acquiring a formal claim or touching the physical device. Do not set an unverified `runtimeProviderReady=true` or fabricate signed receipt / expected checkpoint flags.

## Remaining activation gate (external, not a case-by-case approval)

The reusable code and offline tests are available, but the Cloudflare Worker has **not** been deployed with the new QA-only endpoint or server signing secret/public key. No real issuer or SHA-pinned live runtime provider is configured. Once authorized and deployed, provision the common provider with the authenticated WebView/CDP session, independent Wrangler reader, public-key signature validator, case data/driver factory and actual native screenshot verifier. Then the existing official runner can execute eligible paired cases without introducing an additional reviewer step. No QA claims or production deployment were made during this work.
