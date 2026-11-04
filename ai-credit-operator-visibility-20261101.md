# AI credit operator visibility — source-only handoff (2026-11-01 PHT)

## Scope and acceptance evidence

Source worktree: `.ai-credit-release-20261031`, base `origin/main` at `b3059d5`.
The shared `main` checkout is 29 commits behind its local remote-tracking ref
and has unrelated dirty work; it was **not** reset, merged, rebuilt or deployed.

New operator-only read action `getAiCreditOperationalStatus` reuses the
existing platform token, Control Worker service binding, Control D1 signed
webhook audit, Cloudflare GraphQL account usage and account-wide budget
calculator. It provides a separate manual read button in BOTH existing admin
HTML copies. No client can adjust a balance, mint a receipt, activate a product
or initiate AI inference from this action. Never treat absent readings as 0.

**Important scope caveat:** `src/aiCreditAudit.js` selects
`NON_RENEWING_PURCHASE`, `REFUND` and `CANCELLATION` from the existing
Control inbox. Refund/cancellation aggregates can include Pro subscriptions;
they are **not** exclusive per-SKU credit-purchase metrics. The UI explicitly
explains this instead of misrepresenting the sum.

- Source API: `src/aiCreditOperationalStatus.js`; exact action allowlists in
  `src/index.js` and `src/hybridPublicRouter.js`.
- UI: `docs/admin.html` and `docs/admin/index.html` are byte-identical.
- Tests: `test/ai_credit_operational_status_test.mjs` and modified
  `test/platform_admin_visibility_test.mjs`; both registered in existing
  `test/project-test-commands.json` (201 commands, registry contract exit 0).
- Combined relevant Node credit/RevenueCat/menu tests: **162 PASS, 0 FAIL,
  exit 0**. Admin VM/static visibility: **40 PASS, exit 0**. Pipeline
  registration contract: exit 0. `git diff --check`: exit 0.
- External Worker/D1 deploy and real admin page readback: **NOT EXECUTED**;
  no mobile builds, TestFlight/Play distribution, real purchases, formal QA,
  commit or push were performed. Shared `main` untouched.

## Ten independent source reviews (source only, not device QA)

| Review | Specific source traversal and observed result | Status |
|---|---|---|
| S01 | Read prior `docs/ai-credits-google-play-handoff-20261101.md`: private audit/budget routes existed but admin screen was not connected; added read-only operator action instead of a second Worker. | PASS |
| S02 | Traced button `docs/admin.html:219-224` to hybrid allowlist (`src/hybridPublicRouter.js:423-428`), API route (`src/index.js:1071-1074`) then shared module and private Control/budget handlers. | PASS |
| S03 | Inspected `src/aiCreditOperationalStatus.js`: validates UTC date, recognized guard state, safe nonnegative counts, bounded error categories and required summary keys; malformed Control/budget data returns unavailable. | PASS |
| S04 | Checked `src/index.js:1048-1084`, `src/controlPlaneWorker.js:86-95` and API tests: wrong platform-admin token returns 403 before any Control/GraphQL request; private Control secret never comes from browser. | PASS |
| S05 | Read missing-credential, unavailable-binding, unsuccessful HTTP, invalid JSON/result and GraphQL failure paths; unit tests verify errors do not reuse previous success. | PASS |
| S06 | Traced `/status` in `src/aiCreditBudgetWorker.js:77-96` (SELECT only), `src/aiCreditAudit.js:10-47` (SELECTs only), and new module; no purchase/reserve action or ledger mutations reachable. | PASS |
| S07 | Reviewed responsive `.grid` breakpoints in admin CSS, initial hidden `#details`, manual load button, reset on authentication failure, and VM display tests for success/unavailable states. | PASS (source/UI VM) |
| S08 | Audited output allowlist, generic backend errors and `esc()` in admin category rendering; regression injects HTML into a failure code and verifies it is escaped. | PASS |
| S09 | Executed new API 5 cases plus shared related audit/AI-budget tests, existing 40 admin VM checks and 162-case focused regression; all exit 0. | PASS |
| S10 | Verified `git diff --check` exit 0, only listed scoped files modified, admin HTML SHA256 parity and unchanged shared root worktree. | PASS |

## Ten independently scoped horizontal source checks

| Review | Independent starting point, follow-through and result | Status |
|---|---|---|
| H01 | Searched `mobile-app/web` and Android source for platform-admin token/action: no Native operator page; operation remains server-side, not a purchaser-facing change. | N/A (different surface) |
| H02 | Searched iOS source and shared Native web assets: no operator-admin entry; no mobile build or new entitlement exposure. | N/A (different surface) |
| H03 | Compared public production operator `docs/admin.html` with nested `docs/admin/index.html` and verified matching SHA256 after change. | PASS |
| H04 | Searched `docs/yuwaku/test`, `docs/public` and other HTML for platform-admin token: no separate TEST operator surface. Existing QA portal not copied or modified. | N/A (separate entry) |
| H05 | Traced preexisting `getPlatformUsage`, plan save, shared card/escaping/render helpers and `resetDetails` in both admin pages. New status has independent failure state and does not replace pricing or AI usage metrics. | PASS |
| H06 | Reversed API handlers and `ROUTE_PLATFORM_ACTIONS` versus `src/gasApi.js`: the new operator-only action is on the direct/hybrid API, not tenant GAS RPC; verified successful/403 requests using hybrid Worker. | PASS |
| H07 | Read Control inbox SQL/query shape, budget-day `reserved_neurons` read, and underlying `revenuecat_event_inbox`: no new schema/tenant SQL. Identified that refund/cancel counts may cover Pro; UI caveat added. | PASS |
| H08 | Reviewed Japanese operator labels, UTC date and integer `num()` display on both copies. Purchaser-facing bilingual Native text is unchanged. | PASS (source/UI VM) |
| H09 | Checked no store selector is accepted, no owner/customer identifiers returned, `PLATFORM_ADMIN_TOKEN` required, and no Free/Pro purchase entitlement or replay flag changed. | PASS |
| H10 | Independently searched backwards from `creditOpsLoadBtn`, `loadCreditOps` and `getAiCreditOperationalStatus` across both HTML copies, API/Worker action allowlists and automated tests; no orphaned call or missing mirror found. | PASS |

## Outstanding operator and rollout gates

1. GitHub/Cloudflare CLI OAuth has now been restored and independently read
   back (2026-11-01 PHT). Windows DNS remains broken; the temporary scoped
   command proxy is **not** a permanent repair. Do not expose API secrets.
2. Google Play account verification and Android Publisher API application
   permission still block three buyable SKU drafts and RevenueCat Android app.
3. Apply existing Control migration 0012, deploy existing Control/Platform
   code, then separately enable signed webhook replay only after live readback.
4. Deploy the new admin operator API/UI and independently confirm one genuine
   all-account budget response and Control D1 audit read under valid admin auth.
5. Mobile builds, signed distribution and real-device formal purchase QA remain
   separate owner-controlled gates. Source tests do not make public release ready.

No extra scheduler, duplicate billing Worker, new tenant DB or credit grant
path was added.

For the latest **live read-only** D1/Worker/GitHub prerequisites see
`docs/ai-credits-google-play-handoff-20261101.md` and run
`node scripts/ai-credit-release-readiness.mjs --live-read-only`.
