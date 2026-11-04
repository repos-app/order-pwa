# izakanpai 課金Sandbox・確定価格の復元（2026-10-17）

## ユーザー指示とソース境界

ユーザー：「はい、お願いします。ちなみに2の月額年額料金は既に決定済みです」。前チャットでの「Sandbox専用環境と働く日本語のiOS課金テストを優先する」への承認。**ストア掲載素材はテスト完了まで保留**。既存prod API/DB、他のQA担当、App Store公開、正式QA台帳は無変更。Git commit/push、Cloudflare作成/デプロイ、本物の請求・StoreKit Sandbox実購入は本件では未実施。

## 決定済み料金の復元（新提案ではない）

2026-09-24のizakanpai POS Pro確定価格を再取得（2026-09-27以前の引継ぎ記録にも記載）。

| 対象 | 日本 (JPY) | フィリピン (PHP) |
|---|---:|---:|
| Pro 月額 P1M | **¥1,980** | **₱499** |
| Pro 年額 P1Y | **¥19,800** | **₱4,990** |
| 初回無料トライアル | 月額のみ**1か月** | 月額のみ**1か月** |

年額は無料トライアルなし。ストアの有資格ユーザーだけに月額紹介特典を表示する。既存購読者や無料トライアル利用済みの方へ無条件に1か月無料を約束しない。JPYは整数最小単位、PHPはセンタボ（月額49900、年額499000）でローカル検査。ほかの国・通貨の価格は未決定。Apple/Google 商品IDは別途実登録が必要で、今回勝手に確定しない。

ファイル：`standards/mobile-subscriptions/v1/price-policy.json`・`price-policy-gate.mjs`・`price-policy-gate.test.mjs`。価格変更、試用期間を月額以外へ適用、誤JPY/PHP単位、国の増殖、別アプリEntitlementの混入を拒否する。

## 本番を使わない新Sandboxの実装準備

`sandbox-config.mjs`で**隔離Ingress／隔離Control Worker+Control D1／隔離Tenant Worker+Tenant D1**を生成。Worker名はすべて izakanpai-billing-sandbox- プレフィックス、テスト店舗は synthetic billingqa。秘密値や実顧客名をファイルに含めない。入口だけworkers.devを将来ONでき、Control/Tenantは外部からの直接アクセスを無効にする。本番版の`wrangler.hybrid-router-production.toml`は`CONTROL_REVENUECAT_ENABLED="0"`のまま。

```powershell
node standards/mobile-subscriptions/v1/sandbox-config.mjs --plan
# 異なる新しい二つのSandbox D1を別手続きで作成した後のみ、ローカルコンフィグの生成が可能
node standards/mobile-subscriptions/v1/sandbox-config.mjs --render <SANDBOX_CONTROL_D1_UUID> <SANDBOX_TENANT_D1_UUID>
```

上記renderは**Git ignored** `.tenant-provisioner/billing-sandbox/`に各Worker専用config/seedを保存するだけで、D1を作成したりデプロイしたりしない。同じD1 ID、既存Control/Platform/現行wrangler設定に記載のDB UUID、Production Worker名、AUTH_ENVIRONMENT=productionを拒否。次に安全な新D1の実作成、SQL Migration適用、Worker SecretとRoute設定、Sandbox RevenueCatとの連携が必要。SandboxのWebhookは別URLと別Signing Secretで管理し、Productionを一切有効化しない。

**さらに厳しいDB実験を実施**：`test/revenuecat_sandbox_sqlite_integration_test.mjs`はNodeの本物のSQLite engineに、control-plane/0001_control_plane.sql／tenant migrations 0001,0012,0015／独立Seedを適用。Controlには店舗の個人情報・store_plans表がなく、TenantにはControl registryがない。real `src/subscriptions.js`を呼んでPro付与・二重通知・REFUND・古いイベント・異店舗拒否を確認する。実Cloudflare D1へは接続しない。

## 働く日本語Sandboxの現状（Cloudflareに読取専用照会）

既存`HatarakuNihonGO/app/server/wrangler.sandbox.toml`は **hataraku-nihongo-sandbox-api**／専用 D1 **hataraku-nihongo-sandbox** を指し、`REVENUECAT_ENTITLEMENT_ID=hataraku_nihongo_pro`、iOS公開SDKキーは設定済、Android公開SDKキーは空。

Cloudflare Wrangler `secret list --config server/wrangler.sandbox.toml` の実行結果（終了コード0、Secret名だけを読み取った）：

| Secret | 判定 |
|---|---|
| SESSION_SECRET | 登録済み |
| REVENUECAT_WEBHOOK_AUTH | 登録済み |
| **REVENUECAT_SECRET_API_KEY** | **未登録** |

秘密値は**取得・表示・保存せず**、一覧の有無だけを記録。HNGのバックエンドはサブスク状態をRevenueCat REST APIで照合するので、適切なSandbox用キーの登録と通信テストが先決。2026-10-17にHNG `node server/test/server_test.mjs`（Server boundary tests OK）／`node --test scripts/physical-qa/hng-external-sandbox.test.mjs`（6/6 PASS）を実行。ただし同シミュレーションはSDK実決済なしで権限更新もしない。

## 実測と未検証

| 検証 | 結果 | 限界 |
|---|---|---|
| 価格ゲート（4価格・2通貨・月額トライアル） | **10/10 PASS** | Apple/Googleストア商品への登録は別 |
| 安全なSandbox config生成器 | **11/11 PASS** | Cloudflare RemoteへのWorker/D1作成なし |
| 2物理DB相当のin-memory SQLite + 実SQL | **6/6 PASS** | Cloudflare Remote D1接続は未確認 |
| 既存Webhook状態遷移試験 | **17/17 PASS** | RevenueCat実Webhook配送は未確認 |
| POSサブスク既存回帰 | **27/27 PASS** | 実StoreKit・Google Billingなし |
| HNG Server boundary / external mock | **PASS / 6/6 PASS** | 実StoreKit Sandbox購入未確認 |

**ローカルテストを「iOS/Androidストア課金が動いた」と呼ばない**。商品と価格の永続ID作成、Appleの対象国価格テーブル、1か月紹介オファー資格、本番に混入しないHMAC/Webhook、HNG SandboxサーバーAPIキー、iPhoneのTestFlight Sandbox実購入（復元・返金含む）はPENDING。

## izakanpai自己レビュー10巡（ソースとDB）

| No | 重点・方法 | 実際の結果 |
|---|---|---|
| S01 | 過去の料金記録と新price-policyを直接突合 | JPY/PHP、月額/年額4金額一致。PASS |
| S02 | JPY整数とPHPのcentavos換算を互いに独立した負例で比較 | PHP499を499セントと誤認しない。PASS |
| S03 | 月額だけP1M trial、年額に誤適用したテストを投入 | 無効な年額trialを拒否。PASS |
| S04 | 実RevenueCat entitlement proと他アプリ契約IDを交差投入 | 誤entitlement拒否。PASS |
| S05 | Apple/Google商品IDの未確定を実設定済みと判定しないか | 商品ID null維持、別アプリ商品流用なし。PASS SOURCE |
| S06 | 既存wrangler Control D1/Platform D1 UUIDのデータ横流用 | 構成生成器で拒否。PASS |
| S07 | 追加済みwrangler設定から既存DB IDsを自動探索 | QA/Production既存IDの使い回し拒否。PASS |
| S08 | Worker公開経路と直接Control/Tenant露出を分けて確認 | ingressのみworkers_dev可、Control/Tenant不可。PASS SOURCE |
| S09 | 実D1 schemaのテーブル・外部キー・トリガーをメモリSQLiteで適用 | Control/Tenant分離とroute ID改変拒否。PASS |
| S10 | real webhook+DB SQLとリトライ／返金／古い通知をまとめて独立実行 | 新規SQLite6/6・Lifecycle17/17 PASS |

## izakanpai横展開レビュー10巡（独立入口）

| No | 入口→依存→結果 |
|---|---|
| H01 | Android Nativeから`getBillingIdentity`→OS別SDKキー。Androidストア商品は未登録、独立検証PENDING |
| H02 | iOS Nativeから`getBillingIdentity`→Apple用公開キー。Apple実商品は未登録、独立検証PENDING |
| H03 | Web/PWA Billing UIから非Native購入抑止を既存モックで参照。LOCAL PASS |
| H04 | Production hybridPublicRouter→CONTROL_REVENUECAT_ENABLED=0を実設定読取り。SANDBOXのみON予定、SOURCE PASS |
| H05 | Control Planeのbilling_customer_routes/tenant_registryの実SQL schema→異店舗拒否を実SQLiteで確認。PASS |
| H06 | Tenant D1 のstores/owners/plans/billing_customers/subscription_state→Pro/Free実SQL。PASS |
| H07 | HNG個別RevenueCat entitlement/公開SDKキー→izakanpaiプロジェクトと別であることを台帳で照合。PASS SOURCE |
| H08 | HNG別Cloudflare Sandbox専用D1→Secret存在だけをリモート取得。サーバーREST key欠落が判明（EXTERNAL BLOCKED） |
| H09 | できたCalendar Premium/親専用UI→共通価格表を流用しない。PASS SOURCE、保護者実機PENDING |
| H10 | 既存課金ライフサイクルの全経路を別のテストSuiteから再検証。LOCAL PASS、実StoreKit/RevenueCat S2SはPENDING |

ユーザーが希望する「Sandbox専用Worker・D1実配備とRevenueCat設定」へ進む場合、**専用D1を新規作成し、Workerを3つデプロイする操作について別途明示承認**が必要（現行マスターのproduction/shared環境変更の安全ゲート）。それまで構成・価格台帳・テストの準備を保全し、既存稼働サービスへの影響をゼロにする。
