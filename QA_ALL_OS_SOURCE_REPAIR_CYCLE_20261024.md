# izakanpai QA全831ケース×両OSのソース修復（2026-10-24 PHT）

## 正本対象と判定

公式Manifest全831件×Android/iOSの1662枠を検査した。Androidの適用829件は未完了441・正式完了保全388、非適用2。iOSの適用830件は未完了813・正式完了保全17、非適用1。

新規共通処理：scripts/qa-autonomy/qa-all-os-source-repair-cycle.mjs、回帰：同名.test.mjs。

- --check は読み取り専用。--once は既存のGit-cleanなペア最大4グループに対し、欠けているManifest原文の expectedCheckpoints と legacyAssertions だけ固定する。
- 店舗teat、claim-scoped fixture、実在driver/dataパス、重複のないowner、正式NOT_RUN/FAIL/BLOCKEDを検証。正式PASSや承認済みSKIPは除外。元期待値と衝突するフィールドは変更しない。
- 各書込み後に既存公式Source監査を再実行。期待条件の実数増なし、または他工程に減少がある場合はSHA比較付きで元バイトに戻す。最後に1662ケース全体を再監査し、未解消条件をケース別queueへ再配置する。
- sourceOnly:true、officialClaimsCreated:0、officialVerdictsWritten:0。ドライバーの物理実行、独立D1真正性、sourceContractReady、正式QA PASSを自称するフラグは追加しない。

## 実際の修復結果

既存Androidソース監査の expected 工程 **89→101（+12）**。4グループ12件：

- UI-account（1）、PT-RACE-122（1）
- AUTH-022/023/024/029/030（5）
- OPR-RACE-009/010/011/012/013（5）

各グループの再計測成功4/4、CASロールバック0件、公式QAの新規判定0件。全ソース契約完成数35→35、driver59、db51、png84、oracle89、cleanup82は変化なし。Android未完了441の全契約未達406、iOS未完了813でSourceアダプター準備済み20。全OS横断の未解決ソースタスクは1219件。各ケースのブロッカーと次作業を scripts/qa-autonomy/runtime/all-os-source-repair-cycle-last.json に記録した。

元々dirtyなSHIFT-015/016/028、PT-CANCEL-014/016/017/018/019、SET-001/002 の10件は、他担当編集保護で自動修正をスキップした。次の --check では VOL-001～005、OPR-RACE-019～023、BILL-035/038、BCP-009を新しく選定した。

Windows: 主担当が既存 start-source-lane.ps1 の pairs 分岐で、この --once を従来のCOS dispatcherより前に実行する接続ソースを変更した。このワーカーは改修後のTask Scheduler実起動、終了コード、COSブラウザ送達完了をまだ観測していない。既存レーンの最後の観測は COS_CONTROL_UNAVAILABLE / COS_DELIVERY_STALLED。改修済みのソースと定期実行の実証は区別する。

検証：新規テストと既存バックログ・ペア修復テスト計26/26 PASS（exit 0）、node --check exit 0、git diff --check exit 0。

## 自己レビュー（10観点）

| 観点 | 事実・結果 |
|---|---|
| S01 Manifest件数 | 831件・ケースID重複なし PASS |
| S02 台帳の同一性 | Android/iOS各831件の順序・適用範囲チェック PASS |
| S03 正式完了保全 | Android388、iOS17を未完了修復から除外 PASS |
| S04 店舗境界 | teat＋caseId＋idempotencyKey必須・他店舗拒否のテスト PASS |
| S05 Manifest原文 | 旧アサーション含む原値完全一致・矛盾は拒否 PASS |
| S06 ソース実体 | driver・fixture provisioner実ファイル存在チェック PASS |
| S07 単独owner | 複数pair定義のケースを自動編集から拒否 PASS |
| S08 編集競合 | Git clean とSHA比較のCAS置換 PASS |
| S09 未確認増分 | 独立カウンター増加なしなら元バイトへ戻すテスト PASS |
| S10 証拠の境界 | 正式claim・端末・台帳への書込みゼロ、回帰26 PASS |

## 横展開レビュー（10観点）

| 観点 | 事実・結果 |
|---|---|
| X01 全Android | 831枠の正式状態・非適用を含め診断 PASS |
| X02 全iOS | 831枠を監査し、iOS未完了813をケースIDで突合 PASS |
| X03 未登録 | Androidペア未登録179はソースタスクのまま保持 PASS |
| X04 期待値欠損 | ケース専用修正を増やさず共通定義固定 PASS |
| X05 account | UI-accountで期待値監査+1 PASS |
| X06 AUTH | 認証/権限5件で期待値監査+5 PASS |
| X07 RACE | PT1件・OPR5件で期待値監査+6 PASS |
| X08 競合編集 | SHIFT/CANCEL/SETのdirty10件を上書きせず保留 PASS |
| X09 別家族 | VOL/RACE/BILL/BCPを次回repair候補に選択 PASS（実行前） |
| X10 Windows | 既存Source-pairs配線ソース確認 PASS、Task Scheduler実行は PENDING |

## 再現コマンド

1. node scripts/qa-autonomy/qa-all-os-source-repair-cycle.mjs --check
2. node scripts/qa-autonomy/qa-all-os-source-repair-cycle.mjs --once
3. node --test scripts/qa-autonomy/qa-all-os-source-repair-cycle.test.mjs scripts/qa-autonomy/qa-automation-backlog.test.mjs scripts/qa-autonomy/qa-source-pair-automatic-repair.test.mjs

現時点の実成果は **公式Manifest期待条件12件のソース修復、正式判定0件増**。
