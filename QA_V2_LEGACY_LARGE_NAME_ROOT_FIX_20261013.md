# Legacy large-size label repair (2026-10-13)

## Root cause and correction

Archived English names may contain “Ramen (greatly)” corresponding to Japanese names ending in （大盛）, （大） or （大盛り）. Commission had a presentation correction, but KDS, receipt, customer order status and printer each consume a separate raw name path. The fix changes presentation of the exact trailing English “(greatly)” only with Japanese size-suffix evidence. It never alters persisted orders, menu records, archive data, APIs, or SQL.

KDS resolves size from canonical Japanese order suffix or the Japanese name, converts to one “(large)” and suppresses duplicate size suffix. Unrelated options are retained. Japanese output is unchanged, and bilingual printing keeps Japanese plus corrected English.

## Changed paths

| Distribution | Changed source | Active tested function |
| --- | --- | --- |
| Native | mobile-app/web/kds.html | dispItemName |
| Native | mobile-app/web/receipts.html | readableDetails |
| Native | mobile-app/web/app.js | orderDetailsText |
| Web production | docs/yuwaku/kds.html | dispItemName |
| Web production | docs/yuwaku/receipts.html | readableDetails |
| Web production | docs/yuwaku/app.js | orderDetailsText |
| Web TEST | docs/yuwaku/test/kds.html | dispItemName |
| Web TEST | docs/yuwaku/test/receipts.html | readableDetails |
| Web TEST | docs/yuwaku/test/app.js | orderDetailsText |
| Server | src/printers.js | printItemName |

## Ten self-review categories for each changed path

1. Active function and caller inspected.
2. Exact trailing English corruption verified.
3. Japanese size-suffix gate verified.
4. Non-large labels preserved.
5. Existing “(large)” remains stable.
6. Japanese display not changed.
7. Options and extra suffix behavior checked (KDS run, others source review).
8. Quantity retained (receipt and order VM run, other paths not applicable).
9. No persistence or remote request side effects added.
10. Actual function VM execution and source diff/parse checks.

These ten distinct reviews were applied to each of ten changed paths, with applicability as stated. Source inspection is not an Android/iOS rendering pass.

## Ten horizontal scopes reviewed for each path

1. Native delivery variant.
2. Web production delivery variant.
3. Web TEST delivery variant.
4. Preexisting Commission workaround and behavioral consistency.
5. Customer order status presentation.
6. KDS presentation.
7. Receipt presentation.
8. Japanese print formatting.
9. English and bilingual print formatting.
10. Legacy raw canonical names, appended option labels and frozen data.

Review method: inspect corresponding consumers and compare Native/Web/TEST; run actual function bodies in isolated VM contexts for the three distributions and print formatter. Not all scopes are reachable from every caller; for non-applicable scopes we reviewed cross-surface behavior rather than claiming a device test.

## Regression evidence

- node test/legacy-large-name-runtime.test.cjs: PASS. Actual source-function VM cases cover large-size translation, duplicate suffix, historical canonical suffix, ordinary options, Japanese display, receipt and order quantities, and three printer languages.
- node --check src/printers.js: PASS.
- node --check mobile-app/web/app.js: PASS.
- git diff --check on ten changed source paths: PASS.

## Unverified and intentional boundaries

## Additional audit: newly persisted automatic translations

**Confirmed reachable persistence cause.** Menu save `src/admin.js::saveMenuItem` invokes `completeLocalizedPair` for localized fields and `translateMenuOptions` for option groups and choices before assigning `namePair.en` to its saved name. In `src/translation.js`, `completeLocalizedPair` formerly accepted `env.AI.run('@cf/meta/m2m100-1.2b')` output verbatim when English was blank. Cached output also flowed to this result verbatim. Consequently a model response `Ramen (greatly)` for `ラーメン（大盛）` could be persisted on a newly saved menu row. This is a demonstrated source-level reachability and deterministic mocked-response reproduction; no production AI request was made, and actual historical model response was not independently reproduced.

The minimum correction is in `src/translation.js::completeLocalizedPair`: only **newly generated** English translations whose paired Japanese input ends with （大）, （大盛）, or （大盛り） have exact trailing `(greatly)` replaced with `(large)`. Already entered English text is unchanged. `translateMenuOptions` inherits the guard for group/choice pairs automatically; manual labels and unrelated translations are not rewritten. The translation cache remains raw, so its identity/usage accounting does not change, but its result is normalized before menu persistence. No broad prompt change, unrelated inventory translations, or migration is necessary.

Ten additional self-review checks for this confirmed translation path:

1. Caller: menu save invokes pair completion before persisted name assignment.
2. Provider: Workers AI response extraction enters `translateText`.
3. Cache: cached translation also passes through `completeLocalizedPair`.
4. Matching: the guard requires paired Japanese large suffix.
5. Position: only exact trailing parenthetical English token is changed.
6. Input ownership: supplied nonempty English value remains untouched.
7. Idempotence: already valid `(large)` is preserved.
8. Option choices: existing `translateMenuOptions` uses the same pair function.
9. Side effects: no DB writes, remote AI calls, cache-key changes or schema changes added to the guard.
10. Real-function dynamic tests and `node --check src/translation.js` plus diff check pass.

Ten additional horizontal review scopes for this translation path:

1. `saveMenuItem` new menu creation.
2. `saveMenuItem` existing menu update.
3. English-only/manual English preservation.
4. Japanese-only automatic English generation.
5. Translation with usage/cache versus direct provider path.
6. Options group localized name completion.
7. Options choice localized label completion.
8. Non-large suffix negative case.
9. Model returns correctly translated `large` negative case.
10. Inventory/other translation users remain outside the menu-specific paired-name guard.

**Regression evidence:** `node test/legacy-large-name-runtime.test.cjs` PASS (includes actual exported `completeLocalizedPair` / `translateMenuOptions` executed with mocked Workers AI response, three large-size spelling variants, pre-corrected value, unrelated suffix, nonterminal `greatly`, explicit manually entered English, and option choice). `node --check src/translation.js` PASS; `git diff --check -- src/translation.js` PASS. All checks are deterministic unit/source-function verification; live D1 persistence and production AI inference were intentionally not run.

Real physical printer, UI browser rendering, Android/iOS devices and all historical combinations of option JSON were not tested. Historic plain-text-only items without a paired Japanese size name cannot reliably identify this specific mistranslation and are not rewritten. No archived receipt/order payload, DB row, migration, package/SW, shared QA master or official PASS record was changed. Commit/push/deploy and production DB/device actions were not performed.
