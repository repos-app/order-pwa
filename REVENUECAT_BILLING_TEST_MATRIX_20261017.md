# RevenueCat課金｜ストア本人確認待ちに進めたQAと共通化（2026-10-17）

## 目的と安全境界

ユーザーの「まだテスト中、掲載素材は後」「課金関係で他にできること」へ対応。**掲載画像・Store説明・公開作業は行っていない**。複数アプリ間で共通化するのは試験契約と判定手順、Webhooks/秘密鍵/RevenueCat商品/購入主体/Entitlementの実体は独立。今回は正式ストア購入なし、Cloudflare Worker/D1への書込みなし、Apple/Google/RevenueCat管理画面の本番変更なし、Git commit/pushなし。公式QA台帳・実機claimには触れない。

## 実行対象

1. 実際の`src/subscriptions.js` / `src/plans.js` に対し`test/revenuecat_lifecycle_offline_test.mjs` を追加。偽の独立DBでイベント到着順・状態と実planを保持し、`applyVerifiedRevenueCatEvent`・`handleRevenueCatWebhook`・`verifyWebhook`を直接呼ぶ。イベント型だけを自作したロジックでシミュレーションするのではなく**本物のサーバー関数**を呼ぶ。
2. `standards/mobile-subscriptions/v1/qa-matrix.json` に16ケース（購入、復元、商品、失効、返金、署名不正、再送、請求失敗、オーナーと別アプリ間の分離など）、3アプリの別identity/entitlement、iOS/Android別証拠欄・外部依存を登録。外部実購入を実施したかのようなPASS記録はゼロで開始。
3. `qa-matrix-gate.mjs`：16ケース/3アプリとの一致、別アプリEntitlement混同、不足証拠/不正なOS/生産環境、ハッシュ欠落などを拒否する読取専用ゲート。**実ストアのレシートやエビデンスを検証できていない限り、独立の公式テストPASSとして扱わない**。
4. `scripts/qa-revenuecat-readiness.mjs` はローカルモードを再実行。Native課金フラグtrue、iOS/Android SDK存在、OS別公開SDKキーが必要なソース条件PASS。`productionWebhookRouteEnabled=false`であり、Sandbox隔離未完。**この報告時にCloudflare Secret存在名は再照会していない**（以前の調査記録 `docs/IZK_UT_085_REVENUECAT_BILLING_QA_20261017.md` の結果を参照）。

## 実行結果（本作業での測定）

| 実測 | 結果 | 注意 |
|---|---|---|
| `node --test test/revenuecat_lifecycle_offline_test.mjs` | **17/17 PASS** | Native実機/StoreKit/Google Billingの取引なし |
| `node test/subscription_integration_test.mjs` | **27/27 PASS** | 既存回帰 |
| `node --test test/izk_ut_085_billing_qa_activation_test.mjs` | **8/8 PASS** | ChromiumでのNative/Store SDK模擬 |
| `node --test standards/mobile-subscriptions/v1/validate.test.mjs` | **6/6 PASS** | App/商品/鍵境界の既存検証 |
| `node --test standards/mobile-subscriptions/v1/qa-matrix-gate.test.mjs` | **10/10 PASS** | 新共通QA台帳の負例検証 |
| `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs` | `valid=true`, `allReady=false` | 3アプリともStore Sandbox実購入証拠0 |
| 同ゲートの `--release` | **exit 1を期待** | 3アプリとも外部設定/E2E不足なのでリリース停止 |

## izakanpai実コードを使用したオフライン試験（17件）

- HMACが正しいSandbox通知からPro更新＋状態/プランの2表batch
- 署名Secret未設定／改ざん署名／Authorization不一致
- 署名時刻5分を超えるリプレイ・将来時刻
- PRODUCTIONイベントのSandbox拒否
- 異店舗ルートの契約データ拒否
- 不明顧客を無権限更新なしに処理
- 初回購入後の二重同一イベントの冪等
- CANCELLATION後の契約期間内Pro保持
- 更新より古いEXPIRATIONを無視
- REFUNDでFreeへ降格
- Webhook遅延時も実権限は満了日時でFree化
- BILLING_ISSUEで猶予なし→Free
- BILLING_ISSUEで猶予内のみ期限付きPro
- Entitlement不一致のINITIAL_PURCHASE拒否
- 不正JSON/不完全イベント拒否
- TEST等情報イベントでは契約無変更
- 正規ACTIVE/REVOKE/情報イベントの状態表

## 自己レビュー10件（コード調査・具体的証拠）

| ID | 独立観点 | 確認結果 |
|---|---|---|
| S01 | テストが既存サーバー関数をimportしているか | 真の`src/subscriptions.js`を呼ぶ：PASS |
| S02 | 課金Webhook用HMACの実暗号検証を模擬出来るか | node crypto HMAC→`verifyWebhook`実関数→Responseの経路：PASS |
| S03 | 署名なし・間違いAuth/Secret・時刻ずれ | 3系統で拒否、DB writes 0：PASS |
| S04 | イベントの到達時刻を並び替えたとき最新が維持されるか | 旧EXPIRATION後着がignored：PASS |
| S05 | 重複判定が単なる文字列比較ではなく2表副作用数で分かるか | batchが1回のまま：PASS |
| S06 | 契約を止める通知と止めない通知を誤判定しないか | 解約情報のignore、REFUNDのFreeを別テストでPASS |
| S07 | 猶予・購入満了の境界で「端末だけPro」を許さないか | getStorePlanで期限後Free：PASS |
| S08 | 別店舗・不明顧客のイベントで状態DBが誤書換されないか | route mismatchで409/DB0、unknownでbatch0：PASS |
| S09 | どのストアでも同じ見かけのPASSを偽造出来ないか | matrixの誤app/OS、欠落SHA、別environmentの負例：PASS |
| S10 | 既存QA27件・Chromium購入模擬8件と構文を再実行したか | 27/27、8/8、実17/17、matrix10/10：PASS LOCAL |

## 横展開レビュー10件（別の入り口から確認）

| ID | 別画面・アプリ・通信先 | 結果 |
|---|---|---|
| H01 | POS Native購入ボタン/復元ボタン・Owner guard | 既存8/8模擬QAで拒否・開始条件を照合：PASS LOCAL |
| H02 | POS API `getBillingIdentity`とOS別SDKキー | 既存27/27のキー・権限検証、単一キーfallbackなし：PASS LOCAL |
| H03 | POS Store Plan認可（`src/plans.js`） | ストア満了時Proの失効まで呼出確認：PASS LOCAL |
| H04 | POS Control Router `src/controlPlaneWorker.js` | Auth環境/顧客route/イベントinboxを実ソースで調査：PASS SOURCE、Sandbox配備PENDING |
| H05 | POS店舗Webhook `src/subscriptions.js` | 2表batchによる権限更新をmock D1で確認：PASS LOCAL |
| H06 | Hataraku NihonGO!のNative課金の identity/Entitlement | `app/src/services/billing.ts`の匿名/学習ユーザーと独立entitlementを参照：SOURCE照合、実E2E PENDING |
| H07 | Hataraku既存Apple商品とRevenueCat | 既存manifestの2件とuser-confirmedの履歴を読み、Play商品へ転用なし：PASS MANIFEST、実購入PENDING |
| H08 | できたCalendarのPremium画面/親操作 | `src/main.ts`/README上のPremiumと親向け設定を確認：SOURCE照合、子どもによる購入防止は実機PENDING |
| H09 | Google Play（3アプリ）とApple TestFlight（3アプリ） | matrixでiOS/Android別・ストア別証拠を要求し全実E2Eは未完：PASS STRUCTURE |
| H10 | 本番WorkerとSandbox eventの相互分離 | `qa-revenuecat-readiness.mjs`でProduction route OFF/隔離必要を読取り確認。混用せず：PASS SOURCE、TEST環境接続PENDING |

レビューは**ローカルコード・テスト、静的な他アプリ照合**であり、実験していない端末／Google・Apple実ストア／RevenueCat SaaS上の挙動はPENDINGと明示する。本文のPASSは公式QA PASS/ストア公開許可には転用しない。

## 次に可能なことと未解決の外部依存

1. izakanpaiのApp Store Connectサブスクグループ・月額/年額の**価格、販売地域、トライアル有無を決定**→正式なApple商品を作成→RevenueCatのCurrent Offeringの本物の商品へ接続。価格未決定につき永続的な商品ID・試用条件を勝手に登録しない。
2. **独立SandboxのControl Worker / tenant D1、Webhook HMAC・Authorization、iOS/Android専用公開SDKキー**を別環境で設定。現在のProduction受付へテストイベントを流さない。デプロイは別承認が必要。
3. Hataraku NihonGO!は先に存在するApple/RevenueCat設定を読み戻し、TestFlight内のApple sandbox実購入→再起動・復元・更新・解約・失効・返金を別アプリの権限で検証。
4. できたCalendarは実RevenueCat Premium/親画面に合わせ、保護者だけが購入することと、同期家族・別端末に契約/データが誤移管しないことを独立実機QAする。
5. Google PlayはAMU Labsアカウントの本人確認後、アプリ実登録・Base plan/offer、Google用RevenueCatプロジェクト/SDKキー、license testerのSandbox購入を順次開始。**Google登録料支払い済み≠Play Billing商品完成**。

掲載用画像・文案の編集、Git push・ビルド起動・Cloudflare Worker本番変更・Play公開・実決済は今回実施していない。
