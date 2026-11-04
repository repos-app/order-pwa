# izakanpai UI現行ソース検証・日英ヘッダー題名（2026-10-21）

状態: LOCAL SOURCE FIXED / OFFLINE BROWSER VERIFIED / SIGNED DEVICE QA PENDING.
既存の障害番号を流用・改変せず、正式QA台帳は変更していない。

## 1. IZK-UT-073 root overflow 8画面

作業開始時点で8 HTMLとも別担当の未コミット差分によりroot overflow-x:hiddenがautoへ変更済み。これらのHTMLは当担当では編集していない。

| 対象 | 現行変更 | 併存していたdirty差分 |
|---|---|---|
| mobile-app/web/index.html | html/body hidden→auto | store_not_foundログインエラー処理 |
| mobile-app/web/manage.html | html/body hidden→auto | 同等ログインエラー処理 |
| mobile-app/web/overview.html | html/body hidden→auto | root指定 |
| mobile-app/web/profit_sim.html | body hidden→html/body auto | getSettings epochとpagehide/pageshow回復 |
| docs/yuwaku/overview.html | html/body hidden→auto | root指定 |
| docs/yuwaku/profit_sim.html | body hidden→html/body auto | root指定 |
| docs/yuwaku/test/overview.html | html/body hidden→auto | root指定 |
| docs/yuwaku/test/profit_sim.html | body hidden→html/body auto | root指定 |

既存 test/izk_ut_073_shared_layout_audit_test.mjs は5/5 PASS exit0。新規 test/izk_ut_073_root_eight_browser_20.test.mjs は20/20 PASS exit0。S01-S08は8各画面の現物CSSとheader初期表示を360CSS px実Chromeで独立確認、S09-S10はNative index/manageのhubを確認。H01-H08は8画面を別幅（360/390/430/480/800）で920px非改行値を注入し局所スクロール到達、H09はデスクトップoverview header、H10はTEST profit_sim本文を確認。証拠 test-results/izk-ut-073-root-eight-20-checks.log と同名jsonに現実行の結果・各ソースSHA256。

## 2. 旧APK FAIL と現行ソースの区別

| QAケース・旧署名APK | CURRENT LOCAL の実行観測 |
|---|---|
| QA2-UI-commission / 910019: Back画面外、scrollWidth455対360 | 現行HTMLと認証済み実header.jsをChrome360/390/480/800で結合。Back x309–353（360幅）、visible/enable、文書scrollWidth360。4/4 PASS。旧APKとのソース版一致は未証明 |
| QA2-UI-reserve / 910017: 既表示エラーがENのまま | 実予約HTML/JSとローカルAPI rate_limitedで可視共通言語ボタンEN→JA→EN、余計な予約送信0。無効人数の既表示エラーもEN→JA。2/2 PASS |
| QA2-UI-privacy / 910017: 本文の言語不一致 | 現行legal.jsと実ブラウザで全文記事EN→JA→EN、URL・lang整合PASS |
| QA2-UI-terms / 910017: 本文の言語不一致 | 同上、PASS |

現物ブラウザ test/qa2_ui_old_apk_current_source_browser.test.mjs 8/8 PASS exit0。証拠 test-results/qa2-ui-old-apk-current-source-browser.log/.json。旧署名APKの正式FAILを変更・解除していない。

## 3. 今回実際に再現した別の現行欠陥

旧法定ヘッダーh1には日本語・英語2つのspanがあり、共通header.jsのrenderTitleがh1.textContentをコピーするためCSS非表示の言語も連結される。
修正前 test-results/qa2-ui-legal-header-title-red.log でPrivacy「プライバシーポリシーPrivacy Policy」、Terms「利用規約Terms of Service」: 6/8 PASS、2/8 FAIL exit1を再現。

変更は共通関数だけで、以下3ファイルに同じ最小修正を実装。
- mobile-app/web/header.js
- docs/yuwaku/header.js
- docs/yuwaku/test/header.js

visibleHeadingTextは元のh1以下を辿り、子要素自身に付くdisplay:none、hidden、aria-hidden=trueを除外する。元の旧ヘッダーコンテナ自体は共通移設後display:noneとなるため、これを理由に内容を全て捨てない。元の非表示見出しに単純innerTextを使うと両言語が返る場合もあるため使用しない。全て空欄・空白の場合はtrim後にdocument.titleへフォールバック。既存MutationObserver・言語通知・認証・業務APIは維持。

## 4. 10回の再チェック S01–S10（実Chrome独立実行）

| ID | 対象 | 結果 |
|---|---|---|
| S01 | Native Privacy EN初期値、aria/tooltip | PASS |
| S02 | Native Privacy JA初期値、aria/tooltip | PASS |
| S03 | Native Terms EN初期値、aria/tooltip | PASS |
| S04 | Native Terms JA初期値、aria/tooltip | PASS |
| S05 | Native Privacy EN→JA、隠れたEN混入なし | PASS |
| S06 | Native Privacy JA→EN、隠れたJA混入なし | PASS |
| S07 | Native Terms EN→JA、390px | PASS |
| S08 | Native Terms JA→EN、390px | PASS |
| S09 | Native Privacy可視見出しテキスト更新がObserverで追従 | PASS |
| S10 | Native Terms MutationObserver更新・有限回収束 | PASS |

## 5. 10回の横展開 H01–H10（Native/Web PROD/TEST）

Hostedには同構造の法定2画面がなく、実際のHosted header.jsとローカルのbilingual h1/CSS fixtureをChromeで確認。Hosted法定ページの実本番操作と混同しない。

| ID | 独立条件 | 結果 |
|---|---|---|
| H01 | Hosted PROD Privacy EN 360px | PASS |
| H02 | Hosted PROD Privacy JA 360px | PASS |
| H03 | Hosted TEST Terms EN 360px | PASS |
| H04 | Hosted TEST Terms JA 360px | PASS |
| H05 | Hosted PROD Privacy EN→JA 390px | PASS |
| H06 | Hosted TEST Privacy JA→EN 430px | PASS |
| H07 | Hosted PROD Terms EN往復 480px | PASS |
| H08 | Hosted TEST Terms JA往復 800px | PASS |
| H09 | Hosted PROD全題名空欄時にdocument.titleへfallback | PASS |
| H10 | Hosted TEST Privacy EN往復 320px（保証外も検査） | PASS |

test/izk_ut_096_bilingual_header_20_chromium.test.mjs: 20/20 PASS exit0。証拠 test-results/izk-ut-096-bilingual-header-20.log/.json。全て実Chrome別contextに現物JSを読み、表示テキスト・aria・tooltip・CSS非表示・文書横溢れを評価。関連 test-results/izk-ui-20261021-final-related.log は31/31 PASS exit0。共有3 JS構文checkとscoped git diff --check exit0。

## 6. 未完了

修正はLOCAL SOURCE FIXED。Android910017/910019の元正式FAILと実機証拠は保全。新APK/IPAへの同梱と署名SHA、実機Chrome WebView/WKWebView・Backタップ・法定文章日英、Hosted公開反映、正式QA Runner claim/判定記録は未実施。ADB、deploy、push、commit、公式QA台帳操作、本番書込みなし。
