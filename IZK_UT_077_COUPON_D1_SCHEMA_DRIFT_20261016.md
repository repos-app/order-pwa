# IZK-UT-077 — クーポン登録500 / テナントD1スキーマ適用漏れ

> **2026-10-17の更新**：本資料の0043適用時点では0044〜0046は対象外でしたが、後続作業でteat/yuwaku両店舗へ0044/0045/0046を別途本番適用完了し、新規店舗Provisionerの0046までのスキーマ契約も本番配布しました。現在のD1ベースラインは0046です。証跡は `docs/D1_FLEET_0044_0046_PRODUCTION_ROLLOUT_20261017.md` を参照。

- 起票日: 2026-10-16 PHT
- 分類: アプリ障害（DBスキーマ・デプロイ整合性）、優先度 P0、ステータス **既存2店舗D1の0043適用・検証完了。新規店舗向けProvisionerとテンプレートの本番デプロイ成功（新規店舗のE2E未実施）**
- 再現: Android実機 Realme RMX3938 / QA APK 910019 / 店舗 `teat`（画面名「テスト店舗」）
- 関連正式QA: `QA2-KEEP-OPR-BILL-033`, `035`, `038`（BLOCKED継続。テスト対象機能のFAIL確定ではない）
- 既存修正との関係: `OPR-CRM-013` のクーポン開始日実装（`migrations/0043_coupon_start_date.sql`）は再利用し、重複実装しない。

## 現象と確定証拠

1. 実機「クーポン」管理画面の新規保存で汎用「サーバー内部エラー」。`QA_CHAT_1016_A`（700ペソ）、`QA_DIRECT_1016_B`（25ペソ・利用上限1）の独立入力で発生。画像は `test-results/qa-v2-evidence/CHAT_DIRECT_REALME_POC_20261016/` に保全済み。
2. 現行 `src/crm.js:105-116` の `saveCoupons` UPDATE/INSERT は、クーポン開始日 `coupons.starts_at` を必須列として参照する。
3. Wranglerで**QA店舗のD1 `izakanpai-teat`** をリモートSELECT。`pragma_table_info('coupons')` に `rule_version` は存在するが **`starts_at` は存在しない**。DB所有マーカーは `store_id=teat`、`environment=production`、`database_id=988cc818-fb77-49ff-aacd-c925991257bd`、`schema_version=0042_receipt_print_outbox.sql`。DB自体は存在し認証済み読み取りは可能。
4. `migrations/0043_coupon_start_date.sql` に `starts_at` 追加と更新時バージョン増分／日付前後関係のトリガーが実装済み。適用が漏れたDBに現行保存SQLが実行されれば、列不存在により保存できない。アプリ側500の具体的な原因となるスキーマ不整合は確定。Worker例外ログの個別行は未取得。
5. 以前のD1 `7403` は、`--config .tenant-provisioner-production-teat.toml` を渡した際の接続認可エラー。`--config` なしで正しいDB名を指定するとSELECTが成功するため、**全面的なD1アクセス拒否を主因として扱わない**。

## 修正範囲・完了ゲート

1. DB実体の所有マーカー・適用済みバージョン・既存トリガーを照合し、バックアップを確保した上で、店舗DB **`teat`・`yuwaku`両方**に既存0043とマーカー更新を一体で適用する。`izakanpai-platform`・`izakanpai-control`は店舗用でないため変更しない。0044以降の別機能マイグレーションは今回のスコープ外。
2. 独立DB読戻しで `starts_at`、開始日/版数トリガー、マーカー0043、既存クーポンの件数/利用回数維持を検証する。
3. 実機の正規クーポン管理画面から新規のQAクーポンを登録し、DB読戻し・一覧再表示で動作を証明する。保存済みクーポン利用や制限の並列競合は別の正式QAケースとして追跡する。
4. 同種のスキーマ適用漏れを再発させないため、tenant D1の `schema_version` と現行機能が要求する列を本番公開前に検査し、差異をエラーとして検知する共通監査を追加・テストする。**本障害の修正は単なる回避操作のみで完了としない。**

## 状態の定義

- 起票：完了。原因：DBスキーマの0043適用漏れは確認済み。
- 修正：既存店舗DBについて0043適用・スキーマ契約検証を完了。実機`teat`のクーポン新規登録・DB独立照合も成功。Provisionerの共通事前検査はソース修正・回帰試験完了、本番Worker `izakanpai-tenant-provisioner` Version `05abc6b4-5d76-4205-95dd-05d6a515ae26`をデプロイ済み。テンプレートWorker `izakanpai-tenant-template` Version `2d379363-8c5a-4a7b-8f47-d70f795a83cc`もデプロイ済み。新規店舗E2Eは未実施。
- 正式QA：`033/035/038` の個別PASS/FAILは実機証拠に基づいてのみ更新する。

## 全店舗・基準スキーマへの横展開（2026-10-16）

### 対象DBの分類と実行結果

Cloudflareの同一アカウント `d1 list --json` で確認したizakanpai系DBのうち、店舗用DBは次の2つ。それぞれ`stores`テーブルでも店舗IDを独立確認済み。

| DB | 用途 | 0043適用前 | 対応 | 独立検証 |
| --- | --- | --- | --- | --- |
| `izakanpai-teat` | QA店舗「テスト店舗」 | 0042・`starts_at`なし | 0043適用成功 | schema marker 0043、列・3トリガーが存在。実機登録・D1照合成功 |
| `izakanpai-yuwaku` | 実店舗「izakanpai 本店」 | 0042・`starts_at`なし | **0043適用成功** | `tenant-d1-schema-contract-gate.mjs` `ok:true`、独立SELECTで列存在と既存クーポン1件を確認 |
| `izakanpai-platform` | プラットフォームDB | `coupons`テーブルなし | 適用対象外 | `sqlite_master`で確認 |
| `izakanpai-control` | 管理・プロビジョニングDB | `coupons`テーブルなし | 適用対象外 | `sqlite_master`で確認 |

- `yuwaku`は適用前に完全リモートエクスポートを取得（`.qa-v2-official/android/izk-ut-077-backup/yuwaku-before-0043.sql`、18,421,545 bytes、SHA-256 `7825BE8250A34E7975F0912F79DD390A17186B61561426468599A9B2220E9B89`）。別の`teat`バックアップも同ディレクトリに保管。**機密データを含むため公開・コミット禁止。**
- 適用前に所有マーカー`store_id=yuwaku`、`environment=production`、`database_id=b0aa5df0-1022-4013-91f6-51126331830b`、`schema_version=0042_receipt_print_outbox.sql`を照合。`starts_at`未存在を再確認。既存`migrations/0043_coupon_start_date.sql`とマーカー更新を1つのファイルとして`wrangler d1 execute izakanpai-yuwaku --remote --file`で実行（6 queries / 5 rows written / exit 0 / Cloudflare success true）。
- 修復後の共通ゲートの出力は **両店舗とも`{ok:true,failures:[],schemaVersion:'0043_coupon_start_date.sql'}`**。`yuwaku`の既存クーポン件数は適用前・後とも1件。実店舗にはテストクーポンを追加していない。
- 基準は別の「テンプレートD1」ではなく、`migrations/*.sql`、生成物`src/tenantProvisioningMigrations.generated.js`および`src/tenantProvisionerService.js`。生成バンドルは店舗用45マイグレーション（0043を含み、最新は0046）とソースSQLのSHA-256ダイジェストが一致。共通`src/tenantD1SchemaContract.js`で必須列・trigger・店舗所有マーカーを評価するコードをNode CLIとWorker Provisionerの双方で使い、ローカルProvisioner経路も同じ検査に連動させた。
- 回帰テスト：`test/tenant_d1_schema_contract_gate_test.mjs`、`test/tenant_provisioner_service_test.mjs`、`test/tenant_provisioner_test.mjs`、`test/android_qa_coupon_full_migrations_test.mjs`、`test/android_qa_coupon_start_date_test.mjs` 全てPASS。2026-10-16に本番Provisioner・テンプレートWorker更新成功。ローカルのGit変更は `aedca560` で `origin/main` へpush済み。**ただし既存の直接`wrangler deploy`にはスキーマゲートが強制されない**ため、引き続き運用上の事前検査が必要。
- `0044`（仕入伝票）、`0045`（改訂検知）、`0046`（索引）は今回の`0043`障害と独立した変更であり、両店舗DBに自動適用していない。特に0045にはSQL内に明示的承認条件があるため別管理とする。「全店舗でクーポン必須列の不整合解消」と「全DBを最新の0046まで揃える」は区別する。

### 全店舗自動監査（2026-10-16追加）

- `npm run tenant:schema:verify:all:remote`（または`node scripts/tenant-d1-schema-contract-gate.mjs --all`）を実装。現行CloudflareアカウントのD1一覧から`izakanpai-<store>`形の店舗DBを検出し、管理・プラットフォームDBを除外。各店舗の所有マーカー、0043適用、必須列・3トリガーを読み取り専用で照合し、1店舗でもNGなら非0終了する。他アプリのDBに適用しない。
- 実行結果：`{ok:true,count:2,audited:[{database:'izakanpai-teat',ok:true,schemaVersion:'0043_coupon_start_date.sql'},{database:'izakanpai-yuwaku',ok:true,schemaVersion:'0043_coupon_start_date.sql'}]}`。証跡 `test-results/qa-v2-evidence/CHAT_DIRECT_REALME_POC_20261016/izk-ut-077-fleet-schema-audit.json` SHA-256 `A0771BC78F779107603D33B3648A2CBF7CF9237432C198521C79C1B0A4584BE4`。
- `src/tenantD1SchemaContract.js`をランタイム非依存の共通関数として追加し、Windows CLI / ローカルProvisioner / Worker Provisionerで再使用。Provisioner Workerの変更はソース内のみで**未デプロイ**。既存店舗のDB変更のみライブ反映済み。最新の正式QA台帳ではBILL-033/035/038はBLOCKEDのままで、障害原因の修復と正式会計テストPASSは区別する。
