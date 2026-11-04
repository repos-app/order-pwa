# iOS OPR-AUTH-011〜015 SOURCE-only 契約（2026-10-25 PHT）

## 対象、定義、現状

正本は `.qa-v2-official/manifest.json`（831件）。対象は `QA2-KEEP-OPR-AUTH-011`〜`015` の5件で、iOS/Android共通スコープ。対象の旧ケース期待値とシナリオを1対1で比較し、元の公式判定には一切変更を加えない。操作の実行結果は**すべて未実施**。ソースを登録したこと、mock oracleの成功、チャットへの依頼成功は正式QAではない。

| ケース | 正本チェックポイント | ソースで契約化した必須の独立証拠 | 実機操作の現状 |
| --- | --- | --- | --- |
| 011 logout | `Secure/runtime token破棄` | Native Access/Refresh（runtime/secure）全消去、画面ログイン復帰、旧access/refresh拒否、teatの該当session失効 | 既存HID `tap` でlogoutボタンの実画面矩形を使う計画だけ登録。実iPhone未実行 |
| 012 logout後Back | `protected画面復活なし` | ログアウト後のNativeトークン全消去、実Back操作、機密画面が復活せずログインgate維持 | iOSの物理Back/履歴復元操作未装備。未登録 |
| 013 logout中network issue | `runtimeは即logout、cold start fail closed` | 通信失敗を独立観測、ローカルトークン全消去、実cold start後の保護画面拒否 | 通信故障注入と端末アプリcold startの実制御未装備。未登録 |
| 014 refresh成功 | `新token継続` | 独立live HTTPで新access有効/旧refresh拒否、D1のrefresh fingerprint更新、Native access/refreshとも新値 | 実端末上のrefresh発火とNative token読取を保証する制御未装備。未登録 |
| 015 refresh response after pagehide | `新page sessionを書換えない` | pagehideと遅延HTTP応答の順序、新旧ページ世代、応答前後の新ページaccess/refresh fingerprint一致、現session有効 | pagehide遅延応答の再現コントローラ未装備。未登録 |

## 実装構成・正式実行時の前提

* `scripts/qa-autonomy/ios-auth-session-family.mjs`: 上記5件のManifest・所有fixture・独立効果・後片付けの共通契約。計画生成は011のみを許す。011の計画は`index.html`の実際に観測されたログアウトボタン矩形と画面/ビルド/QA-owned session一致を必須にする。既存`runIosClaimedCase`以外でHID/D1/正式判定は実施しない。
* `scripts/qa-autonomy/ios-auth-session-claim-d1.mjs`: 既存`qaReadOnlyD1Config`と公式RUNNING claim/端末serial/毎クエリ前後のclaim確認を利用するteat専用SELECTリーダー。DB UUID・社員ID/ログイン・既存session IDとrevoked/refresh fingerprintを確認。トークンやhash原文は成果物に出さない。別系統のfixture所有observerが必須。
* `scripts/qa-autonomy/ios-source-contract-registry.mjs`: 実際にコンパイル可能な011だけSOURCE登録。012〜015は`IOS_SOURCE_PROVEN_GAPS`へ個別の不足機能コードを登録。実機未確認のSOURCE登録は正式Runner・HID・Oracle結線完了を意味しない。
* `scripts/qa-autonomy/ios-auth-session-family.test.mjs`: 5件すべての想定結果/悪い結果、公式claim、所有fixture、SELECT、cleanup、011既存Bridge委譲をモックで検証。

正式011で必要な実物は、当該QA専有iPhoneのビルド/portraitサイズ/実画面校正、Mounted DDI・HID・PNG、テスト用使い捨てアカウントと有効session、別の独立iOS NativeAuth observer、独立HTTPの旧token拒否証拠、別のfixture cleanup実行者、実際のRUNNING claim。4件の追加制御は上表に示す。特にNativeAuthのsecure storageとWebViewのruntimeは別々に読まなければならず、スクリーンショットから消去を推定しない。

cleanupは対象fixtureの所有IDと`teat`に絞り、監査ログ・他店舗を保全し、当該sessionと秘密値が復活しないことを独立読戻しで確認する。013はネットワーク復元、015はページ世代復元も要求する。**Bridge内で例外が発生して正式claimが先に解放された場合、後置cleanupには有効なclaimがなく、再照合は未検証のままになる。共通Bridgeのclaim内failure-finally cleanupフックがない現状では、無条件のcleanup成功は保証できない**。その場合は`INCOMPLETE`/cleanup未検証で止め、同一店舗fixtureの所有状態を別の権限ある担当が確認する必要がある。

`mobile-app/web/index.html`の`window.logout`はAPI logoutを開始してからUIを即ログインへ戻す。`mobile-app/web/api.js`の`API.logoutSession`はNativeAuthクリアをサーバーのbest-effort応答より先に開始し、`refreshSession`は`_pageLifecycleGeneration`を比較、`pagehide`で世代を切り替える。`src/index.js`、`src/gasApi.js`、`src/sessionTokens.js`の旧session revoke・accessのDB活動検証に対応する独立観測が正式実行時に必要。これら既存本体ファイルの変更は今回行わない。

## SOURCE自己レビュー（10の独立観点）

| 観点 | 実施・結果 |
| --- | --- |
| S01 正本 | 831 Manifestの5 ID、legacy scenario/checkpoint整合をコード＋回帰で確認。SOURCE PASS |
| S02 スコープ | teat/owned/社員/role/既存sessionの不一致拒否を fixture とSQL境界で確認。SOURCE PASS |
| S03 iPhone画面校正 | 画面/ビルド/観察ログ/rect厳格チェックと範囲外テスト。SOURCE PASS、実機未観測 |
| S04 未対応HID | Back/通信断/cold start/refresh/pagehideの4種類を偽tapへ変換させない。SOURCE PASS、物理BLOCKED |
| S05 ログアウト | UI gateとNative runtime+secure消去、旧access/refresh拒否とD1失効の別系統比較。SOURCE PASS、物理未確認 |
| S06 offline | 013はサーバー失効済を前提にせず、cold start拒否を独立要求。SOURCE PASS、物理未確認 |
| S07 refresh | 014で前後D1 refresh fingerprint・Native accessとrefresh双方の交換、新access確認。SOURCE PASS、物理未確認 |
| S08 競合応答 | 015で旧世代/新世代と遅延HTTP、access+refresh両fingerprintの不変を比較。SOURCE PASS、物理未確認 |
| S09 秘密値/SELECT | 生token/Passwordなし、DB SQLがstore+employee+sessionで限定され、claimとownerを挟む。SOURCE PASS、remote未実施 |
| S10 failure cleanup | 監査・所有・他店舗保護とfail時cleanup拒否テスト。SOURCE PASS、Bridge claim解放後の実復元はPENDING |

## 横展開（10の異なる入口で確認）

| 観点 | 照合先・結果 |
| --- | --- |
| H01 Native認証保持 | `ios/App/App/BridgeViewController.swift`とNativeAuth経路のうちSOURCEが直接触れない部分を区別。Native実測はPENDING |
| H02 管理画面logout | `mobile-app/web/index.html` の即時UI clearとheader/hub cacheを確認。SOURCE PASS |
| H03 API logout | `mobile-app/web/api.js:811-822` のローカル先行clear/HTTP best-effortを確認。SOURCE PASS |
| H04 refresh世代 | `mobile-app/web/api.js:752-809` の世代整合/late reply保護と一致。SOURCE PASS |
| H05 pagehide | `mobile-app/web/api.js:590-669` のgeneration incrementとabortを確認。SOURCE PASS |
| H06 Native Worker | `src/index.js`のlogout/refresh/checkTokenとactive session照合を確認。SOURCE PASS |
| H07 GAS互換 | `src/gasApi.js`のlogout/refresh/checkToken経路を逆引き。SOURCE PASS |
| H08 D1 session | `src/sessionTokens.js`と`auth_sessions`キーのstore/employee/session一致、revoked/rotationを確認。SOURCE PASS |
| H09 iOS claimed Bridge | `qa-v2-ios-claimed-bridge.mjs`はtap/fillのみ、claim後の独立Oracle・証拠と本体レビューが必要。SOURCE PASS、HID未実行 |
| H10 隣接ケース/831監査 | 001〜010の既存auth group契約を回帰、Stage10とSource Auditの準備と正式状態を区別。SOURCE PASS |

この作業による遠隔D1更新0件、公式ledger書換え0件、TestFlight/実機HID 0件、正式PASS 0件、ストア申請準備率の加点0件。ソースのモック成功を正式承認として扱わない。

## 回帰と正式状態の読み取り

* `node --test scripts/qa-autonomy/ios-auth-session-family.test.mjs scripts/qa-autonomy/ios-auth-family.test.mjs scripts/qa-autonomy/ios-auth-boundary-family.test.mjs scripts/qa-autonomy/ios-831-stage-action-matrix.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-source-work-selector.test.mjs`: **40 PASS / 0 FAIL / exit 0**。うち新規6テスト。SOURCE registryは本ファミリ追加分 **+1件**、`012〜015` は未登録の物理機能不足として扱う。
* `node --test test/izk_ut_071_logout_privacy_regression_test.mjs test/auth_client_regression_test.mjs test/native_auth_test.mjs test/qa_v2_ios_claimed_bridge_test.mjs test/qa_v2_ios_persistent_fill_transport_test.mjs`: **28 Node subtests PASS / 0 FAIL / exit 0**。内包する独自検証スクリプトの `IZK-UT-071` 164項目、`NativeAuth` 112項目もそれぞれ全成功を記録。これらはオフライン/SOURCEの検査。
* `node --check` で新規2モジュール、テストモジュールの構文を確認（exit 0）。`git diff --check` の対象差分もexit 0。
* `.qa-v2-official/ios/state.json` の対象5件を**読み取りだけ**で再確認し、`011`〜`015` の5件すべて `NOT_RUN`。この作業による正式証跡・公式PASS/FAILの新規確定件数は0。

オフラインテストで使用した `1.0 (11)` と画面座標、模擬claim/fixture/NativeAuth/HTTP/D1応答はすべてfixtureであり、現在のiPhoneの実測値ではない。`handoff/APP_STORE_PROGRESS.md`はこのローカルワークスペースの引継ぎとして更新した。
