# IZK-UT-068 再発 — Native画面遷移の白1フレーム描画（2026-10-24）

## 事象・原因

- 利用者提供のiPhone録画 `ScreenRecording_10-24-2026 12-36-31_1.mp4`：30fps、142フレーム、約4.73秒。管理Hub→メニュー編集→管理Hub→メニュー編集の遷移で0.67秒（frame20）と3.50秒（frame105）がほぼ白一色となり、その次フレームに画面が復帰する。2.73秒付近にも別の中間描画を確認。
- 2026-10-09の初回対策は、別HTMLへ移動する際にNative WebView下地が暗く見えるのを `#f6f7f9` に変えたもの。**旧Documentの画面を保持しない**ため、今回は薄灰/白い中間フレームとして露出した。旧ヘッダーの「ログイン」誤表示（IZK-UT-095）は別原因。以前のソース回帰PASSや未配布の修正をiOS実機完了と扱っていたわけではないが、画面全体の連続性は未保証だった。
- `mobile-app/web` は多数の別HTMLを `location.href/replace` やリンクで遷移する構成。各画面のHTML/JS再構成時に中間フレームが生じる構造はiOS/Androidに共通。

## 修正（commit・pushなし）

- `mobile-app/web/config.js`：Native Capacitorのみ`@view-transition{navigation:auto}`を共通styleへ1回注入し、同一origin・別Document移動でもブラウザに前ページの描画スナップショットを保持させる。iOS専用の場当たり分岐は追加しない。
- `prefers-reduced-motion:reduce`時はView Transitionアニメーションを実質0msとする。通常Web/PWAは従来動作を維持。ブラウザ非対応時は既存canvas背景を保持する（非対応環境でちらつきが解消したとは判定しない）。
- Native画面43個は共通config.jsを読み込み、残りの`drink_inv.html`は即時にinventory.htmlへリダイレクトする旧aliasで操作画面ではない。
- `npm run mobile:sync`実行完了（exit0）。iOS、Androidのローカル生成配布資産を同じソースで同期。署名APK/IPA生成とTestFlight反映は**未実施**。
- 新規 `test/izk_ut_068_cross_document_flash_regression_test.mjs` を既存 `test/project-test-commands.json` に追加（新規ケース個別ドライバーではなく共通描画基盤の回帰）。

## 実行証拠

- `node --test test/izk_ut_068_cross_document_flash_regression_test.mjs test/izk_ut_095_header_navigation_flicker_test.mjs` → 3/3 PASS・exit0。Chrome実レンダリングで同一originの2つの異なるDocumentの`pageswap.viewTransition`と`pagereveal.viewTransition`がどちらも存在することを確認。Web/PWAでは注入されない。
- 追加の既存`izk_ut_079_native_zoom_lock_test.mjs`は旧095導入後のVM fixtureに`classList`と`setTimeout`が欠落し、初回2件FAIL。実ブラウザには存在する標準DOM/timerだけをfixtureへ補完し期待条件を緩和せず再実行。新068＋旧079＋旧095を組み合わせた **10/10 PASS・exit0**。本番コードの認証/ズーム動作は変更していない。
- `node test/izk_project_test_pipeline_contract_test.mjs` → PASS・継続パイプライン194ステップへ登録。194ステップ全部を今回実行したわけではない。
- `node test/distribution_parity_test.mjs` → PASS・source/mobile-dist/iOS/Android各101ファイルの欠落・不一致0、iOS/Android相互103ファイル一致。配布用同期であり端末配布ではない。
- `node test/izk_ut_094_header_toolbar_alignment_test.mjs` → 4/4 PASS。 `node test/ios_release_readiness_test.mjs` → 41/41 PASS。
- `node test/izk_all_screen_syntax_navigation_audit_test.mjs` → exit1。各ページのJS構文・リンク検査ではなく **生成済みJSONの古いsourceSha256スナップショット差**により失敗。作業ツリーで他画面の更新も並行しているため監査レポートを再ピン留めしない。以前のユーザー指示に従いソースSHA一致をQA開始/再開のゲートにしない。**このテストのPASSは主張しない**。
- `git diff --check -- mobile-app/web/config.js test/project-test-commands.json` → exit0。

## 修正後レビュー 10観点（各観点を別々にチェック）

| ID | 観点 | 結果・証拠 |
| --- | --- | --- |
| S01 | 再発現象を推測ではなくフレーム単位で確認 | PASS（動画frame20/105） |
| S02 | 旧068との差異・なぜ未解消か説明できる | PASS（背景色変更とフレーム保持は別） |
| S03 | 旧095のヘッダー問題と混同しない | PASS（095資料・テスト照合） |
| S04 | 戻る／進むを個別画面ごとに改造せず共通層で対処 | PASS（config.jsのみ） |
| S05 | Native以外のPWAへ影響しない | PASS（Chrome Web fixtureでstyle0個） |
| S06 | 二重登録を防ぐ | PASS（styleのIDチェック） |
| S07 | 旧画面側にView Transitionがある | PASS（Chrome pageswap.viewTransition=true） |
| S08 | 次画面側にもView Transitionがある | PASS（Chrome pagereveal.viewTransition=true） |
| S09 | 従来の共通ヘッダー遷移回帰 | PASS（095既存テスト） |
| S10 | テストの継続実行登録と差分整合 | PASS（pipeline contract、git diff --check） |

## 横展開レビュー 10観点

| ID | 対象 | 結果・証拠 |
| --- | --- | --- |
| H01 | メニューハブ↔編集の両方向 | 共通44 HTML分類PASS、実機PENDING |
| H02 | 設定/管理画面を含む共通配布対象43画面 | config.jsを読むことをテストで全数PASS |
| H03 | 過去のinventory alias | drink_inv→inventoryの即時遷移をテスト確認 |
| H04 | iOS Native資産 | source↔iOS 101/101一致・実機PENDING |
| H05 | Android Native資産 | source↔Android 101/101一致・実機PENDING |
| H06 | iOS/Android相互整合 | 配布103/103一致 |
| H07 | iOS/Androidの元canvas色対策 | 既存Native背景色設定を無変更で保存 |
| H08 | 認証・権限・書込中ナビゲーション防止 | config.jsの認証ロジック、API・header.js無変更、095テストPASS |
| H09 | 動き低減・非対応エンジンのフォールバック | reduced-motion CSSあり／非対応端末では実機PENDING |
| H10 | 本番Web・自動公開・正式QA判定・Git | Webソース無変更、commit/push/公開/正式QA台帳操作なし |

## 判定の境界

**ローカル修正完了（共通ソース・Native同梱・オフラインブラウザ回帰）、物理端末でのチラつき解消は未判定。** Chromiumの実エンジン検証は成功したが、WKWebView/Android WebViewの対応差、端末実描画、実配布版や非同期業務描画については新しい署名APK/IPAで同じ操作を録画し確認する必要がある。機能が利用可能なWebKit/Safari 18.2以降であってもWKWebViewでの動作は実機検証までPASSとしない。
