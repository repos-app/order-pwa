# QA2-KEEP-PT-INP-0342 | Local source correction (2026-10-15)

**Formal status remains NOT_RUN.** This file records source-only remediation and local test evidence; installed Android build 910017, real device, formal QA runner and production are untouched.

Cause: `src/discountRules.js` called `canonical(...,80)` and `normalizeCode()` using `clean(...,40)` before checking original lengths. Both quietly truncated direct RPC values. All three settings views declared `maxlength=80` for names and `maxlength=40` for code, but ordinary typed/pasted overlength input could be silently clipped by browser maxlength before save. `installDiscountLengthGuards()` runs in all three settings views: cancellable `paste` and `beforeinput` precheck proposed insertion length with selected-range replacement accounted for. On excess it prevents insertion, preserves the previous field value, reports a localized single error for the event and sets aria-invalid. Composition is not interrupted; if the committed IME result exceeds the maximum, the pre-composition value is restored with an error. `maxlength` remains present. Direct RPC raw length checks, including whitespace/control characters, reject before normalization/DB access. Browser/runtime differences in IME and clipboard event behavior remain for real-device verification.

## Ten independent self reviews

| Check | Observation / method | Status |
|---|---|---|
| S01 | Requirements: code40 / JP+EN name80 against markup | PASS source |
| S02 | Root cause: `clean().slice` and `canonical` examined | PASS source |
| S03 | Boundary: 40/41 and 80/81 | PASS local |
| S04 | Unicode length >80 | PASS local |
| S05 | Legacy `name` fallback | PASS local |
| S06 | Direct save with invalid values uses no DB | PASS local |
| S07 | Existing role guard still precedes validation | PASS source |
| S08 | Valid boundary inputs + selection replacements accepted | PASS VM/local |
| S09 | JS module import and VM simulated paste/beforeinput/IME | PASS local |
| S10 | Existing dirty changes / package / QA files untouched by this task | PASS scope |

## Ten independent horizontal checks

| Check | Evidence | Status |
|---|---|---|
| H01 | Native `mobile-app/web/settings.html`: actual handler executed in VM | PASS VM |
| H02 | Web production `docs/yuwaku/settings.html`: actual handler executed in VM | PASS VM |
| H03 | Web TEST `docs/yuwaku/test/settings.html`: actual handler executed in VM | PASS VM |
| H04 | `src/discountRules.js` direct normalize boundary | PASS local |
| H05 | `saveDiscountRule` admin direct endpoint early error | PASS local |
| H06 | Japanese localized name payload | PASS local |
| H07 | English localized name payload | PASS local |
| H08 | Code legacy normalization and length boundary | PASS local |
| H09 | Programmatic `.value` bypass and paste/typing overflow rejected before RPC, selected text replacement and composition tested | PASS VM/source |
| H10 | Physical Android/iOS keyboard, paste and visualization | PENDING (not executed) |

Local regression command: `node test/qa2_discount_overlength_0342.mjs` (exit 0 after correction of the test VM mock), previous `node test/qa2_discount_loyalty_validation_boundary.mjs` (exit 0), scoped `git diff --check` (exit 0). Formal QA execution, production deployment and empirical IZK-UT-074 jitter verification are pending. Prime has separately implemented the 074 pure-probe driver mitigation in scripts; this task does not modify it.
