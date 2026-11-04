# QA V2 — 8-page Web CSS horizontal fix (2026-10-13)

## Scope and result

Native `mobile-app/web/{audit,birthdays,reservations,todo,receipts,inventory,moves,recipe}.html` had supported compact-viewport `@media(max-width:430px)` layout fixes absent from the corresponding Web production and TEST pages. The Native rule was transferred verbatim to each of `docs/yuwaku/<page>.html` and `docs/yuwaku/test/<page>.html`. Existing Web page functions, scripts, API paths and the preexisting 420px `moves` rule were retained. This CSS applies to the approximately 360 CSS-pixel viewport of a 720 physical-pixel / 320dpi Android screen, and never claims to validate below-supported physical resolutions.

## Eight per-page review records

Each cell below summarizes the actual static inspection and regression assertions, **not** device-rendered QA. All eight were examined independently with ten source self-review questions S1–S10 and ten horizontal scopes H1–H10. Native and Web source selector presence was inspected, and automation covers the Native rule / Web / TEST contract. A `PASS` here means *source contract passes*, not an official QA PASS.

| Page / QA case | Change and reviewed CSS behavior | Source review | Horizontal review | Device acceptance |
| --- | --- | --- | --- | --- |
| audit / QA2-UI-audit | third-column wrapping, minimum table width 760px | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending device/backend context | Pending |
| birthdays / QA2-UI-birthdays | scroll containment, minimum table width 520px, third-column wrapping | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| reservations / QA2-UI-reservations | URL input wraps and has 16px text; third-column text can wrap | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| todo / QA2-UI-todo | form one column, assignee/due full row and assignee 44px tap target | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| receipts / QA2-UI-receipts | scrollable table, safe wrapping of columns, modal input min-width | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| inventory / QA2-UI-inventory | horizontal scrolling and min-44px last-column action controls | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| moves / QA2-UI-moves | header wraps title and buttons; existing 420px rule retained | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |
| recipe / QA2-UI-recipe | edit table scroll containment, wrapped labels and 44px selects | S1–S10 static PASS | H1–H7 static PASS; H8–H10 pending | Pending |

S1: Native 430px rule exists; S2: rule is copied without changing selector meaning; S3: single copy in production; S4: single copy in TEST; S5: rule stays inside `<style>`; S6: property-specific contract is asserted; S7: no existing rule removed; S8: HTML scripts preserved; S9: other page CSS preserved; S10: `git diff --check` clean. These were conducted against each of the eight page pairs, with corresponding assertions in `test/qa_v2_8page_web_css_parity_test.mjs`; S7–S9 were also assessed by the scoped diff.

H1: compare Native; H2: Web production; H3: Web TEST; H4: exact Web/TEST byte identity; H5: narrower competing media rules inspected; H6: scoped diff for unrelated scripts; H7: selected property/selector contract checked; H8: physical Android portrait at 720px, **not run**; H9: Android landscape/iOS physical behavior, **not run**; H10: authenticated workflows, backend/data correctness, **not run**. H8–H10 remain pending on every page. Static checks cannot prove pixel clipping, keyboard overlap, true scroll mechanics or a completed official QA case.

## Verification and remaining QA

- `node test/qa_v2_8page_web_css_parity_test.mjs`: **8/8 PASS**, exit 0; checks 430px source contracts, one copy per Web surface, stylesheet placement, page-specific selectors/properties and production/TEST byte equality.
- `git diff --check --` the 16 page files: **exit 0** (line-ending conversion warnings only).
- Read-only sibling QA2-UI audit against `docs/QA_V2_UI_HEADER_20_CASES_REMEDIATION_20261013.md`: coupons, data_admin, expenses, kds, members, order-entry, printers, profit, profit_sim, sales and users still require their own evidence-driven inspection/retest. No cross-file fix was justified from this audit. The 600px order-entry and sales evidence is outside the supported 720px physical acceptance baseline.
- Official QA ledger, backend, SW, translations, package and device state were untouched. **No commit, push, deploy or production access**.

The eight layout cases still need independent real-device portrait/landscape verification at supported resolutions (including EN labels, scroll to far right, keyboard and modal states as applicable). The CSS parity test only establishes source-level correctness.

## Additional final audit: six historical source concerns

Reviewed the **actual case `result.summary`** in `.qa-v2-official/android/state.json` for `QA2-UI-coupons`, `expenses`, `members`, `profit`, `order-entry`, and `sales`, cross-checking `docs/QA_V2_UI_HEADER_20_CASES_REMEDIATION_20261013.md`, `docs/QA_V2_REMAINING30_REMEDIATION_REPORT_20261013.md`, and read-only Native page CSS. This is a review of historical device evidence, not a fresh Realme visual test. The four first-listed source pages and the two remaining pages are outside this worker's authorized edit surface; their code was not changed.

| Official FAIL case | Historical **720px physical** evidence | Historical **600px physical** evidence | Outstanding criterion and reproduction needed |
| --- | --- | --- | --- |
| coupons | Japanese クーポン fits; English header shows `Coupo...`. This is an evidenced **720px header problem** on APK 910015; earlier shared header CSS remediation is documented, but not verified on a newer APK. | `C...`; coupon IDs wrapped yet readable | At 720x1600, 320dpi, English, logged-in account chip present, confirm complete `Coupons` after current shared-header changes; verify populated list, form and scroll endpoint separately. |
| expenses | Japanese date `2026/10/12`, English content and native date picker inspected; summary does **not** say that the 720px date text is clipped. | Date became `2026/10/`, title `E...` | Supported-width 720x1600, 320dpi, JA/EN: focus date, pick/cancel date, ensure entire date stays on one line with Category alongside, and inspect expense list right edge. No 720px page-specific root cause proven. |
| members | English header `Memb...` at 720 despite form controls mostly reflowing. Shared header CSS fix already documented but **not yet device-verified**. | `M...` plus account label clipping | At 720x1600, 320dpi, English with account chip: show full `Members`, all required fields, open/cancel birthday picker, scroll to notes/Register; do not enter personal data. No separate member-field source failure proven. |
| profit | English `Monthly ...` title truncated at 720px, with prior shared-header fix pending device verification; month picker was visible and operable. | `Mo...` header; monetary negative sign separated from amounts | At 720x1600, 320dpi, English, verify complete `Monthly Gross Profit` and amount/minus/unit wrapping for occupied revenue/cost/wage/utility rows. The recorded amount-wrap defect is 600px-only; 720px amount-root cause unproven. |
| order-entry | Summary expressly states **original size 720**, then deliberately resizes to 600 **before** observing seat-modal, select and Start overflow; no 720px modal overflow is reported. Separate `QA2-NEW-VIS-001` records a supported-width header failure under a different case. | Seat modal and Start action beyond right edge, category/header clipping | At 720x1600, 320dpi, logged-in order-entry: open seat selector, expand native options, inspect Start, header and category controls without changing device size or submitting an order. No evidence for page-specific 720px seat-modal defect. |
| sales | Summary explicitly records full Japanese 売上管理 and English `Sales` title at 720. | After `adb wm size 600x1600`, header only icon and `...` | At 720x1600, 320dpi, English/Japanese, account chip and populated graphs, review horizontal end and title after scroll. There is **no recorded 720px clipped header** in this case. |

**Disposition:** No *additional* 720px page-specific defect is supported by these six case summaries sufficiently to justify an unrelated change. The evidenced 720px English title failures (coupons/members/profit) are **pending physical regression after the existing shared-header CSS fix**; they are not declared resolved. The 600px-only issues are outside the approved physical-width baseline. Formal official case status remains FAIL. At least these three supported-width header verifications and six complete per-screen acceptance checks remain outstanding; **unfixed/unverified count is not zero**. No dedicated new regression code was introduced because no new source fix was justified inside this worker's eight-page scope. No official QA status was edited.
