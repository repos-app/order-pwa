# izakanpai POS — Cloudflare課金Sandbox 実配備・実通信結果（2026-10-17）

## 追記（2026-10-17 15:47 PHT以降）：RevenueCat HMAC SecretのCloudflare反映を確認

ユーザーがCloudflareへ署名Secretを登録したことを連絡。Wranglerの **version list と deployment list を値非表示で照合**し、`REVENUECAT_WEBHOOK_SECRET`のDashboard更新が **2026-10-17 07:47:02Z（15:47 PHT）**、更新後Version `2b9f919a-7beb-48f2-b55e-28a6abfc0563`が **100%配備済み（07:47:03Z）**と確認。

古いローカル合成HMACキーを使う正規形式の署名（`TEST`イベント）を隔離入口へ送ると **HTTP 401**、無署名/改ざん署名も401、非Webhook APIは404・GET webhookは405を確認。従って旧HMACから別キーへの更新と旧キー拒否は確認できた。**Secretの値そのものを読み出せないため、Cloudflareの新キーがRevenueCatの署名キーと一致することの最終証拠は、RevenueCat本体から実配送した`TEST`イベントのHTTP 200である。こちらは未実施/未確認。**

安全運用のため`sandbox-remote-smoke.ps1 -ExpectHmacRotation`を新設。旧合成HMACが有効でないことだけを検証し、旧署名で購入/返金の再送はしない。通常モードも`revenuecat-hmac-external-managed.flag`が存在すれば購入試験を停止する。本章以下の **HMAC署名Secret同期PENDING** は作業時点の記録であり、今回の追記により **Cloudflare側反映は確認済み／RevenueCat実配送E2EはPENDING** に更新する。

**次の1ステップ**：RevenueCatの対象Webhook設定画面で `Send test event`（または`Test webhook`）を実行し、Delivery履歴の `TEST` がHTTP 200であることを確認。異なるストア/本番は対象にしない。`TEST`の受理だけで有料Pro付与や実課金成功とは判定しない。後でControl D1の`revenuecat_event_inbox`にTESTイベントが記録され、合成店舗`billingqa`のプランがFreeのまま維持されることを読み戻す。

## 実際に行ったこと

利用者が、専用D1 2件・専用Worker 3件の新規作成とデプロイを明示許可。**ProductionのWorker/D1/Secret/Service Binding/既存店舗には一切書き込んでいない**。新規リソースだけ作成・初期化・テスト。Git commit/push、正式実機QAのclaimや台帳変更、ストア公開、実課金なし。

| 隔離リソース | 実体・結果 |
|---|---|
| Control D1 | izakanpai-billing-sandbox-control-db / `14002180-c4df-4873-b17a-8ededd002d7c` (APAC/SIN) |
| 店舗D1 | izakanpai-billing-sandbox-tenant-db / `5e181dd1-3212-404f-a5e5-552b3999e00b` (APAC/SIN) |
| 非公開Control Worker | `izakanpai-billing-sandbox-control` / D1 Control DBと `TENANT_BILLINGQA` Binding |
| 非公開店舗Worker | `izakanpai-billing-sandbox-tenant` / D1 Tenant DB、`TENANT_ID=billingqa` |
| 公開Webhook専用Worker | `izakanpai-billing-sandbox-ingress` / CONTROL Bindingだけ |
| テスト入口 | https://izakanpai-billing-sandbox-ingress.izakanpai.workers.dev/webhooks/revenuecat |
| Synthetic Store / Customer | `billingqa` / UUIDを含む `rc_billingqa_...` の合成顧客1件（実顧客データなし） |

Control DBに`control-plane/0001_control_plane.sql`（15 statements）、店舗DBに`migrations/0001_init.sql`（57）、`0012_app_workspaces.sql`（3）、`0015_revenuecat_subscriptions.sql`（4）をremote適用。独立fixture `billingqa`・freeプラン・owner/employee・billing customerを作成。RemoteでControl registry `billingqa/test/TENANT_BILLINGQA/active` とTenant `billingqa/free/beta` を直接読戻し。

## 安全設計の追加修正

初期の公開Ingress案`src/hybridPublicRouter.js`をそのままWebHook公開すると別の管理APIを開ける可能性があると発見。**専用`src/billingSandboxIngress.js`を追加**して、外部からはPOST `/webhooks/revenuecat`だけを受け付け、Body上限64KiB、余分なHTTPヘッダをControlに転送せず、Service Binding先を`https://control.internal/webhooks/revenuecat`に固定。Control/Tenantはworkers_dev=false、Ingressだけworkers_dev=true。3WorkerともWrangler dry-run成功後に実デプロイ。

共有`CONTROL_SERVICE_SECRET`はControl/Tenantのみ、HMACとAuthorizationはControlのみへ登録。Windows DPAPIでユーザーのプロファイルに閉じたファイル `.tenant-provisioner/billing-sandbox/protected-webhook-secrets.dpapi.json`（gitignored）を使用。Secretの本文はログ、コード、Git、資料には保存しない。

## 実際にCloudflareへ送った検査

PowerShell 5.1から`sandbox-remote-smoke.ps1`を、別の合成イベントIDで実行。

| 実経路 | HTTP / DB実測 |
|---|---|
| GET / | HTTP 404 |
| GET /webhooks/revenuecat | HTTP 405 |
| POST /internal/operator/delete | HTTP 404 |
| POST webhook unsigned | HTTP 401 |
| POST webhook invalid HMAC | HTTP 401 |
| POST Sandbox INITIAL_PURCHASE（HMAC+Auth） | HTTP 200 / 店舗D1にPro反映 |
| 同じ event.id の再送 | HTTP 200 / `duplicate=true`、冪等 |
| POST Sandbox REFUND（HMAC+Auth） | HTTP 200 |
| 返金後のremote D1 readback | `billingqa / free / canceled / revenuecat`、provider canceled / SANDBOX |
| remote Control inbox readback | `applied` 3件（初回1件＋再実行した購入・返金） |

初回のPowerShell smokeは初回購入HTTP200直後、`Set-StrictMode`下で任意応答フィールド `ignored` を無条件参照したため**テスト側の例外で途中停止**。remoteでPro反映を読戻した後、任意フィールド有無の判定を修正し**再実行を全ステップPASS**。不具合を隠して最初から全PASSと記録しない。

ローカル回帰：`node --test test/billing_sandbox_ingress_test.mjs standards/mobile-subscriptions/v1/sandbox-config.test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs standards/mobile-subscriptions/v1/price-policy-gate.test.mjs` **33/33 PASS**。Android/iOS正式Runner証拠への昇格不可。

## RevenueCatプロジェクトの設定（追加で実施）

RevenueCatの**izakanpai POS**（既存Project `7fcf50db`）に、App Storeアプリのイベントだけを受信するWebhookを新規作成。

| 設定 | 事実 |
|---|---|
| Webhook ID | `whintgr7670c16a83` |
| Webhook name | `izakanpai POS - Sandbox Billing QA` |
| 配送先 | 上記Sandbox Ingress HTTPS URL |
| Environment | **Sandbox only**（Productionイベントを配信しない） |
| 対象App | **izakanpai POS (App Store)**（Test Storeや全Appへは送信しない） |
| Authorization Header | Cloudflare Controlの専用Secretと一致するよう設定済み、値は非表示 |
| HMAC signing | **RevenueCat UI上でON**、署名Secretが「一度だけ表示される」モーダルが開いている |
| HMAC secretのCloudflare反映 | **PENDING**。Cloudflare側には事前合成テスト用Secretが残り、RevenueCat生成Secretとは異なる。現在のままの実RevenueCat通知はHMAC不一致でHTTP 401となる |

**要ユーザー操作、PCのRevenueCatモーダルを閉じないでください**：

1. モーダル内の「Signing secret」右端のコピーボタンで、RevenueCatが発行したキーをコピー。
2. Cloudflare Dashboard → Workers & Pages → `izakanpai-billing-sandbox-control` → Settings → Variables and Secrets で、`REVENUECAT_WEBHOOK_SECRET`を**そのキーに更新**。Control/Tenantの`CONTROL_SERVICE_SECRET`と`REVENUECAT_WEBHOOK_AUTH`は変更しない。あるいはrepo rootから`npx wrangler secret put REVENUECAT_WEBHOOK_SECRET --config .tenant-provisioner/billing-sandbox/wrangler.control.toml`でプロンプトに貼り付ける。
3. Cloudflareに保存されたことを確認してRevenueCatモーダルの「Done」。**Secretをチャット・スクリーンショット・Git・Markdownへ貼らない**。
4. この後は`sandbox-secret-init.ps1`をそのまま再実行して古い合成キーで上書きしない。`revenuecat-hmac-external-managed.flag`でHMACの再上書きは抑止済み。合成用remote-smokeは古いDPAPIキーを参照するため**再実行しない**。新署名に合わせて別途手動/API安全検査の経路を用意してから実施。

RevenueCat公式WebhookとHMAC仕様：https://www.revenuecat.com/docs/integrations/webhooks

## 10観点自己レビュー（ソース・配備証拠）

| ID | 別の検査入口 | 実測と境界 |
|---|---|---|
| S01 | remote D1 list →名前・既存IDの衝突検出 | 既存ユーザーDBと違う新規2 UUIDを採用 |
| S02 | 作成したUUIDをsandbox-configのproduction deny listで再検証 | 既存各Wrangler IDsと同一DB/異worker名の誤接続なし |
| S03 | 3WorkerのWrangler dry-runバンドル実行 | 全3成功、実BindingsがSandbox専用なのを確認 |
| S04 | Ingressに/通常APIと/internal/operatorの攻撃系URLをPOST | 404、Controlへ進ませない |
| S05 | Ingressを非POST・Body長超過で呼ぶ負例 | 405・413を6件の独立ローカルテストで確認 |
| S06 | Cloudflare Secretの値ではなく**名前一覧**で検証 | Controlに3件、TenantにControl shared 1件、secret内容非公開 |
| S07 | 無署名・改ざんHMAC実HTTP送信 | 共に401、課金状態の変更なし |
| S08 | 合成購入署名付きWebhook→Control→Tenant→D1 | 200、Proへ変化をremote D1読戻し |
| S09 | duplicate event ID同一署名のリトライ | 応答duplicate=true、二重付与なし |
| S10 | REFUND→remote D1の状態逆引き | free/canceled/SANDBOXへ戻った。実ストア購入ではない |

## 横展開10観点（分離・既存画面・アプリ）

| ID | 逆引きした境界 | 結果 |
|---|---|---|
| H01 | Production Hybrid Router設定 `CONTROL_REVENUECAT_ENABLED=0` | 既存設定未変更 |
| H02 | Production Control D1 のDB IDと新Control D1 | UUID異なる、新DBだけSQL適用 |
| H03 | teat/yuwakuの店舗DB IDと新Tenant D1 | UUID異なる、店舗本番データなし |
| H04 | Cloudflareの他サービスD1 (HNG/KuraPinas等)と新2DB | D1 listから隔離確認、他リソース変更なし |
| H05 | Tenant Workerの`src/index.js`内部パス→Control Header | `tenant.internal/internal/revenuecat`、共有Secret照合後のみ処理 |
| H06 | Control Workerの`src/controlPlaneWorker.js`→route_key/tenant generation | `TENANT_BILLINGQA`だけへ、環境=testのテスト店舗 |
| H07 | Webhook HMAC→Raw body/環境/店舗IDの3段防御 | 正常Sandboxと無署名/改ざんを実HTTPで比較 |
| H08 | RevenueCatのプロジェクトと他Appの独立課金 | izakanpai POS project/appにSandbox only integration作成、他アプリ対象外 |
| H09 | 価格台帳JP/PH月/年額の既存決定 | 価格/商品IDに変更なし、実ストア販売未開始 |
| H10 | RC HMAC生成SecretとCloudflare現行Secretの照合可否 | **外部連携BLOCKED**、Secret同期を完了するまで実RevenueCat配信E2EをPASS扱いしない |

上記は**コード・Cloudflare isolated実通信**の10観点/10横境界調査であり、独立10巡の全体差分自己レビューを完了したという虚偽の主張はしない。Google/Apple実機、RevenueCat SaaSからの実Delivery、正式QA Runner、再起動／リストア/返金のStore側動作は別の正式証拠としてPENDING。

## 次の依存

- RevenueCat署名SecretのCloudflare手動同期（**最優先**）。
- 同じRevenueCat設定画面からTest webhookを送る場合は、合成fixtureと別の不明顧客イベントを受けてもPro誤付与がないこと、署名・Authorization・Sandbox環境を確認する。RevenueCat SaaS Deliveryの結果を記録。
- izakanpai App Store Connectの既に決定した月額/年額商品を実登録し、RevenueCat Offeringへ接続。iOS StoreKit Sandbox実購入・復元・期限切れ・返金はその後。
- iPhoneのSandbox課金テストに必要な**Sandbox用ログイン/APIホスト**はWebhook専用Ingressと別構成。現Ingressは一般APIを公開しないため、これだけでは実機購入のサーバー権限連動QAに入れない。
