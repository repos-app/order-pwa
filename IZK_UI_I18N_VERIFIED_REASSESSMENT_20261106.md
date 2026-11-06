# UI JA/EN evidence-based reassessment (2026-11-06)

## Subsequent remediation — 2026-11-06

The two Purchasing display issues identified below have now been fixed
across `mobile-app/web/purchasing.html`, `docs/yuwaku/purchasing.html`,
and `docs/yuwaku/test/purchasing.html`. The existing page-specific
`I18n.init` dictionaries now own the Save PO and Refresh button labels
and their adjacent Purchase orders heading via `data-t`. No ordering
logic, permissions, purchase-order RPCs or price calculation was altered.

All three surfaces were exercised in real offline Chromium with their
checked-in JavaScript: EN initial load, JA switch, EN switch-back and
unchanged click-handler bindings **PASS**. The verified general i18n
gate now finds zero reproduced mixed-language labels among its current
static candidate set. The fixed six previously open occurrences were
removed from the open issue ledger; stale resolved entries now also
cause CI failure. iPhone signed physical QA and PWA-cache update on
already-installed web clients are separate release verifications.

## Correction

The previous count of **1,084 raw-string candidates was not 1,084 defects**.
Its scanner treated Japanese-only developer tooling, proper language/locale
names, and controls correctly translated after page load as failures.
The first five examples, from the Japanese-only CoS Kick tool, were
false positives. The raw-string baseline is no longer the CI verdict.

## Current evidence

- **138** tracked, shipped HTML screens discovered.
- **111** have source evidence of a JA/EN language switch.
- **27** do not have a proven language switch and are not treated as
  bilingual failures (nor certified as intentionally monolingual).
- On the 111 bilingual screens the English static rendering identified
  **34 candidates across 18 screens**. These 34 were replayed in local
  Chromium with real application scripts, explicit EN mode and
  local-only fake API/auth (no real store or production mutations).
- **22** candidates were correctly translated after JavaScript boot,
  including Menu Editor's four bulk actions, Orders header, Coupons
  Save, KDS sound and Support category choices.
- **6** were intentional Japanese self-names in language/locale options,
  such as `日本語` and `ja-JP — 日本`.
- **6** displayed mixed Japanese/English text even after full boot,
  corresponding to **two distinct issues** repeated across the native,
  Web and TEST purchasing screens:
  `💾 発注を記録 / Save PO` and `更新 / Refresh`.
- All 34 candidates were classified, with zero silent assumptions of
  runtime PASS on an inaccessible/redirected screen.

Machine-readable local evidence:
`test-results/ui-i18n-verified/runtime-reassessment.json`.
This result does not constitute signed physical-device QA.

## Corrected shared QA infrastructure

- `scripts/ci/verified-ui-i18n-audit.mjs` discovers source-evidenced
  bilingual screens and computes the English DOM using actual CSS
  and the checked-in translation dictionaries.
- `scripts/ci/probe-ui-i18n-runtime.mjs` loads actual screen JavaScript
  with mock auth/network, verifies the active URL and locale, and reads
  the rendered system controls.
- `scripts/ci/reclassify-ui-i18n.mjs` distinguishes reproduced defects,
  dynamically corrected static warnings, intentional language endonyms
  and states that could not be proven.
- The existing `scripts/ci/auto-ui-i18n-gate.mjs` now bases its
  verdict on the new evidence, not on the misleading 1,084 raw matches.
  The remaining six occurrences are kept as **OPEN known defects**
  in `test/fixtures/verified-ui-i18n-known-issues.json`; a new
  reproduced defect or a failed runtime verification causes CI FAIL.
- Generic regression tests exercise actual evidence classification and
  refuse to call source-only checks or monolingual tools defects.

## Limits

This accurately reclassifies the **old static scanner's candidates**.
It does **not** mean all 111 bilingual screens and all dynamic flows
were exercised. In particular, **71** screens are statically clean
but still have unexercised runtime branches. Authenticated popups,
API errors, order flows and physical iPhone/Android UI require separate
scenario evidence. No official QA PASS counters are changed.
