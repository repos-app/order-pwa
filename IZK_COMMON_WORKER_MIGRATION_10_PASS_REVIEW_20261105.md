# 共通Worker移行漏れ・10回横展開レビュー（2026-11-05）

## 判定範囲と前提

- 基準：`181076b` 以降の共通Worker専用構成。稼働13店舗は `runtime_mode=common`、店舗別物理D1/R2を維持。旧店舗Workerへの互換性は対象外。
- 完了条件：**10個の独立観点**で既存実装と変更箇所を再検証し、検出した確定不整合を修正して各観点のローカル回帰結果をPASSにする。追加で本番13店舗の公開読み取り（4 APIずつ）と本番Workerのフラグを読み取り検証する。
- 独立の正式Android/iOS QA・StoreKit購入・実際のWebhook着信・AI画像推論・新規店舗作成E2Eは、このレビューのPASSに換算しない。
- 同時進行の他担当ソース差分が多いため、修正範囲は対象ファイルだけ。iOS/Androidビルド、個人・本番課金への書き込みは行わない。

## 10観点の結果（初回FAILを保存し、修正後に別途再実行）

| No. | 独立観点・入口 | 結果 | 証拠 / 見つかった問題 |
| --- | --- | --- | --- |
| R01 | 共有Gatewayから実POS処理へ渡すAI・秘密情報・Service Binding | **PASS** | `test/common_tenant_gateway_e2e_test.mjs`（249チェック）。非列挙バインディングの模擬にも対応し、`PLATFORM_BILLING`を明示引き継ぎ。 |
| R02 | AI予算・アカウント単位制限・公開済みプロンプト・返金 | **PASS** | `test/ai_credit_budget_and_api_test.mjs`、`test/ai_credit_platform_relay_test.mjs`、`test/menu_ai_prompt_management_test.mjs`。14/14 PASS。 |
| R03 | RevenueCat通知、信用済み購入、失敗履歴と暗号化再送 | **PASS（修正後）** | 初回9/13 PASS、4 FAIL。旧`TENANT_A`を呼ぶ統合テストを`COMMON_GATEWAY_SERVICE`＋`runtime_mode=common`に更新。再実行13/13 PASS。 |
| R04 | 認証・v3更新トークン・Control内外ルーティング | **PASS** | `login_common_refresh_regression.test.mjs`、`common_tenant_guest_route_boundary_test.mjs`、`common_tenant_control_internal_boundary_test.mjs`。 |
| R05 | 物理D1/R2・全テーブル・店舗間混入防止 | **PASS** | `tenant_physical_d1_isolation_test.mjs`、`tenant_all_tables_intrusion_test.mjs`、`tenant_pass4_r2_erasure_intrusion_test.mjs`。 |
| R06 | 新規店舗登録・予約と再開・物理プロビジョニング | **PASS（修正後）** | 初回7/8 PASS、1 FAIL。テストが確定的な`physical_provisioning_failed`を通信結果不明の5xxと誤分類。実装の安全な同一ID再開を維持する期待値に更新し8/8 PASS。 |
| R07 | CloudPRNT・画像配信・メールと帳票 | **PASS** | `tenant_cloudprnt_intrusion_test.mjs`、`image_fetch_regression_test.mjs`、`bilingual_receipt_email_test.mjs`。 |
| R08 | クライアント共通API、認証、AI/PDF取込・履歴再開 | **PASS（修正後）** | 初回5/6 PASS、1 FAIL。ブラウザテストが前の「ページ復旧」を新規履歴復旧完了と誤検知。今回の「保存済み解析履歴：2/2ページ復旧」まで待つよう修正。再実行6/6 PASS、認証クライアント310チェックPASS。 |
| R09 | Cloudflare本番設定、旧Worker不在、デプロイ安全策 | **PASS（修正後）** | 重大発見：既定`wrangler.toml`が`CONTROL_REVENUECAT_ENABLED=0`で`REVENUECAT_PURCHASES_READY`も欠落。両方`1`に修正。`common-only-source-gate.mjs`に設定差分検出を追加し21/21 PASS。 |
| R10 | 監査ログ、予算エラー分類、Cron、冪等な返金と復旧 | **PASS（修正後）** | 初回14/18 PASS、4 FAIL。予算テストfixtureに別途必要なControl認証秘密情報が欠落。モックを補正し独立部分7/7 PASS、残り既存11 PASS。 |

初回ログは `test-results/shared-worker-migration-10pass-20261105/R01_*.log`〜`R10_*.log`（Git非管理）。**初回FAILログを上書きして「最初からPASS」にはしていない。** 修正後の再実行結果はターミナル実行結果として確認した。

## 本番実測・配備

- 公開Router：`izakanpai-api`、Version `19c58693-80b2-4b44-9fbc-398ee3eba799`。
- 非公開共有Worker：`izakanpai-common-gateway`、Version `367c224a-33b9-4e57-af92-315480bdffe7`。配備時に13店舗分のD1/R2、`PLATFORM_BILLING`、`PLATFORM_EMAIL`、Workers AIのバインディングを保持。
- `wrangler versions view` の読み取りで、Router本番設定 `CONTROL_REVENUECAT_ENABLED=1`、`REVENUECAT_PURCHASES_READY=1`、`CONTROL_ROUTE_MODE=all`、`PHYSICAL_TENANT_SIGNUP_REQUIRED=1` を確認。
- Control D1リモートSELECT（読み取り専用）で **稼働13/13店舗が`runtime_mode=common`** と確認。
- `scripts/common-gateway-public-read-smoke.mjs --label=review10_20261105`：全13店舗×`bootstrap/getMenu/getSettings/getTables`、**52/52 HTTP 200 + success PASS**。検証結果は `test-results/common-worker-b-cloudflare-readonly-20261104/public-read-*-review10_20261105.json` に分離保存。
- 既存ソースゲート **21/21 PASS**。`scripts/qa-billing-testflight-preflight.mjs signed-test` は `BILLING_TESTFLIGHT_SOURCE_READY`。Cloudflareシークレット値やRevenueCatの商品設定が実際に正しいことまでこの結果から主張しない。

## 今回の再発防止変更

1. `wrangler.toml` と `wrangler.hybrid-router-production.toml` の**Webhook有効化・購入可能フラグ**を一致させた。汎用`wrangler deploy`でも購入を無効化させない。
2. `scripts/common-only-source-gate.mjs` に、デフォルト設定と本番設定の不一致を**FAILにする独立チェック**を追加した。加えて共通Gatewayに`PLATFORM_BILLING`引き継ぎのチェックを追加。
3. `src/commonTenantGateway.js` の要求バインディング明示移送へ`PLATFORM_BILLING`を追加。テストでCloudflareバインディングが列挙不可でも他店舗のD1/R2を漏らさず引き継げることを確認。
4. 旧店舗Workerのfixtureと、新規登録・予算失敗・AI履歴復旧の古い判定条件を現行仕様へ更新。成功判定を緩めるのではなく、実際の操作結果の確定まで待つ。

## 残る、本番機能の独立した実証

- **未実施**：実iPhoneで`menu.pdf`から1ページの有料AI解析が完走し、商品保存・残高反映が一致することの確認。
- **未実施**：署名済みRevenueCat実購入から公開Router→Control→共通Gateway→対象D1までのエンドツーエンド証跡。
- **未実施**：新規の店舗を実作成し、物理D1/R2確保から稼働開始までの本番E2E。
- **未実施**：プリンター実機、Android/iOS正式QA全ケース。ローカルテストとリモート匿名読み取りは正式QA PASSに計上しない。

本書の「10/10」は**10観点の監査/回帰が修正後PASSした意味**であり、商品機能全体の品質保証・完全な移行漏れ不存在を証明するものではない。
