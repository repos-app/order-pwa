# IZK-UT-075 — backend user-input truncation focused audit (2026-10-15)

Scope: local source, no commit, deployment, production DB, device or formal QA mutation. Baseline HEAD `fa6ae419906b1ea6795c6ee736b2193a279b677b`. All five target files clean at start. This is a **focused audit**, not certification that all backend inputs or 120 screens are correct.

## Proven defects and local fixes

| File | Finding | Resolution |
|---|---|---|
| `src/integrations.js` | `saveReportSettings` silently truncated user-authored report recipients to 200 characters before calling `adminMod.saveSettings`; `saveEmailFromAddress` similarly truncated sender to 200 immediately before `setSetting`. Result could be a different address or a lost recipient. | FOUND_FIXED: normalized lengths exceeding existing 200-character bounds now return `{success:false,error,max:200}` **before any persistence**. Existing <=200 values and schedule semantics retained. |
| `src/orders.js` | `voidOrder` sanitized and silently truncated user-entered cancellation reason to 200 characters before audit/cancellation; misleading audit history. | FOUND_FIXED: return `{error:'reason_too_long',max:200}` before settings read, manager approval and order mutation. Empty reason still `no_reason`. No change to approver login, roles, IDs or payment/print state. |
| `src/billing.js` | `setTablePartySize` and `getTablePartySize` truncate table label at 40; `finalizeBill` normalizes rule ID, discount ID/name, approver login. | BLOCKED: table labels and discount IDs are cross-table/external keys; no source-backed uniform limit established for every entry and historical record. Do not alter them without integrated fixture and explicit field contracts. |
| `src/paymentMethods.js` | `cleanLabel` truncates read-only formatting output at 40 and `instructionPair` at 240. | SAFE_NORMALIZATION for read display of stored settings; **upstream save-path validation remains PENDING**, because this read-only module is not the persistence entrypoint. No edit. |
| `src/attendance.js` | `toDate`, `toMonth`, `toTime` substring valid date/time components; `sanitize` limits canonical requestId to 100 and controlled text to 200. | SAFE_NORMALIZATION for date/time and request ID, pending a deeper audit of externally authored attendance fields. Do not change idempotency contract. |
| `src/integrations.js` remaining | Image storage tenant segment, OCR category inference, `clientRequestId`/`batchRequestId` and vision normalization lengths. | SAFE_NORMALIZATION or BLOCKED where canonical identifier / generated OCR category contract needs independent provenance. No changes. |
| `src/orders.js` remaining | actor name/role and approverLogin limit 100/40/100. | BLOCKED: sourced from authenticated actor/employee identity and manager approval lookup; changing truncation without auth-contract regression is unsafe. |

## Relevant callers and business path

`mobile-app/web/settings.html` / `docs/yuwaku/settings.html` / `docs/yuwaku/test/settings.html` save report recipients using `saveReportSettings` RPC and sender using `saveEmailFromAddress`; `src/index.js` direct handlers and `src/gasApi.js` dispatch both reach the shared functions. Settings UI source is shared with another owner's edit scope, so this patch only changes the common persistence boundary; `requireRpcSuccess` error display needs actual UI/VM verification. `mobile-app/web/admin.html` and Web prod/test admin pages call `voidOrder`; shared `src/orders.js` is the final mutation gate. Settings backends remain tenant-scoped through their existing `storeId` and `adminMod.saveSettings` or `setSetting` contracts.

## Independent self review (S01–S10)

| Review | Method / evidence | Result |
|---|---|---|
| S01 | Compared known IZK-UT-075 input complaint against source `slice(0,200)` in orders/integrations and live settings / admin callsites. | PASS source |
| S02 | Followed reason input to `voidOrder` before cancellation and report input to setting mutation; only truncation removed, explicit reject added. | PASS source |
| S03 | Direct function negative cases lengths 201,250,1000, plus report length 200 and empty order reason in `test/izk_ut_075_backend_input_regression.mjs`. | PASS local |
| S04 | Confirmed `storeId` passed unchanged to settings and order callers; no new auth bypass or altered tenant keys. Cross-tenant live probe outstanding. | PENDING live |
| S05 | Rejections execute ahead of database writes in direct-call regression; retries and failed network handling not probed. | PASS local / PENDING network |
| S06 | Successful <=200 report address retained, no historical rows rewritten; real DB receipt/report regression outstanding. | PASS local / PENDING real DB |
| S07 | Read three UI deployment paths and checked existing RPC call expression; native input/IME and bilingual rendered error not executed. | PENDING UI |
| S08 | `node --check` on both changed backend modules and `git diff --check` exit 0. | PASS local |
| S09 | Negative no-mutation assertions and positive report/trim/empty checks execute with exit 0. Full integration test pending. | PASS local |
| S10 | Initial five-file git status clean; only `src/orders.js`,`src/integrations.js`, dedicated regression and audit document edited by this worker. | PASS local |

## Independent horizontal review (H01–H10)

| Review | Source / concrete observation | Result |
|---|---|---|
| H01 | `src/index.js` direct `handleSaveReportSettings` reaches same common `integrations` function. | PASS source |
| H02 | `src/gasApi.js` RPC save report dispatch reaches same common function. | PASS source |
| H03 | `src/index.js` direct sender handler reaches shared `saveEmailFromAddress`. | PASS source |
| H04 | GAS RPC sender handler also reaches shared function. | PASS source |
| H05 | Native `mobile-app/web/settings.html` report/sender controls use named RPCs; actual rendered message not captured. | PENDING UI |
| H06 | Production `docs/yuwaku/settings.html` has same report/sender RPC call pattern. | PENDING UI |
| H07 | TEST `docs/yuwaku/test/settings.html` must be tested separately with same error. | PENDING UI |
| H08 | Native/Web/TEST `admin.html` invoke `voidOrder`; DB mutation gate is shared `src/orders.js`. | PASS source / PENDING UI |
| H09 | `src/paymentMethods.js` display truncation does not write DB; setting-save upstream validation is outside this edit. | PENDING upstream |
| H10 | `src/billing.js` discount references and `src/attendance.js` idempotency/dates were evaluated and deliberately left alone to avoid changing identifiers. | PASS scope / PENDING full QA |

## Execution and remaining gates

Commands: `node test/izk_ut_075_backend_input_regression.mjs`, `node --check src/orders.js`, `node --check src/integrations.js`, `git diff --check -- src/orders.js src/integrations.js`; all observed exit 0 in this local run. These results are **not formal QA PASS**. Need UI VM/physical tests for error visibility and boundary inputs, full integration fixtures for manager approval/order cancellation and recipient deliveries, cross-tenant proof, and final owner integration of concurrent work. No production schema/data changed.
