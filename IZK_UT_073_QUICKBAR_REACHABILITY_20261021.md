# IZK-UT-073 継続 — 注文入力クイック操作列の狭幅クリップ解除（2026-10-21）

**状態:** LOCAL SOURCE FIXED / OFFLINE CHROMIUM 20/20 PASS / FORMAL PHYSICAL QA PENDING。
既存障害 `IZK-UT-073` の独立した共通CSS不備を是正。正式831件台帳・物理端末・デプロイには書き込まない。

## 根因と変更

既存 `test/izk_ut_073_shared_layout_audit_test.mjs` が、Native/Hosted PROD/TESTの `styles.css` にある
`@media (max-width:480px)` 内 `.quickbar{overflow-x:hidden}` を検出し FAIL。
`order-entry.html` のクイック操作は会員、クーポン、呼出、会計、状況、フィードバックの6ボタン。
狭い画面で全ボタンを `flex:1 1 0` に圧縮し、文字列を `text-overflow:ellipsis` にしたため
操作ラベルが読めなくなる。画面幅360 CSS pxで6個を1画面に収める前提が根本原因。

競合作業のない次の**既存共通CSSのみ**を変更:
`mobile-app/web/styles.css`,
`docs/yuwaku/styles.css`,
`docs/yuwaku/test/styles.css`。
最大480 CSS pxでクイック操作列自身を `overflow-x:auto` とし、
子ボタンは幅縮小しない `flex:0 0 auto`、操作領域は44×44 CSS px以上、
長い日英ラベルは省略しない方式に統一。
ページの文書幅・購入/決済処理・DOM順・イベント・API・共通ヘッダーには変更なし。
Hosted PROD/TESTには現時点で対応する注文入力HTMLはなく、CSS配布面の将来互換性のみを確認。

## 実行前・実行後

- 変更前: `node --test test/izk_ut_073_shared_layout_audit_test.mjs` **3/5 PASS, 2/5 FAIL, exit1**。
  FAILの一方は今回対象の3 CSSで `.quickbar overflow-x:hidden`、もう一方は以下8画面の別件rootクリップ。
- 変更後: 同監査 **4/5 PASS, 1/5 FAIL, exit1**。クイック操作専用assertはPASS。
  もう1 FAILを既知残件として維持し、全体をPASSと誤記しない。
- 新設 `node --test test/izk_ut_073_quickbar_reachability_20.test.mjs`:
  **20/20 PASS, exit0**、実Chromeヘッドレス実行、Native注文入力の実DOM断片と現行3 CSSを使用。
  ログ `test-results/izk-ut-073-quickbar-20-checks.log`、
  観測値・各CSS SHA256 `test-results/izk-ut-073-quickbar-20-checks.json`。
- 周辺3本 `izk_commission_360_browser_regression_test`、
  `izk_ut_094_header_toolbar_alignment_test`、
  `izk_ut_095_header_navigation_flicker_test`: **6/6 PASS, exit0**、
  `test-results/izk-ut-073-quickbar-related-regressions.log`。
- 変更したCSS3件に対する `git diff --check -- ...`: **exit0**。

## 自己再チェック（S01-S10、実行テストIDと証拠）

| ID | 実Chromeで検証した別観点 | 判定 |
|---|---|---|
| S01 | Native 360pxで実注文操作列のスクロール領域と本文の分離 | PASS |
| S02 | 操作ボタン6個がCSSによって非表示にならない | PASS |
| S03 | 6個の日本語ラベルが文字列として完全に存在 | PASS |
| S04 | 全ラベルの実描画幅が各ボタンの幅に収まる | PASS |
| S05 | 6個すべての操作矩形が44 CSS px以上 | PASS |
| S06 | 最後の操作まで行内スクロールで右端が表示可能 | PASS |
| S07 | 末端「フィードバック」を実クリックし1イベント発火 | PASS |
| S08 | 最後のボタンへキーボードfocus/Enterで1イベント発火 | PASS |
| S09 | スクロール末尾から先頭へ戻ってクーポンが操作可能 | PASS |
| S10 | 元のDOM順序・IDが6件とも保存 | PASS |

## 横展開10検証（H01-H10、別配布面・幅・言語・操作）

| ID | 実行内容 | 判定 |
|---|---|---|
| H01 | Hosted PROD CSS 360px、日本語、可視・スクロール・タッチ矩形 | PASS |
| H02 | Hosted TEST CSS 360px、英語ラベル全文 | PASS |
| H03 | Native 360px、英語、末端ボタンクリック | PASS |
| H04 | Hosted PROD 320px、日本語、先頭と末尾を独立クリック | PASS（保証外320も確認） |
| H05 | Native 390px、英語、文書全体の横溢れなし | PASS |
| H06 | Hosted PROD 430px、英語、480px breakpoint以下の操作領域 | PASS |
| H07 | Hosted TEST 480px、日本語、末端ボタン実クリック | PASS |
| H08 | Native 800px、日本語、デスクトップ既定40pxを維持しラベル全文 | PASS |
| H09 | Hosted TEST 360px、日本語、6ボタンすべて個別クリック | PASS |
| H10 | CSS3系統の対象ルール文字列完全一致とhidden指定消滅 | PASS |

全S/Hブラウザ実行は `document.documentElement.scrollWidth===clientWidth`、
列の `overflowX=auto`、対象サイズに応じた40px/44px操作寸法、
可視ラベルの `scrollWidth<=clientWidth` も共通で確認。
HTMLはNative実DOM断片、CSSは各配布面の現物をChromeに流し込んだ独立fixture。
Hostedに存在しない注文画面を「本番で動作確認済み」と記載しない。

## 残件と境界

1. 既存073監査の残FAIL: `mobile-app/web/index.html`, `manage.html`, `overview.html`, `profit_sim.html`,
   `docs/yuwaku/overview.html`, `profit_sim.html` および `docs/yuwaku/test/` 同2画面の
   `html/body overflow-x:hidden`。うち複数は別担当が編集している共有dirtyであり、今回のCSS修正範囲に含めない。
2. `QA2-UI-commission` の署名APK910019上 `scrollWidth=455>360` と戻るボタン見切れは
   `IZK-UT-078` の別の既知正式FAIL。commission静的ブラウザ幅360 PASSは
   認証済みNative実機の再試験の代用にはならない。
3. `IZK-UT-088/094/095` は過去のローカル修正があるが、新署名APK/iPhone、Hosted配布など正式再判定は未実施。
4. 本改修も署名APK/IPA構築、実機導入、Web配布、正式QAのclaim/result、Git commit/pushは未実施。
   全障害のローカル修正完了・正式QA完了とは判定しない。
