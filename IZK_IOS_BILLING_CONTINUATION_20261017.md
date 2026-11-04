# izakanpai POS｜iOS課金引継ぎの継続結果（2026-10-17 PHT）

## 完了判定

- **完了：引継ぎ資料/現ソース確認、Missing Metadataの不足箇所の絞り込み、OS別RevenueCat SDKキー混入防止、Webhook受信元/商品allowlist追加と旧商品の期限切れ・返金保護、ローカル回帰。**
- **未完：App Store Connect・RevenueCatの現在の実画面再確認、Missing Metadataの解消、iPhone StoreKit Sandbox取引、実RevenueCat購入イベントのD1読戻し、正式QA Runner受理。**
- Apple/RevenueCat商品を再作成していない。掲載画像、審査提出、公開、Cloudflareデプロイ、Git commit/push、他担当の正式QA・実機claim変更はゼロ。

## 外部設定の出典（再登録なし）

引継ぎ正本 `docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md` と既存の画面証跡による前回の保存・再読戻し記録：

| 項目 | 保存済みの実績・現在の証拠強度 |
|---|---|
| App Store Connect | App `6815685162` / Bundle `com.izakanpai.commissionpos`、Group `izakanpai Pro` (`22487367`) |
| 月額 | ASC `6823916048` / `com.izakanpai.commissionpos.pro.monthly`、JP ¥1,980、PH ₱499、JP/PHのみ、初回無料1か月（2026-10-17〜、終了日なし） |
| 年額 | ASC `6823916607` / `com.izakanpai.commissionpos.pro.annual`、JP ¥19,800、PH ₱4,990、JP/PHのみ、初回無料なし |
| RevenueCat | Project `7fcf50db` / Entitlement `pro` / Offering `default` の `$rc_monthly`・`$rc_annual` にApple実商品接続済み。Test Store2商品は別ストア商品として同Offeringに存続 |
| RevenueCat Apple API | 前回GUIでIAP key / App Store Connect APIがともに `Valid credentials`。今回は新規GUIで再読戻しできていない |
| メタデータ | 月額日本語・英語の表示名/説明は保存済み。**年額日本語・英語は未保存**、グループ表示名の保存証拠なし、審査向け画面スクリーンショット未整備 |
| RevenueCat Missing Metadata | 前回Apple2商品に表示。**今回最新GUIでの解消証拠なし** |

Apple/RevenueCatの公式説明では、サブスクリプションの商品ローカライズ（最低1件）、グループのローカライズ、審査用画像・説明等が必要。`Prepare for Submission` は必須メタデータ完備の証明ではない。**最有力は年額・グループの未登録メタデータと審査素材。** ただし各不足欄が現画面でどう表示されるか未再確認であり、原因の完全確定・Missing Metadata解消とは呼ばない。

資料：
- https://www.revenuecat.com/docs/test-and-launch/submitting-ios-subscription-app
- https://www.revenuecat.com/guides/revenuecat-replit/set-up-your-products-in-app-store-connect
- https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-statuses/

## 実行したコード変更（実機・遠隔未反映）

1. `src/subscriptions.js`：owner経由の `getBillingIdentity` は `appl_`（iOS）/`goog_`（Android）以外を `invalid_revenuecat_platform_sdk_key` として購入前に拒否。`test_` / 別OSキーを返さず、customer登録前に終了。
2. `src/subscriptions.js`：Webhookの署名・環境・店舗認証に加え、設定時の `REVENUECAT_ALLOWED_STORE` / `REVENUECAT_ALLOWED_PRODUCT_IDS` を検査。Storeや商品が違う購入/返金等はD1へ副作用を起こさず409。
3. `src/subscriptions.js`：月額→年額に切替済みのとき、古い月額商品に対する `REFUND`/`EXPIRATION` で現在の年額契約を取り消さない（`different_current_product`）。**同一商品内の異なる元取引IDまで照合する処理は未実装であり別レビュー対象**。
4. `standards/mobile-subscriptions/v1/sandbox-config.mjs`：実Apple商品IDを共通 `apps.json` から読んで、新しい隔離Tenant Worker設定へ `APP_STORE`/商品allowlistを生成。**既存のリモート配備版には未反映**。
5. `test/izk_ut_085_billing_qa_activation_test.mjs`、`test/revenuecat_lifecycle_offline_test.mjs`、`standards/mobile-subscriptions/v1/sandbox-config.test.mjs` に回帰負例を追加。`standards/mobile-subscriptions/v1/README.md` に古い「Apple未登録」記載が残っていたため実績と整合。

## 実測結果（このチャットで新規実行）

| 入口 | 結果 | 証拠の境界 |
|---|---|---|
| `node --test test/izk_ut_085_billing_qa_activation_test.mjs test/izk_ut_084_pro_comparison_always_visible_test.mjs test/revenuecat_lifecycle_offline_test.mjs standards/mobile-subscriptions/v1/price-policy-gate.test.mjs standards/mobile-subscriptions/v1/validate.test.mjs standards/mobile-subscriptions/v1/qa-matrix-gate.test.mjs` | **59/59 PASS** （追加キー負例を含む） | Chromiumモック・ローカルのみ |
| `node --test test/revenuecat_lifecycle_offline_test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs standards/mobile-subscriptions/v1/sandbox-config.test.mjs test/billing_sandbox_ingress_test.mjs` | **42/42 PASS**（追加したsandbox-configテスト前の独立実行） | real source + in-memory SQLite/fixtureのみ |
| 上記の価格・QA matrix・Native UI・Webhook・SQL・Sandbox config・Ingress等の全9テストファイルを再実行 | **85/85 PASS、exit 0（全変更後の最新統合実測）** | 追加したallowlist生成負例を含む。実ストア購入とは別 |
| `node test/subscription_integration_test.mjs` | **27/27 PASS（内部check）** | E2E StoreKitとは別 |
| `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release` | `valid=true`, `allReady=false`, **exit 1（期待どおり公開停止）** | iOS/Android実Store E2Eは0件 |

### Cloudflareの直接読取（2026-10-17、Secret値非取得）

`.tenant-provisioner/billing-sandbox/wrangler.tenant.toml` を指定した `wrangler secret list` はexit 0。表示したのは存在判定のみ。

| Sandbox Tenant WorkerのSecret名 | 有無 |
|---|---|
| `CONTROL_SERVICE_SECRET` | あり |
| `REVENUECAT_IOS_PUBLIC_SDK_KEY` | **なし** |
| `REVENUECAT_ANDROID_PUBLIC_SDK_KEY` | なし |

**重要：Sandbox IngressはWebhook専用であり、iPhoneログイン・`getBillingIdentity`等の公開App API経路ではない。** 上記iOS SDKキーと隔離アプリAPI/認証経路を整備するまで、Apple Sandboxでの購入→店舗Proの独立E2Eは実施不能。実値を秘密情報として表示・記録しない。

## 品質・境界の調査（ソース側レビュー、正式実機QAとは別）

**自己レビュー観点**：S01 iOS prefix、S02 Android prefix、S03 Test Store拒否、S04 無設定キー拒否、S05 旧generic keyを使わない、S06 owner拒否、S07 顧客ID作成前チェック、S08 HMAC raw body・時刻、S09 先行Store/product拒否、S10 切替前商品の返金防止。S01〜S05/S08〜S10は追加・既存のローカル回帰で検証、S06/S07はソース経路照合。外部実運用の証明ではない。

**横展開観点**：H01 iOS Native UI、H02 Android Native UI、H03 RevenueCat Test Store、H04 Apple Offering、H05 HMAC ingress、H06 Control route、H07 Tenant SQL二表、H08 JP/PH価格、H09 HNG別Entitlement、H10 Google Play未登録。既存のテスト群とマニフェスト／実ソースを照合。アプリ別remote credential、TestFlight、正式Runnerに関する証拠は未取得。

## 残件・完了条件

1. **Missing Metadata**：Apple年額（日/英）の表示名と説明、サブスクリプショングループの表示ローカライズ、審査用画像/説明のどの項目が不足しているか最新GUIで読戻し。ユーザー指定によりスクリーンショット等の掲載/審査素材は保留。設定を保存した場合はGUI再読戻しとRC状態変化を記録。提出・公開はしない。
2. **資格／商品**：JP/PH専売と4価格、月額紹介オファー資格はストアのレスポンスで照合。既存のTest Store商品がApple StoreKit結果に混入しないことを別に確認。
3. **ターゲットビルド**：TestFlightの配布済みバイナリVersion/Build/SHA、iOS plugin、Store用 `appl_` キーが対象Sandbox Workerで有効かを値を露出せず照合。
4. **Sandbox接続**：Webhook専用Ingressと別に、Owner認証を備えたSandbox専用アプリAPIを準備。公式Runnerの排他claimを確認後にiPhone実購入/Pro/再起動/復元/解約/失効/返金。
5. **D1証拠**：実Store購入によるRevenueCat配信の署名/HTTP受理、Control routing、Tenant subscription/state更新、他店舗不変、重複・逆順を読戻し。合成イベント/TEST pingを実購入の証拠にしない。
6. **将来配備**：改訂されたallowlist設定・コードのSandbox配備と追加秘密情報は**未実施**。今回のsource PASSを遠隔で効いたと誤認しない。課金の正式PASSは引き続き0件。
7. **製品変更イベント**：`PRODUCT_CHANGE` のApple実通知における `product_id` と `new_product_id`、同一SKU内の異なるtransactionの返金を取得して照合する。異SKUの旧契約からの遅着REFUND/EXPIRATIONはローカル防御済みだが、元transaction別の厳密照合はまだない。

## 2026-10-17 20:13 PHT 追加継続結果（新規修正）

### 実施内容と確定した根因

1. **ソース不具合を再現し修正**：`src/subscriptions.js` の `ACTIVE_EVENTS` に `PRODUCT_CHANGE` が含まれ、RevenueCatの `product_id` が**変更前の商品**、`new_product_id` が変更先であるにもかかわらず、`expiration_at_ms` から現行契約を即時変更していた。特に**次回更新時に切り替わる通知**や更新イベント到着前は、正常な月額Proを期限切れ扱い・旧商品へ巻戻す危険があった。RevenueCatの公式Webhook event schema / Product Change Flowsに従い、`PRODUCT_CHANGE` は**情報通知としてイベント台帳に記録するのみ、契約状態は変更しない**。実購読権は独立した `RENEWAL` / `INITIAL_PURCHASE` 等で更新。
2. **別の誤失効を再現し修正**：月額から年額に切替済みの後に、旧月額商品の `BILLING_ISSUE` が遅れて到着したとき、従来のguardはREFUND/EXPIRATIONだけを対象にしていたため新年額Proを `past_due` / Freeへ落とした。旧商品に由来するBILLING_ISSUEも**商品IDが現契約と異なる場合に無変更**で返すよう修正。同一現行商品のBILLING_ISSUEは従来どおり扱う。
3. **先に失敗を確認**：回帰追加直後、最初の `PRODUCT_CHANGE` シナリオなどで **17/20 PASS・3 FAIL**、後続の旧商品BILLING_ISSUE負例で **20/21 PASS・1 FAIL** を再現。これらは**修正前ローカル回帰の意図したFAIL**であり、正式実機QAのFAILではない。修正後すべて解消。
4. **既存共通Runner再利用**：`test/revenuecat_lifecycle_offline_test.mjs` へ3つの検証（延期切替、実RENEWAL後の旧SKU返金、旧SKUの遅着BILLING_ISSUE）、`test/revenuecat_sandbox_sqlite_integration_test.mjs` へ**実SQL/2独立in-memory DB**での月額維持→年額更新テストを追加。独自QAランナーや専用ケースエンジンは作っていない。
5. **Cloudflare Sandbox監査の共通化**：既存 `scripts/qa-revenuecat-readiness.mjs` に `--sandbox` を追加。現有のSandbox Control/TenantのWrangler Secretの**名前のみ**をリモート読取し、Productionや他アプリの資格確認と混同しない。再実行では `sandboxControl=VERIFIED/不足なし`、`sandboxTenant=VERIFIED/REVENUECAT_IOS_PUBLIC_SDK_KEY 未登録`、`sandboxRemoteSecretNamesReady=false`、**gate exit=1（不足を正しく検出）**。値の取得・表示・書込みはしていない。隔離Sandboxの公開アプリ認証APIが未整備なため、当ゲートは実Apple購入をREADYやPASSとしない。

### 最終ローカル実測

| 種別 | 実測 | ステータスの意味 |
| --- | --- | --- |
| Node `--test` 対象10ファイル（Lifecycle/SQLite/Ingress/Native UI/共通ゲート等） | **94/94 PASS、0 FAIL、exit 0** | Local/Chromiumモック/実SQLiteのオフライン検査 |
| `node test/subscription_integration_test.mjs` | **27/27 PASS、exit 0** | 契約・課金APIのローカル統合テスト |
| `node --check`（変更JS）／`git diff --check`（変更4ファイル） | **すべてexit 0** | 構文および差分の静的検査 |
| `node scripts/qa-revenuecat-readiness.mjs --sandbox` | **gate exit 1、iOS公開キー欠落を検出** | Remote secret-name確認のみ。値の正しさ/配備版のコードは未証明 |
| `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release` | **exit 1、公開NO-GO維持** | Apple Sandbox購入の公式証拠0件 |
| iPhone実機・Apple StoreKit購入・Webhook実配送・正式Runner | **正式PASS 0、正式FAIL 0（未実施）** | 他QAの端末・台帳へ干渉なし |

変更後の `src/subscriptions.js` SHA-256：`E1D394D8C2EBEF8A3E1FEE7919752032DACF41DE4AB246D2E57C863001194F9A`（20:13 PHTに採取）。このSHAは**現ローカル作業ツリー**の値であり、iPhone配布版やCloudflare遠隔配備版の同一性を証明しない。

### 修正後の自己レビュー 10 観点（各観点をソース／負例／差分で確認）

| ID | 方法／実際の結果 |
| --- | --- |
| S01 | event type一覧を逆引きし `PRODUCT_CHANGE` が `ACTIVE_EVENTS` から除外されたことをコード照合。 |
| S02 | 公式Webhook sampleの `product_id`（旧）/`new_product_id`（新）を照合。旧SKUの即時更新を禁止。 |
| S03 | deferred PRODUCT_CHANGEの旧expirationが過去でも、現月額Pro維持をMock D1負例でPASS。 |
| S04 | 同ケースを独立した実SQLite Tenant D1のState/Plan/Inboxで読み戻しPASS。 |
| S05 | その後の年額 `RENEWAL` で新SKUに切り替わることを実SQLiteでPASS。 |
| S06 | 切替後に旧SKU `REFUND` と `EXPIRATION` を投入し、年額Pro維持PASS。 |
| S07 | 遅着旧SKU `BILLING_ISSUE` のFAIL再現後、変更した商品guardでPASS。 |
| S08 | 既存重複通知・逆順・期限外・署名HMACの負例をLifecycleの実関数で再試験PASS。 |
| S09 | `node --check`・`git diff --check`を変更コードへ実行してexit 0。 |
| S10 | 全10テストファイル94件＋既存27統合チェック実行、結果すべてPASS。 |

### 横展開レビュー 10 境界（正式外部E2Eとは区別）

| ID | 照合先／結果 |
| --- | --- |
| H01 | iOS Native購入/復元の `billing-native.js`、Owner guardが存在。Nativeモック検査はPASS。 |
| H02 | Apple用公開キー `appl_` / Android `goog_` のOS別fail-closed、Test Storeキー拒否を既存テストでPASS。 |
| H03 | サーバー `getBillingIdentity` のOwner店舗境界と現行期間有効性の判定、27統合チェックでPASS。 |
| H04 | Control `src/controlPlaneWorker.js` のCustomer route / Control D1 inboxの識別とgeneration固定をソース確認、遠隔E2EはPENDING。 |
| H05 | Tenant `src/index.js` の `/internal/revenuecat` サービスSecret判定をソース確認、実Workerは未更新。 |
| H06 | Sandbox Ingressの唯一の公開経路とHMAC検証を、既存Ingress/署名回帰でPASS。 |
| H07 | 独立Control/Tenant D1 schemaと異店舗の状態不変を実SQLiteでPASS、Remote D1はPENDING。 |
| H08 | Apple実2商品allowlist/Google Test Store混同拒否の共通設定・Lifecycle負例を再試験PASS。 |
| H09 | Hataraku NihonGO! の別Entitlementとizakanpai `pro` の分離を `apps.json`／manifest gateでPASS（外部アプリ課金は未実施）。 |
| H10 | 既存公式QA matrixを再読しiOS正式E2E 0件、`--release` fail-closed（exit 1）確認。 |

レビューで使用したものは**ソース・オフライン証拠の10観点＋10横境界**であり、外部画面／同一SKU複数取引・購入復元の正式QAをPASSと主張しない。

### 外部未完／制約

- App Store Connect / RevenueCatの認証済みブラウザは現在の接続からアクセスできず、年額日英ローカライズ・サブスクリプショングループ表示情報・Paid Apps Agreement／銀行・税務・Missing Metadata最新画面の**保存／読戻しは未実施**。古いGUI証跡を最新状態として再判定しない。
- 掲載素材・審査スクリーンショットはユーザー方針で延期。RevenueCatの `Missing Metadata` を解消した証拠はまだない。
- 隔離Sandbox Tenantへ `REVENUECAT_IOS_PUBLIC_SDK_KEY` を登録するには、正しいizakanpai Apple用 `appl_` キーとRemote WorkerのSecret変更が必要。**今回Secretは変更していない**。Webhook-only IngressにはOwnerログインAPIがなく、専用Sandbox購入E2Eは引き続き準備不足。
- 同一SKUの別 `original_transaction_id` やApple StoreKit実 `PRODUCT_CHANGE` サンプルは未取得。販売状態の厳密なトランザクション照合は別変更と実取引回帰が必要。
- **審査提出・公開・Cloudflare deploy・Git commit/push・正式QA runner・実機操作は実施していない。** 追加変更はローカル作業ツリーのみ。

## 2026-10-17 21:08〜21:32 PHT：ユーザーログイン後のApp Store Connect実画面結果

ユーザーから「ログインしたよ」と連絡を受け、既存のChrome上で実際にApp Store Connectにアクセスして保存・再読戻しを実施。**この節が以前の「ASC実画面未アクセス／年額・グループ未保存」という記載を更新する**。過去のデータを再作成せず既存Apple App/Group/商品IDに入力。ローカルのIgnored証拠画像は `.tenant-provisioner/billing-sandbox/` に保存した。Business画面の証跡画像には個人情報があるため、値や画像本体はGit・Markdownへ複製しない。

| 対象 | 実行・再読戻しで確認した結果 | 証拠（Git ignored） |
| --- | --- | --- |
| Appleアプリ | 既存App `6815685162`、Bundle `com.izakanpai.commissionpos` にログイン成功、商品再作成なし | `asc_annual_max_2115.png` |
| 年額商品 `6823916607` 日本語 | **新規ローカライズ保存・GUI読戻し完了**：表示名「izakanpai Pro 年額」、説明「izakanpai Proの年額自動更新サブスクリプションです。」 | `asc_annual_ja_saved_readback_2119.png` |
| 年額商品 英語（アメリカ） | **保存・GUI読戻し完了**：表示名「izakanpai Pro Annual」、説明「Annual auto-renewing izakanpai Pro subscription.」 | `asc_annual_ja_en_table_verified_2124.png` |
| グループ `22487367` 日本語 | **保存・読戻し完了**：グループ表示名「izakanpai Pro」、アプリ表示名は既存App名を使用 | `asc_group_ja_readback_2127.png` |
| 同グループ 英語（アメリカ） | **保存・読戻し完了**：グループ表示名「izakanpai Pro」、アプリ表示名は既存App名を使用 | `asc_group_both_locales_readback_2129.png` |
| Paid Apps Agreement | **有効**。同画面でFree Apps Agreementも有効 | `asc_business_readback_2132.png` |
| 銀行口座 | 登録済み1口座が**有効**（値は非記録） | 同上 |
| 税務 | 米国税務フォーム2件とも**有効** | `asc_business_tax_footer_2132.png` |

**明確に解消した不足**：年額商品の2言語個別表示名/説明と、サブスクリプショングループ2言語の表示名。**根因から除外できる候補**：Businessの有料契約・登録銀行・表示中の米国税務フォームの「未有効」状態。ただしApple内部の別の審査要件まで保証しない。

**引き続き未完**：RevenueCatへ移動したところ既存ブラウザは `https://app.revenuecat.com/login` へリダイレクトされ、RCは**ログアウト状態**。したがって2商品の最新「Missing Metadata」表示・Apple連携キーの最新有効性・RC Sync結果は**未確認**。前回19:17の `Missing Metadata` は「最終確認済みの過去状態」であり、今回も残っているとは断定しない。RevenueCatへログインした後、既存Project `7fcf50db` のProduct Catalog 2件を更新ではなく再読戻しする。

**ユーザー方針を維持**：App Review専用スクリーンショット／掲載素材は未作成・未登録。Apple上の「審査用に追加」ボタンは押していない。月額・年額の価格、JP/PH地域、月額のみ初回1か月無料、Bundle/Product ID、Entitlement/Offeringには変更なし。iPhone、Cloudflare、正式QA台帳、Git commit/push、デプロイ、App Store審査提出、本番公開は未実施。RC Test StoreとApple Sandboxの成果の混同なし。

共通正本 `standards/mobile-subscriptions/v1/apple-metadata-observation.json` も現在の実画面証拠で更新。実GUI読戻しによるローカライズ・契約状態は `verified` とし、**ログインが必要なRevenueCatの最新ステータスは `unverified`** のままに変更。`reviewScreenshot=deferred`、`storeKitSandboxPurchase=not-run` を保持。

### 21:33 PHT 再検証・ゲート整合

- Appleの登録状態が新しくなったため、従来 `annual-japaneseLocalization-not-verified` を期待していた `apple-metadata-gate.test.mjs` が変更直後に **5/6 PASS、1 FAIL** となった。これは古い観測状態を固定したテスト期待値の問題であり、Apple保存の失敗・正式QAのFAILではない。
- 共通テストを `年額日本語/英語・グループ・契約/税務はverified`、`RevenueCat最新ステータス/StoreKit/審査素材は未完` の現在の事実に合わせて更新。誤ってStoreKit正式PASSに昇格させない負例も維持。
- **修正後10スイート合計94/94 PASS、0 FAIL、exit 0**（Native UIモック、Webhook、SQLite、Apple Metadata gateを含む）。Metadata gateは `valid=true`、`metadataComplete=false`、`purchasePreparationVerified=false`、`appleSandboxE2eVerified=false`。公式課金 `--release` gateは引き続き **exit 1（NO-GO）**。
- PCの既存ChromeをRevenueCatのログイン画面に移動済み。**ユーザーによるRevenueCatログイン待ち**。スクリーンショット等の掲載素材、審査提出、実購入、遠隔配備はいずれも未実施。

### 21:41〜21:45 PHT 実Apple / RevenueCat 再読戻し（上のログイン待ち記録より新しい証拠）

- **Apple年額商品**（ASC App `6815685162`, annual `6823916607`）：英語（アメリカ）`izakanpai Pro Annual`、`Annual auto-renewing izakanpai Pro subscription.`、日本語 `izakanpai Pro 年額`、`izakanpai Proの年額自動更新サブスクリプションです。` が同じページに表示。保存後にページを開き直した状態で両行を確認。証跡：`.tenant-provisioner/billing-sandbox/asc_annual_localization_find_2139.png`。
- **Apple月額商品**（ASC monthly `6823916048`）：既存の英語（アメリカ）と日本語の表示名・説明を改めて読戻し、両行が存在。**新規作成なし**。証跡：`.tenant-provisioner/billing-sandbox/asc_monthly_locales_readback_2147.png`。
- **グループ**（`22487367`）：日本語・英語（アメリカ）の双方に `izakanpai Pro` のグループ表示名があり、`izakanpai - All In One POS` アプリ名に紐付け。月／年商品の両方が同グループに存在し、それぞれ「提出準備中」。証跡：`.tenant-provisioner/billing-sandbox/asc_group_display_empty_2141.png`（名前にemptyが含まれるが、**実画面は日英2行が埋まっている**）。
- **RevenueCat最新ライブ画面**：認証済みの **izakanpai POS Project `7fcf50db`** `Product catalog > Products` でApple実商品2件が**いずれも `Missing Metadata` のまま**であることを新規確認。各 `1 Entitlements`、別行のTest Store月／年商品と区別した。証跡：`.tenant-provisioner/billing-sandbox/rc_products_live_loaded_2143.png`。Annual商品詳細の `Store Status: Missing Metadata`、`pro` Entitlement、Store=`App Store`も確認。証跡：`.tenant-provisioner/billing-sandbox/rc_annual_product_details_2144.png`。
- RCステータスの情報アイコンに表示された説明は「商品を利用可能にするまで開発者による対応が必要」という**一般的な説明のみ**で、不足項目の特定はできない。証跡：`.tenant-provisioner/billing-sandbox/rc_annual_missing_metadata_help_2144.png`。
- **この時点で原因別に棄却できるもの**：年額／月額商品日英ローカライズの未保存、グループ日英表示名未登録、ASC有料契約・銀行・表示中税務フォームの無効。**引き続き確認が必要なもの**：両商品のApple審査用スクリーンショットは未登録（ユーザー方針でテスト後まで延期）、StoreKit商品取得の可否とApple IAP/RCメタデータ同期の条件。現時点のRC Statusだけを根因確定とは扱わない。
- **禁止操作は継続**：レビュー提出・本番公開・価格/地域/無料期間変更・RC商品再登録・Cloudflareデプロイ・実購入・正式QA書込は実施していない。Apple Sandbox実機正式PASS/FAILは引き続き**各0件**。本ローカル証拠はStoreKit実購入の代用にならない。
- 共通ゲート `standards/mobile-subscriptions/v1/apple-metadata-observation.json` の `revenueCatStatus` を直近実画面の `missing-metadata` に更新し、旧 `unverified` の観測値を上書きした。日英ローカライズ等は既存のverifiedを維持。いずれの商品も `reviewScreenshot=deferred`、`storeKitSandboxPurchase=not-run` のまま。

### 21:51 PHT RevenueCat Apple連携再照合・最新ローカルゲート

- RevenueCat `izakanpai POS` の既存 App Store App（`app1c17f56b4a`）設定を認証済みGUIで読戻し。**App Bundle ID は `com.izakanpai.commissionpos`**（App Store Connect／iOSの既存値と一致）。**In-app purchase key config = Valid credentials、App Store Connect API = Valid credentials**。証拠は ignored 非公開フォルダ内 `.tenant-provisioner/billing-sandbox/rc_apple_credentials_section_2151.png` と `rc_asc_api_credentials_readback_2151.png`。Key ID、Issuer ID、鍵・公開SDKキー本文は成果Markdownへ転記していない。Keyの再登録や変更もしていない。
- RevenueCat公式の `App Store Issues` troubleshooting は、App Store Connectの `Missing Metadata` が残る商品も**Apple Sandbox / StoreKit設定ファイルのテストでは取得可能な場合がある**と説明する。このため `Missing Metadata` 解消待ちをSandboxテストの一律停止理由としない。ただし、このアプリの**StoreKit実取得・購入可能性自体は未実測**。公式：https://revenuecat.github.io/codelabs/troubleshooting/app-store-issues/index.html
- 同公式資料では商品の `Missing Metadata` 原因として**Review Informationのスクリーンショット不足**、個別商品/グループのローカライズ、価格などを列挙する。現在のApple実画面では**日英商品・日英グループ・価格・契約資格とRevenueCat 2つの有効資格を確認済み**。未登録の審査スクリーンショットが最有力の**残存候補**だが、これを今登録するとユーザーの「掲載・審査素材はテスト後」方針に反するため**保留**。正式な原因確定・治癒・審査申請ではない。
- 変更したMetadata観測状態のオフライン再実行：既存10グループ **94/94 PASS / FAIL 0**、`metadataComplete=false`、`purchasePreparationVerified=false`、`appleSandboxE2eVerified=false`、`--release` gate **exit 1（NO-GO）**。正式StoreKit/iPhone QAは**PASS 0 / FAIL 0（未実施）**。実Apple/RevenueCat設定の再登録・ストア審査提出・Cloudflareデプロイ・Git push等の実行はない。
- **次工程**：隔離SandboxのApple公開SDKキーSecret未登録、Owner認証済みアプリAPI経路なし、実機claim/配布ビルド未照合を先に解決し、**Apple Sandboxの `getOfferings()` / StoreKit実商品取得**をRC Test Storeと混同せず確認。その後、購入/復元/失効/返金Webhook→隔離D1を証拠付きで正式Runnerへ提出。審査用画像はQA完了後に登録してRC Metadataを改めて確認。

### 22:00〜22:07 PHT 実RevenueCat Webhook→Cloudflare D1疎通とiOS公開SDKキーの不足解消（この節を最新正本とする）

**外部実行で確定した成果（Apple購入とは別）：**

1. **Webhook実配送**：認証済みRevenueCatのizakanpai POS Project `7fcf50db`、既存 Integration `whintgr7670c16a83`（`izakanpai POS - Sandbox Billing QA`）を実画面で確認。対象App=`izakanpai POS (App Store)`、Environment=`Sandbox only`、HMAC署名 **ON**、Authorization値はマスク済。設定は変更せず、`Send Test Event`を**1回**実行。RevenueCat実サービスの画面でResponse **HTTP 200**を観測。画面証拠（gitignored）`.tenant-provisioner/billing-sandbox/rc_live_webhook_loaded_2158.png`、`rc_live_test_result_2200.png`。
2. **隔離Control D1の実読戻し**：送信直前、`revenuecat_event_inbox` **4件**。RevenueCatからの実TEST送信後に**5件**。新規行は `event_type=TEST, environment=SANDBOX, status=ignored_unknown`、`received_at=2026-10-17 14:00:22 UTC`。既存の非登録RC TEST用顧客を適切に無権限扱いで記録したのであり、Pro付与・実購入の成功ではない。これは前回の合成HMACではない、RevenueCat SaaS→公開Ingress→非公開Control Worker→Control D1の真正なTEST配送。
3. **隔離Tenant D1の実読戻し**：`billingqa`は送信前後で `plan_code=free, status=canceled` 不変。TESTイベントにより有料Proが誤付与されないことを確認。Control D1／Tenant D1はSandbox専用UUID `14002180-c4df-4873-b17a-8ededd002d7c`／`5e181dd1-3212-404f-a5e5-552b3999e00b`、Production/teat/yuwakuとは別。読取SQLのみ（TEST配送以外にDB直接の更新なし）。
4. **Apple iOS公開SDKキー**：RevenueCat `API keys`画面で `Test Store`キーと別の **izakanpai POS (App Store)** 行の公開SDKキーを取得。値を標準出力・リポジトリ・Markdownに表示せず、`appl_` 接頭辞と許容形式を内部検証後、既存Sandbox Tenantのみに `wrangler secret put REVENUECAT_IOS_PUBLIC_SDK_KEY --config .tenant-provisioner/billing-sandbox/wrangler.tenant.toml` で登録（exit 0）。Clipboardをクリア。**Test Storeキーを転用していない**。
5. **Secret遠隔読戻し**：既存共通 `node scripts/qa-revenuecat-readiness.mjs --sandbox` で `sandboxControl=VERIFIED/missingなし`、`sandboxTenant=VERIFIED/missingなし`、`sandboxRemoteSecretNamesReady=true`、**exit 0**。Wrangler deployment listも2026-10-17T14:05:34Z作成の隔離Tenant新バージョン `2aa8e283-4ea8-428c-870c-81bb7550876a` が100%配備済みと確認。**Secret更新で隔離Tenantのバージョンが更新された**のであり、ローカルで修正した全ソースをフルデプロイしたと主張しない。Secret名の確認だけでは、SDK値の購入成功、iPhoneの接続先、プラン反映は証明できない。

**共通コードの具体的な回帰対策：** 独立レビューにより `src/controlPlaneWorker.js` のRevenueCat同一イベント並列受信時、条件なしの `dispatching` 更新で二重Tenant送信できる問題を検出。`test/control_plane_routing_test.mjs` に並列同一イベント負例を実装し、**修正前exit 1→atomic claim修正後45/45 PASS（exit 0）**。従来status/既存D1 schemaを維持。証跡と未解決境界は `docs/IZK_BILLING_SANDBOX_WEBHOOK_REVIEW_20261017.md`。このローカル修正は上記22:00に送ったRevenueCat SaaS TEST時点のremote配備版へ適用した証拠はなく、**遠隔Webhook正式QAまでの安全な配備／ハッシュ照合が別途必要**。

**再実行の集計（22:07 PHT実測）：**

| 実行 | 結果 | 判定範囲 |
| --- | --- | --- |
| 課金関連Node `--test` 10ファイル | **94/94 PASS, exit 0** | ソース/モック/SQLiteオフライン回帰 |
| `node test/control_plane_routing_test.mjs` | **45/45 PASS, exit 0** | Controlのルート・店舗境界・並列Event claim |
| `node scripts/qa-revenuecat-readiness.mjs --sandbox` | **exit 0／必要Secret名充足** | リモートSecret名のみ。Apple Sandbox準備完了とは判定しない |
| `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release` | **exit 1（意図したNO-GO）** | 正式iOS/Android Sandboxケース未受理 |
| RevenueCat本体のSandbox **TEST** → Control D1 → Tenant Free読戻し | **HTTP200、D1 4→5、店舗Free不変** | 課金付与を伴わないWebhook接続の実測 |
| iPhone Apple Sandbox購入・Pro反映・再起動・復元・期限切れ・返金 | **未実施／正式PASS 0件、FAIL 0件** | 実機と実購入証拠なし |

**現在残る最短経路**：隔離Sandboxは`webhooks/revenuecat`専用Ingressで、iPhoneからの`checkToken`とOwner `getBillingIdentity` は公開していない。真のOwner認証・別店舗混入防止・TestFlightビルドのSandbox API切替・実StoreKit `getOfferings()`、購入を通すアプリ専用の**安全な別ルート**が必要。特にControlの未知customerに対するHTTP200/ignored_unknown（購入より前にOwner routeの登録必須）、同じSKUの異original transaction返金、Tenantのunknown no-op判定、allowlist/イベントの厳密一致はレビュー指摘のまま**未解消**。その条件を満たすまでは実購入や本番ソース横展開を推進しない。審査素材、App Review提出、本番公開、正式QA実機claim/台帳変更、Git commit/pushは本作業では実施していない。
