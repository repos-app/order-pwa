# IZK-UT-073 — 全ページ静的監査とKDS長文Flex局所修正（2026-10-15）

## 対象と実証の境界

`node scripts/izk-ut-073-page-coverage.mjs --write` が実際のHTMLを列挙し `docs/IZK_UT_073_PAGE_COVERAGE_20261015.json` を生成する。現在の列挙は Native 44、Web本番38、Web TEST38、公開ルート1、公開TEST2、公開production配下0、計123ファイル。これはHTMLの所在とCSS/DOMマーカーの棚卸しであり、動的ルーティング、埋め込みWebView、実描画画面数の保証ではない。JSON各ページに `dynamicRenderedWidth:UNKNOWN_SOURCE_ONLY`、`physical720px:NOT_TESTED` を明記。`STATIC_FLEX_NOWRAP_REVIEW_CANDIDATE` は要調査候補であり、不具合確定ではない。

## 根本原因と修正

KDSは `dispItemName(it)` による商品名と `seatLabel(o.table)` の席文字列をエスケープしてそのままFlexの子要素に入れる。3配布面の `.t-item .nm` はFlex項目のデフォルト `min-width:auto` のままで、非分割の長い商品名により数量 `×qty` を押し出す構造的リスクがあった。`.t-table` にも同様に席表示の最小内容幅が残っていた。

`mobile-app/web/kds.html`、`docs/yuwaku/kds.html`、`docs/yuwaku/test/kds.html` に、名前 `min-width:0;flex:1 1 auto;overflow-wrap:anywhere;word-break:break-word`、席名 `min-width:0;overflow-wrap:anywhere`、ヘッダー先頭の縮小許可を追加。数量やボタンを隠すマスク (`overflow-x:hidden`) は追加していない。生成するHTML文字列、状態遷移、API、注文/印刷は変更していない。

`test/izk_ut_073_kds_long_label_source_test.mjs` は3配布面の実際のCSSセレクタ、名前の動的結合、数量表示、全体の横方向隠蔽なしを検査しexit0。DOM測定および物理720px実機の表示・タップ試験は **PENDING**。

## 自己レビュー（S）

| 観点 | 証拠・結果 |
|---|---|
| S01 正本/制約 | IZK-UT-073 の720物理px最小保証をrunbookで確認。正式FAILの画像と配信版照合は PENDING |
| S02 因果 | KDS `.t-item`/`.nm` と `dispItemName` の接続・Flexデフォルト最小幅をソース確認 PASS。実機再現は PENDING |
| S03 長文字境界 | `anywhere` と `min-width:0` の静的存在を3面テストで確認 PASS。実文字幅は PENDING |
| S04 認証/store | API/token/権限コードに変更なしを差分確認 PASS。実際の権限網羅は対象外 |
| S05 成功失敗 | 注文ステータスイベント/通信コード非変更を差分確認 PASS。通信実行は対象外 |
| S06 データ不変 | 描画HTMLの `dispItemName` と数量式が従来通りであることをテストで確認 PASS |
| S07 UI/日英 | 名前/席表示のCSSルールを確認 PASS（source）。JA/ENと物理pxレンダリング PENDING |
| S08 例外・構文 | HTML構造とCSSブロック対応を確認 PASS。WebViewレンダリング PENDING |
| S09 回帰 | `node test/izk_ut_073_kds_long_label_source_test.mjs` exit0 PASS |
| S10 差分最小 | 3 KDSのCSSのみ編集、他の既存dirtyファイルに変更なし PASS |

## 横展開レビュー（H）

| 観点 | 証拠・結果 |
|---|---|
| H01 Native | `mobile-app/web/kds.html` セレクタと生成式確認 PASS |
| H02 Web本番 | `docs/yuwaku/kds.html` 同型構造・CSS確認 PASS |
| H03 Web TEST | `docs/yuwaku/test/kds.html` 同型構造・CSS確認 PASS |
| H04 商品名 | `dispItemName(it)` の動的データ接続と `esc` の温存確認 PASS |
| H05 席名 | `seatLabel(o.table)` への折返し適用確認 PASS |
| H06 数量 | `.qty` は従来の `white-space:nowrap` を保持することを確認 PASS |
| H07 アクション | `.t-act`、`.act-btn` の変更なしを差分確認 PASS。実タップ PENDING |
| H08 他画面 | manifestで120業務HTML（44+38+38）の静的構造・折返し/nowrap/動的DOMを列挙 PASS。動的欠陥判定 PENDING |
| H09 公開画面 | `docs/reserve.html` と公開TEST配下2ページをソース列挙 PASS。公開本番別階層全体の実導線 PENDING |
| H10 独立再照合 | `git diff --check` exit0、3面のテストexit0 PASS。全ページ720px/iOS/Android実描画 PENDING |

**未完了ゲート:** 修正版APK/IPA/PWAの実配信、Android/iOS物理720pxで長い連続文字・日本語・英語の表示、スクロール・数量・操作ボタンのタップ、正式QAの状態遷移。候補の残りページはmanifestから業務経路・CSS結合を個別確認すること。commit/push/deploy/QA記録更新は未実施。
