# IZK-UT-069 P0 — 歩合管理の過去注文スキャン改善（LOCAL、2026-10-15）

> **2026-10-17 本番適用の追記**：以下は2026-10-15時点のローカル作業履歴です。後日、全物理店舗D1（teat/yuwaku）に0044〜0046を適用し、新規店舗Provisionerの基準検査も0046へ更新・本番配布しました。実D1の索引使用・対象SQLのRows Read減少・所有markerを検証済みです。新しい正本は `docs/D1_FLEET_0044_0046_PRODUCTION_ROLLOUT_20261017.md`。以下の「本番未適用」は履歴当時の状態であり、現在の状況を表しません。

## 修正の対象と安全境界

前回の`docs/D1_P0_POS_REAUDIT_BATCH2_20261015.md`に記録された、`src/commission.js:getOpenOrders`による`WHERE store_id=? AND status NOT IN ('会計済','取消')`の長期履歴スキャンを修正対象とした。

`migrations/0046_commission_open_orders_index.sql`で**部分インデックス**`idx_orders_commission_open_store_date`を追加。対象は`status NOT IN ('会計済','取消')`の注文だけで、`store_id,created_at,order_id`をキーにする。既存のAPI SQL/結果・会計状態・過去の未知ステータス・A/B店舗分離は**変更していない**。

**これはローカルのmigrationファイルであり、本番データベースには未適用**。初回構築は既存の全注文行を一度読み、ステータス遷移時は索引への書込みが発生する。実D1の`rows_read`/`rows_written`とmigration時間は未計測、P0をCLOSEDにしない。

## 実装・検証

- migration 0046ファイルを新規追加し、`scripts/build-tenant-provisioning-migrations.mjs`で`src/tenantProvisioningMigrations.generated.js`を再生成。プラットフォーム専用0040を除く**テナント用45 migration**と、全番号付き**本番用46 migration**は意図して異なる。直接migrationを適用する全テナント/孤立侵入テストの固定件数は45から46へ改訂した。
- `python test/d1_p0_commission_partial_index_0046.py` **PASS**。A店舗の会計済12,000、B店舗の会計済3,500、Aの有効205、Aの旧未知status1、A取消1、B有効1の仮想SQLite実データで、旧新クエリの戻り値が**完全一致**。新`EXPLAIN QUERY PLAN`は`SEARCH orders USING INDEX idx_orders_commission_open_store_date (store_id=?)`を示し、旧`idx_orders_store_status`のみの候補検索から変更。未知旧statusが結果に残り、Bを含めない。Aの会計済への変換、旧statusへの再開、Bでの追加注文、IF NOT EXISTS再適用でも期待結果を維持。
- `node test/d1_p0_orders_revision_regression_test.mjs`と`node test/tenant_provisioner_service_test.mjs` **PASS**（46本番／45テナント生成）。全体`npm test`、侵入テスト群、配布整合性は統合ログを参照。

## 自己レビュー10観点

| 番号 | 実際のチェック | 判定 |
|---|---|---|
| S01 | 旧クエリのWHERE条件、認証store_id、未知status契約を読んだ | PASS source |
| S02 | `NOT IN`から現在3statusへの変換は旧statusを落とすので禁止 | PASS SQLite |
| S03 | 旧(店,状態)索引のEXPLAINでstore_idだけの条件確認 | PASS SQLite |
| S04 | 新部分インデックスを旧SQLそのまま使用するか | PASS SQLite EXPLAIN |
| S05 | 異なる店舗A/B・会計済15,500件・有効206件の行/値一致 | PASS SQLite |
| S06 | A legacyと取消を正しく分離・NULL状態は元schemaがNOT NULL | PASS SQLite/schema |
| S07 | 会計済変更→索引除外・旧statusに再開→索引包含 | PASS SQLite |
| S08 | 再適用`CREATE INDEX IF NOT EXISTS`の安全性 | PASS SQLite |
| S09 | provisioner生成digest・新店舗migrationリスト整合 | PASS local |
| S10 | 本番D1索引構築・追加write/同期負荷 | **PENDING**（本番アクセスなし） |

## 横展開10観点

| 番号 | 独立のAPI/環境確認 | 判定 |
|---|---|---|
| H01 | Commissionの注文親検索 | PASS source/SQLite |
| H02 | Commissionの明細取得80-ID分割 | SQL無変更、local回帰PASS |
| H03 | Commissionの既存legacy statusと順序 | SQL無変更、legacy fixture PASS |
| H04 | 他の注文 API`src/orders.js`のactive限定 | SQL無変更、local回帰PASS |
| H05 | 店舗間分離のtenant ID入力 | A/B SQLite PASS |
| H06 | 過去注文ステータスUPDATEと索引追従 | SQLite PASS |
| H07 | 本番既存DBのupgrade経路（migration番号0046） | ソース準備PASS、適用PENDING |
| H08 | 新規店舗用provisioner migration digest | 生成＋サービス回帰PASS |
| H09 | Cloudflare D1 SQLiteバージョン/実行planner | **PENDING**（SQLite互換を推定に留める） |
| H10 | Rows Read/Rows Written/印刷・KDSライブ負荷 | **PENDING**（本番測定・正式QAが必要） |

## 本番へ適用する際の注意

0046は書込みオーバーヘッド付きの索引であり、キャッシュ削減・JOIN最適化と混同しない。既存DBのmigrationには本番承認・バックアップとcanary・実Cloudflare`meta.rows_read`と`meta.rows_written`の**両方**を比較したうえで、失敗時はWorkerロールバックとmigration互換を独立審査する。**現在はcommit/push/deploy/本番migration/正式QA変更なし、P0 OPEN**。
