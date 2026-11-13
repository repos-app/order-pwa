# 会計伝票単位の担当割当と後追い歩合（2026-11-08）

## 完了条件と業務仕様

- 商品明細ではなく、会計伝票（receipt_no）ごとにスタッフを複数選択できる。
- 担当未割当でも通常会計・分割会計を停止しない。SCは従業員マスタの対象者へ会計時に独立して分配する。
- 会計トランザクション内で、各商品の歩合ルール・単価・数量・歩合額・通貨小数桁を記録する。後から担当を登録しても当時の金額で均等配分する。
- 未割当伝票は月をまたいでも一覧表示。割当済み伝票は表示月で確認・変更できる。商品名・個数・合計・予定歩合を併記。
- 担当登録と報酬計上は、バージョン照合・返金状態・商品歩合支払済みチェックを伴う同一DBバッチで確定。
- 同一担当への重複登録は二重計上しない。支払済みは再配分を拒否。返金済みは一覧除外・再割当不可。店舗跨ぎと退職者も拒否。
- 後追い商品歩合の報酬月は担当を入力した月でなく、元の会計月とする。
- 旧明細担当RPCは receipt_scope_required を返して書き込み不可。

## 主なソース

- migrations/0059_commission_receipt_assignment.sql（DB台帳・ガード・索引）
- src/commission.js、src/billing.js、src/gasApi.js（APIと会計処理）
- mobile-app/web/commission.html、commission-app.js（担当割当画面）
- src/tenantDb.js、src/tenantD1SchemaContract.js、src/tenantProvisioningMigrations.generated.js、src/backup.js、src/dataAdmin.js、src/accountDeletion.js（共通DB管理）
- 従来の古い決済済伝票には会計時ルールsnapshotがないため、推測で遡及歩合を作成しない。新方式の会計処理を経た伝票のみ後追い割当対象。

## ローカル検証結果

- GAS互換会計・報酬・返金 E2E：572 / 572 PASS。
- 日英の商品オプション価格と後追い歩合：46 / 46 PASS。
- 商品歩合・SC自動テスト：13 / 13 PASS。
- D1 schema契約、raw SQL監査、過去注文分離、バックアップ/CSV、アカウント削除：PASS。
- 正式実機QAの本件追加判定：0件。ローカル結果は正式QAに算入しない。

## リリース条件（未実施）

1. 全対象店舗の物理D1へ0058→0059順に適用し、スキーマ契約で読み戻し。Workerを先に更新するとテーブル欠落で会計失敗するため順序厳守。
2. Worker更新、WebとAndroid/iOS配布面を更新（旧アプリは旧明細担当UIのため更新が必要）。
3. teat・yuwakuで、未割当会計、後追い割当、SC、返金、分割会計、JPY/PHP、日英切替を実機・実DB証拠で正式QA。

この作業ではコミット/プッシュ、実D1適用、Workerデプロイ、アプリ配布、正式実機QAは行っていない。
