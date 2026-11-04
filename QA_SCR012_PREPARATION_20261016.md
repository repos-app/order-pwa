# SCR-012 Android Realme official QA readiness — 2026-10-16

Case: `QA2-KEEP-PT-SCR-012` / birthdays.html, tenant `teat`, Realme `0O64B26I28103F70`, signed QA Android build `910019`.

## Verified and implemented

- Remote dedicated teat D1 `tenant_provisioning_marker` SELECT succeeded with explicit `.tenant-provisioner-production-teat.toml`. One matching marker, zero writes.
- Case-data lifecycle: actual authenticated WebView `getBirthdayMembers` read, independent D1 owner read, scoped signed receipt verification and cleanup (`scripts/qa-autonomy/scr012-qa-session-adapter.mjs`). A signing key/issuer is not bundled or fabricated.
- Realme physical control: claim-guarded accessibility node navigation, real ADB gestures, restart, network toggling with Wi-Fi baseline restoration, device screenshot + hash readback (`scripts/qa-v2-realme-scr012-bridge.mjs`). Actual hardware stage completion not yet verified.
- Official claim binding (read-only snapshot revalidation on every action): `scripts/qa-v2-realme-scr012-claim-binding.mjs`.
- In-claim composition, seven-stage evidence validation, canonical PASS record/INCOMPLETE release decision: `scripts/qa-v2-realme-scr012-runtime-composition.mjs`, `scripts/qa-v2-realme-scr012-formal-evidence.mjs`, and `scripts/qa-v2-realme-scr012-formal-session.mjs`.
- Targeted official plan: `node scripts/qa-v2-realme-user-authorized-runner.mjs --plan --scr012`. Running with `--run --scr012` is blocked before any claim or gesture while the server issuer is missing.

## Blocking operational dependencies

1. **No server-issued cryptographic QA receipt provider with pinned public key** for SCR-012. The current app's real `getBirthdayMembers` RPC verifies a signed logged-in session, but the separate Ed25519 receipt expected by the prepared SCR-012 lifecycle is not available. Code must not mark `signatureVerified` or `signedReceiptVerified` without an actually signed artifact.
2. **No live claimed WebView/CDP+issuer factory connected to the official pilot.** The newly composed in-process function accepts authenticated `evaluate`, receipt provider, claim checker and physical navigation inputs, but the current formal pilot dispatch still spawns a generic recipe CLI with only the case ID and deliberately blocks claim-scoped recipes. Wiring it to a real provider is necessary before enabling the first official run.
3. The seven physical recovery stages require execution under a genuine official `RUNNING` claim and exclusive Realme lease; they are currently source-tested, not device-verified. Test-only screenshots/receipts are never promoted to formal evidence.

## Verification

Run targeted source tests:

```powershell
node --test scripts/qa-v2-realme-scr012-claim-binding.test.mjs scripts/qa-v2-realme-scr012-formal-evidence.test.mjs scripts/qa-v2-realme-scr012-formal-session.test.mjs scripts/qa-v2-realme-scr012-runtime-composition.test.mjs scripts/qa-v2-realme-scr012-bridge.test.mjs scripts/qa-autonomy/scr012-qa-session-adapter.test.mjs scripts/qa-autonomy/coverage-scr012-d1-readback.test.mjs
```

21 PASS / 0 FAIL on the above targeted tests. Official Android ledger unchanged: PASS 297, FAIL 47, BLOCKED 2, NOT_RUN 485, RUNNING 0. No D1 writes, real-screen gestures, formal claim, deploy or commit in this preparation turn.

Do not remove the runtime block merely to change `--plan` to READY. Connect a real authenticated QA issuer, prove the signed receipt on `teat`, and wire the actual in-claim runtime/evidence finalizer first. No human pre-run reviewer gate is required.
