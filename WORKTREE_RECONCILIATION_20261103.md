# izakanpai dirty-root source reconciliation — 2026-11-03 (PHT)

## Scope and preservation rules
- Original Windows root: C:/Users/user/OneDrive/_work/izakanpai, local branch main HEAD fecaacc.
- Latest GitHub main was d6ddf75 when the full 46-file inventory was measured (60 commits ahead of the root HEAD).
- Read-only original root: original working-file contents, untracked QA fixtures, case claims, and other workers' journals were NOT reset, deleted, or cherry-picked wholesale.
- The 46 tracked modifications classified below are against the OLD root HEAD. An apparently modified file can be byte-identical to the current GitHub main.
- Never run git add -A, reset --hard, clean -fd, or commit the root tree as-is. Reconcile only individual changes using a clean latest-main worktree.

## 46 tracked files by actual content hash (snapshot after d6ddf75)

### 21 byte-identical to the released main — no further integration necessary
.github/workflows/store-release-readiness.yml
AGENTS.md
CLAUDE.md
package.json
package-lock.json
scripts/qa-autonomy/cos-local-control.mjs
scripts/qa-autonomy/cos-local-control.test.mjs
scripts/qa-autonomy/formal-blocker-remediator.mjs
scripts/qa-autonomy/formal-blocker-remediator.test.mjs
scripts/qa-autonomy/hourly-cross-os-audit.mjs
scripts/qa-autonomy/hourly-cross-os-audit.test.mjs
scripts/qa-autonomy/readiness-supervisor.mjs
scripts/qa-autonomy/readiness-supervisor.test.mjs
scripts/qa-autonomy/source-lane-dispatcher.mjs
scripts/qa-autonomy/source-lane-dispatcher.test.mjs
src/accountDeletion.js
src/aiPromptSettings.js
src/platformUsage.js
src/subscriptions.js
test/platform_usage_test.mjs
test/qa2_header_two_row_regression_test.mjs

The QA source and regression tests were integrated in commit d6ddf75. No APK/iOS build was started. Full local QA tests 93/93 PASS where the historical runner data exists; clean-worktree tests 76/76 plus real Chromium header 9/9 PASS. These are source tests, not formal physical-device verdicts.

### Three local-only, not conflicting with main — eligible for selective integration
- docs/yuwaku/inventory.html and docs/yuwaku/test/inventory.html: authenticated AI balance/quote and explicit credit consent, camera versus photo picker, local image quality warnings and bilingual labels.
- ios/App/App/Info.plist: update the camera permission description to mention AI menu import photos.

The inventory and Info.plist updates are included in the subsequent selective UI integration, with their corresponding helper modules and regression tests. The feature flag is NOT enabled by this code integration.

### 22 simultaneous divergent paths — never replace latest main with old file contents
- docs/admin.html and docs/admin/index.html: old operator UI; would lose account-wide error spikes, 365-day search, new AI credit operational monitoring.
- docs/yuwaku/header.js, docs/yuwaku/test/header.js and mobile-app/web/header.js: safe QA header regression integrated in d6ddf75; remaining differences are optional AI balance badge/hub. Port only with matching helper and authenticated read-only API.
- docs/yuwaku/sw.js and docs/yuwaku/test/sw.js: latest main includes independent hourly reporting changes. Preserve latest file and append only new AI helper cache items; do not copy old service worker.
- mobile-app/web/billing-native.js: old source removes current purchase-recovery session, finite polling and double-purchase protection; REJECT old overwrite.
- mobile-app/web/subscription.html: old source removes credit balance refresh and billing-credit-recovery.js; REJECT old overwrite.
- mobile-app/web/config.js: old source turns purchased AI credit feature flag off although current main enables guarded storefront; REJECT old overwrite. Existing protections depend on real SDK offering, verified owner and server wallet.
- mobile-app/web/inventory.html: newer camera/quality/charge-preview UI with preserved current 4th consent parameter; integrate selectively and test.
- mobile-app/web/menu_editor.html: newer camera/quality controls, but coupled to an older menu-ai-import.js implementation; HOLD pending a merge into the expanded current importer, never copy the older importer.
- src/controlPlaneWorker.js: old source deletes encrypted verified RevenueCat replay, dispatch attempts, 365-day R2 diagnostics and error spike monitor; REJECT old overwrite.
- src/index.js: old source lacks latest operator/diagnostics/report features; REJECT old overwrite, port only the read-only credit total handler for the UI.
- src/gasApi.js: mostly AI wallet APIs already upstream; add only authenticated total balance summary required by the new management badge.
- src/hybridPublicRouter.js: old source adds legacy AI budget relay with different broker bindings; main has later payment/usage changes. HOLD for standalone service/permission review, no unconditional overwrite.
- src/integrations.js: old source accepts arbitrary minute values for report schedule, conflicting with newly approved hourly-on-the-hour report policy; REJECT old overwrite.
- src/tenantDb.js: old source omits ai_credit_reconciliation_checks table in allowlist; REJECT old overwrite.
- src/tenantProvisionerService.js: old source lacks existing-tenant billing relay repair and new tenant AI feature binding; REJECT old overwrite.
- src/tenantProvisioningMigrations.generated.js: old generated schema is missing newer migrations; REJECT old overwrite and do not regenerate from old root.
- test/platform_admin_visibility_test.mjs, test/revenuecat_sandbox_sqlite_integration_test.mjs: old test fixtures omit newer diagnostics/replay expectations. Keep latest-main version; merge only novel assertions if independently useful.

## Untracked files
Already byte-identical to main: control-plane/0011, migrations/0048-0049, platform-plane/0004-0005, many menu-AI scripts, PDFjs vendor files and existing tests. Do not recommit these.

Not present in main:
- AI UX helper modules in all 3 surfaces: ai-credit-hub.js, ai-credit-ui.js, ai-image-quality.js. Selectively integrated with client/API source and browser tests, NOT as isolated broken script references.
- AI browser tests: ai_credit_hub_ui_test, ai_credit_inventory_browser_test, ai_image_quality_browser_test integrated with their matching source. ai_credit_button_ui_test includes a menu-import dependency not yet present in latest main; hold that entire assertion for the later menu-import merge.
- MENU_IMPORT_ACCURACY_PREFLIGHT, AI_IMPORT_QUALITY_CAMERA, AI_CREDIT_ACTION_UX notes: design documentation, not required to activate the existing runtime. Retain for provenance review.
- test-data images/CSV/JSON: separate menu-image QA fixtures, not formal evidence and not appropriate for broad auto-commit without owner/provenance review.
- QA source guard/build ban newly added in d6ddf75; root copy still untracked because original root is an old branch.

Different from main:
- mobile-app/web/menu-ai-import.js is an older implementation (copying it would REMOVE 334 lines from main). Do not overwrite.
- src/aiCredits.js, src/aiCreditRuntime.js, src/aiCreditActions.js, src/aiCreditBudgetWorker.js and related tests and rollout script are earlier versions; do not overwrite latest paid-credit ledger, reconciler, budget and tenant rollout protections.

## Release and verification boundaries
- QA source safety fixes: d6ddf75 on GitHub main, 93/93 root source regression, 76/76 clean source, 9/9 real Chromium QA header regression.
- AI balance badge and inventory enhancements: source-only tests use actual local Chromium plus API authentication checks. They do not create real AI charges or test RevenueCat purchase fulfillment.
- Web inventory feature-flag alignment remains a rollout prerequisite. Native client and server must agree on when AI credits are chargeable; Web production/test default has no charge-enabled flag. Do not enable account charging until all 3 surfaces explicitly show the quote and send matching consent.
- No change to official QA case PASS/FAIL/SKIP count; no automation build or mobile distribution.
- The original root worktree is NOT discarded or reset. The 46 apparent changes must be treated as historical plus parallel-owner assets, not as a queue of 46 safe commits.
## Final reconciliation after selective commits (2026-11-03)
GitHub main now includes:
- d6ddf75: shared QA automation safeguards and common header regression fixes.
- 1f247ce: read-only authenticated AI total badge, inventory consent/camera/image quality UX in all three source surfaces, camera permission description, associated browser tests and this audit.

After 1f247ce, a fresh 46-file comparison of the untouched original root against GitHub main produced:
- 29 tracked working files **byte-identical to main** (they are only marked dirty because root HEAD is stale).
- 0 tracked files with a local-only change relative to the old base and still-unmodified upstream path.
- 17 tracked working files that diverge from current main; exact paths:
  - docs/admin.html; docs/admin/index.html
  - docs/yuwaku/sw.js; docs/yuwaku/test/sw.js
  - mobile-app/web/billing-native.js; mobile-app/web/config.js; mobile-app/web/menu_editor.html; mobile-app/web/subscription.html
  - src/controlPlaneWorker.js; src/hybridPublicRouter.js; src/index.js; src/integrations.js
  - src/tenantDb.js; src/tenantProvisionerService.js; src/tenantProvisioningMigrations.generated.js
  - test/platform_admin_visibility_test.mjs; test/revenuecat_sandbox_sqlite_integration_test.mjs.
- Root git HEAD is still fecaacc, **61 commits behind main**; intentional preservation for concurrent QA work.

Regression exclusions are effective at GitHub level, NOT by erasing root files. The old control plane and public API must NOT replace currently released originals. The old native billing and subscription files REMOVE paid-credit recovery and would permit purchase-confirmation regressions. The old report settings accept minute values again, contrary to user-approved whole-hour delivery. The old migration snapshot lacks later SQL tables. The remaining menu-import camera UI is held because the old untracked mobile-app/web/menu-ai-import.js would delete 334 lines of newer upstream behavior.

Cloudflare API Worker was updated from clean main 1f247ce, version f018c485-cb4c-498f-bb85-cdbca2901308, 100% production. The backend /health returned HTTP 200. Public unauthenticated balance-API probing without store context returned HTTP 404; this alone is not authenticated business-path validation and should NOT be counted as a successful real-user credit read.

**Static-site publishing is a separate release step.** The order-pwa repository was still clean main 9e10265, while https://izakanpai.com/yuwaku/ai-credit-hub.js returned HTTP 404 and the PWA yuwaku code was much older than source: PWA service worker cache v263 vs source v289. Therefore new UI is committed in izakanpai source, but the Web production site's corresponding files are NOT YET published. Blindly overwriting the entire divergent PWA would cause a new regression risk; conduct a dedicated source-to-PWA merge and publish/test before calling the web deployment completed.

No independent real RevenueCat purchase, actual AI charge, physical device test or formal Android/iOS verdict was generated by this source reconciliation. Do not enable inventory charging before server/client feature flags and explicit quoted consent are aligned in Native and both Web surfaces.