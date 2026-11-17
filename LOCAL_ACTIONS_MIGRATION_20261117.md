# Izakanpai: COSオンデマンドQA運用（2026-11-17更新）

## 目的

GitHub Actionsを非リリース用途には使わず、COSが依頼されたコミット・
Push・デプロイ作業の中で既存のQA処理を呼び出す。
Windows定期タスクによる5分・30分・日次・週次のポーリングは行わない。

## 既存処理の呼び出し方

最初にCOSが許可された範囲のコミット・Pushを完了させる。
Push済みHEADがorigin/mainに一致することをバッチ側でも確認する。
コミットされていない別作業者のファイルは実行の対象に含めず、
既存ランナーが別worktreeでテストする。

| 実行タイミング | COSから実行するコマンド | 内容 |
| --- | --- | --- |
| Push成功後 | `scripts\operations\run-local-qa.bat push` | 変更影響のUI/API・Chromium・S4業務テスト |
| Worker/DB反映成功後 | `scripts\operations\run-local-qa.bat rpc` | 本番RPCのread-only整合性照合 |
| 業務QAの全ケースを要求されたとき | `scripts\operations\run-local-qa.bat business` | 既存S4テスト（実行日が日曜の場合はmutation付き） |
| 全体回帰を要求されたとき | `scripts\operations\run-local-qa.bat full` | npmの全体テストと既存リリースS4 |
| 実行計画のみ | `scripts\operations\run-local-qa.bat plan` | 外部変更なしの実行内容確認 |
| フロントエンド本番デプロイ成功後 | `deploy_frontend.bat` から既存通知処理 | reviewedな日英更新通知をD1へ公開 |

`push` は同じHEADですでにPASSなら再実行を省略する。
前回FAILなら同じHEADでも再実行する。明示再実行には
`scripts\operations\run-local-qa.bat push --force` を使う。

手動の `business` / `full` と通常の `rpc` は呼ばれた時だけ実行する。
QA中の個別FAILは履歴に残し、独立ステップは続行する。
どれかが失敗すればバッチ終了コードは非0となる。

## 結果の参照

既存の `test-results/local-actions/state/*.json`、
`test-results/local-actions/history.ndjson`、
`test-results/local-actions/logs/*.log`、
`test-results/local-actions/evidence/*` を再利用する。
これらはローカル自動テストの証跡であり、実機正式QA PASSではない。

## 変更しない事項

GitHubの非リリース自動ワークフロー5件は無効化したまま。
手動のストア/TestFlight関連ワークフローは維持するが、
iOS/Androidビルド・配布の実行を許可したことにはならない。
通知は**Push時ではなくデプロイ成功後**の既存経路で扱い、
公開未確認の場合は成功と報告しない。

Windows定期タスク4件
`Izakanpai-Local-CI-Push`, `Izakanpai-Local-CI-RPC`,
`Izakanpai-Local-CI-Business`, `Izakanpai-Local-CI-Full`
は登録解除する。復活させるタスク登録スクリプトも撤去した。
