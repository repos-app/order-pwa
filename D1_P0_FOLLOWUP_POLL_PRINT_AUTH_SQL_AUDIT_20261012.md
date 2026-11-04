# D1 P0 第二巡監査：印刷・ポーリング・認証・バックアップ・制御プレーン

2026-10-12。対象はローカル静的コードと migrations。**本番D1の EXPLAIN/rows_read 実測は未実施**。数値はコード由来の上限・周期であり計測値ではない。重大性は想定頻度と候補行数に基づく暫定評価。ソース変更、migration、commit、push、deploy は実施していない。

## 優先度高：頻繁に呼ばれる印刷DB操作

1. **P1 / bridge 空ポーリングの増幅**。`docs/yuwaku/bridge.html:91,224-226,275` は既定 **1,200ms** に一回 `bridgePoll`（約 3,000 回/時間/端末）。`src/printers.js:709-719` は各回 `checkBridgeKey`、`recoverReceiptPrintOutbox`、`findAssignedPrintHost`、`touchPrintHostAssignment`、`claimPrintJobs` を逐次呼ぶ。`src/printers.js:634-674` はジョブ不在でも lease 確保、期限切れ `UPDATE print_queue`、`SELECT ... pending ORDER BY created_at LIMIT 10`、lease 解放を行う。`migrations/0036_print_device_assignments.sql:81` の `(store_id,status,printer_id)` は先頭条件を支援するが `created_at` を含まない。店舗/プリンタごとの履歴増加に伴う sort/scan と書き込みを疑う。**対処**：無ジョブ時の指数的・上限付きバックオフ、可視状態/接続状態による抑制、同一プリンタの単一ポーラー保証、不要な lease 書き込み低減。実運用の遅延要件を保った上で `EXPLAIN QUERY PLAN` と rows_read 比較。候補索引 `(store_id,printer_id,status,created_at)` をローカル実測してから migration 提案。
2. **P1 / すべての印刷 poll で領収書 outbox 再走査**。`src/printers.js:714,726,929` から `recoverReceiptPrintOutbox(...,5)`、`src/printers.js:1111-1130` は `receipt_print_outbox` の未投入・再試行行を最大 5 件読み、各行で印刷キュー作成へ進む。`migrations/0042_receipt_print_outbox.sql:19-20` に `(store_id,enqueued_at,next_attempt_at,created_at)` がある。未投入行が増えると時間条件と `ORDER BY` の計画を実測すべき。**対処**：期限の来た pending 行だけを低頻度 worker/単一回収者に集約し、印刷ホストの全リクエストから外す方法を検証。障害回復保証と checkout の冪等性を維持する。
3. **P1 / CloudPRNT も同系統**。`src/cloudprnt.js:69-75` は device poll ごと認証設定値、MAC→printer 対応、ジョブ確保へ進む。`src/printers.js:902-906` は `SELECT printer_id,mac_address FROM printers WHERE store_id=? AND enabled=1` で店舗内の全有効プリンタをロードし、アプリ側で MAC を照合する構造。台数増に比例し、個別に `mac_address` で検索できていない。`src/printers.js:928-947` は outbox 回収、期限切れ claim 回収、pending 1 件取得を毎回実施。**対処**：MAC の正規化規約を決め、`(store_id,enabled,mac_address)` の検索へ変更して計画を検証。CloudPRNT の外部機器による poll 周期を別途測定。

## 優先度中：データ管理と認証

4. **P1（操作時） / 大規模バックアップ・エクスポート全件取得**。`src/backup.js:32-52` は各テーブルごと `PRAGMA table_info` の後、`SELECT * FROM table WHERE store_id=?`、`order_items`/`takeout_order_items` は親 JOIN による全件読み込みを実行する。**LIMIT/ページングなし**。`src/dataAdmin.js:197-229` もテーブル一括取得、`src/dataAdmin.js:696` は親レコード全 ID のロード。通常 poll の原因とは断定できないが、実行した瞬間に大量 rows_read となり得る。**対処**：手動管理操作に限定、サーバ側件数見積もりと予算上限、安定キーで分割、処理中 UI 表示、同時実行抑制、巨大 JSON/メモリ回避。バックアップの完全性・テナント境界は維持する。
5. **P2 / 認証の per-request 読み取り**。`src/sessionTokens.js:179-195` の `isSessionActive` は v3 セッションごと `auth_sessions` を参照。`src/sessionTokens.js:93-109` の refresh は `auth_sessions` と `employees` の主キー結合。`migrations/0020_auth_sessions.sql:4,14-17` では `session_id` 主キー、refresh hash unique、employee 用 index があり、単体クエリの全表走査の根拠はない。大量リクエスト時は総読み取り負荷が積み上がる。**対処**：全 API で `isSessionActive` の呼び出し回数を計測し、同一リクエストの重複認証照会を request-local memoize（失効の即時反映保証は維持）。セッションの共有長期 cache は慎重に扱う。
6. **P2 / バックアップ一覧のソート索引**。`src/dataAdmin.js:740-745` は `store_id=? ORDER BY created_at DESC LIMIT 50` の全テーブル一覧経路と、`store_id=? AND table_name=?` 経路がある。`migrations/0006_data_admin_backups.sql:20` の `(store_id,table_name,created_at)` は後者には適合するが前者の全テーブル横断日時順には適合しない。頻度が低ければ優先度は低い。**対処**：実行頻度/EXPLAIN を確認して `(store_id,created_at DESC)` を検討。

## クライアント重複タイマー・cron

- `docs/yuwaku/admin.html:575-579,904,910` は通常更新と **180秒毎の強制 full refresh** が並存。`docs/yuwaku/kds.html:343-358` は画面の 15 秒（非表示 60 秒） poll に加え、180秒 full refresh と 300秒 menu refresh がある。両方の timer が同時に発火した場合に重複要求・古い応答による状態上書きがないか確認し、単一 flight 制御と revision 判定による full refresh 最適化を適用する。`migrations/0045_operations_revision_low_cost_poll.sql` はインデックス化 revision を提供するが適用状況をこの監査では確認していない。
- `src/index.js:1719,1736` は定期処理、`src/controlPlaneWorker.js:1648` も scheduled handler を持つ。制御プレーンは `src/controlPlaneWorker.js:697-720,757-760` で削除ジョブ候補を探索し、ジョブ限定の join/limit を確認する必要がある。現時点で print queue のような高頻度クライアント poll と同等の負荷だという証拠はない。

## 推奨検証順と判定

1. **即時**：endpoint 別 request/min・D1 rows_read/request・発呼端末数、bridge/cloudprnt の polling 周期、空応答比率を計測して急増源を特定。
2. **ローカル**：print_queue の履歴 10万件、pending 0/1/100 件、領収書 outbox の再試行 0/100件で `EXPLAIN QUERY PLAN`、実測時間、変化行数を比較。index 導入は tenant 単位・migration 有無の両方を確認。
3. **回帰**：同一プリンタ複数端末、切断直後、印字成功後 ACK 失敗、再試行、キッチンと一般、領収書 checkout の crash recovery と冪等性。認証期限切れとログアウト即時失効。
4. **結論の限界**：P1 は改善・計測を要する監査候補であり P0 当日の主因と断定していない。全件取得の有無と index 存在はコード確認済みだが、D1 実行計画・実 rows_read・本番 migration 適用・端末稼働台数は未検証。
