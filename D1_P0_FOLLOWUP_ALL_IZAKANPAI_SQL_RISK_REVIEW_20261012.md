# izakanpai D1 P0追加監査：高読み取りSQL・全画面ポーリング 第二巡

2026-10-12 PHT。IZK-UT-069の追加監査。ローカルのsrc、migration、UIを対象に調査し、本番D1にはクエリしなかった。commit/push/deploy/本番DB変更、正式QA runner更新は行っていない。実際のD1 rows_read・索引適用・呼出回数の計測は未確認。

詳細：D1_P0_FOLLOWUP_TRANSACTION_REPORTS_SQL_AUDIT_20261012.md および D1_P0_FOLLOWUP_POLL_PRINT_AUTH_SQL_AUDIT_20261012.md。

## A. 最優先で検証すべき高コストSQL

| ID / 暫定評価 | コード・API経路 | 観測した懸念 | 対策案 |
|---|---|---|---|
| ADD-001 P0条件付き | src/tenantSqlGuard.js:622-649、billing.js:227-240、takeout.js:64 | レシート/テイクアウトの全履歴から MAX(CAST(SUBSTR(...))) で番号採番。店舗/時間の絞り込みなし、インデックス最大値を直接求められない。ここは本番で使う nextGlobalSequence にも同じSQLがあり、fallbackだけの問題ではない。 | 初回だけ全履歴から確定値をseedした、DB内のグローバル原子カウンタを利用。UPDATE/UPSERT RETURNINGで発番。競合・戻り値・復元・歴史的高番号挿入・グローバル一意性を厳密に回帰。migration・承認が必要。 |
| ADD-002 P1高 | src/commission.js:177-206,470-475 | orders と order_items のJOINで未会計注文を選別。親の status NOT IN 条件と巨大な子履歴が重なると、今回のP0と同様に明細全体を走査。 | まず認証店舗の未会計注文ID取得、そのIDに対して order_items(store_id,order_id) インデックス限定検索。80件程度のバインドチャンク。件数を黙って切り捨てない。 |
| ADD-003 P1高 | src/gasApi.js:246-250,825、reports.js:99-119、mobile-app/web/app.js:1093-1118、docs/yuwaku/app.js:979-1003 | 公開getMenuRankingが注文画面のBootstrap毎に過去30日分のレシートitems_jsonを全読みしてJS集計。オフラインキャッシュ→再接続の2段表示でも複数回可能。QR客端末/自動クローラで増幅する。 | 店舗別で許可された公開ランキングのTTLキャッシュ／売上確定時の事前集約。商品名変更・返金・店舗分離・更新遅延を仕様化し、レート抑制がD1への毎回書込を増やさない設計。 |
| ADD-004 P1高 | docs/yuwaku/bridge.html:91,224-226,275、src/printers.js:634-674,709-719 | 印刷ブリッジ既定1.2秒poll、毎回認証・outbox/lease/claim・空ジョブ探査が起こり得る。1端末で最大約72,000 poll/24h、5端末で約360,000 poll/24h（理論値で実測ではない）。 | 空ジョブ時バックオフ、同一デバイス単一poll leader、outbox回収と印刷pollの分離、重複lease書込み制御。低遅延印刷とACK冪等性を維持。 |
| ADD-005 P1 | src/gasApi.js:567-581（getSalesSummary）、reports.js:390-406 | 全期間receiptsを日別GROUP BYする。年月/期間条件がなく、履歴件数に比例して増える。月指定なしレシート一覧も全期間合計を再計算。 | 正本の会計確定・返金と整合する日次サマリーか、明示された期間を扱う高速集計。 |
| ADD-006 P1 | src/reports.js:218-337、expenses.js:142-210、register.js:57-109 | 当月レシートitems_jsonの全件取得が売上・原価で複数回発生。レジ開店以降のレシートも都度全件ロード。範囲索引は利用しても範囲内件数に比例。 | 同じ会計スナップショットを再利用、日次/シフトごとの増分集計・返金時の再計算整合。 |
| ADD-007 P2 | src/attendance.js:74-81,230-239,249-282,350-353 | WHEREでdate(datetime(created_at,..)) / strftime(datetime(...))変換。日時索引のcreated_atを範囲検索に利用できず、従業員ごとの今日の打刻取得がN+1化。 | 店舗タイムゾーンからUTCの開始/終了を計算して原日時列で範囲検索。一括従業員ステータス読取。夜勤・月跨ぎ・地域設定を回帰。 |
| ADD-008 P2 | src/backup.js:32-52、src/dataAdmin.js:197-229,696 | CSV、復旧操作は管理者の単発操作でもテーブル全件・親JOIN全件を読み込む。巨大データに対する安全な予算がない。 | 取得件数の事前警告、安定キーによる分割/バックプレッシャー、並列禁止、復元の正確性検証。 |
| ADD-009 P2 | src/inventory.js:601-602、expenses.js:46-47、dataAdmin.js:740-745 | 在庫移動・経費の無制限全件取得、管理バックアップ履歴の索引不一致候補。 | 明示期間とkeysetページング、必要列限定、索引の実計画で優先判断。 |
| ADD-010 P2 | src/sessionTokens.js:179-195 | セッション確認は単体では索引読取だが全API/pollに掛け算。 | リクエスト内の重複認証読取だけ最適化。ログアウト即時失効は維持。 |

## B. 匿名ローカルSQLite再現（Cloudflare実績とは区別）

実行: python test/d1_p0_additional_sql_risk_benchmark.py

投入件数：会計済み注文10,000＋明細30,000、アクティブ注文3＋明細10、レシート20,000、テイクアウト20,000、勤怠20,000。これらはSQLite VDBE処理量の100命令単位の近似値であり **D1 rows_readではない**。VDBEが0の場合は100命令未満を意味する。

| SQL | SQLite内部処理量（概算） | EXPLAINの特徴 |
|---|---:|---|
| コミッション現行JOIN | 360,200 | order_items索引のstore_idだけを走査→各order_id検索→ソート |
| コミッションのアクティブID限定案 | 100 | order_items索引の(store_id,order_id)両方を使用、返却明細10件一致 |
| レシートの数字化MAX採番 | 180,000 | receipt_no主キー索引全体を走査（式MAX） |
| テイクアウトの数字化MAX採番 | 120,000 | order_code主キー索引全体を走査（式MAX） |
| 公開ランキング用30日レシート取得 | 160,000 | store_id+created_atの範囲索引を利用、対象20,000件を全返却 |
| 全期間の日別売上サマリー | 420,000 | store_idのみ絞り、全期間GROUP BYに一時B-tree |
| 勤怠日付関数条件 | 140,000 | store_id+employee_idまでのみ索引利用 |
| 勤怠日時範囲への変更案 | 100未満 | store_id+employee_id+created_at全ての索引列で絞る |

## C. 再発防止の実施順

1. 採番SQL：数字化MAXを毎会計で実行しない原子連番設計を最優先。既存連番の取りこぼしと競合を防ぐため独立した設計/データ移行レビューが必要。
2. 印刷1.2秒pollと公開ランキング：D1 SQL Insightsのfingerprint・平均rows_read・呼出回数、端末台数を突合し、リクエスト頻度×費用が大きいものから減らす。
3. コミッションJOIN：元P0で実証したアクティブ注文ID限定検索を横展開。店舗またぎ、同一order_id、明細順・割当人数に差がないことを検証。
4. 売上/原価/勤怠/在庫/CSV：範囲絞り、日次サマリー、ページング、原価・返金・夜勤・翻訳・画面の回帰をセットで行う。
5. 監視：アカウント全DBの合計3M/4M/4.5M及びSQL単位の異常値。無料/有料問わずQAの本番D1分離。

合格基準：本番相当データでSQL計画・APIレスポンス一致・テナント安全性を確認後、利用者の承認範囲に限ってmigrationとWorker反映を実施し、実際のD1 meta.rows_readで改善を証明する。旧PASS/FAIL/runnerは一切変更しない。
