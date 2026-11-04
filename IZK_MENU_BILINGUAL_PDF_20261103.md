# izakanpai: YUWAKU image-only bilingual PDF import review (2026-11-03 PHT)

## User requirement / reference

- User supplied `menu(1).pdf`, SHA256 `3b8d5f652a6788e4532f13f952671f6cf7f292823b6813404d4d5a81896b8f68`.
- Read-only examination: 5 pages; all 5 page text layers **empty**. Purely visual/image-only PDF; the previous `getTextContent()` optimization does not improve this document.
- User requires one row per printed product, with **printed Japanese in nameJa and printed English in nameEn**, and likewise separate printed section categories. Do not combine the languages into a single display name.
- The independently transcribed reference is `test/fixtures/yuwaku-menu-image-only-20261103.tsv`. Source order totals by page: **10, 9, 9, 10, 17 = 55** unique products. 38 single-price, 12 bottle-only, 5 glass+bottle price products.
- The final category on page 5, `〆の一皿`, has no *printed* English category heading. Leave `categoryEn` blank in the image reference; existing translation-on-save can fill this during the actual user-confirmed registration, and must not pretend that the translation is printed evidence.
- Examples: `誘惑の唐揚げ / Chicken Karaage` ₱380; `深夜の背徳ポテトフライ / French Fries` ₱250; `ジャックダニエル / Jack Daniel’s` glass ₱300 and bottle ₱4,000.

## Fixed in shared source

1. The page image is rasterized with a 2400px cap and the second Japanese verification uses the **same PDF page** plus two overlapping enlarged top/bottom images, all within one second-stage model inference. No duplicated product rows should be emitted for closeups. The provider token/latency increase still requires measurement on a released build.
2. A bilingual pairing constraint is appended to the image model prompt even when the admin has published a different base prompt. It covers Japanese-first food and English-first drinks, two columns, section headings, prices and G/B labels.
3. Secondary Japanese rechecks accept 1-based immutable item indices, not just English text anchors, so a primary Japanese-first item with unreadable English is not lost or mismatched.
4. `menu-ai-review.js` creates a registration draft using separate script-aware JA/EN fields, marking obvious swapped languages for review. The editor receives the two fields separately. The candidate display now shows `日本語：` and `English:` separately.
5. Bottle-only and glass+bottle prices are transferred into existing localized mandatory `Serving / 提供方法` options. For example base ₱300 with Glass +₱0 and Bottle +₱3,700 yields correct ₱300/₱4,000 at checkout. No new menu save endpoint was introduced. **Latest behavior:** clear new items register automatically via existing create-only RPC; uncertain OCR requires manual editing and saving. See `IZK_MENU_AI_AUTO_REGISTER_20261103.md`.
6. The shared authenticated credit wallet, per-page idempotent reservation/settlement, store separation and fail-closed invalid input contract are unchanged. Image closeups are bounded to two JPEGs; their bytes are part of the page request hash.

## Ten independent source self-reviews (S01–S10)

| ID | Actual source boundary checked | Result |
|---|---|---|
| S01 | `src/menuDocumentImport.js`: bilingual constraint survives published prompt substitution | SOURCE PASS |
| S02 | `MENU_PROMPT`/pairing contract: JA above EN and EN above JA resolve as one product | SOURCE PASS |
| S03 | Model JSON schema: nameJa/nameEn/categoryJa/categoryEn distinct; no direct registration | SOURCE PASS |
| S04 | `parseJapaneseLabels`: positional anchor for Japanese-first/English-absent item | SOURCE PASS |
| S05 | `reconcileJapaneseLabels`: discrepancy remains review-required, no invented translation | SOURCE PASS |
| S06 | `menu-ai-review.js`: swapped script is corrected and flagged rather than silently misfiled | SOURCE PASS |
| S07 | `menu-ai-import.js`: separate JA/EN preview and editor input assignment | SOURCE PASS |
| S08 | `menuRegistrationDraft`: original single/bottle/multiple prices handled deterministically | SOURCE PASS |
| S09 | `menu_editor.html`: bilingual serving options with fixed price deltas are exported through existing `cleanOpts` contract | SOURCE PASS |
| S10 | `aiCreditActions.js`: page hash includes additional closeups while tenant and credit runtime stay in existing pathway | SOURCE PASS |

## Ten independent cross-implementation reviews (H01–H10)

| ID | Related source reviewed | Result |
|---|---|---|
| H01 | Android and iOS share the same `mobile-app/web/` importer; no OS-specific divergent business logic | SOURCE PASS |
| H02 | Web PROD/TEST lack the Native PDF import entrypoint; do not introduce nonfunctional UI in those surfaces | SOURCE PASS / NOT APPLICABLE |
| H03 | Native JPEG/PNG/WebP photo import has no closeup payload and remains compatible with one-page pricing | SOURCE PASS |
| H04 | Image-only PDF has empty text evidence and still enters image-only fallback (not blocked on text) | SOURCE PASS; source PDF examined |
| H05 | Digital searchable PDF retains the previous bounded, untrusted text-layer evidence | SOURCE PASS |
| H06 | Printed G/B prices and bottle-only prices preserve original amounts, including ₱4,000 and ₱31,000 | SOURCE PASS; 55 fixture rows |
| H07 | Existing editor `saveMenuItem` writes distinct localized fields through `src/admin.js` and `localizedFieldStatements` | SOURCE PASS |
| H08 | Existing `src/menuOptions.js` localizes group/choice names for Japanese/English order displays | SOURCE PASS |
| H09 | Existing Free 10 product cap and create-only no-overwrite contract are maintained; uncertain items still require manual Save | SOURCE PASS |
| H10 | Malformed/oversized closeup input, duplicate request IDs and AI failures do not bypass server account/tenant guards | SOURCE REVIEW PASS; live provider test PENDING |

## Evidence / actual completion status

- 5/5 image-only pages and source SHA examined. Ground-truth file checks count, name uniqueness and language/price integrity for 55 distinct menu rows.
- Node/Chromium source/UI regression numbers must come from the latest actual command output. Do not count source-fixture matches as real Workers AI OCR recognition accuracy.
- **No live five-page Workers AI invocation with this uploaded PDF**, and no measurement of after-change AI success/failure by item. No TestFlight or Android signed build, no formal OS QA, no tenant menu record creation/overwrite occurred in this source evaluation. See the later auto-register release note for Git/Worker status; this paragraph describes the initial evaluation phase only.
- Next verification gate: after deployment authorization and a current build exist, run this exact PDF once, compare per-page 55 expected rows/nameJa/nameEn/section/price units, inspect updated review counts; publish only after user review. For `yuwakubar`, preserve existing production menu records until explicit identification/confirmation of the target dataset and merge policy.
