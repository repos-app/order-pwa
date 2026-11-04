# Windows QAタスク・CoS配信整合性のソース修正監査（2026-10-25 PHT）

**範囲**: 既存Windowsタスク起動、5分停滞監視、CoS HTTP受付・実配信・既存チャット再利用、readinessとsourceレーンの所有権。リポジトリHEADは調査時 `2aebf8fe5d05c5ec4b5d1b6d732bbfdfdae83a5a`。作業木の既存dirty差分は保全。**今回の作業でWindowsタスクの有効化、CoSへの新規POST、公式QA claim・判定、Git commit/push/deployは行っていない。**

## 再現証拠と根本原因

2026-10-25 14時台（PHT）にTask Schedulerから `ChatOnSteroids-QA-*` 11件の `State=Disabled` を実測。`Formal-Queue`、`Source-data`、`Source-driver`、`Source-evidence`、`Source-ios` の直近 `LastTaskResult=2`、残り6件は `0`。`.qa-v2-official/qa-execution-paused-by-user.json` はその時点で不存在。11件の無効状態はオペレーターの停止状態として維持する。

`scripts/qa-autonomy/runtime/cos-browser-delivery-audit.json`（2026-10-25T06:24:17.316Z）ではCoS受付54件中、配信待ち3件、702〜707分経過、3件すべて元の `conversationId` がない（evidence・ios・pairs）。`providerConnected=true`、`bridgeConnected=true` でも、元チャット未指定のキューが実チャットに到達した証拠はない。元チャットのURLを開いて修復する手段はこの3件に適用できない。CoSのサーバ受付（HTTP 202）は作業実行ではない。

`task-child-logs/formal-queue-20261025T055202270-26508.out.log` の正式実行前の判定は `NO_USER_AUTHORIZED_CASE_READY` / `USER_AUTHORIZED_PREFLIGHT_FAILED` / `NO_EXECUTABLE_USER_AUTHORIZED_CASES`。このタスクのexit 2は **正式なFAIL判定数ではない**。Sourceレーンのexit 2は `COS_DELIVERY_BACKLOG` 等の未配信・制御不可を示す。どちらもタスクの成否と実機正式QA件数を混同しない。

**根本ソース欠陥**: `source-lane-dispatcher.mjs` の既存チャット再利用経路には、送信前に「以前完了済みの `turn_end` ID」を固定する処理がなかった。共通 `reconcilePending` は基準IDがない場合、過去の `turn_end` だけで新規入力を `CHAT_TURN_COMPLETED_NOT_QA_VERIFIED` と誤認し得た。さらに同一チャットに実行中の未完了入力があっても再利用候補になり得た。

**適用修正**: 再利用する元チャットの完了IDを送信前に取得・永続保存し、今後の新しい完了イベントだけで次工程へ進む。取得できなければPOST前に `COS_ANCHOR_BASELINE_UNAVAILABLE`、同一sessionの未確定入力があれば再利用を禁止する。停止済みSourceタスクの登録所有権と「実際の有効状態」を分離し、readinessがその所有権を迂回しない。停止中の回復先タスクは起動せず `SCHEDULER_TASK_DISABLED` と記録し、未実施の起動を失敗回数として消費しない。

## 10観点の自己ソースレビュー（S01–S10）

| 観点 | 対象・実査方法 | 修正後の証拠／結果 |
| --- | --- | --- |
| S01 旧イベント混同 | `source-lane-dispatcher.mjs` のanchor分岐と `readiness-supervisor.mjs` の `reconcilePending` をイベントIDで追跡 | `priorCompletedTurnIds` 保存と旧 `turn_end` の非完了判定を独立回帰で確認。ソースPASS |
| S02 送信前基準時点 | `sendOnce` 呼出より前の `completedTurnIds` 呼出順と `scope` 永続化順を照合 | 基準取得不能なら送信を呼ばない回帰を実施。ソースPASS |
| S03 永続UUID | sourceレーンの `inputId=randomUUID`、`atomicJson`、`cos-local-control.sendOnce` のファイル `wx` とPOST契約を照合 | 既存UUIDを保管し曖昧エラーの二重POSTを禁止する既存実装を維持。ソースPASS |
| S04 配信と完了の分離 | `QUEUED_NOT_DELIVERED`・`DELIVERED_NOT_COMPLETED`・`CHAT_TURN_COMPLETED_NOT_QA_VERIFIED` を逆追跡 | exact inputで配信のみ更新する既存回帰、旧turn偽完了を防ぐ追加回帰を確認。ソースPASS |
| S05 競合session再利用 | `combined` の全レーンjournalと `anchor.sessionId` の一致を確認 | `ATTEMPT_UNKNOWN` / `ACCEPTED_NOT_COMPLETED` の所有者がいる同sessionを再利用しない条件を追加。ソースPASS |
| S06 不完全履歴 | `completedTurnIds` のイベント配列と例外経路を確認 | 空履歴・取得不能を安全に拒否し、POST前の戻り状態を回帰確認。ソースPASS。API履歴の完全性そのものは実運用確認待ち |
| S07 登録≠有効 | `register-source-lane-tasks.ps1` の既存タスク分岐、`Get-ScheduledTask.State`、JSON出力を追跡 | `registered` と `enabled` を別出力し、Disabledを真のenabledとして表示しない。構文検査PASS、実タスク登録操作は停止維持のため未実施 |
| S08 所有権継続 | `readiness-supervisor.mjs` の `sourceLanesRegistered` とsource登録状態のゲートを追跡 | `hasSourceLaneOwnership` はDisabledでも登録済み所有者を認識。ユニット回帰PASS |
| S09 回復先Disabled | `start-scheduled-qa-supervised.ps1` の `Ready/Running/Disabled` 分岐と `scheduled-qa-outcome.mjs` のackを追跡 | Disabledは起動せず状態記録・再試行予算不消費。構文検査＋ackユニット回帰PASS |
| S10 5分監視 | `start-scheduled-qa-supervised.ps1` の子PID・標準出力/イベントmtime・2秒監視・300秒制限・`taskkill /PID /T /F`・exit124を検査 | 実装は子プロセス木限定で監視、時限終了の分類テストPASS。**5分の実タスクkill実測は未実施** |

## 10観点の横展開ソースレビュー（H01–H10）

| 観点 | 独立して追跡したソース | 漏れの確認・結果 |
| --- | --- | --- |
| H01 共通readinessセッション回復 | `readiness-supervisor.mjs` の `observeCompletedTurns`・reuse時のprior ID保存 | 同系誤りの先行対策が既に存在し、今回sourceレーンへ同じ共通関数を再利用。ソースPASS |
| H02 異レーンのfallback | `cos-existing-chat-fallback.mjs` のsource由来・完了済み・同会話制約とlatest session状態 | ユーザーチャットへの横流しを認めず、全レーンcombinedからbusy sessionを拒否。ソースPASS |
| H03 HTTP 409/504の復帰 | `cos-local-control.mjs` と `source-lane-uncertain-recovery.mjs` のID一致、完全inventory・cooldown規則 | 正確な入力UUIDの不達確定まで自動再送しない既存の制限を保持。ソースPASS |
| H04 配信監査・実チャット区分 | `qa-cos-browser-delivery-audit.mjs` と `source-lane-delivery-status.mjs` の監査と表示条件 | 202受理・sent・実ターン完了は別状態。auditの3件停滞検出と関連回帰を確認。ソースPASS |
| H05 ブラウザ復帰 | `qa-cos-browser-target-recovery.mjs` のtarget UUID・前回pending・24h上限 | 元会話IDがない3件を任意タブへ送らない。1タブ開き直しだけでは修復不可という既存制限を確認。ソースPASS |
| H06 iOS単独source | `ios-stage10-scheduled-step.mjs` と `start-source-lane.ps1 -Lane ios` | iOS sidecar監査とCoS配信statusは別、blocked時exit2が伝播。ソースPASS |
| H07 Pairs専用source | `start-source-pairs-repair.ps1` と `qa-all-os-source-repair-cycle.mjs` 呼出 | ソース処理はCoS停止中にも独立して進む。停止中Windowsタスクそのものは起動していない。ソースPASS |
| H08 正式キュー | `start-formal-queue.ps1`、`formal-queue-supervisor.mjs` の結果、`scheduled-qa-outcome.mjs` の分類 | formal exit2は受入ブロックの観測であり正式PASS/FAILの捏造なし。ソースPASS |
| H09 Windows launch/監視 | `hidden-task-launcher.vbs` → supervised PS1 → scheduled outcome記録/ack | 実child exitをTask Schedulerへ返し、停止/disabledは復旧起動しない。ソースPASS、実タスク回帰は未実施 |
| H10 手動停止・復帰 | `register-source-lane-tasks.ps1`、`resume-scheduled-qa.ps1`、readiness source所有権 | 停止中の11件はDisabled実測。復帰スクリプトは `-Apply` 明示時のみ有効化。今回一切実行していない。ソースPASS |

## 実行済み検証・未完了ゲート

- `node --test scripts/qa-autonomy/source-lane-dispatcher.test.mjs scripts/qa-autonomy/readiness-supervisor.test.mjs scripts/qa-autonomy/scheduled-qa-outcome.test.mjs scripts/qa-autonomy/qa-cos-browser-delivery-audit.test.mjs scripts/qa-autonomy/cos-existing-chat-fallback.test.mjs`：**82/82 PASS、exit 0**。後続でsourceレーンテストの再照合を実体 `reconcilePending` に変更し、当該テストファイルを再実行して**17/17 PASS、exit 0**。
- 最終的に上記5モジュールへ `qa-cos-browser-target-recovery.test.mjs`、`cos-local-control.test.mjs`、`source-lane-uncertain-recovery.test.mjs` を追加して一括実行し、**100/100 PASS、exit 0**（2026-10-25 PHT）。元チャット復帰・HTTPの曖昧送信・重複防止の横断回帰も成立。
- 変更3 Nodeモジュール `node --check`：exit 0。変更2 PowerShellを`System.Management.Automation.Language.Parser.ParseFile`で検査：両方とも構文エラー0。対象差分の `git diff --check`：exit 0。
- 5分実タスク停滞回復、無効中タスクの後日再開、3件targetlessキューの実配信、正式QAの増分は**未検証**。3件について受理またはブラウザ接続のみから「実行済み」「PASS」は付与しない。レビュー20観点はソース監査の件数であり、実機QA判定とは独立。
- なお `scheduled-qa-outcome.mjs` と監視PS1には並行作業者によるsource-driver回復ルーティング変更も存在する。統合時はdirty差分と担当ownerを維持し、同時変更を無断で巻き戻さない。

## タスク再有効化後の実動確認（同日14:38〜14:40 PHT）

作業の途中に**別担当が**11件のQAタスクを再開したため、当初の `Disabled` は現況ではない。再確認したTask Schedulerでは11/11件 `Ready`。14:37の `Formal-Queue` は `LastTaskResult=2`、同じ実行の `scheduled-task-outcomes/formal-queue.json` は `cause=FORMAL_CASE_ADMISSION_BLOCKED`、子 `exitCode=0` に対して `effectiveExitCode=2` を記録。これは有効化後にも、sourceと実機の正式受入前提が未成立のままという現実を示す。`Source-evidence` 直近 `LastTaskResult=2`・`cause=SOURCE_COS_DELIVERY_BACKLOG`。

同日、送信を行わない `node scripts/qa-autonomy/source-lane-dispatcher.mjs --once --lane=pairs --reconcile-only` を実行、exit0。既存入力ID `a1414566-51d1-409d-86fc-c0322bb0889a` のCoS provider `sent` 時刻 `2026-10-25T05:42:11.003Z` を照合し、表示状態を `DELIVERED_NOT_COMPLETED` へ訂正。結果には `inspectedOnly:true` と `controlBlock:COS_DELIVERY_STALLED` が明記されている。この操作は新しいCoS指示を送信せず、正式QA判定を追加していない。続けてCoS配信監査 `--once` はexit0・`DELIVERY_STALLED` を返し、元会話先なしの配信待ち3件、最古722分を再確認した。**providerのsent状態だけからユーザーのChatGPT画面に実際に入力が表示されたとは証明できない。** 配信問題の残余についてはCoSブラウザ側の独立した修復・証拠照合が必要。
