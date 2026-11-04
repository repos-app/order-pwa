# INP-0119 / 0120 / 0272 / 0294 / 0317 — Android FAIL source repair

This is a **source and offline QA** handoff. All five cases remain officially
`FAIL` until the canonical official runner independently acquires a case-specific
`RUNNING` claim, exercises a signed installed Realme build, verifies the real
screen PNGs and gesture bytes, independently reads teat D1 and reconciles data.
No formal case was claimed or marked PASS during source preparation.

## Original defect evidence and current product regression

| ID | Original signed/physical FAIL | Current source regression | Physical retest |
| --- | --- | --- | --- |
| 0119 | `setupTaxRate=0.11` persisted despite step `0.1` | `test/qa2_keep_pt_inp_0119_0120_percentage_contract.test.mjs` | Pending |
| 0120 | `setupServiceRate=0.11` persisted despite step `0.1` | Same two-rate boundary test | Pending |
| 0272 | Supplier `sEmail` persisted malformed email, emoji and XSS/SQL strings | `test/supplier_email_validation_test.mjs` exercises backend and UI | Pending |
| 0294 | Native-invalid emoji `rEmail` submitted and persisted reservation | `test/qa2_keep_pt_inp_0294_email_product_regression.test.mjs` checks five reservation copies | Pending |
| 0317 | Setting `serviceRate=-1` persisted | `test/qa2_rates_validation_regression.mjs` verifies shared percentage validation | Pending |

The product validation fixes referenced above existed in the working source on
arrival. This task preserved them and added an independent, shared QA lifecycle
to retest those defects without overwriting active changes from other sessions.

## Source contract and dashboard measurement

- Canonical group: `coverage-1ab46f6aecc106814feaff`.
- Common data: `scripts/qa-autonomy/coverage-1ab46f6aecc106814feaff-data.mjs`.
- Common driver and oracle: `scripts/qa-autonomy/coverage-1ab46f6aecc106814feaff-driver.mjs` and `qa2-inp-1ab46f6a-driver.mjs`.
- Physical WebView/ADB provider: `scripts/qa-autonomy/coverage-1ab46f6aecc106814feaff-realme.mjs` (claim-guarded, real signed installed APK, on-disk PNG and gestures).
- Deferred independent D1 selector: `scripts/qa-autonomy/coverage-1ab46f6aecc106814feaff-db.mjs`; supplier/reservation IDs are obtained from the actual owned UI result, with an independent owner attestor required.
- Five actual native entrypoint modules: `scripts/qa-v2-realme-1ab46f6a-inp-*.mjs`.
- Source pair, individual direct admissions and owned fixtures: `test/plans/qa-v2-realme-user-authorized/`.
- Genuine offline execution log: `test-results/qa-autonomy/coverage-1ab46f6aecc106814feaff-offline-node-test.log`.
- Source audit: `test-results/qa-autonomy/coverage-1ab46f6aecc106814feaff-source-contract-audit.json`.
- Implementation handoff: `scripts/qa-autonomy/runtime/coverage-handoffs/coverage-1ab46f6aecc106814feaff.json`.

Full Android source backlog snapshots from the initial scan and latest
registration invocation (other concurrently running workers modify the same
global source backlog; net changes in this table are **not** attributable
solely to this case family):

| Source-only milestone | Before | After |
| --- | ---: | ---: |
| Registered | 263 | 256 |
| Fixture references | 263 | 256 |
| Driver references | 85 | 84 |
| Independent DB selectors | 75 | 84 |
| PNG locations | 109 | 108 |
| Original expected checks | 201 | 217 |
| Independent oracle references | 117 | 116 |
| Cleanup references | 110 | 109 |
| Complete *declarative* source contracts | 59 | 69 |

For the explicitly requested `auto-oracle` case **0294**, its oracle reference
advanced from **0 to 1**; existing owner `coverage-3972048a1305172e94c6a3`
transferred only its 0294 row; duplicate ownership remains 0. Re-running the
new registration preserves the first recorded baseline rather than inventing
another 0→1 increase. These are dashboard *source* milestones, not physical
execution counts or official PASS/FAIL transitions. **All five** current
`missingPairedCaseContracts` checks returned `missing:[]`, even as parallel
groups changed the global counters.

The existing **QA-only source** now allows only UUID-shaped supplier IDs for
`teat`, reading just supplier `name,email` through BOTH the Worker ES256
projection and independent D1 selector. `taxRate` has likewise been added to
both narrowly defined non-secret settings allowlists. Real ECDSA signing,
readback comparison, and cross-tenant denial passed offline. **These Worker
source changes have not been deployed or verified against live QA.**
For **0272/0294**, the dynamic selector records neither an invented supplier
UUID nor a fictional reservation ID before gestures. It resolves only a
claim-owned row from the actual WebView admin readback and then requires an
independent `teat` owner attestor and genuine ES256/D1 observation. Current
signed data API and owner attestor callbacks are not connected to a live
claimed session. Remaining runtime blockers for **all five** are
`INP1AB_LIVE_SIGNED_QA_FIXTURE_PREPARE_READ_RECONCILE_NOT_VERIFIED` and
`INP1AB_OFFICIAL_CLAIM_REALME_PHYSICAL_PROVIDER_AND_PNG_NOT_BOUND`.
The Realme transport source exists and the device appeared in a read-only
ADB inventory, with installed application versionCode `910027`. The installed
APK's SHA has **not** been attested for these claims; neither a true signed
Worker receipt nor claimed gesture PNG was collected in this task.
The reservation driver uses a distinct `fixtureName + probeLabel` record
identifier for each input boundary. The signed preflight requires zero
existing QA reservations for the owned marker before gestures. Browser-side
maxlength/newline sanitation is observed as native prevention rather than
misreported as a saved, malformed reservation; actual successful submissions
still require a matching signed D1 case-owner readback.
Direct admissions remain `executable:false`, `fixtureVerified:false`, and
`approved:false` pending genuine execution.

The paired runtime is allowed to change source files without re-pinning source
SHA fields. It must still check the live official claim, `teat`, signed APK,
owner-scoped fixture, real device gestures, on-disk PNG and trace SHA256,
independent signed D1 post-state and cleanup in `finally`.

## Ten independent source reviews

| Review | Result |
| --- | --- |
| S01 | Current immutable group contains exactly five official FAIL IDs |
| S02 | All five target field IDs are matched to immutable legacy assertions |
| S03 | Each entrypoint statically imports the common data provisioner |
| S04 | Signed data API fails closed on missing callbacks |
| S05 | Fixture ownership requires `teat`, RUNNING claim, matching case and idempotency key |
| S06 | Existing QA settings use snapshot and compare-and-swap restoration requests |
| S07 | Supplier and reservation fixtures may create only case-owned QA rows |
| S08 | Native gesture receipts require screenshot and gesture-log disk SHA verification |
| S09 | Reconciliation is attempted even when setup or a real gesture fails |
| S10 | Handoff evidence SHA points solely to generated test-results logs and audit report |

## Ten horizontal impact reviews

| Review | Result |
| --- | --- |
| X01 | Rate boundaries include 0, 100, 0.1, 0.11, negative and overflow |
| X02 | Supplier email includes both exact 120-character maximum and 121-character rejection |
| X03 | Reservation email includes both exact 254-character maximum and 255-character rejection |
| X04 | Emoji/Japanese/SQL/XSS email probes are independently rejected by shared oracle |
| X05 | Existing regional settings product regression exercises the three rate UI copies |
| X06 | Existing reservation product regression exercises the five copies of reservation UI |
| X07 | Existing supplier email regression checks backend plus multiple UI copies |
| X08 | Legacy 397 owner retains its four other input cases; rerun filter prevents re-claiming 0294 |
| X09 | Original official Android and iOS ledgers remain read-only and status is preserved |
| X10 | Direct admission is explicitly blocked until independent real signing, D1 and physical evidence |

Offline regression: `node scripts/qa-autonomy/coverage-1ab46f6aecc106814feaff-register.mjs`
runs the eight focused Node test files (including real ECDSA signature and
dynamic D1 contract tests) and logs **45 PASS, 0 FAIL**. Targeted independent
QA D1, source admission, and the sibling source package suite yielded **35
PASS, 0 FAIL** in the latest run. Neither count is an official physical QA
verdict. All five were independently re-read as official `FAIL` after source
preparation; this task did not make a case claim or edit the official ledger.
