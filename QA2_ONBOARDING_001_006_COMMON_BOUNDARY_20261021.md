# QA2-NEW-ONB-001..006: common backend validation and release handoff (2026-10-21)

Scope: source repair and offline negative/regression verification only. Official QA ledger, claims, device lease, signing, production deployment and production data were untouched.

## Official reality and prior repair

- Android `QA2-NEW-ONB-001`: **FAIL**, 2 attempts; latest physical Realme RMX3938 APK **910017** at `2026-10-12T23:42:50.8385915Z`. Login and help visible, but no new-store signup CTA; registration/Terms/Privacy could not be reached. Evidence in `.qa-v2-official/android/state.json` with screenshots `test-results/qa-v2-evidence/qa-910017-first-launch.png`, `qa-910017-onboard-help.png` and accessibility XML; previous 910016 failed as well.
- iOS `QA2-NEW-ONB-001`: **BLOCKED**, physical TestFlight **1.0(106)**; `SELF_SIGNUP_AVAILABLE` precondition absent in installed build; `.qa-v2-official/ios/state.json`.
- Android/iOS `QA2-NEW-ONB-002..006`: **NOT_RUN** in official state. These are respectively successful Free tenant signup, verification email, invalid registration rejection, JP initial settings and PH initial settings.
- Existing local remediation from 2026-10-13 already changed `mobile-app/web/config.js` to `SELF_SIGNUP_AVAILABLE: true`, preserving `signupOpen`, `signupCard`, Terms/Privacy links and handlers in identical `mobile-app/web/index.html` and `manage.html` (both SHA256 `a780c86422b8e47f72a005e5baaaed8885f2d46b6f8b2015fd3861ee53a18ba1`). `mobile-dist/config.js` has the true flag too. The current registry includes signed Android QA **910017** only (`qa-build-registry/apks/android-qa-v910017-680211cfad5a.apk`), so the recorded physical failure has not been superseded by a proved new release.
- A dedicated billing sandbox prep script (`scripts/qa-ios-billing-sandbox-build-prep.mjs`) deliberately turns signup **off** for billing testing; do not use that special artifact for onboarding acceptance.

## New shared defect and repair

`src/onboarding.js:registerStore` formerly called truncating `clean(...,32)` for workspace, `clean(...,100)` for login ID, and `clean(...,254)` for email **before** length / identity validation. This could turn overlong or control-character-tainted input into a different *valid* identity and begin preparing a new tenant/owner/plan transaction. The API can be called without the UI's `maxlength`, so this violates `QA2-NEW-ONB-004` (invalid input must create no partial registration). This path is common to `src/gasApi.js` signup and the dedicated internal provisioning endpoint in `src/index.js`.

Repair in `src/onboarding.js`: compare normalized workspace and login identifier to the complete raw trimmed input; reject control characters in original identifiers, reject raw email length above 254, and preserve Gmail canonicalization. Reject with existing `invalid_workspace`, `invalid_login_id` or `invalid_email` before business DB reads/preparation. No schema migration, UI branch or per-case adapter was added. Added S11..S14 to the existing common backend negative suite at `test/playwright-realme/role5-onb004-negative-backend.test.mjs`.

## Reproduction and verification

- Before fix: `node --test test/playwright-realme/role5-onb004-negative-backend.test.mjs` **exit 1**, 21 pass / 3 fail: S11 overlong workspace, S12 embedded control character and S13 overlong login ID each reached `QA_ONB004_SQL_MUTATION_PATH_TOUCHED` rather than an explicit validation rejection. S14 was adjusted afterward to exercise email truncation to a syntactically valid address; it was not part of those three initial red assertions.
- After fix: `node --test test/playwright-realme/role5-onb004-negative-backend.test.mjs test/qa2_login_signup_ime_regression_test.mjs test/playwright-realme/role5-onb004-source-playwright.test.mjs test/tenant_internal_provisioning_boundary_test.mjs test/tenant_fail_closed_config_matrix_test.mjs`: **exit 0, 30/30 tests passed**. Offline Chromium / synthetic DB / HTTP are *not* physical or formal QA proofs.
- `node --check src/onboarding.js` and same for modified test: **exit 0**; `git diff --check -- src/onboarding.js test/playwright-realme/role5-onb004-negative-backend.test.mjs`: **exit 0**.
- Wider `test/gas_compat_smoke_test.mjs` confirmed successful Free signup, owner, email verification, registered settings, duplicate and rate-limit tests in its output, but full command **exit 1** at **line 1162**, unrelated full-table backup count assertion. `test/control_plane_provisioning_test.mjs`: PASS 27 checks. `test/tenant_provisioner_service_test.mjs`: **exit 1** at line 418 for generated migration digest mismatch (actual `d65b45f9...`, expected `6cedb12f...`), while concurrent untracked migration `migrations/0047_revenuecat_original_transaction.sql` exists. Do not claim broad suite green or attribute the digest error to onboarding without separate proof.

## 10-avenue self review (source scope)

| ID | Review evidence | Status |
| --- | --- | --- |
| S01 | Compared manifest acceptance of ONB-001..006 against physical Android/iOS state and older local signup fix | PASS source audit; formal unchanged |
| S02 | Red test proved three invalid-identity inputs reached business SQL preparation; green after patch | PASS |
| S03 | Boundary lengths, embedded NUL, validation ordering checked with S11..S14 and existing S01..S10 | PASS |
| S04 | Mock DB forbids business SQL preparation, owner/plan writes and raw external network | PASS in focused tests |
| S05 | Existing rate limit, disabled signup, duplicate/retired ID and Gmail alias cases H01..H09 still pass | PASS |
| S06 | Existing valid signup and email/Free initial settings passed in gas smoke before unrelated full-table assertion | PASS for reviewed onboarding checks; broad suite FAIL |
| S07 | CTA, legal consent and keyboard source tests pass; no physical build verified | SOURCE PASS / DEVICE PENDING |
| S08 | `node --check` of changed JS and no change in global normalizer/token mapping | PASS |
| S09 | Targeted combined five-file 30-test suite exited zero, including offline Chromium and tenant fail-closed matrix | PASS OFFLINE |
| S10 | Diff limited to `src/onboarding.js` and existing `role5-onb004-negative-backend.test.mjs`; `git diff --check` exited zero | PASS |

## 10-avenue horizontal review (shared path)

| ID | Source / verification path | Status |
| --- | --- | --- |
| H01 | Android Native `mobile-app/web/config.js`, source signup button/handler and current signed 910017 provenance | SOURCE PASS / SIGNED DEVICE PENDING |
| H02 | iOS uses Native assets; existing TestFlight 106 still BLOCKED; billing sandbox flips signup off | SOURCE REVIEW / SIGNED DEVICE PENDING |
| H03 | `docs/yuwaku/manage.html` is a fixed-tenant login page, not public multi-tenant signup | N/A shared signup UI; no copy |
| H04 | `docs/yuwaku/test/manage.html` likewise fixed tenant; common server validation covers public signup endpoint | N/A shared signup UI; source review |
| H05 | `mobile-app/web/index.html` / `manage.html` SHA256 identical and both contain CTA / legal / handler | PASS SOURCE |
| H06 | `src/gasApi.js` imports same `src/onboarding.js`; dedicated provisioning in `src/index.js` imports same source | PASS SOURCE |
| H07 | `src/onboarding.js` rejects invalid identifiers before `db.first` or `db.raw.prepare`; batch-only business transaction remains | PASS OFFLINE; D1 independent proof PENDING |
| H08 | `ja` and `en` locale consent regression, existing normalized Gmail identities | PASS OFFLINE |
| H09 | Free signup, rate limiting, expired/verified email, tenant provisioning fail closed exercised in offline suites | PASS relevant tests; physical PENDING |
| H10 | Reverse search for `registerStore`/`onboarding` callers and source HTML/config checksum; no additional registration backend copy identified | PASS source review |

## Formal admission and next actions for prime

`ONB-001`: create a **signed, source-pinned new APK and iOS build** including the true signup flag; verify physical unauthenticated CTA, Terms and Privacy return, no-consent rejection and consent progression. Bind current `SELF_SIGNUP_ENABLED` and public multi-tenant provisioner route **without bypassing server policy**. `ONB-002`: unique QA-owned store + mailbox, signed real register / Free owner / tables and duplicate-creation readback. `ONB-003`: actual email receipt/confirmation, pre/post login and other-tenant denial. `ONB-004`: real physical invalid-input and rate-limit negatives + independent no-partial-write D1 proof; include new overlong/control cases as regression. `ONB-005/006`: separate JP / PH stores with country, currency, timezone, tax, seating, business profile, language save and restart checks; PH must additionally show amount/date/time correctly.

All six cases need existing official claim/runner, exclusive physical-device lease and signed witness/independent backend readback. Current preparatory `scripts/qa-v2-realme-onboarding-002-006.mjs` expects case claim + approved signed QA DB adapter, transport and oracles; these cannot be substituted by mocked/offline results. No formal case was advanced by this worker, and no deploy/commit/push was made.
