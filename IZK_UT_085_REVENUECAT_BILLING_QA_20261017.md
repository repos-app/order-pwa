# IZK-UT-085 — Pro課金をテストフェーズで実行できる状態へ

**利用者の最新要件（2026-10-17）**：「既にテストフェーズ。課金機能の確認も必要。課金できる仕組みは既に必要」。先行の課金比較改善は **BILL-UI-20261017**（過去の暫定084と別担当の084レジ障害の重複を解消した改善管理項目）として残す。

## 結論・現行状態

**Native購入機能：LOCAL SOURCE ENABLED。模擬購入/復元8/8 PASS。実Storeの課金：EXTERNAL CONFIG BLOCKED。**

`mobile-app/web/config.js` の `BILLING_AVAILABLE` を **true** に変更。以前の「Pro購入は準備中のまま・比較だけ」は利用者の最新指示で上書きされた。購入/復元を押せる本来のSDK経路は利用可能になったが、実Apple/Google/RevenueCatアカウントの設定・商品・Webhookなしに動作済みとは見なさない。**本番配布、実端末課金、外部設定値の追加は今回していない**。

## ローカル実装（サーバーとの境界）

- iOS／Androidに既に `@revenuecat/purchases-capacitor@13.3.0` が組込み済み。`billing-native.js` の起動時にNativeプラットフォームを判定、ログイントークンを再確認し、**本人が登録オーナーの場合のみ** `getBillingIdentity({platform:'ios'|'android'})` を送信。
- `src/gasApi.js`→`src/subscriptions.js` にOS識別を貫通させ、iOS用 `REVENUECAT_IOS_PUBLIC_SDK_KEY`／Android用 `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` を個別返却。異OSのキーや従来の単一 `REVENUECAT_PUBLIC_SDK_KEY` へフォールバックしない。キー未設定は `configured:false`／`missing_revenuecat_platform_sdk_key` で明示。
- `billing-native.js` はサーバーのFree/Pro/legacyを受信し、既存Pro・legacyは重複購入画面を出さない。設定未完了・Native SDKなし・Offeringなしでは購入ボタンを出さず具体的なエラーを表示。SDKのconfigure完了で購入復元可能、実Offeringに商品が存在するときだけ購入可。
- 購入成功後も **端末内CustomerInfoだけでPro権限を付与しない**。既存RevenueCat Webhook→Control Plane→店舗D1 `store_plans` の検証が必要。期限切れのRevenueCat active行を `getBillingIdentity` がPro有効と誤表示しないよう、期間末日時を契約認可ロジックと一致させた。
- 比較画面では初月無料を無条件に約束しない（ストアが正式にトライアルを提供した場合のみ購入確認画面に表示）。Native以外・一般スタッフ・不正/未設定なSDKキーでは課金しない。サーバー確定プランの権限・他画面権限の扱いは不変。
- `scripts/qa-revenuecat-readiness.mjs` はソース・CloudflareリモートSecret**の存在名だけ**を読み取り専用チェックし、フラグ・端末SDK・Webhook・環境混在の不足を報告する。外部秘密鍵値は表示しない。

## 2026-10-17 Cloudflareの実際の不足設定（読み取り専用）

`node scripts/qa-revenuecat-readiness.mjs --remote` の結果：

| 対象 | 照会 | 状態 |
|---|---|---|
| Nativeコード（iOS/Android） | 購入フラグ/SDK/OS別SDK鍵を要求するコード | **READY LOCAL** |
| `teat` テナントWorker | iOS/Android公開SDKキー両方 | **未登録** |
| `yuwaku` テナントWorker | iOS/Android公開SDKキー両方 | **未登録** |
| Production Control Plane | `REVENUECAT_WEBHOOK_AUTH`／`REVENUECAT_WEBHOOK_SECRET` | **両方未登録** |
| 公開Router | `CONTROL_REVENUECAT_ENABLED` | **0（Webhook転送OFF）** |
| App Store Connect / Google Play / RevenueCat | Pro商品ID、価格、Current Offering、`pro` entitlement、sandboxテスター | **この環境から未照合** |
| 実機 Apple/Google課金→署名Webhook→D1反映 | 実購入＋復元＋解約＋期限切れ＋返金 | **未実施** |

**本番Workerの `AUTH_ENVIRONMENT=production` はWebhookで `PRODUCTION` イベントだけを受理する**。TestFlight／PlayテスターのRevenueCat `SANDBOX` 購入イベントは現行Production Control/店舗で409拒否となる。Production環境でSANDBOXを無条件許容しないこと。Sandbox購入を検証するには **独立したTEST Worker/D1/Controlルートとsandbox署名Webhook** が必要。Productionテナントでテストしたい場合でも本番Free/Pro課金権限と混ぜない明示境界が必須。

## 実課金E2Eを開始するための必須手順（外部アカウント管理者）

1. App Store Connect（bundle `com.izakanpai.commissionpos`）に自動更新サブスクリプションを設定し、Google Play Consoleにも対応する製品・テスター・テストトラックを作成。Apple／Google側の価格/地域/利用可能状態を確認。
2. RevenueCatのApple/Googleそれぞれのアプリを設定し、**異なるpublic SDK keys**、 entitlement `pro`、製品／Current Offeringを登録する。Apple/Google側製品IDとの完全一致を確認。
3. テスト用（Sandbox）Control/テナントへOS別公開キー、Webhook HMAC署名secretとAuthorization値を安全に登録する。RevenueCatのWebhook設定はSandboxに限定し、Serverの `AUTH_ENVIRONMENT=test` と一致させる。**Secret値をGit/チャット本文に貼らない**。
4. Test用RouterをSandbox Webhook転送ONにし、署名検証・customerIdルート・DB owner分離・冪等・EXPIRATION/REFUND/BILLING_ISSUEを確認する。Productionは外部設定・Sandbox隔離・QA受入完了まで有効化しない。
5. TestFlight SandboxとGoogle Playのlicense testerでオーナーアカウントからPro購入→RevenueCat Webhook→サーバーでPro有効→画面/保護機能が反映。更新・解約（期限まで有効）・期限切れ・復元・返金の順に実機QAを記録する。**テスト環境の外では実請求の可能性がある**ことを事前確認する。

RevenueCat公式仕様：[Capacitor](https://www.revenuecat.com/docs/getting-started/installation/capacitor)、[OS別SDKキー](https://www.revenuecat.com/docs/getting-started/configuring-sdk)、[Webhook HMAC+Sandbox分離](https://www.revenuecat.com/docs/integrations/webhooks)。

## 自己レビュー10観点（別々のコード/負例）

| No | 方法／確認結果 |
|---|---|
| S01 | Native config sourceでBILLING_AVAILABLE=trueを確認：PASS LOCAL |
| S02 | iOS SPM／Android Capacitor plugin配置を独立読込：PASS SOURCE |
| S03 | real `getBillingIdentity`でiOSキーとAndroidキーを別々に返す／クロス流用拒否：PASS VM |
| S04 | 旧単一SDKキーを流用せず未登録ならconfigured=false：PASS VM |
| S05 | real Native課金JSをChromeで読み、両OSモックでOfferings→purchasePackage→restorePurchasesを実行：PASS 2 OS |
| S06 | owner=falseでBilling Identity RPC・configure・購入ボタンが生成されない：PASS Chrome |
| S07 | Public SDK key未設定では購入不可能で不足設定の理由が表示される：PASS Chrome |
| S08 | Current Offering空では偽の商品を出さず、SDK構成済みなら復元可能：PASS Chrome |
| S09 | Server Proは有効期限切れの場合effective Freeとして返る：PASS VM |
| S10 | `node --test test/izk_ut_085_billing_qa_activation_test.mjs` 8/8、既存subscription integration27/27、比較UI7/7、構文/差分検査：PASS OFFLINE |

## 横展開10観点（OS／経路／失敗条件）

| No | 対象と結果 |
|---|---|
| H01 | iOS Capacitor Native SDK実組込みとiOS専用キー返却：PASS SOURCE／実機PENDING |
| H02 | Android Capacitor Native SDK実組込みとAndroid専用キー返却：PASS SOURCE／実機PENDING |
| H03 | Native Chrome UI模擬でiOS購入・復元各1回／無課金でD1未変更：PASS |
| H04 | Native Chrome UI模擬でAndroid購入・復元各1回／無課金でD1未変更：PASS |
| H05 | 一般スタッフが比較表を見られてもbilling identityや店の契約権限を取得しない：PASS |
| H06 | ブラウザ/PWAなどNative以外が購入ページへ来てもstore SDKを呼ばない：PASS |
| H07 | 既存Pro/legacyが重複購入/トライアル表示されない（旧084ブラウザ回帰）：PASS |
| H08 | Free・有効期限切れProのバックエンド結果が一致。Webhook経由の権限反映だけ許容：PASS SOURCE/VM |
| H09 | Production Control PlaneのWebhook HMAC設定/routeとSandbox拒否を現物照合：**CONFIG BLOCKED** |
| H10 | teat/yuwakuの必要Secret名をCloudflareから実取得、価格/Offerings/実端末と区別：**CONFIG BLOCKED／正式実機QA PENDING** |

**ソース実装の完了と、Store側の決済が実際に通ることは別**。新APK/IPAビルド、Git commit/push、Worker deploy、Webhook本番ON、テスターの実決済、公式QA受理はまだ行っていない。
