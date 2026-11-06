# izakanpai: SQLガード更新漏れの同型不具合・ソース横展開10回レビュー

実施日: 2026-11-04 / 対象: ローカル `izakanpai` 最新作業ツリー（未コミット変更を保護）

## 目的と判定範囲

オフライン現金会計の `tenant_sql_unknown_table_not_allowed:offline_cash_reconciliations` を起点に、**DBテーブルを追加したのにSQLアクセス制限・テナント分離・関連処理へ更新を横展開できていない同型不具合**を探す。10回は同じコマンドを反復する意味ではなく、独立した10の観点からソースと既存テストを検査すること。正式実機QA、全テスト工程の完走、本番Worker反映とは区別する。

| 回 | 異なるソースチェックの観点 | 主な根拠 | 判定 |
|---|---|---|---|
| 01 | 新規DBテーブルと物理スキーマの全列挙・許可リスト対応 | `migrations/0001〜0054`, `src/tenantDb.js`, `src/tenantSqlGuard.js`; 新規 `tenant_sql_guard_new_table_alignment_test.mjs` は90物理表、78構造化表、12例外、85ガード照合を実行 | PASS、今回修正済みの0054以外に未登録の同型テーブルは検出なし |
| 02 | 追加テーブルの責務区分（テナント／全体／内部メタデータ） | `src/tenantDb.js`, `src/tenantSqlGuard.js`; `stores`, `account_deletion_audit`, `revenuecat_webhook_events`, `offline_cash_reconciliations` の明示扱いと、内部表拒否をテスト | PASS、新規物理表を黙って汎用APIへ開放しない |
| 03 | SQL SELECT・INSERT・UPDATE・DELETE と不正な店舗ID | `test/tenant_sql_guard_runtime_test.mjs` 41 assertions、今回の0054読み込み・書き込み・不正店舗拒否を含む | PASS |
| 04 | SQL構文・JOIN・OR・UNION・UPSERT経由の他店舗読み書き | `tenant_additional_sql_boolean_intrusion_test.mjs` 52、`tenant_sql_guard_reverse_pass_test.mjs` 35の悪性SQL拒否 | PASS |
| 05 | 同時会計時のSQLフェンス、領収書・注文・再照合台帳の原子性 | `tenant_d1_write_fence_atomic_test.mjs`; `src/billing.js` が0054台帳を同一 `db.batch()` へ含むことを確認 | PASS |
| 06 | Native API・GAS互換API両経路の認証済み店舗への束縛 | `src/index.js`, `src/gasApi.js`, `src/db.js`; `tenantSqlGuard` と認証トークン由来のstore IDを追跡、`gas_compat_smoke_test.mjs` 562 checks | PASS（モック/ローカル検証） |
| 07 | 現金会計の不変ID・二重伝票防止・金額/注文スナップショット照合 | `src/billing.js`, `migrations/0054`, `offline_checkout_backend_test.mjs` 29 checks | PASS |
| 08 | iOS・Android・Webローカル受領記録と復旧、誤った「サーバー拒否」の再処理 | `mobile-app/web/api.js`, `docs/yuwaku/api.js`, `docs/yuwaku/test/api.js`; `offline_checkout_frontend_test.mjs` 102 checks | PASS（端末実機ではない） |
| 09 | 隣接するAIクレジット・帳票/メール・印刷Outbox等の新テーブル使用箇所 | `ai_credit_wallet_sqlite_test.mjs` 31、`ai_credit_operator_reconciliation_test.mjs` 6、`menu_ai_provisional_lifecycle_test.mjs` 4、`qa2_keep_pt_inp_0379_report_email_backend.test.mjs` 26、`receipt_print_outbox_test.mjs` 8、`tenant_raw_sql_inventory_test.mjs` 86JSファイル/1000構文上のSQL呼出箇所 | PASS、同型の未許可テーブルは確認範囲で未検出（静的解析は完全なSQLパーサーではない） |
| 10 | 店舗生成・抽出・削除/復元・リリースへの反映漏れ | `tenant_provisioner_service_test.mjs`, `tenant_scoped_d1_extractor_test.mjs`, `account_deletion_db_first_regression_test.mjs`, `offline_cash_checkout_release_gate_test.mjs` 39、`distribution_parity_test.mjs`（Native→iOS/Android各111、Web production→TEST 91一致） | PASS（本番書込み・実機QAなし） |

## 発見と再発防止の実装

- 既知原因: `offline_cash_reconciliations` は `0054` で実DBへ追加され、オフライン会計経路で読み書きされる一方、`src/tenantSqlGuard.js` の許可リストから漏れていた。修正済み。ただし本番適用は未実施。
- **今回の追加検出事項**: 物理テーブル追加とSQLガード分類が同期していることを毎回検査するゲートがなく、過去の単体テストではDBラッパーを経由しない会計成功が許可リスト漏れを見逃せた。`test/tenant_sql_guard_new_table_alignment_test.mjs` を新設し、54 migrationから物理テーブルを構築、78の構造化テナント表と12例外を1対1で照合。増加/分類変更時は明示レビューまでFAILとする。
- `test/project-test-commands.json` にこのゲートを**216番目**として追加。既存1〜215番の順序は維持。`test/izk_project_test_pipeline_contract_test.mjs` に必須検査として登録。
- `node scripts/run-project-test-pipeline.mjs --start=216`: PASS。`node test/izk_project_test_pipeline_contract_test.mjs`: PASS（全216工程のコマンド登録を確認するものであり、全216工程の実行完了を意味しない）。

## 残る検証・制約

1. 全216工程の `npm test` はこの10観点レビューでは完走していない。各独立テストPASSを正式QAと混同しない。
2. TestFlight/Android実機での検証、13店舗Workerへの修正デプロイ、実店の現金受領記録（例: Yuwaku ₱440）のサーバー領収書確定と結果の読み取りは**未実施**。
3. 既存の未コミットファイルは無断で破棄せず、今回も commit/push/deploy はしていない。

## 再現・検査コマンド

```powershell
node test/tenant_sql_guard_new_table_alignment_test.mjs
node test/tenant_sql_guard_runtime_test.mjs
node test/tenant_sql_guard_reverse_pass_test.mjs
node test/offline_checkout_backend_test.mjs
node test/offline_checkout_frontend_test.mjs
node test/tenant_raw_sql_inventory_test.mjs
node test/izk_project_test_pipeline_contract_test.mjs
node scripts/run-project-test-pipeline.mjs --start=216
```
