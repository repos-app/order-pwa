# IZK-UT-082 — ログインIDとパスワードの独立した「保存」チェック

**日付**：2026-10-16 / **対象**：izakanpai Native iOS / Android 管理ログイン / **優先度**：P2 / **状態**：LOCAL SOURCE IMPLEMENTED, WAIT_TEST（実機正式QAは未完了）

## 仕様・実装

- 利用者要望「ログインIDとパスワードの横に保存チェックそれぞれ置いて、再入力しないように」。`mobile-app/web/index.html`と`manage.html`は完全一致、両方に入力欄右の独立したチェック（各44px以上のタップターゲット）を追加。JA「保存」／EN「Save」。端末にまだ保存がない場合は両チェックOFF。
- ログインIDのみをチェック：**ログイン成功時だけ**`AUTH_STORAGE_PREFIX + 'rememberedLoginId_v1'`へ`{storeId,loginId}`を保存。ログアウト・再起動・一時通信断後のログイン欄に復元。チェック解除では削除。
- パスワードをチェック：既存の`native-auth.js`のiOS Keychain/Android Keystoreプラグイン（`internalSetItem`、`access:1` = iOS当該端末のみ）へ**明示選択後のログイン成功時だけ**`{v,storeId,loginId,password}`を安全保管。WebView`localStorage`/`sessionStorage`へパスワード文字列を保存しない。Native以外はチェックをdisabledにし、ブラウザ/PWAではパスワード記憶しない。
- ログインID保存OFF・パスワード保存ONの併用可。ただし手入力のIDと保存時のID/店舗が一致したときだけマスクされたパスワード欄を自動補完。別ID入力・別店舗切替では以前の自動補完を消す。保存済み店舗ID自体は前件IZK-UT-081どおり、前回ログイン成功したものを記憶。
- 解除したパスワード保存はNative保管先から削除。別店舗へのログイン成功時にパスワード保存を選んでいなければ前ユーザーの保管値も削除。パスワード変更成功時には古い保存パスワードを無効化する。Secure Storage利用不可/保存失敗時はログイン自体を中断せず、チェックをOFFに戻してエラー表示。
- 既存のアクセス/更新tokenのKeychain保管は別キー。ログアウトは従前どおりtoken・個人表示・権限を即時消去し、**ユーザーが保存を選んだパスワードだけを別領域に維持**する。認証は毎回APIで行い、保管値による自動ログイン/無認証APIアクセスは追加しない。共有端末ではパスワード保存を選ばないことを推奨。
- `remember-login.js`はNative2管理HTMLだけに明示ロード。Web本番/TESTの管理画面はワークスペース入力がない固定店舗UIであり、パスワードSecure Storageも使えないため今回は対象外。

## 自己レビュー S01–S10（実装/テストの独立した具体的確認）

| 巡 | 実施した方法・証拠 | 結果 |
|---|---|---|
| S01 | 既存`native-auth.js`の`securePlugin()`内で`Plugins.SecureStorage`、`registerPlugin`、`nativePromise`の3経路を比較。新remember APIは既存内部get/set/removeヘルパーをそのまま再利用、平文ブラウザ保管なし | PASS source |
| S02 | NativeAuthの`secureKey/secureRefreshKey`と新`rememberedLoginKey`を独立照合し、logoutがtokenだけを削除してrememberを意図通り維持することをVM+Native vaultで確認 | PASS VM |
| S03 | iOS Keychainの`access:1`とAndroid KeystoreのNative plugin代理をテストに実装、Secure Storage呼出し構造を実コードVMで検証 | PASS VM（iOS/Androidハードウェア未検証） |
| S04 | `rememberLoginId`と`rememberPassword`それぞれcheckbox→保存結果の組合せで、ID ON/PW OFF時にパスワードが端末へ書かれないことを実JSで検証 | PASS VM |
| S05 | ID OFF/PW ON時、保存ID/店舗と入力IDが一致しないかぎりパスワードが自動入力されないことを店舗/ユーザー逆ケースで確認 | PASS VM |
| S06 | リロードで別のJSコンテキストを作り、ID・パスワードの明示保存項目だけ復元されることと、ログイン成功後`clearRuntime`でパスワードDOMが空になることを確認 | PASS VM |
| S07 | Nativeのpassword checkboxを外して`clearRememberedLogin`を実行し、secure vaultからレコード消失することを確認 | PASS VM |
| S08 | ログイン成功後PW保存OFFで別店舗へ切替した際、古いNative保管パスワードが残存しないケースを追加検証 | PASS VM |
| S09 | Secure Storage set失敗時に保存済みと表示しない（チェックOFFへ戻す）、パスワード変更成功時に古い保管パスワードが失効することを別ケースで検証 | PASS VM |
| S10 | Node専用9/9 PASS、認証071 148/148・081 7/7・auth client272/272 PASS、Native index/manage同一SHA、JS構文・`git diff --check` exit0で静的/機能両方向確認 | PASS offline |

## 横展開 H01–H10（他の入口・OS・認証遷移への影響）

| 巡 | 探索/横展開対象・根拠 | 結果 |
|---|---|---|
| H01 | Native`index.html`ログイン（独立のUI入力/スクリプト順）→実JS VMとChromiumで44pxタップ・省スペースを確認 | PASS |
| H02 | Native`manage.html`の同一DOM/スクリプトとSHA一致を別ファイルで検証、片側の保存チェック/ログイン保存漏れなし | PASS |
| H03 | 320/360/430 CSS pxのChromium実レンダリングでログイン入力横のcheckboxがクリップせず、input font16pxでiOSフォーカス拡大を避けることを座標検証 | PASS |
| H04 | Native Apple Keychain / Android Keystoreの共通NativeAuth復元・logout queueにパスワード保管を追加し、認証token用の削除キーと区別。Native plugin実機はPENDING | PASS source+VM, device PENDING |
| H05 | Web production `docs/yuwaku/manage.html`は店舗固定/独立ログインでありNative-onlyパスワード保存を横流ししないことをソース逆検索 | PASS source |
| H06 | Web TEST `docs/yuwaku/test/manage.html`はproductionと同じ固定店舗ログインであり認証情報の消去を維持。旧071 148/148のうちWeb両面もPASS | PASS offline |
| H07 | 先行071: ログアウトでユーザー名・password DOM・アクセス/更新token・権限を消去、rememberのみ明示選択で維持。旧071+auth client回帰 | PASS offline |
| H08 | 先行081: 成功した店舗IDだけが永続化され、失敗/登録/late secure persistenceで他tenantへ移らない契約を専用7/7で検査 | PASS offline |
| H09 | パスワード変更 (`changePasswordByLogin`)成功時に旧保管PWを明示破棄、登録 (`registerStore`) のみではremember保存しない別経路をコード照合 | PASS source+VM |
| H10 | 店舗/ログインIDを変更しても別人のパスワード自動補完が行われず、Native以外に書込なし、Keychain利用不可では保存済みと誤表示しないことを負例3系統で再検査 | PASS offline |

## テスト・配布状態

- `node --test test/izk_ut_082_remember_login_optin_test.mjs`：**9/9 PASS exit0**（実Secure Storage連携VM、タッチレイアウトChromium、失敗・店舗境界・ログアウト・パスワード変更・非Native安全分離）
- `node --test test/izk_ut_081_last_success_workspace_persistence_test.mjs`：**7/7 PASS exit0**。
- `node test/izk_ut_071_logout_privacy_regression_test.mjs`：**148/148 PASS exit0**。
- `node test/auth_client_regression_test.mjs`：**272/272 PASS exit0**。
- `node --check mobile-app/web/native-auth.js`と`node --check mobile-app/web/remember-login.js`：exit0。関連`git diff --check`：exit0。Native2管理HTMLは同一SHA。
- **未検証**：実機iOS Keychain/Android Keystoreへの本物のセット/取得/消去、端末ロック中/変更中のvault挙動、再起動、OSオートフィル干渉、画面読み取り時のセキュリティ、署名済みIPA/APKでの正式Playwright/例外iOS QA。新ビルド/commit/push/deploy/Store Submit/正式QA更新なし。
- サーバーやD1スキーマ変更なし。実機再テストの際は「ログインIDのみ」「パスワードのみ」「両方」「両方OFF」、別ユーザー、別店舗、パスワード変更、SecureStorage利用不可、古いログイン拒否を確認する。共有端末でのパスワード記憶はセキュリティ上推奨しない。

## 2026-10-17 Offline SHELL 配布漏れの追加修正（同一082）

## 2026-10-17 旧Native認証境界テスト監査（worker-2・P0要対応）

### 2026-10-17 最終統合再監査：bridge 修正後の厳格契約更新

worker-1 の `bridge.html` 修正を**読み取りのみ**で確認。旧 `test/native_auth_test.mjs:260` は same-origin の親 `NativeAuth` 直接利用を必須にしており、修正後も `exit 1` となった。そこで専用assertを、同一originの親Capacitor `BluetoothPrinter` 取得と `API.pageReady({auth:'required',requireStore:true})` の認証境界をともに要求する契約へ変更。`bridge.html` に `NativeAuth` 参照がないこと、`auth.ready/getToken/token/use` を呼ばないことを維持した。ソースから `nativeHostWindow` と `nativeBluetoothPlugin` をVMで抽出実行し、同一origin親プラグイン取得、異origin親遮断、自画面のCapacitor優先を個別assertで検証。既存の他画面、vault 3メソッド以外禁止およびtoken/ready境界テストは維持。

初回修正後、後段の既存SWテストが旧ヘッダーpin `auth23` を固定期待して `exit 1`。現行 `mobile-app/web/config.js` と `sw.js` は `auth26` で一致していたため、固定番号の上限緩和ではなく **config.jsの実script URLとSWのprecacheが一致すること**を検証する同等以上の契約へ変更し、`remember-login.js?v=remember1` shell登録もassert追加した。最終 `node test/native_auth_test.mjs`: **112/112 PASS exit 0**。`node test/izk_ut_071_logout_privacy_regression_test.mjs`: **163/163 PASS exit 0**。`node --test test/izk_ut_082_remember_login_optin_test.mjs`: **14/14 PASS exit 0**。`git diff --check -- test/native_auth_test.mjs`: **exit 0**。物理iOS/Android・正式QAは未実施。

**S01–S10独立確認**：S01 旧bridge直接参照要求assertの旧FAIL確認、S02 現行`nativeHostWindow` same-origin述語確認、S03 `nativeBluetoothPlugin` のparentからのCapacitor取得確認、S04 `BluetoothPrinter` plugin分岐確認、S05 `nativePromise` bridge分岐確認、S06 VMで同一origin取得を実行、S07 VMでcross-origin遮断を実行、S08 VMで自画面優先を実行、S09 `managementToken` のpageReadyとtoken/store一致ガードを確認、S10 NativeAuth禁止と既存strict testを含め全112件PASS。

**H01–H10横断確認**：H01 index HTMLで直接NativeAuth依存なし、H02 manage HTML同様、H03 082 vault adapter 3メソッドのみを許す従来assert維持、H04 iframeのBluetoothスキャン/接続はCapacitor経路を保持、H05 cross-origin親からBluetooth pluginを取得しない、H06 API.currentToken/currentStoreId照合を維持、H07 logout privacy 071の163件PASS、H08 082 vault/記憶切替14件PASS、H09 config header auth26とSW cache auth26を実値突合、H10 remember-login JS のversioned offline SHELL pinも検査しPASS。

修正したのは `test/native_auth_test.mjs` とこの082文書のみ。source/DB/公式QA/build/deploy/commit/push は変更していない。

`node test/native_auth_test.mjs` の旧一律 `/NativeAuth\./` 制限は082の正当な記憶パスワード用APIを区別しなかったため、`test/native_auth_test.mjs` に**許可リスト（`remember-login.js` の `readRememberedLogin`, `saveRememberedLogin`, `clearRememberedLogin` の3つのみ）**を追加。ただし全44 HTMLからの直接呼出しは禁止したまま、全JSも棚卸しした。

**重要・未解決P0境界懸念**：`mobile-app/web/bridge.html` に `nativeAuthClient()`→`(host&&host.NativeAuth)||window.NativeAuth`（175行）、`auth.getToken()`（111・393行）、`auth.ready()`（112・393行）が**現存**する。082のvault例外ではない。`bridge.html` は編集禁止のため未修正。旧テスト失敗原因は082単独ではなくこの既存越境参照も含む。`billing-native.js` に `NativeAuth` 語がコメントで1件あるがコード呼出しではない。44 HTMLでは `bridge.html` だけが直接参照し、index/manage は保存モジュールの外部scriptロードだけ。JSでは `api.js` が正規の認証境界、`native-auth.js` が実装、`remember-login.js` にvault APIの参照9箇所（3メソッドのみ）。セキュリティ違反を隠すための無条件PASS化や上限緩和は実施せず、テストにbridge専用assertを追加し**意図的にFAILを維持**した。

### S01–S10（個別の実コード検査）

| 監査 | 方法/証拠 |
|---|---|
| S01 | PowerShellでNative 44 HTMLファイル数を確認 |
| S02 | `rg 'NativeAuth\\.' mobile-app/web -g '*.html'` に直接プロパティ一致なし。ただし別名・変数経由の危険があると判明 |
| S03 | `rg '\\bNativeAuth\\b'` 全HTML/JSで `bridge.html`, `api.js`, `native-auth.js`, `remember-login.js`, `billing-native.js` を列挙 |
| S04 | `bridge.html:173-175` のNativeAuthクライアント取得元を確認 |
| S05 | `bridge.html:110-112` の `auth.getToken()` と `auth.ready()` を確認 |
| S06 | `bridge.html:393` の二度目のtoken取得経路を確認 |
| S07 | `remember-login.js:60-61` の `readRememberedLogin` とNative限定ガードを確認 |
| S08 | `remember-login.js:84-91` の `clearRememberedLogin` と `saveRememberedLogin` を確認 |
| S09 | `remember-login.js:126-141` のチェック解除・無効化時vault消去経路を確認 |
| S10 | 旧 `node test/native_auth_test.mjs` exit1(行189) を再現、厳格テスト変更後もbridge違反を許可せずFAIL |

### H01–H10（独立した横断影響調査）

| 監査 | 方法/証拠 |
|---|---|
| H01 | index.htmlで直接NativeAuth参照ゼロを確認 |
| H02 | manage.htmlで直接NativeAuth参照ゼロを確認 |
| H03 | index/manageに082専用remember-login scriptだけ読み込む設計を文書と専用回帰で照合 |
| H04 | bridge.htmlの取得tokenはAPI境界例外にしないP0判断 |
| H05 | api.js内NativeAuthアクセスは唯一の認証境界として従来どおり維持 |
| H06 | native-auth.js自体はSDK実装として検査対象除外を維持 |
| H07 | billing-native.jsのNativeAuth文字列はコメントであり直接呼び出しでないことを確認 |
| H08 | 082保存回帰 `node --test test/izk_ut_082_remember_login_optin_test.mjs` は実行した14テストすべてPASS |
| H09 | 071ログアウト回帰は実行したが `document.documentElement.style` 不在で exit1、未解決（091と独立、ソース変更なし） |
| H10 | 083名を持つ専用テストは `Get-ChildItem test -Name '*083*'` で発見できず、追加特定を要する |

この変更により**旧テスト全体PASSとは扱わない**。bridgeの認証境界移行は別担当に依頼すること。原コード、DB、正式QAは未変更。

`index.html` / `manage.html` は共に `./remember-login.js?v=remember1` を読み込むのに、`mobile-app/web/sw.js` の `SHELL` は同URLを含まず、`sixth_pass_distribution_references_test.mjs` が **before exit 1** (`referenced asset missing from offline SHELL`) となった。`remember-login.js` 実ファイルとversion付きHTML参照を確認し、`SHELL` に同一URLを1件追加、CACHE epochを **v315→v316** とした。既存IZK-UT-089の `header.js?v=auth26` と他のSHELL項目は維持。Native CapacitorはSW登録を抑止・過去cacheを削除する既存設定を変更しない。配布・ビルド・公式QAは実施していない。

追加S01–S10（それぞれ実ソース/回帰確認）：S01 HTML indexのversioned読込、S02 HTML manageのversioned読込、S03 `remember-login.js`実ファイル存在、S04 `sw.js`のSHELL漏れ再現、S05 SHELLへ完全一致URL追加、S06 auth26既存固定値保護、S07 cache epoch単調増加 v315→v316、S08 `SHELL`のNativeAuth既存登録保護、S09 配布参照テストのbeforeFAIL/afterPASS、S10 `git diff --check` exit0。いずれもsource/offline確認。

追加H01–H10（異なる関連領域の探索）：H01 index Nativeログイン、H02 manage Nativeログイン、H03 Web PRODで082 Native-onlyを維持、H04 Web TESTで082 Native-onlyを維持、H05 Native SWを使わない既存config動作と既存cache掃除、H06 version付きSHELLのURL完全一致、H07 089アクセント回帰4/4 PASS、H08 082のVM/Chromium回帰全PASS、H09 全配布参照（他面込み）0 errors、H10 旧native_auth全体回帰の境界検査。**H10は FAIL（既存別契約衝突）**: `native_auth_test.mjs:189` の旧「画面コードはNativeAuthへ直接依存せず」の全面禁止assertが、082の明示的NativeAuth Secure Storage利用に衝突する。今回編集許可外のためテストを緩和せず、そのまま統括へ引き継ぐ。

再検証：`node --test test/sixth_pass_distribution_references_test.mjs test/izk_ut_089_accent_regression_test.mjs test/izk_ut_082_remember_login_optin_test.mjs` **19/19 PASS exit0**。同時に `test/native_auth_test.mjs` を含めた場合は **19 PASS / 1 FAIL exit1**。失敗箇所は上記旧認証境界assertであり、SW配布の追加とは独立している。変更範囲は `mobile-app/web/sw.js` と本ドキュメントのみ。
