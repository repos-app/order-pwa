# izakanpai POS｜iOS課金 Sandbox設定作業継続（2026-10-18 PHT）

## 作業境界

ユーザーは「テスト実施は別チャット。他は進める」と明示。**本書は設定・ソース・Cloudflare配布前静的構成だけ**の記録。別チャットが所有する実機／公式QAケース・runner/state・テスト結果・画像証拠には触れていない。Apple StoreKit購入、正式QA、Codemagicビルド／TestFlight、DB/Worker本番またはSandbox配備、App Store申請、Git commit/pushは**実施なし**。

前の正本：`docs/IZK_IOS_BILLING_SETTINGS_ONLY_HANDOFF_20261017.md`。

## 追加した非QA設定・ソース整備

1. **Edgeからのログイン制限（Sandbox限定）**。`src/billingSandboxLoginGateway.js` は既存のOwnerログイン/refresh/logout前にCloudflare `CF-Connecting-IP` と専用Rate Limit bindingを必須化。設定欠落・RateLimit障害・IP情報不明なら503、超過なら429で拒否する。`CF-Connecting-IP` はCloudflare入境headerからのみ取得し、JSON/query/`X-Forwarded-For`を信用しない。Tenantの既存 `login_rate_limits` に対し、内側Service Bindingへ受信IPを明示転送する。**実Cloudflare Service BindingによるIP継承は未検証**。Cloudflare Rate Limiting APIはlocation単位で**結果整合性が遅延する**ため、これ単体を完全な不正ログイン防御とせずWAFとの併用が必要。
2. **Cloudflare制限設定を構成ファイル化**。ignored専用 `.tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml` に `SANDBOX_AUTH_RATE_LIMIT` を12回/60秒、`SANDBOX_OWNER_RATE_LIMIT` を60回/60秒で宣言。名前空間ID `871421607`/`871421608` は本リポジトリで仮に割り当てたものなのでCloudflareアカウント全体で衝突がないか配備前に確認。Workerは`SANDBOX_LOGIN_GATEWAY_ENABLED="0"`、`workers_dev=false`、preview false、無routeのまま。RateLimitの最新仕様は `https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/` を参照。
3. **隔離Owner APIへの1入口**。未来の公開先 Worker名を `izakanpai-billing-sandbox-api-test` に統一、Gate `/owner` は非公開Owner WorkerのService Bindingのみを使って`checkToken`／`getBillingIdentity`を認証付きで通す。直接Owner Workerをpublic workers.devへ出さない。既存Native `POST /?api=1` では `login`／`refreshSession`／`logoutSession`／`checkToken` の4認証・読取Actionだけを認め、業務RPCや他店Storeを通さない。
4. **Owner拒否セッションの後片付け**。Tenantが認証セッションを発行したあと、Owner本人確認がNGになったときは、新しいrefresh tokenを渡す前にTenant `logoutSession` をベストエフォート実施。これは失効証明そのものではない。もし失効送信も失敗した場合、Gatewayは403か503で**tokenをユーザーへ返さない**。
5. **生成ビルドだけのOwner URL修正**。`scripts/qa-ios-billing-sandbox-build-prep.mjs` はプライベートOwner Workerがpublicになっていないことを必須にし、公開する場合のLogin Gateway名／Owner binding／2つのRate Limit bindings／enabled flagをチェック。**すべてのゲートが満たされるまではstaged=falseのまま**。将来入場時に生成コピーの`config.js`と`billing-native.js`のOwner URLを単一Gateway `https://izakanpai-billing-sandbox-api-test.izakanpai.workers.dev/owner` に統一。追跡中の本番ソースや通常Codemagicワークフローは変更しない。
6. **Billing専用の独立ログイン画面（非本番資材）**。`standards/mobile-subscriptions/v1/qa/izakanpai-billing-owner-entry.html` と `...entry.js` を追加。ステージングコピーの`index.html`／`manage.html`だけをこの画面に差し替え、通常POS業務API未公開による見かけ上の管理画面故障を防ぐ。フォームは`billingqa`固定、ブラウザのlocalStorageにID/PWを保存せず、既存NativeAuthが署名済みセッションを保持した後に`subscription.html`へ進む。既存トークンは専用Gateway `checkToken` のOwner承認が取れたときだけ自動遷移。`subscription.html`でのPro購入はOwner APIでAppleキー`appl_`・ID・権限を別途検証する。
7. **既存の秘密保管ツール確認（READ ONLY）**。`scripts/qa-v2-local-login-vault.ps1` はWindows DPAPIによる既存QAアカウント保存を提供する。一方、`scripts/bootstrap_admin.mjs`は共有物理D1への投入を明示禁止するローカルSQL生成であり、既存`billingqa`の1従業員行への安全なcredential更新には使えない。過去、安全性ゲートが拒否した資格fixture生成の代替実装は作成していない。**Owner実ログイン資格・実セッションは未整備**。
8. **Codemagic用の手動Sandbox IPAテンプレート**。`standards/mobile-subscriptions/v1/qa/codemagic-izakanpai-billing-sandbox.template.yaml` を新設した（現行の`codemagic.yaml`からは参照されない）。通常`mobile:sync`は実行せず、先にローカル設定・公開HTTPS読戻しの明示ゲートを要求し、**一時ディレクトリで生成したWeb資材だけ**をCodemagicの使い捨てcheckout上の`mobile-dist`へコピーし、Capacitor sync→既存App Store署名でIPA作成という手順案。明示`IZK_BILLING_SANDBOX_ALLOW_BUILD=1`がないと停止し、自動トリガーとTestFlight/App Storeへのpublishingは**一切定義しない**。現状Sandbox Owner/Login設定TOMLはGit ignoredでCI cloneに存在しないため、承認済みの非秘密設定を別途引き継ぐまでテンプレートは**Fail Closed**。Codemagicの実ビルドや署名成功は主張しない。

## ソース構成の静的確認（正式QA実行ではない）

- JavaScript構文確認：`node --check` で `src/billingSandboxLoginGateway.js`、`src/billingSandboxOwnerApi.js`、`scripts/qa-ios-billing-sandbox-build-prep.mjs`、新規専用entry JS は全て`exit0`。
- 専用Codemagic YAMLは現時点でGitに読み込まれない**将来テンプレート**。作業PCのNode/PythonにはYAML parser（`yaml`/`js-yaml`）が無く、**完全なYAML構造のパーサ読戻しは未実施**。CI上で承認後に事前構文検査が必要。
- Cloudflare構成の**未配備dry-run**：`npx.cmd --no-install wrangler deploy --dry-run --config .tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml` で`exit0`。Bindings: private TENANT、private OWNER、Edge Auth rate12/60、Edge Owner rate60/60、test変数、Gateway disable=0 を出力。**公開デプロイ済みという意味ではない**。
- `git diff --check`は関連diffについて`exit0`、本番`mobile-app/web/api.js`/`codemagic.yaml`の直接編集なし。なお他チャットが`mobile-app/web/config.js`等を並行更新中であり、そのdirty状態は本担当では編集・差分吸収しない。
- **Nodeの業務QA／Playwright／実機／RevenueCat購入／Sandbox E2E実行は0件**。既存の静的Node構文確認やWrangler dry-runを公式PASSに換算しない。

## 自己レビュー10観点（実ファイル点検、QAではない）

| ID | 根拠・見た結果 |
| --- | --- |
| S01 | Cloudflare `CF-Connecting-IP`がない場合はGateway credentialを処理せず503 |
| S02 | Rate Limiter binding不在または`limit()`実行失敗は503 |
| S03 | レート超過・異常応答は429。許可/拒否契約を分離 |
| S04 | Edge側AuthとOwner系で別namespace・別の定格上限 |
| S05 | Clientの`X-Forwarded-For`やbodyのIPをTenantに採用しない |
| S06 | Tenant既存のIPハッシュ式Login Throttleへの依存と未証明点を確認 |
| S07 | Owner拒否時に前段Tenant発行セッションを失効要求、未返却token |
| S08 | HTTP`/owner`ではチェックとBilling Identityの2 read actionだけ通す |
| S09 | Native`POST /?api=1`は4既知auth actionのみ。他RPC拒否 |
| S10 | Owner/loginのenable false・workers_dev false・Preview無効を維持 |

## 横展開10境界（別の構成面）

| ID | 独立して照合した影響面 |
| --- | --- |
| H01 | Native iOS origin `capacitor://app.izakanpai.local`をGateway CORSとStage entryが共有 |
| H02 | Backend `src/index.js`の直接login/password / GASのpass形式差を考慮 |
| H03 | Native`api.js` の`?api=1`・token更新・想定body`pass`を再読 |
| H04 | `NativeAuth`のKeychain/Keystore別testキーと新Entryが共通保存を使用 |
| H05 | `billing-native.js`のOwner身元/RevenueCat Apple`appl_`のゲート |
| H06 | 通常`index.html`/`manage.html`が業務RPC依存なのでSandboxで別Entry |
| H07 | 通常`codemagic.yaml`の`mobile:sync`は共有成果物を変更するため呼ばない |
| H08 | 既存Webhook専用Ingressにlogin/ownerのroute追加無し |
| H09 | CloudflareのRateLimit eventual consistencyとWAF追加条件を未完残件に記載 |
| H10 | Other-chat正式QA/実機/公式台帳/Store申請/Worker deployに操作無し |

### iOS署名・配布ワークフローへの追加横展開監査

既存`codemagic.yaml`の`ios-testflight-build`は共有`mobile:sync`で本番Webソースから生成し、Sandbox用の独立ビルドではない。新テンプレートは手動のみ・独立資材・publishing不在だが、**まだ実行済みでもCodemagicアプリに接続済みでもない**。Cloneにignored TOMLが無いこと、実Owner認証/証明書/SDK適用、iPhone配布責任者の承認を未完了とした。コードレビュー10＋横展開10の点検対象に含むが、CIビルド証明とは別。

## 出荷・設定の未完条件（優先順）

1. 隔離`billingqa`実Ownerの安全なログインfixture、Email検証状態、Tenant owner従業員連携を既存承認済み経路で設定する（安全性ゲートで拒否された秘密生成方式は再試行しない）。
2. ログインAPIを外部公開する前に**Cloudflare WAF/RateLimit設定、namespace衝突、IP継承、失効と同時ログインへの耐性**の審査。Originチェック単独はインターネット利用者を証明しない。
3. 2つのPrivate Worker Service Bindingと1つのGateway hostnameをCloudflare上で有効化（**今はdisable/非公開**）。接続先の実在・HTTPS・CORSは別チャットの接続検証が必要。
4. 独立したSandbox IPA用のCodemagic構成の署名/配布ゲートを定義。Gitに含めるTrackedオーナー資格/Secretは禁止。通常のTestFlight/本番webDirを変更しない。
   **iOS Bundle IDは登録済みApple商品と同じ**なので、将来配布すると既存のizakanpaiアプリを上書きし得る。別チャットで稼働する実機QAの排他・端末選定とApple/TestFlightアプリ識別子の合意まで一切ビルド・インストールしない。
5. RevenueCat Apple製品`Missing Metadata`の最新GUI readback、審査画像（ユーザー方針では購入QA後）、ASC submitの可否。今回の接続ソースだけでは料金・Trial・公開済みと主張できない。

**公開判定NO-GO。** この文書と各変更は未commitであり、User指定のテスト専任チャットに正式判定を委ねる。
