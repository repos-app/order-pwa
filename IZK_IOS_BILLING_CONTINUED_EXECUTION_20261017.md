# izakanpai POS iOS課金｜22:23以降の追加実行・正本（2026-10-17）

## 判定（公式QAと開発証拠を分離）

**完了**：ControlのTenant ACK誤判定修正、同一Apple商品内の異原取引REFUND/EXPIRATION/BILLING_ISSUE誤失効を防ぐローカル修正、隔離Tenant D1の追加列移行、隔離Tenant/Control Workersへの新ソース適用、Owner専用最小APIのソース準備、総合オフライン再検証。

**未完了**：Apple StoreKit Sandboxによる本物の購入と購入者Identity生成、TestFlightビルドの隔離API接続、プロビジョニング済みOwner実セッション、Webhooks本購入→2つのD1の正式反映。**正式iPhone QA PASS 0件、FAIL 0件**。RevenueCat Test Storeの結果と混同しない。App Store審査提出、本番公開、掲載素材登録なし。

## 1. Control：2xxの偽適用防止（本件で再現・修正）

- 原因：`src/controlPlaneWorker.js`はTenantへの配送がHTTP 2xxであれば、本文が`{ok:true,ignored:'unknown_customer'}`でも、`{ok:false,error:...}`でもControl D1 `revenuecat_event_inbox` を`applied`と記録してしまう。購入者ルートがControlにあってもTenant側が未準備のとき、正常なRevenueCat購入通知の再配送・Pro反映が永久に失われる可能性。
- 修正：Tenant応答の**clone**をJSON解析する。登録不整合の`ignored:'unknown_customer'`はControl D1 `status=failed,last_error=tenant_unknown_customer`として**503**再試行、本文`ok:false`は`failed/tenant_application_rejected`として**502**。正当な`ok:true`は従来どおり、元のResponseを保持。署名/店舗ID/route generation/claimとスキーマ変更なし。
- 前失敗：追加の再現テストを実装した直後、`node test/control_plane_routing_test.mjs` **exit1**（unknown customer 200が誤適用されるassertion）、続いて`ok:false` 2xxも**exit1**を再現。
- 修正後：`node test/control_plane_routing_test.mjs` **48/48 checks PASS、exit0**。`node --check src/controlPlaneWorker.js`と`git diff --check`はexit0。現行ソースSHA-256 `E8D9C2024E63BA71967BC5ACA8CA1FC7B57FD587CA5187CEFC19E41EC052C300`。
- Control worker配備：隔離`wrangler.control.toml` `AUTH_ENVIRONMENT=test`、Control DB `14002180-c4df-4873-b17a-8ededd002d7c`、非公開Workerの3 bindingだけでdry-run **exit0**。isolated deployコマンド **exit0**、Remote `Version 5ec46733-a676-45f4-a1c4-e4ef40b54273` **100%反映**（2026-10-17 14:32:20 UTC）、Webhook HMAC Secret名再読戻しで維持確認。公開Ingressに無署名POSTを送り**HTTP401**確認。**修正後の同一イベント競合または真正RevenueCat SaaS配送再試験はRemoteでは未実施**。Apple本物の通知のPASSとは判定しない。

## 2. 異original transactionの誤返金修正（実Sandboxスキーマ反映）

- 原因：`src/subscriptions.js` は旧月額→新月額のように同じSKUで契約を買い直したとき、旧`original_transaction_id`の返金が遅れて届くと現在のProまでFreeにしていた。商品ID一致だけでは取引同一性を保証できない。
- 新ソース：`store_subscription_state.original_transaction_id`を参照し、現行取引IDが判明している場合は異なるIDまたはID欠落からのREFUND/EXPIRATION/BILLING_ISSUEを**無変更**にする。同取引IDの正当な返金は通常通り適用。旧0015スキーマのときは新列エラーを識別して旧形式へフォールバックし、本番既存スキーマへの即時互換性を維持（ただし旧スキーマではこの新しいガードが有効でない）。
- BEFORE：回帰新設で同SKU異originalのREFUNDが現行Proを失効、**21/22 PASS・1 FAIL / exit1**。AFTER：Lifecycle＋SQLiteの **30/30 PASS / exit0**。独立したStore/Control DBと現行lineageの正規返金を含む。根拠とS01〜S10/H01〜H10は`docs/IZK_BILLING_ORIGINAL_TRANSACTION_GUARD_20261017.md`。
- 実隔離Tenant DBの確認：`izakanpai-billing-sandbox-tenant-db`（UUID`5e181dd1-3212-404f-a5e5-552b3999e00b`）、環境=test、TENANT_ID=billingqa、既存プラン`free/canceled`、購入者1件。変更前`PRAGMA table_info(store_subscription_state)`に新列なし。**Git無関係・ignored保護領域のSQLバックアップ** `.tenant-provisioner/billing-sandbox/tenant-schema-backup-before-0047.sql`（16,862 bytes）をremote exportで取得し、`migrations/0047_revenuecat_original_transaction.sql`を**この隔離Tenant DBだけに適用**。
- Wrangler D1移行時のPowerShell NativeCommandErrorは、Wranglerの「D1が一時利用不可となる可能性がある」というWARNINGがエラーとして解釈されたもの。**CLI exit0とは主張しない**。独立した`PRAGMA table_info`リモートreadbackで**`original_transaction_id`列が実在**することを確認。既存`billingqa`はFreeのまま。
- 隔離Tenant Worker：`src/subscriptions.js` SHA-256 `12784DF57EE97251D3C39B6C8763B898D9BA234637A9E5E75A5A9359690D0E2B`を含むローカルビルド、`wrangler deploy --dry-run` **exit0**。Bindingは隔離D1、`AUTH_ENVIRONMENT=test`、`TENANT_ID=billingqa`、`REVENUECAT_ALLOWED_STORE=APP_STORE`、**実Apple月額/年額2商品allowlist**。隔離Tenant deployコマンド **exit0**、Remote Version `96339f84-8525-4f87-92a4-eb1614a5bea9` **100%配備済み**（14:31:00 UTC）。`CONTROL_SERVICE_SECRET`およびApple`appl_` SDK公開キーの**Secret名存在を遠隔再読戻し**、値は表示・記録せず。Remote D1列の存在、プランFreeを確認。
- **重要な受入条件**：既存State行の`original_transaction_id`は旧イベント由来で`NULL`。**今後の真正なApple Sandbox購入・更新でこの列に実IDが入るまで、現行取引の厳密な返金保護は実機証明できない**。本番Tenantへの0047移行は**未実施**。

## 3. Owner専用Sandbox APIソース準備（未配備）

- `src/billingSandboxOwnerApi.js` と`test/billing_sandbox_owner_api_test.mjs`を新規追加。Webhook専用Ingressを変更せず、**別Workerとして任意に有効化**する設計。test／`billingqa`／明示`SANDBOX_OWNER_API_ENABLED=1`の三重条件、固定POST `/owner` だけ、トークンと店舗一致、既存`checkToken`に加えて`getBillingIdentity`で**現行登録Owner検証**（非Ownerの管理者も拒否）。
- テスト実行 **11/11 PASS**、ただしBEFOREは`ERR_MODULE_NOT_FOUND`というソース未設置の失敗で、業務動作FAILではない。技術構成・S01〜S10/H01〜H10と詳細は`docs/IZK_IOS_BILLING_SANDBOX_OWNER_API_20261017.md`。
- **接続可能との主張禁止**：独立WorkerのWrangler binding/config、実`billingqa` Ownerセッション・サンドボックスAPI接続先へ切り替えたテスト専用iOSビルドの3つがない。現在の`billing-native.js`標準`API.post('rpc')`と`/owner`の経路が異なるので、未改修TestFlightビルドはこのAdapterを使用できない。公開Ingressへ認証Actionを増やさない。

## 4. 統合回帰／遠隔読戻しの全体集計

| テストまたは実読戻し | 結果 | 補足 |
| --- | --- | --- |
| 課金・Metadata・Native UI・Webhook・実SQLite・Owner APIのNode 11テスト群 | **107/107 PASS、exit0** | あくまでオフライン／mock |
| `node test/control_plane_routing_test.mjs` | **48/48 PASS、exit0** | Controlの同ID並列claim/2xx異常ACK、店舗境界 |
| `node test/subscription_integration_test.mjs` | **27/27 PASS、exit0** | 既存課金API互換 |
| `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release` | **exit1（期待するNO-GO）** | 正式Apple Sandbox未実施 |
| 隔離Tenant D1 0047列 | **readback TRUE** | Sandbox DBのみ |
| 隔離Tenant/Control Cloudflare Workers | **各Version 100%配備** | Production Worker変更なし |
| Remote `POST /webhooks/revenuecat`（無署名） | **HTTP401（拒否）** | HMAC保持の代表的負例のみ |
| Apple Sandbox`getOfferings()`と実購入→復元→返金 | **未実施／正式PASS 0、FAIL 0** | 実StoreKit・専有端末証拠なし |

### Control 2xx修正：実際に点検した自己レビュー観点10

| ID | 点検箇所／根拠 |
| --- | --- |
| S01 | 購入者のControllerouteが存在する場合のみTenantへ配送。rootはRouting元の署名イベント照合。 |
| S02 | `ignored:unknown_customer`を200偽適用するBEFORE FAIL→AFTER 503/failedをテストで再現。 |
| S03 | 本文`ok:false`を200偽適用する別BEFORE FAIL→AFTER 502/failedをテストで再現。 |
| S04 | `Response.clone().json()`により通常のTenant Response本文を消費しないコード経路をレビュー。 |
| S05 | Failedイベントが同一署名・同event.idで再配送され、`attempts=2`→appliedを実SQLiteで確認。 |
| S06 | `payload_sha256`変更済み同一event.idが409で拒否される既存テストを再実行。 |
| S07 | 新並列claim経路が影響を受けず48件のControl専用回帰を再実行。 |
| S08 | `unknown_customer`以外のIntentional informational`ignored`は従来契約を変更しないことを確認。 |
| S09 | ソースのNode構文検証`node --check`と`git diff --check`でexit0。 |
| S10 | 修正Source SHA `E8D9C2...`、Dry-run BindingとRemote Versionを照合。Remoteで同時負荷証明はPENDING。 |

### 横展開レビュー観点10（コード・構成ベース。正式端末QAと別）

| ID | 影響範囲／結果 |
| --- | --- |
| H01 | 公開`billingSandboxIngress.js`はHMAC/許可Headerのみ転送、URIはWebhook専用。変更なし。 |
| H02 | Control D1 `revenuecat_event_inbox`の`failed/applied` Statusと列は既存のまま、移行不要。 |
| H03 | 共有Control `billing_customer_routes`のimmutable Customer→Store、非関連Storeへ再配送なし。 |
| H04 | `tenant_registry.route_generation`不変チェックと`TENANT_BILLINGQA` routeは維持。 |
| H05 | Tenantの`billing_customers`存在検査との認証差異を独立レビュー。Unknown retryとno-opを区別。 |
| H06 | Tenantに今回追加した`original_transaction_id`はControl D1ではなく独立D1のみ。 |
| H07 | Apple`appl_` SDKキーとTest Store`test_`は区別。Secret値は書込みなし。 |
| H08 | RevenueCat SaaSのHMAC Sandbox only設定は既存GUI確認。今回の新ソース配備後の実署名配送はまだPENDING。 |
| H09 | 別WorkerのOwner APIは未公開。既存Webhook Ingressへの`checkToken`公開なし。 |
| H10 | iOS正式QAの未受理をRelease Gate exit1で実行確認。出荷PASSに算入なし。 |

## 5. 残件とリスクの優先順位

1. **最優先**：Sandbox用登録Owner実セッション＋アプリAPI専用Worker Binding／サンドボックス配布ビルドを揃える。Apple/Test Storeの混同を防ぎ、iPhoneの実StoreKit Offeringを独立に証明する。現時点ではOwnerソース11/11 PASSが**接続READYを意味しない**。
2. **Controlの残差**：Control route自体が未存在の`ignored_unknown`は現在HTTP200のままで、後からCustomer routeが追加されても自動再送されない。別のroute再照合・監査で恒久化が必要。Tenantからの2xx malformed bodyやIntentional `ignored:unmatched_entitlement`を`applied`とする扱いは未厳格化。5分の古いdispatch claim更新と先行実行の未fencingも独立レビューで指摘済み。**本件で対策完了とは主張しない**。
3. **実端末/実環境**：日本／フィリピンSandbox Account資格、Apple月／年Trial購入、実`original_transaction_id`保存、再起動・購入復元、満了／返金時の店舗D1反映を正式Runnerで1件ずつPASS/FAIL確定する。審査スクリーンショットはユーザー指示によりその後まで延期。
4. **リリース統制**：改修した`src/subscriptions.js`と0047は**Sandbox専用でのみ反映済み**。本番店舗D1移行、アプリリリース、審査提出・公開は未着手/禁止。Gitの他チャット作業に無断commit/pushしない。
