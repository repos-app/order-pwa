# IZK-UT-095 — Android実機の画面遷移で上部に旧「ログイン」ヘッダーが一瞬出る（2026-10-18）

## 元証拠と範囲

- **利用者報告**：動画 `IMG_1726.mp4`、約11.13秒、30fps、512×910。Realme Android QAアプリの管理メニュー→設定→別設定画面→戻る遷移を撮影。動画3.5秒付近で、管理メニューへ戻る途中の上部に**「ログイン」**と表示された後、本来の「設定」ヘッダー・ボタンが復帰し、白い「読み込み中...」ページが間に見える。上部の瞬間的な切替をチラつきとして報告。
- **根因確度**：高（実コードの起動順とChromeで遅延再現）。`mobile-app/web/index.html` / `manage.html` の旧 `body>.head > h1` は初期値「ログイン」であり、各画面の旧 `head/top/appbar` は即座に可視。共通 `config.js` がJS `header.js` を後から動的ロードし、`header.js::initAfterNativeAuth` が `API.pageReady({auth:'optional'})` の完了まで `init` を**待つ**。この空白に旧ヘッダーが描画され、認証済みセッションでも遷移中だけログインと表示される。共通header取り込み後には旧DOMを非表示にするため見た目がジャンプする。
- **修正方針**：セッション確認を待たずに共通ヘッダーをログイン済みとして描くことはしない。認証トークンやtenant検証、切断時の fail-closed は従来通り。**Native Capacitorだけ**初期 `config.js` で `iz-native-header-awaiting` を付け、旧画面ヘッダーの中身のみ `visibility:hidden!important`（ヘッダー背景や高さは残す）。共通header `init` が最終的に「ログイン維持／共有headerを生成」を確定した直後にclassを除去。万一header.jsが読み込まれない場合は12秒で表示を自動復旧（無期限に隠さない）。
- **対象**：Android/iOS共用 `mobile-app/web/config.js` / `mobile-app/web/header.js`。旧header候補 `.head,.kds-head,.header,.appbar,.bar,.top,.rhead,.to-head` の**body直下子要素のみ**。業務コンテンツ・ボタンイベントや認証成功／失敗条件、Web本番/TESTの通常JS挙動は変更なし。
- **キャッシュ**：`mobile-app/web/config.js` から `header.js?v=auth28`、`sw.js` v318およびcache収録を同期。NativeはService Worker使用禁止を維持。 `test/izk_ut_089_accent_regression_test.mjs` の配布資産期待を auth28/v318に更新。

## 結果と品質ゲート

| テスト | 実行結果 |
|---|---|
| 新規 `test/izk_ut_095_header_navigation_flicker_test.mjs` | 修正前 **exit1**（遅延auth中に初期ヘッダーが可視）→修正後 **exit0**。実Chrome360 CSS px・Native模擬・非同期 `pageReady` 保留/完了。認証済設定、認証済管理、未認証ログインの3遷移を実コード `config.js` + `header.js` で確認 |
| `test/native_auth_test.mjs` | **112 checks PASS / exit0**。旧 `.then(init)` 固定文字列の期待を、API準備後にinit→表示解除という正しい順序の実コード検査へ変更 |
| `test/izk_ut_094_header_toolbar_alignment_test.mjs` | **4/4 PASS / exit0**。3配布面、右寄せ共通操作の座標と固有操作スクロール維持 |
| `test/qa2_header_two_row_regression_test.mjs` | **9/9 PASS / exit0**。実Chromeで共通二段・legacy操作移植・Help表示維持 |
| `test/izk_project_test_pipeline_contract_test.mjs` | **exit0**、恒久191→**192** ordered test stepsへ新しい動画報告回帰を追加 |
| `git diff --check` | **exit0**。今回のScoped sourceを対象 |

**未実施**：今回の修正版QA APK/IPAの署名ビルドと実機再インストール、物理端末上の動画再撮影と全画面遷移の正式QA、Git commit/push、Cloudflare/D1変更、Web公開。直前インストールのAndroid QA APK910020にはこの変更はまだ含まれない。並行チャットが多数のバックエンドや認証/課金ファイルを編集しているため、汚れたworktreeを丸ごと署名ビルドに同梱・自動pushはしない。前回の総合パイプラインは別件のmigrations数(47対固定46)とsource inventoryの並行SHA不一致を抱え、全体PASSは主張しない。

## 自己レビュー S01～S10

|巡|独立した確認軸と証拠|評価|
|---|---|---|
|S01|ユーザー提供11.13秒の元動画を0.5秒間隔22コマの一覧で確認。3.5秒付近の`ログイン`→共通headerの切替に対応|原因把握|
|S02|Native manage/index.htmlの初期`.head h1[data-t=login]`と`#loadingView`を直接検査|PASS（根因）|
|S03|`config.js`の共通header動的注入と`header.js`の`DOMContentLoaded→API.pageReady→init`順序をソース追跡|PASS（根因）|
|S04|修正前に実Chrome＋本番`config.js/header.js`遅延 fixture で旧見出し可視の否定テストを実行し、**exit1**を確認|PASS（RED）|
|S05|Nativeのみguardを起動する `APP_CONFIG.NATIVE_DISABLE_SERVICE_WORKER` と Capacitor判定済みconfig経路を確認|PASS（scope）|
|S06|`visibility:hidden`を旧headerの**子要素だけ**に適用し旧headerの背景色・DOM高さはそのまま残すことを実Chromeで比較|PASS（表示安定）|
|S07|認証済み`settings.html`の非同期待機中、旧見出し・旧ENが不可視で共通header未生成→確認後新共有header 1個、旧display:none|PASS（Chrome）|
|S08|認証済み`manage.html`で旧`ログイン`が非表示、セッション確定後新headerに移ることをChrome確認|PASS（Chrome）|
|S09|真の未ログイン`manage.html`では`pageReady`完了後guardが解除され、旧ログインheaderに戻り表示できることをChrome検証|PASS（Chrome）|
|S10|12秒fail-openの復旧経路を確認。`API.pageReady`の成功条件、token発行、guardNavigation/ページ遷移経路を変更していないことを差分チェック|PASS（source）|

## 横展開 H01～H10

|巡|独立対象|評価|
|---|---|---|
|H01|Android実機720物理px/320dpiに相当する360 CSS pxで、実Chrome設定遷移 fixtureを実行|PASS（Chromium）／実機PENDING|
|H02|iOSはNative同じ `mobile-app/web` bundleで共通処理を使うが、WKWebView実機固有の初回描画は未検証|PASS（source）／iPhone PENDING|
|H03|管理入口`index.html`の同型`manage.html`と旧`ログイン`初期DOMが同等なのを読み、両方に共通config/headerが読まれることを照合|PASS（source）|
|H04|設定`settings.html`は旧`.head`で異なるタイトルを初期表示していたため、同じguardの対象になることを検証|PASS（Chrome）|
|H05|管理画面`admin.html`／`backup.html`／`register.html`の`.head`と共通config接続を調査、同じクラス指定が適用|PASS（source）／個別実機PENDING|
|H06|サブ画面で使う`.top`/`.appbar`/`.bar`/`.kds-head`を横断して共通の初期表示抑止に含める|PASS（source）|
|H07|予約・テイクアウトの`.rhead`/`.to-head`もbody直下の旧共通header候補に含め、共有header生成直後に復帰|PASS（source）／顧客画面実機PENDING|
|H08|Web本番/TESTは`NATIVE_DISABLE_SERVICE_WORKER=false`でguardを追加せず既存表示・cacheを維持|PASS（scope）|
|H09|Native header version auth28 とSW v318 の一致、既存ヘッダー右寄せ#094・二段#089のChrome回帰、112件native authを実行|PASS（offline）|
|H10|新095を共通ordered pipeline 192件目に登録し、他担当のdirty sourceと実機QA runner/正式台帳の状態を変更しない|PASS（source）／正式QA PENDING|

**残存課題**：本修正は画面遷移の**旧ヘッダー／ログイン文字の一瞬表示**を対象とする。WebViewのDocument全体の再読込時に発生する白い本文のローディング表示や、headerアクセント色のサーバー設定反映に伴う見た目の変化まで完全に排除することは未実証。実機の再撮影でなおチラつく場合、次の別原因として計測する。
