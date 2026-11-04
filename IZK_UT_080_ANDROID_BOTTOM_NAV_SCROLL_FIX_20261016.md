# IZK-UT-080 — Android管理メニューが下部固定ナビに隠れ、縦にスクロールできない

**日付** 2026-10-16 / **優先度** P1 High / **状態** WAIT_TEST（ローカル修正済み、正式実機未検証）

## 受付と原因の切り分け

- ユーザー提供画像：Androidの「売上」管理ホームで最終段のカードが下部の共通5メニューに重なり、スワイプしても下へスクロールできない。**iPhoneは正常**との報告。スクリーンショットだけでは正確なAPK版・WebView版・タッチ入力ログは得られないため、旧Android本体の原因を断定しない。
- `mobile-app/web/index.html` と `manage.html` は完全一致。`html,body`の双方に`overflow-y:auto;overscroll-behavior:none`があり、`#hubView`のタイル末端は文書ルートのスクロールに依存した一方、`#mtabs`は常時`position:fixed;bottom:0`。Android WebViewでタッチのスクロール所有者が一意にならない構造があり、本文最終行と固定ナビの干渉を起こし得る。iPhoneを変更しないことが必須。
- 直前のIZK-UT-078は上部2段ヘッダ、079はNative画面倍率1倍の改修。本件は**下部固定ナビ＋管理画面のスクロール**という独立事象。既存の旧正式QA記録と混同しない。

## 実装修正と版範囲

- `mobile-app/web/config.js`: Native `Capacitor.getPlatform()==='android'` のときだけ`html.iz-android-native`を付与。Safari/PWA、iOS、Androidブラウザには非適用。既存Native Service Worker対策・画面倍率対策を保持。
- `mobile-app/web/index.html`, `mobile-app/web/manage.html`: Androidかつ表示中の`#hubView`に、共通ヘッダスペーサの実測上端から算出した`100dvh`残領域を与え、`overflow-y:auto`で**管理ホーム本体自身を唯一の意図した縦スクロール先**にする。画面固定の`#mtabs`は動かさず、`ResizeObserver`/再描画で測定した実ナビ高さ＋18pxを末端余白へ追加。
- `syncAndroidHubViewport()` がログイン完了・メニュー描画時に表示中の`#hubView`のtopを実測しCSS変数に反映。ナビ再描画／向き変更／resizeで再同期。二次タブ選択/再ログインのスクロール復帰処理は、文書ルートに加えて新Androidハブスクロール要素の`scrollTop=0`も実行。
- 業務タイル・権限/プラン・店舗/会計/印刷/API/DB/セッションロジックには変更なし。iOSのスクロール配置とWeb本番/TESTの管理画面は変更なし。
- 編集対象の修正後SHA-256（未commit）：`index.html` / `manage.html`（完全一致） = `A5FB574B9B52428990AFA4B3D80995600630C54A3F8167EC31D29582EDDA86EF`。`config.js` = `646ED720F95DC8D09B092CFCF90FE3097542CE327AEA5CCF357D56AB3DA02978`。既存他修正を含む全ファイルSHAであり、本障害のパッチ単独SHAではない。

## 自己レビュー S01-S10（同一チェックの反復ではなく独立した検査入口）

| 観点 | 手段／確認結果 |
|---|---|
| S01 | 写真にある「売上」タブの固定ナビとタイル一覧のDOMを`#mtabs`/`#tiles`から逆追跡。本文は`#hubView`下、固定navはその子であることをコード確認。PASS source |
| S02 | 旧`html,body{overflow-y:auto}`と`overscroll-behavior:none`、`#mtabs{position:fixed}`、`#hubView`既存余白の組合せをCSS監査。旧構造でスクロール先を限定しない危険を発見。PASS cause hypothesis |
| S03 | Android専用クラスを`Capacitor.getPlatform()`の実関数を使ったVMで検査し、Androidのみ付与。iOS/Webは付与されない。PASS |
| S04 | Native管理入口2ファイルの完全バイト一致をテスト。片側実装漏れ0。PASS |
| S05 | Android 360 CSS px x 780（Realme代表）の実Chromiumで`#hubView`が単独`overflow-y:auto`となりスクロール内容が画面高を超えることを測定。PASS |
| S06 | 実Chrome/CDP`Input.dispatchTouchEvent`連続6 moveのスワイプで`hubView.scrollTop>25`を測定。**初期の`synthesizeScrollGesture`模擬では0で、実タッチイベント方式へ切替**。PASS touch fixture |
| S07 | 28枚の疑似カードの最終タイルを最下端までスクロールしたとき、固定ナビ上端より10px以上上に収まることを実矩形で検証。PASS |
| S08 | 共通操作`scrollHubTop`と`normalizeViewportAfterAuth`の両方が新スクロール要素のscrollTopを戻すことを差分・実DOMで確認。PASS |
| S09 | ナビpaddingを人工的に増やして`watchAppNavHeight`を再実行し、実高さから再計算した余白でも最後のカードが被らないことを検証。PASS |
| S10 | 専用`node --test test/izk_ut_080_android_hub_scroll_regression_test.mjs` **4/4 PASS(exit0)**、関連レイアウト・共通ヘッダテストもPASS、`git diff --check` exit0を確認。Android端末は別途PENDING |

## 横展開レビュー H01-H10

| 観点 | 異なる面／経路・検査結果 |
|---|---|
| H01 | `index.html`起点の初回ログイン→`showHub`→`renderHub`→スクロール高さ計算・戻り処理を通読。PASS source/Chromium |
| H02 | `manage.html`起点の同型独立入口を同じテストフィクスチャーで実実行。PASS |
| H03 | Android幅360 CSS pxでtouchActionが先行079の`manipulation`の時も縦スワイプできることを検証。PASS |
| H04 | Android幅390 CSS px/画面高844でヘッダ下の本文と最終タイルの可視性を確認。PASS |
| H05 | Android横向き800 CSS px/高360で本文高さ再計算と末端到達を検証。PASS |
| H06 | iPhone相当360 CSS pxではAndroid class非適用、`hubView`の既存スクロール方式と文書スクロールによる末端表示を実ブラウザで確認。PASS |
| H07 | 言語変更・タブ切替で下部の主要5ナビ再描画→`watchAppNavHeight`で固定ナビ高さを再計測する経路を追跡。高さ増加回帰PASS |
| H08 | その他配下の2次タブ切替で`scrollHubTop`が新スクロール所有者を先頭へ戻す経路を確認。PASS |
| H09 | 初回設定ウィザードは別の`.setup-overlay`/`body.setup-open`でスクロールロックし、`showHub`はモーダル閉時に解除。今回の`#hubView`規則はウィザード自身へ波及しない。PASS source |
| H10 | 統合回帰は固定2行ヘッダのブラウザ9/9、Androidタッチジオメトリ、フォーカスとiOSのキーボード防御がPASS。**旧`mobile_navigation_test.mjs`は別担当の歩合入力ソースを固定文字列で検証する箇所でexit1**。正式実機テストとは分けて未解決として明記。PASS scope / unrelated FAIL |

## 実行証拠と正式受入ゲート

- `node --test test/izk_ut_080_android_hub_scroll_regression_test.mjs`: **4/4 PASS**。Android 360/390/800 CSS幅、iPhone 360、28タイル、ナビ実測・巨大化、タブ復帰・Native zoom guardと併用を含む。各2HTMLの本物のCSS/scroll関数を使い、バックエンド未接続のChromiumです。
- 併走した `test/android_qa_chrome_touch_geometry_test.mjs`、`test/android_qa_focused_field_rotation_recovery_test.mjs`、`test/ios_keyboard_global_header_stability_test.mjs`、`test/qa2_header_two_row_regression_test.mjs`はすべてPASS。`test/mobile_navigation_test.mjs`はCommission validator文字列期待値で既存競合差分による別失敗。今回の3ファイルとは無関係な箇所で停止したが、全体テストPASSとは記載しない。
- **未実施**: 実Android Realme RMX3938の最新版承認済みAPKでのスワイプ・最終カード・画面回転・注文/売上/その他・端末キーボード、iPhone実機での回帰。修正版APK作成・導入、正式runner claim、正式state更新、ストア提出・Git push/deployはしていない。
- ①QA統括に新ビルドソース照合・承認後の再試験キュー化を引継ぐ。②正式QA実行は既存の共通Playwright runnerで、他店舗を使わず認可されたQA店舗を用いて、スクロールタッチログ＋最終タイル矩形＋固定ナビ矩形を証跡に残す。旧正式FAILをソース修正のみでPASSへ変更しない。
