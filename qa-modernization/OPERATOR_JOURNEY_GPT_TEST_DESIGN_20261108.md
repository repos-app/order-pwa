# 店舗運営目線の横断業務テスト — GPTケース設計 / 自動Oracle

2026-11-08 | SOURCE / local regression only. Formal Android/iOS QA PASS増分: **0**。

## 原因と改善対象

発注の「記録」「発注依頼」はそれぞれ正常でも、記録→送信→同内容再発注を続けると、再試行と別発注の意図が区別されず1件に潰れる可能性があった。単体RPC成功ではなく、**業務イベントの意味と一連の操作結果**を検証する必要がある。

## 既存基盤の再利用と今回の追加

1. scripts/qa-modernization/business-journey-oracle.mjs：NEW/RETRY/FOLLOW_UP/REPEAT_NEW/REJECTED の共通Oracle。独立DBからのID/件数、外部送信実績、DB/画面状態、フィードバックを照合。
2. scripts/qa-modernization/business-journey-review.mjs：変更ソースを5つの業務ワークフローへ関連付け、10観点ごとにGPTレビュー用候補を作成。未対応ソースは unmappedFiles に明示。
3. test/auto-ci/business-journey-oracle.test.mjs：共通Oracleに10種の異常（別件ID使い回し、二重副作用、表示だけ成功、欠落証拠等）を注入し、確実にFAIL判定することを検証。
4. test/auto-ci/purchase-order-delivery-status.test.mjs：実装のDB保存・送信処理と実画面履歴描画関数を連続実行し、共通Oracleで検証。外部メールは隔離したテスト用の疑似送信サービス。
5. 既存S4 S4-PO-REPLAY-017：Gateway/RPC/独立SQL/cleanupを再利用し、同一キー再試行の重複なしと、同内容・新キーによる別件発注を検証。S4の47ケース総数は維持。

## GPTの標準ケース作成フロー

ソース変更時の候補取得コマンド：

    node scripts/qa-modernization/business-journey-review.mjs --changed
    node scripts/qa-modernization/business-journey-review.mjs --files=src/purchaseOrders.js
    node scripts/qa-modernization/business-journey-review.mjs --all

GPTは出力された候補について次を実施する。

1. 変更された機能と周辺UI/API/DB、既存S4/auto-ci/正式QAケースを読む。既存テストと共通ランナーを最大限再利用する。
2. 店舗スタッフの業務目的を起点に、複数操作（同内容の新規/再試行、保存→送信、失敗→回復、画面戻り→履歴、別店舗）を組み合わせた具体的な期待条件を考える。
3. 期待条件には「DBで残るべき件数・ID・状態」「表示すべき説明」「副作用が実際に発生したか」「他の業務台帳への影響」を明示する。
4. 高速で確定できるUI/API/SQLite契約は既存auto-ci、より広い実Gateway・独立SQLは既存S4、実機が必要な確認のみ公式OS別QAに割り付ける。
5. 過去不具合型の変異を加え、修正前の挙動を再現した場合に検査が実際にNGを出せるか確認する。正常ケースが全件緑でも、変異を見逃すOracleは採用しない。
6. 生成候補数、実装ケース数、ローカル検証PASS、正式QA PASSを別集計する。候補は正式PASSではない。

共通10観点：

retry / follow_up / repeat / failure / readback / other_store /
operator_meaning / offline / localization / downstream

## 横展開対象

| 業務 | 連続操作の例 | 独立照合 |
| --- | --- | --- |
| 発注 | 記録→送信→同内容で再発注 | 履歴2件、新ID、送信実績と表示 |
| 入荷 | 入荷→タイムアウト→再試行→同内容の別便 | 在庫数量、入荷履歴、冪等キー |
| 会計 | 決済→再試行→別レシート→返金 | レシート・売上・返金台帳 |
| AIクレジット | 画像生成→失敗→再試行→成功 | 残高と請求・利用台帳 |
| カテゴリ | 並び替え→保存→名称変更/統合→再表示 | メニュー順、DB、日英表示 |

5業務×10観点で **レビュー候補50件**。これは50件の自動実行や50 PASSを意味しない。GPTが実装可能性・重要度・既存カバー状況を確認し、該当するケースだけ自動テスト化する。

## 実行・制約

- 共通Oracle/発注のローカル実装テスト：15/15 PASS。10種類の故障注入をそれぞれ検知。
- S4の実Gateway・独立DB/cleanup：S4-PO-REPLAY-017 と S4-INV-RECEIVE-014 は各1ケースPASS（2/2）。最初のPO S4証拠検査はイベント増加に対して旧期待4件でFAIL、その後独立証拠オラクルの期待を修正し、再実行でPASS。
- リモートWorker・本番D1・Android/iPhone実機・正式OS別QA・commit/pushは未実施。
- Oracleは決定的な整合性テストであり、GPTの運用的違和感の探索そのものを代行するわけではない。GPTの候補作成・ソースレビューと、実行可能な検証・故障注入をセットにする。
