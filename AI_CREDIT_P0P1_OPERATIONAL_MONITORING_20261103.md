# izakanpai AIクレジット：障害追跡・運営監査 P0/P1

## 権威あるデータと共通ログの関係

- Tenant D1 の `ai_credit_wallets` は残高の正本、`ai_credit_operations` は冪等操作、`ai_credit_ledger` は追記式残高増減の正本。
- Control D1 `operational_diagnostics` と Public Router/Control の共通trace-IDは、HTTPエラー・遅延・ポイント消費・Webhook配信の診断用。注文本文、AI画像、レシート、認証トークンは保存しない。
- AI失敗時はTenant migration `0052` の `ai_credit_operations.failure_code` に**固定コード**を保存。通常の失敗とrefunded確定は同一UPDATEで、既存SQLiteトリガーが残高・台帳を原子的に返還する。失効予約は `ai_reservation_expired`。
- RevenueCatの正式受信正本はControl D1 `revenuecat_event_inbox`。migration `0013` の `revenuecat_dispatch_attempts` は `(event_id,attempt_number)` で各実送信試行を時系列記録。生Webhook本文や外部取引情報は複製しない。署名検証後のclaim、inboxとのbatch結果確定、再送冪等性を維持する。

## 店舗別検索

- `https://izakanpai.com/admin.html`、`/admin/` の既存運営管理者トークンで `getAiCreditOperatorHistory` を呼ぶ。テナントの店長トークンでは横断検索不可。
- Public Routerの特権API → Controlの `/internal/operator/ai-credit-tenant/query` → 登録済み物理Tenant Workerの `/internal/ai-credit-operator/query` を通る。Control secret・ピン留めされたtenant_id・route generationを検査。Store IDと検索条件は厳密な許可リスト。
- Tenant D1の操作履歴/台帳は読み取り専用、最大100件/ページ（UI既定30）。操作IDと台帳IDはStore ID込みのSHA-256短縮参照のみ返す。返金元取引ID、AI結果本文、source_idなどは返さない。
- 表示には最新残高、操作一覧、台帳差分、最後の通知時刻、AI失敗固定コードを含む。

## 残高照合・通知

- 新規WindowsタスクやWorkerを作成せず、Control Workerの既存15分Cronでactive登録済み物理Tenant Workerを順次呼ぶ。100店舗/巡回・最大8並行で失敗は店舗ごとに隔離する。
- Tenant D1 `ai_credit_reconciliation_checks`（migration `0053`）に検査状態/時刻/差分fingerprint/最後の通知結果を永続保存する。新規/初期化前店舗は `not_initialized`。
- Trial/Monthlyは残高とledger増減合計を比較。購入は **paid_balance - paid_debt** と **SUM(paid_delta) - SUM(debt_delta)** を比較。現行以前の旧月次付与がある店舗は `legacy_unverifiable` とし誤警告を防ぐ。
- 実際の不一致のみ既存Platform Email（Resend/PLATFORM_EMAIL relay）経由で既存 `PLATFORM_SUPPORT_EMAIL` に通知。同じ差分の重複は抑制し、継続中の不一致は24時間経過後に再通知。通知失敗を成功扱いせず再試行可能にする。
- 検出では残高や顧客情報を自動補正しない。不一致の調査は操作/台帳参照と `scripts/ai-credit-incident-trace.mjs` を使う。誤検知/旧移行に注意する。

## 安全な適用順序と証跡

1. Control D1へ `0013` を適用し、Inbox既存件数と新テーブル/索引を読み戻す。
2. 全active物理Tenant D1へ `0052` → `0053` の順に適用する。Store名とD1 UUIDをCloudflareの実DB一覧で照合し、各DBにTime Travel bookmarkを記録。既存残高は直接変更しない。
3. `scripts/build-tenant-provisioning-migrations.mjs` で最新52件の新規店舗向けbundleを生成し、Tenant Template、Provisionerを更新。
4. Control/Router Workerに共通認証・bridge・cronを配布。既存Tenant Workerコードは `scripts/rollout-existing-tenant-runtime.mjs` のバインディング保全ヘルパーだけで13店舗個別反映する。汎用の店舗Worker上書きは禁止。
5. 独立配布先 `repos-app/order-pwa` の `admin.html` と `admin/index.html` を更新し、Pages deploy・公開HTTP読み戻しを確認する。
6. 認証なしoperator検索は拒否、真正なD1 schema/行数を独立SELECTで読み戻し、失敗した店舗は個別隔離して再試行する。実購入を発生させず、過去のWebhook履歴や正式QA PASSを偽造しない。

SQLite/Route/HTMLユニット試験のPASSは本番実行や送信成功と区別する。初回Webhook試行がない場合 `revenuecat_dispatch_attempts` 0件、残高操作のない店舗では `ai_credit_wallets` 未初期化が正常であり、成功件数とは数えない。
