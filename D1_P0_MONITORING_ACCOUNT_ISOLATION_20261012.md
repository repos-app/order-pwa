# P0 D1｜アカウント横断事故の監視と環境分離案（2026-10-12）

## 概要と実装範囲

障害原本 `docs/D1_ROWS_READ_P0_INCIDENT_HANDOFF_20261012.md` を全文確認済み。2026-10-12のD1読み取り上限超過は同一Cloudflareアカウントにある本番サイトも停止させた。監視は**D1へのSQLを一切発行しない**独立経路が必要。

- 実装：`scripts/d1-p0-monitor.mjs`（Node.js、依存ゼロ）。Cloudflare GraphQL `d1AnalyticsAdaptiveGroups` の**読み取り済みレスポンス**を検査・集計するオフライン監視モジュール。GraphQL query文字列は公開しているが、自動通信、API認証情報の読み込み、cron、通知、書き込み、副作用はない。
- 入力：JSON `{ "graphql": <Cloudflare GraphQL response>, "databaseIds": { "izakanpai-yuwaku": "<databaseId>", ... }, "insights": [...] }`。databaseIdsは**全7DBの実ID**を指定する。結果のdb名は固定名称へマップし、生IDやSQL本文は出力しない。SQL insightsは指紋・数値だけの任意オフライン入力。受領した指紋はSHA-256の短縮値として表示し、原文はレポートから除外する。
- 使用（**ローカルmock・手元の匿名化済みfixtureのみ**）：`node scripts/d1-p0-monitor.mjs --fixture local-mock.json --day 2026-10-12`。CLIはlive APIを呼ばない。認証情報を含むファイルをGitに追加しないこと。
- SQL top 10 は GraphQLから別途取得・匿名化したSQL Insightsメトリクスを渡した場合だけ集計。未入力は空であり、SQLが存在しないという意味ではない。GraphQL SQL Insights adapterの具体フィールドは本番スキーマ照合・別レビュー待ち。

## 判定方法

CloudflareのUTC日付単位で`rowsRead`/`readQueries`をdatabaseId別集計。7DBは `izakanpai-yuwaku`、`izakanpai-teat`、`izakanpai-platform`、`izakanpai-control`、`kurasias-db`、`kurasias-staging-db`、`pitayasu-analytics`。**しきい値は7DBの合計相当となるアカウントで観測した全DBの合計**で判定する。未知IDも合計に計上し、未知DB数を出す。1DBやグループの欠落は0として確定せず`UNVERIFIED`とする。GraphQL `limit:10000`に達した場合は不完全として失敗する。

| UTC当日合算 rowsRead | レベル | 対応案（未自動化） |
|---:|---|---|
| 3,000,000（60%） | INVESTIGATE | 原因調査・負荷抑制案を検討 |
| 4,000,000（80%） | WARNING | 早期警告、SQL Insightsを再確認 |
| 4,500,000（90%） | CRITICAL | 即時エスカレーション、QA/ポーリング停止検討 |
| 5,000,000 | LIMIT_EXCEEDED | 業務影響判断、復旧と隔離案へ |

昨日比3倍、過去7日利用可能サンプルの中央値比10倍、SQL平均10,000 rowsRead/実行以上を異常フラグ化。SQL insightsはSQLフィンガープリント、実行数、合計/平均 rowsRead のみを受け付ける。過去7日のデータが足りない場合の比率は算出できない場合があり、historyDaysを表示する。昨日が0なら比率はnullとし、無限大を捏造しない。UTC当日だけ現在経過割合から単純予測（直近増加が急な場合は大幅に外れる）。同じ帳票に「監視取得時刻、担当者、観測窓、予測誤差」を運用側で記録する。

## 運用上の未承認事項

外部監視ランナーを独立環境で実行し、保管されたAPIトークンでCloudflare GraphQL Analytics APIを**読み取り専用**照会する設計とする。GraphQLはD1にSQLを発行しない。取得トークンに必要な最低権限とdataset/schemaをCloudflareの実アカウントで確認する。機密値は環境変数または秘密管理へ置き、標準出力・ログ・Gitから除外。シークレットを含むHTTPエラーやGraphQL本文はダンプしない。メトリクスの反映遅延・直近31日保持・カウント方式・監視失敗自体を別途監視。GraphQLのaccountTagと実データベースIDが同一アカウントか現物照合する。

推奨監視時刻例：10〜15分間隔のUTC日中、およびUTC 00:00前後の境界確認。スケジューラ、送信先、通知/二次通知、発報抑止、担当・運用当番は利用者承認後に実装する。リトライは有限かつ指数バックオフ、失敗時は「監視データ欠落」を表明。QA対象の本番D1で追加SQLを実行して調査しない。アプリ・DB全体のデータ同期、会計の未確定状態は監視用警報だけで勝手に変更しない。

## アカウント分離と料金の比較

| 案 | 月額の目安 | 本番巻き添えリスク | 負担 |
|---|---|---|---|
| 既存単一Freeアカウント＋SQL改善 | $0 | 同アカウントのQA/他サービスで5M/UTC日の共有枠を消費、再発時横断停止 | 最も簡単だが構造的隔離なし |
| QAを別Freeアカウントへ | 両方Freeなら$0 | QA由来の本番巻き添えを隔離。ただし本番サービス相互の共有枠は残る | QA用Worker、D1、DNS/route、Secrets、Cron、Queue/R2設定と実データ分離が必要 |
| 本番をWorkers Paidへ | **最低$5/月／アカウント**＋超過従量料金 | Freeの5M/日遮断リスクは低減。ただし悪いSQL、請求急増、同居依存は残る | 請求監視、月間quota/コスト評価 |
| QA別アカウント＋各本番サービス別アカウント | Freeならアカウント毎$0、Paidなら原則アカウント毎最低$5/月 | 障害影響をサービス単位に分割可能 | 移管・運用負担が最大。DNS/ルート、カスタムドメイン、シークレット、R2、Cron、DBバックアップ、展開手順が個別に必要 |

公式仕様（2026-10-12閲覧）: Workers FreeはD1 **5M rows read/UTC日**、Paidは**月25B rows read込み、その後100万行につき$0.001**。D1 rows writtenはFree 100K/日、Paidは月50M込み・その後100万行$1。Paid最低額はWorkersプランとして**$5/月/アカウント**。追加のWorkersリクエスト/CPU/ストレージ等の料金、税額、移管費用は別途。7DBの現在料金・実アカウントのプラン、複数アカウント移動の可否は未照合。

公式根拠：
- https://developers.cloudflare.com/d1/observability/metrics-analytics/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/platform/pricing/

## 分離案のリリースゲート

実アカウントのD1 DB ID・Workersバインディング・ルート・ドメイン・Secrets・Cron/Queues・R2・バックアップを読取監査して移管マップを作成する。QA側への本番データ無断複製を禁止し匿名fixtureで再現する。アカウント間の外部依存、CORS、OAuth、APIキー、公開URL、環境変数、Cloudflare DNS/SSL、ドメイン所有を確認。サービス単位のロールバック手順と旧経路の停止手順、影響時間帯、切り戻し判断基準を作成する。移行後に利用者画面・管理画面・D1 GraphQL使用量（全DB）・書込整合・最小権限・請求を検証。**現時点では移管/有料化/本番変更を行っていない。**

## 検証と限界

`node --test test/d1-p0-monitor.test.mjs` で、3M/4M/4.5M/5M境界、7DB合算、未知DB、履歴急増、SQL高コスト、エラー時停止、秘密出力抑止をモック検証する。GraphQL実レスポンス・本番SQL insights・DB実ID・実際のGraphQL権限・通知・集計遅延は**未検証**である。監視器の完成はP0のSQL根本修正、5巡監査、QA復旧・本番正常性を代替しない。
