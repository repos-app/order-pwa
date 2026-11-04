# 店舗別 Worker 更新漏れ防止・本番運用

## 変更禁止の前提

- 店舗ごとの物理 D1 は必須。店舗をまとめて一つの D1 にしない。
- 店舗 Worker は各自の D1、R2、AI、Secret、サービス Binding のまま維持する。
- Worker の実装ソースは src/index.js を使う専用テンプレート izakanpai-tenant-template で共通化する。
- wrangler deploy を店舗 Worker 名に直接実行しない。既存の refreshExistingTenantWorkerCode が利用する bindings_inherit=strict と前後の Binding 同一性確認を使う。
- tenant_registry の active production と実在 D1 リストが一致しなければ何も配布しない。

## 単一のリリース手順

1. node scripts/tenant-worker-release.mjs --preflight : **読取専用**。Control active 店舗、D1 UUID、各 DB provisioning marker、Worker Binding、Control service route、対応 schema を全件検証する。全件問題なしでなければ配布前に停止する。
2. 最新の検証済み main ソースから**共通テンプレートのみ**デプロイする。Cloudflare テンプレートの source bundle を最新ソースと比較する処理が次のコマンドにある。
3. node scripts/tenant-worker-release.mjs --apply --confirm-all-tenants : テンプレート一致を必須にして、既存の OAuth 安全アップローダーを全 active 店舗に適用する。個別店舗で失敗しても次へ進む。
4. アップロード後、**Control 台帳と物理 D1 を再列挙**して全店舗で already_current を確認。開始時と終了時の店舗一覧が一致し、全店舗に同じテンプレート・ソースが反映され、Bindings の前後同一性が証明された場合のみ PASS。新規店舗追加や1件の失敗も FAIL。
5. test-results/tenant-runtime-release/latest.json へ秘密情報なしの判定記録を保存する。PASS は全店舗検証が成立した場合のみ。

毎日の確認は node scripts/tenant-worker-release.mjs --audit（読取専用）。**本番テンプレートと全店舗**のコード一致のほか、店舗ごとに D1 所有者と各 Binding も確認する。まだ本番にリリースされていない GitHub ソースの差分は監査エラーにしない。リリース時のみローカルソースと本番テンプレートの同一性も必須とする。時刻は1日1回だけ。日次監査は自動変更せず、差異を失敗として通知する。

## GitHub Actions と有効化

.github/workflows/tenant-worker-release.yml に manual audit / manual release と日次監査を定義した。release は main ブランチのみ、入力 RELEASE_ALL_TENANTS が一致しなければ変更不可。GitHub Environment izakanpai-tenant-worker-production の保護ルールで本番承認を追加できる。

初期状態では日次監査は**無効**。有効化には GitHub リポジトリの Action secret CLOUDFLARE_API_TOKEN に、対象 Cloudflare アカウントに限定した Workers Scripts 編集/閲覧、D1 読取など必要最小限の権限を持つトークンを登録し、Repository variable TENANT_WORKER_AUDIT_ENABLED=true を設定する。**ローカル Wrangler OAuth トークンを GitHub にコピーしてはならない。** これらが未設定の間は「自動監査稼働中」と報告しない。

CI の release はテンプレートを1回だけ更新し、同一ジョブ内で全店舗反映と再監査まで完了する。新店舗追加後も tenant_registry の実データから動的に拾うため、店舗の固定配列はない。GitHub Actions 実行結果が FAIL の場合は一部店舗に適用済みの可能性がある。レポートの失敗店舗を確認し、残件対応後に**同じ一括コマンド**を再実行する。個別 Worker に独自コードを入れない。

## 未解消の状態での注意

- 現時点のローカルには並行作業の未コミット変更がある。これをそのまま本番の共通テンプレートへ配布しない。
- --preflight / --audit は本番状態を変更しないが、Cloudflare 認証と実際のテナント一覧が必要。
- スキーマ未適用（例 0054_offline_cash_settlements.sql）または Binding が既存契約と異なる場合は、店舗コード配布より先に安全な別工程で解消する。ここでは DB migration や Secret 値の変更を行わない。
- Cloudflare の認証・新規DBの作成・店舗削除・Control routing 変更はこのツールの責務外。
