# izakanpai iPhone TestFlight Sandbox 課金確認 — 2026-10-24

## 依頼・完了条件

利用者から「課金できるかのテストしたいです」と依頼。従来方針に従い commit/push なし。本番課金や審査提出は行わない。真正な完了条件は **iPhone TestFlight / Apple StoreKit Sandbox の実購入、RevenueCat 取引、分離したSandbox Control/Tenant D1でのPro権限反映、再起動・復元確認** であり、ローカル模擬テストやGateway HTTP応答を購入PASSに代用しない。

## 2026-10-24 ローカル・到達性実施結果

| 検証 | 結果 | 範囲 |
| --- | --- | --- |
| `test/izk_ut_085_billing_qa_activation_test.mjs` | 9/9 PASS、exit0 | iOS・Androidの購入画面・Owner権限・模擬購入処理 |
| `test/billing_native_sandbox_risk_test.mjs` | 3/3 PASS、exit0 | sandbox Identity |
| `test/billing_sandbox_native_transport_test.mjs` | 4/4 PASS、exit0 | iOS専用Owner transportの拒否と許可 |
| `test/billing_sandbox_owner_api_test.mjs` | 15/15 PASS、exit0 | Owner認証・店舗境界 |
| `test/qa_billing_owner_wiring_preflight_test.mjs` | 1/1 PASS、exit0 | 非公開Owner経路を検出 |
| `test/qa_ios_billing_sandbox_build_prep_test.mjs` | FAIL、exit1 | **既存テストfixtureが現行build-prepのGateway TOML/新URL契約と乖離**。合成fixtureにgateway TOMLがないためENOENTほか。build成功の証拠ではない |
| `standards/mobile-subscriptions/v1/price-policy-gate.mjs` | valid:true、appStoreProductsRegistered:true、readyForPaidSandboxTesting:false、exit0 | ストア商品登録済みのローカル台帳。Apple実商品取得ではない |
| `standards/mobile-subscriptions/v1/qa-matrix-gate.mjs` | allReady:false、exit0（read-only照会） | Apple StoreKit物理E2E証拠未取得 |
| `scripts/qa-ios-billing-sandbox-build-prep.mjs` | ready:false / staged:false、exit1（設計どおりFail Closed） | `test_gateway_endpoint_unrouted`, `test_gateway_disabled`, `owner_url_unverified`, `test_login_proxy_unverified`, `live_probe_required` |
| Gateway HTTPS匿名GET到達性 | `/` と `/owner` がHTTP 404 | 5秒timeout・`Origin: capacitor://app.izakanpai.local`、token/credentialなしで確認 |

現在のローカル `.tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml` は `workers_dev=false` および `SANDBOX_LOGIN_GATEWAY_ENABLED="0"`。意図せず公開しない。iOS専用stageは未作成・未署名・未配布。通常のTestFlight IPAを、隔離Sandbox用ビルドの代わりとしない。

## 未完了（購入の正式判定では0件）

- Gatewayを公開する場合はWAF/Rate Limit・Owner認証・店舗境界・CORS・private Service Binding・資格情報の受渡しを先に確認。現状で単に公開スイッチをONにしない。
- 隔離Owner実ログインと`getBillingIdentity`、iOS専用stage、署名TestFlight対象ビルドを正しく接続する。
- iPhone操作で `管理 → プランとお支払い` から月額・年額商品、AppleのSandbox購入シート、成功、`pro` entitlement、Webhook/D1独立読戻し、再起動/購入復元を証跡付きで確認。
- 原本の正式Runnerへ受理されるまで **Apple Sandbox購入の正式PASS 0／FAIL 0（本確認による増分）**。ローカルテスト失敗1ファイルは**インフラ/テストfixture未整合**であり、Apple購入FAILと誤記しない。

## 安全条件

Commit・Push・Worker公開・App Store提出・決済操作・TestFlight upload/配布・正式QA台帳書込みは行っていない。後述の利用者明示指示に基づき、**QA店舗`teat`のプラン1行のみ後続で変更**。他店舗・購買履歴は未変更。購入UIとApp Store購入シートが仮に表示されても、隔離テスト環境のWebhook/D1連動を確認するまでは購入完了と判定しない。

## 2026-10-24追加：QA店舗`teat`を未課金Freeへ移行（実DB更新完了）

利用者の新たな明示依頼：「今、店舗teatはPro扱いなので、一旦未課金状態にして、そこから課金のテストをするようにしたいです」。

- 対象実DBは `izakanpai-teat`（設定 `.tenant-provisioner-production-teat.toml`、認証環境`production`）。**別の隔離Sandboxテナント`billingqa`と混同しない**。
- 更新前に`SELECT`で`teat`だけの`store_plans`を確認。 `pro/active/manual_app_review`、`current_period_end=NULL`。同店舗の`billing_customers`と`store_subscription_state`は両方**0件**。Apple/RevenueCat購入を取り消す必要はない手動の審査用Proだった。
- 更新前の1行全フィールド、課金レコード数と**条件付き復元SQL**をGit ignoredの `.tenant-provisioner/qa-billing-state-backups/teat-plan-before-free-20261024.json` に保存（1025 bytes、`git check-ignore`確認）。当該バックアップは秘密を含めてGitに追加しない。
- 条件付きの`UPDATE store_plans SET plan_code='free',status='active',source='qa_billing_reset_20261024',current_period_end=NULL,updated_at=datetime('now') WHERE store_id='teat' AND plan_code='pro' AND status='active' AND source='manual_app_review' AND current_period_end IS NULL` → Remote D1 **changes=1、成功**。
- **別実行の独立`SELECT`**で`teat=free/active/qa_billing_reset_20261024`を読戻し（`updated_at=2026-10-24 05:03:58 UTC`）、`billing_customers=0`、`store_subscription_state=0`、当該DBの他店舗プラン行0を確認。プラン判定の`src/plans.js::getStorePlan`もFreeに解決される設計。iPhoneの表示や正式Runnerはまだ未確認。
- Remote `wrangler secret list --config .tenant-provisioner-production-teat.toml` 成功、**iOSおよびAndroidのRevenueCat公開SDKキーSecret名はどちらも存在しない**。実際のSecret値を読んでいない。現在の通常TestFlight購入画面では`configured:false`になり、購入ボタンに進めない見込み。さらにProduction WorkerではRevenueCat Sandbox通知が拒否されるため、`teat`プランをFreeにしただけでは「Apple購入→Pro」は通らない。
- 追加課金共通回帰：`node --test test/izk_ut_085_billing_qa_activation_test.mjs test/billing_native_sandbox_risk_test.mjs test/billing_sandbox_native_transport_test.mjs test/billing_sandbox_owner_api_test.mjs` **31/31 PASS、exit0**。これはMock SDK/VM/Owner契約のローカル検証であり、StoreKit取引ではない。
- **引き続き必要なこと**：手動Proで復元せず、正規の隔離Sandboxテスト購入経路を安全に接続し、iPhone購入、RevenueCat/隔離Control・Tenant D1検証、Pro権限と復元、必要に応じて終了後のプラン処理を正式QAで記録。専用Gatewayの現在のGET 404、Sandbox Owner/Login Disabled、Sandbox用IPA未配布は解消していない。
- 変更は`teat` QAに実際のFree制約（Pro画面・機能の制限）を反映するため、別のQAがPro前提で実施中ならテスト条件を見直す。**他店舗・本番契約、購入履歴、Git、正式QA台帳は変更しない**。

## 2026-10-24 続報：4つのSandbox環境整備依頼の実施・制限

### 4項目の境界と現時点の成果

| 依頼項目 | 2026-10-24 実施・確認 | 残る条件 |
| --- | --- | --- |
| 1. `teat`のiOS RevenueCat SDKキー不足 | 本番`teat`のSDK Secret名は未登録のまま。代わりに、**隔離Sandbox TenantのiOS `REVENUECAT_IOS_PUBLIC_SDK_KEY`が存在する**ことをremote secret-name読戻しで確認。ProductionへSANDBOX課金キーを誤接続しない | QAテスト用アプリで隔離`billingqa`のSDK Identity実取得とStoreKit商品取得を要する |
| 2. 本番APIのApple Sandbox拒否 | **変更不要・維持**。Production WorkerのSANDBOX拒否は本番Pro権限保護の正常動作。Webhook Test IngressとSandbox Control/TenantのSecret名は全てremote readbackで充足 | 実Apple購入→隔離Webhook→隔離D1の署名イベント読戻しは未実施。本番`teat`を自動昇格させてはならない |
| 3. Sandbox認証GatewayのHTTP404 | ゲートを確認。`wrangler.login-gateway.toml`は`workers_dev=false`、`SANDBOX_LOGIN_GATEWAY_ENABLED=0`。現在のGatewayは未公開。`billingqa-employee`が有効なowner紐付けを持つが、**ログインID・パスワードハッシュともに未設定**、`store_owners.email_verified_at`もNULLとRemote D1で独立確認 | 安全なowner QA資格情報の初期化、本人確認状態、認証実動作、レート制限確認後に限定公開。認証情報初期化の操作が安全性チェックでブロックされたため実書込は**実施していない**。保護を迂回しない |
| 4. iOS Sandboxビルド未配布 | `scripts/qa-ios-billing-sandbox-build-prep.mjs`の**全POSコピーを廃止**。Disposable Stageを課金専用の7ソース資産＋独立entryだけに限定し、prod URL・symlink・リポジトリ内への出力を拒否。新旧Fixture正規系・負例7/7 PASS。既存Codemagic Manual workflowは静的テンプレートのみ | 実Gateway未到達で`ready:false, staged:false`。署名IPA、TestFlight配布、iPhone購入は未実施。非秘密Configの隔離CI配送、既存TestFlight上書きリスクの整理、macOS署名実行が必要 |

### 証拠（非秘密）

- `node scripts/qa-revenuecat-readiness.mjs --sandbox`：`sandboxControl`の3 Secret名、`sandboxTenant`の3 Secret名がすべて`VERIFIED/configured:true`。`sandboxPurchaseEndToEndReady=false`。値は一切取得せず。
- `wrangler d1 execute ... billing-sandbox-tenant-db --remote` 読取り：`stores.store_id=billingqa`、オーナー紐付けactive、`employees.billingqa-employee`はadmin/在籍だがログイン情報なし、メール確認未完。`store_plans`はfree/canceled/revenuecat。本番`teat`とは独立DB。
- `wrangler deploy --dry-run`：private Owner **exit0**、Gateway **exit0**（Rate Limit bindings 12/60s・60/60sを出力）、Sandbox Tenant **exit0**。公開・実デプロイには該当しない。
- `node --test test/qa_ios_billing_sandbox_build_prep_test.mjs` → **7/7 PASS / exit0**。従来のOwner URLやFixture仕様が現行Gatewayと合わずFAILだったテストを、統合Gateway URL＋auth/owner TOML＋課金限定資産へ更新して解消。
- `node --test test/billing_sandbox_ingress_test.mjs` → **6/6 PASS**、`node --test test/revenuecat_sandbox_sqlite_integration_test.mjs` → **8/8 PASS**、`node --test test/subscription_integration_test.mjs` → **27/27 PASS**（StoreKit実取引ではない）。
- Sandbox専用`qa-ios-billing-sandbox-build-prep.mjs`を通常configで実行 → `ready:false, staged:false`。必須のpublic Gateway route、enabled flag、URL引数、live probeが不成立。意図した安全停止を保全。
- **秘密を再生成してRemote D1へ書く試みは安全性チェックで拒否された。代替経路での突破・同一操作の再試行をせず停止した。** Remote Owner credentials・公開Gateway・ビルドの完了は主張しない。

### 修正後レビュー10観点

| 観点 | 結果 |
| --- | --- |
| S01 Gitからの資格漏洩防止 | パスワード・SDK公開キー実値をソースへ書かずPASS |
| S02 購入先分離 | 本番teatはproduction、専用Tenantはtestで維持 |
| S03 Gateway strict URL | stage/回帰で想定URL固定PASS |
| S04 Gateway認証未完成時の停止 | ready:false PASS |
| S05 余分なPOS機能排除 | stage allowlist構造＋テストPASS |
| S06 Stage内本番endpoint拒否 | 負例PASS |
| S07 Symlinkによるファイル混入拒否 | 負例PASS |
| S08 出力先隔離 | protected_output負例PASS |
| S09 Gateway・Owner・Tenant配備前ビルド | 3/3 dry-run PASS |
| S10 課金E2Eとローカル回帰の区別 | 実Apple購入0件として維持 |

### 横展開レビュー10観点

| 観点 | 結果 |
| --- | --- |
| H01 iOSキー | Sandbox Secret名存在／値・StoreKit未検証 |
| H02 Androidキー | 本番teatへ勝手に転記せず |
| H03 RevenueCat Webhook | 署名secretあり／真の購入未検証 |
| H04 Control D1／Tenant D1 | 隔離経路維持、SQLite模擬8件PASS |
| H05 Owner role | 登録active、Credential未設定をブロッカー扱い |
| H06 レート制限 | Gateway dry-run 12/60s・60/60s binding表示、実通信未確認 |
| H07 iOS Native Stage | 7件PASS、ipa署名未確認 |
| H08 Production Proを不正昇格しない | 本番SANDBOX拒否を維持 |
| H09 QA店舗混在を避ける | 本番teatと隔離billingqaを別ID/別D1として明記 |
| H10 Git/Cod​emagic/TestFlight | commit/push/deploy/uploadなし、実機QA未判定 |

**この時点の状態**：安全なローカル修正とRemote読取り・dry-runまで完了。Gateway公開・Apple購入・TestFlight配布は未完了であり、セキュリティ初期化ブロックにより続行不可。隔離`billingqa`の購入が成立しても本番`teat`が自動Proになるわけではない（逆も同様）。本番`teat`は引き続きFreeを保つ。

### Remote非公開Workerのアップロード実績（同日追加）

- `npx --no-install wrangler deploy --config .tenant-provisioner/billing-sandbox/wrangler.owner.toml` → **exit0**。`Uploaded izakanpai-billing-sandbox-owner`、Version `77fbc805-de0a-4a51-9756-0f0ad52a1bdb`。ただしCloudflare出力は **`No targets deployed`**。workers.dev、preview、routeなし。外部公開や実ログイン成功を示さない。
- `npx --no-install wrangler deploy --config .tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml` → **exit0**。`Uploaded izakanpai-billing-sandbox-api-test`、Version `353a4ffc-dd64-4b53-b3f5-a26f1343d130`。こちらも **`No targets deployed`**、`SANDBOX_LOGIN_GATEWAY_ENABLED=0`。Private TENANT/OWNER service bindings、12/60s・60/60sのRate Limit bindingsをCLIで確認。HTTP404解消を主張しない。
- Sandbox Tenant側の本体デプロイ、本番`teat`、署名IPA、TestFlight、App Store設定は変更していない。
- アップロードだけでは安全なOwnerログイン・StoreKit E2E・配布判定にならないためGatewayの公開は保留。
