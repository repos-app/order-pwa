# Android source milestones: five input pair ownership conflicts

Scope: Android pending QA2-KEEP-PT-INP-0077/0078/0085/0086/0087, `teat` only. Source preparation and offline review; no ADB, D1 mutation, formal Runner claim, device proof, or official verdict. Official manifest and two OS ledgers were read, never edited.

## Measured result

Source inventory from `scripts/qa-autonomy/qa-source-coverage-selection.mjs`, which invokes `summarizeFullBacklog` and `readAutomationBacklog` against the current official OS ledgers:

| Milestone (Android 441 pending at measurement) | Before | After | Difference |
| --- | ---: | ---: | ---: |
| 1. registered | 241 | 246 | +5 |
| 2. fixture | 241 | 246 | +5 |
| 3. driver | 47 | 47 | 0 |
| 4. db | 37 | 37 | 0 |
| 5. png | 72 | 72 | 0 |
| 6. expected | 77 | 77 | 0 |
| 7. oracle | 77 | 77 | 0 |
| 8. cleanup | 70 | 70 | 0 |
| 9. contract | 21 | 21 | 0 |

Source pair `coverage-06c2cca9802ca59809dc52.pair.json` was a superseded duplicate of five cases; its reusable modules and the offline case package remain untouched. A durable owner filter now prevents that register script from reintroducing the duplicates. `0077` retains `coverage-872198fb67038755e05c77`, while `0078/0085/0086/0087` retain `coverage-20e065f01c9e536a42b7a6`. A separate hardening fix requires the matching exclusive device lease and serial during the latter family's admission; previously a wrong serial reached the later adapter check.

Reproduction: `node scripts/qa-autonomy/qa-source-coverage-selection.mjs --duplicates`. Validation: `node --test scripts/qa-autonomy/qa-source-pair-ownership.test.mjs scripts/qa-autonomy/coverage-06c2cca9802ca59809dc52-pair.test.mjs scripts/qa-autonomy/coverage-20e065f01c9e536a42b7a6.test.mjs scripts/qa-autonomy/coverage-872198fb67038755e05c77.test.mjs scripts/qa-autonomy/qa-automation-backlog.test.mjs`: **33 PASS, 0 FAIL**. `git diff --check`: PASS. These results are strictly offline tests, not a device verdict.

## Ten independent source review viewpoints

| Review | Inspection / concrete evidence | Source result |
| --- | --- | --- |
| S01 | Current official denominator through `summarizeFullBacklog` | Android pending 441, no ledger mutation |
| S02 | Before duplicate registration count by case | Five named input IDs had 2 owners each |
| S03 | `0077` source driver and scoped data owner | Canonical 872 pair retained |
| S04 | Other four source drivers and scoped data owners | Canonical 20 pair retained |
| S05 | Existence of the five winner drivers and data provisioners | Source ownership regression passed |
| S06 | Old generator output after ownership filter | Empty old pair; no recreated duplicate when mapping applies |
| S07 | Source baseline from existing audit implementation | `registered` and `fixture` each increased by 5 |
| S08 | Admitted wrong-serial fixture preflight test | Previous failure fixed; test now passes |
| S09 | `teat`, `claimScoped`, idempotency per winner | Five winner source entries checked in tests |
| S10 | Focused regression and whitespace check | 33/33 offline PASS; diff check PASS |

## Ten horizontal impact viewpoints

| Review | Related area | Result / limitation |
| --- | --- | --- |
| X01 | `QA2-KEEP-PT-INP-0099`, unique 20-family case | Filter leaves this registered case untouched |
| X02 | 872 family's 0073–0076 cases | Their pair source remains untouched |
| X03 | Original 06 family scripts and historical input test package | Modules preserved and old pair test passes |
| X04 | Android coverage dispatcher | Existing backlog tests pass; nine source milestones still measured separately |
| X05 | Other duplicate families | Present in `--duplicates`; untouched and still outstanding |
| X06 | iOS QA state | No iOS artifacts edited; no iOS evidence claimed |
| X07 | Physical Realme/device lease | Wrong serial rejected in offline test; live transport untested |
| X08 | Test-store ownership | Five winners pinned to `teat`; live D1 untouched |
| X09 | Independent DB, PNG and Oracle | Counts unchanged; physical and signed proof still needed |
| X10 | Official Runner/Android and iOS PASS | No official case status changed; source progress only |

Outstanding: other Android source definition gaps and five E2E runtime stages still require independent work. Claim-scoped physical proof and signed D1 confirmation for these five cases remain unverified. The source counts are not formal PASS counts.
