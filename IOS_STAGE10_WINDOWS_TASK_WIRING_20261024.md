# iOS Stage10 Windowsタスク実行経路の検証（2026-10-24 PHT）

対象は `ChatOnSteroids-QA-Source-ios` の既存20分周期タスク。タスク重複登録なし。
既存 `hidden-task-launcher.vbs source-ios` → `start-source-lane.ps1 -Lane ios` の
経路だけに `ios-stage10-scheduled-step.mjs --once` を挿入した。
毎回、公式831件Manifest・iOS台帳から read-only SOURCE 監査を原子的に生成した後、
既存 `runSourceLane('ios')` に引き継ぐ。COSの配信滞留時もSOURCEの監査更新は継続。
Androidの4 SOURCE lane、正式Runner、実機HID、公式台帳には変更なし。

## 実測と合格範囲

- `Start-ScheduledTask -TaskName 'ChatOnSteroids-QA-Source-ios'` を実行。既設タスクの動作確認。
- Windowsタスクは再度 `Ready` に戻り、最終結果 `0`（2026-10-24 19:27:51 PHT）。
- `ios-automation-contract-audit.json` 更新日時: 2026-10-24 19:26:04 PHT。
- 監査の集計: iOS未完了813、SOURCE adapters prepared **13**、SOURCE残800、
  Stage10全要件を満たしたケース **0/813**、当該監査で検証したHID実機 **0**、
  当該監査が書き込んだ正式判定 **0**。
- Webダッシュボードの `makeReadOnlySnapshot()` でも `consistent=true`、
  `iosContractIntegrity=CURRENT_OFFICIAL_SCOPE`、SOURCE 13/813、Stage10 0/813、
  `formalRuntimeE2E=0`、`schedulerConnection=IOS_SOURCE_DISPATCH_ONLY` を確認。
- 正式iOS台帳 SHA-256：`CD9F913B748A5CFC734C3CCBEF4FA482689EADB6047FC829F5AB7A17DC5D3BFC`、
  Manifest SHA-256：`A4AB7208A9A9E09931B4DA9475F1B8591D7945ACA800398601236CDC735D8B51`。
  Windows実行前後で同値を確認。
- COSの作業配信は未解消：実行直前 `COS_DELIVERY_BACKLOG`（queued未配信7件）、
  実行直後 `COS_CONTROL_UNAVAILABLE`。これらはSOURCE完成・正式PASSではない。
- SOURCEの10→13件の増加は他の並行開発者によるソース実装を含む。
  今回の配線変更が3件を実装したと主張しない。
- 対象テスト：`node --test scripts/qa-autonomy/ios-stage10-scheduled-step.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-source-work-selector.test.mjs scripts/qa-autonomy/qa-cross-platform-audit-bridge.test.mjs`。
  実行結果 **25 PASS / 0 FAIL**、Node構文検証とPowerShell 5.1構文解析もPASS。

## 自己レビュー10観点（今回のWindows Stage10経路の範囲）

| ID | 観点・独立確認 | 結果 |
| --- | --- | --- |
| S01 | 変更前の既存11タスクを列挙しSource-ios登録済み・Actions一致を照合 | PASS |
| S02 | 既存selector/dispatcher/監査の実装・呼出し元を読み、再利用する経路を選択 | PASS |
| S03 | iOS限定分岐により他4 SOURCEレーンの起動コマンドに差分がないことを確認 | PASS |
| S04 | Canonical 831件とiOS公式状態の監査一致を実装済validationで再確認 | PASS |
| S05 | 不正ケースIDを注入し監査拒否、配信0回、sidecar未生成を実行検証 | PASS |
| S06 | COS未配信時でも監査が保存され、配信状態がCOS_DELIVERY_BACKLOGとなるテスト | PASS |
| S07 | 監査レコードに `officialClaimsCreated=0`、`officialVerdictsWritten=0` を確認 | PASS |
| S08 | タスク実起動後に監査更新時刻とWindows LastRun/LastResultを照合 | PASS |
| S09 | `node --check` 両ファイル、PowerShell 5.1の構文解析を独立実施 | PASS |
| S10 | `git diff --check` 対象PS1、正式iOS台帳とManifestの前後SHA確認 | PASS |

## 横展開レビュー10観点

| ID | 影響面・確認方法 | 結果 |
| --- | --- | --- |
| H01 | `hidden-task-launcher.vbs` に `source-ios` → `-Lane ios` の実配線あり | PASS |
| H02 | `register-source-lane-tasks.ps1` は既存アクション一致時にタスク再利用 | PASS |
| H03 | タスク名定義 `qa-automation-task-routing.mjs` と実タスク名一致 | PASS |
| H04 | `source-lane-dispatcher.mjs` のiOS経路は既存COS送信・照合モジュールを使用 | PASS |
| H05 | `ios-source-work-selector.mjs` は未完成SOURCEケースのみ選択、公式PASSを報告しない | PASS |
| H06 | hourly `start-15-work-validation.ps1` のiOS監査側経路は保持 | PASS |
| H07 | ダッシュボードbackend `qa-v2-web-dashboard.mjs` が同じ監査sidecarを読む | PASS |
| H08 | `qa-cross-platform-audit-bridge.mjs` がSOURCE準備とHID／正式実績を別計上 | PASS |
| H09 | `qa-automation-backlog.mjs` は全HID・Oracle・cleanup証拠がないStage10を0件のまま扱う | PASS |
| H10 | 公式iOS台帳・Android公式runner・`qa-dashboard/app.js` は今回変更していない | PASS |

残作業：COS queued未配信の復旧、未登録SOURCE残800件の実装、物理iPhone HID/DDI・
独立Oracle・cleanup・正式claim/判定の実機実証。Windowsタスク成功はこの残作業の消化を表さない。
