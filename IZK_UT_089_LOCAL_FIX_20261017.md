# IZK-UT-089 / QA2-SET-008 — Local source fix handoff

## Evidence, cause, and boundary

Original formal outcome: **FAIL** (QA APK 910019 / Realme RMX3938 / teat). Formal evidence: `test-results/qa-v2-evidence/playwright-realme/2026-10-17T07-52-27-056Z/QA2-SET-008/formal-accent-fail-evidence.json`. The server persisted `accentColor=#1e7a4c`, but the management surface continued to use `#0f172a` after restart; restored `#0f172a` after testing. This document does **not** change that official outcome.

Cause: customer-order `app.js` already writes the `--accent` CSS variable, whereas the management pages never read it and each shared header had a hardcoded background. The common headers now request the current store settings after authenticated initialization and pageshow; native uses authenticated `rpc/getSettings`, Web/TEST use their existing `getSettings` action. `showHub()` refreshes after login/revalidation within the current document. The code accepts only six-digit hex, falls back to `#0f172a`, checks that the same token is current before applying a response and resets on unauthenticated refresh. Hub legacy header and selected tabs read `--accent`; `--navy` continues to represent dark text, to preserve readability.

## Validation

### 2026-10-17 071 logout regression VM compatibility follow-up (worker-2)

Allowed edits limited to `test/izk_ut_071_logout_privacy_regression_test.mjs` and this document. Before change `node test/izk_ut_071_logout_privacy_regression_test.mjs` exited **1** at `verifyHeader` line 159 with `TypeError: Cannot read properties of undefined (reading 'style')` from header `applyAccent`, because its 071 VM `document` lacked `document.documentElement.style`. Actual 089 header implementation calls `document.documentElement.style.setProperty('--accent', ...)` and resets on signed-out `syncAuthDisplay`. Replaced the missing mock with a **stateful** `CSSStyleDeclaration`-like Map implementing `setProperty`, `getPropertyValue`, `removeProperty`. Added checks for setting and removing custom properties; simulated a previously authenticated user's `#1e7a4c` accent, verified logout reset to `#0f172a` on Native, hosted production, hosted TEST, and verified the new user's session does not retain old color. Existing logout token/refresh-token and identity/visibility assertions remain active. After change: **163/163 checks PASS, exit 0**. `git diff --check -- test/izk_ut_071_logout_privacy_regression_test.mjs`: **exit 0**. Only the VM regression test and this document were modified in this task.

Additional independent S01–S10 source/test reviews: S01 original TypeError/line inspected; S02 native header `applyAccent` implementation inspected; S03 hosted production header call inspected; S04 hosted TEST header call inspected; S05 stateful `setProperty` implemented; S06 `getPropertyValue` round trip asserted; S07 `removeProperty` previous value and deletion asserted; S08 former user green value injected and checked; S09 logout safe default checked in all three; S10 post-login second user independent theme and test exit 0 checked.

Horizontal H01–H10 reviews: H01 Native header identity removal remains asserted; H02 Web production identity removal remains asserted; H03 Web TEST identity removal remains asserted; H04 Native Refresh signed-out visibility and disabled state retained; H05 Web Refresh restrictions retained; H06 TEST Refresh restrictions retained; H07 all three Back signed-out restrictions retained; H08 the preexisting `API.logoutSession` token and refresh-token-before-revoke checks retained; H09 asynchronous Native login completion cannot restore signed-out identity remains tested; H10 previous/new user identities are distinguished while old accent is reset on each of the three header variants. All included in the 163 passing 071 checks. No source/DB/official QA/build/deploy/commit/push changes. This does not claim a production device test.

- Before fix: `node --test test/izk_ut_089_accent_regression_test.mjs` **exit 1** (missing propagation).
- After fix: same command **exit 0**, 3/3 tests. Executed header code under mocked DOM/API for **Native, production Web, TEST Web**: stored green, invalid CSS injection fallback, and logout fallback.
- `node --check` on three header JS files **exit 0**. `git diff --check` for five touched production files **exit 0** (CRLF checkout warnings on HTML, no whitespace errors).
- **Physical device / fresh signed APK / official runner: NOT RUN. Formal QA remains FAIL, pending rebuild and separate official retest.**

## S01–S10: independent code-level review passes

| ID | Method and observed evidence | Result |
|---|---|---|
| S01 | Compared reported settings readback and `app.js:208-215`; order screen writes `--accent` | PASS |
| S02 | Inspected `manage.html` + `index.html` `:root`, `.head` and `.mtab.on`; existing management palette was static | PASS |
| S03 | Inspected `header.js` three variants for hardcoded `#izCommonHeader`; now consumes `--accent` | PASS |
| S04 | Examined `validSession/readSession`: native uses `API.currentToken`; Web stores `mgmtToken` | PASS |
| S05 | Traced native callsite `settings.html:404` and `manage.html:383`, verifying `rpc/getSettings` shape | PASS |
| S06 | Checked Web direct `getSettings` action in original `fetchTimezone` and `gasApi.js:819`; no new endpoint | PASS |
| S07 | Executed source in VM with valid production token and mocked `getSettings` result, per-channel assertion | PASS |
| S08 | Executed VM with invalid color string; six-digit hex guard restores safe default | PASS |
| S09 | Executed VM after token removal; default restored with no extra settings API call | PASS |
| S10 | Ran JS parser on all three headers and diff whitespace check; all exit 0 | PASS |

## H01–H10: independent cross-impact review passes

| ID | Method and observed evidence | Result |
|---|---|---|
| H01 | Compared three header entrypoints, CSS token and exported `refreshAccent`; source pattern aligns | PASS |
| H02 | Searched Native and Web management `showHub`; both call refresh after auth | PASS |
| H03 | Read `showLogin/logout/checkAndShow` call graph; login/revalidation reaches `showHub`. `syncAuthDisplay` immediately restores default after same-document logout, before early return | PASS (static/VM follow-up) |
| H04 | Traced `pageshow/DOMContentLoaded`; resumed authenticated documents refresh color | PASS |
| H05 | Inspected `config.js` in all three targets; it owns header URL cache query | DEPENDENCY: cache query not bumped (file outside assignment) |
| H06 | Examined backend `getSettings` routes in `src/index.js` and `gasApi.js`, plus settings retrieval; no new data write | PASS (static) |
| H07 | Searched `app.js` and theme consumers: customer order maintains own `applyAccent`; shared CSS variable compatible | PASS |
| H08 | Surveyed other management page `theme-color` metadata; static values persist and are outside assigned file scope | DEPENDENCY: system chrome color parity |
| H09 | Surveyed hardcoded colors in unrelated `confirm.js/help.js`; static colors remain; scope expansion requires another owner | DEPENDENCY: ancillary overlays |
| H10 | Searched `.head`, `.mtab.on`, `--navy`, `--accent` on two Native hub copies; theme targets use accent, text stays navy | PASS (static) |

Independent methods are backed by actual source inspection, targeted search results and process-exit observations. Dependencies are reported to prime and not silently changed. Test-level green does not constitute device display PASS.

## 2026-10-17 cache delivery follow-up (additional authorization)

The three actual loaders (`mobile-app/web/config.js`, `docs/yuwaku/config.js`, `docs/yuwaku/test/config.js`) now request `header.js?v=auth26/auth18/auth18`, respectively. Matching Service Worker shell URLs and generations were advanced together: Native source/PWA `izakanpai-production-v315`, hosted PROD `yuwaku-production-v285`, local TEST `yuwaku-test-v285`. Existing dirty changes and shell entries were retained. Native Capacitor continues to bypass/unregister SW; it receives the compiled asset only through a later signed build. TEST remains localhost-only and excluded from hosted deployment. No deploy or device test was executed.

**Additional S01–S10, new cache-diff review**

| ID | Distinct source audit and evidence | Outcome |
|---|---|---|
| S01 | Read each config dynamic-script installer; exactly one data-iz-common-header guard per loader | PASS |
| S02 | Compared Native requested header auth25 -> auth26 | PASS |
| S03 | Compared hosted PROD auth17 -> auth18 loader | PASS |
| S04 | Compared local TEST auth17 -> auth18 loader | PASS |
| S05 | Inspected Native SW SHELL auth26 matching config | PASS |
| S06 | Inspected PROD SW SHELL auth18 matching config | PASS |
| S07 | Inspected TEST SW SHELL auth18 matching config | PASS |
| S08 | Inspected three cache epochs against pre-edit 314/284/284 and incremented once | PASS |
| S09 | Executed node --check on each of six config/SW files, all exit 0 | PASS |
| S10 | Executed diff --check after six file changes, exit 0 (Git CRLF informational warnings) | PASS |

**Additional H01–H10, distinct delivery-path impact review**

| ID | Distinct cross-impact audit and evidence | Outcome |
|---|---|---|
| H01 | Grepped Native index/manage script tags: both reference config.js?v=auth2 | PASS |
| H02 | Grepped hosted PROD index/manage script tags: both reference config.js?v=auth2 | PASS |
| H03 | Grepped local TEST index/manage script tags: both reference config.js?v=auth2 | PASS |
| H04 | Inspected critical JS fetch path of Native SW: no-store network for config/api/header | PASS static |
| H05 | Inspected PROD SW: same critical JS handling and versioned fallback | PASS static |
| H06 | Inspected TEST SW: same critical JS handling and versioned fallback | PASS static |
| H07 | Verified PROD SW explicitly ignores its /test/ child paths, avoiding cross-cache | PASS static |
| H08 | Verified SW install cache.addAll(SHELL)/skipWaiting and activate old-key deletion in all three | PASS static |
| H09 | Inspected native config SW-unregister path and cache cleanup guard, preserving native asset behavior | PASS static |
| H10 | Executed dedicated loader/SW static regression with existing accent VM regression: node --test 4/4 PASS, exit 0 | PASS local |

Validation detail: `node --test test/izk_ut_089_accent_regression_test.mjs` **4/4 PASS / exit 0**, six `node --check` **exit 0**, six-file `git diff --check` **exit 0**. This establishes source-level loader/SW matching; a live service worker upgrade and CDN propagation cannot be proven before authorized distribution. Official QA remains FAIL and no device verdict was issued.

## Independent integration regression: legacy 1-row assertions vs two-row contract

Regression command: `node --test test/header_component_test.mjs test/qa2_ui_header_720_regression_test.mjs test/qa2_header_two_row_regression_test.mjs`.

Observed before edits: `header_component_test` failed expecting `main.appendChild(title); main.appendChild(extra); main.appendChild(meta)`, and each of three 720 tests failed expecting a wrapping `flex-wrap:wrap` layout. The concurrent 2-row Chromium geometry checks passed. These are outdated test assumptions against the existing **IZK-UT-078** two-row design. Only the two legacy tests changed; no header source, QA state, or device was modified in this follow-up.

Changed assertions now require top row `title+meta`, bottom toolbar `actions+extra`, `flex-direction:column`, nonwrapping and horizontally scrollable actions, UTF-8 bounded visible title with full accessibility label, touch targets >=44 CSS px, and Web PROD/TEST byte identity. Existing fresh-Chromium tests independently exercise actual 360/800 CSS px layout, top-row user visibility, precise button x positions before/after visibility toggles, overflowing toolbar with no third row, legacy action click, Help overlay and live title update. At 320dpi, 360 CSS px represents the 720 physical px representative viewport; additional physical densities remain outside this static test.

**After changes: 14/14 node:test PASS, exit 0**, including Chromium geometry and actual DOM interaction. `header_component_test` printed all 44 checks PASS. The 720 regression alone: 4/4 PASS, exit 0. The earlier first updated run failed three times because the new source matcher incorrectly required a semicolon after `flex-wrap:nowrap` where the CSS rule actually ends at `}`; adjusted matcher to require the actual closing brace, retaining all checks of title/meta/toolbar/responsive semantics, then independently reran the entire command successfully.

Supplemental source review S01–S10: (01) current 078 header construction, (02) top-row title/meta ordering, (03) toolbar actions/extra ordering, (04) non-wrapping viewport CSS, (05) scrolling overflow containment, (06) title truncation in `renderTitle`, (07) user `aria-label` preservation, (08) 44px coarse-touch rules, (09) Native fixed header spacer/resize, (10) Web PROD/TEST implementation byte parity. Each examined by targeted code read and the final regression.

Supplemental horizontal review H01–H10: (01) Native 360px Chromium geometry, (02) Web PROD 360px Chromium geometry, (03) Web TEST 360px Chromium geometry, (04) 800px geometry across all three, (05) hidden Help and Back button coordinate stability, (06) extra buttons overflow without third row, (07) actual title mutation renders truncated text with full aria-label, (08) moved page-specific button remains clickable, (09) Help overlay remains reachable in all three, (10) current auth18/v285 header cache contracts and Web/TEST parity. Each verified through `qa2_header_two_row_regression_test.mjs`, `header_component_test.mjs`, or the updated 720 source test. No physical QA PASS is claimed.
