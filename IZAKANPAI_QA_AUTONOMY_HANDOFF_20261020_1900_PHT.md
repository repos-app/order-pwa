# izakanpai Android QA自律化・停滞監視　引き継ぎ（2026-10-20 18:59 PHT）

## 最重要指示

- 目的は831件のizakanpai Android公式QAの継続消化。**ソース実装、AIターン終了、オフラインPASS、Windowsタスク正常終了は公式QAのPASS/FAILではない。**
- 未解決なら既存AI担当が調査→修正→独立検証→正式Runner計画→実機での公式判定を繰り返す。「ブロッカーあり」だけで終わらせない。
- 新規AIワーカー、重複Windowsタスク、別のRealme操作者を増やさない。Realmeと正式claimは正規Runnerのみ。並列ケース担当はsource-only。
- 物理的な端末切断など本当に人間が必要な場合のみユーザーに依頼。ソフトウェアの問題は自動修復が原則。
- 次担当は本書のスナップショットを信じ込みすぎず、必ず実ファイルから値・最終作業時刻を更新してから処理する。

## 18:59 PHTの現状（最新スナップショット）

| 指標 | 確認値 | 注意点 |
|---|---:|---|
| 公式Android PASS | **380** | 既存PASS、今回の作業による新規公式判定なし |
| 公式QA未完了 | **444** | 未実施・再試験・BLOCKEDなど |
| 直近の正式Runner実行可能候補 | **0** | 直近の正式計画のpendingCount |
| 共通アダプター保留 | **198** | 現計画の候補。全444件とは別の分母 |
| Realme／QA APK検証 | **接続済／検証済** | バージョンを固定せず、現在の実機APKを署名検証 |
| Formal Queue | NO_USER_AUTHORIZED_CASE_READY | 正規の安全保留。公式PASSを捏造しない |
| 現在のケース準備グループ | **111** | 最新coverage-inventory.json |
| まだ担当依頼のないグループ | **32** | 新規COSワーカーを増やす意味ではない |
| 最終依頼から2時間以上 | **67**（P0が**7**） | **依頼履歴の滞留**であって、AIツール操作停止の証拠ではない |
| 最終依頼から30分以上 | **74** | 同上 |

全体のケース工程は、IMPLEMENT_EVIDENCE_BLOCKED 32グループ、
PREPARE_DATA_AND_DRIVER 5グループ、RUN_SETUP 41グループ、
IMPLEMENT 33グループ（18:59スナップショット）。
監視結果は1分更新で増減する。

### COS担当別の最終実ツール操作（18:58監視）

| 担当 | 既存session ID | 最終実作業から | 状態 |
|---|---|---:|---|
| 共通アダプターP0 | b865fdc2-98ff-4ae6-a5dd-a3158b9cdbbf | 9分 | RECENT_REAL_WORK |
| SET-012〜016 | ae18c0df-f887-4db6-9448-4fddf537cd64 | 15分 | RECENT_REAL_WORK、契約不足4/5件 |
| FLOW-N-001/004/005 | ba54896c-3029-48e7-8305-b8c9ca3df61f | 6分 | RECENT_REAL_WORK、契約不足3/3件 |
| その他のケース準備担当 | 最新coverage sessionを監視側で解決 | 1分 | ACTIVE_TURN |

FLOW-N担当は約3時間の停滞後、18:52頃に作業再開を実測。
SET担当も約3時間停滞後、18:42に既存sessionで自動再開を実測。
AI依頼時刻と実tool_call時刻と公式判定時刻を混同しないこと。

**注意：** 18:58のReadiness直近実行は
BLOCKED / COS_STATUS_UNAVAILABLE:fetch failed。
この時点ではCOS制御APIへのアクセスに失敗したという意味。
受付失敗を作業完了とも未配信確定とも扱わない。
正確な入力UUID、COSの入力delivery、sessionのturn_start/endを確認。
結果不明の入力は二重送信禁止。

## 作業担当と既存タスク

| 既存Windowsタスク | 間隔 | 責務 |
|---|---:|---|
| ChatOnSteroids-QA-Continuity-Observer | 1分 | 実COS tool_callと全111グループの依頼滞留の読取り・記録 |
| ChatOnSteroids-QA-Driver-Readiness | 5分 | 同じCOS担当への再投入、安全な冷却期間と配信状態照合 |
| ChatOnSteroids-QA-Runtime-Blockers | 5分 | ブロッカーの独立検出・分類 |
| ChatOnSteroids-QA-Formal-Queue | 15分 | 唯一の正規実機claim、Realme操作、証拠取得、公式QA判定 |

既存監視の配線：

- scripts/qa-continuity-watch.mjs
- scripts/qa-autonomy/workstream-stall-watch.mjs
- scripts/qa-autonomy/qa-workstream-progress.mjs
- scripts/qa-autonomy/readiness-supervisor.mjs
- scripts/qa-autonomy/blocker-owner-continuation.mjs
- scripts/qa-autonomy/cos-local-control.mjs
- scripts/qa-autonomy/runtime/workstream-stall-watch.json
- scripts/qa-autonomy/runtime/driver-readiness-state.json

1分監視は30分の実tool_call停止を検出。
5分管理器は前AIターンの終了、未完了のケース契約、正しい担当session、
監視ログの鮮度3分以内、他の実行中入力なしを確認して再利用する。
同一ケース担当は30分クールダウン、24時間3回が上限。
P0は別の既存制御で優先。HTTP 202の受付のみでは完了でなく、
正確なUUIDでfailed/not_sentが**独立証明**されたときのみ遅延再送。
結果不明や不完全なinventoryならfail-closed。署名・claim・QA ledgerの
安全条件は緩めない。

## 次の優先作業

1. **正式QAを新規1件でも消化する。**
   QA_PAIRED_RUNTIME_ADAPTER_REQUIREDが198候補に残る。
   共通アダプター既存ownerが、完全なsource-pin、真正ES256、
   独立QA D1読取り、Realmeの実PNG、checkpoint+legacy assertion、
   QA専用teat fixture cleanupを備える最初のケースを実装する。
   正規claimなしで実機操作しない。偽証拠でPASSを出さない。
2. SET-012〜016の残り4件、FLOW-Nの3件を、異なる既存ケース担当が
   source-onlyで並列に補完。正規Manifest・ペア・SHA・独立回帰を確認。
3. **全111グループの滞留を解消。**
   workstream-stall-watch.json のgroupBacklogで未依頼32、
   最終依頼から2h以上67（P0は7）のキューを明示。
   これはAIの実ツール操作停止とは別指標。
   終了済み準備や真の共通P0ブロックを分け、既存担当に安全に継続させる。
4. Readinessの最新COS_STATUS_UNAVAILABLE:fetch failedを、
   COS API入力・セッションイベント・タスクログで切り分ける。
   未配信証明なしの再送は禁止。
5. 実行可能ケースができれば公式Runnerを即時検証し、
   PASSまたはFAILを**公式台帳＋本物の証拠**で記録、
   次のケースへ自動進行することを実証する。
6. ダッシュボード http://127.0.0.1:18765/ へ実作業日時・
   監視状態・未割当／滞留・ゲート充足・正式QA判定を定量反映。

## 必須の一次資料

公式Manifest：.qa-v2-official/manifest.json

公式Android台帳：.qa-v2-official/android/state.json

Formal Queue記録：scripts/qa-autonomy/runtime/formal-queue-supervisor-state.json

全未完了記録：scripts/qa-autonomy/runtime/all-unfinished-director.json

全グループ進捗：scripts/qa-autonomy/runtime/coverage-inventory.json

P0原因分析：scripts/qa-autonomy/runtime/root-cause-director.json

CASE契約検証：scripts/qa-autonomy/qa-runtime-providers/paired-case-contract.mjs

SETペア：
test/plans/qa-v2-realme-user-authorized/coverage-0870713eaf2c2fb3e08ab7.pair.json

FLOW-Nペア：
test/plans/qa-v2-realme-user-authorized/coverage-73357dfa12e0092fe9ac23.pair.json

詳細：docs/QA_AUTONOMY_OWNER_PLAN_20261020.md
およびdocs/QA_P0_IMPLEMENTATION_STATUS_20261020.md

### Windows PowerShell 5.1の再確認

作業ディレクトリ：C:\Users\user\OneDrive\_work\izakanpai
（PowerShell 5.1で && は使用不可）。

まずGet-Date -Format o、Get-ScheduledTask -TaskName 'ChatOnSteroids-QA-*'、
Get-ScheduledTaskInfo -TaskName 各タスクを確認。
次に公式台帳、Formal Queue記録、workstream-stall-watch.jsonを読取り。
回帰テスト：

node --test scripts/qa-autonomy/workstream-stall-watch.test.mjs

node --test scripts/qa-autonomy/readiness-supervisor.test.mjs

正式read-only計画は set-runtime-activation.ps1 を読み込んでから
node scripts/qa-v2-realme-unattended-pilot.mjs --plan --user-authorized
を実行。--runは全独立ゲート合格後、正式Runnerのみ。

**多数の未コミット・未追跡の共有ワークツリー**を複数チャットが
編集中。全件git add/コミット、reset、他担当ソースの上書き、
本番Worker deploy・ストア公開は安易に実施しない。

## 完成条件

1分監視・5分管理器が動くことだけでは未完成。
ユーザーの再指示なしで、
共通アダプターの未解決条件を独立検証により解消し、
新しい公式Android PASS/FAILが本物の実機証拠とともに記録され、
未完了件数が減って次のケースへ進むところまで実証する。
