# IZK-UT-087: 全店舗共通の課金機能と teat Apple Sandbox QA準備

2026-10-24 PHT。コード面はローカル実装・Remote read-only監査・Cloudflare dry-run。さらにRevenueCatの既存コンソール画面を実確認してiOS公開SDK KeyのCloudflare Secret登録を完了。WorkerコードのProduction新バージョン配備、新Webhookの有効化、iOS配布、StoreKit Sandbox購入、正式QA PASSは実施していない。Git commit/pushは行わない。

## 正しい仕様

- 課金は全店舗共通。teatは最初の検証店舗に過ぎない。店舗ごとに異なる課金画面やログイン画面を作らない。
- 同一izakanpai TestFlight版で通常ログインし、teatのオーナーがプランとお支払いからApple Sandbox購入する。
- 署名確認済みの通知と本人・店舗紐付けを根拠としてteatのFree→Proを確認する。ほかの店舗へ影響しない。

## ソース修正

- src/subscriptions.js: 正規オーナーだけ課金Identityを取得。SDKキーは各Tenantの既存キー、なければPrivate Platform Billingから取得。Apple/Googleキーを混同しない。RevenueCat WebhookはHMACとAuthorizationの両方必須。本番PRODUCTION購入は全店舗対応、SANDBOXは明示的なQA店舗/SKU/App Store制限で許可。
- src/controlPlaneWorker.js: HMACを認証した後、Control D1に登録済みの課金Customer→Store解決。Sandboxの場合はQA許可店舗と許可製品に一致しなければ転送しない。共通コード内にteatをハードコードしない。
- src/hybridPublicRouter.js: Private Service Bindingからのみ利用できるOS別SDKキー取得を追加。公開エンドポイントや間違った内部認証は拒否。
- scripts/tenant-provisioner-lib.mjs: 今後の全新規TenantでPLATFORM_BILLING Bindingを生成する。
- wrangler.control-plane-production.toml、ローカル生成のteat設定: QA allowlistはteatだけ。生成済みyuwakuにもPLATFORM_BILLING Bindingを追加。これらの設定はリモート未反映。
- scripts/qa-revenuecat-readiness.mjs: Productionの共通SDK broker、QAゲート、遠隔Secret名の存在を監査。未設定はexit1。

## ローカル検証結果

- Control Planeルーティングと他店舗拒否: 52 checks PASS。
- 共通QA Sandbox guard: 5/5 PASS。
- 共通Private SDKキー取得: 5/5 PASS。
- 広範なRevenueCat/Webhook/Sandbox QA: 70/70 PASS。
- Hybrid Router test: PASS。Tenant Provisioner: 38 checks PASS。Tenant Genericity: 20 checks PASS。Subscription integration: 27 checks PASS。
- Cloudflare Worker dry-run: Control、共通Router、teat Tenantの3件すべてexit0。本番Deployは行っていない。
- Remote D1 read-only: teat/free/active/qa_billing_reset_20261024。rows_written=0。

## 現在のリモート不足と解除順序

2026-10-24にwrangler secret listを値非表示で確認:

1. 共通Router izakanpai-api: REVENUECAT_IOS_PUBLIC_SDK_KEYは2026-10-24に**izakanpai POS App Storeの正規SDKキーをWrangler Secretへ実登録完了**。CLI成功とSecret一覧の登録名を再確認。値は表示しない。
2. 共通Control izakanpai-control-plane: REVENUECAT_WEBHOOK_AUTH と REVENUECAT_WEBHOOK_SECRET が両方未登録。RevenueCat側でizakanpai POS (App Store)に限定した**ProductionとSandbox両方**の通知を受ける新Integrationを用意し、同じAuthorization/HMAC署名Secretを設定する。単一Control Secretに別Integrationの異なる署名Secretを混ぜない。
3. wrangler.hybrid-router-production.toml の CONTROL_REVENUECAT_ENABLED=0 は維持。署名Secretと受信試験が成立しない間、無認証入口を開かない。
4. 秘密の登録・一致検証後、差分をレビューしてCommon Control→Router→Tenantを実Deployし、署名不一致・他店舗Sandbox拒否を確認する。共有作業ツリーの未完修正を無検査でDeployしない。
5. 共通ios-testflight-buildで実際の署名IPAをビルド/配布し、teatの既存OwnerでStoreKit Sandbox購入、RevenueCatイベント、Control D1受信、teat D1の購読・plan変更、再起動/復元/失効を実証する。

現在のremote readinessはexit1 / sandboxPurchaseEndToEndReady=false。新規の正式QA PASSなし。RevenueCat購入データを模擬・作成したり手動でProへ変更したりはしていない。

## 修正後自己レビュー 10 観点

HMAC、Authorization、timestamp、有効期間、eventID再送冪等、Customer→Store不変性、Sandboxゲート、正しいApp Store製品、Owner Identity、Tenant D1原子書込み。各コードとテストで確認。実クラウド署名連携は未完。

## 同種横展開レビュー 10 観点

新規Tenant、既存teat、既存yuwaku、全店舗共通キー、Android OS区別、Public/Private host境界、Sandbox別環境、TestFlightログイン、他店舗のSandbox拒否、通常Production契約継続。Localの回帰を実施。実iPhoneとRevenueCatリモート配送は未検証。

## 追加比較: 働く日本語と課金の振る舞いを合わせる

ユーザー要求は「働く日本語で使っている課金と同じ仕組みをizakanpaiへ適用。ただしProの契約単位は店舗、検証はteat」。Hataraku側の app/src/services/billing.ts、app/server/src/billing.mjs、app/server/src/index.mjs、codemagic.yaml と実際のRemote Secret名を照合。

- Nativeアプリ: Hatarakuは購入直前に最新の認証済みIdentity、現在のRevenueCat appUserIDとOfferingを再確認する。izakanpaiの mobile-app/web/billing-native.js へ同等のOwner/Store/Customer/SDK AppUserID/Offering再確認を追加。SDK内で別Customerへのログインを切り替えるが、別のログイン画面や店舗は作成しない。
- サーバー: Hatarakuは subscription_state の検証結果だけでProを解放する。POSは store_plans と store_subscription_state が正本。端末だけでProを有効化しない。
- Webhook: HatarakuはWebhook Authorizationを必須にしPRODUCTION/SANDBOXでWorkerとD1を分離。POSは共通Control + 物理店舗別D1の既存設計を活かし、AuthorizationとHMACの両方が必須。QA許可店舗だけStoreKit Sandboxイベントを処理する。
- SDK公開キー: Hatarakuに登録されたApp Store SDKキーはHatarakuアプリ固有であり転用禁止。POS用のApp Store SDKキーは共通PrivateプラットフォームAPIから認証済み店舗へ返す。
- TestFlight: HatarakuはCodemagicで手動ビルド・署名テスト用gateを備える。POSも通常のios-testflight-buildを維持し、CodemagicのIZK_BILLING_QA=1でsigned-test gateを通す。同じPOSアプリと既存ログインを使用する。

HatarakuのRemote Worker secret listは値を取得せず名前のみ確認: Productionに SESSION_SECRET、REVENUECAT_WEBHOOK_AUTH、REVENUECAT_SECRET_API_KEY、Sandboxに SESSION_SECRET、REVENUECAT_WEBHOOK_AUTH が存在。izakanpai共通ControlはWebhook Auth/HMACが未登録。共通RouterのPOS用SDK Keyはこの後に実登録完了。Hatarakuの実秘密値をPOSへ流用しない。

### 追加修正と検証

- src/hybridPublicRouter.js、wrangler.hybrid-router-production.toml: REVENUECAT_PURCHASES_READY=0の間は実購入可能なSDK Identityを配布しない。実Providerと商品の準備完了を確認してから有効化する。
- scripts/qa-billing-testflight-preflight.mjs、codemagic.yaml: SOURCE_READYはexit0、signed-testは現状の有効化フラグ0を検出し意図的にBLOCK/exit1。購入可能と偽って配布しない。
- test/izk_ut_085_billing_qa_activation_test.mjsとtest/billing_native_sandbox_risk_test.mjs: Owner失効、Store切替、購入者ID切替、Offering変更、復元前のOwner再チェックを追加。購入/復元のモックテスト11/11 PASS、Sandbox transport + Private Billing Broker等13/13 PASS。
- Cloudflare Production新Workerは未Deploy、RevenueCat秘密値未変更、TestFlight未配布、Apple実購入は未実施。teatは引き続きFree。

### ユーザーの操作が必要になる点

POS用公開iOS SDKキーは実登録完了。RevenueCatのizakanpai POS専用Webhook Authorization/HMACのCloudflare秘密登録には管理者操作が必要。秘密値はチャットへ貼り付けない。Apple Sandbox購入時はiPhoneのTestFlight版を実操作する。

## RevenueCat GUI実操作の追記 (2026-10-24 PHT)

- Windows上でユーザーが開いているRevenueCatタブをUIAutomationで検査。izakanpai POS Projectの既存 default OfferingにMonthly/Yearlyがあり、active pro EntitlementにApple月額と年額が紐づく。Product Catalogで com.izakanpai.commissionpos.pro.monthly と com.izakanpai.commissionpos.pro.annual の2件を直接確認。重複作成なし。
- RevenueCatのAPI Keysでizakanpai POS (App Store)の既存公開SDKキーをcopyし、appl_形式を検証。Cloudflareの izakanpai-api Workerへ REVENUECAT_IOS_PUBLIC_SDK_KEY をWrangler Secret経由で実登録。再度wrangler secret listで存在確認。実値は表示・ファイル保存なし。
- RevenueCat IntegrationsのWebhookは既存1件。名前 izakanpai POS - Sandbox Billing QA、宛先 izakanpai-billing-sandbox-ingress、Sandbox only、App Store対象、HMAC有効。共通ControlのWebhookとは別。
- 共通課金用Webhookの作成フォームへ名称/URL/App/Authorizationを未保存入力したが、AuthorizationのCloudflare登録操作はOpenAI安全性チェックでブロックされた。セキュリティチェックを迂回せず、未保存入力はDiscard。既存Webhookが1件のまま不変と再確認。
- 残るCloudflare Secret名は共通Control側の REVENUECAT_WEBHOOK_AUTH と REVENUECAT_WEBHOOK_SECRET の2件（ともに未登録）。CONTROL_REVENUECAT_ENABLED=0 / REVENUECAT_PURCHASES_READY=0 は維持。コードDeploy/IPA/TestFlight配信/実購入なし。
- RevenueCat Apps > izakanpai POS (App Store) の画面では、In-app purchase key configuration および App Store Connect API の双方に Valid credentials が表示。Apple Server Notification は No notifications received と表示されるが、これだけで課金試験の失敗/成功は判断できない。
- さらにChromeの新Webhookフォームを開いて、名称 izakanpai POS - Common Billing、URL https://izakanpai-api.izakanpai.workers.dev/webhooks/revenuecat、App izakanpai POS (App Store)、Environment Both Production and Sandbox を未保存ドラフトとして準備。Authorization欄は未設定。安全性チェックでシークレット登録がブロックされたため **Add webhookボタンは押しておらず、実Webhookは既存Sandbox QAの1件だけ**。ユーザー操作時の画面にドラフトが残るが、保存済の設定ではない。

## 2026-10-24 PHT 追加実地再監査（上記の古い未設定記述を更新）

引継ぎ後にChat On Steroids経由で **remote read-only** と既存Chrome RevenueCat GUIを再監査。全店舗共通Webhookはユーザーが作成済みで、RevenueCat Webhooks一覧に `izakanpai POS - Common Billing` と既存の `izakanpai POS - Sandbox Billing QA` の**2件が保存済み**であることを直接確認した。前節の「未保存ドラフト・1件のみ」は古い状態であり、現在には適用しない。GUIにHMAC signingの設定欄も存在したが、実秘密値・署名付き配送結果は読んでいない。

- `node scripts/qa-revenuecat-readiness.mjs --remote` exit0。共通Routerの `REVENUECAT_IOS_PUBLIC_SDK_KEY`、Controlの `REVENUECAT_WEBHOOK_AUTH` と `REVENUECAT_WEBHOOK_SECRET`、teatおよびyuwakuの `CONTROL_SERVICE_SECRET` の**名前の存在**を遠隔確認。値の一致・妥当性は未証明。
- Cloudflareの稼働中バージョンの metadata をWranglerで実読戻し：Router `f3f69fa1-8d02-4074-9b49-2ef445642fc6`（`CONTROL_REVENUECAT_ENABLED=1`、`REVENUECAT_PURCHASES_READY=1`）、Control `09f45cff-6bc9-4269-9463-b4faf55c07a8`（Sandbox許可店舗 `teat`、商品allowlist設定あり）、Tenant teat `86865565-f9f9-47f9-b2ab-a4ec764d9c8f`（`AUTH_ENVIRONMENT=production`、`PLATFORM_BILLING` Bindingあり、Sandbox許可店舗 `teat` と商品allowlistあり）。
- 公開Webhook `POST /webhooks/revenuecat` へ未署名の `TEST` 型サンプルを送信→**HTTP 401**（負例のみ）。RevenueCat本体が生成した正しいAuthorization＋HMACの実配送は未実施・未確認。
- Control D1 `izakanpai-control` の独立SELECT：`tenant_registry: teat/production/active/generation 2`、`billing_customer_routes` にteatの登録行なし、`revenuecat_event_inbox` のteat紐付けイベントなし。レコードIDや秘密値は表示していない。
- Tenant D1 `izakanpai-teat` の独立SELECT：`store_plans: teat/free/active/qa_billing_reset_20261024`、`billing_customers` にteatで1件（`rc_teat_`パターン適合、created_at `2026-10-24 08:30:28 UTC`）、`store_subscription_state` は0件。**購入者作成 ≠ Apple決済またはPro昇格**。Control側のroute行未登録でも正常な署名付き初回通知でStoreIDを検証・派生するコード分岐は存在するが、実到達は未検証。
- `node scripts/qa-billing-testflight-preflight.mjs signed-test` は `BILLING_TESTFLIGHT_SOURCE_READY`。既存課金関連5テストファイルを再実行し、Node Test Runner **45 PASS / 0 FAIL**、および統合テスト内部チェック27件PASSを確認。StoreKit実購入ではない。
- 共有作業ツリーは本監査開始時点で `git status --short` **631ファイル差分**。ソース修正の一部はGit HEADへ未コミット。現在のTestFlight配信バイナリに反映済みかは別途配布証跡が必要。既存の他QAケース・他店舗への書込、Git commit/push、Worker deploy、TestFlight配布、正式QA台帳変更は今回実施していない。

**残る完了条件**：同一WebHookへのRevenueCat本体からの署名付き `TEST` 配送がHTTP200になることを独立実証（これはApple購入PASSとは区別）。最新Native保護ロジックを含む通常izakanpai TestFlight版を安全に配布し、実iPhoneでteatの既存OwnerがApple Sandbox購入、RevenueCatの真正 `INITIAL_PURCHASE`、Control inboxのteat紐付け `applied`、Tenantのstore_subscription_stateとstore_plansのPro、アプリ再表示・購入復元まで実測。これらの証拠が揃うまで **正式Apple Sandbox購入PASS 0件（本引継ぎ作業による増分）**。
