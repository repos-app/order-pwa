# izakanpai POS｜iOS課金引継ぎ再開・Metadata／Sandbox照合（2026-10-17 夜）

## 結論と判定の範囲

- **ローカル調査・ゲート整備は実施済み**。StoreKitの実購入／RevenueCat本物の取引／公式QAのPASSは **0件（未実施）**。正式FAILと判定した実機ケースも0件。
- RevenueCat `izakanpai POS`のApple実商品2件は、最後に保存された **2026-10-17 19:17:46 PHT** の画面で両方 `Missing Metadata`。このチャットでは既存画像を再確認したが、PC再起動後の認証済みGUIの**新規読戻しは未実施**。現在も同ステータスであると断定しない。
- 価格、販売国、Trial、Entitlement、Offeringの既存保存設定は再登録・変更していない。ストア審査提出、本番公開、ビルド、git commit/push、Cloudflareデプロイ、Apple実決済、正式QA台帳の更新は実施していない。

## 1. 現認した証拠（既存の画面保存）

| 項目 | 観測結果 | 証拠／根拠 |
| --- | --- | --- |
| Apple実商品（2件） | `com.izakanpai.commissionpos.pro.monthly` / `.annual` | `.tenant-provisioner/billing-sandbox/rc_products_loaded.png` |
| RevenueCat商品状態 | 月額／年額とも `Missing Metadata`、各 `1 Entitlements` | 同上、2026-10-17 19:17 PHT |
| RevenueCat Offering | `default`の`$rc_monthly`／`$rc_annual`にApple各商品が存在 | `.tenant-provisioner/billing-sandbox/rc_default_both_products.png` |
| Test Store区分 | Apple実商品と別のTest Store月額／年額がOfferingに併存 | 同上（App StoreアイコンとRC Test Storeアイコンで分離） |
| 月額ローカライズ | 日本語・英語（アメリカ）とも保存済み（引継ぎ時の保存報告） | `docs/IZK_IOS_SUBSCRIPTION_APP_STORE_SETUP_20261017.md`、`asc_monthly_both_locales_saved.png` |
| 年額ローカライズ | 日本語・英語（アメリカ）とも保存証跡なし | 同上（年額画面は共有Chromeの切替で中断） |
| 価格とTrial | 月額 JP ¥1,980／PH ₱499、年額 JP ¥19,800／PH ₱4,990、月額のみ初回1か月無料 | `docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md`／`price-policy.json` |

過去の証跡によるRevenueCatの `1 Entitlements` は商品→`pro`紐付けの確認であり、契約者へのサーバー側Pro付与を意味しない。

## 2. Missing Metadata原因の切り分け

**断定した根因はまだない。** Apple／RevenueCatの仕様と保存状況から、以下を切り分けた。

| 疑義 | 証拠の有無 | 現在の評価／残作業 |
| --- | --- | --- |
| 年額商品表示名・説明不足 | 2言語とも保存証跡なし | **不足が具体的に確認できる項目**。専有可能なASC GUIで同2件を保存・読戻しする |
| サブスクリプショングループ自体のローカライズ | 完了証拠なし | **有力候補／未確認**。商品個別とは別にグループの表示名を確認する |
| Apple審査用スクリーンショット | 未整備（掲載素材はテスト終了後） | Ready to Submitに向けた不足候補。**ユーザー方針につき作成・登録しない**。審査提出もしない |
| Paid Apps Agreement・税務・銀行情報 | 今回の実画面証拠なし | **未確認**。App Store Connect Businessで契約有効・税務・銀行Clearを照会する |
| RevenueCat Apple IAPキー・ASC API資格 | 以前の画面で両方 Valid credentials | **認証設定の存在は以前確認済み**。今の有効性を保証しないので次回読戻し |
| StoreKit商品取得・月額Trial資格 | iPhoneで検証していない | **独立の未検証**。Missing Metadataの表示だけで購入可能／不可能とは判定しない |

公式参照：
- https://www.revenuecat.com/docs/test-and-launch/submitting-ios-subscription-app
- https://www.revenuecat.com/docs/getting-started/entitlements/ios-products
- https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information
- https://www.revenuecat.com/docs/test-and-launch/sandbox/apple-app-store

## 3. iOS課金・Sandbox backendの静的およびリモート照合

- `mobile-app/web/config.js`では`BILLING_AVAILABLE:true`。`mobile-app/web/billing-native.js`はOwner確認、OS固有のRevenueCat公開SDKキー、`Purchases.configure()`、`getOfferings()`、購入・復元を使用する。StoreKit表示価格はSDKが返す値でありハードコードしない。ただし**現在配布中のTestFlightバイナリ反映は未確認**。
- `src/subscriptions.js`の現ソースは、iOS公開キーに`appl_`、Androidに`goog_`を要求し、RC Test Storeの`test_`や別OSの鍵を購入アダプターへ渡さずfail-closedとする。Owner/店舗別Customer IDを守る。これは**ソース確認**であり実機確認ではない。
- 2026-10-17 PC再起動後、`npx --no-install wrangler secret list --config .tenant-provisioner/billing-sandbox/wrangler.tenant.toml`を**読取りのみ**実行（終了コード0）。秘密値を表示・保存せず、必要なSecret名だけ確認した：
  - `CONTROL_SERVICE_SECRET`: **登録済**。
  - `REVENUECAT_IOS_PUBLIC_SDK_KEY`: **未登録**。
  - `REVENUECAT_ANDROID_PUBLIC_SDK_KEY`: **未登録**（本件iOSとは別の後続依存）。
- `REVENUECAT_IOS_PUBLIC_SDK_KEY`がこの隔離Tenant Workerに無い間は、同Worker経由のiOS購入Identityを初期化できない。実Apple App Store SDKキーを適切な隔離Workerに設定する必要がある。値そのものをMarkdown／ログ／Gitへ記載しない。
- `src/billingSandboxIngress.js`はSandbox webhook専用Ingress。Webhook署名HMAC、Authorization、Sandbox環境、Control→`billingqa` Tenant D1の分離を共通テストで確認。既存RevenueCat `TEST`イベントと実StoreKit `INITIAL_PURCHASE`イベントは異なる。
- 共通`standards/mobile-subscriptions/v1/sandbox-config.mjs`の隔離Tenantテンプレには`REVENUECAT_ALLOWED_STORE=APP_STORE`と月／年実Apple商品IDのallowlistが存在。**以前作成されたローカル生成済み** `.tenant-provisioner/billing-sandbox/wrangler.tenant.toml` には2項目が欠落していたため、このファイルに設定を追加した。**Cloudflare実配備版への反映は未検証・未デプロイ**。新規構成生成時は既存テンプレを使用する。
- 現在の隔離IngressはWebhook入口のみで一般アプリログイン/課金Identity APIを公開しない。`billingqa`のiPhone実購入とD1 E2Eを行うには、別途安全なテストアプリ認証/API経路および実TestFlightバイナリ・Sandbox Storeアカウントが必要。

## 4. 新規共通化とオフラインQA結果

- 新規ファイル：`standards/mobile-subscriptions/v1/apple-metadata-observation.json`（Evidenceと`verified`／`unverified`／`deferred`の区別）
- 新規ファイル：`standards/mobile-subscriptions/v1/apple-metadata-gate.mjs`（Apple商品ID・RCステータス・グループ/商品ローカライズ・審査スクリーンショット・商用資格・StoreKit取得のチェック）
- 新規ファイル：`standards/mobile-subscriptions/v1/apple-metadata-gate.test.mjs`（別アプリ混同・不足情報を拒否、実購入を自動PASSにしない負例）
- 新ゲートの結果：`valid=true, metadataComplete=false, purchasePreparationVerified=false, appleSandboxE2eVerified=false`。
- **実測**：2026-10-17 再起動後、以下のテスト群を1回実行し**75/75 PASS／FAIL 0**。価格／マニフェスト／Metadata／QA matrix／Sandbox Config／Webhook／2 DB SQLite統合／Ingressを含む：

```powershell
node --test standards/mobile-subscriptions/v1/apple-metadata-gate.test.mjs standards/mobile-subscriptions/v1/price-policy-gate.test.mjs standards/mobile-subscriptions/v1/validate.test.mjs standards/mobile-subscriptions/v1/qa-matrix-gate.test.mjs standards/mobile-subscriptions/v1/sandbox-config.test.mjs test/revenuecat_lifecycle_offline_test.mjs test/revenuecat_sandbox_sqlite_integration_test.mjs test/billing_sandbox_ingress_test.mjs
node standards/mobile-subscriptions/v1/apple-metadata-gate.mjs
node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release
```

- 共通`--release`ゲートは**exit 1（意図されたNO-GO）**。iOS/Android公式Sandbox QAはどちらも0/16である。上記75件を正式QAのPASS数に加算しない。

## 5. 残件／実行順

1. **Apple GUI**：課金グループのローカライズ、年額日本語／英語の商品ローカライズを保存・読戻し。商品個別のMetadata不足の表示位置を確認。審査素材登録は保留。
2. **商用資格**：App Store Connect BusinessのPaid Apps Agreement、税務・銀行Clearを読取り確認。RevenueCat 2鍵のValid credentialsを再照合。
3. **RevenueCat商品状態**：Apple月／年2件を再読戻しし、`Missing Metadata`の継続・改善を記録。Apple Sandboxの`getOfferings()`はこのステータスと独立に検査。
4. **SDKと配備**：隔離TenantのApple `appl_`公開SDKキーSecret、Appleのみ実商品allowlist、Sandbox用の認証/API経路、iPhone TestFlightビルドハッシュと端末claimを確認。**デプロイは別操作**。
5. **Apple Sandbox実E2E**：月額／年額、ストア国JP/PH、月額Trialの実対象資格、購入→再起動→復元→失効・返金を実アカウントで検証。Test Storeの契約は代用不可。
6. **Webhook/D1実E2E**：RevenueCat本物のApple Sandbox購入イベント→署名検証→隔離Control/Tenant D1のPro変化をイベントIDと店舗IDで照合。別店舗への付与・古いイベント・返金を確認し、公式QA runnerでのみ確定する。

**禁止操作を守った記録**：既存正式QA/実機への入力なし、ストア審査提出・本番公開なし、Cloudflare deploy/課金イベント送信なし、git commit/pushなし。ローカルファイル変更とCloudflare Secret名の読取のみ。
