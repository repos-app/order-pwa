# izakanpai POS｜隔離Billing Gateway公開前セキュリティ設定（2026-10-18 PHT）

## 適用範囲と判定

対象は**隔離の `billingqa` Apple Sandbox課金接続だけ**。生産Worker・一般店舗・実際のApple課金・iPhone正式QAは対象外。Sandbox OwnerはPrivate Service Binding、唯一の将来のInternet接続口は `izakanpai-billing-sandbox-api-test` Gateway。ユーザーはテストを別チャットに委譲しているため、ここでは**ソースと設定の静的レビュー**のみ行い、remote deploy、Gateway公開、セッション生成、ログイン・負例テストは行わない。

### 設定の現在地

- `.tenant-provisioner/billing-sandbox/wrangler.login-gateway.toml` の `workers_dev=false`、`preview_urls=false`、`SANDBOX_LOGIN_GATEWAY_ENABLED="0"` を維持。無routes、Owner/Tenant Private Service Binding、Edge Rate Limit 2種類。**インターネット経由で認証を提供していない**。
- Gatewayの認証セッション/Owner Actionの許可は `login`・`refreshSession`・`logoutSession`・`checkToken` と `POST /owner` の `getBillingIdentity` のみ。未知RPC・別店舗は拒否。既存Tenantの本人認証とOwner実体チェックを省略しない。
- 公開前構成の差異修正：`/login`・`/refresh`・`/logout` への余計なquery parameterも拒否する。初期準備スクリプトの接続先 `GET /owner` でCORS OriginがなくHTTP403になるため、**認証情報なし**の固定 `Origin: capacitor://app.izakanpai.local` を付け、`GET /owner`と`GET /`の**HTTP405**を要求。例外のある他ステータスでREADYとしない。ただしOriginは利用者の本物の証明にはならず、405だけで実ログイン/Owner APIセッションが正常と分かるわけではない。
- Cookie発行なし、`Access-Control-Allow-Origin`は固定Capacitor Originだけ、`Access-Control-Allow-Credentials`や`*`は使わない。反射Origin・`X-Forwarded-For`で本人特定をしない。CloudflareのEdge来訪IPをTenant認証Throttleへ伝播する設計。ただしService Binding経由の実IP provenanceは**未測定**。
- 既存Edge Rate Limit Binding名 `SANDBOX_AUTH_RATE_LIMIT`（12/60秒）、`SANDBOX_OWNER_RATE_LIMIT`（60/60秒）。namespace IDs `871421607`/`871421608` は**同アカウントに重複がないか未確認のローカル設定値**。Cloudflare公式はnamespace IDが同アカウント一意の数字文字列であること、異Workerで同IDを使うとカウンタが共有されること、Cloudflareロケーション単位・最終的整合性であることを明記。よって**不正ログイン対策の完了ではない**。

## 公開前に残る必須作業と操作境界

| 優先 | 公開前Gate | 現在の状態 / 受入条件 |
| --- | --- | --- |
| P0 | Owner実ログイン資格fixture | 既存`billingqa` employeeの `login_id`/`password_hash` とStore Ownerメール確認が未整備。秘密生成スクリプトの過去の安全性ブロックを繰り返さない。既存承認済みVaultとD1投入経路を確定するまでBLOCKED。 |
| P0 | Cloudflare WAF/Edge Abuse対策 | 専用のCloudflareゾーンHostnameに限定したWAF Custom Rule/Rate Limiting Ruleを別途設計。Allowed Originは攻撃者が擬装できるため認証に代わらない。ログイン試行、Bot/Mitigation、同時IP試行を考慮。**今回はCloudflare WAFルールを作成していない**。 |
| P0 | 公開経路 | 現状 `workers_dev=false` 無route。WAFを効かせるには管理対象ゾーンのCustom Domain/Routeで保護する設計を検討。固定 `workers.dev` URL前提のNative Stagerはその決定後に合わせて変更する。端末利用チャットと通信許可前に合意。 |
| P0 | JWT/session真正の認可 | Owner実D1と正規ログイン/refresh、`getBillingIdentity`、退会/非Owner/logout時失効、異店舗拒否、Credential Stuffingのレート制御が成立することを証拠化。別チャット正式QAで実行。 |
| P1 | RateLimit Namespaceの一意性と性能 | 同Cloudflareアカウント他Workerとのnamespace衝突、Gateway bindingsの実存在、shared mobile IPによる正当Owner誤制限、Cloudflare分散Edgeの過許可を査読。 |
| P1 | 認証ログの機密情報 | request body・token・refreshToken・パスワードをアプリ/Worker/CIログに出さない。診断情報はHTTP code・event IDの安全なハッシュなどに限定。Workers Logsを導入する前にDataRedactionを査読。 |
| P1 | ビルドゲート | Codemagicの**使い捨てcheckout**、手動のみ、Production configurationとの差分、秘密をGit/アーティファクトに含めないこと、App Store提出OFFの構成を確定。iPhone正式QAビルドを上書きしない。 |

## 設定変更者向け公開前チェック（依頼する時点で記入）

* 対象アカウント・zone、予定Hostname、Owner/Tenant Worker名と隔離D1 UUIDを書面で固定する。
* 非公開Service Binding（Owner/Tenant）の `workers_dev=false, preview_urls=false` と公開Gatewayの宛先・WAF policyを突合。公開Gatewayを有効化するまでOwner認証Secretや利用者credentialを登録しない。
* 本番Workerや既存QA Workerをデプロイ・更新しない。Gatewayを公開後、別チャットの担当がCORS、method、悪用対策、Owner/非Owner、Sandbox Apple SKUを正式に検証する。
* 外部ビルド・公開申請・実機インストールは**別チャットの排他claim**後に許可。今回のソース静的検査を公式PASSやApple Sandbox E2Eとして扱わない。

## 根拠（Cloudflare公式）

- Rate Limiting Binding仕様・namespace/counter共有・eventual consistency: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- worker routes / custom domains / workers.devの比較: https://developers.cloudflare.com/workers/configuration/routing/
- `workers_dev=false`はPreview URLとDeployment URLまで自動無効化しないので、別個に確認: https://developers.cloudflare.com/workers/configuration/routing/workers-dev/

**最終設定判定：P0の実Owner資格とWAF/公開構成未完了のため、Gatewayは無効・非公開を維持。** Codemagic、RevenueCat、ASC設定の次段階は別のMDに引き継ぐ。
