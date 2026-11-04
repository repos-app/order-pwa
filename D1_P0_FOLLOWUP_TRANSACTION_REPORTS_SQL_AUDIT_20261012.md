# D1 P0追加監査：取引・レポート・レジ・歩合・経費SQL

2026-10-12。範囲：`src/billing.js`, `reports.js`, `register.js`, `commission.js`, `refunds.js`, `inventory.js`, `expenses.js`、関連migration。**静的監査のみ**。本番D1の実測／`EXPLAIN QUERY PLAN` は未実施。数値的なRows Readや上限超過への実際の寄与は未確定。既存P0 `order_items` JOINの別候補を列挙する。

## 優先して修正・検証すべき候補

| 優先 | 箇所・実際の経路 | 根拠と費用増幅 | 推奨措置 |
|---|---|---|---|
| **P0条件付き** | `billing.js:227-240`, `nextReceiptSeq` の **fallback** | `MAX(CAST(SUBSTR(receipt_no, INSTR(...) + 1) AS INTEGER)) FROM receipts` に `store_id` なし、同じ式がINSERT/UPDATE双方にあり、インデックスで数値MAXを求められない。全店舗の全レシートを走査し得る。会計確定時（`:456`）に発火。ただし `db.nextGlobalSequence` が存在すれば分岐は回避 (`:228-230`)。 | 本番で使用されるDBアダプタが常に `nextGlobalSequence` を提供するか確認。fallbackは通常経路から削除するか、専用の原子的・グローバル採番表を用いる。グローバル一意な `receipt_no` 要件を維持。`store_id` を単純追加するだけではグローバル採番契約が変わるので不可。 |
| **P1** | `reports.js:224-275,294-337`、`getSalesAnalytics`; `docs/yuwaku/sales.html:271` | 月内 `receipts` の `items_json` 全件取得・JS展開に続き、同じ月間範囲を時間帯集計、曜日集計、総額集計で3回読み直す。`idx_receipts_store_date` により月間範囲に制限されるが、期間内行数 × 4 と大きいJSON転送が増える。 | 商品別の月次集計を増分サマリー化するか、少なくとも重複集計を1回の範囲取得で統合。遡及修正・返金との整合性を検証。UIからの再試行頻度と月次Rows Readを計測。 |
| **P1** | `expenses.js:142-210`、`getMonthlyProfit` / `computeCogsAuto`; `docs/yuwaku/profit.html:144` | `SELECT items_json FROM receipts WHERE store_id=? AND created_at>=? AND created_at<?` が月内全件JSONを転送。その前の `getOfficialSales` と別途読み取る。COGSの月次表示で反復されるとRows Readが増える。 | 原価の確定時スナップショット／日次集約を検討し月次全件JSON走査を削減。既存レシピ更新時の遡及計算の仕様を確認。 |
| **P1** | `register.js:57-75,88-109`、`getCurrentShift`, `getRegisterBundle`; `docs/yuwaku/register.html:161` | 開店時刻以降の全 `receipts` を毎回列挙してJSで決済手段・返金別に合算。`idx_receipts_store_date(store_id,created_at)` はあるが長時間開店／未締めシフトでは範囲が肥大。画面再読込にも連動。 | `GROUP BY`/条件付き `SUM` でDB側に集約して転送を減らす（ただしRows Read自体は範囲行数に比例）。より厳しい予算にはシフト増分集計、締め処理でリコンシリエーション。 |
| **P1** | `commission.js:177-206`、`getOpenOrders`; `:471-475` bundle経由 | `orders o JOIN order_items oi ON oi.store_id=o.store_id AND oi.order_id=o.order_id WHERE o.store_id=? AND o.status NOT IN (...)`。`idx_order_items_store_order` (`0026:343`) があれば親別lookup可能。**ただし履歴中の非会計済・非取消注文が増えると無上限取得**、後続 allocations のIN句も明細件数に比例。 | status別の件数、長期残留注文の調査、キャップまたは店舗の業務上有効な期間を導入。追加の複合index `orders(store_id,status,created_at)` は `NOT IN` で効くかローカル `EXPLAIN` で判断。 |
| **P1/P2** | `reports.js:405-434`、`getReceipts`; `docs/yuwaku/receipts.html:158,200,208` | 本体は `LIMIT 300` があるが、月指定なしでは全履歴サマリー `getReceiptSummary` が実行され、ページごとに再計算する。`OFFSET` が深いページほど前方のindex候補をスキャンする。`LEFT JOIN receipt_refunds` の結合キーに複合index/PKがあるか要検証。 | 月指定必須または合理的期間デフォルト、ページングは `(created_at,receipt_no)` keyset化。総計キャッシュ/別RPC化。 |
| **P2** | `expenses.js:46-47` `getExpenses` | `SELECT * FROM expenses WHERE store_id=? ORDER BY expense_date DESC` は全期間全件を返し、件数の制御がない。`idx_expenses_store_date` はソートを支援するが転送行数に上限なし。画面初期表示 (`docs/yuwaku/expenses.html:347`) に発生。 | 日付範囲／ページサイズを設け、必要列のみ取得。 |
| **P2** | `register.js:103-109` | 直近500件の閉店シフトを読み取りJSで月次処理（内部コメントも500件制限）。`0035_register_query_indexes.sql:3-7` は `(store_id,status,started_at DESC)` を用意済み。 | 500件の固定上限は急激な無制限増大を防ぐが、対象月のレンジ検索へ変えると無関係なシフトを削減可能。 |
| **P2** | `inventory.js:601-602` 在庫移動履歴 | `SELECT * FROM inventory_moves WHERE store_id=? ORDER BY created_at DESC,move_id DESC` が期間・件数制限なし。`idx_inv_moves_store_date(store_id,created_at)` はあるが、履歴全件の返却・転送は抑えない。 | 最近N件のkeysetページング、必要列に縮小。`created_at` 同値時に `move_id` を含めて決定的に取得。 |

## 現在の索引根拠

- `migrations/0001_init.sql:85-87` orders: `(store_id,created_at)` と `(store_id,status)`。`order_items(order_id)` は `:96`。
- `migrations/0026_store_id_child_isolation.sql:343` order_items: `(store_id,order_id)` 追加。JOINを根本的に絞り込む索引として優先して適用状態を確認。
- `migrations/0001_init.sql:142` receipts `(store_id,created_at)`、`:352` expenses `(store_id,expense_date)`。
- `migrations/0010_commission_pos.sql:31-34` allocations `(store_id,order_item_id)` / `(store_id,employee_id)`、`:57-60` commission entries `(store_id,created_at)` / `(store_id,employee_id,status)`。
- `migrations/0035_register_query_indexes.sql:3-7` shifts `(store_id,status,started_at DESC)` および `(store_id,status,ended_at DESC)`。
- **migrationファイルに定義があることと本番の索引適用済みは別**。運用担当者の承認を得て `PRAGMA index_list`, `EXPLAIN QUERY PLAN`, D1 analytics/SQL計測で確認する。

## 他ファイルの所見と境界

- `refunds.js:51-69` は店舗・レシート番号で絞る。`receipt_order_links` → `order_reward_snapshots` JOIN は `store_id` も結合済み。返金の単発処理であり、常時poll由来の爆発候補より優先度を下げる。索引の適用・対象件数は別途計測する。
- `billing.js:337-338` は注文単位の `order_items` 読み取りで `store_id,order_id` 条件あり。複数対象に対する反復があるが、無条件の全店舗JOINとは性質が違う。
- `inventory.js` はNULバイト混在で通常の `rg` がbinaryと判定するため、`rg -a` でSQL箇所を調査。`:20` 在庫マスタ全件、`:127` 既存在庫全件、`:601` 在庫移動履歴全件、`:634-645` 在庫・メニューリンク・レシピマスタ全件はいずれも `store_id` で制限。店舗内在庫マスタ・レシピ件数の大幅増加時には呼び出し頻度を含めて追加計測が必要。全SQLの動的実行意味論まで網羅したPASSではない。

## 改善順と完了条件

まず `nextReceiptSeq` の本番分岐を確認し、万一fallback到達可能なら最優先で対処。その次に「月次レシート全件JSON読取」2系統、開店以来全件集計、未完了注文のJOINを、**行数 × 一日あたりRPC回数 × 呼出店舗数** で実測順位化する。各改修には本番相当SQLiteで `EXPLAIN QUERY PLAN`、月間10万件相当データで出力一致／返金／複数店舗分離の回帰、無制限読取の有無を添える。変更のcommit/push/deploy/migrationは未実施。
