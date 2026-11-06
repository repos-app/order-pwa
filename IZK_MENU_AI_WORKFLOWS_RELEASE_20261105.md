# izakanpai AIメニュー解析 — Cloudflare Workflows移行記録

2026-11-05 23:40 PHT

## ユーザーが承認した方式

iPhoneはPDFをページごとに送信してジョブを開始する。送信後は最新のジョブ状態を読み取り表示するだけ。AI実行・ページ単位のチェックポイント・再試行・課金処理・登録処理は全てサーバー上のCloudflare Workflowsが管理する。端末が閉じても解析は継続する。

## 既存資産の再利用

- 非公開の共通Worker izakanpai-common-gateway。店舗別Workerは復活させない。
- 各店舗の既存物理D1/R2、既存AI推論器・公開プロンプト・ポイント課金/返金/冪等機構・既存商品登録処理。
- iPhoneの既存PDF.jsレンダリング、画像圧縮、領域拡大画像、選択可能PDFテキスト。
- iPhoneは保存済みジョブIDで10秒おきに状態を照会。WebView再起動時も同じジョブを再取得。旧クライアント直接AI呼び出し復旧UIは新規取り込み時に使用しない。

## 具体的なソース

- src/menuAiWorkflow.js — Cloudflare Workflows実行クラス、ページごとの永続ステップと最後の登録確定。
- src/menuAiJobService.js — 物理テナント隔離、R2非公開入力、アップロード冪等性、店舗D1進捗・課金結果検証、商品下書き、最終コミット。
- migrations/0053_ai_menu_workflows.sql — ジョブ／ページ別D1テーブル。
- scripts/generate-common-gateway-production-config.mjs — 共通WorkerのWorkflow binding再生成。
- mobile-app/web/menu-ai-import.js — 受付後は読取り専用ポーリング。
- src/tenantProvisioningMigrations.generated.js — 新店舗の物理D1にも同じジョブスキーマを展開。

## 証拠と状態

- GitHub main: ff20a73 (push済み)。
- 共通Worker: 534f700a-c140-4c2d-91ac-01508b42b061 (100%本番稼働)。
- Cloudflare Workflows: izakanpai-menu-ai-workflow、共通WorkerのMenuAiWorkflowとして本番登録。
- 現在の共通Workerで物理D1/R2バインドされる13店舗すべてに、追加ジョブテーブル2つをCREATE-onlyで反映し、全13/13でスキーマを本番読み戻しPASS。既存メニューやAIポイント残高は変更していない。
- ブラウザ: 6/6 PASS。5ページ受付、再起動中断、送信再開、開始応答消失、成功/失敗表示、端末ストレージ不可時の課金前停止を検証。直接AI推論・商品登録API呼出ゼロ。
- サーバー: 7/7 PASS。実際の既存二段OCR解析器とSQLite、店舗別SQLガード、再試行時の二重課金防止、5ページを途中再開して5成功ポイントと1回の商品登録確定、Cloudflare Workflows異常終端をD1に反映する処理を検証。
- 既存のAI/テナント/アプリ回帰: 85/85 PASS。共通Workerソースゲート21/21 PASS、共有ゲートウェイローカル251チェックPASS。
- Cloudflare本番Workflowsで、teatの存在しない検証ジョブを起動。状態はcomplete、出力はrejected。店舗D1該当ジョブ件数0をreadbackで確認、メニュー・クレジット書込みなし。
- 本番公開APIの読取り: yuwakubar 4/4 PASS。teat 3/4 PASS (bootstrapのみ20秒タイムアウト。その他3経路はHTTP 200)。teatの全4件をPASSとは報告しない。

## 未証明（正式QA残件）

実機iPhoneで同じPDFをアップロードし、Cloudflare Workflowsが実AIを5ページ55商品に対して完走し、ポイント5・商品重複0・iPhoneスリープを挟んでの自動復帰を全て正式証拠で確認する作業は未実施。ローカルPASSおよび本番Workflows起動確認を実機正式QAのPASSと混同しない。iPhoneからの画像入力同一性の評価は既存のIPPhone parity policyに従う。
