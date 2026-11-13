# AIメニュー取込：Workflow正常完了なのにiPhoneに実行失敗と表示（2026-11-07）

## 実際の事象・照合

- 報告: iPhoneのYuwaku Bar Owner、`Final menue.pdf`、`2/2ページ完了` と `サーバーで実行に失敗しました` が同時表示。AI残高53。
- 物理DB `izakanpai-yuwakubar` の最新ジョブ `scan-122eab97-d0a8-448e-a45d-abf1b514f709`: 2026-11-07 07:30:14–07:30:29 UTC、`state=completed`、認識27、販売登録0、仮登録0、重複27、error_code空。2ページともstate=completed、item_count=20/7、retry_count=0。
- Cloudflare `izakanpai-menu-ai-workflow` 同一インスタンス: `success=true`、`error=null`、07:30:29.861Z終了、出力 `status=complete`、5ステップ全成功。ページOCRは両方 `cached=true`、登録後の公開も正常完了。
- 物理DBのwalletはpaid_balance=53、updated_at=07:20:25Z。直近のcredit reservationも07:19–07:20で、07:30ジョブでは新たな推論課金は発生していない。
- 結論: このジョブでAIモデルの障害やDBへの登録失敗は起きていない。誤ったステータス通知/クライアントの固定が原因と整合する。画面表示がどの秒に更新されたかの端末ログ自体は取得できていないため、発生瞬間のrace再現を実機で証明したものではない。

## 直接的な欠陥と修正

1. `src/menuAiJobService.js` の `jobStatus()` がCloudflare Workflowの`complete`（正常終了）を`errored`/`terminated`と同列に扱い、D1の失敗更新を実行していた。しかも`UPDATE ... WHERE state NOT IN ('completed','failed')`の更新件数が0でも、返却するローカル `job.state` を無条件で `failed` に書き換えていた。最終D1が`completed`のままでもAPIだけ`menu_ai_execution_failed`を返せる構造だった。
2. 今後はruntime `errored`/`terminated`または`complete`かつ出力が明確に`failed`/`rejected`の場合だけfatal reconciliationを行う。条件付きUPDATEが0件の場合はDBの確定記録を読戻し、存在しない失敗を返さない。
3. `mobile-app/web/menu-ai-import.js`はterminal状態の不一致をすべて拒否していたため、誤報がlocalStorageに保存されると、サーバーが`completed`を返した後も失敗表示を固定した。`failed → completed`のみ、同じjob IDのサーバー完了記録を優先して表示・永続状態を訂正する。`completed → failed`やterminal→runningは従来どおり拒否する。
4. `test/menu_ai_provisional_lifecycle_test.mjs`に現在のAIメニューD1マイグレーション依存（0048–0053・0056）を追加し、旧fixtureが存在しない `ai_review_reasons_json` を参照することによる無関係なテスト失敗を解消。

## 再発防止テストとレビュー

- backend: 正常Workflow `complete`とまだqueuedに見えるDB、runtimeエラーと古いDB読取、明確な`rejected`出力の3つの負例を追加。既存の実runPage/idempotent課金/tenant SQL guardと同時実行して26 PASS、0 FAIL、実Gemmaを使用するlive試験は1 SKIP。
- browser: `2/2`かつ`menu_ai_execution_failed`から同一ジョブの`completed/27件`で回復し、localStorage、画面、reload、再課金/二重開始防止を確認。既存の永続失敗、0/2 timeout、通信断、二言語、ヘッダー維持を回帰。
- 5系統の統合回帰（backend / import browser / bilingual browser / PDF UI / draft lifecycle）: **41件中40 PASS、0 FAIL、1 SKIP、exit 0**。SKIPは実Cloudflare Gemma呼出し（未実行）。共通UI保護ゲートもPASS、`git diff --check`エラー0。
- 独立コードレビュー観点（対象を確認済み）: S01 Workflow成功/失敗分岐、S02 SQL CAS更新件数、S03 D1読取遅延、S04 `rejected`異常終了、S05 runtime `errored`、S06 tenant/owner UID scope、S07 AI credit重複課金、S08 page完了と商品登録の分離、S09 localStorage terminal復帰、S10端末再読み込み。
- 横展開コード確認観点: H01 `gasApi` RPCの共有経路、H02 Cloudflare実インスタンス、H03本番物理D1ジョブ、H04本番credit wallet、H05 Web/Native import配置、H06既存menu-ai browser fixture、H07 Provisional D1 migration、H08日英表示、H09先行済み結果のcache、H10共通UI保持ゲート。これはソース/実DB/ブラウザーの調査であり、正式OS QA PASSを意味しない。

## 未実施・条件

- 現時点では修正したソースとローカル自動テストまで。**Git commit/push・本番Worker反映・新しいiOS署名ビルド・TestFlight配布・修正版iPhone実機QAは別段階**。正式QA判定増分0。
- 既に誤失敗がiPhoneのlocalStorageに保存された場合、古いネイティブ同梱JSでは正しい`completed`を受けても過去の表示を維持しうる。修正版JSは次回の承認済みiOSビルドで適用される（新規ビルドの自動起動は禁止）。
- 同一PDFの成功した27件は既登録で重複。再登録を繰り返したり、今回の調査を理由にポイント返金したりする必要はない。
