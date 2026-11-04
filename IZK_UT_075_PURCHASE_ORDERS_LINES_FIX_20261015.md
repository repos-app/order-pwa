# IZK-UT-075 — Purchase order line input source correction (2026-10-15)

## Result
At `src/purchaseOrders.js:7` the primary `name` already rejected >160 while optional localized `nameJa/nameEn` silently cut at 160, and `unit` cut at 32. This is a real user-input path: `purchasing.html` renders editable PO rows (`PO_ROWS`), allows direct typing or selection from menu/reorder masters, and routes both `createPoRecord` and `sendPo` through `createPurchaseOrder`. Limits are existing backend policy (160/32), unchanged.

Changed normalization to reject `nameJa/nameEn >160` and `unit >32` with established `invalid_po_items` **before the initial DB query**. The normalized items JSON, quantity positive/100000 restriction, tenant store_id, supplier check, clientRequestId and idempotency comparison remain intact. Old persisted JSON remains unchanged. Native, production Web and TEST `purchasing.html` now use `data-po-max` on row controls and delegated paste/beforeinput overflow refusal accounting for selected text, with Japanese/English explicit error; IME composition is not interrupted. **The HTML `maxlength` attributes were removed during prime review** because browsers may silently truncate IME/text before the explicit error can be displayed. Both record/save-email entry points use the same full `PO_ROWS` preflight. The code intentionally does not change `sendPurchaseOrderEmail` internal legacy normalization: its existing route is guarded by persisted purchase order creation from this UI, but standalone direct email RPC behavior merits future separate examination.

## Verification
- `node test/izk_ut_075_po_line_input_test.mjs`: PASS 161-character JA/EN and 33-character unit before *any* DB call; 3 HTML scripts VM parsed, event wiring and save checks present.
- `node test/purchase_orders_durable_test.mjs`: PASS SQLite durable PO idempotency, tenant and mail-independent behavior.
- `git diff --check`: PASS in touched files.
- Not executed: actual browser paste/IME event simulation, real device formal QA, deployed build attestation.

## 10 self reviews
| ID | Check | Status |
|---|---|---|
| S01 | Existing 160/32 truncation and primary name limit | PASS |
| S02 | 161 localized Japanese name rejects before DB | PASS |
| S03 | 161 localized English name rejects before DB | PASS |
| S04 | 33-character unit rejects before DB | PASS |
| S05 | Positive quantity, 100000 ceiling and primary name unaffected | PASS |
| S06 | Store and supplier cross-store lookup unchanged | PASS |
| S07 | Idempotent replay comparison and persisted item JSON unchanged | PASS |
| S08 | Six UI save points? Both PO flows checked on three mirrored pages | PASS |
| S09 | Dedicated failure + existing SQLite durability test PASS | PASS |
| S10 | Physical browser IME and app bundle proof | PENDING |

## 10 horizontal reviews
| ID | Surface | Status |
|---|---|---|
| H01 | Native direct editable PO name and unit fields | PASS |
| H02 | Native `createPoRecord` client preflight | PASS |
| H03 | Native `sendPo` preflight | PASS |
| H04 | Production Web editable controls and two saves | PASS |
| H05 | TEST Web editable controls and two saves | PASS |
| H06 | Menu-master import preserves full name in PO_ROWS until validate | PASS |
| H07 | Reorder-item import preserves full unit in PO_ROWS until validate | PASS |
| H08 | SQLite PO idempotency and tenant isolation durable regression | PASS |
| H09 | Standalone direct email RPC route independently tested for overlimit | PENDING |
| H10 | Real Android/iOS IME, browser and formal QA | PENDING |

No package, master, official QA, device, commit, deploy or production DB changes. Official QA delta **0**.
