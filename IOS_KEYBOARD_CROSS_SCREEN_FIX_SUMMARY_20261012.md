# izakanpai POS | iPhone keyboard focus jitter: cross-screen remediation

Date: 2026-10-12 PHT. Issue: IZK-IOS-KEYBOARD-JITTER-20261012.

The user-supplied 2026-10-12 iPhone portrait screen recording shows a
management login card moving vertically when an editable field is focused
and the native keyboard opens. This is a high-impact usability failure.

**Status: local source repairs and source/mock tests PASS; real iPhone
hardware retest, approved release and deployed build proof are PENDING.**

## Coverage of all native pages

Run: node scripts/ios-keyboard-44-screens-audit.mjs --write

Automated inventory:
docs/IOS_KEYBOARD_FOCUS_44_SCREEN_AUDIT_20261012.md

| Measure | Result |
| --- | --- |
| Native HTML pages | 44 |
| Pages containing text/selection controls | 36 |
| Input, textarea and select elements | 451 |
| Editable pages loading shared header via config.js | 36 / 36 |
| HTML pages with matching local mobile/iOS/Android asset copies | 44 / 44 |
| iPhone physical keyboard-focus PASS | **Not established** |

## Root causes and code repair

**Global header recovery (43 pages):** shared header.js had focusin,
resize, visualViewport.resize and visualViewport.scroll listeners and could
repeatedly center a field with scrollIntoView, followed by window.scrollBy.
On iPhone, those manual actions can fight native WebKit keyboard scrolling.
The revised native and hosted header modules detect iPhone/iPad, avoid
repeated visualViewport scroll/resize handlers, wait 500ms after focus and
only apply one nearest correction for a truly clipped field. Rotation waits
for one 850ms check. The Android 90ms/floating-IME fallback is preserved.

Global iPhone/iPad touch styles use a 16px minimum for editable text inputs,
select and textarea to prevent Safari automatic zoom on 13-15px fields.
Native date/month/time pickers and Android CSS are not overridden.

**Targeted pages (20):**

| Group | Pages | Changes |
| --- | --- | --- |
| Login/onboarding | index, manage | Prevent 100dvh vertical recentering while editing; shared flow covers login, signup and password change |
| POS/order/stock | inventory, receipts, takeout, order_items, account, order-entry | Scrollable/top-anchored editing/checkout/refund dialogs; remove competing smooth/center scroll |
| Admin forms | members, users, expenses, settings, menu_editor, printers, requests, backup, data_admin | 16px input/font guards, scroll margins, focus interaction |
| Dense financial | profit_sim, commission, purchasing | Low-font zoom prevention and no iOS viewport-scroll feedback; 92-input profit simulator checked |

Separate hosted management pages in docs/yuwaku and docs/yuwaku/test
replace the 8vh login-card top margin with stable portrait spacing. Other
hosted page implementations are not assumed byte-identical to native.

## Five independent horizontal review passes

1. **Inventory:** 44 native HTML pages, 36 editable pages, 451 controls;
   locate viewport height, centered dialogs, fixed overlays and scroll calls.
2. **Common handlers:** ensure iOS and Android keyboard paths are separate
   and native iPhone keyboard animation does not trigger competing scroll.
3. **Feature forms:** repair concrete login, password, signup, admin, editor,
   profit, membership, order, refund and stock cases. Unmodified pages
   carry no automatic real-device PASS.
4. **Build source parity:** all 44 native HTML files match local mobile-dist,
   iOS public and Android public assets; all 3 native header.js copies match.
5. **Regression:** named JS/DOM source tests, Android rotation tests and full
   npm test. Official QA requires physical device reproduction and proof.

## Targeted local validation

- node test/ios_keyboard_focus_layout_regression_test.mjs
- node test/ios_keyboard_global_header_stability_test.mjs
- node test/ios_keyboard_admin_forms_regression_test.mjs
- node test/ios_keyboard_profit_commission_purchasing_regression_test.mjs
- node test/ios_keyboard_operational_screens_regression_test.mjs
- node test/ios_keyboard_residual_screens_regression_test.mjs
- node test/ios_keyboard_landscape_focus_no_jitter_test.mjs
- node test/android_qa_focus_visibility_test.mjs
- node test/android_qa_focused_field_rotation_recovery_test.mjs
- node test/distribution_parity_test.mjs
- npm test

## Required retest (not performed)

After user-approved commit/push and iOS build, capture TestFlight version
and native iPhone recordings: input focus/reopen/close in portrait and
landscape; login workspace ID, login ID/password; password change; signup;
menu item edit; settings date/time and text; profit simulator, member/staff,
expense, purchases, stocktake, takeout, checkout/refund and printer forms.
Ensure header remains fixed, fields/buttons accessible, no zoom/bounce and
typed data persist. Confirm Android real device and Emulator separately;
do not reuse platform results or change QA PASS/FAIL/RUNNING without QA owner.

No commit, push, build, deploy, live data or official QA runner was changed.
