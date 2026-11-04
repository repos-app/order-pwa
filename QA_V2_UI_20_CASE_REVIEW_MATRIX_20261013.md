# 20-case QA source audit evidence — 2026-10-13

Automatically extracted from current source and official FAIL descriptions. A source-contract PASS establishes presence of that one construct only. No rendered layout, device touch, data outcome or per-case 10×10 substantive verification is claimed. Missing files are not silently substituted. The 10 horizontal scopes are assessed separately per case; common-header checks remain common evidence, not independent device repetitions.

| Case | page source | Official | Static self PASS | Static horizontal PASS | Pending |
|---|---|---|---:|---:|---:|
| QA2-NEW-VIS-001 | mobile-app/web/order-entry.html | FAIL | 8/10 | 6/10 | 2 |
| QA2-UI-order-entry | mobile-app/web/order-entry.html | FAIL | 8/10 | 6/10 | 2 |
| QA2-UI-birthdays | mobile-app/web/birthdays.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-coupons | mobile-app/web/coupons.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-data_admin | mobile-app/web/data_admin.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-expenses | mobile-app/web/expenses.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-inventory | mobile-app/web/inventory.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-kds | mobile-app/web/kds.html | FAIL | 8/10 | 8/10 | 2 |
| QA2-UI-members | mobile-app/web/members.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-moves | mobile-app/web/moves.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-printers | mobile-app/web/printers.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-profit | mobile-app/web/profit.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-profit_sim | mobile-app/web/profit_sim.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-receipts | mobile-app/web/receipts.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-recipe | mobile-app/web/recipe.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-reservations | mobile-app/web/reservations.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-sales | mobile-app/web/sales.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-todo | mobile-app/web/todo.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-users | mobile-app/web/users.html | FAIL | 9/10 | 8/10 | 2 |
| QA2-UI-audit | mobile-app/web/audit.html | FAIL | 9/10 | 8/10 | 2 |

Each case has exactly 10 source/feature self checks and 10 horizontal scopes below. `examined FAIL` means the source contract/presence condition was false; this is not a fresh official QA failure. `pending` means no test was performed.

## QA2-NEW-VIS-001

Source: `mobile-app/web/order-entry.html`. Existing official state: **FAIL**. Historical finding: Realme Android16 QA build910017 720x1600 portrait: order management header shows truncated 注文… where full 注文管理 is expected; order-entry header uses shortened テス… and fails full-title visibility standard. Other header controls occupy remaining width in both pages. Android header-title truncation persists after updating old build; previous FAIL preserved in official history. Screens are authenticated teat staff account with exact native Realme evid

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined FAIL**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined FAIL**
3. Web TEST page: **examined FAIL**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-order-entry

Source: `mobile-app/web/order-entry.html`. Existing official state: **FAIL**. Historical finding: APK 910017 physical Realme Android16: order-entry seat-selection modal responsive regression. Original device size 720x1600; non-destructive temporary wm size 600x1600 at 320dpi reproduces old FAIL: modal and select control overflow right edge, Start action extends out of viewport; page header back/rightmost actions and category controls clipped. Physical display immediately restored to 720x1600 with adb wm size reset and verified. No order sent,

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined FAIL**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined FAIL**
3. Web TEST page: **examined FAIL**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-birthdays

Source: `mobile-app/web/birthdays.html`. Existing official state: **FAIL**. Historical finding: FAIL reproduced on the actual supported 720x1600 physical-pixel/320dpi Android Emulator: birthdays.html header truncates 誕生日クーポン to 誕生日ク…. The initial horizontal table viewport shows only name and phone; scrolling to other columns was not evaluated, so do not assert they are inaccessible. The header title alone violates no-clipping acceptance. Native screenshots saved, 1080x2340 and 440dpi restored, no birthday coupon issued.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-coupons

Source: `mobile-app/web/coupons.html`. Existing official state: **FAIL**. Historical finding: FAIL on actual Android Realme RMX3938 native app UITEST versionCode 910015. Claimed coupon management UI test, opened real Coupons screen from management, captured top form with Code, Type, Value, Minimum order, Start date, Expiry, Limit, Available, and bottom Registered coupons list populated by preexisting QA birthday coupons. No coupon modified/saved/deleted. At original 720x1600 Japanese title クーポン fits. Toggled to English and inspected rows;

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-data_admin

Source: `mobile-app/web/data_admin.html`. Existing official state: **FAIL**. Historical finding: FAIL on supported native Android Emulator 720x1600px at 320dpi with QA APK910017: data_admin.html fixed header displays only 💾 データバッ… rather than complete データバックアップ・管理, violating no-clipping UI requirement. Integrated backup/CSV controls and warning are present; no destructive action, export, or business write occurred. Real device screenshots captured and original 1080x2340/440dpi restored.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-expenses

Source: `mobile-app/web/expenses.html`. Existing official state: **FAIL**. Historical finding: FAIL real Android Realme RMX3938 POS UITEST 910015. Claimed expense-management UI case, opened live Expenses form and historical 2026/10 expense list. Default Japanese width 720x1600 had Date 2026/10/12, Category Rent, Item/detail, Amount, Purchaser, receipt image, optional memo, target month and ¥80,000 historical amount. Opened actual Android native date picker and verified selected date with clear/cancel/confirm controls fully visible; cancele

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-inventory

Source: `mobile-app/web/inventory.html`. Existing official state: **FAIL**. Historical finding: FAIL: On the explicitly supported 720x1600 physical-pixel portrait size with 320 dpi (360 CSS-px viewport), the authenticated inventory page fixed header truncates the title to 在… and its History shortcut collides with the employee/account label. This was reproduced in the installed QA910017 Emulator and captured as native device screenshot. Original physical 1080x2340 and 440 dpi were restored. This failure is NOT based on unsupported 600px or u

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-kds

Source: `mobile-app/web/kds.html`. Existing official state: **FAIL**. Historical finding: Realme Android16 physical QA APK910017 KDS UI: native 720x1600 portrait KDS fixed header left kitchen title is obscured by printer and bell controls; at temporary 600x1600 narrow width even the printer/title/left action disappear outside viewport and header becomes horizontally clipped. Japanese/English toggle round-trip succeeded via confirmed screen states, stale-warning 7 orders and no-new-pending-order indicator rendered with legible texts. D

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined FAIL**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-members

Source: `mobile-app/web/members.html`. Existing official state: **FAIL**. Historical finding: FAIL real Android Realme RMX3938 versionCode 910015. Claimed member-management UI test and navigated into member registration from management/campaign menu. Default 720x1600 Japanese screen had complete '会員管理' header, member registration, required name/phone/birthday, initial points, allergies and notes. Tapped birthday input and captured actual native Android date-picker, with Japanese controls 削除/キャンセル/設定 visible and operable; cancelled so no d

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-moves

Source: `mobile-app/web/moves.html`. Existing official state: **FAIL**. Historical finding: FAIL reproduced in installed Android Emulator APK910017 at supported 720x1600 native physical pixels with representative 320dpi (360 CSS px). Stock Movement History header truncates 在庫変動履歴 to 在庫… and back-to-Inventory button wraps vertically, crowding header controls. Old Realme 720px failure remains after APK upgrade. Restored original 1080x2340/440dpi; no business data changed.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-printers

Source: `mobile-app/web/printers.html`. Existing official state: **FAIL**. Historical finding: FAIL persists on QA APK910017 at supported native720x1600 pixels with representative 320dpi: printers.html fixed header truncates プリンタ設定 to プリンタ… and account あつし to あつ…. Original 910015 physical 720px defect reproduced in native Android Emulator screenshots. Printer toggles and settings were not modified, native 1080x2340/440dpi restored.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-profit

Source: `mobile-app/web/profit.html`. Existing official state: **FAIL**. Historical finding: FAIL Android Realme RMX3938 versionCode 910015. Claimed profit.html UI and navigated to actual Monthly Gross Profit screen with QA sales 14,071 JPY, product costs, wages and ¥80,000 rent. Japanese portrait screen initially shows entire 月間粗利 header and 2026/10 target month. Opened Android native month picker showing 2026 year / October and delete/cancel/confirm fully visible, then canceled without changing month. English page at default 720x1600 s

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-profit_sim

Source: `mobile-app/web/profit_sim.html`. Existing official state: **FAIL**. Historical finding: FAIL real Android Realme RMX3938 POS QA versionCode 910015. Claimed screen case QA2-UI-profit_sim and navigated Sales > Operating Profit Simulation; checked initially displayed projected monthly revenue input, NON-COGS revenue explanations, VIP base charge field, 2026/10 load-actuals month and monthly expenses headings. At normal Japanese native 720x1600 width the title was '営業利益シ...' rather than the full 営業利益シミュレーション. In English header was 'Oper

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-receipts

Source: `mobile-app/web/receipts.html`. Existing official state: **FAIL**. Historical finding: FAIL real Android RMX3938, native POS QA installed package versionCode 910015. From Sales hub opened receipts.html in actual app and inspected populated QA billing records: target month 2026/10, month total 14,071 JPY, 14 receipts and five refunds. In Japanese at standard portrait 720x1600 the receipt numbers and blue linked refund-slip IDs visibly overflow and are cut off at the right edge ('RF-R-...' not fully displayed), as well as one long me

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-recipe

Source: `mobile-app/web/recipe.html`. Existing official state: **FAIL**. Historical finding: FAIL on physical Android RMX3938 native UITEST app versionCode 910015. Formally claimed before device interaction. Opened Menu > Recipe/Cost page; looked at Japanese and English ingredient-form table at original 720x1600 and narrow 600x1600 display. In Japanese full header レシピ・原価 becomes レシピ... at default size. English 'Recipes ...' also truncated at default and 'Re...' at 600px. At narrow width the ingredient column header is reduced to 'Ingr' a

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-reservations

Source: `mobile-app/web/reservations.html`. Existing official state: **FAIL**. Historical finding: FAIL Realme RMX3938 Android16 installed POS UITEST versionCode 910015. Claimed QA2-UI-reservations, navigated actual app Other > Customer/Reservations > Reservation Management. At native portrait 720x1600 Japanese header 予約管理 fits but three QA reservation customer names in the third column are clipped (e.g. QA-RES-B-2026... without the remaining identifier). Switching to English causes fixed header title to display 'Reserva...' rather than Reserv

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-sales

Source: `mobile-app/web/sales.html`. Existing official state: **FAIL**. Historical finding: FAIL on Realme RMX3938 Android 16 native app versionCode 910015. Claimed QA2-UI-sales; opened Sales management page in Japanese and inspected daily sales graph, October monthly summary, analytics item/category tables, hourly histogram and weekday chart with populated QA records. Japanese normal 720x1600 header 売上管理 displayed fully. Switched to English; header Sales remained intact at default width and chart labels translated. Reduced physical And

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-todo

Source: `mobile-app/web/todo.html`. Existing official state: **FAIL**. Historical finding: FAIL on supported 720x1600 native-pixel Android Emulator at 320dpi in QA APK910017: todo.html fixed header truncates Todo管理 to Todo… and the assignee selector's Unassigned/shared visible value is clipped. Native Japanese/English toggle round-trip succeeded, existing overdue task rendered and date placeholder remained single line. This is a no-clipping UI failure; no task writes performed. Size and language restored.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-users

Source: `mobile-app/web/users.html`. Existing official state: **FAIL**. Historical finding: FAIL: On supported 720x1600 physical-pixel / 320dpi Android Emulator QA build910017, users.html header shows abbreviated 👥 ユーザー… instead of 👥 ユーザー管理, and signed-in user あつし appears あ…. This reproduces the earlier Realme720 v910015 title readability failure. Screenshots from real installed WebView with native ADB screen resolution/density, both restored. No user records edited, saved or deleted.

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## QA2-UI-audit

Source: `mobile-app/web/audit.html`. Existing official state: **FAIL**. Historical finding: FAIL real Android RMX3938 910015. Audited live populated audit.html in Japanese, changed language to English, and compared 720x1600 to narrow 600x1600 using ADB wm size, with screenshots at each width. At 720px header already shows truncated 'Audit l...' instead of the full Audit log title; at 600px it reduces to 'A...'. More seriously the 'Table' column header and table values are cut at the right edge; narrow screenshot displays only the first 

**Self review (10 separately evaluated source features):**

1. source exists: **examined PASS**
2. HTML document: **examined PASS**
3. viewport declaration: **examined PASS**
4. visible main title: **examined PASS**
5. header integration: **examined PASS**
6. JS API integration: **examined PASS**
7. JA translation path: **examined PASS**
8. EN translation path: **examined PASS**
9. touch target rule in shared header: **examined PASS**
10. narrow header title rule: **examined FAIL**

**Horizontal review (10 separately evaluated scopes):**

1. Android-native bundled HTML: **examined PASS**
2. Web production page: **examined PASS**
3. Web TEST page: **examined PASS**
4. Android supported-width rule: **examined PASS**
5. native header handling: **examined PASS**
6. Web production header override: **examined PASS**
7. Web TEST header override: **examined PASS**
8. QA Android source evidence: **examined PASS**
9. native physical verification of new patch: **pending**
10. independent English viewport rendering of new patch: **pending**

## Distinct unsupported-width history

QA2-UI-order-entry physical APK910017 modal overflow was observed at **600 physical pixels** after temporary resize; the native baseline was 720. QA2-UI-sales title collapsed at **600 physical pixels**, while its 720 JA/EN title was visible in the cited historical run. Neither 600-only symptom is proof of failure under the current 720-minimum contract. QA2-NEW-VIS-001 separately documents a genuine **720 physical pixel** clipped order-entry/store header and remains in scope. All 20 official cases remain FAIL until supported-width retest.
