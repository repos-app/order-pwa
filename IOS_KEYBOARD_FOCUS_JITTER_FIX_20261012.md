# izakanpai POS: iPhone login-form jump on text-input focus

Date: 2026-10-12 PHT. Local defect: IZK-IOS-KEYBOARD-JITTER-20261012.

## Reproduction and evidence

- Evidence: user-provided 8.4-second iPhone portrait screen recording, 2026-10-12 21:18 PHT.
- The Management login card visibly jumps from centered positioning to the upper screen when the native keyboard opens, then moves again when focus/keyboard state changes. The header remains visible. This is a layout/viewport issue, not a typing failure.
- Exact WebKit scroll event ordering was not logged, so the CSS explanation below is a strongly supported hypothesis, not a device-level measured root-cause trace.

## Root cause and local fix

- Native mobile-app/web/index.html and manage.html use body min-height 100dvh, with a vertically centered grid loginView whose min-height also depends on 100dvh. Opening and closing the native keyboard changes the visual viewport while Safari/WebKit scrolls the focused field into view. Centering and scrolling can conflict.
- The locally modified HTML adds an iOS WebKit-only portrait override (CSS supports -webkit-touch-callout, width <=600px, orientation portrait). During this mode loginView is a natural-flow block with min-height 0 and constant 32px top padding. The visible login, password-change and registration cards remain horizontally centered, with no viewport-height based vertical recentering.
- Native Android and iPhone landscape retain their existing layouts. The 16px field size and normal scrolling remain untouched, avoiding the iOS automatic text zoom issue.
- The separately maintained docs/yuwaku/manage.html and docs/yuwaku/test/manage.html replace their 8vh login-card top margin with a fixed 32px margin on iPhone portrait.
- Synchronised locally: mobile-dist, ios/App/App/public, android/app/src/main/assets/public index.html/manage.html for SHA parity.

## Five horizontal regression passes (source tests, NOT actual iPhone)

1. Login fields: workspace ID, user ID and password are not vertically recentered by keyboard viewport changes. Source PASS / real iPhone PENDING.
2. Password change: shares loginView and natural-scrolling layout; all inputs remain reachable. Source PASS / real iPhone PENDING.
3. New store registration: long form remains scrollable; no viewport-relative center shifting. Source PASS / real iPhone PENDING.
4. Hosted production/test management pages: fixed iOS portrait margin, not 8vh resizing. Source PASS / hosted iPhone PENDING.
5. Android/landscape unaffected, 16px font preserved, local native asset SHA parity. Source PASS / physical native QA PENDING.

Tests: node test/ios_keyboard_focus_layout_regression_test.mjs, node test/distribution_parity_test.mjs and node test/mobile_navigation_test.mjs all PASS.

## Release/retest gate

After an explicitly approved commit/push/build, verify the exact fixed source in the TestFlight version. On a real iPhone in portrait: focus workspace ID, login ID, password, dismiss keyboard, repeat, test change-password and signup, rotate once. Preserve a short screen recording and the actual version/build number. Formal QA stays unchanged until device evidence.

No commit, push, build, TestFlight delivery, production site change, or device operation has been done for this fix.
