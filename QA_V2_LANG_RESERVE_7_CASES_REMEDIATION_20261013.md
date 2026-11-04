# QA V2 language / reservation remediation — 2026-10-13

Scope: worker-2, seven Android QA FAIL items. Source remediation and local regression only. Existing Android official QA `FAIL` results and original screenshot hashes are preserved. No device, production API/DB, build, commit, push, deployment, SW cache, header.js, admin.html or master QA ledger changed.

## Case-by-case result

| ID | Root cause | Correction | Local result | Formal Android result |
|---|---|---|---|---|
| QA2-KEEP-PT-LANG-X-012 | Saved AI English item name `Ramen (greatly)` surfaced without size-context normalization in commission assignments | `mobile-app/web/commission-app.js` uses one `menuName()` for open-order lines, rule targets and dropdowns; corrects exact `(greatly)` only if corresponding JA size is `（大）`/`（大盛）`/`（大盛り）` | PASS: VM executes `menuName` with observed `ラーメン（大盛）` and asserts `Ramen (large)`; nonmatch/Japanese fallback | FAIL retained; physical retest required; saved source translation in DB remains unchanged |
| QA2-KEEP-PT-LANG-X-015 | Usage summary rendered on API completion and did not rerender when UI language changed | Cache last API usage response; invoke `renderAiUsage` inside `I18n.init` callback in `mobile-app/web/settings.html` and `docs/yuwaku/{settings.html,test/settings.html}` | PASS: execute actual renderer with mocked DOM; JA/EN counters checked | FAIL retained; physical retest required |
| QA2-UI-terms | Article visibility can depend on old cached legal CSS even though button/header switches | `mobile-app/web/legal.js` now explicitly updates full `article.lang-ja`/`article.lang-en` visibility synchronously during language apply; existing page-local fallback remains | PASS: `test/legal_article_language_toggle_regression_test.mjs` exercises both articles, JA→EN→JA and persistence | FAIL retained; native rebuild/device retest required |
| QA2-UI-privacy | Same class of article/header divergence | Same shared `legal.js`; existing `privacy.html` article fallback verified | PASS: same real DOM-like VM regression | FAIL retained; native rebuild/device retest required |
| QA2-UI-requests | Empty-content validation writes a one-time Japanese error; I18n updates only labels | `mobile-app/web/requests.html` and `docs/yuwaku/{requests.html,test/requests.html}` retain validation error key and refresh displayed `needContent` after locale callback | PASS: validation error key and callback verified on all three surfaces; manual native click still pending | FAIL retained; native/device retest required; unrelated server-returned errors are not part of this fix |
| QA2-UI-reserve | Live reservation alert text not synchronized on locale toggle | Five reserve surfaces retain their alert error code and redraw using current dictionary after JA/EN change; known API, missing fields, invalid people and long notes covered | PASS: runtime submit validation on five surfaces, error-code wiring verified | FAIL retained; native/device retest required |
| QA2-FLOW-C-002 | Party size 0 passed JS handler despite HTML min; notes had no maxlength; backend `parseInt` tolerated partial numbers and truncated 200+ notes without error | Five reserve surfaces enforce integer party 1–100, notes maxlength=200 and localized error; `src/crm.js` rejects malformed party and notes >200 without writing | PASS: 5 client runtimes, 8 negative backend cases; existing date validation untouched | FAIL retained; actual reservation/free-plan paths require device QA |

## Review execution / evidence

Every case was inspected through **10 source self-review checkpoints**: S1 precise reproduction in official state, S2 trace/evidence cross-check, S3 entrypoint/caller identification, S4 locale source precedence, S5 validation/error path, S6 success/persistence invariants, S7 data and security boundary, S8 syntax and safe string handling, S9 meaningful runtime regression, S10 diff inspection for unrelated modifications. Cross-cutting review used **10 independent horizontal axes**: H1 native embedded assets, H2 public Web, H3 test Web, H4 dedicated public reservation root, H5 shared i18n/legal routing, H6 API response codes, H7 backend enforcement, H8 neighboring menu/setting/request display paths, H9 JA→EN→JA and initial/default-language paths, H10 stored QA failures and future physical retest needs.

These are review *checkpoints*, not a claim that 20 independent full physical QA executions occurred per case. Applicability/evidence:

| Case | 10 self-review checkpoints | 10 horizontal axes / limitation |
|---|---|---|
| LANG-X-012 | S1–S10: QA trace names `ラーメン（大盛）`; order line now invokes shared menu-name normalizer; test covers affected, unaffected and JA display | H1/H8/H9 exercised; H2–H4 have no commission public page; H5/H6/H7 keep raw saved name unchanged; H10 device retest outstanding |
| LANG-X-015 | S1–S10: stale cached display confirmed from data-fetch/render separation; memoized response, no extra fetch on locale switch; runtime text assertions | H1/H2/H3 source parity; H5/H9 callback; H6/H7 unchanged read-only API; H4 not applicable; H8 neighboring setting labels; H10 pending native retest |
| UI-terms | S1–S10: source-level shared visibility setting + HTML article presence + VM JA/EN/persistence test | H1/H5/H9 shared legal.js; H2–H4 separate public legal pages not part of authenticated native article routing; H6–H8 no data mutation; H10 pending device evidence |
| UI-privacy | S1–S10: same engine, independent privacy full article exercised by legal VM test | H1/H5/H9 shared engine; H2–H4 isolated public legal variants; H6–H8 unchanged; H10 pending device evidence |
| UI-requests | S1–S10: verify empty submit error key, English dictionary and retranslation callback, no RPC on invalid input | H1/H2/H3 3 source surfaces; H5/H9 I18n callback; H4/H6/H7 unrelated; H8 other request errors reviewed but not universally retranslated; H10 pending device |
| UI-reserve | S1–S10: API error key, missing date/name/email, person and notes validation, alert redraw and local source-test execution | H1/H2/H3/H4 all five HTML surfaces; H5/H9 current T dictionary; H6 errors mapped; H7 backend; H8 request-form date/slot retained; H10 pending device |
| FLOW-C-002 | S1–S10: zero/negative/fractional/large numbers, notes threshold, no server submission on invalid client, no DB write on invalid backend | H1/H2/H3/H4 five form copies; H5 localized errors; H6 error codes; H7 `src/crm.js` rejects inputs; H8 existing date rules preserved; H9 languages; H10 pending device/free-plan |

Validation commands (exit code 0):

```
node test/qa_v2_lang_reserve_7_cases_regression_test.mjs
node test/legal_article_language_toggle_regression_test.mjs
node test/android_qa_public_language_precedence_test.mjs
node test/android_qa_default_language_priority_test.mjs
node test/d1_p0_commission_open_orders_test.mjs
node test/bilingual_data_test.mjs
node --check mobile-app/web/legal.js
node --check mobile-app/web/commission-app.js
node --check src/crm.js
git diff --check
```

Regression coverage: 5 independent reservation-form HTML entrypoints execute `submitRes` through VM with valid/invalid inputs; mock API count confirms rejects are not sent. `src/crm.js` real `submitReservation()` rejects `0`, `'0'`, `-1`, `'1.5'`, `'1oops'`, `101`, empty party and 201-char notes with mock DB and no write. Settings renderer executes in simulated JA/EN UI state for native, Web production and Web test. Legal test runs actual `legal.js` plus full legal page inline handlers.

Horizontal regression suites also passed: public reservation language precedence across all five pages; native/Web/test manual language preference and async default; commission open-order bounded retrieval and tenant isolation; bilingual data (84 checks including menu translation persistence, exact parenthesized names, shared screen fallbacks, and inline scripts).

**Open blockers:** Device QA with updated APK and authenticated login is still necessary; no official case status promotion is justified. Verify commission large-ramen actual persisted name shape; note that other problematic AI translations require a separate data quality policy. Real reservation successful submit, free-tier restriction, timed API response during a locale switch, and 720px physical display still require formal device/authorized staging testing. Requests page retranslation currently addresses the exact empty-content validation FAIL; other API error messages already visible during a toggle may still need a common error-state architecture in later horizontal follow-up.

## Final horizontal audit: source findings (read-only inspection, 2026-10-13)

**Confirmed recurrence path:** The incorrect `nameEn` belongs to persisted product/order data, so a Commission-only label override does not fix its source. `mobile-app/web/kds.html` around lines 145–165 explicitly chooses `it.nameEn` when English is selected; `mobile-app/web/receipts.html` around lines 124–128 uses `it.nameEn` for JSON item details; `mobile-app/web/app.js` around line 530 uses `i.nameEn` in active-order details; `src/printers.js` around lines 293–295 uses `item.nameEn` for English print rendering. The exact faulty data in those downstream payloads was **not** confirmed with live device/DB access, so these are proven reachable code paths, not additional verified visual FAILs. No broad UI substitutions were applied: repairing the saved menu English value, with appropriate historical-snapshot policy, is the correct longer-term fix. Only the exact `(greatly)` + `（大盛）` circumstance is handled locally by the Commission adjustment.

**Requests error limitation:** In `mobile-app/web/requests.html` the current `I18n.init` callback rewrites only `#subErr` with `data-error-key=needContent` (the verified empty-submit scenario). Server-side failures in `submitReq` catch (line ~153), status edit (lines ~164–165) and delete (lines ~174–175) assign text using `API.userErrorText` only once. If the language is toggled with one of these errors displayed, that previously rendered text remains in the old language. The `#list` load failure rendered at line ~186 also has no retranslation on toggle. This broader behavior was source verified, not device tested. Follow-up would retain raw error codes per visible error container and regenerate localized messages upon language change.

### Follow-up correction — requests server errors

The above limitation was subsequently fixed in `mobile-app/web/requests.html`, `docs/yuwaku/requests.html` and `docs/yuwaku/test/requests.html`. The exact raw error from submit, status-update, delete or initial list-fetch rejection is retained in `visibleRequestError` / `visibleListError`. `refreshRequestErrors()` generates localized text through the current `I18n.t` and `API.userErrorText`, including the existing empty-content error; the language callback invokes only this synchronous renderer. Success paths clear error state; status failure still rolls back local data, submission retry ID remains intact, and no extra API call is made on a language toggle. Unrecognized server messages are still subject to `API.userErrorText`'s own generic fallback policy; the original server code is preserved and no unverified English translation is promised.

Meaningful VM regression `node test/qa_v2_requests_dynamic_error_locale_test.mjs` **PASS for all three assets**: empty submit; rejected submit; failed status reply with rollback; failed delete reply; initial list-fetch failure; JA→EN→JA rerender; API call counter invariant on locale switch; successful submission and reload clear stale errors. Previous `test/qa_v2_lang_reserve_7_cases_regression_test.mjs` and legal toggle regression also PASS. These are source/runtime results only; updated native device QA remains pending. The stored mistranslation recurrence paths in KDS, receipts, ordering and printing have not been modified without direct failure evidence.
