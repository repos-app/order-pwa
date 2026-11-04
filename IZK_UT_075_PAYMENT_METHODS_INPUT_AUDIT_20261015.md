# IZK-UT-075 payment-method labels and instructions: local audit

2026-10-15. Scope `src/paymentMethods.js`, Native `mobile-app/web/settings.html`, Web production `docs/yuwaku/settings.html`, Web TEST `docs/yuwaku/test/settings.html`. No commit, deployment, production DB, official QA or printer changes.

## Result

Existing UI policy defines maximum **40 UTF-16 characters** for JA/EN payment screen and receipt labels and **240** for card/QR instructions. Each field had `maxlength`, which silently prevents overlength typing/pasting, and save previously sent values without an explicit length check. Added shared-pattern local helpers on all three independent distributions: `paste`/noncomposing `beforeinput` refuse attempted overlength insertion with localized status and retain the original text; saving checks the actual current value so scripted/input restoration excess cannot silently pass. Selection replacement is accounted for. Native/Web/TEST previously dirty unrelated settings edits are preserved.

`src/paymentMethods.js` is a **read-time renderer** and has no settings mutation. Its `cleanLabel` 40 and `instructionPair` 240 trims legacy persisted values for display, while retaining cash/card/gcash canonical codes and multilingual fallbacks. Changing this to throw for historical data would break checkout/receipts; intentionally unchanged. Generic `saveSettings` is shared by other domains and has no payment-specific server policy. Direct API may still persist overly long labels; a server reject would require adding a payment-key-specific validator in the central settings-write path, with migration/historical value tests and agreement from that shared module's owner. This is **PENDING SERVER BOUNDARY**; no speculative central implementation.

## Executed

`node test/izk_ut_075_payment_methods_limit_test.mjs` — PASS, validates actual three UI surfaces, boundary input handlers, strict save checks, 40/240 legacy display compatibility and unchanged code mapping. Source-only tests; no physical IME evidence. `git diff --check` targeted to three UI pages exit 0 (CRLF warnings only).

## Self-review (10 independent aspects)

| ID | Evidence / status |
|---|---|
| S01 | 40 label max derived from existing field markup and renderer: PASS source |
| S02 | 240 card instruction max derived from markup and renderer: PASS source |
| S03 | 240 QR instruction max same policy: PASS source |
| S04 | Paste overlength explicitly refused before insertion: PASS VM |
| S05 | beforeinput overlength explicit refusal: PASS VM |
| S06 | Selection replacement delta included: PASS source; real IME PENDING |
| S07 | Input composing branch bypasses beforeinput, save checks length: PASS source; IME PENDING |
| S08 | Save validation precedes settings RPC: PASS source |
| S09 | Legacy renderer caps existing overlength values, codes unchanged: PASS module test |
| S10 | Live direct server settings write refuses long value: PENDING, shared writer policy missing |

## Horizontal-review (10 independent aspects)

| ID | Evidence / status |
|---|---|
| H01 | Native 16 localized input IDs+maxlength and handler: PASS VM |
| H02 | Web production 16 input IDs+maxlength and handler: PASS VM |
| H03 | Web TEST 16 input IDs+maxlength and handler: PASS VM |
| H04 | Cash screen/receipt JA/EN both checked: PASS VM/source |
| H05 | Card screen/receipt JA/EN both checked: PASS VM/source |
| H06 | QR screen/receipt JA/EN both checked: PASS VM/source |
| H07 | Card/QR bilingual instructions checked: PASS VM/source |
| H08 | display/receipt legacy fallback and cash/card/gcash codes: PASS module test |
| H09 | Shared generic settings writer, tenant scope, server-side policy: PENDING targeted source change with owner |
| H10 | Native real keyboard, composition and live historical receipts: PENDING physical QA |

No official QA case count changed. The printer remediation is separately owned and untouched.

## 2026-10-15 追加修正：直接APIのサーバー境界・無言HTML制限

最終レビューで、3画面の16個の決済名称/案内欄に残るHTML maxlengthは貼付けやIMEを無言で切り詰めるため撤去（ブラウザーの文字列を保持したまま既存paste/beforeinputとsave直前で明示エラー）。加えて共通サーバー書込み src/admin.js::saveSettings に src/paymentMethods.js::validatePaymentSettingsPatch を追加し、現行の名称40文字・決済案内240文字を超える値を**認証済み管理者であってもDB読書き前に拒否**。共通決済コード(cash/card/gcash)・既存の長い永続化値は読み取り時の表示切詰めだけ保持、過去の会計・領収書の互換性は変更しない。

- node --test test/izk_ut_075_payment_settings_direct_api_test.mjs: **3/3 PASS**。旧互換keyと日英key合わせた24経路の超過を、DB呼出0のsaveSettings直接APIで拒否。正確な40/240字は受理。非管理者は従来どおりforbidden優先。
- node test/izk_ut_075_payment_methods_limit_test.mjs: **PASS**。16欄×Native/Web本番/TESTの新no-maxlength markup、選択範囲/貼付け/プログラム入力の明示拒否、以前の長い設定値の表示互換。
- 追加後のS10/H09：**PASSローカルサーバー直接試験**。H10実機IME、実D1での旧設定値を使う会計/レシート受入は**PENDING**のまま。旧上段のPENDINGは是正前の履歴記録であり、本追記を最新判定とする。
