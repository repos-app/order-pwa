# izakanpai Windowsタスク自動復旧：2026-10-24 実行結果と20観点レビュー

## 完了基準と現状

- **実装・実行済み:** 既存4タスクのプロセス単位5分無進捗監視、終了コードと独立実行結果の照合、失敗分類、原因指紋別の有界再試行、既存readiness/formalタスクへの即時起動要求、COS入力IDと配信確認の区別、Realme USB切断後の再接続監視。
- **ライブ証拠:** `scripts/qa-autonomy/runtime/scheduled-task-outcomes/*.json` および `runtime/task-child-logs/`。16:29起動の正式タスクは内部 `NO_USER_AUTHORIZED_CASE_READY` / 物理端末 `DEVICE_DISCONNECTED` を記録、子プロセスの偽正常終了0を実効終了2に訂正し、既存readinessが起動中であることを確認した。16:37の後続正式タスクも結果2で停止原因を記録した。
- **配信状態:** readinessの既存COS journalに、入力 UUID 単位の送信済み/待ち/未完了が併存。`ACCEPTED_NOT_COMPLETED`だけでは配信・作業完了としない。新観測器はUUIDと当該タスク実行時間を照合し、条件成立時にだけ配信実績を採用する。
- **正式QA:** この変更単独で新たなPASS/FAIL/BLOCKEDが記録された証拠はまだない。新たな正式判定は0件として扱う。Android実機が実際に接続しなおし、最新の公式plan・署名/D1証拠とcase claimが成立するまで完全自動化の完了宣言はしない。

## 既存機構との接続

`hidden-task-launcher.vbs` → `start-scheduled-qa-supervised.ps1` → 既存4タスク本体（formal / driver-readiness / runtime-blockers / task-work-validation） → `scheduled-qa-outcome.mjs`。起動結果はWindowsの `Start-ScheduledTask` の受理まで別途記録し、既存readinessの COS exact-input inventory が送信・turn_endを別途判断する。公式QA runnerが実行・証跡・正式判定を管理するため、観測器は公式台帳を一切書き換えない。

Realme復帰時は5分ごとの既存Runtime-Blockers実行で物理端末モデル・ADB serial・公式RUNNING・停止指示を再確認し、同一切断エピソードにつき有界のformal再起動を要求する。ネットワーク復旧は共通`realme-qa-network-autoheal.mjs --once`が存在するときにそこへ委譲する。共通ヘルパー自身の実機検証結果は別証拠で管理する。

## 自己レビュー（10独立観点）

| # | 観点・確認方法 | 結果 |
|---|---|---|
| 1 | 対象モード不正時のfail closed。CLI偽modeの実行で終了2、VBS偽modeの実行で終了64を確認 | PASS |
| 2 | WindowsプロセスIDの限定と子孫停止。wrapperの`taskkill /PID $child.Id /T /F`と起動元childの対応を精査 | SOURCE PASS、実際の5分Killは未検証 |
| 3 | 終了コード0でも正式runnerの`DIRECT_PLAN_FAILED`を独立照合。再現テストと16:29ライブ観測 | PASS |
| 4 | 実正式結果の鮮度確認。古いsupervisor snapshotを流用しない負試験 | PASS |
| 5 | ユーザー停止時は自動復帰・起動を行わない条件の負試験 | PASS |
| 6 | 同一原因で無限起動しない。原因fingerprint・受理済みの再送防止・最大2回の失敗時試行の試験 | PASS |
| 7 | ChatGPT受理/配信/turn_endの境界。UUID・セッション・日時一致の負試験 | PASS |
| 8 | 5分間停止の分類。124と公式QA未判定を区別する試験 | PASS（実ハング未再現） |
| 9 | PowerShell5.1構文・hidden launcherの不正引数、`git diff --check` | PASS |
| 10 | 既存readiness/formal接続と停止終了時の回復要求。正式タスクの終了2と`TASK_ALREADY_RUNNING`を実機ログで照合 | PASS |

## 横展開レビュー（10独立観点）

| # | 影響面・確認方法 | 結果 |
|---|---|---|
| 1 | Formal-Queue: 16:29/16:37実タスク終了結果、根因とschedulerの一致 | PASS |
| 2 | Driver-Readiness: 既存スケジュール起動中を検出して二重起動を抑止 | PASS |
| 3 | Runtime-Blockers: 16:21の既存タスク実行成功を新wrapperが記録 | PASS |
| 4 | 15工程検証: 新wrapperによる実行、既存検証タスク全体の終了0とログを記録 | PASS（正式QAではない） |
| 5 | Realmeハードウェア: USB切断を公式preflightで確認、接続復帰・異機種・RUNNING時を模擬で検証 | 模擬PASS、再接続実機テスト未実施 |
| 6 | HTTPS Bridge: 既存のQA限定ネットワークヘルパーへ委譲。未接続時の新規実証は不可 | PENDING（共有担当のライブ検証待ち） |
| 7 | Android公式831ケース: 観測器が公式ケース台帳を編集しないソース経路確認 | SOURCE PASS、新規verdict増加は未達 |
| 8 | iOS正式QA: Androidの結果を転記せず、iOS台帳を編集しない依存関係監査 | SOURCE PASS |
| 9 | 0344隔離とteat分離: 既存正式queue/reasonを読むだけ、ケースやD1を変更しない依存関係監査 | SOURCE PASS |
| 10 | COS delivery audit: 受理UUIDの配信を既存journalから検証し、実際の未配信を偽PASSに変えないテスト | PASS、現在の新ケース正式実行証拠はPENDING |

## 回帰コマンド

`node --test scripts/qa-autonomy/scheduled-qa-outcome.test.mjs scripts/qa-autonomy/progress-watchdog.test.mjs scripts/qa-autonomy/start-formal-queue.test.mjs` → **38テスト PASS / 0 FAIL**。

実機USB切断からの再接続→TLS署名発行→teat D1 readback→公式runner case claim→判定の一連の実証が未了。物理デバイスがWindows PnPにもADBにも見えない間は、ソフトウェア操作だけで再接続成功と報告してはならない。
