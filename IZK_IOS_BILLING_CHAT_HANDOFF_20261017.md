# izakanpai POS iOS課金設定 / 新チャット引継ぎ（2026-10-17 夜）

**2026-10-18 00:40 PHT｜①→②→③ 設定専任の最新まとめ**：まず `docs/IZK_BILLING_GATEWAY_PREPUBLICATION_SECURITY_20261018.md`、次に `docs/IZK_IOS_BILLING_CODEMAGIC_SETTINGS_20261018.md`、最後に `docs/IZK_IOS_BILLING_APPLE_REVENUECAT_SETTINGS_20261018.md` を読む。①Gatewayのsession専用pathで不要queryを拒否し、未認証GET/CORS Originのステージング判定不一致を修正。WAF・namespace確認・Owner資格は依然未完、Gatewayは `SANDBOX_LOGIN_GATEWAY_ENABLED=0`、`workers_dev=false` で非公開。②Codemagic手動専用の**未登録**テンプレートは、匿名READY JSON・生成された一時資材・元mobile-dist保護を追加整備、既存 `codemagic.yaml`変更なし。③Apple月/年、RC Entitlement/Offeringや契約は**10/17の実画面証拠を再監査**。Browserは別コンテキストで閲覧不能、10/18ライブのASC/RC状態は未確認。RC製品 `Missing Metadata` は10/17時点。**全工程とも実機・正式QA・Sandbox Worker deploy・App Store審査/公開・Codemagicビルド・commit/pushは実施なし、Release NO-GO**。

**2026-10-18 00時台｜設定専任最新**：`docs/IZK_IOS_BILLING_SETUP_CONTINUED_20261018.md` が今回の正本。隔離Sandbox GatewayにCloudflare側のログイン・Owner専用Rate Limit bindings（12/60秒、60/60秒）と送信元IP必須処理、Owner拒否後のセッション失効要求、Private Ownerを1つのログインGateway`/owner`経由で呼ぶ認証付き接続をローカル追加。Sandboxビルド時のみ別Entry Login画面を構成し、本番POSの管理APIへ偽装接続しないようにした。**別途、手動専用・配布OFFのCodemagic Sandbox workflow雛形も新設（既存Codemagicには未接続、YAML構文のパーサ検証未完）。** Cloudflare`wrangler --dry-run`の構成読込は成功したが**両Workerは無効／非公開、remote deploy・QA・IPAなし、Release NO-GO**。テストは別チャットの指示なのでこのチャットでは実施しない。

**最新：設定専任チャット（正式QAは別チャット）**：`docs/IZK_IOS_BILLING_SETTINGS_ONLY_HANDOFF_20261017.md` にソース配線・残設定を記録。iOS Capacitor test Audienceを**生成したSandboxコピーだけ**で認識させる処理、Owner getBillingIdentityのstoreId応答不足修正、隔離ログインGatewayの既存Native `POST /?api=1` 契約対応をローカルに実装。2つのOwner/Login Workersは**無効／非公開、Owner実資格と実HTTPS到達なし**、配備・IPA・正式QAは行わず、公開判定NO-GO。Apple月/年商品とJP/PH価格、日英表示、月額trialは変更なし。既存の過去日付の完了報告を現在の遠隔設定・実購入の証拠と誤読しないこと。

**2026-10-17 23時台 最新のGPT継続作業**：docs/IZK_IOS_BILLING_SANDBOX_CONTINUED_20261017.md を優先参照。iOS Sandbox資材生成の成功側Array.map(resolve)例外を修正し、Source path検査・symbolic linkと本番公開URLの混入遮断を追加。専用**7/7 PASS**、課金関連オフライン**126/126 PASS**、Control**48/48**、既存課金統合**27/27**。Native Owner APIはstoreId厳密一致・Apple appl_・billingqa RevenueCat ID/entitlement検証を追加。**Owner実ログイン、非公開Owner URL、テスト専用IPA、Apple実購入は未完了／公式QA PASS0・FAIL0**。実接続のGateは正しくNO-GO。審査、本番公開、正式QA/実機claim、Git commit/pushなし。

**2026-10-17 22:55 PHT追加（優先する最新Owner Sandbox引継ぎ）**：`docs/IZK_IOS_BILLING_SANDBOX_OWNER_CONNECT_20261017.md` を参照。隔離 `billingqa` Owner実レコード1件・ログイン不足を確認。remote SQL backupのうえ既存0016/0017/0020マイグレーションと隔離Tenant `AUTH_SECRET`登録を完了・各remote再読戻しPASS。Owner別WorkerのiOS CORS/店舗境界テスト15/15、iOS専用transportの追加と既存生産API維持をソースで確認。課金関連総合回帰 **118/118 PASS**、既存課金統合 **27/27 PASS**。**Owner実ログイン0、Owner API一般公開0、Sandbox iOS IPA0、正式Apple Sandbox購入PASS/FAIL各0。** 新しいSandbox IPA準備ゲートはURL・ログインプロキシ未整備のため意図したNO-GO。ストア審査・公開・本番環境を変更しない。

**最新の遠隔証拠（22:16 PHT）**：`docs/IZK_IOS_BILLING_SANDBOX_CONTROL_DEPLOY_20261017.md` を先に読む。隔離Control Workerのatomic-claim修正はRemote新Version100%配備済み（ただしWrangler呼出しは警告exit1）。その後RevenueCat本体からTEST再送でHTTP200、隔離Control D1 5→6、Tenant Free維持、Ingress否定系4/4一致。iOS公開SDKキーも隔離Tenantへ設定・Secret名再確認済み。**Apple Sandbox実購入と正式QAは依然0件／未実施**。この時点より前の「SDKキー未登録」「RC実配送未実施」「Control修正未配備」は古い状態。

**追加の最新正本（22:23 PHT以降）**：`docs/IZK_IOS_BILLING_CONTINUED_EXECUTION_20261017.md`。Controlの`Tenant 200 ignored/ok:false`偽適用防止（修正前FAIL→48/48 PASS）と同一SKUの異Apple original transaction返金誤失効（修正前FAIL→実SQLite含む30/30 PASS）を実装。Sandbox Tenant D1はSQL backup取得後に`0047`の新列を遠隔readback、隔離Tenant/Control Workerの新コードVersionがそれぞれ100%配備済み。Apple SDK KeyとControl HMAC Secretは保全。Owner専用の別APIソース11/11 PASS・**未配備／未接続**。全体オフライン107/107＋Control48/48＋既存統合27/27 PASS、正式Apple Sandbox QAは引き続き各0、Release NO-GO。新ソースの遠隔RevenueCat真正TEST再配送は本節の配備後**未実施**で、前回22:15のTEST200を今回の新VersionのPASSに流用しない。ストア審査・公開・本番DB操作は行っていない。

## 依頼・制約

- 対象：izakanpai POS iOS、App Store Connect／RevenueCat／Cloudflare課金連携。
- ユーザーの最新指示：「続けて下さい」→「チャット引き継ぎお願いします」。次チャットではこの文書を読み、未完了作業から再開。
- ストア掲載素材はまだテスト中なので後回し。App Review提出・本番公開・本番Worker/D1デプロイ、実Apple課金、既存正式QAへの干渉は禁止。今回、隔離課金SandboxへのSecret設定・Control版反映・RevenueCat TEST送信を行った事実は冒頭の最新報告に明記。次のSandbox配備もremote/local差分を未解消のまま繰り返さない。
- 確定料金や月額無料期間を勝手に改定しない。Hataraku NihonGO!とはRevenueCat project/商品/Entitlementを混同しない。
- 他アプリへの横展開を想定し、`standards/mobile-subscriptions/v1/` の共通ゲート/マニフェスト/試験を保つ。

## 対象環境

- ローカル：`C:\Users\user\OneDrive\_work\izakanpai`（Windows PowerShell 5.1、`&&`不可）。
- Apple アプリ：`izakanpai - All In One POS`、ASC App ID `6815685162`、Bundle ID `com.izakanpai.commissionpos`。
- 自動更新サブスクグループ：`izakanpai Pro`、ID `22487367`。
- 月額：ASC ID `6823916048`、Product ID `com.izakanpai.commissionpos.pro.monthly`、期間1か月。
- 年額：ASC ID `6823916607`、Product ID `com.izakanpai.commissionpos.pro.annual`、期間1年。
- RevenueCat project：`izakanpai POS`、project `7fcf50db`。Entitlement `pro`、Offering `default`、月額package `$rc_monthly`、年額package `$rc_annual`。

## Apple側で画面操作・保存・再読戻し済み

| 商品 | 日本 | フィリピン | 配信対象 | Trial |
| --- | --- | --- | --- | --- |
| 月額 | ¥1,980 | ₱499 | JP/PH 2地域のみ | 新規対象者に初回1か月無料 |
| 年額 | ¥19,800 | ₱4,990 | JP/PH 2地域のみ（1年一括前払い） | なし |

- 月額の2地域：2026-10-17、Apple UI保存後「175か所の国または地域のうち2個が選択」の表示を確認。
- 年額の2地域：2026-10-17、Apple UI保存後「1年間前払い」欄に「175か所の国または地域のうち2個」と表示、確認ダイアログにJPY 19,800/PHP 4,990を表示。別オプション「12か月契約の月額制」は未設定。
- 月額Trial：Apple UI `/.../6823916048/pricing/intro-offers` に「最初の1か月間は無料」、JP/PH、開始 `2026-10-17`、終了日なしとして保存され、一覧に読戻し確認。
- Appleの国別標準価格一覧にはほかの国の自動換算価格も表示されるが、これは実際の販売可否とは別。年/月の配信国はJP/PHのみ。
- Apple上の商品は「提出準備中」であり、審査提出・承認・本番販売は完了していない。表示名/説明ローカライズ・審査向けスクリーンショットなどは未整備（ユーザー指定で掲載素材を延期）。

## RevenueCat側で追加確認された状態

- 2026-10-17 19:16頃のGUI保存証拠：`.tenant-provisioner/billing-sandbox/rc_default_both_products.png`。
- Offering `default` に Monthly `$rc_monthly`／Yearly `$rc_annual` それぞれ **Apple実Product ID** が紐付け済み。元のRevenueCat Test Store Monthly/Yearlyも同Offeringに存在する（誤認注意）。
- 19:17頃のGUI証拠：`.tenant-provisioner/billing-sandbox/rc_products_loaded.png`。Apple実2商品とも `1 Entitlements`（`pro` に紐付け）、ただし両方ステータス **Missing Metadata**。Test Storeには別途同名2商品が存在。
- `standards/mobile-subscriptions/v1/apps.json` の `appleRevenueCatEvidence` および `price-policy.json` の `evidence` は実GUI状態に同期済み（2026-10-17 18:49頃更新）。ただし**iPhone StoreKit Sandbox実購入の証跡なし**。
- RevenueCatのConsole Project Overview画面は現状Snapshotと異なる可能性があるので、次チャットはまず画面を再確認。RevenueCatでTest Storeの購入をApple Sandbox購入としてカウントしない。

## 必要な次アクション（優先順）

1. **RevenueCatのMissing Metadata根因調査**：App Store Connectの契約/税務/銀行、IAP能力、API認証/連携、商品メタデータを権限・画面・エラーから切り分け。表示名・審査用素材の後回し方針を尊重し、不要な提出・公開は行わない。
2. **RevenueCat収録状況・資格チェック**：Product IDs/Offering/Entitlement readback、JP/PH価格と月額Trial eligibility、StoreKit2/SDK/購入画面実装有無を確認。Test Store混在によるSandbox誤判定を防ぐ。
3. **iPhone Sandboxの実機購入フロー準備・検証**：購入→`pro`付与→再起動維持→購入復元→解約/期限切れ/返金。iPhone端末は他QAが使用中の場合claim/排他を確認し、独断で操作しない。
4. **Webhook→Cloudflare D1のテナント境界照合**：RevenueCat Sandbox通知（テストPingではなく実購入イベント）をControl D1/Tenant D1へ検証。別店舗への権限漏れを防ぐ。実Webhookの送信だけでは実購入PASSにならない。
5. **共通台帳/品質ゲート更新**：各工程で実画面証拠、未検証範囲、アプリ別共通化、テスト結果を保存。掲載素材/レビュー申請/公開は別工程。

## ソースの現状と試験

- 共通ファイル：`standards/mobile-subscriptions/v1/apps.json`、`price-policy.json`、`price-policy-gate.mjs`、`validate.mjs` と試験群。
- 2026-10-17引継ぎ時に `node --test standards/mobile-subscriptions/v1/price-policy-gate.test.mjs standards/mobile-subscriptions/v1/validate.test.mjs` → **16/16 PASS**。
- `node standards/mobile-subscriptions/v1/price-policy-gate.mjs` → `valid:true`、`appStoreProductsRegistered:true`、`googlePlayProductsRegistered:false`、`readyForPaidSandboxTesting:false`。※最後のfalseは現時点の設計ゲート表現で、Appleに登録された商品を使って実購入を済ませたことは意味しない。
- 関連ドキュメント（旧作業記録）：`docs/IZK_IOS_SUBSCRIPTION_APP_STORE_SETUP_20261017.md`。旧文書の「月額価格未設定/Offering未接続」は更新前Snapshotであり**この最新引継ぎを優先**。
- 2026-10-17の`git status`では `standards/mobile-subscriptions/v1/` および旧作業記録のdocsが未追跡。**このチャットではGit commit/push、ビルド、Cloudflareデプロイ、審査提出を実施していない**。

## 引継ぎ再開指示

まず `docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md` とマニフェストを読み、RevenueCatの実画面に残るApple2商品のMissing Metadataを原因別に調査してください。月額・年額JP/PH価格と月額無料Trialの再登録は不要です。ソース調査・オフラインテスト・iOS課金Sandboxの安全な準備は許可範囲で進め、物理的なQAや公開行為は別に扱ってください。完了済と未検証を混同しないこと。

## 2026-10-17 PC再起動後の続報

**最新の追加調査・75/75オフラインPASS・Cloudflare Sandbox TenantのiOS公開SDKキーSecret名未登録・Metadata原因候補・追加共通ゲート・残件は `docs/IZK_IOS_BILLING_RESUME_20261017.md` を参照。** この追補もApple Sandbox購入・公式QA PASSではない。年額ローカライズと審査素材を勝手に登録していない。

## 追記：2026-10-17の継続作業

今回のソース修正、Cloudflare Sandbox Tenant WorkerのSecret名のみの実読戻し、最新ローカル回帰 **85/85 PASS**、未完了・外部ブロッカーについては `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` を確認。Apple/RevenueCatの現在GUI状態とApple StoreKit Sandbox実購入は未確認・未実施。コード変更は遠隔配備・正式QAへ未反映であり、掲載素材/審査提出/公開は引き続き禁止。

### 20:13 PHT 追加

`docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` に、RevenueCat PRODUCT_CHANGEの誤状態遷移と旧SKU BILLING_ISSUE誤失効の**再現・修正・94/94オフラインPASS**、既存27/27統合テスト、共通 `scripts/qa-revenuecat-readiness.mjs --sandbox` によるSandbox iOS公開SDKキー不足のリモート再読戻しを追記。最新の有効な結果はこの追記を優先。正式Apple Sandbox E2Eは引き続き0件（未実施）であり、遠隔配備・ストア提出・公開なし。

### 21:32 PHT 実App Store Connect続報（この追記を優先）

ユーザーがASCにログインした後、**年額商品の日本語・英語（アメリカ）表示名と説明、およびサブスクリプショングループの日本語・英語（アメリカ）表示名を保存・再読戻し完了**。Paid Apps Agreement・銀行登録・米国税務フォーム2件はすべて有効。正本 `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` の「21:08〜21:32 PHT」節とIgnored画面証拠を確認。RevenueCatブラウザセッションはログアウトされており、最新Missing Metadataの状態は**未確認**。RevenueCatログイン後に既存商品の読戻しが次作業。審査スクリーンショット、App Review提出・公開、iPhone Sandbox課金、Cloudflare deploy、公式QAへの正式反映はいずれも引き続き未実施。

**21:33 PHT検証**：Apple実画面情報の変化に対応したMetadataテストの旧期待値を修正し、総合ローカル **94/94 PASS** に復帰。`metadataComplete=false` および正式Release NO-GOを維持。現在ChromeはRevenueCatログイン画面で、次はユーザーログイン後に2商品のMetadata状態を再読戻しする。

### 21:45 PHT 最新：RevenueCat認証済み実画面を再読戻し

RevenueCat **izakanpai POS** Project `7fcf50db` のApple月額・年額実商品はいずれも依然 **`Missing Metadata`**（各1 Entitlement）。Apple月／年商品とグループの日英表示名、Business有料契約・登録銀行・税務の有効性は実画面で確認済み。詳細は `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` の「21:41〜21:45」節と `.tenant-provisioner/billing-sandbox/rc_products_live_loaded_2143.png`。審査用スクリーンショットはテスト後まで保留する方針を維持し、現時点ではMissing Metadataの単一根因を断定しない。App Store提出・公開およびApple Sandbox実購入は未実施。

**21:51 PHT追加**：RevenueCat既存Apple AppのBundle ID一致、IAP KeyとASC APIの両資格が `Valid credentials` と最新GUIで確認済み。共通Metadata gate更新後もローカル94/94 PASS／正式 `--release` NO-GO。RevenueCat公式によるとMissing MetadataのままでもApple Sandbox取得可能な場合があるため、審査素材保留とSandbox試験を切り離して進める。次の優先ブロッカーは隔離Sandbox Tenant WorkerのiOS `appl_`公開SDKキーSecretとOwner認証済み購入APIの未整備。詳細・証跡：`docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` の「21:51 PHT」節。

### 22:07 PHT 現時点の最終実績・次の再開ポイント

**重要：上記21:51時点の「SDKキー未登録」「RevenueCat実配送未実施」は最新状態ではない。** 本日22時過ぎ、RevenueCat実サービスから既存隔離WebhookへTESTを1回送信して**HTTP 200**、Cloudflare Control D1 `revenuecat_event_inbox` **4→5件**（新規 `TEST/SANDBOX/ignored_unknown`）、隔離Tenant D1 `billingqa/free`不変を実読戻し。さらにizakanpai Apple専用 `appl_` 公開SDKキーを**隔離TenantにのみSecret設定**（remote Secret名チェックPASS、隔離Tenant Version 100%配備済）。TESTはApple実購入のPASSではない。新たにControl同一Webhookイベント同時配信raceのローカルソース修正を追加し、**45/45 Control・94/94共通課金オフラインPASS**。Apple Sandbox正式PASS/FAILは依然各**0件**。次優先は**隔離Owner認証API経路/QAビルド、未知顧客イベントの再照合／原transactionの保証**。すべて `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` の「22:00〜22:07」節が詳細正本。掲載素材・審査提出・本番公開は禁止、公式QAとTest Store成果の混同も禁止。
