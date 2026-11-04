# izakanpai 831 Manifest / 15工程のブロッカー表示修正 — ソースレビュー記録

2026-10-25 PHT。作業対象はローカルQAダッシュボードの読取り・投影・描画のみ。正式Runner、実機、Scheduler、D1に対する書込み、commit、push、deploy、タスク有効化は実施していない。以下はソース10観点・横展開10観点の**コード調査結果**であって、正式QA PASSではない。

## 実測した母数とiOS不足条件

- 正本 `.qa-v2-official/manifest.json` は831定義。OS適用後の未完了はAndroid 441、iOS 813、合計1,254 OS-case。Android正式状態はPASS 383／FAIL 62／BLOCKED 5／NOT_RUN 374／SKIP 5。iOSはPASS 12／BLOCKED 2／NOT_RUN 811／SKIP 5。表示時の未完了件数は正式台帳に従う。
- `scripts/qa-autonomy/runtime/ios-automation-contract-audit.json` の静的監査は未完了813件のうちソースアダプター31件、未整備782件、独立承認済み期待条件34件、iOS実機シナリオ構造確認0件、HID/DDI実証0件、正式判定増分0件。813件にケース固有のHID・独立Oracle・cleanup・実機証拠の未成立が残る。監査スクリプトの存在とケース別実行可能性を混同しない。
- 831はManifestの定義数、1,254はAndroid/iOSの未完了判定対象をそれぞれ展開した延べ件数。正式PASSの累積変化は `compareLedgerVerdicts` の同一run公式台帳差分のみを計測し、ダッシュボード投影は `officialVerdictsAddedByProjection=0`。

## 自己レビュー（S01–S10、ソース参照を伴う独立した10観点）

| 観点 | 対象・調査方法 | 確認した結果 |
|---|---|---|
| S01 入力契約 | `qa-automation-work-status.mjs:summarizeStageBlockerTiers` のschema/array/分母検査と負例テスト | 不一致は全3層 `NOT_MEASURED`、未取得を0件と偽装しない。PASS（ソース検査） |
| S02 一意性 | 同モジュールの `platform|caseId` Set と重複2行のテスト | ケースID重複は成功集計へ流入しない。PASS（ソース検査） |
| S03 OS分離 | Android9工程／iOS1工程／全OS5工程の選別と3対象のテスト | ステージ分母をOS適用範囲に合わせ、全OS件数の二重表示を防止。PASS（ソース検査） |
| S04 複数原因の集計 | `topCodes` の不成立コード集約・件数順と `READY/BLOCKED/UNKNOWN` 反例 | 1ケースの同一層を重複加算せず、代表主因を最大3件表示。PASS（ソース検査） |
| S05 未観測の扱い | `classifyStageRepair` の `NOT_MEASURED`、未知共有ゲート、配信失敗の優先順位 | 送信未確定・ソース未成立・Runtime未成立・正式Runner未判定を別コードにする。PASS（ソース検査） |
| S06 物理証拠ゲート | `qa-case-readiness-dashboard.mjs:commonConditions` の6条件と既存5条件一致分岐を追跡 | `claimBoundPhysicalEvidence` が未定義でもREADYになる条件を発見し修正。6条件すべて検証済みのときのみREADY。PASS（修正＋負例） |
| S07 公式判定の分離 | `qa-case-readiness-dashboard.mjs:compareLedgerVerdicts` と新行 `formalVerdictAttributed:false` の対応 | offlineソース実装・COS操作・CASE投影から正式PASSを増やさない。PASS（ソース検査） |
| S08 日付の真正性 | `qa-automation-work-status.mjs:explainAutomationWork` の `sessionId/callId/lastWorkAt` 検証 | Windowsタスク心拍やオフラインテストをCOS実作業日時に転記しない。PASS（ソース検査） |
| S09 DOM挿入安全性 | `qa-dashboard/app.js:textNode` の `textContent` と新15工程3層詳細への呼出し | 未成立コード・件数はHTML解釈されず、既存details内へ描画する。PASS（ソース検査） |
| S10 更新時保持 | `qa-v2-web-dashboard.mjs:makeReadOnlySnapshot` と worker `'message'` の再計算呼出しを逆追跡 | 初回だけ3層が見えて更新後に消える問題を発見し、再計算にも `caseReadiness` を渡すよう修正。PASS（ソース検査） |

## 横展開レビュー（H01–H10、呼出し元・別層を辿る10観点）

| 観点 | 別入口と辿ったソース | 調査結果 |
|---|---|---|
| H01 公式母数 | `qa-v2-dashboard.mjs` → `qa-full-backlog.mjs` → `.qa-v2-official/{android,ios}/state.json` | PASSと承認済SKIPだけを完了と数える。1,254延べ未完了を現行のまま保持。PASS（ソース検査） |
| H02 Android宣言 | `qa-automation-backlog.mjs` → `qa-runtime-providers/paired-case-contract.mjs` | Android契約の準備率はソース指標であり、物理判定に昇格しない。PASS（ソース検査） |
| H03 iOS全件監査 | `ios-automation-contract-audit.mjs` → `ios-source-contract-registry.mjs` → `qa-v2-ios-claimed-bridge.mjs` | 813件全件で実機・独立業務Oracle・cleanup・正式Runner証拠の不成立を分類。PASS（ソース検査、実機未評価） |
| H04 既存監査ブリッジ | `qa-cross-platform-audit-bridge.mjs` → `qa-automation-backlog.mjs:attachVerifiedE2eAudits` | iOSソース31件はRuntime未確認、E2E独立証拠とは別。ブリッジに正式台帳の整合検査あり。PASS（ソース検査） |
| H05 Windows担当 | `qa-automation-task-routing.mjs` → `qa-automation-work-status.mjs` | 工程keyと一致した依頼のみ配信状態を帰属させる。健康履歴を正式PASSと誤表示しない。PASS（ソース検査） |
| H06 COS操作履歴 | `qa-automation-work-evidence.mjs` → `qa-automation-work-status.mjs` | session/tool-call識別子付きの実操作を別時計に保持。履歴が取れないときはUNKNOWN。PASS（ソース検査） |
| H07 正式差分 | `qa-case-readiness-dashboard.mjs:ledgerVerdictIndex/compareLedgerVerdicts` → `qa-v2-web-dashboard.mjs:annotateIncreases` | run/Manifest同一性がない比較を無効化し、LEGACY取込みを新規実機判定として加算しない。PASS（ソース検査） |
| H08 ブラウザ更新 | `qa-v2-web-dashboard.mjs:createDashboardServer` → `qa-dashboard/app.js:renderContinuity` | 初回とrefreshに同じ3層を付与。HTML/JS不一致時にも正式APIを停止表示にしない既存処理を保全。PASS（ソース検査） |
| H09 他の15工程表示 | `qa-automation-backlog.mjs:buildAutomationWorkstreams` → `qa-dashboard/app.js:renderWorkstreamRows` | 元の7列・既存工程・ソースとE2E測定の分離を維持。3層の不足内訳は各工程の詳細へ追加。PASS（ソース検査） |
| H10 他の監査ゲート | `qa-15-integrity-review.mjs` → `qa-case-work-provenance.mjs` → `qa-automation-work-status.mjs` | 正式台帳・OS実証・COSソース作業・オフライン結果の独立性を追跡。新集計から公式状態を書き換える経路なし。PASS（ソース検査） |

## 回帰結果・未実行事項

- `node --test scripts/qa-autonomy/qa-automation-work-status.test.mjs scripts/qa-autonomy/qa-case-readiness-dashboard.test.mjs scripts/qa-autonomy/ios-automation-contract-audit.test.mjs` → **29件PASS、exit 0**（途中経過）。
- `node --test scripts/qa-autonomy/qa-case-readiness-dashboard.test.mjs scripts/qa-autonomy/qa-automation-work-status.test.mjs test/qa_v2_dashboard_frontend_regression_test.mjs test/qa_v2_web_dashboard_test.mjs` → **33件PASS、exit 0**（後続のUI追加テスト前）。
- 追加した「15工程の3層描画」VM回帰単体を含む `node --test test/qa_v2_dashboard_frontend_regression_test.mjs` → **7件PASS、exit 0**。
- 実 `makeReadOnlySnapshot()` → exit 0、Manifest 831・未完了1,254・工程15/15で3層照合可能。`node --check qa-dashboard/app.js` / `git diff --check` → exit 0。
- **正式QA結果は未変更。** iPhoneの実機HID/DDI・画面操作・D1監査・実際の正式claimは今回の調査・修正範囲外で未実行。iOSケースの未成立条件は継続中。

## Windowsタスク・正式Queueの現行観測（2026-10-25 14:37–14:38 PHT）

`readContinuityStatus()` の読取結果（exit 0、観測 `2026-10-25T06:37:48.849Z`）。対象の11タスク中、`Dashboard`、`Continuity-Observer`、`Driver-Readiness`、`Runtime-Blockers`、`Task-Work-Validation`、`Source-pairs`、`Source-driver`、`Source-data` の8件は直近履歴が `HEALTHY`。`Formal-Queue` は `QA_SWEEP_INCOMPLETE`（最終 14:37:01）、`Source-evidence` は `TASK_EXIT_NONZERO`（14:37:01）、`Source-ios` は `TASK_EXIT_NONZERO`（13:39:01）。`HEALTHY` はタスクの稼働履歴であり、実機操作または正式QA完走を意味しない。

正式Queueの最新観測は `2026-10-25T06:37:09.715Z`、結果 `NO_USER_AUTHORIZED_CASE_READY`、理由 `USER_AUTHORIZED_PREFLIGHT_FAILED` / `NO_EXECUTABLE_USER_AUTHORIZED_CASES`。修復にはケース別入場条件と完全な物理・独立DB証拠の確認が必要。これらの失敗は表示できるようになったが、実行ゲートそのものの解消は本ダッシュボード修正の範囲外。正式PASS/FAILの当日増分は0件（上位担当確認）である。
