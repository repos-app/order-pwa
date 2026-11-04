# izakanpai POS｜iOS Apple Sandbox Owner接続準備（2026-10-17 PHT）

## 対象・判定

既存課金引継ぎ `docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md` を継続。**Apple Sandbox本物の購入・StoreKit商品取得・iPhone正式QAは未実施。正式PASS 0／FAIL 0（今回の増分）**。本番Worker／本番D1、App Store審査提出・公開、他担当の正式QA claim、Git commit/pushには触れていない。RevenueCat Test Store TEST通知はAppleの実購入ではない。

## 1. 遠隔Sandboxで確認・実行した内容

| 項目 | 実測・変更結果 | 根拠と範囲 |
| --- | --- | --- |
| Sandbox環境 | 既存 Tenant `izakanpai-billing-sandbox-tenant`・Tenant D1 UUID `5e181dd1-3212-404f-a5e5-552b3999e00b`・`AUTH_ENVIRONMENT=test`・`TENANT_ID=billingqa` と照合 | 他店舗へSQLを実行しない |
| Ownerの基礎レコード | 既存の店舗1、在籍employee1、active owner1をread-only集計 | 資格情報・個人データ表示なし |
| Ownerログイン未整備 | employeeに有効なlogin_id／password_hashが0、Tenant `AUTH_SECRET`未登録、`login_rate_limits`／`email_verified_at`／`auth_sessions`が欠落 | 現行Tenantではログイン動作が成立しなかった |
| バックアップ | `tenant-backup-before-owner-auth-20261017.sql`、**16,923 bytes**、SHA-256 `B6F6A6EDD94173B5E46E08FC4AE5AAD3B3135328F7637F2C38070745A02CDE7B` | `.tenant-provisioner/billing-sandbox/` gitignored領域。Cloudflare D1 exportリモートread-only、既存バックアップ上書きなし |
| `AUTH_SECRET` | 暗号学的にランダムな64byteを生成し**この隔離Tenantだけ**にWrangler Secret登録（コマンドexit0） | 値はstdout、ソース、Markdown、会話へ出力・保存していない。登録済みSecret名をread-onlyチェック済み |
| `0016_login_rate_limits.sql` | **移行コマンドexit0、remote SELECTでtable存在確認** | 既存共通migrationのみ。レート制限のSQLテーブル |
| `0017_email_verification.sql` | **移行コマンドexit0、remote PRAGMAで`store_owners.email_verified_at`存在確認** | 既存共通migrationのみ。実メール確認ではない |
| `0020_auth_sessions.sql` | **移行コマンドexit0、remote SELECTで`auth_sessions`・`auth_legacy_revocations`存在確認** | 既存共通migrationのみ。セッションはまだ発行していない |
| Secret名の共通readinessゲート | `scripts/qa-revenuecat-readiness.mjs --sandbox` に`AUTH_SECRET`必須を追加。修正直後は不足を検知しexit1→隔離Secret登録後は必須Secret名が全充足・**exit0** | 必須キーの有無のみを検証。値の正しさ／E2E成功は主張しない |
| 公開IngressのAuth漏れ | `GET /owner` 404、`POST /owner` 404、`POST /` 404、無署名`POST /webhooks/revenuecat` 401、**4/4**期待通り | 実HTTP負例。Owner APIを既存Webhook Ingressへ公開していない |

## 2. 共通Owner認証APIとiOS側の準備

- 既存 `src/billingSandboxOwnerApi.js` の**別Worker**は `POST /owner` の2機能（`checkToken`／`getBillingIdentity`）のみ。Tenantの通常トークンと`store_owners`を二重検証。環境=test・店舗=`billingqa`・明示flagを必須とする。Webhooks専用Ingressのコード／設定は変更なし。
- iOS Capacitor設定の実hostnameは `app.izakanpai.local`。CORS Originを **`capacitor://app.izakanpai.local` のみ**に制限、`OPTIONS`に必要なpreflightと認証拒否負例を加えた。既存Ownerテスト **15/15 PASS（ローカル）**。
- `mobile-app/web/billing-native.js` にiOS・test・billingqa・固定HTTPS Endpointの**明示opt-inのみ**のOwner API通信を追加。通常のproduction／Androidは共通`API.post`を維持。SDKが`appl_`でなければ購入不可。ソース詳細とテストは `docs/IZK_IOS_BILLING_SANDBOX_NATIVE_TRANSPORT_20261017.md`。
- 新しいOwner Worker config `.tenant-provisioner/billing-sandbox/wrangler.owner.toml` は**Service Bindingのみで一般公開URLなし**（`workers_dev=false`、preview無効、routeなし）。したがってブラウザ/WebViewからは直接呼び出せない。別の公開入口・通常login/refreshをどう安全に通すか、既存APIと共通のセッション境界を維持した設計が必要。**iPhone接続READYとは判定しない**。

## 3. 未完了ブロッカーと実行順

1. **ログイン資格情報未設定**：既存`billingqa-employee`にlogin_id・password_hashがなく、`billingqa-owner`のemail_verified_atが未確認。認可済みテストOwnerだけを対象に、既存共通`makePasswordHash`と既存安全な秘密保管方式を使用して正しく準備する。秘密値の共有・ベタ書きや、通常Ownerメール確認をしたとの偽装は不可。独自Secret作成スクリプトの安全性チェックでブロックされた実行履歴を持つため、同じ方式を無限再試行しない。
2. **Owner実ログインの動作未証明**：孤立Owner Workerは公開エンドポイントではなく、独立したテストOwnerセッションも未作成。署名Audience・店別Owner DB検査と`getBillingIdentity`のStoreKit `appl_`返却をRemoteで実検査するまで購入は開始しない。
3. **iOS Sandbox専用IPA未作成**：既存のTestFlight IPAは通常のproduction APIに接続し、テストOwner Endpointと混同不可。安全な一時生成資材（productionソースを変更しない）とCodemagic手動ビルド、バージョン/署名/実機claimが必要。未接続テスト環境へビルドを勝手に配布しない。
4. **公式StoreKit／Sandbox E2Eゼロ**：Offerings取得、App Store JP/PH価格・月額初回1か月無料、購入→Pro・再起動→復元・有効期限→返金、RevenueCat実Apple Webhook→隔離Control/Tenant D1のStore境界の正式証拠は未収集。Review素材はテスト完了まで保留、App Store審査提出と本番公開は禁止。

## 4. 品質レビュー（ソース／構成の点検。実機PASSとは別）

| 観点 | 確認・証拠 |
| --- | --- |
| S01 | `wrangler.tenant.toml`のDB UUID、tenant名、環境testを一致確認。 |
| S02 | OwnerのRemote集計は1店舗・1在籍従業員・1active owner。 |
| S03 | 前回TenantにAUTH_SECRETがない状態をremote secret名で検出、readiness exit1。 |
| S04 | Secret追加後に名簿readback、readiness exit0、値非表示。 |
| S05 | 認証DB `login_rate_limits` 欠落を確認後、0016のみ移行し存在readback。 |
| S06 | Owner確認列欠落を確認後、0017のみ移行しPRAGMAで検出。 |
| S07 | `auth_sessions`と`auth_legacy_revocations`欠落を確認後、0020のみ移行し存在readback。 |
| S08 | SQLバックアップ取得・長さとSHA、ignored領域を照合。 |
| S09 | Owner APIが未公開のままIngress /owner 404、無署名webhook401をremote確認。 |
| S10 | Tenantの実資格fixture不足を確認し、Secret設定だけでlogin準備完了と誤判定しない。 |

| 横展開 | 独立確認先・結果 |
| --- | --- |
| H01 | 共通`auth.js`のtest audience署名とv3セッション要件。 |
| H02 | 共通`loginAuth.js`のlogin_id/password_hash/email_verified_at依存。 |
| H03 | 共通`loginThrottle.js`の0016テーブル依存。 |
| H04 | 共通`sessionTokens.js`の0020スキーマ依存。 |
| H05 | `src/gasApi.js`のOwner識別RPC認可と非Owner拒否。 |
| H06 | iOS Native app `capacitor.config.json`の正しいOrigin。 |
| H07 | `billing-native.js`の通常prod APIとsandbox opt-inの分離。 |
| H08 | Test Storeの`test_`とApple実`appl_`キーの分離。 |
| H09 | 既存Ingress Webhook専用のHTTP否定系4/4。 |
| H10 | Codemagic TestFlightは手動ワークフロー、審査提出・本番公開OFF。 |

以上のレビューは実ソース・remote read-only・局所的なSandbox変更の各証拠であり、**全体正式QAやセキュリティ受入を意味しない**。

## 5. 22:55 PHT付近の共通回帰・Sandbox IPA前ゲート

- 新しい `scripts/qa-ios-billing-sandbox-build-prep.mjs` は既存の `mobile:prepare` / `mobile:sync` を実行せず、共有 `mobile-dist` / Android/iOS Native生成物を変更しない。Owner専用URL、テストログイン用API、バンドル出力先の承認条件を先にチェックし、同意できない外部環境へ通信・配布しない。元の `mobile-app/web/config.js` のproduction API/ストレージ設定を保持。
- ビルド準備CLIの**実結果**：`ready=false, staged=false, exit=1`。不足識別子は `owner_endpoint_unrouted`、`owner_url_unverified`、`test_login_proxy_unverified`、`live_probe_required`。これは**意図通りのFail Closed**であり、IPAは作成・アップロードしていない。詳細は `docs/IZK_IOS_BILLING_SANDBOX_NATIVE_TRANSPORT_20261017.md`。
- WorkerのNative opt-in後、元の静的回帰2件が旧直接RPC構文・空白固定に依存してFAIL（Node `--test`: **117/118 PASS、1 FAIL**、既存 `subscription_integration_test.mjs` exit1）。調査で、`billingOwnerRequest()`が通常の `API.post('rpc',{fn:'getBillingIdentity',args:[{platform:platform}]})` を保持する一方、旧テストだけが `fn: 'getBillingIdentity'` と `platform:nativePlatform` に固定していることを確認。
- **既存の2テストのみ修正**し、直接APIの継続存在と実際の `billingOwnerRequest(nativePlatform, 'getBillingIdentity', token)` 呼出し**両方を必須**にした（緩和ではなく2経路契約の強化）。変更後：`test/izk_ut_084_pro_comparison_always_visible_test.mjs` **7/7 PASS**、`test/subscription_integration_test.mjs` **27/27 PASS**、関連Node **13ファイル118/118 PASS／FAIL0／exit0**。`git diff --check` **exit0**。いずれも実機/正式QA判定ではない。
- 新WorkerのOwner認証ソーステストは厳密iOS Origin `capacitor://app.izakanpai.local` を使うCORS OPTIONSと別店舗/別Origin/未認証拒否を含み **15/15 PASS**（Nodeモック）。本番URLやAndroidにこの経路を使わず、CORS HTTP実通信PASSとも混同しない。
- **残るブロッカー**：既存の `billingqa-employee` にはテスト用 login_id/password_hashがなく、今もOwner有効セッションは**0**。通常ログインを経由する専用APIとOwner専用Workerの公開URLは未実装。DPAPIローカル資格保存は既存共通ツールが利用可能だが、DBの既存Owner1行に安全に適用する共通処理が未整備。専用資格fixtureツールの作成は安全性ゲートでブロックされたため、**その方式を再試行していない**。試験公開URLを推測して新しいIPAを発行しない。
- `node standards/mobile-subscriptions/v1/qa-matrix-gate.mjs --release` は引き続き **exit1（NO-GO）**。Apple/RevenueCat実商品のMeta状態、料金、無料期間、掲載素材、App Store審査提出・本番公開は変更していない。
