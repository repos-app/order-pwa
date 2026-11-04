# izakanpai — Google Play AI credit release handoff

Updated: 2026-11-01 PHT. This document tracks real integration state,
not Android or iOS formal QA PASS.

## Independently confirmed

- Apple: three AI consumable SKUs, prices, and three RevenueCat package mappings exist.
- Google Play API: the existing FIREBASE_SERVICE_ACCOUNT returned **403
  PERMISSION_DENIED** while listing one-time products in GitHub Action
  [41228754567](https://github.com/repos-app/izakanpai/actions/runs/41228754567).
  A 403 alone does **not** establish whether the missing prerequisite is
  service-account Play Console permissions, Android Publisher API enablement,
  app registration, or an account/package mismatch.
- RevenueCat project proj7fcf50db: the real API returned app_store and test_store,
  but **no play_store app**, verified independently in Actions
  [41228961687](https://github.com/repos-app/izakanpai/actions/runs/41228961687)
  and [41229246188](https://github.com/repos-app/izakanpai/actions/runs/41229246188).
- The existing service account's email (not its private key) was recovered
  safely in identity-only Action
  [41229102137](https://github.com/repos-app/izakanpai/actions/runs/41229102137).
- Google Play catalog changes, account permission changes, new signed builds,
  genuine store purchases and formal QA: **not executed**.
- Google Play Console screenshots on 2026-11-01 show the AMU Labs individual
  account is not fully verified: Android physical-device verification and
  contact phone verification are pending. The account's menu currently shows
  only Home and Account management. Whether it owns the original izakanpai
  package is **not yet verified**; do not register a duplicate package.

## Existing automation to reuse

1. Google Play catalog: GitHub workflow google-play-ai-credits.yml and
   scripts/google-play-ai-credits.mjs. It checks exact SKUs, creates only
   missing product drafts, uses Google's official regional price conversion,
   and verifies each result. Activation is a separate explicit command.
2. RevenueCat Android app: workflow revenuecat-google-play-app.yml and
   scripts/revenuecat-google-play-app.mjs. It authenticates the original
   Apple project, checks real Play API access, creates the matching Play app,
   uploads a service account key securely and re-reads the result.
3. RevenueCat Offering: existing workflow revenuecat-ai-credit-offering.yml
   and its idempotent script attach corresponding Android products to the
   existing credits_30, credits_100 and credits_300 packages.
   During Android apply mode this workflow requires the matching Play app
   and all three verified attached Play products. An Apple-only Offering
   can no longer be mistaken for successful Android onboarding.
4. Android public SDK key relay: the existing
   scripts/revenuecat-google-play-app.mjs additionally supports
   --sync-public-sdk-key (read-only plan) and --sync-public-sdk-key --apply.
   The writer fetches the exact production goog_ key from the registered
   Play Store app, requires a complete RevenueCat package association and
   three genuinely ACTIVE legacy-compatible Play buy options, then sets only
   REVENUECAT_ANDROID_PUBLIC_SDK_KEY on the common izakanpai-api Worker.
   The key is passed to the existing Wrangler secret mechanism via stdin,
   never printed or checked into Git. It does not need 13 per-store bindings.
   The Cloudflare write requires a previously authenticated operator session;
   this step has NOT been executed.

All three workflows are manual-only. None runs or requests a mobile build.

## Owner-side authorization remaining

- In Google Play Console Users and permissions, grant an app-specific
  Android Publisher service account access for package
  com.izakanpai.commissionpos. Google's Android Publisher API must be
  enabled. First finish the pending AMU Labs account verification and
  establish which Play developer account actually owns the existing
  izakanpai app; if this account does not own it, do not create a duplicate.
  See the
  [RevenueCat Play credential requirements](https://www.revenuecat.com/docs/service-credentials/creating-play-service-credentials).
  A dedicated Play-scoped service account is safer; if using one, register
  its full JSON only in GitHub Actions Secret GOOGLE_PLAY_SERVICE_ACCOUNT_JSON.
  The existing Firebase service account can be reused after a successful
  authorized Play catalog readback.
- Current RevenueCat V2 Secret has Apps read-only scope. Creating the missing
  Android app programmatically requires Apps read/write (prefer a separate
  temporary Secret REVENUECAT_V2_APP_ADMIN_API_KEY), or create the Play app
  using the RevenueCat dashboard and existing valid Play credentials.
- Then execute manual workflows in order: Google Play drafts, RevenueCat
  Play app setup, RevenueCat AI credits Offering attachment. Read back all
  three SKUs and exact package associations; activate Play buy options
  only when ready for purchase QA. Finally sync the Android-specific public
  SDK key into the common Platform Worker through the guarded command above.
- Builds are explicitly NOT authorized by the user so they remain unrun;
  the user performs physical iOS/Android QA.

Never paste private-key material into chat, include keys in action logs,
or grant additional purchase credits without signed, idempotent webhook proof.

## Non-device implementation continued 2026-11-01

- A native iOS/Android purchase checkpoint is stored for the exact
  store + RevenueCat customer + platform before invoking the purchase sheet.
  It survives app/process restart and prevents another checkout while the
  outcome is unresolved. Storage failure also disables checkout.
- Receipt reconciliation uses monotonic, server-signed credit **grant counts
  per SKU**, not the decreasing purchased balance. The page performs bounded
  polling and supports manual refresh. Existing Legacy owners may buy
  additional credits without being offered a second Pro subscription.
- The existing tenant D1 immutable purchase/spend/refund ledger is reused.
  The wallet read API now also returns grant/refund counts and cumulative
  credits. No client may grant or reverse credit.
- Control D1 has a new operator-authenticated, read-only endpoint at
  /internal/operator/ai-credit-audit/query; it aggregates failed/stale/retried
  credit webhook deliveries by store without exposing customer identities.
  The existing Control Worker returns non-2xx for failed delivery, enabling
  RevenueCat provider retries. This does not claim independent replay of
  missed or exhausted provider retries: those require provider redelivery.
- A new authenticated account-wide internal AI budget status route at
  /internal/ai-credit-budget/status returns daily observed/reserved/remaining
  neurons without allocating budget. It is not a public endpoint.
- Real SQLite source regression covers Free, Pro, Legacy and newly created
  store isolation, purchase/grant/refund, and pending restart.
- Run node scripts/ai-credit-release-readiness.mjs for one source-only
  15-contract preflight. All actual external deployment/store/purchase checks
  intentionally remain NOT_VERIFIED until read back from live systems.

These are source changes and local regression results, NOT deployed app
changes, live operator-dashboard integration or formal device QA. Google Play
developer verification/API rights, RevenueCat app permissions, Worker deploy
credentials and an explicitly approved signed app build remain external gates.

## Encrypted RevenueCat webhook recovery — source complete, live OFF

- Reuses the existing signed Control Worker webhook ingress, immutable
  RevenueCat event inbox, cross-store purchase-owner claim, tenant forwarding
  and existing 15-minute cron. No separate scheduler or case-only service.
- After HMAC + Authorization verification and trusted store routing, an
  optional recovery envelope is encrypted via AES-256-GCM and HKDF from the
  existing webhook signing secret, then stored only in Control D1.
- The cron can retry failed/stale events at most five per run with a 10-minute
  delay, 12-attempt ceiling and 7-day retention. It checks the original event
  ID, RevenueCat purchaser, immutable inbox SHA-256 hash and the unchanged
  tenant route before dispatching. A successful retry deletes the ciphertext.
- An unbound paid credit purchase or refund returns retryable HTTP 503
  instead of acknowledging without granting the owner's wallet. The signed
  RevenueCat provider will still handle its own delivery retries.
- The existing operator audit includes applied-after-retry counts. No raw
  receipts, store private keys, authentication tokens or plaintext purchase
  payloads are exposed in the operator report.

**Deployment order is mandatory:**
1. Restore production Cloudflare Wrangler/API authentication and inspect
   the existing Control DB migrator and schema version; do not create a
   separate/replacement D1.
2. Apply additive
   control-plane/0012_revenuecat_verified_replay.sql to the EXISTING Control D1.
   Confirm the new table and index using read-only D1 schema queries.
3. Deploy the updated Control Worker with current production service bindings
   and REVENUECAT_RECOVERY_ENABLED unset (default OFF). Verify real webhook
   routing, signatures and older Pro subscription behavior.
4. Set REVENUECAT_RECOVERY_ENABLED=1 on the Control Worker only after
   verifying migration, secret presence, shared cron, audit permissions and
   all-store signed webhook policy. Verify one legitimate provider event
   via real independent evidence. Never synthesize a real credit grant.
5. Monitor read-only operator audit and D1 encrypted inbox. To stop auto
   replay without changing subscriptions or destroying records, remove/disable
   REVENUECAT_RECOVERY_ENABLED. Rotate webhook signing secret only after
   re-encrypting or draining pending encrypted envelopes, otherwise recovery
   will fail closed.

Offline integration tests prove first tenant failure followed by successful
encrypted local replay and one immutable purchase ownership claim. They
**do not** prove the migration, cron activation or provider behavior in
production; all remain NOT_VERIFIED until an authorized live deployment.

## Authentication recovery verified 2026-11-01 PHT

- GitHub CLI **re-authorized** as `izakanpai`. Read-only GitHub API checks
  verified private `repos-app/izakanpai` and its repository permissions.
  The invalid user-level `GITHUB_TOKEN` override was removed; old inherited
  process environments may still require excluding their stale token.
- Cloudflare Wrangler **re-authorized** as `izakanpai.system@gmail.com`.
  The OAuth credential is encrypted via Windows Credential Manager, and
  live D1 read-only requests and Worker secret-name listings succeed.
- Windows DNS is still broken. CLI HTTPS calls currently use a temporary
  loopback-only per-process DNS-over-HTTPS proxy; neither Windows DNS nor
  the router was modified. This is **not** a permanent network repair.
- Authentication approval did not authorize a commit/push, production
  migration, Worker deploy, new store product, or signed mobile build.

## Additional local implementation: operator AI credit visibility (source only)

The existing Platform Admin page now has a separately authenticated read-only
AI credit operations section and action, using existing Control webhook audit
and shared Cloudflare daily Neuron budget. See
`docs/ai-credit-operator-visibility-20261101.md` for changed sources, bounded
data contracts, source 10+10 review and offline test evidence (162/162 focused
tests and 40/40 operator UI checks). Refund/cancel event aggregates can include
Pro transactions and are labelled accordingly. No new Worker, D1 or secret.
The change is local only: no commit, push, deployment, migration, genuine
provider readback, mobile build or formal device QA.

## Repeatable live production evidence (read-only, 2026-11-01 PHT)

The existing `scripts/ai-credit-release-readiness.mjs` accepts
`--live-read-only`. It calls the new shared
`scripts/ai-credit-production-readonly.mjs` and reads **only**
the existing Control/Platform D1 sqlite_master names, Control/Platform
Worker **secret NAMES**, and GitHub Actions **secret NAMES**. No schema
mutation, build, Action trigger, purchase or deploy is possible from it.
Use the current operator-scoped HTTP(S) proxy only if Windows DNS remains
unavailable. The CLI returns exit 3 while any requirement is missing or
unverified, never an invented success.

The live API readback found: **VERIFIED 6, MISSING 2, NOT_VERIFIED 3**.
MISSING: Control D1 `revenuecat_verified_replay` migration 0012 and
`REVENUECAT_V2_APP_ADMIN_API_KEY` GitHub Secret (the latter may be bypassed
by owner-authorized RevenueCat dashboard app creation, but is missing for
the current automated route). VERIFIED: both existing Control purchase
tables, Platform budget tables, Control/Platform required secret names,
Play/Firebase service account secret presence and RevenueCat read secret
presence. Secret **presence does not prove validity**.

Google Publisher API permission, the RevenueCat Play app/catalog/package
attachment, App Store approval and genuine device QA are NOT_VERIFIED.
The previously logged Google Play Action 41228754567 failed with
`PLAY_AI_CREDIT_PROBE_FAIL:google_play_http_403_PERMISSION_DENIED`;
no new workflow was triggered in this session. Live replay table readback
independently returned `replay_table_count=0`.

Offline checks: original focused suites 162/162 PASS, operator VM 40/40 PASS;
new live-read-only preflight tests **4/4 PASS**, combined source/read-only
readiness tests **5/5 PASS**, pipeline registry now **202 ordered steps** and
contract PASS. Those are **not** formal device QA or deployment evidence.

### Ten source review passes on live preflight

| Check | Verified contract / evidence |
|---|---|
| S01 | Source root is existing isolated latest-main worktree; no root source overwritten. |
| S02 | CLI commands use only D1 SELECT on sqlite_master, Worker secret list, GitHub GET; no write action. |
| S03 | Five independent external reads are awaited together; one unavailable provider does not suppress the others. |
| S04 | Read-only provider results use strict JSON structures; malformed JSON is NOT_VERIFIED. |
| S05 | Missing real replay table returns MISSING instead of interpreting an empty result as healthy. |
| S06 | Missing RevenueCat Apps write Secret returns MISSING without revealing any credential. |
| S07 | A Play/Firebase service account Secret is not confused with Publisher API permission. |
| S08 | Control and Platform DB/Worker checks are distinct; no per-store D1 replacement. |
| S09 | Exit 3 prevents a false-ready preflight; public purchase and formal QA are always unverified. |
| S10 | Four new negative/positive/mocked-run tests and existing runner contract pass; no secrets serialized. |

### Ten horizontal source checks

| Check | Distinct integration surface / evidence |
|---|---|
| H01 | Control production TOML binds the existing Control D1 and scheduled shared cron. |
| H02 | Platform production TOML binds a single shared budget DB and Control service. |
| H03 | Current Control D1 has purchase owner/inbox tables but not replay table. |
| H04 | Platform D1 has both existing budget tables as read from live sqlite_master. |
| H05 | Platform secret names include the account analytics and platform-admin auth; values never exported. |
| H06 | Control secret names include signed RevenueCat auth/secret and internal shared auth. |
| H07 | GitHub Secret names include Firebase/Play credential and RevenueCat V2 read secret; not admin write secret. |
| H08 | Google Play catalog workflow defaults to inspection; no product draft/activation executed. |
| H09 | Existing Native pending-purchase/recovery and signed ledger source regression still passes. |
| H10 | Existing project runner registers the preflight unit test (202 commands), but no formal QA count is altered. |

These 20 checks are source/review/read-only evidence, not 20 production QA runs.
