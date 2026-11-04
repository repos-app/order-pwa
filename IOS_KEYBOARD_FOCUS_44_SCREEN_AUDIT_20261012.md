# izakanpai POS | iPhone keyboard-focus: 44-screen static audit

Source-only review of all mobile-app/web HTML screens. NOT an iPhone physical-device or formal QA PASS.

| Metric | Result |
| --- | ---: |
| Total native screens | 44 |
| Screens containing editable DOM controls | 36 |
| Total DOM input/textarea/select markup controls | 451 |
| Editable screens loading config.js → common header.js | 36 |
| Editable screens missing common header loader | 0 |
| Native web assets mismatching local Android/iOS/distribution mirrors | 0 |
| iOS input focus anti-jitter common JS, 16px anti-zoom and mirror parity | SOURCE GUARD PRESENT |
| Real iPhone manual keyboard zoom/jitter validation | NOT TESTED |

## Five horizontal review passes

1. Every screen scanned for editable controls, viewport-height (vh/dvh), grid/flex centering and fixed overlays. Indicators mark manual review; they are not automatic FAIL.
2. Common header focused-field recovery no longer re-scrolls on iOS visualViewport resize/scroll events; it waits for WebKit to settle and uses only nearest correction for a truly clipped field. Android floating IME path remains unchanged.
3. iOS touch input/select/textarea font >=16px via common header to suppress WebKit focus zoom, plus targeted page-specific fixes for login, admin forms, modal sheets and editing flows.
4. All native source HTML files with platform copies checked against mobile-dist, iOS public and Android public SHA-256. Hosted Web screens are separately maintained and are NOT byte-for-byte clones.
5. Automated source/DOM-mock regressions cover layout and callback behavior; all Android/iPhone device geometry, keyboard visibility, login/change password/new-store, order/payment/inventory/staff workflows require OS-specific QA evidence after an approved build.

## Per-screen structural inventory

| Screen | Editable controls | Common shared header | Static risk indicators | Local native asset parity | iPhone verification |
| --- | ---: | --- | --- | --- | --- |
| account.html | 4 | YES | centered, focus_scroll | MATCH | PENDING |
| admin.html | 13 | YES | vh_or_dvh, centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| attendance.html | 2 | YES | vh_or_dvh, centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| audit.html | 0 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| backup.html | 1 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| birthdays.html | 1 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| bridge.html | 4 | YES | vh_or_dvh, centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| clock.html | 1 | YES | centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| commission.html | 13 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| coupons.html | 9 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| dashboard.html | 1 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| data_admin.html | 8 | YES | centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| drink_inv.html | 0 | NO | - | MATCH | PENDING |
| expenses.html | 10 | YES | vh_or_dvh, centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| feedback.html | 0 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| index.html | 25 | YES | vh_or_dvh, centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| inventory.html | 16 | YES | vh_or_dvh, centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| kds.html | 0 | YES | vh_or_dvh, centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| manage.html | 25 | YES | vh_or_dvh, centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| members.html | 7 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| menu_editor.html | 26 | YES | vh_or_dvh, centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| moves.html | 1 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| order-entry.html | 7 | YES | vh_or_dvh, centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| order_items.html | 6 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| overview.html | 0 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| printers.html | 15 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| privacy.html | 0 | YES | - | MATCH | PENDING |
| profit.html | 3 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| profit_sim.html | 92 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| purchasing.html | 13 | YES | centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| receipts.html | 4 | YES | centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| recipe.html | 3 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| register.html | 5 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| requests.html | 5 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| reservations.html | 2 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| reserve.html | 8 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| sales.html | 1 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| settings.html | 100 | YES | vh_or_dvh, centered, fixed_overlay, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| subscription.html | 0 | YES | - | MATCH | PENDING |
| support.html | 2 | YES | focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |
| takeout.html | 6 | YES | vh_or_dvh, centered, fixed_overlay, keyboard_auto_zoom_candidate | MATCH | PENDING |
| terms.html | 0 | YES | - | MATCH | PENDING |
| todo.html | 4 | YES | centered, keyboard_auto_zoom_candidate | MATCH | PENDING |
| users.html | 8 | YES | centered, focus_scroll, keyboard_auto_zoom_candidate | MATCH | PENDING |

## Remaining limits and release gate

- A static source check does not measure animation frame-by-frame motion or tell whether the keyboard covers a field in a real iPhone app.
- The focus/keyboard root-cause hypothesis must be validated against screen recordings from approved iPhone build, once code is committed, pushed and distributed with explicit user permission.
- The common CSS applies only when config.js successfully loads the header module; individual browser failures and captive offline cache build versions need real-device verification.
- Do not promote existing official QA FAIL/PASS/RUNNING or reuse Android PASS as iOS PASS.
- Regression checklist: login, change-password, signup, menu editor, settings, 92-field profit simulator, member/staff, expenses, purchase, stocktake, takeout, refunds, order entry, scan modal, tablet portrait/landscape and split keyboard if applicable.
- No commit/push, native build, TestFlight deployment, QA runner writes or live device operations were performed during the source audit.
