# Menu Editor JA/EN runtime translation regression — 2026-11-06

## Observed issue

An iOS screenshot in English mode still showed Japanese UI strings in
the AI PDF/photo import card: credit balance, file input chooser,
AI analysis start button and PDF staging progress. The card title,
description and menu list were already in English, resulting in a
mixed-language screen.

## Root cause and old-test gap

- The editor's static language spans followed the shared html lang
  state; AI credits and status were imperative textContent assignments.
  Changing language did not replay already-rendered status/credit text.
- Some AI buttons were permanently bilingual and native file inputs
  displayed an OS-provided Japanese chooser label regardless of app
  locale.
- The earlier AI Workflow browser fixture stubbed I18n.lang() to
  always return ja. The Workflow smoke tests did not exercise EN,
  language changes during an in-progress upload, or visual text parity.
- Earlier AI Workflow browser tests were not included in the standard
  test/project-test-commands.json full project test manifest.

## Corrections

- The AI card file selector is now a localized, accessible label
  controlling the unchanged native file input. File content and
  upload/security validation remain unchanged; only the user-facing
  selection label is under app locale control.
- AI action labels and duplicate-dialog controls use existing JA/EN
  CSS spans rather than two-language text in one button.
- The I18n callback calls refreshMenuAiLanguage, re-rendering cached
  wallet and current Workflow progress without a network request or
  mutation. The current upload, success and failure status keep paired
  translations, so switching languages does not restart any Workflow.
- The editor's landscape-time dialog also follows I18n.lang().
- The native PWA cache version is bumped to v332.
- New browser QA uses the **real** i18n.js implementation (no
  hardcoded Japanese mock) and tests initial EN entire editor,
  file chooser, JA/EN during PDF upload, completed and failed
  Workflow messages, and language switch without additional AI calls.
  The new suite and both existing AI Workflow browser suites are
  registered in the npm test manifest, enforced by its contract gate.

## Verification boundary

Run:

  node --test test/menu_editor_ai_language_browser_test.mjs
  node --test test/menu_ai_import_browser_test.mjs test/menu_ai_unsent_resume_browser_test.mjs
  node test/izk_project_test_pipeline_contract_test.mjs
  node test/izk_all_screen_syntax_navigation_audit_test.mjs

The 126-page source audit and existing system/localization regressions
provide wider safety coverage but **do not** prove complete live
localization of every state on every device. The iPhone uses bundled
Capacitor assets; a new signed native build and iPhone screen check
are still necessary. Source/browser checks are not formal physical QA.
