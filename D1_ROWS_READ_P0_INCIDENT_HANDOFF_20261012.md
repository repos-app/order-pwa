# P0｜Cloudflare D1 Rows Read 超過：根本修正・全サービス横展開・再発防止依頼

- 作成日：2026-10-12（フィリピン時間）
- 対象：izakanpai（yuwaku / teat / platform / control-plane）、KuraPinas本番・staging、PitaYasu analytics、および同一Cloudflareアカウントの全Worker・D1利用経路
- 優先度：P0／共有クラウド基盤の本番障害
- 状態：**調査完了、修正未実施**。この文書の作成はソース修正・commit・push・deployを承認するものではない。
- 修正担当への命令：実装案、単体/統合/負荷/セキュリティ検証、横展開監査と成果物まで完了すること。commit、push、Worker deploy、DB migration、本番設定変更、有料プラン切替は**個別にユーザーの明示許可**を取ること。

## 1. 事象と本番影響

2026-10-12、Cloudflareより「D1 row read requests are temporarily blocked」と通知。Cloudflare Workers Freeのアカウント合算のD1読み取り上限 **5,000,000 rows / UTC日** を超えた。通知記載の復旧予定は **2026-10-13 00:00 UTC = 同日08:00 PHT / 09:00 JST**。保存済みデータは影響を受けない旨の通知だが、依存するAPIの読み取りが失敗して他サイトの本番稼働にも影響した。

**これは500万HTTPアクセスではない**。単一SQLで大量の行・索引エントリを検査すると少数回のリクエストで枠を消費する。また1つのDBの浪費で同一アカウント内の他D1にも影響する。

Cloudflare D1 GraphQL Analytics（2026-10-12 UTC、調査時点）の確認値：

| DB | 当日rowsRead | readQueries | 確認した役割 |
| --- | ---: | ---: | --- |
| izakanpai-yuwaku | 7,729,355 | 25,532 | izakanpai店舗別 |
| izakanpai-teat | 930,449 | 88,967 | izakanpai店舗別 |
| kurasias-db | 286,700 | 7,702 | KuraPinas本番 |
| izakanpai-control | 21,111 | 21,029 | izakanpai制御DB |
| pitayasu-analytics | 498 | 1 | PitaYasu分析DB |
| izakanpai-platform | 当日集計に行なし | - | izakanpaiプラットフォーム |
| kurasias-staging-db | 当日集計に行なし | - | KuraPinas staging |

上記の当日観測合計 **8,968,113 rowsRead**。未表示DBを「0と保証」しないこと。

別の集計窓：D1 SQL Insights（直近24時間）で、izakanpai-yuwakuの以下のSQL **116回、平均72,310 rowsRead/回、合計8,387,960 rowsRead**。SQL Insightsの直近24時間値とGraphQLのUTC日付値は集計窓が異なり、数値は単純一致しない。

~~~sql
SELECT oi.order_id, oi.item_name, oi.qty, oi.unit_price
  FROM order_items oi
  JOIN orders o ON o.store_id=oi.store_id AND o.order_id=oi.order_id
 WHERE o.store_id = ? AND o.status IN ('未対応', '調理中', '提供済')
 ORDER BY oi.order_id, oi.order_item_id
~~~

yuwakuの日別rowsRead（UTC）：10/06=522,970、10/07=137,026、10/08=60,131、10/09=57,450、10/10=15,728、10/11=16,099、**10/12=7,729,355（前日比約480倍）**。急増の主因は上述のJOINで強く裏づけられる。**「特定のQA端末が発火源」とまではログから断定していない**ため、端末/画面/Workerのリクエストログを相関させること。

## 2. コード上の特定箇所と疑い

1. /izakanpai/src/orders.js:286-309、特に302-308：getActiveOrders()でactive orders確認後、order_items と orders を結合して全明細を取得。高コストSQLと実際のInsights上のSQLが完全一致。
2. /izakanpai/src/orders.js:362-371：getOperationsDelta()がgetActiveOrders()を呼び出す。現行コメントにも「8秒poll」とある。
3. /izakanpai/src/gasApi.js:893-897：getOperationsDelta はクライアントのsinceVersionに応じた差分応答をせず、常に version:0、unchanged:false、フルデータを構築する。画面側の差分期待と食い違う。
4. /izakanpai/mobile-app/web/admin.html:487-528, 564-589：getOperationsDeltaの定期取得。設定10/30/60秒より短い8秒上限の間隔が実際に選ばれる。
5. /izakanpai/mobile-app/web/kds.html:328-370, 387-408：8秒ポーリング、画面復帰時の強制更新、3分ごとのフル更新など。
6. /izakanpai/docs/yuwaku/{admin.html,kds.html} および docs/yuwaku/test/ 同名ファイルにも類似の更新経路が存在。ネイティブとの差分に注意し、**一律コピーしない**。
7. 既存索引候補：migrations/0001_init.sql の idx_orders_store_status(store_id,status)、idx_order_items_order(order_id)、migrations/0026_store_id_child_isolation.sql の idx_order_items_store_order(store_id,order_id)。**migrationソースの存在だけで本番DB適用済みと断定しない**。実行計画・実DBの索引を別途照合する。
8. 該当JOINの現行形は2026-10-03の履歴に存在。翌日以降も常時大量消費したと仮定せず、10/12の実行頻度/アクティブ注文状態/データ分布との組み合わせを確認する。

主因：SQLの結合順/条件/実行計画によってactive注文少数の取得に大量の行読み取りが発生。誘発・増幅要因：ポーリングと差分API非対応、およびQA・複数端末からの呼び出しの可能性。

## 3. P0：即時の保護・他サイト連絡（本番変更は要承認）

- 当日上限超過中に本番D1に対して繰り返しSELECT/COUNT/EXPLAIN等を実行しない。消費量確認は、できる限りCloudflare GraphQL Analytics / D1 SQL Insights / Workers analyticsで行う。
- KuraPinas本番、PitaYasu等の同一アカウント利用サービスの担当へ「共有D1無料枠超過・読み取り不可の可能性」を連絡し、復旧確認は**アカウント全体と利用者導線**で行う。異常画面をフロント側のキャッシュで隠して正常と誤認しない。
- QA3レーン担当と調整して、本番の共有D1へ負荷をかける繰り返し操作、負荷試験、秒単位の自動巡回を保留し、該当QAはBLOCKEDとして記録。**既存の正式QA結果・PASS/FAIL・証拠は保全**し、別レーンのrunner・claimに触れない。ローカル/mock/offline等、D1消費しない検証は継続可能。
- 既に確定済みの操作を失わせないこと。D1エラー時の注文/会計/勤怠等は確定か未確定か不明な状態での自動再送を禁止し、冪等キーで状態照会・再調停する。店舗外の個人情報、金額、他店舗データをエラー応答に出さない。
- 有料化（月額最低料金の選択を含む）、他Cloudflareアカウントへの移管、設定変更や本番への一時的機能停止を勝手に行わない。選択肢・影響・見積りを提示して承認を受ける。

## 4. 必須の根本修正要件

### A. SQLをアクティブ注文IDの限定検索へ変更

- getActiveOrders()で認証済みstoreIdのactive ordersを取得済みなので、そのIDに限定してorder_itemsを読み取る方式を第一候補にする。たとえば order_items.store_id=? AND order_id IN (?,...) をバインドパラメータで実行し、(store_id,order_id)索引を使用する。
- 0件なら明細SQLを発行しない（既存動作維持）。大量のアクティブ注文IDがある場合はバインド数を上限以内の固定チャンクに分割し、結果を統合。全件を無言でLIMIT切り捨てしない。
- itemの順番・名前・数量・税額に関係する値・注文の表示順・ローカライズ・滞留判定・デモ識別など既存レスポンスを互換維持。
- store_idはDB検索とAPI認証の両方で必ず適用する。他店舗のorder_idを入力しても参照できないことを実テスト。手作業でSQL文字列にユーザー入力を埋め込まない。
- EXPLAIN QUERY PLANで結合順と索引を確認し、同じ分布・データ量で変更前後のD1 meta.rows_read / Insightsを測定する。索引を追加する場合は既存索引・移行履歴と重複しないか確認し、migration適用はユーザー許可待ち。

### B. 差分取得・ポーリングの見直し

- gasApi.js の getOperationsDelta が sinceVersion を無視して version:0/unchanged:false を返す不整合を修正候補として検討。**単純にunchanged:true固定にしない**。注文・注文商品・状態・スタッフ呼出・卓人数・権限・店舗データの変更が漏れない版管理／安全な差分判定、再接続時のフル同期手段、キャッシュのstoreId+適切な利用者権限単位の隔離を実装して検証する。
- 更新間隔は店舗運用上の応答要件と読み取り行数を計測して決定。設定10/30/60秒が実際は8秒になる挙動を説明・改善し、必要な厨房通知のリアルタイム性は維持。単純な60秒化だけを根本解決としない。
- 可視/非可視・スリープ/復帰・オフライン・複数タブ・複数端末・APIリトライ・画面遷移・通信復帰・タイマー重複を点検。並列重複・過剰再試行を防止し、D1 quotaエラー時は指数バックオフと上限・ジッター等で負荷を増幅しない。
- 8秒poll、3秒印刷ポーリング、3分フル更新を含む全周期処理について「1端末×1日・N端末×1日」で最悪利用量を試算する。

### C. テナント安全性・整合性の不変条件

- 以前のstore_id分離事故を再発させない。API/bodyのstoreIdで認可しない。認証由来のstoreId+DBでのstore_id条件+必要な親子一致を維持。
- mock/単体/DB統合テストで他店舗の履歴、アクティブ注文、同一order_id衝突、空店舗、削除済み/会計済み注文、並行更新、再ログイン、言語切替、オフライン復旧を検証。
- 操作未確定時の重複注文・二重会計・二重印刷・別店舗情報混入なし。レスポンス形式/権限/日本語英語画面も回帰確認。

## 5. **横展開：同一アカウント全DB + 全アプリ + 全Worker（5巡）**

Cloudflareアカウント全体のD1使用量が共有のため、単一店舗の修正で完了にしてはいけない。2026-10-12時点のwrangler d1 list対象（計7DB）：

1. izakanpai-yuwaku — /izakanpai、店舗API、最大消費源
2. izakanpai-teat — /izakanpai、店舗API、高頻度pollの一般化
3. izakanpai-platform — /izakanpai、ハイブリッドルーター／プラットフォーム
4. izakanpai-control — /izakanpai、15分cronと店舗配信
5. kurasias-db — /kurapinas、KuraPinas本番
6. kurasias-staging-db — /kurapinas、KuraPinas staging
7. pitayasu-analytics — PitaYasu、分析DB（所有repo・Workerは確認して追記）

**1巡目／利用経路棚卸し：** 全D1バインディング、Workers、Cron、Queues、API、管理画面、サイト、アプリ、テストランナー、バックグラウンド更新、定期取得、外部Bot、監視を一覧化。DB名称だけでなくCloudflareアカウントIDと同居を突合。全7DBの現時点のsource ownerを特定する。

**2巡目／SQL効率：** 全SELECT/JOIN/COUNT/ORDER BY/GROUP BY/サブクエリのうち定期実行・高頻度・高行数のものを優先し、実行回数×平均rowsRead×最大並列数で評価。索引があっても実際に使われていなければNG。KuraPinasのfeed_items多数ID参照/ニュース取得/日本語翻訳の各バックグラウンド処理、izakanpai印刷/認証/注文、PitaYasu分析、制御cronを含める。

**3巡目／負荷増幅：** 全アプリのタイマー、非表示時挙動、再描画、キュー再試行、ユーザー連打、失敗時の無限リトライ、端末ごとの増倍率、QA同時稼働を精査。過剰なSQL/リトライはバックエンドとクライアントの両側で抑止。

**4巡目／安全性：** store_id認証・一貫性、情報漏えい、キャッシュのテナント間汚染、書き込み冪等性・権限、staging→productionの混線、ネットワーク異常時の再送による二重実行を検証。

**5巡目／実運用：** 本番に負荷を与えない段階的カナリアと監視、各サイトの正常導線、代表シナリオ、DB別rowsRead・アカウント合計、異常時のフェイルセーフ、監査の見落としを再点検。巡ごとに対象ファイル/SQL/証拠/結果/残リスクを記録し、未確認はPASS扱いしない。

### アカウント分離という構造対策

無料枠はDB別ではなく**アカウント全体で共有**される。別DB化だけではKuraPinas等への巻き添えを防げない。QA／負荷試験を**別Cloudflareアカウント**へ移す案、さらに事業サイトの本番を別アカウントへ隔離する案を比較資料にまとめること。費用、Workers routes、カスタムドメイン・DNS、シークレット、D1/R2、Cron、リリース、監視、復旧手順を示し、承認なしで移管しない。

## 6. 可観測性・予算・自動ガード

- CloudflareのGraphQL AnalyticsでUTC日付ごとのアカウント合計・DB別 rowsRead と readQueries を集計。D1 SQL InsightsでSQL指紋別の totalRowsRead / avgRowsRead / count を記録（サンプル・集計窓・遅延に留意）。
- 監視はD1へのSQLを必要としない外部系統で実行し、障害時にも見ることができる構成にする。
- 原則、無料枠の **60%（3,000,000/日）を事前調査の予算線、80%（4,000,000/日）を警告、90%（4,500,000/日）を重大警告**とし、全DBの合計で判定。予算線と通知条件はユーザーが承認する。
- 昨日比/7日中央値比の増倍率（例：3倍/10倍）、SQL単体で1実行あたり高額な読み取り行数、高頻度poll、同一店舗・同一端末からの異常増加もアラート条件にする。障害当日のInsights値だけに依存しない。
- quotaエラーを指数バックオフで抑えることと、業務上必要な注文通知・認証/会計の正確性を両立させる。アラート発生を理由に**黙って会計確定する/結果を捏造する**実装は厳禁。
- 日次レポートにDB別内訳、SQLトップ10、利用量予測、原因判定、対応者・時間を記録。通知失敗時の二次チャネルも用意。

## 7. 実装前後の必須検証・合格条件

1. **再現**：DB mock/ローカルSQLiteに同一店舗の会計済み履歴1万注文以上、その明細3万行以上、アクティブ3注文/明細10行程度、別店舗データを投入。変更前の該当JOINの実行計画と読み取り行数を測定（本番DBには大量シードしない）。
2. **SQL改善**：同一データセットで変更後の本SQLが適切な索引検索になり、rowsRead **変更前比98%以上削減**を目標。アクティブ3注文/10明細規模では **1呼び出し100 rowsRead以内を推奨合格目標**とし、基準未達なら実行計画を示し再設計。異なるエンジンのEXPLAIN結果だけでD1 rowsRead改善を証明したことにしない。
3. **データ一致**：変更前後で注文ID、状態、商品順、数量、価格、名前翻訳、滞留表示、空注文が完全一致。会計・取消後に古い注文が現れない。
4. **負荷**：1端末/複数端末・admin/KDS・画面復帰・ネット断・APIエラー・ポーリング重複を計測し、1リクエスト/1時間/24時間のrowsRead予測を提出。1DBだけではなく全7DBの消費を積算し、24時間想定が5,000,000/日未満かつ安全余裕があること。
5. **アプリ横断**：Android実機/Emulator/iPhoneの正式QA状態を維持。ネイティブ、docs/yuwaku、docs/yuwaku/testの機能差を実画面で確認。店舗/言語/通信/注文/KDS/印刷/会計とKuraPinasトップ・コラム・ニュース取得、PitaYasu主要導線を検証。
6. **独立サービス**：KuraPinasやPitaYasuの回帰は、izakanpaiだけのPASSで代用しない。各Worker/D1への影響を個別に証明する。
7. **復旧確認**：UTCリセット後に各本番サイトの正常な利用者フローを確認し、D1 readRowsの増分が修正後の想定値であることを監視。**確認のための高頻度本番SQL実行は禁止**。
8. **横展開5巡記録**：ファイル/サービス/SQL・異常有無・修正・単体試験・統合試験・根拠リンク・責任者・残件が埋まっていること。未確認項目は必ず未確認と記録する。
9. **リリースゲート**：影響範囲・diff・テスト・DB migrationの要否・予測Rows Read・rollback案・別サイト担当との調整結果を提示。ユーザーの許可後、承認された範囲でのみcommit/push/deployを実施する。

## 8. 納品物（実装担当が作成すること）

- RCA（障害概要、時系列、何が急増したか、寄与SQL/端末/APIの証拠、5 Whys、確定事項と推定事項の区別）
- Before/After実行計画、読み取り行数、SQL指紋、同一テストデータでの比較表、実行数・端末数・最悪時24h予測
- SQL/バックエンド/フロント/各ホストコピーの差分、追加/変更テストと全結果
- 7 DB・全Worker/アプリの横展開5巡チェック表、他サイトの本番影響と復旧判定
- 負荷監視/予算・通知設計、QA環境と本番Cloudflareアカウント分離の比較案
- リリース/rollback手順、承認待ち事項、残余リスク一覧

## 9. 作業の制約

- 同時並行の正式QA実行・run owner / runner / PASS・FAIL・証拠は変更しない。修正担当はテスト端末を奪取しない。
- 既存マイグレーション・DB・ログ・バックアップ・実績データは削除しない。
- 本番データや認証トークンを資料へ転載しない。個人情報は匿名化。
- 作業途中の局所修正だけで「完了」としない。**izakanpaiの1SQL、全画面・全プラットフォーム、KuraPinasなど別サイト、Cloudflareアカウント全体**を別々に確認する。
- この依頼書の保存に伴うコード編集は行わず、ユーザーにレビュー可能な修正・検証一式を提示してからcommit/push/deploy可否を確認する。
