# izakanpai｜Android正式QA 残FAIL30件 修正・横展開の結果（2026-10-13）

## 合否基準と前提

- 本バッチは**正式Android QA の残FAIL30ケース**をすべて照合し、ローカルソース対策・新規回帰・重複/保証対象外の切分けを行った。既存の未コミット変更を保護し、`commit` / `push` / `deploy` / 本番DB変更は行っていない。
- 動作保証端末の最小物理画面幅は **720px**。**600 physical pixel** へ一時変更したときだけ再現した旧FAILは、実機720pxの故障と同一視しない。
- **コード上の対策/回帰PASS ≠ Android正式QA PASS**。最新APKを組み込んだ実機で再確認されるまでは、公式 `.qa-v2-official/android/state.json` の旧`FAIL`を変更しない。
- 自己10・横展開10のレビューは実際の項目ごとに証跡化。ソースチェックや横展開存在確認だけで通過したものと、物理/描画検証未実施を分けて記す。**全30件で端末検証込み10/10×10/10が完了したとは主張しない**。

## 30件の個別判定

| # | QAケース | コード上の対策／現状 | 実機最終判定 |
|---:|---|---|---|
| 1 | QA2-NEW-OS-002 | 旧QA概要では回転・Android Back復帰は実機PASSで、NG実体はログインIME被覆。既存IZK-UT-070/前バッチの`adjustResize`＋フォームスクロール対策に合流 | 新APKで再確認 |
| 2 | QA2-NEW-VIS-001 | 共通ヘッダーを狭いCSS幅で2行目へ折返し、タイトル全文と操作ボタンを並存させる | 720px再確認 |
| 3 | QA2-KEEP-OPR-ATT-011 | システム/管理者の`canPunch=true`古い応答でもUIを開かせない。役割＋本人UID＋serverフラグの3層、Native/Web/TEST | 720px再確認 |
| 4 | QA2-KEEP-PT-LANG-X-012 | Commissionの大型ラーメン `Ramen (greatly)` を日本語サイズ情報に限って `Ramen (large)` 表示へ補正。その他保存済み英訳はデータ修正していない | 新APK再確認 |
| 5 | QA2-KEEP-PT-LANG-X-015 | AI usageの日本語表示値をAPI回答でキャッシュして、言語切替時に再描画 | 新APK再確認 |
| 6 | QA2-UI-birthdays | 共通タイトルとテーブル横スクロール/列視認の対策 | 720px再確認 |
| 7 | QA2-UI-coupons | 共通ヘッダータイトル省略の根本CSSを修正 | 720px EN再確認 |
| 8 | QA2-UI-data_admin | 共通ヘッダータイトル省略の根本CSSを修正 | 720px再確認 |
| 9 | QA2-UI-expenses | 問題が記録された日付末尾/英語タイトル見切れは600px限定。共通ヘッダーの改善は適用 | 720pxで独立確認 |
| 10 | QA2-UI-inventory | 共通タイトルに加えページ固有のHistory操作ボタン競合をCSS修正 | 720px再確認 |
| 11 | QA2-UI-kds | 厨房タイトル・印刷・ベル操作が重なる狭幅ヘッダーを共通レイアウト改善 | 720px再確認 |
| 12 | QA2-UI-members | 英語 `Members` タイトル省略の共通CSS改善 | 720px EN再確認 |
| 13 | QA2-UI-moves | タイトル・Inventory戻るボタン縦折返しをページCSS修正 | 720px再確認 |
| 14 | QA2-UI-order-entry | Seat modal右見切れの旧再現は600px限定。720px注文入力のタイトル問題はNEW-VIS-001で修正候補 | 720pxで独立確認 |
| 15 | QA2-UI-printers | タイトルとアカウント欄の重なりを共通CSS改善 | 720px再確認 |
| 16 | QA2-UI-privacy | `legal.js`で本文のJA/EN記事表示を切替時に直接再同期 | 新APKで再確認 |
| 17 | QA2-UI-profit | `Monthly Gross Profit`の全文が見えるよう共通ヘッダーを折返し。600pxだけの金額折返しは保証外 | 720px再確認 |
| 18 | QA2-UI-profit_sim | 長い日英タイトルを共通ヘッダーで折返し | 720px再確認 |
| 19 | QA2-UI-receipts | 長いレシート/返金ID・項目・操作ボタンの見切れをページCSS修正 | 720px再確認 |
| 20 | QA2-UI-recipe | 長いレシピ名・原価名と原材料見出しの見切れをページCSS修正 | 720px再確認 |
| 21 | QA2-UI-requests | `needContent`に加え送信・状態更新・削除・一覧読込のサーバーエラーを元エラー情報からJA/EN切替時に再翻訳。成功後は旧エラー消去 | 新APK再確認 |
| 22 | QA2-UI-reservations | 予約名・フォームURL・表スクロール、および英語タイトルの見切れをCSS修正 | 720px再確認 |
| 23 | QA2-UI-reserve | 現在表示中の予約フォームエラーコードを保存し言語切替時に再描画 | 新APK再確認 |
| 24 | QA2-UI-sales | 正常720pxでSalesタイトルは表示され、600px一時縮小時だけタイトル省略。共通CSSは保険で改善 | 720pxで独立確認 |
| 25 | QA2-UI-terms | `legal.js`で記事表示とボタン文言を一括同期 | 新APKで再確認 |
| 26 | QA2-UI-todo | タイトルと担当者セレクトの切れを共通＋画面CSS修正 | 720px再確認 |
| 27 | QA2-UI-users | ユーザー管理タイトル・アカウント欄の重なりを共通CSS修正 | 720px再確認 |
| 28 | QA2-UI-audit | 長い `Audit log` タイトルと第三列を確認できる表表示にCSS修正 | 720px再確認 |
| 29 | QA2-FLOW-A-001 | 管理Hubの旧オフラインバナーを確認し、注文管理へ断線時の即時警告、read非実行、復旧後の強制再取得を実装 | 断線実機再確認 |
| 30 | QA2-FLOW-C-002 | 予約人数1〜100の整数・備考200文字制限をNative/Webフォーム**とサーバー`src/crm.js`**で二重検証 | 新APK/ステージング再確認 |

## 実施したレビュー・横展開・回帰

1. **20画面の共通ヘッダー/レイアウト**: `docs/QA_V2_UI_HEADER_20_CASES_REMEDIATION_20261013.md`、各ケース10 self/10 horizontalの実施状態・未実施状態を個別に記録した `docs/QA_V2_UI_20_CASE_REVIEW_MATRIX_20261013.md`。チェックはソースと配布面の検証で、レンダリング合格を意味しない。
2. **7件の言語・予約入力**: `docs/QA_V2_LANG_RESERVE_7_CASES_REMEDIATION_20261013.md`。10個のself-reviewと10個のhorizontal-reviewの対象、各ケースでの適用/非適用を整理。5つの予約入口とバックエンド負数・小数・過大値検証を実行。
3. **勤怠・オフライン・OS操作**: `docs/QA_V2_ATTENDANCE_OFFLINE_REVIEW_20261013.md`。10 self / 10 horizontalをケース別に記録。管理者の古い`canPunch`を強制trueにしたネガティブVM、通信オフラインを保ちながら既存注文を保持する実コードVMを実行。
4. **前バッチの別11件と従来障害**: `docs/QA_V2_UNFIXED_P0_P1_REMEDIATION_20261013.md`、`handoff/GPT_実機テスト障害台帳.md`。同一原因を二重でissue追加しない。

### 回帰テスト（専用）

- `test/qa2_keep_opr_att_011_ui_role_guard_test.mjs`：82 checks PASS。
- `test/qa2_flow_a_001_offline_visibility_regression_test.mjs`：31 checks PASS。
- `test/qa2_ui_header_720_regression_test.mjs`：4 Node tests PASS。
- `test/qa2_ui_supported_width_details_test.mjs`：8 Node tests PASS。
- `test/qa2_ui_20_case_review_matrix.mjs`：21 Node tests PASS（**ローカル公式QA入力の監査用。npm testには入れない**）。
- `test/qa_v2_lang_reserve_7_cases_regression_test.mjs`：予約5入口・バックエンド8不正入力・AI利用量3入口・依頼3入口・法律本文2入口・Commission表示の実VM PASS。
- `test/legal_article_language_toggle_regression_test.mjs`：JA/EN/JA記事切替PASS。
- `test/qa_v2_requests_dynamic_error_locale_test.mjs`：Native/Web production/Web TESTの申入れエラー表示を、失敗レスポンス保持・JA→EN→JA・API再呼出しなし・旧エラー消去まで実VM PASS。
- 既存の `test/backend_auth_attendance_401_regression_test.mjs`：23 checks PASS。
- Web/PWAキャッシュは旧資産再利用防止で **`v280`**、共通Headerは `auth15` へ更新。commit/deploy前のローカル変更のみ。

### 最終統合テストと配布アセット検証（2026-10-13）

- `npm test`：**exit 0**、証跡 `test-results/qa-v2-remaining30-npm-test-final-20261013.log`。
- `npm run mobile:sync`：**exit 0**、証跡 `test-results/qa-v2-remaining30-mobile-sync-20261013.log`。
- `npm run verify:distribution`：**exit 0**、証跡 `test-results/qa-v2-remaining30-distribution-20261013.log`。
- `git diff --check`：**exit 0**。
- Native `mobile-app/web/index.html` / `manage.html`：byte一致。Web production/TESTの Clock・Requests・header・Orders・Settings：各byte一致。
- 正式Android状態：PASS251/FAIL41/NOT_RUN539、iOS：PASS12/BLOCKED2/NOT_RUN817。**いずれも未更新**。
- 30件のケースIDとこの表を照合し、30/30・重複0・欠落0。`test/qa_v2_remaining30_coverage_test.mjs`：32テストPASS。
- 全体テストで一度検知された旧い期待文字列は、新しい予約エラーkey・申入れ再翻訳・本人打刻の役割/UID追加に合わせた意味的な回帰検査に更新。修正後、関連 `frontend_offline_audit` 241、`runtime_dynamic_i18n` 106、`native_auth` 107、`mobile_navigation` 191、各PASS。ソース挙動を弱めず新仕様の合格条件へ更新した。

## 最終合格には未到達

- 実機APK作成・インストール、iOSビルド、720px物理Realmeの画面寸法/タップ・オフライン実測、公開フォームの本番受入は**未実施**。QA公式stateと既存FAIL証拠を維持。
- 600px物理だけの再現は動作保証対象外（QA2-UI-order-entry、QA2-UI-sales、QA2-UI-expensesの該当現象）。
- 画面外に表示される保存済み不正英訳データ（他のKDS/レシート/プリンタ等）を実際に確認した証跡はないため、DBの英訳レコードを勝手に上書きせず保留。ユーザー向け問題の波及リスクは言語レビューに記録した。
- 以上は「30ケースのソース調査と修正候補」報告であり、**30件全部の正式QA PASS/全て20回の実機反復完了報告ではない**。

## 2026-10-13 追加ソース再監査：残る横展開漏れの是正（LOCAL）

- 初回30ケース対応後に発見した8画面（`audit` / `birthdays` / `reservations` / `todo` / `receipts` / `inventory` / `moves` / `recipe`）の**Native専用430 CSS px対応CSSを、Web productionとWeb TESTの計16画面へ追加**。既存のWebコードや環境別URLは保護。正本：`docs/QA_V2_8PAGE_WEB_HORIZONTAL_FIX_20261013.md`。8/8のNative/Web/TESTソース仕様照合テストPASS、WebとTESTの8画面byte一致。静的・コードレビューできる横展開観点と、実機でないと検証できないH08–H10を分離。
- 誤英訳 `Ramen (greatly)` をCommissionだけでなく、**注文履歴／KDS／レシート／印刷の実際の表示経路に限定補正**。保存済み日本語商品名に「大/大盛/大盛り」がある場合の不正な英語末尾だけを`(large)`へ変換。さらに新しい商品登録でAI翻訳の結果が`nameEn`へ保存される**`src/translation.js::completeLocalizedPair`でも保存前補正**し、以後の同型誤訳の再保存を防ぐ。手入力英訳・通常サイズ・過去のDB・履歴レシートは変更しない。正本：`docs/QA_V2_LEGACY_LARGE_NAME_ROOT_FIX_20261013.md`。
- Web/PWAキャッシュを**`v281`**へ更新（旧`v280`は前バッチの履歴）。これはローカル変更であり、**本番Webのデプロイは未実施**。
- 修正担当者向けの新しい共通正本 `handoff/IZAKANPAI_SOURCE_FIX_MASTER_RUNBOOK.md` を作成し、`AGENTS.md`および正式QAマスターからリンク。障害採番、10巡自己レビュー＋10巡横展開レビュー、版/承認管理の基準を明文化。親の`handoff/`はGit除外のため、**このマスターMDに限ってGit管理可能な除外例外**を`.gitignore`へ設定（コミットは未実施）。
- 最終検証: `npm test` **exit0**（`test-results/izk-master-source-fix-npm-test-20261013c.log`）、`npm run mobile:sync` **exit0**、`npm run verify:distribution` **exit0**、`git diff --check` **exit0**。専用 `node test/qa_v2_8page_web_css_parity_test.mjs` 8/8、`node test/legacy-large-name-runtime.test.cjs` 全実VM、`node test/izk_source_fix_master_runbook_test.mjs` 4/4もPASS。
- **正式QA結果は保全**: Android PASS251/FAIL41/NOT_RUN539、iOS PASS12/BLOCKED2/NOT_RUN817（確認時点）。今回の修正版APK/iOS/TestFlight導入・720px実機レイアウト・KDS実紙・Worker本番/D1は未確認。ソースレベルの追加で証明できた修正漏れは対策したが、**実機検証や将来の未発見コード欠陥まで「0件」とは宣言しない**。
- **commit / push / deploy / 本番DB操作 / QA正式結果の書換えなし**。
