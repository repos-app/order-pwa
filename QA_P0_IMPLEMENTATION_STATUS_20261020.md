# Android QA P0-1〜P0-3 implementation evidence (2026-10-20)

Status: NOT YET COMPLETE. All original official verdicts preserved.

## P0-1: Independent physical Oracle

- Extended independent-physical-oracles.mjs with cryptographically verified QA
  ES256 + independent D1 receipts, independent case-specific checkpoint/legacy
  callback integration, post-cleanup signed DB proof comparison, and native PNG
  and official evidence packaging.
- The claim-bound physical pair now propagates actual pre/post cleanup receipts.
- The paired composition does not certify cleanup from an early callback flag.
- Remaining: a genuinely approved, runnable independent per-case assertion
  verifier and claimed fixture cleanup; a source module alone is not admission.

## P0-2: Common provider activation

- Both the readiness Windows task and the separate official queue Windows task
  now invoke the same source-pinned activation script. A source SHA alone never
  enables the provider.
- Actual oracle source SHA verified. Live admission STILL FAILED with
  QA_INDEPENDENT_LIVE_ADMISSION_FAILED. Source and test changes did not change
  the official registry. The pre-claim registration vs post-claim verification
  circular dependency needs a secure two-stage lifecycle, not an evidence bypass.

## P0-3: First genuine physical official verdict

- New paired-case-contract.mjs validates full case-specific contracts BEFORE
  claiming the device. Formal runner now defers incomplete cases without
  creating an unrecoverable RUNNING claim.
- Read-only official plan: 203 user-authorized preparation candidates, 0
  runnable, 203 deferred. All 203 currently lack: source-pinned executable
  driver callback, signed D1 record selector, claim-scoped PNG paths,
  exact official expected checkpoints, exact legacy assertions, and a
  verified independent fixture cleanup implementation.
- Actual formal --run --user-authorized was attempted: it refused early with
  QA_PAIRED_RUNTIME_ADAPTER_REQUIRED and exit 1. No official claim, record,
  PASS/FAIL, or original ledger change.
- Android official PASS remains 380; unfinished remains 444.

## Continued owner

- blocker-owner-continuation.mjs now fingerprints the actual changed Oracle,
  physical composition, case contract and runner source, and routes the next
  concrete remediation to the SAME existing P0 repair session. No new
  unrelated worker is needed.
- Required next proof: build ONE approved end-to-end case contract with genuine
  case expectations, scoped fixture, native gestures, independent signed
  before/after and cleanup, then have the formal Runner record its first real
  result. Do not change the official ledger to claim progress.

## 14:42 PHT -- resolved pre-claim factory/claim registration deadlock

- Split registration from per-case admission: the signed-physical-v1 provider
  can now register its independently source-pinned callback factory from
  legitimate ES256 + D1 smoke capabilities, WITHOUT pretending to have
  obtained a canonical official RUNNING claim. Registry source/issuer checks
  remain mandatory, including explicit rejection of an env-injected test JWK.
- At runtime, claim-scoped-paired-composition.mjs now invokes the independent
  verifyAdmission callback ONLY AFTER the official Runner holds a fresh claim.
  The existing verifyLiveReadiness callback remains additionally required.
- Activation gate now explicitly reports
  QA_RUNTIME_CAPABILITY_REGISTERED_PRECLAIM, not a falsely asserted live
  physical verdict. Diagnostic separates capabilityRegistered from
  formalReady, which still requires real claim-bound evidence.
- Independently reviewed Oracle source SHA was brought up to date after
  confirming its regression suite, and both Windows tasks use the same pin.
- Real Windows activation: pin verified, provider registered, gate exit 0.
- Real read-only --plan WITH the new registered factory: user-authorized 203,
  runnable 0, deferred 203 for the 6 missing case contracts. Real --run
  attempt safely refused QA_PAIRED_RUNTIME_ADAPTER_REQUIRED (exit 1) BEFORE
  claim, and official verdict ledger SHA remained unchanged.
- Regression tests for the registration split, claim denial and Oracle
  interface: 30 PASS. This is a completed P0 registration milestone, NOT the
  first formal physical case verdict.

NEXT: Provide source-reviewed and case-specific executable driver, D1 selector,
before/after PNG paths, exact checkpoint, independent legacy assertion and
independent reversible fixture cleanup for ONE existing authorized case.
Then perform the first canonical RUNNING claim and validate the true native
before/after/cleanup evidence. Never mark P0-3 complete from pre-claim
registration alone.
