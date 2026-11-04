# QA自律化：責任者・作業量・既存タスク統合

2026-10-20

## 役割

P0-1（修復制御）: この開発チャットがソース修正と回帰テストを担当。
運用は既存Windowsタスク ChatOnSteroids-QA-Driver-Readiness（5分間隔）。
概算4〜8開発時間相当。

P0-2（初回5ケース）: 既存COS QA担当セッション
b865fdc2-98ff-4ae6-a5dd-a3158b9cdbbf がソース実装と独立証拠確認を担当。
既存Driver-Readinessタスクが同じセッションに続行を依頼。
最初の候補: QA2-SET-012〜016、
coverage-0870713eaf2c2fb3e08ab7。
概算1〜3人日相当、正式実機結果までは未完成。

P0-2（全件展開）: 同じ既存COS QA担当をDriver-Readinessが継続制御。
原則グループ単位でケース契約を補完し、独立回帰で確認。
現状203件のユーザー承認候補、95準備グループ。
暫定5〜20人日以上。自動化品質が安定するまで大きな不確実性あり。

正式実行・判定: 既存タスク ChatOnSteroids-QA-Formal-Queue（15分間隔）、
既存qa-v2-official-runner。Realme専有claim、実PNG、ES256、独立D1、
既存Checkpoint/Legacy、独立cleanupを満たした場合のみ正式判定。

異常・進捗監視: 既存 ChatOnSteroids-QA-Runtime-Blockers（5分間隔）、
ChatOnSteroids-QA-Continuity-Observer（1分間隔）。
AIターン終了と正式QA PASSを区別して判定する。

## 今回のコード

case-contract-work-queue.mjs:
正式ManifestとNOT_RUNの公式台帳に存在し、QA専用teatの
準備済みグループから次の実装対象を選ぶ。これは承認でも合否でもない。

blocker-owner-continuation.mjs:
旧3方針とsource-change検証を使い切っても、同じ担当セッションで
実装可能な次の境界を選ぶ。修復内容は、
ドライバー、D1 selector、実PNG/gesture、checkpoint/legacy、
fixture cleanup、初回正式実行の6段階。
連続再依頼を防ぐため最低20分間隔、24時間で最大8回。
上限到達後は24時間の窓が更新されると同じ既存担当が再開する。
ソース変更も独立確認が必要で、公式台帳は自動合格扱いしない。

## 検証基準

関連31テストPASS。既存Windowsタスクは稼働。
現時点では共通P0に未完了の既存AIターンがあり、重複修正依頼を出さない。
正式QA PASSは380、未完了444のまま。自律ループの有効性は、
次の同一AIセッション再起動と、公式Runnerの独立した新規1件の
PASS/FAILが記録されて初めて確認される。

見積もりは開発工数の概算であり、AIの実行時間・納期保証ではない。

## 15:20〜15:41 PHT：既存チャットへの並行依頼と自動運転の実測

新しいCOSワーカーやWindowsタスクは作成せず、既存の3つのソース責任者を分離。
共通P0担当 b865fdc2-98ff-4ae6-a5dd-a3158b9cdbbf のコード領域を
その他の独立グループが編集しないよう依頼した。

- QA2-SET-012担当：既存COS ae18c0df-f887-4db6-9448-4fddf537cd64。
  継続依頼2ca21618-5a9e-4dbe-a76d-e0d3c40368be は配信確認、
  実行ターン完了。ケース専用契約ソース4ファイルと
  coverage-0870713eaf2c2fb3e08ab7の正規ペアを更新。
  担当報告：専用nodecheck 4 PASS、同グループのオフライン85チェック成功。
  独立リアル操作・D1・source approvalは未完成。正式判定は0。
- FLOW-N担当：既存COS ba54896c-3029-48e7-8305-b8c9ca3df61f。
  継続依頼15277cd3-26ed-4feb-b6b5-5009c323e951 は配信確認、
  実行ターン完了。QA2-FLOW-N-001/004/005のsource-only --planを
  補完。担当報告：11件オフラインPASS、source integrity照合PASS。
  正式実機判定は未実行でNOT_RUNのまま。
- 既存の正式Queueを実行。最初はDIRECT_PLAN_FAILED。
  失敗ステージを記録し、Windows Task Scheduler実行環境下で
  SDK apksigner検証が失敗する問題を調査。
  正規SDKのapksigner.jarをAndroid Studio JBRで直接実行し、
  Windowsバッチのクォート/環境依存性を廃止。APK署名信頼条件は不変。
  正式Queue実測：NO_USER_AUTHORIZED_CASE_READY、
  物理Realme認識true、APK署名検証true、198件deferred、
  0件runnable。正式Runnerは安全にclaimを発行せず停止。
- 既存ReadinessがP0未解決中でも別グループのsource-only
  COVERAGE_RUN_SETUPを選択できるよう更新。
  実測次候補：QA2-UI-takeout / coverage-7662bca39bec44dd7f90b5。
  P0の所有者を増やさず、正式な物理claim権はFormal Queueのみ。
- 実際のCOS_HTTP_409で当該ケースがATTEMPT_UNKNOWNとなった。
  既存Windowsタスクに、入力UUIDの完全なCOS inventory照合で
  **未配信が証明された場合だけ**5分後に同一セッションへ
  バックオフ再試行する制御を追加。
  不完全なinventory、504、結果不明は今まで通りfail-closed。
  実環境でCOS_BUSY_BACKOFFへの状態復旧を確認。

関連回帰59件PASS、追加した状態機械の回帰もPASS。
公式台帳SHAは試験前後で不変。正式PASSは380、未完了444。
**この段階の「ケース消化」はsource-only準備が進んだという意味であり、
正式QAケースのPASS/FAIL消化件数は依然0。**
合格判定には独立した実機の最初の正式判定が必要。
