# Android QA 実行速度・停止原因の改善（2026-10-11）

## 目的と運用境界

正式2,080件のPASS/FAILを証跡に基づいて増やすため、巡回の空回り・CDP一時切断・再試行の重複・誤った進捗表現を是正する。既存runner、QA端末、Emulatorのプロセス・データ、アプリAPK、本番環境には本作業から手を加えていない。commit/push/deployも未実施。

## ソース修正（未コミット）

- `scripts/android-qa-cdp-recovery.mjs` と `scripts/android-qa-windows-driver.mjs`：CDPの一時的な読み取り失敗のみ最大3回再試行。毎回、QAアプリ前面・専用WebView・ポート転送を再確認する。タップ、データ更新、runner判定の再実行は禁止。未知の失敗・所有権不一致は安全停止。
- `scripts/android-qa-windows-driver.mjs`：固定SELECTレシピでも正式/専用runnerの残件状態、既存クールダウン・再試行上限を確認。`NOT_PROVEN`の二重巡回を抑え、スキップ理由を独立ログへ記録。
- `scripts/android-qa-watch-gate.mjs` とドライバー：`WAITING_FOR_AUTHORIZED_LOGIN` または安全なアプリ内戻り経路待ちの場合、20秒周期の全画面巡回を行わず、本人認証後の実UI状態を読み取り専用で確認。変化時のみ通常巡回へ戻る。未認証の迂回・強制ログインはしない。
- `scripts/android-qa-progress-metrics.mjs` と `scripts/android-qa-throughput.mjs`：`SKIP` と証拠に基づく `PASS`/`FAIL`/`BLOCKED` を分離。SKIPを検証完了率に含めず、正式runnerのケースID重複、独立した実機・Emulator出自、過去60分の判定・SKIP数を集計。
- `scripts/Watch-AndroidQaEmulatorSafe.ps1`：Emulator監督担当が認証待ちの検査間隔を60→120→300→600秒に制限。保護済みQA認証情報が既に存在し、Emulatorの正しいAVD/API/前面アプリ/所有権/空きRAMが確認できるときだけ既存の正規ログイン補助機能を使用。認証失敗時は5分→15分→1時間のバックオフとサーキットブレーカを設け、無限ログイン・情報露出を防止。詳細は担当の最終報告を優先すること。

## 確認済み

`node test/android_qa_cdp_recovery_test.mjs`、`node test/android_qa_watch_gate_test.mjs`、`node test/android_qa_progress_metrics_test.mjs`、`node test/android_qa_retry_policy_test.mjs`、`node test/android_qa_recipe_queue_test.mjs`、`node test/android_qa_runner_guard_test.mjs`、`node test/android_qa_emulator_lane_test.mjs` はすべてローカルPASS。ドライバー構文チェック、`git diff --check` もPASS。

## 残件・適用時の注意

現在走っているプロセスは起動時のJSを保持する。ソース変更は既存プロセスを自動更新しない。QA所有者が安全なタイミングで次回起動する際に反映される。現在のrunnerの値が増えても、同時に実行する別担当の結果を本修正の効果と混同しないこと。

`SKIP` はユーザー指示による未確定の隔離状態であり、修正版APKでの再実行PASSではない。runnerのガードと既存判定を上書きしない。正式進捗報告は `PASS + FAIL + BLOCKED`、別途 `SKIP` と `NOT_RUN` を示す。
