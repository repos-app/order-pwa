# P0: ES256 common physical QA runtime not admitted (2026-10-20)

## 2026-10-20 02:31 Asia/Manila — actual deployment and independently tested issuer

The user explicitly authorized Cloudflare changes and confirmed all Stores
are in pre-launch TEST use (some D1 identity markers still say production).
These commands have **already run**; do not repeat key provisioning:

1. Guarded QA-only Worker signing-secret provisioning completed successfully.
   Remote Wrangler name inventory verified all three QA ES256 secret names
   exist on **izakanpai-api-teat only**. Public P-256 JWK is staged separately
   under the ignored runtime folder; the PRIVATE JWK is a Cloudflare secret,
   never checked into source.
2. Dedicated teat Worker deployed from
   .tenant-provisioner-production-teat.toml, version
   f535b300-45a0-44cc-9ec6-0760ae9d503d.
3. Control Plane Worker deployed from
   wrangler.control-plane-production.toml, version
   31423c4e-e224-4b83-b757-d9c2ead21002.
4. Public hybrid router deployed from
   wrangler.hybrid-router-production.toml, version
   47f57581-36db-4f5a-b09f-cc0c4549b83f.
5. Live anonymous POST on public readback now returns HTTP 401
   (previously 404), legitimate WebView OPTIONS returns 204 with scoped
   CORS, unknown-origin POST returns 404, and GET /health returns 200.
6. On physical Realme RMX3938, a genuine authenticated teat WebView
   session returned an ES256 Worker signature. The independent Windows
   public verifier validated it; a separately authenticated Wrangler
   D1 SELECT of the same test Store and setting value matched exactly.
   The smoke reported LIVE_ES256_AND_D1_SMOKE_VERIFIED.
7. The automatic Windows task can renew this strictly READ-ONLY live smoke
   proof only when no official RUNNING case is present. Public verifier
   trust is SHA-bound to that real smoke and expires after 24 hours.

**DO NOT count step 6 as a formal verdict.** The smoke uses an explicit
nonformal random smoke ID, no official claim, no case checkpoints, and no
physical step evidence; it records no QA PASS/FAIL. The official provider
therefore still returns ready:false, now with the accurate blocker
QA_SIGNED_ISSUER_INDEPENDENT_D1_AND_PHYSICAL_ORACLES_NOT_BOUND.

The next precise integration is
scripts/qa-autonomy/qa-runtime-providers/claim-bound-es256-oracle.mjs
with the approved per-case Realme UI driver and independent native PNG,
checkpoint/legacy, fixture reconciliation and officialRunner evidence
callbacks. Validate one genuinely RUNNING claim before registering the
paired-physical-v1 factory and executing the remaining 444 Android cases.
At this checkpoint: formal PASS 380, Android unfinished 444; no fraudulent
approval or direct ledger write.

## Verified, read-only root causes

- Official Android PASS remains 380; automatic preparation is not a formal verdict.
- The QA-specific Worker (izakanpai-api-teat) has no listed
  QA_DB_ATTESTATION_PRIVATE_JWK secret. The QA enablement and Store ID
  are also absent from its secret list; ordinary Worker variables were not
  inspected and must not be assumed absent without evidence.
- An unauthenticated POST to the published public QA readback URL returned
  HTTP 404. The source has been repaired locally but not deployed.
- Windows does not have a trusted public verifier JWK, and the provider still
  deliberately returns ready:false after a syntactically valid JWK unless
  genuine claim-bound signed receipts and independent device oracles exist.
- Realme ADB and the dedicated teat remote D1 identity are verified separately.
  Neither is a signed receipt or authorization to record PASS.

## Completed offline changes

- src/hybridPublicRouter.js and src/controlPlaneWorker.js route ONLY the
  authenticated teat QA readback path through dedicated physical tenant
  routing. Cross-tenant requests and unknown origins fail closed.
- test/qa_es256_route_test.mjs validates the corrected route, preflight
  CORS, the dedicated tenant target and forbidden cross-tenant readbacks.
- es256-deployment-audit.mjs audits the exact test Worker using Wrangler
  secret names only; a bounded 30-minute cache is consumed by Windows
  readiness supervision and the dashboard. No secret values are recorded.
- provision-es256-teat.mjs is an explicitly approval-gated QA-only key
  provisioning workflow. Its PLAN is read-only; APPLY is NEVER unattended.

## Deployment approval boundary

1. Explicit user authorization is required to modify the deployed QA test
   Worker izakanpai-api-teat. The proposal provisions ONLY
   QA_DB_ATTESTATION_PRIVATE_JWK, QA_DB_ATTESTATION_STORE_ID=teat and
   QA_DB_ATTESTATION_ENABLED=1 to this Worker. The private JWK is never
   logged or written to the file system; the corresponding public JWK is
   stored as a *staged* verifier pin, NOT trusted proof.
2. Actual deployment of the public router and Control Plane Worker changes
   needs a reviewed independent approval and rollback plan. Do not replace
   tenant bindings or route any customer data through the teat QA Worker.
3. To inspect the proposed test-only Worker change WITHOUT touching Cloudflare,
   execute: node scripts/qa-autonomy/qa-runtime-providers/provision-es256-teat.mjs --plan

## Nonnegotiable post-deployment verification

1. Verify a genuinely deployed ES256 issuer response via an authenticated
   WebView session and fresh nonce bound to a current RUNNING official claim.
2. Verify the response with a trusted public P-256 key and compare its data
   to the SAME dedicated D1 database using independent Wrangler SELECT.
3. Prove a pinned signed APK, exclusive Realme lease, actual gestures,
   native PNG evidence, independent checkpoint/legacy oracles and cleanup.
4. Only then activate the common provider via activation-gate.mjs, admit
   actual case recipes, execute one real pilot and record a formal verdict
   through the existing official runner.

Do not fake a signature, substitute the separate UI15 RS256 issuer, overwrite
the official ledger, bypass claim/stop/source SHA guards or mark any case PASS
on the basis of secret deployment or green offline tests alone.
