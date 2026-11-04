# izakanpai Windows QA watchdog: Scheduler照会誤判定の修正と正式QA停滞の残件

確認日時: 2026-10-21 17:07 PHT（2026-10-21 09:07 UTC）。対象はizakanpaiのみ。

## 検証した事実

- 監視元 `scripts/qa-autonomy/runtime/progress-watchdog.json` は09:01 UTC時点で `SCHEDULED_TASK_NOT_HEALTHY / TASK_QUERY_UNAVAILABLE ChatOnSteroids-QA-Formal-Queue` と診断した。
- 実際のWindows `Get-ScheduledTask` + `Get-ScheduledTaskInfo` の独立照会では、Formal-Queue、Driver-Readiness、Runtime-Blockersの3タスクが存在し、最後の正常終了コードは0。09:07 UTCのFormal-Queue実行中の値267009も正常なRunning状態。
- 旧監視実装は1回の走査でPowerShell子プロセスを3回起動、各8秒でタイムアウト。子プロセス照会失敗と実際のスケジューラ異常を同じ優先度で扱い、これが実際の正式QAブロッカーを隠した。
- 既存正式Android台帳はPASS=380、FAIL=63、BLOCKED=5、NOT_RUN=378、SKIP=5。iOSはPASS=12、BLOCKED=2、NOT_RUN=812、SKIP=5。Android/iOSとも今回新たな正式判定は0件。
- Formal-Queueは `NO_USER_AUTHORIZED_CASE_READY`。最新のpreflightではRealme端末接続と承認APK照合がtrueだが、175ケースが `QA_PAIRED_RUNTIME_ADAPTER_REQUIRED` により延期。追加の374ケースは独立レビュー済みの実行入場条件が未達。正式承認キューは存在しない。
- `driver-readiness-state.json` は既存チャット実行中(`CHAT_TURN_RUNNING`)を示す。重複送信せず既存sessionを照合すること。履歴上の連続する独立修復結果は `SOURCE_REGRESSION_PASSED_RUNTIME_STILL_BLOCKED` で、同じオフライン修正のみを繰り返さない。

## 実装

- `scripts/qa-autonomy/progress-watchdog.mjs`: Windowsタスクを一度のPowerShellバッチで照会し、タスク別の失敗を保全する。照会不能(`TASK_QUERY_UNAVAILABLE`)を実際のタスク停止と混同しない。Formal、Driver、Runtimeの3タスクの本当の停止を同等に検知する。
- `diagnoseStall`: signed-APK/Realme preflight後の公式supervisorが実際のphysical adapterブロッカーと延期件数を返した場合、`FORMAL_RUNTIME_ADMISSION_BLOCKED` を優先表示し、追加の未レビュー件数と未完了チャットを残す。
- `scripts/qa-autonomy/progress-watchdog.test.mjs`: 単一バッチ照会、タイムアウト、部分失敗、実際のdisabledタスク、公式adapter延期の負例・優先順位を追加。

## 実行証拠・判定

- `node --test scripts/qa-autonomy/progress-watchdog.test.mjs scripts/qa-autonomy/readiness-supervisor.test.mjs`: 39/39 PASS（オフライン回帰）。
- `git diff --check -- scripts/qa-autonomy/progress-watchdog.mjs scripts/qa-autonomy/progress-watchdog.test.mjs`: PASS。
- `node scripts/qa-autonomy/progress-watchdog.mjs --scan` 09:07:03 UTC: 3タスクのhealthがすべてHEALTHY。正式ブロッカー `FORMAL_RUNTIME_ADMISSION_BLOCKED`、`175 formally admitted cases deferred by QA_PAIRED_RUNTIME_ADAPTER_REQUIRED`、`374 additional cases lack independently reviewed runnable admission`。 `stalled=true` を保全し、解消済みと誤報しない。
- `node scripts/qa-v2-official-runner.mjs verify`: Android 831件、iOS 831件の正本を読取確認。`node scripts/qa-v2-throughput-monitor.mjs --write` で両レーン直近2時間の新規判定0を確認。

## 未完了のゲート

現時点で正式物理ケースを安全に実行可能と認定できない。共通runtime factoryのclaim-scoped物理キャプチャ、署名付きDB readback、独立Oracle、fixtureの最終cleanup契約を公式 `--plan` と再検証し、**実際に実行可能となったケースのみ**既存Formal-Queueに引き渡す。現行の`formal-stall-recovery.json`が持つ既存owner sessionで次の異なる原因を調べる。実行中の他担当claim、正式台帳、正式レビューを変更しない。

この修正はローカル作業木のみ。commit/push/deploy/物理端末操作/正式PASS追加は実施していない。
