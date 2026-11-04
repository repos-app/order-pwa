# IZK-UT-075 発注メール直接RPC／レシピ全置換の無言切詰め対策（LOCAL）

## Source root cause

- src/purchasing.js sendPurchaseOrderEmail accepts a direct Worker/GAS call bypassing the PO_ROWS page preflight. The known durable PO policy requires name/nameJa/nameEn <=160, unit <=32, quantity <=100000, max 100 rows. A long direct email could otherwise consume quota and send unapproved text.
- src/purchasing.js saveRecipes formerly used slice(0,100) on menu/material before full replacement DELETE. Prefix collision with another menu or inventory item could relink cost and stock deduction.

## Local source correction

The email direct RPC now validates the existing durable-PO boundaries BEFORE querying suppliers, consuming email quota or dispatching email; returns invalid_po_items. sendReorderEmail reuses this same validator. Empty/nonpositive rows retain the former omission behavior. Recipe saving now rejects a 101-character menu/material as recipe_name_too_long BEFORE preparing store-scoped DELETE/INSERT, preserving all existing rows. All three Native/Web production/Web TEST recipe.html page scripts use JA/EN preflight messages. No tenant, idempotency, historical data or price rewrite.

## Executed evidence

- node --test test/izk_ut_075_po_email_direct_guard_test.mjs test/izk_ut_075_recipe_save_lengths_test.mjs: 7/7 PASS. All overlong email direct API inputs (main/JA/EN names, unit, quantity and 101 rows) refuse with 0 supplier reads. Exact 160/32/100000 boundary continues supplier resolution. Recipe 101 chars refuses with 0 DB calls and exact 100 chars preserves full canonical names in scoped DELETE/INSERT. All three UI scripts parse and have pre-RPC validations.
- node test/purchase_orders_durable_test.mjs: PASS, store and idempotency durable regression.
- Source diff check: PASS. Not actual D1 writes, physical IME or email delivery.

## 10 self-review observations

| Review | Evidence and verdict |
|---|---|
| S01 | Existing durable PO 160/32/100000/100 constraints read: PASS |
| S02 | Worker/GAS direct email bypass verified: PASS |
| S03 | Main/JA/EN, unit, quantity overlength refuses before DB read: PASS |
| S04 | sendReorderEmail routes to same guarded sendPurchaseOrderEmail: PASS source |
| S05 | Legacy omitted blank/qty=0 lines still omitted: PASS source |
| S06 | Recipe input validation occurs before DELETE: PASS test |
| S07 | Exact 100-character canonical keys retained: PASS test |
| S08 | All three recipe UIs show JA/EN and parse JavaScript: PASS test |
| S09 | No mutation of persisted historical names, stores or pricing: PASS diff |
| S10 | Real device IME, live D1 and email provider: PENDING |

## 10 horizontal-review observations

| Review | Evidence and verdict |
|---|---|
| H01 | Native purchase order UI and two send pathways: PASS source |
| H02 | Web production purchasing UI: PASS source |
| H03 | Web TEST purchasing UI: PASS source |
| H04 | Worker POST handler direct email: PASS source/backend test |
| H05 | GAS compatibility dispatcher: PASS source/backend test |
| H06 | Reorder email shares validation: PASS source |
| H07 | Native Android/iOS recipe UI: PASS VM/source, physical PENDING |
| H08 | Web production/TEST recipe UI: PASS VM/source, deploy PENDING |
| H09 | Store-scoped recipe replace and validation: PASS mock, live D1 PENDING |
| H10 | Cost analytics and inventory deductions: source unchanged, formal QA PENDING |

**The local fix does not close every IZK-UT-075 field or formal QA.** No commit, push, deploy, production DB write, email send or official QA-state change was executed.
