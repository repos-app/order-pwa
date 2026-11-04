# QA2-UI-commission 独立Chromium調査（2026-10-17）

**判定: SOURCE_LOCAL_OVERFLOW_NOT_REPRODUCED_ON_STATIC_PAGE / SIGNED_DEVICE_RETEST_PENDING。** 正式Android QA APK910019のFAILは不変。公式FAILはRealme 360 CSS pxで`document.scrollWidth=455`、戻る操作が欠ける事実。現行ソースと署名配布版は同一性をまだ証明していない。

## 現行実コードでのブラウザ測定

`node --test test/izk_commission_360_browser_regression_test.mjs` exit **0**、Chromium headless、360 CSS px / DPR2、モバイルtouch。現物`mobile-app/web/commission.html`と`styles.css`をブラウザに読み込み、認証処理によるログインリダイレクトを避けるためscript実行のみ除外してレイアウトを観測。幅は`documentElement.clientWidth=360`、`scrollWidth=360`、`body.scrollWidth=360`。タブ末端の座標right=407は`overflow:auto`の`.cm-tabs`内の水平スクロール項目であり、文書自体は伸びない。PNG: `test-results/izk-commission-current-360-css-20261017.png`。

**テストの計測限界:** 認証後`header.js`による共通操作挿入はこのHTML単体レンダリングでは動かしていないため、APK910019の**戻るボタン**の全身元・操作座標までPASSとは言えない。hidden pane内の`.cm-btn`は高さ0であり、タップ寸法を実表示確認済みと記してはいけない。現行HTMLの静的レンダリングでは根本未修正の実証ができないため、横幅に対する推測の修正は加えていない。Hosted PROD/TESTには`commission.html`自体が存在せず、Native固有の画面。

**同時に発見・局所是正した別の明確なUI違反:** `cm-tabs button`の可視4タブがChromiumで一律**41 CSS px**と測定され、44px操作対象の受入条件に届かなかった。厳格ブラウザ試験を追加した際に **before exit1（4要素すべて41px）** を実証し、既存dirty差分を維持してNativeの `commission.html` に `.cm-tabs button{min-height:44px;box-sizing:border-box}` の1行のみ追記。**after exit0（4要素すべて44px）** を実測した。これはタブのタップ寸法のローカル修正であり、910019の正式横はみ出し原因を修正済みと表現しない。対象タブはページ独自HTMLにしか存在せず、Hostedの同名ページもない。

## 実際に行ったコード・横展開の10観点ずつ

### Source S01–S10

1. S01 HTML viewport meta `width=device-width` / viewport 360 実ブラウザ確認。
2. S02 CSS bodyと`.cm-wrap`のmax-width・padding確認。
3. S03 documentElement/body双方のscrollWidthをChromiumで計測、どちらも360。
4. S04 対象外座標元素をDOM全探索し、タブ内部ボタンのみright407と確認。
5. S05 `.cm-tabs{overflow:auto}`でスクロール領域が隔離されることをCSSとDOMから確認。
6. S06 `.cm-grid`は640px未満で1列に切替、グリッド由来の固定横幅なし。
7. S07 `.cm-field` min-width0 と入力幅100%/max-width100%確認。
8. S08 `.cm-rowtop`の狭幅縦配置と `.cm-row` min-width0確認。
9. S09 `.cm-name/.cm-meta/.cm-badge`の局所クリップとタブスクロールの境界確認。
10. S10 ブラウザ専用テストのexit0と画像記録を確認。認証後共通ヘッダはPENDING。

### Horizontal H01–H10

1. H01 Native固有`mobile-app/web/commission.html`を確認。
2. H02 `docs/yuwaku/commission.html`不存在確認、Hosted PRODに同名HTMLなし。
3. H03 `docs/yuwaku/test/commission.html`不存在確認、Hosted TESTに同名HTMLなし。
4. H04 Native `manage.html`がCommission入口へリンクすることを確認。
5. H05 Native `commission-app.js`は別担当編集領域のため変更せず。
6. H06 078共通ヘッダの2行レイアウト・固定slotの既存資料と照合。
7. H07 共通ヘッダの独立toolbarスクロール契約を確認（認証後組込実測は未完）。
8. H08 横展開073でCommissionの長文・金額・badge改修済みを確認。
9. H09 720物理px/DPR2のCSS幅360で静的ページを観測、実機画面認定は保留。
10. H10 910019の455px公式FAILと現行静的幅360の差異を明示し、署名APK provenance + 認証後ヘッダ計測を次ゲートとした。

正式FAIL解除条件: 対象APKが現在のheader.jsとcommission.htmlを含むことをハッシュ/ビルド記録で証明し、実機Playwrightでヘッダ戻るボタン矩形、document scrollWidth、全4タブ、長文の局所スクロール、44 CSS pxの操作領域を検証して公式runner受理する。

### 44px局所修正に対する追加のS/Hレビュー

修正対象はタブのCSS宣言1行。**S01**: 元`.cm-tabs button`で高さ指定なし、実値41pxと確認。**S02**: beforeのChromium実測で4要素がすべて41px。**S03**: `min-height`で高さの下限だけ変更し幅計算には触れないことをCSSセレクタで確認。**S04**: `box-sizing:border-box`で内側paddingを含めて44pxとなることを実ブラウザ確認。**S05**: afterでは4要素のheightが44px。**S06**: 前後とも根文書幅360を維持。**S07**: 横スクロール項目のright407は局所tabs内のみ。**S08**: 自動ログインしないDOM静的試験として業務APIにアクセスしない。**S09**: hidden保存ボタンの高さ0を「タッチFAIL」と誤判定しない可視要素抽出。**S10**: 同一回帰 before exit1 / after exit0 と `git diff --check` exit0で差分を確認。

**H01**: Native管理画面入口`manage.html`は同じCommission画面を開く。**H02**: ほかのグローバル`.cm-btn`は既存44pxを維持。**H03**: 4個のtabボタンすべてに等しく適用。**H04**: `.cm-tabs button.on`の色/active表示指定には干渉しない。**H05**: `.cm-tabs{overflow:auto}`のスクロールを保持。**H06**: `.cm-grid`のレスポンシブ分岐を変更しない。**H07**: `.cm-row`など073既存の折返し改修を変更しない。**H08**: 共通header.jsの戻る操作ソースは変更対象外。**H09**: PROD配布面に同名Commission HTMLが存在しないため該当コピーへの改修不要。**H10**: TEST配布面も同名HTMLが不存在であり、Native限定配布と未署名を明記。

上記はソース/静的レンダリングの独立観点であり、実タップの指の追従性、認証済みアプリ共通ヘッダ、実機QAは未検証。
