# IZK-UT-075 — Printer management identity/length guards (LOCAL)

2026-10-15, scoped to `src/printers.js` and `mobile-app/web/printers.html`, `docs/yuwaku/printers.html`, `docs/yuwaku/test/printers.html`. **No commit, push, deployment, production D1 write, physical device action, or official QA status change.**

## Source defect, resolution and compatibility

- `savePrinter` accepted a user-authored name longer than the **existing 60-character policy** but saved the truncated prefix. Now `printer_name_too_long` is returned **before any database read/write**. Raw MAC strings beyond the existing 40-char allowance are rejected as `invalid_mac`, not silently sliced into a different identifier.
- `normalizePrintDeviceId` previously cut excess input to 120 characters *before* testing the allowed pattern. An overlong ID with a valid 120-character prefix could impersonate an existing terminal; the full input is now pattern checked. `normalizePrinterId` returns empty for overlong IDs rather than querying/deleting the truncated printer ID.
- `savePrintHostAssignment` now rejects a newly provided host device name over its previous 80-char limit before writing (existing persisted fallback labels are not silently changed). `saveKitchenPrintDeviceConfig` no longer silently removes assignment IDs beyond the old **20 unique printer** limit; it explicitly rejects excess/invalid IDs before SQL.
- The three printer pages do not use HTML maxlength. They now provide explicit JA/EN name-length errors for paste and `beforeinput`, preserve legitimate selection replacement and IME composition, and repeat the check immediately before the Save RPC. The server remains authoritative. Existing printer records and device profiles are unmodified.
- The printer UI previously used smooth `scrollIntoView` on edit; this change does not alter its behavior. That is a separate source/UI jitter review, not a reason to claim IZK-UT-074 fixed.

## Independent tests

- `node test/izk_ut_075_printer_input_security_test.mjs`: **5/5 PASS**. Direct server API rejects 61-char printer name, 41-char raw MAC, 121-char terminal/printer ID, and 21 unique printer assignments with **zero DB calls**; three pages' actual guard code runs in Node VM with 60/61 paste, valid selection replacement, IME composition, programmatic invalid name, and JA error checks.
- `node test/printer_unified_setup_test.mjs`: **21/21 PASS**, including Native/Web prod/TEST byte parity of all printer-setup source and existing print host assignment/security controls.
- Cloudflare D1 rows read/write, PrinterHost physical BLE/HID, Android/iOS, and Web deployment remain untested in this tranche; no formal QA PASS.

## Self-review (S01–S10)

| Check | Evidence/result |
|---|---|
| S01 Known 60-character user printer name | Existing source/UI matched; PASS |
| S02 Exact overlong server rejection before DB | Direct 61-character test PASS |
| S03 MAC canonical prefix collision risk | 41-char raw MAC rejected without reading DB; PASS |
| S04 120-character print host ID collision | Overlong value rejects before normalization; PASS |
| S05 Printer ID update targeting protection | Overlong ID fails before DB; PASS |
| S06 Newly supplied device label previous 80 max | Source preflight verified; direct live DB path PENDING |
| S07 20 assigned device printers limit | 21 IDs rejected without truncation; PASS |
| S08 UI paste vs selection replacement | Actual JS VM Native/Web/TEST; PASS |
| S09 IME, JA/EN, direct programmatic write | VM source guard PASS; physical IME PENDING |
| S10 Existing print setup and device ownership | 21 unified setup checks PASS; real BLE PENDING |

## Horizontal review (H01–H10)

| Surface | Result |
|---|---|
| H01 Android bundled printer page | JS VM PASS; APK pending |
| H02 iOS bundled printer page | JS VM PASS; IPA pending |
| H03 Web production printer page | JS VM PASS; live deployment pending |
| H04 Web TEST printer page | JS VM PASS; live deployment pending |
| H05 Printer creation idempotency identifier | 120-char protocol request ID unchanged |
| H06 Printer update/delete ID | Overlong ID cannot target trimmed row; local PASS |
| H07 Device assignment and host labels | Server constraints reviewed, physical pairing pending |
| H08 Kitchen printer 20-target assignment | Fail-closed before DB, local PASS |
| H09 Bluetooth bridge / queue poll / ACK | Existing paths unchanged; 21 integration checks PASS; device pending |
| H10 Other inputs / 914-candidate census | This fix covers printer user-input family; remaining rows separately reviewed, not blanket PASS |

**Outcome:** This known local printer source defect is corrected and regression protected. **IZK-UT-075 remains OPEN** because other input families and physical delivery are not comprehensively verified.
