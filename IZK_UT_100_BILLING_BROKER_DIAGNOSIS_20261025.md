# IZK-UT-100: iOS課金「公開SDKキー未登録」誤診と内部取得経路の識別

## 症状・完了条件

- 2026-10-25 19:57 PHT、iPhoneの「プランとお支払い」で「この端末用のRevenueCat公開SDKキーがサーバーに登録されていません」と表示。実購入まで到達できない。
- 完了条件は **端末のOwnerがteatでApple Sandbox購入し、真正Webhook→Control→Tenant D1→Pro反映／再読込まで独立確認**。表示文言修正やソース単体テストだけでは達成ではない。
- QA環境はteat限定。他店舗・Android/iOSを巻き込んだ書込み、Secrets実値のログ・コード・Git登録、架空のPASSは禁止。

## 遠隔確認（秘密値は未取得）

- `wrangler secret list`で共通Worker `izakanpai-api` に `REVENUECAT_IOS_PUBLIC_SDK_KEY` と `CONTROL_SERVICE_SECRET` のSecret名あり。
- 本番版 `f3f69fa1-8d02-4074-9b49-2ef445642fc6` の `REVENUECAT_PURCHASES_READY=1`。
- 2026-10-25調査時の `teat`・`yuwaku` 稼働Versionに `PLATFORM_BILLING` service binding→`izakanpai-api` があり、各Workerに `CONTROL_SERVICE_SECRET` のSecret名がある。
- Secret実値の一致、Private Service Bindingの実際のHTTPステータス、iPhoneログイン店舗、SDK-Keyの正当性、Apple実購入は現時点で **未実証**。よって「Secret未登録」「認証不一致」のいずれも断定不可。

## 修正

- `src/subscriptions.js`: Brokerの存在、内部認証設定、404、準備フラグ503、実キー欠落503、未知の503／例外、200応答破損を区分する。取得結果はOwner認可後にのみ返す。旧 `billingPlatformSdkKey()` の文字列APIは後方互換。
- `mobile-app/web/billing-native.js`: 日本語/英語の表示を原因別に分離。例外理由と文字列コードを付ける。失敗時の購入/復元ボタンを引き続き抑止。
- `test/billing_shared_platform_sdk_test.mjs`: 所有者認可状態で失敗パターン9種の原因コード／キー非返却を追加。
- `test/izk_ut_085_billing_qa_activation_test.mjs`: 内部認証拒否を「キー未登録」と表示しない、購入呼出がゼロである回帰を追加。
- Failure時のWorkerログは `platform`・`reason` のみ。トークン、SDKキー、Owner、Customer、Storeの識別情報を出さない。

## 10観点の修正自己レビュー（ソース上の確認）

1. Owner認可前にはBrokerへアクセスしない — `requireBillingOwner` 先行。
2. iOS/Androidのキーを共有しない — `platformKey` 切替。
3. 旧汎用キーへフォールバックしない — OS別のみ。
4. テナント内にキーがある既存構成と後方互換 — local優先。
5. Binding未設定は独立の原因コード — `platform_billing_binding_missing`。
6. 認証設定不足と認証拒否を区別 — `platform_billing_auth_unconfigured` / `...rejected`。
7. Ready=0はキー未設定と混同しない — `platform_billing_not_ready`。
8. 503の実キー欠落だけがSDKキー未登録表示 — `platform_billing_not_configured` の明示マップ。
9. 不正応答やネットワーク失敗でも閉鎖側 — `configured:false`、キー非返却。
10. 認証失敗ログに秘密情報を残さない — `platform,reason` 限定。

## 10観点の同種横展開レビュー（ソース上の確認。実機試験ではない）

1. `teat` — リモートBindingあり、通信は未実証。
2. `yuwaku` — リモートBindingあり、変更・QA実行なし。
3. 新規Tenant — `renderTenantWrangler` の共通Bindingを保全。
4. iOS — `appl_` プレフィックス検査維持。
5. Android — `goog_` プレフィックス検査維持、公開Androidキーの遠隔有無は未確認。
6. Mac/WindowsのWebブラウザ — native platform以外の購入拒否維持。
7. RevenueCat Test Storeキー — `test_` をiOS/Android実購入に転用しない。
8. 所有者以外のスタッフ — Browser UIとサーバーで認可拒否維持。
9. Apple Sandboxで購入失敗時 — 結果をProに昇格させず、Webhook正本を維持。
10. Native UI言語JP/EN — 原因別説明追加、ローカルUI回帰を実行。

## 実行記録

- `node --test test/billing_shared_platform_sdk_test.mjs test/izk_ut_085_billing_qa_activation_test.mjs`: **25 PASS / 0 FAIL** (2026-10-25)。
- `node scripts/qa-billing-testflight-preflight.mjs signed-test`: `BILLING_TESTFLIGHT_SOURCE_READY`（StoreKit検証ではない）。
- `npx wrangler deploy --config .tenant-provisioner-production-teat.toml --dry-run`: exit 0。
- `npx wrangler deploy --config .tenant-provisioner-production-teat.toml`: exit 0; `teat`現行Version **6b6c7825-a3ba-4cc7-ba5c-64a4a0a00996**。`wrangler deployments status` に100%配備を確認、Secret名 `AUTH_SECRET` / `CONTROL_SERVICE_SECRET` と `PLATFORM_BILLING` を残している。
- iPhone TestFlightのローカルWeb資材は**未配布**。従来画面は新原因コードを個別表示できず、失敗の詳細はWorkerの構造化ログで確認する。iPhoneによる再読込とApple Sandbox購入の実証なし。**正式Apple購入PASS増分0**。

## 継続すべき作業

1. teatの既存Ownerで「プランとお支払い」を実再表示し、Workerログ `platform_billing_identity_unavailable` の `reason` を記録（ログに秘密値を含めない）。
2. 404であればTenant↔Routerの `CONTROL_SERVICE_SECRET` 一致／内部URL／Service Binding実HTTPを確認。503ならReady/key判定、例外ならWorker間疎通を確認する。証拠なしにSecretを一律ローテーションしない。
3. 実際の原因を解消後、再表示で `configured:true`、RevenueCat Offering、購入／復元／WebHook／D1反映を独立実証する。
4. iOS Nativeの原因コード別メッセージを新TestFlightへ反映する際は、署名付き配布と端末版の一致を証明する。
