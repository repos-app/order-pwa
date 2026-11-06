# New UI / i18n automatic test coverage — 2026-11-06

**Superseded raw-string count:** The historical 1,084 source matches
below are NOT 1,084 UI defects. The raw-string baseline was retired.
The evidence-based audit found **two distinct purchasing screen
translation issues (six occurrences)**, 22 runtime-translated false
positives and six intentional locale-name labels among the 34 static
English-screen candidates. See
`IZK_UI_I18N_VERIFIED_REASSESSMENT_20261106.md`.
The current CI gate verifies runtime language state and uses the
reviewed list of six OPEN issue occurrences instead of treating bare
Japanese/English text as a bug.

## Why the previous approach was inadequate

Previously a specific menu-editor regression was added by name to the
ordered project test manifest. That protected the reported screen but
did NOT make new screens or controls eligible for automatic QA.
Existing full-screen source censuses check syntax, not translation parity.

## Reusable platform implemented

- scripts/ci/auto-ui-i18n-coverage.mjs discovers every shipped HTML file
  recursively throughout the project; excludes tests, generated assets,
  dependencies, and native build trees. A new feature directory or control
  requires no change to a test-case roster. DOM parsing uses one offline
  Chromium browser and inlines local CSS for accurate visibility checks.
- The scanner inventories system buttons, headings, labels, option controls,
  translation-bound elements, JA/EN span pairs and file inputs. It detects
  missing ja/en dictionary keys, Japanese in English dictionary values,
  bare Japanese or English system labels, incorrectly displayed bilingual
  spans and file inputs without accessible labels.
  It also automatically discovers screen-side JavaScript and inspects raw
  text assignments and common notification calls for untranslated literals.
  This is source analysis, not execution of arbitrary runtime branches.
- scripts/ci/auto-ui-i18n-gate.mjs replays static candidates in an offline
  Chromium browser, using the correct active locale. Its fixture is now
  test/fixtures/verified-ui-i18n-known-issues.json and records only
  independently reproduced OPEN issues. New reproduced failures block CI.
- scripts/ci/run-auto-discovered-tests.mjs recursively runs all test cases
  matching test/auto-ci/**/*.test.mjs. Adding a safe deterministic contract
  test in that directory or its children needs no manual registration.
- Both gates are included in npm test and the pipeline contract. The
  GitHub Actions workflow auto-ui-coverage.yml runs them on every push
  and pull request without production secrets or physical devices.

## Verification and existing warnings

The local scan found 138 shipped HTML screens, 94 screen-side JavaScript
files, 2,629 system controls / headings/labels and 2,694 translation-bound
elements. Twelve UI mutation tests deliberately introduced new defects and verified
that each resulted in a FAIL with no test-case registration.
Additional tests verified automatic discovery of newly added files and
new nested test cases. The full project test manifest contains the
two generic gate entry points; the complete 213-step project suite and
native real-device QA are not counted as PASS unless executed.

The superseded raw source scan had reported 1,084 historical potential
translation/accessibility candidates: 479 raw Japanese controls,
421 raw English controls, 109 raw Japanese dynamic UI messages,
47 raw English dynamic UI messages, 27 file inputs with no HTML label
and one runtime-generated dictionary that cannot be safely inspected.
These were SOURCE-ONLY warnings, not 1,084 verified user-visible defects.
Some may be translated by runtime behavior or intentionally use
brand/product names. The raw-string baseline has been retired;
its original numbers here are retained only for incident history.

## Boundaries and next steps

Automatic discovery does not infer business semantics. A generic scanner
cannot know the correct price, permission, refund amount, async error path
or dynamically created label on an unvisited business screen. These
require an executable scenario and expected-result oracle. New safe
scenario tests become automatically executable if placed below
test/auto-ci. iOS/Android official physical QA also remains separate.
Generic source/browser results must not change formal QA ledger numbers.

Steady state: each new UI element is discovered on push/PR; generic
translation and accessibility regressions fail; new safe scenario tests
are executed automatically; unverified business outcomes remain
explicitly unverified.

## Commands

node scripts/ci/auto-ui-i18n-gate.mjs

node scripts/ci/run-auto-discovered-tests.mjs

node test/izk_project_test_pipeline_contract_test.mjs

npm test

The optional --review-bootstrap argument changes the fixed historical
debt snapshot; it is NOT part of CI and must never be used to hide a failure.
