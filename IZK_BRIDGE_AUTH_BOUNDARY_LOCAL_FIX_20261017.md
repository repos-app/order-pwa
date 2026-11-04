# Native bridge authentication boundary — local source repair

## Root cause and boundaries

Before edits `git diff -- mobile-app/web/bridge.html` was empty. Source `bridge.html` lines 110–112 read `nativeAuthClient().getToken()/ready()` at startup; the `managementToken` path also invoked those direct vault helpers. This bypassed `API.pageReady` generation-aware session restoration and risked reusing old token values after logout, workspace switch, or a hanging ready promise. `AGENTS.md`, master runbook and `mobile-app/web/api.js` were reviewed; the API contract is `API.pageReady({auth:'required',requireStore:true})` returning `{token,storeId}`, with current session token/store queried separately. The bridge still uses `nativeHostWindow` only for Bluetooth plugin access, not auth.

Only `mobile-app/web/bridge.html` and new dedicated test/doc were changed. Startup's unused direct-auth IIFE and `nativeAuthClient()` removed. `managementToken` now uses shared `API.pageReady`, refuses no token, mismatched token/store and explicit bridge store mismatch, and bounds the ready call with a 5-second fail-closed deadline. Timers are cleared on success/failure. Every privileged native `nativePrintPoll`, `nativePrintAck`, `getNativeReceiptLogo`, `getAllPrinters` and one-shot key fetch continues through management token or existing `pageReady`. No native-auth, API, hosted PROD/TEST, or official QA edits.

## Verified source reviews S01–S10

S01 pre-edit bridge diff clean; S02 direct startup auth references inventoried; S03 direct managementToken references inventoried; S04 shared pageReady and currentToken API implementation read; S05 removed direct `getToken`; S06 removed direct `ready`; S07 removed parent NativeAuth bridge auth lookup while keeping native Bluetooth host; S08 deadline bounded; S09 session token/store equality; S10 `bridgeStoreId` equals active authenticated store. Source assertions and offline VM run for all relevant controls.

## Cross-impact reviews H01–H10

H01 standalone startup no unhandled direct auth ready; H02 iframe same-origin parent Bluetooth plugin retained; H03 missing API fails closed; H04 empty token fails closed; H05 changing current token after ready rejects; H06 changing current store after ready rejects; H07 query/saved bridge store mismatch rejects; H08 pending pageReady rejects after bounded timeout; H09 bridgePoll/bridgeAck backoff test preserves one-ACK behavior; H10 all management print RPC call paths read `managementToken` or shared `pageReady` and no source DB changes. These are source/VM checks, **not physical printer or live iframe execution**.

## Before/after evidence

- Before edit: `node --test test/izk_bridge_auth_boundary_regression_test.mjs` **2 failures**, including detection of direct `nativeAuthClient()`.
- After edit: dedicated regression **2/2 PASS exit 0** (real `managementToken` body in VM, including 5-second hanging readiness case).
- Existing `test/d1_p0_print_bridge_backoff_test.mjs` **PASS exit 0** for Native / Web PROD / Web TEST.
- No build, commit, push, deploy, hardware, official QA, or shared-source mutation performed.

**Dependencies not modified:** parent/iframe shared-session behavior and native API token hydration need signed-WebView validation; API token lifetime and server authorization remain owned by their separate maintainers. Old native_auth test may be edited concurrently by its owner and is not claimed here.
