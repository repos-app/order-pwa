# izakanpai POS iOS Pro サブスクリプション登録状況（2026-10-17）

## 2026-10-17 18:11 PHT 追加観測（保存完了と選択操作を区別）

- App Store Connect の **月額サブスクリプション**で「配信対象2/175（日本・フィリピンのみ）」を確定保存し、商品詳細画面で読戻し確認。その他の地域を将来自動追加するチェックはOFF。
- 月額価格設定画面で**日本 ¥1,980**を基準価格として選択し、国別価格編集画面へ遷移。**まだ価格確認・保存画面から戻った証拠はない**ので月額の設定完了と判定しない。
- 同じ国別価格画面でフィリピンがAppleの自動換算値 **₱799** と表示されたため、確定料金 **₱499** へ変更するため価格候補を開いたところまで。**₱499の選択／価格保存は未確認**。
- RevenueCatのizakanpai POS Product Catalog実画面で、**App Store** セクションに `com.izakanpai.commissionpos.pro.monthly` と `com.izakanpai.commissionpos.pro.annual` の2商品が表示され、いずれも **Missing Metadata**、Entitlements列は **Attach** と表示された。これは「RCへの商品存在」は実確認できたが、**pro権限への紐付け・Offering構築・Apple側メタデータ完成は未確認/未完了**を意味する。別セクションの **Test Store Monthly/Yearly** 商品は本物のApple商品として扱わない。
- 同じChromeウィンドウが月額価格候補の操作中にRevenueCatページへ切り替わったため、誤設定を避けるためブラウザへの追加入力を停止。月額価格は再度App Store Connectで実読戻しが必要。
- 掲載素材とストア審査・本番リリースは従来どおり保留。今回の調査をiOS Sandbox実購入PASSとして記録しない。

## 実画面で登録・確認した事項

App Store Connectアプリは **izakanpai - All In One POS** / app id `6815685162` / bundle id `com.izakanpai.commissionpos`。Distribution > サブスクリプションの実画面で、既存グループ0件を確認し、次を新規作成した。

| 対象 | 名称 | App Store Connect ID | Store Product ID | 実確認 |
|---|---|---|---|---|
| 自動更新グループ | izakanpai Pro | `22487367` | — | 作成済み |
| 月額 | izakanpai Pro Monthly | `6823916048` | `com.izakanpai.commissionpos.pro.monthly` | 1か月、提出準備中 |
| 年額 | izakanpai Pro Annual | `6823916607` | `com.izakanpai.commissionpos.pro.annual` | 1年、提出準備中 |

年額はAppleの価格選択画面で **日本 ¥19,800・フィリピン ₱4,990** を明示選択し保存。月額も **日本 ¥1,980・フィリピン ₱499** を明示選択し保存した。175地域の価格一覧にはApple自動計算の値も含まれるが、実際の配信対象とは別。商品個別の提供地域画面で**月額は日本・フィリピンの2地域のみ**を選び、保存後に「175か所中2か所」を確認。年額の**1年間前払い（自動更新）提供地域も日本・フィリピンの2地域のみ**に設定し、価格確認画面で上記の年額料金を再確認した。追加地域の自動配信設定はオフ。12か月分割の月額払いオプションは未設定。

月額の**初回1か月無料**Introductory Offerを日本・フィリピンに設定し、適用開始日2026-10-17、終了日なしで保存。「2か所」「最初の1か月間は無料」を保存後のApple画面で読戻し確認。Appleアカウントのトライアル資格によって適用可否は変わり、無条件無料を宣伝してはいけない。年額無料トライアルは設定していない。表示名・説明のローカライズは**未保存**、スクリーンショット等の掲載素材はユーザー指示に従って後回し。商品審査提出・アプリ審査提出・本番公開・購入・実課金なし。Appleの初回サブスクリプションは新アプリバージョンとともに提出する必要がある旨のメッセージが表示されているため、登録済み商品と販売承認は別。

「1年間前払い」提供先設定は、年額自動更新料金をまとめて前払いで請求する対象地域の選択。「12か月契約の月額払い」とは別設定。前回は全選択0でキャンセルしたが、今回日本・フィリピンの**2地域**に明示設定し保存した。12か月月額払いは引き続き未設定。

RevenueCat izakanpai POS のWebhookはSandbox onlyで実TEST HTTP200・Control D1 `TEST/SANDBOX/ignored_unknown` 1件を以前に確認している。今回、RevenueCat Project `7fcf50db` のProduct catalogのApp Store実商品2件（`com.izakanpai.commissionpos.pro.monthly` と `.annual`）を、両方ともEntitlement **`pro`** にAttachしてUIで成功・各`1 Entitlements`を確認。Offering **`default`** の既存`$rc_monthly`/`$rc_annual` に各々該当Apple商品を追加して保存・更新成功を確認。既存Test Storeの疑似商品は同Offeringのプラットフォーム別商品として残しており削除していない。両方のApple商品についてRevenueCatが**`Missing Metadata`**を示すため、**購入できることやPro付与は未検証**。StoreKit Sandbox購入、RevenueCat実取引、Webhook本物イベント、Control/Tenant D1実反映はすべて別の未完項目。RevenueCat TEST HTTP200はその代わりにはならない。

## コードと台帳の同期

- `standards/mobile-subscriptions/v1/apps.json` と `price-policy.json` のApple商品IDを、実確認した2件に更新。
- `price-policy-gate.mjs` の「登録済みApple IDは固定、Google IDsは引き続き未登録」を検証。価格JP/PH固定、年間トライアルなし、別アプリのIDと非重複。
- `validate.test.mjs` で既存商品ID数を修正、登録前の商品ID捏造防止の負例は残す。
- 2026-10-17追加：`apps.json` にRevenueCat `pro` / `default` とApple実商品紐付けの**GUI観測証跡**を追記。`price-policy.json` はJP/PH限定配信と月額初回無料の保存を反映。静的検証はストア購入・Metadata状態を自動で証明しない。
- `node --test standards/mobile-subscriptions/v1/price-policy-gate.test.mjs standards/mobile-subscriptions/v1/validate.test.mjs`: **16/16 PASS**。
- `node standards/mobile-subscriptions/v1/price-policy-gate.mjs`: valid=true、`appStoreProductsRegistered=true`、`readyForPaidSandboxTesting=false`。`node standards/mobile-subscriptions/v1/validate.mjs`: ok=true、4 Apple product IDs（Hataraku 2＋izakanpai 2）。

## iOS購入を正式E2E判定するための事前条件と検証ログ

- 2026-10-17に`mobile-app/web/config.js`の作業ツリーを読んだところ、`BILLING_AVAILABLE:true`。**ソース上のフラグがtrueであることは現在のTestFlightバイナリへの反映を保証しない**。QAビルド・署名・バージョンを実機で別途証明する。
- `mobile-app/web/billing-native.js`はオーナー認証→`getBillingIdentity`→iOS専用公開SDKキー→RevenueCat Purchases.configure→`getOfferings`→購入/復元の順。取得できたStore商品の情報を表示し、端末購入成功とサーバーでPro確定済みの表示を区別する。
- `src/subscriptions.js`では`REVENUECAT_IOS_PUBLIC_SDK_KEY`を要求し、未設定なら`missing_revenuecat_platform_sdk_key`を返しUIは購入不可となる。**テスト対象Worker上でキーが存在するかは未検証**。Androidのキーを代用してはいけない。
- Source verification: `node --test test/izk_ut_084_pro_comparison_always_visible_test.mjs test/izk_ut_085_billing_qa_activation_test.mjs test/subscription_integration_test.mjs`: **exit 0／Node test 16/16 PASS／subscription integration internal 27/27 PASS**。ただし全てローカル/疑似チェックで、ストア実購入証拠ではない。
- Appleの公式ヘルプは価格メタデータ変更がSandboxへ反映されるまで最大1時間かかる場合がある旨を案内。RevenueCatのiOSサブスクリプション提出手順は不完全なMetadataではSandboxの商品取得や審査提出に失敗する可能性を示す。Missing Metadata消失とStoreKit商品取得は必ず別々に確認する。
- 共有Chromeが別作業セッションで切り替わる事象あり。後続作業で月額の日本語・英語ローカライズ**2件**を個別保存し、Apple画面で両行の読戻しを確認。年額は入力画面を開いた直後にChromeがRevenueCatのOverviewへ切り替わったため未入力・未保存。誤送信防止のため年額のGUI作業は専有可能になるまで停止する。商品・価格・地域・お試しOffer/RC設定に影響なし。
- 書き込みはApple/RevenueCatの設定に限定。ストア審査提出・本番公開・Git commit/push/Worker deployなし。正式QA記録にPASSを追加せず。

### ローカライズ登録状況（商品テキスト／掲載画像とは別）

App Store Connectの各サブスクリプション「表示名と説明」は表示名35文字・説明55文字以内をGUIで確認。次の短い事実記述のうち**月額2件はAppleへ保存・読戻し済み**、**年額2件は未保存**。

| 商品 | 言語 | 表示名 | 説明 | 状態 |
|---|---|---|---|---|
| Monthly | 日本語 | izakanpai Pro（月額） | izakanpai Proの月額自動更新プランです。 | **保存・読戻し済み** |
| Monthly | 英語（アメリカ） | izakanpai Pro Monthly | Monthly auto-renewing izakanpai Pro subscription. | **保存・読戻し済み** |
| Annual | 日本語 | izakanpai Pro（年額） | izakanpai Proの年額自動更新プランです。 | 未保存 |
| Annual | 英語（アメリカ） | izakanpai Pro Annual | Annual auto-renewing izakanpai Pro subscription. | 未保存 |

この説明に、全顧客一律の無料トライアルや未確認のPro特典を約束する文章を加えない。無料期間の対象資格および更新料金はAppleの購入確認に従う。画像・審査提出は引き続き保留する。

## RevenueCat 再照合とソース回帰（2026-10-17 18:45頃）

- RevenueCat `izakanpai POS` プロジェクトの Offering `default` には `$rc_monthly` / `$rc_annual` の各パッケージに、App Store実商品 `com.izakanpai.commissionpos.pro.monthly` / `com.izakanpai.commissionpos.pro.annual` が表示される。Test Storeの商品も同じパッケージに別ストアとして残る。商品IDの重複作成やTest Store商品の削除は行っていない。
- Entitlement `pro` のAssociated productsは計4件（App Store実月額・年額2件＋Test Store月額・年額2件）。Apple両商品に`pro`が関連付いていることを再確認。
- RevenueCatのizakanpai POS (App Store) > In-app purchase key configuration、App Store Connect API欄はともに **Valid credentials** と表示。秘密鍵・APIキーはドキュメントへ転記していない。
- Apple商品のRevenueCat Store Statusは依然 **Missing Metadata**。Appleの購入画面に表示されるか、StoreKitが商品を取得できるか、無料トライアルの資格判定、WebhooksによるPro確定は**未検証**。ユーザー指定により掲載画像は後回し、審査提出・公開・実課金は行わない。
- `mobile-app/web/config.js` は`BILLING_AVAILABLE: true`、`billing-native.js`は端末ネイティブPurchasesプラグイン、サーバーから取得するOS専用公開キー、Offering、購入復元、サーバー確認済Proの分離を実装している。ただし実際のTestFlightバイナリにこの状態が含まれるか未照合。
- `node --test test/izk_ut_084_pro_comparison_always_visible_test.mjs test/izk_ut_085_billing_qa_activation_test.mjs test/subscription_integration_test.mjs` **16/16 PASS**、統合内部チェック **27/27 PASS**（このセッションで再実行）。`node standards/mobile-subscriptions/v1/price-policy-gate.mjs`は`valid:true`・`readyForPaidSandboxTesting:false`。ローカルのPASSを実機Sandbox正式PASSへ置き換えない。

## 次の実施順

1. **完了**：月額・年額のJP/PH料金と提供地域、月額初回1か月無料（2地域・2026-10-17開始）をApp Store Connectで保存・読戻し。
2. **完了**：RevenueCat App Store実商品2件のEntitlement `pro` / Offering `default` 対応を保存・読戻し。Test Storeと混同しない。
3. **一部完了**：月額商品は日本語・英語の表示名・説明を保存済み。年額商品の同2件と必要に応じたグループ表示名は未保存。共有Chromeが操作途中に別セッションのRevenueCatへ切り替わったため、第三者セッションへ誤入力・誤保存しないよう年額のGUI続行を一時停止。
4. **後回し**：ユーザー方針に従いスクリーンショット等の審査・掲載素材、アプリ・商品審査提出と公開。RevenueCat `Missing Metadata`は継続しておりStoreKit購入可否を意味しない。App Store Connectのステータスとメタデータ不足を切り分ける。
5. **未完**：TestFlight iPhoneのSandbox実購入→Pro→復元→期限切れ／返金、RevenueCat実イベント→隔離Cloudflare→Control D1・Tenant D1を独立照合。現時点では未実施。

**注意**: Apple商品ページに状態「提出準備中」が表示されていることと、実機で購入できることは別判定。Productionでの課金やアプリ審査提出を含む変更は行わない。Git commit/pushも実施しない。

## RevenueCat再読戻しと共通QA阻害理由の更新（2026-10-17 夜）

- 既存のRevenueCat izakanpai POS Project `7fcf50db` で **Entitlement `pro` の Associated products 4件**を再読戻し。内訳はApple本物の月額/年額ID各1件と別Test Store月額/年額各1件。SKUの新規重複作成なし。
- **Offering `default` に `$rc_monthly` と `$rc_annual` の2パッケージ**を再読戻し。各パッケージには正しいApple実商品IDとTest Store側商品がプラットフォーム別に紐付く。RevenueCat画面のApple商品2件はどちらも `Missing Metadata` を継続表示。
- iOSの `ios/App/CapApp-SPM/Package.swift` と `ios/App/App/capacitor.config.json` に `@revenuecat/purchases-capacitor` / `PurchasesPlugin` が含まれる。`mobile-app/web/billing-native.js` は非owner遮断、platform-specificキー、`Purchases.configure` / `getOfferings` / 購入・復元と、ストア側購入とサーバー側Pro確定の区別を実装。**現在のTestFlight配布ビルドへの取り込みやWorkerの公開SDKキー配置は未検証**。
- ローカル再試験: 端末課金起動・契約ソース関係 `node --test test/izk_ut_084_pro_comparison_always_visible_test.mjs test/izk_ut_085_billing_qa_activation_test.mjs test/subscription_integration_test.mjs` **16/16 PASS**、内側の統合チェック **27/27 PASS**。Webhookライフサイクルと共通matrix負例 `node --test test/revenuecat_lifecycle_offline_test.mjs standards/mobile-subscriptions/v1/qa-matrix-gate.test.mjs` **27/27 PASS**。共通価格/manifest/matrixユニット **26/26 PASS**。
- `standards/mobile-subscriptions/v1/qa-matrix.json` の izakanpai `externalBlockers` に残っていた古い「Apple商品未登録」「隔離Sandbox未構築」を、実績に沿って **Metadata/StoreKit取得未検証、App→Webhook→D1実Store購入未検証、ターゲットTenant WorkerのiOS公開SDKキーとTestFlightビルド未検証、Google Play未完、物理E2E未実施**に改訂。`qa-matrix-gate.mjs` は `valid=true, allReady=false`、`--release` の **exit 1は意図した公開抑止**。
- 既存Production Workerへのデプロイ・D1書込み・Store審査提出・正式QA PASS昇格・Git commit/pushなし。共有Chromeの別作業に干渉しないよう、年額の表示名/説明と掲載画像の残件には触れていない。
