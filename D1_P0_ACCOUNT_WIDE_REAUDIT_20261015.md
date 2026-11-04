# IZK-UT-069 / P0 — 2026-10-15 Account-wide再監査（LOCAL / リリース禁止）

**起点**: ユーザー指示「障害台帳を最新化し、その後P0の調査対応」。先に正本 `handoff/GPT_実機テスト障害台帳.md` を修正し、`handoff/issue-dashboard/server.py::sync_from_ledger(force=True)` で 75障害（OPEN10, REOPEN5, WAIT_TEST4, CLOSED56）へ再同期済み。旧Android FAIL47の正式判定は変更していない。

## 判定

**POSの主因SQLはローカルソース修正・独立SQLite回帰済み。ただしIZK-UT-069は現在もP0/OPEN。本番回復・Rows Read減少・全7DBサービスの対処は未証明**。このファイル自体、本番を一切操作していない。設定・D1 SELECT・GraphQLライブ照会・Worker deploy・migration実行・commit/push・QA端末操作もしていない。

## 1. 旧実測・根因

- 2026-10-12 D1のUTC日別全観測 **8,968,113 rowsRead**（7DBのうち観測行がないDBはゼロと断定しない）。
- 別集計窓のSQL Insightsでは`izakanpai-yuwaku` 注文明細JOINが**116実行、平均72,310 rowsRead、計8,387,960 rowsRead**。UTC日別値と24hローリング値は加算しない。
- `src/orders.js`の現行ソースは認証済みstoreIdの有効注文IDを先に取得し、`order_items`を `store_id=? AND order_id IN (...) ` に限定、80-IDずつ分割し、0件なら実行せず結果の順序/形を維持。旧履歴全体JOINによる大量索引読取を回避する。
- `src/gasApi.js`・`src/index.js`・`migrations/0045_operations_revision_low_cost_poll.sql` で店舗別revisionの変更時応答/アイドル軽量照会をローカル追加。**0045は27個のrevision/store-guardトリガーを持ち、追加D1 rows_written負荷の実測も必要**。本番0045の実適用状況は不明、未適用時はfail-safeでfull取得する契約。
- Admin/KDS/Print Bridgeはローカルで頻度・非可視・offline・quota cooldownを改善。局所ポーリング制限は**7DBアカウント全体の最大リクエスト数を保証しない**。
- **2026-10-15追加POS是正**: Native `src/index.js::handleGetFeedback`とGAS互換`src/gasApi.js::getFeedback`が同じ店舗の`feedback`評価履歴全件を別SQLで受け取りJS集計していた。新しい共通`src/feedbackSummary.js::getFeedbackSummary`により**ratingごとのGROUP BY/COUNT**で結果だけを受信し、最新履歴`LIMIT`は継続。12,002件A店舗＋1,200件B店舗のSQLite結果は旧API平均・分布・ページ順・0/NULL/異常・小数を含め一致。**9集計行への通信量減少であり、実Cloudflare D1 rows_readが同程度減るとは主張しない**。SQL安全監査の新規モジュールもread-only＋認証storeIdスコープを手動レビューして登録。

## 2. 今回その場で再実行したテスト・測定

| コマンド | 結果 | 証明できること |
|---|---|---|
| `node test/d1_p0_orders_revision_regression_test.mjs` | exit0 / 45migration・201 active ID・cross-tenant不変 | 80-ID分割、元の明細、store_id、revision/更新/0045欠落fallback |
| `python test/d1_p0_rows_read_benchmark.py` | exit0 | SQLite 10,000過去注文・30,000過去明細＋3active/10明細で旧work420,200→新100、**99.976% VDBE減少**。一致する10行を返す。**Cloudflare meta.rows_readではない** |
| `node test/d1-p0-monitor.test.mjs` | exit0 / 5テスト | 7DB合算閾値3m/4m/4.5m、未知DB、旧比・SQL高負荷、fail-closed、秘密値を報告しないoffline監視 |
| `node test/control_plane_routing_test.mjs` | exit0 / 43 checks | 店舗routingと認証境界。これは負荷実測ではない |
| `node test/control_plane_deletion_job_test.mjs` | exit0 / 20 checks | 削除ジョブ整合。これは本番の自動削除確認ではない |
| `node test/d1_p0_feedback_aggregate_test.mjs` | exit0 | feedback 12,002件を9カテゴリ集約にし、旧JSONと店舗間分離/空/ページ順同一をSQLiteで確認。Native/GAS入口の呼出しも確認 |
| `node test/tenant_raw_sql_inventory_test.mjs` | exit0 / 46 SQL modules・932 syntactic callsites | 新しい共通feedbackSummary.jsの**店ID条件付きread-only 2SQL**を個別審査して台帳へ登録。静的監査だけでは全SQL安全性は証明しない |
| `git diff --check` | exit0（監査時） | Diffの空白/patch異常なし。実ビルド/配信成功とは異なる |

### 2026-10-15 最終統合ゲート

- 新規`src/feedbackSummary.js`をPOS両APIが読み込む状態で`npm test` **exit 0**。ログ: `test-results/d1-p0-20261015-integration-npm-test-v2.log`。
- 最初の`npm test`は`test/tenant_raw_sql_inventory_test.mjs`が**新規SQLモジュールの未審査を正しく検出してFAIL**。両クエリを個別に確認し（auth由来storeId、bind2回、SELECTのみ、独立A/B店舗12,002/1,200行）、監査登録`'feedbackSummary.js':2`を追加した後に監査・全体テストがPASS。初回失敗ログ`test-results/d1-p0-20261015-integration-npm-test.log`を保全。
- `node test/tenant_raw_sql_inventory_test.mjs`: 46 raw SQLモジュール、932構文上のSQL呼出を報告し **exit0**。静的regexだけでは認可/SQL安全を完全に証明しない。
- `npm run verify:distribution` **exit0**。ログ: `test-results/d1-p0-20261015-verify-distribution.log`。今回のPOS backend修正に対し、Web/Nativeの生成物について既存ソース互換検証。APK/IPA/Workerのbuild/deployを意味しない。
- KuraPinas `node --test tests/d1-p0-admin-window-query.test.mjs tests/admin-metrics.test.mjs tests/round30-digest-macro-categories.test.mjs` **18/18 PASS**。他エージェントの既存作業があるため`git diff --check`全ファイルでは`worker/ui.js`の**本件以外の末尾空白**が検出されるが、対象`worker/db.js`限定のdiff checkはexit0。既存他担当のファイルを勝手に修正していない。

CloudflareのD1 Analytics APIは`d1AnalyticsAdaptiveGroups`等のaccountTagフィルタで集計できるが、ユーザーの明示承認なしに**ライブAPIの認証情報を取り出さない**。既存`scripts/d1-p0-monitor.mjs`はoffline JSON fixture入力のみであり、実監視通知・常時実行は**未設置**。クエリの`$accountTag: string!`はCloudflareの公開GraphQL例に沿う（GraphQLの標準`String`と一律置換しない）。

## 3. 7つのD1と影響先、状態を混同しない

| 対象D1 | 最新のコード上の対処/根拠 | 本番meta.rows_read / リリース確認 |
|---|---|---|
| `izakanpai-yuwaku` | POS主要JOIN/revision/backoffローカル修正、source regression | **未確認** |
| `izakanpai-teat` | POSと同型ロジック、独立storeId A/B回帰 | **未確認** |
| `izakanpai-platform` | `src/platformUsage.js`はD1利用状況を主にCloudflare account analytics APIから取得。ダッシュボード取得が自らD1を浪費する設計と断定しない | **未確認** |
| `izakanpai-control` | `src/controlPlaneWorker.js`の15分cronは`tenant_registry`から稼働店を取得してstoreごとdispatch、別の削除巡回では20retry/200active上限。制御D1の将来tenant数とquery planは要監視 | **未確認** |
| `kurasias-db`（KuraPinas） | `/kurapinas`の既存feed索引/PV/cronローカル対策を再確認。さらに`worker/db.js::dbAdminMetrics`で4表×(7日+30日)の**8集計SQLを4集計SQLへ統合**、出力同一・局所SQLiteとAPIテストPASS。D1 rowsRead半減とは言わない | **未確認** |
| `kurasias-staging-db` | staging cron停止設定のsource根拠、prodとの環境分離/配布版は別確認 | **未確認** |
| `pitayasu-analytics` | PitaYasuソースは本作業の許可された作業ルート外。**未調査・未修正・PASS不可**。ファイル/安全なアクセス権限が必要 | **未確認** |

## 4. 自己レビュー10巡の状況（誇張しない）

| 巡 | 実際に行った確認 | 判定 |
|---|---|---|
| S01 | 2026-10-12旧metricsの日別とSQL Insightsの窓を分離 | PASS（履歴資料） |
| S02 | 旧JOIN→限定INのSQL形、0ID・201ID分割 | PASS（ローカル回帰） |
| S03 | SQLite旧/新の同一10明細・99.976% work推定 | PASS（ローカル） |
| S04 | A/B認証済み店舗の結果非漏出 | PASS（ローカル回帰） |
| S05 | 0045 revisionアイドルと未適用時fallback | PASS（ローカル回帰） |
| S06 | 0045の追加write/trigger負荷とproduction適用有無 | **PENDING（D1実測なし）** |
| S07 | タイマー/backoffと複数端末時の24h予算 | 部分レビュー、**account全体負荷モデル未確認** |
| S08 | 主要制御cron/配信経路のSQL構造とfeedback両APIの履歴読取を逆引き | PASS（source/SQLite）、実Worker未確認 |
| S09 | 7DB実Worker版・索引/GraphQL利用量・実サービス | **PENDING** |
| S10 | 監視mockのしきい値/未知DB時の安全失敗 | PASS（5 local tests）。ライブ通知**PENDING** |

## 5. 横展開10巡の状況（独立の入口、未完了を明記）

| 巡 | 確認した方向 | 判定 |
|---|---|---|
| H01 | 注文SQL→active注文ID→tenant索引 | ローカルPASS |
| H02 | 注文差分Native/GAS / migration 0045 | ローカルPASS、実Worker未確認 |
| H03 | Admin/KDSと非可視・ネットワーク復旧・poll | ローカル修正証拠あり、physical未確認 |
| H04 | Print Bridge・印刷ACK/idempotency | ローカル修正証拠あり、実機未確認 |
| H05 | Control Plane routing / 15分cron・削除処理 | ローカル43+20 PASS、rowsRead未確認 |
| H06 | Platform UsageのD1 inventory / monitoring SQL以外の経路、およびPOS feedbackのNative/GAS別入口 | feedback共通SQL変更＋A/B・旧出力ローカルPASS、API負荷/配信版未確認 |
| H07 | KuraPinas feed/PV/Cron / staging | 管理指標8→4 SQLの局所修正とSQLite+API回帰PASS、feed翻訳永続化15/15 PASS。PV大量集計・本番Cron量はPENDING |
| H08 | PitaYasu analyzerと専用Worker | **BLOCKED**（作業ルート外） |
| H09 | 7DB account合算monitor / 異常通知 | offline 5 PASS、実設定・通知未稼働 |
| H10 | 全DB/SQl fingerprint再測定と実API版照合 | **PENDING**（本番無操作） |

**S01–S10/H01–H10はレビュー観点と実施根拠を開示したものであり、10回×2が全件PASSという意味ではない。**

## 6. 次のP0リリースゲート（すべて事前承認・安全作業のみ）

1. 既存WorkerバージョンID/ソースSHA、7DBバインド/索引/0045 migration適用を**本番SQLへの負荷を掛けず**確認する。未適用なら手順・ロールバックと追加rows_writtenの費用・安全性を審査。
2. 0045 revisionにより、対象D1 `meta.rows_read`で同一入力/同一店/同一履歴の旧新比較を**孤立した検証用DBで**行う。≥98%のrowsRead削減と注文/KDSの不変を証明。
3. KuraPinas/同一アカウントのPitaYasuも独立に調べ、各DB/Worker/cronで10巡のコード・SQL/頻度監査。アクセス不可ならBLOCKEDのまま。
4. アカウント合算の非SQL GraphQL監視を認証情報保護のもと設定し、3m/4m/4.5m警告と収束/unknown DBを確認。ユーザーが監視を依頼しない限り自動常駐化しない。
5. **承認後に限り**ピン留めした差分をcommit/push、Worker段階deploy、0045 tenant-by-tenant migration、canary。注文/会計/印刷/店間漏出ゼロ・Cloudflare実メトリクスを観測。異常時は前Worker版へ安全rollback、DBトリガーの破壊的DROPは別審査。
6. Android Realme・Emulator・iPhone・Web/KuraPinas/PitaYasuをそれぞれ実導線で再テストし、当該P0をユーザーが承認するまで**OPEN維持**。

## 参照

- `handoff/GPT_実機テスト障害台帳.md` IZK-UT-069。
- `docs/D1_P0_INCIDENT_REMEDIATION_REPORT_20261012.md`（source root fix）。
- `docs/D1_P0_ALL_SERVICES_FIX_STATUS_20261012.md`（旧7DB照合と追加作業）。
- `docs/D1_P0_MONITORING_ACCOUNT_ISOLATION_20261012.md`（設計・アカウント分離）。
- `/kurapinas/docs/D1_P0_KURAPINAS_REAUDIT_20261015.md`（管理集計追加修正、10+10ソースレビュー、限定回帰。別ワークスペースに保存）。
- `docs/D1_P0_POS_REAUDIT_20261015.md`（POS API/SQL/親スキャン/Feedback/15分cronの追加ソース点検）。

## 2026-10-15 継続第2巡（LOCAL、全サービスP0 OPEN維持）

### 第3巡：Commission部分索引のローカル実装まで実施

前回は旧statusの非互換性によりSQL置換を保留したが、**旧APIのWHERE句を一切変更せず**に履歴スキャンを減らす`migrations/0046_commission_open_orders_index.sql`を新設した。`status NOT IN ('会計済','取消')`と一致する**部分インデックス**のみを作るため、未知の旧未会計statusの注文も引き続き対象。SQLite 15,500件の会計済み＋店舗Aの206有効/未知statusを使う新旧SQL同一データの戻り値一致、他店舗分離、状態変更/再開、再実行、`EXPLAIN QUERY PLAN`の新索引選択を確認。新規店用generated migrationsも再生成。`docs/D1_P0_COMMISSION_INDEX_0046_20261015.md`にS/H各10観点と初回適用負荷・追加rows_written・実D1未計測を記録した。**ローカル作業であり、migration本番適用・実D1削減率・P0 CLOSEはしていない**。

### POS / commission 親テーブル検索：根拠のない仕様変更を保留

`src/commission.js::getOpenOrders`の`status NOT IN ('会計済','取消')`は、歴史的な未知ステータスの注文も未精算候補として扱う。10,000件の会計済み注文に未知旧statusと別店舗5,000件を混ぜたSQLiteデータで`EXPLAIN QUERY PLAN`を実行し、既存`idx_orders_store_status`が現状は`store_id=?`部分しか有効に使われない高負荷リスクを確認。**現在の3状態だけをINへ置換すると未知の旧注文が消え、注文・会計の意味論が壊れる**ため強制修正しなかった。旧値を保持するpartial index案にはmigration・書込みコスト・実D1 planner検証が必要。証跡：`docs/D1_P0_POS_REAUDIT_BATCH2_20261015.md`、`test/d1_p0_commission_parent_plan_batch2.py`。これは**追加未解消リスク**であり、P0完了ではない。

### KuraPinas / PV統計：追加2SQL＋2重複走査を削減

別ルート`/kurapinas/worker/db.js::dbPageViewMetrics`では、全サイトとKuraPinasの同じ日時範囲の`daily`および`deviceBreakdown`をそれぞれ重複検索していた。共有範囲をGROUP BYし、`SUM(CASE WHEN path='/KuraPinas' OR path LIKE '/KuraPinas/%' THEN 1 ELSE 0 END)`を併せて取得して、**4本のSQLを2本へ削減**。全15集計の戻り値キー・日時(フィリピン時間+8)・対象期間・path/device仕様は維持。独立SQLite旧/新比較で1日/7日/30日/0件×hour/dayの16論理比較PASS、Nodeチャート/APIの8/8 PASS、JS構文と対象diff check各exit0。ただし端末集計同数時のtie順は旧SQL自体が非決定的であり、UI実表示は未確認。証跡：`/kurapinas/docs/D1_P0_PAGE_VIEWS_CONDITIONAL_AGGREGATE_20261015.md`、`/kurapinas/tests/d1-p0-page-views-conditional-sqlite.py`。**実D1のrowsReadは未計測**。

本追補におけるPOS/KuraPinasの実D1・Worker・migration・PitaYasu・正式Android QAへの操作/適用は一切なし。既存未コミット差分を保護し、P0は`IZK-UT-069 OPEN`。

**作業結果はローカル調査と証跡のみ。Cloudflareサービスの本番復旧・告知・追加課金・移管を行っていない。**
