# iOS OPR-AUTH-016〜020 SOURCE-only 実装・検証（2026-10-25 PHT）

## 完了範囲・正式状態

公式正本 `.qa-v2-official/manifest.json` の831ケースのうち `QA2-KEEP-OPR-AUTH-016`〜`020` の5ケース（両OSスコープ）をSOURCEレベルで実装。既存iOS claimed bridge、NativeAuth、独立業務Oracle、teat用D1 SELECT読戻しの考え方を再利用し、OS固有の故障操作を必須制御として明示した。既存 `qa-v2-ios-claimed-bridge.mjs` の実操作は `tap` / `fill` に限るため、5件の現行物理実行は未対応。SOURCE auditの `IOS_SOURCE_PROVEN_GAPS` に個別理由を登録し、実行可能なSource familyとしての誤登録を防止した。

対象5件の公式iOS状態はすべて **NOT_RUN**（読取確認）。**iPhone実操作0、HID/DDI実行0、remote D1 0、正式claim/runner記録0、正式PASS/FAIL追加0、TestFlight更新0**。Mock検証は正式QAの代替ではない。公式Manifest・正式台帳・D1は変更していない。

| ケース | 正本期待値 | SOURCE契約の独立観測・否定条件 | 未装備の実機制御 |
| --- | --- | --- | --- |
| 016 `2tab/2WebView refresh競合` | `new session維持` | 異なる2 WebViewの同時refreshと応答順序、**同一session ID**のrefresh fingerprint更新、後着失敗が新tokenを上書きしないこと、Native実行時token・D1・認証HTTP整合 | 2 WebView応答ホールド・順序反転・独立Nativeタイムライン |
| 017 `stale 401 after relogin` | `新sessionを消さない` | 古いHTTP401を再ログイン後に放流する順序、旧session失効、新session非失効・runtime/secure token整合、保護Hub維持 | 旧リクエストの401遅延とiPhone上の再ログイン操作制御 |
| 018 `Secure Storage read timeout` | `retry/loginへ有限収束` | Secure read timeoutが実際に先行、有限retry（上限2）・最大30秒でretry/loginに収束、spinnerが残らないこと、セッション/DBの意図しない変化なし | iOS secure read故障注入とcold startのNative制御 |
| 019 `Secure Storage write timeout` | `現在画面永久待機なし` | Secure write timeout・有限retry/settle。画面がlogin/retryに戻る場合と、runtimeが認証継続しSecure永続化だけ失敗する場合の両方を検証。後者は独立HTTPでsession有効性・runtime tokenを確認 | iOS secure write故障注入とNative画面観測 |
| 020 `app update` | `session整合` | 同一bundleの実ビルド変更とデータ維持、cold start後のsession・Native token・D1・HTTP整合。更新中に認証済みrefreshが正常にrotationする分岐も検証 | 同bundleでの実際のiOS上書き更新、インストール前後の実ビルド証明 |

## 実装と安全境界

* `scripts/qa-autonomy/ios-auth-resilience-family.mjs`：正本チェックポイントの完全一致、テスト専有fixture、ケース別の物理ステップ要件と独立Native時間順証拠、ビジネス効果・否定条件、所有fixtureのcleanup。実Bridge非対応の操作を偽の `tap` / `fill` に置換せず、`makeIosAuthResiliencePlan` はケース固有の `REVIEWED_IOS_*_NOT_AVAILABLE` を送出する。
* `scripts/qa-autonomy/ios-auth-resilience-claim-d1.mjs`：既存 `qaReadOnlyD1Config`、専用DB UUID、RUNNING claim・端末serial・SELECT前後のclaim検証、独立fixture owner証明を再利用した新リーダー。`store_id='teat'`・社員・セッションIDにSQLを制限。refresh token/hash原文は出力せずSHA256 fingerprintのみ。**実際のremote SELECTは未実行**。
* `scripts/qa-autonomy/ios-auth-resilience-family.test.mjs`：5件の肯定契約、不正fixture、競合の順序逆転、古い401の遅延、timeoutの無限retry・残留spinner、session失効、更新のビルド不一致、cleanup失敗、偽D1/claimを検出するMock regression。
* `scripts/qa-autonomy/ios-source-contract-registry.mjs`：`IOS_SOURCE_PROVEN_GAPS` に当該5理由を追加。現行物理操作が不可能なSOURCE計画を「実機実行可能」として登録しない。

cleanupは各ケースのowned fixtureのみを対象とし、旧/新session無効化、Native資格情報消去、監査保持、他店舗不変更を要求する。016は追加WebViewと保留応答、017は保留応答、018/019は注入故障の解除を独立読戻しで確認する。020は正常更新されたAppバイナリをロールバックせず、テスト専有セッションを整理する。これらは**コールバック契約**であり、正式claim内で実行するNative cleanup担当は未接続。

## ソース回帰とハードウェア前提

* `node --test scripts/qa-autonomy/ios-auth-resilience-family.test.mjs scripts/qa-autonomy/ios-auth-session-family.test.mjs scripts/qa-autonomy/ios-auth-boundary-family.test.mjs scripts/qa-autonomy/ios-auth-family.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-831-stage-action-matrix.test.mjs scripts/qa-autonomy/ios-source-work-selector.test.mjs`：**48/48 PASS、exit 0**。`test-results/ios-auth-resilience-source-contracts-20261025.log`
* `node --test test/qa_v2_ios_claimed_bridge_test.mjs test/qa_v2_ios_persistent_fill_transport_test.mjs test/native_auth_test.mjs test/auth_client_regression_test.mjs`：**27/27 Node subtests PASS、exit 0**。内部個別検査 **112 NativeAuth、272 auth client** の成功も確認。`test-results/ios-auth-resilience-native-regression-20261025.log`
* 新規SOURCE SHA256：`ios-auth-resilience-family.mjs` `8919B954ABDC0D9B320C751238FA242910EFB6AE91FE7E43B00C6C483889380A`、`ios-auth-resilience-claim-d1.mjs` `A8DE97AEA339CF5077AD10D38F71F591DC8CB4B184CC915F6DE4CD12831F30C2`、`ios-auth-resilience-family.test.mjs` `A7B7F429B2A9A1C97EF702DB353E5EA6A6FF221BFC54F83BFE1CC110FA2912F3`。

正式物理QAにはiPhone実機、適合したインストール済みTestFlight build、DDI mount、HID、画面校正、現在のclaim、独立Native SecureStorage/runtime観測、HTTP応答順序のNative測定、独立D1 SELECT、fixture ownershipおよびclaim内cleanupが必要。今回の5件は上表のケース固有制御が既存iOS runnerに未実装で、**物理実行は未完了**。端末や配布状態に関する記述はSOURCE要件であり、実機観測を主張しない。

## 10視点自己点検（SOURCE観点、物理面はPENDING）

| 視点 | 照合・検証内容 | 結果 |
| --- | --- | --- |
| S01 正本 | 831件ID・legacy scenario/checkpointの一致と負例 | SOURCE PASS |
| S02 再現順 | 016/017の異なるWebViewと遅延HTTP、順序逆転の否定回帰 | SOURCE PASS、実機PENDING |
| S03 入力境界 | fixture IDのSQL注入拒否、bundle exact match、非法店・role拒否 | SOURCE PASS |
| S04 認証・tenant | owned employee/session、teat DB UUID、非owned/別店舗排除 | SOURCE PASS、remote PENDING |
| S05 故障・有限性 | 018/019の最大30秒、retry最大2、spinner/unsafe screen否定 | SOURCE PASS、故障注入PENDING |
| S06 状態不変/rotation | 016同一ID、017新session、018 D1不変、019runtime先行、020分岐 | SOURCE PASS |
| S07 iOS UI | 独立PNG SHA・ロード終息・UI login/retry/hub条件、実ジェスチャーは未装備 | SOURCE PASS、実機PENDING |
| S08 cleanup | owned限定/監査・他店保全、障害解除・追加WebView/応答整理 | SOURCE PASS、実cleanup PENDING |
| S09 回帰 | 新8/8、認証周辺48/48、Bridge/Native27/27、negative回帰 | SOURCE PASS |
| S10 変更保護 | 新3ファイルとSource gap registryのみ。共用アプリ/Backend、正式Manifest/D1不変更確認 | SOURCE PASS |

## 横展開10視点（既存呼出経路からの独立逆引き）

| 視点 | 既存契約との照合 | 結果 |
| --- | --- | --- |
| H01 Android | 両OS manifest・同型認証クライアントを照合。Android正式証拠は今回対象外 | SOURCE確認、Android QA PENDING |
| H02 Native iOS | `mobile-app/web/native-auth.js` の4500ms読/書タイムアウトとruntime優先、Native Secure plugin | SOURCE PASS、iPhone PENDING |
| H03 Web production | `mobile-app/web/api.js` とWeb同型のrefresh/401境界を確認 | SOURCE PASS |
| H04 Web TEST | `test/auth_client_regression_test.mjs` のproduction/test mirror・旧401保護を回帰 | SOURCE PASS |
| H05 関連Hub/UI | NativeAuth復帰、ログイン・Hub gate・pagehideの不変条件を確認 | SOURCE PASS、実画面PENDING |
| H06 API境界 | `src/index.js` / `src/gasApi.js` のrefresh/logout/checkToken両経路を逆引き | SOURCE確認、独立HTTP PENDING |
| H07 D1 | `migrations/0020_auth_sessions.sql` と `src/sessionTokens.js` の同一session rotationを確認 | SOURCE PASS、remote PENDING |
| H08 JA/EN | ユーザーに見える既存エラー/ログイン表示は変更なし。言語別物理表示検査は未実施 | 変更影響N/A、実機PENDING |
| H09 2View/旧401/更新 | 2 WebView、session id、更新後bundleを別観測にする契約を負例で確認 | SOURCE PASS、実機PENDING |
| H10 別経路から逆引き | Bridge `tap/fill` 制限→Registry明示gaps→831監査とSource dispatchの非実行を検証 | SOURCE PASS、正式QA PENDING |

現時点の状態は **SOURCE契約の実装・Mock回帰完了 / 物理Scenario Controller未実装 / formal QA NOT_RUN 5件**。SOURCEへの追加は配布版の増分・正式テスト件数として計上しない。commit/push/deployなし。
