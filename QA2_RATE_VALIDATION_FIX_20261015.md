# IZK-UT-072 — serviceRate/taxRate validation (2026-10-15)

Cases: QA2-KEEP-PT-INP-0119, 0120, 0317, 0319. Source-only remediation; physical QA statuses remain untouched.

## Correction: two distinct specifications

**0119/0120:** `mobile-app/web/manage.html` onboarding `#setupTaxRate` / `#setupServiceRate`: **min=0 max=100 step=0.1**, as specified in `test/plans/ANDROID_REAL_DEVICE_PT_LEVEL_EXPANSION.md:704-705`. `mobile-app/web/index.html` contains the same native onboarding wizard and received the identical correction. `completeSetup()` formerly used `setupNumber()` plus min/max only, allowing `0.11` to be sent. Now each field must be nonempty and `checkValidity()` must pass before the first `manageRpc('saveSettings')`. `10.1` passes, `0.11`, `100.1`, empty and negatives fail without request or truncation. The Web production/TEST `docs/yuwaku/manage.html` files have no setup wizard or either control (different 408-line login/dashboard), so there is no corresponding save handler to change there.

**0317/0319:** `settings.html` has **min=0 step=any** with no configured maximum. It accepts e.g. `0.11`, `10.125`; the common backend `src/regionalSettings.js` deliberately does not impose onboarding's 0.1-step or 100 maximum on the separately specified general-settings API.

**Backend route:** onboarding calls `manageRpc('saveSettings',[patch])`, handled by `src/admin.js saveSettings` and `normalizeRegionalSettingsPatch`. Shared server validation rejects negative, blank, malformed and nonfinite for both paths. The API cannot distinguish onboarding calls from general settings patches by their submitted keys alone; an unconditional step=0.1/100 server restriction would break the general-settings allowed decimals. For onboarding the stricter contract is enforced synchronously by the HTML control prior to RPC. Direct API requests that otherwise satisfy the general settings domain can still submit `0.11`; an explicit backend context contract would be required for server enforcement of onboarding-only step/range.

`node test/qa2_rates_validation_manage_setup.mjs` executes the extracted actual `completeSetup()` JavaScript with guarded DOM elements, checks both Native `manage.html` and `index.html`, and verifies RPC invocation count for valid/invalid values. No physical WebView run is claimed.

## Specification and root cause

All three settings screens declare number controls with `min="0"`, `step="any"`, no maximum. Zero and any finite nonnegative decimal are legal, including 10.125. Native, production and TEST saveLocale previously sent raw values without validating. Server saveSettings passed through regional normalizer that did not inspect rates, so a negative persisted. The load path used `d.rate || ''`, hiding a valid zero.

After: screen rejects empty, invalid string, negative, non-finite and browser-invalid numeric inputs before RPC and focuses offending field; server regional patch validates both rates for all saveSettings callers *before* DB operations or batch writes. Mixed valid/invalid patches abort atomically. Existing access restriction (admin only) remains. Source-only changes; no direct API/GAS route code change because both use saveSettings, no deployed endpoint changed.

## Executed checks

`node test/qa2_rates_validation_regression.mjs`: exit 0. Both keys accept `0,10,10.5,0.01,.5,100.125,1e-2` and numeric equivalents; reject blank, whitespace, negative, NaN/Infinity, malformed, null/undefined/object and negative numerics. saveSettings invalid mixed patch rejected before touching DB; valid 0/10.125 written into in-memory DB stub; subsequent invalid mixed patch preserved prior settings and batch count; non-admin blocked. Three screen source guards/step and zero hydration inspected. `node --check src/regionalSettings.js` and `git diff --check`: exit 0.

This test uses a deterministic in-memory DB adapter, not production D1, physical UI or actual Native APK. The current build 910017 does not contain this patch.

## Independent self-review (10 criteria)

| Review | Evidence | Outcome |
|---|---|---|
| S01 | 0119/0120/0317/0319 manifest targets and IZK-UT-072 historical negative persistence record | PASS source mapping |
| S02 | saveLocale raw send and normalizeRegionalSettingsPatch missing rate checks; patched common normalizer | PASS source |
| S03 | 15 invalid and 9 allowed entries per rate exercised | PASS offline |
| S04 | saveSettings actorRole guard unchanged; explicit staff rejection in test | PASS offline |
| S05 | saveLocale rejects before RPC; invalid server patch skips DB and batch | PASS offline |
| S06 | valid zero and decimal DB stub readback; invalid mixed patch unchanged | PASS offline |
| S07 | three DOM input min=0 step=any and zero hydration reviewed; real screen dimensions not run | PASS source / PENDING physical |
| S08 | normalizer does not modify input object, finite parser and key-scoped errors; check syntax | PASS source |
| S09 | dedicated executable regression test exit 0 with realistic saveSettings path | PASS offline |
| S10 | changed only owning settings sections and rate normalizer; dirty tree preserved | PASS scoped diff |

## Horizontal review (10 independent entrypoints)

| Review | Evidence | Outcome |
|---|---|---|
| H01 | mobile-app/web/settings.html saveLocale before RPC | PASS source |
| H02 | docs/yuwaku/settings.html saveLocale before RPC | PASS source |
| H03 | docs/yuwaku/test/settings.html saveLocale before RPC | PASS source |
| H04 | serviceRate browser min/step alignment, no invented 100% cap | PASS source |
| H05 | taxRate browser min/step alignment, arbitrary decimals allowed | PASS source |
| H06 | src/admin.js saveSettings normalizes before tenant DB read/batch | PASS source |
| H07 | src/regionalSettings.js normalization covers direct native/API/GAS saveSettings calls | PASS source; runtime route PENDING |
| H08 | admin/other roles: explicit unauthorized saveSettings test | PASS offline |
| H09 | mixed shopName and taxRate invalid: no partial DB mutation | PASS offline stub |
| H10 | all three readback load paths preserve zero after reload | PASS source; device reload PENDING |

Additional independent correction reviews: S11 official 0119/0120 manifest step contract PASS; S12 actual manage/index `completeSetup` execution through mocked DOM PASS; H11 native manage wizard control presence PASS; H12 native index mirrored wizard control presence PASS; H13 Web production/TEST manage no wizard by source inventory PASS; H14 direct API distinction remains PENDING as documented. These augment rather than retroactively alter the earlier 10+10 records.

## Release gates and remaining verification

Source correction + dedicated Node checks complete. Android real device/Emulator, iOS device, D1 live integration, full UI locale and 720px display, deployed version and formal QA PASS/FAIL remain **PENDING**, for prime to arrange only within separately authorized QA/release scope. No commit, push, deployment, production DB mutation, device operation or official QA state edit was performed by this worker.
