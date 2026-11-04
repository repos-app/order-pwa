# QA自律障害復旧標準（izakanpai実装版）— 2026-10-20

> **2026-10-22 改版・最優先：** RUNNINGの滞留は承認待ちで止めない。QA自動実行器は、同じ実機への旧QA操作を排他停止させてから、正式Runner `release` で`INTERRUPTED`を記録し、QA-owned fixture副作用を確認して再claim・再実行できる。旧担当の事前了承・孤児PID判定は必須ゲートでない。未確認データの重複再送は禁止し、そのケースだけ照合待ちにして次を進める。全アプリ共通の正本は [QA-COLLAB-001 v1.2.0](../standards/qa-collaboration/v1/README.md)。本書中に旧前提があれば新決定を優先。

## 背景と問題

QA_ES256_TRUSTED_PUBLIC_KEY_MISSING を最初に観測しても、AIは「公開鍵不足」と報告して終了していた。
ユーザーの再指示で初めてCloudflare WorkerのSecret未登録、公開API→Control Plane→テスト店舗Workerの404、
認証済みWebView内のES256署名・独立D1が深掘りされ、実測で解消された。

**AI作業終了・Windowsタスク終了コード0・オフラインテストPASSは、正式QAのPASSではない。**
正式判定は .qa-v2-official の既存Runnerだけが記録する。

## 全件自動化の原則

1. 検知：正式台帳、ケース別queue、ADB、D1、Worker Secret名、ES256ライブ署名、factory登録を独立に観測する。
2. 原因分解：上流で最初に未合格のゲートを一つ特定し、復旧ステージと必要な証拠を保存する。
3. 安全な自動復旧：承認済みのQA専用D1復旧、独立SELECT、ES256ライブスモーク再確認、
   genuineオフラインテスト再実行による証拠登録修復を無人実行する。
4. AI修正：ステージに応じて対象ソース・実行コマンド・独立合格条件を渡し、原因報告だけで終わらせない。
   ユーザーは本番稼働前のテスト店舗への変更を承認済み。Cloudflare変更はQA Store・既存Secret保全の範囲に限定する。
5. 独立再検証：Chat On Steroids turn_endの後、Windowsタスク自身が対象工程のテストを再実行し、
   実測ゲートが改善しない限り終了扱いにしない。単なるSOURCE SHAやheartbeatでは再試行枠を復活させない。
6. 別アプローチ：同一ステージの2回目から前の仮説を変え、3回目は失敗コマンドと実測を深掘りする。
   同一内容を無制限に送らず、他の未実行やFAIL修正ケースのレーンも継続する。
7. 正式復帰：current RUNNING claim、exclusive Realme lease、実ADB操作、実PNG、
   ES256証拠、独立D1とcheckpoint/legacy oracle、fixture cleanupが整って初めてfactoryをadmit。
   正式Runnerがケースを記録するまでQA進捗としない。

## 復旧ステージと独立完了条件

| Stage | 実行内容 | 独立完了条件 |
|---|---|---|
| REALME_DEVICE_NOT_READY | ADBと実機を診断 | RMX3938が接続し排他claimに違反しない |
| DEDICATED_TEST_DB_NOT_READY | QA専用D1設定の自動復旧・SELECT | teat DB識別が一致 |
| QA_ISSUER_NOT_PROVISIONED | QA Worker Secretと署名配布を修復 | exact teat Workerに署名設定が存在 |
| QA_ISSUER_REMOTE_UNVERIFIED | WebView経路とES256＋D1を修復 | 実署名と独立D1が一致 |
| CLAIM_SCOPED_PHYSICAL_ORACLES_NOT_BOUND | 公式claim付きRealme+oracle接続 | claim・PNG・DB・期待結果・cleanupが独立検証される |
| PROVIDER_ACTIVATION_AND_EXECUTABLE_BATCH | factoryとビルド/レビューキューを整備 | 公式registry登録・実行可能ケース選出 |
| FORMAL_QA_PROGRESS_STALLED | 正式Runner停滞の調査/修正/実行 | 本物の正式判定が増加 |
| QA_COMPLETE | 保全・監視 | 対象外を除く全件正式解決 |

## 実行手順（Windows PowerShell 5.1）

- node scripts/qa-autonomy/root-cause-director.mjs --check
- node scripts/qa-autonomy/qa-runtime-providers/diagnose-signed-physical.mjs
- node scripts/qa-autonomy/qa-runtime-providers/activation-gate.mjs
- node scripts/qa-autonomy/all-unfinished-director.mjs --status
- node --test scripts/qa-autonomy/root-cause-director.test.mjs scripts/qa-autonomy/readiness-supervisor.test.mjs
- Get-ScheduledTaskInfo -TaskName ChatOnSteroids-QA-Driver-Readiness

start-readiness.ps1 -Dispatch は5分周期のWindowsタスクと同一mutexで、
ライブスモーク、D1修復、Workerメタデータ、証拠再試験、全件台帳、
原因ステージ分類、COS派遣を管理する。root-cause-director.jsonと
root-cause-transitions.jsonlは前進した工程を記録。
root-cause-repair-verifications.jsonlはAI完了後の独立確認を残す。

## 現時点と完成判定

- Android対象829件、正式PASS380件、未完了444件（NOT_RUN376/FAIL63/BLOCKED5）。
  既存PASSと承認済みSKIP5件は保全。
- Cloudflare QA Workerの署名・public API/Control/teat Worker修正、
  本物のES256署名と独立D1照合は実測済み。
- 最大の未解決要因は CLAIM_SCOPED_PHYSICAL_ORACLES_NOT_BOUND。
  providerはready:false、公式キュー0件であり、全件自動化はまだ未完成。
- 新規のclaim-bound-realme-webview.mjsで、現在RUNNINGの公式claimと
  排他Realme許可がある場合だけ既存WebViewのES256取得を実行する共通部品を整備。
  CDP port cleanup・claimの前後確認・TokenをNodeへ返さない契約の
  オフライン回帰テストを追加。ただし実claimを使うケース実行は未検証。
- QA UI実行は共通方針のPlaywrightを優先。Android native入力とPNG取得は
  exclusive leaseのADBで補完し、DB/署名/公式Runner証拠とは分離する。

**正式QAを自動で1件以上実行してPASS/FAILを記録し、次ケース・FAIL修正・再試験が
追加指示なしに繰り返され、444件の残件が実際に減った時点で初めて
「全件完全自動化」と判定する。**

外部認証不能や物理端末切断など真の外部依存だけは原因・試行履歴・再確認予定を残す。
秘密鍵の公開、QA署名の偽造、claim偽装、既存公式PASSの再試験は禁止。

## 2026-10-20 03:34 PHT: 依存モジュールSHAの自己復旧

- pair-source-drift-triage.mjs は全69ペアを独立に再走査し、ドライバー本体変更と依存モジュールのみ変更を区別。
- pair-module-repin.mjs はドライバー・Provisionerの元のソースSHA一致を確認し、実際のオフライン回帰を再実行した場合のみ依存SHAを再固定。旧版とテスト証拠を保存。1回最大2グループ、同一失敗を無限に再試行しない。
- テスト自体が古いペアSHAに依存する場合は、新しいペアを一時適用して全回帰テストを再実行。成功で確定、失敗で旧ペアへ自動ロールバック。
- pair-direct-reference-reconcile.mjs は旧ペアと成功証拠、現ペア有効性、fixture非実行フラグを確認したうえで、古い個別レシピ参照25件を整合させた。旧レシピは保存。
- 個別レシピが参照する新規ペアは、単体ハッシュ再固定の対象外。関連ファイルの独立レビューへ送る。ソース本体が変わった場合も無条件更新しない。
- start-readiness.ps1 の5分周期に復旧処理を接続。ダッシュボード00番は準備進捗を正式PASSと分けて表示。
- 直近実測：準備ペア一致120ケース、依存SHA再検証待ち107ケース、ソース本体再レビュー2グループ。ユーザー承認済みの準備レシピ71件は正式ランタイム未接続で保留。
- 正式PASS380件、Android未完了444件のまま。次のP0は実機claim付き操作、native PNG、署名付きbefore/after、独立checkpoint/legacy検証、fixture cleanupとofficial registryの接続。

## 09:15 PHT — 108回の無進捗監視の原因と修正

**事実：** 同じCLAIM_SCOPED_PHYSICAL_ORACLES_NOT_BOUNDを108回観測し、
正式PASS380・未完了444が変わらなかった。原因は外部鍵不足ではなく、
signed-physical-v1.mjs が最後に必ず ready:false を返す未実装状態、
および公式Runnerが生の署名/D1/Android物理証拠/cleanupの接続を
verified factoryとしてアドミットできない点だった。providerは現在も
正式claimで実証されるまでfail-closedを維持する。

**自動制御の根本問題：** 通常3回＋追加深掘り1回でCOS修正依頼を
出し尽くすとNEEDS_EXTERNAL_DIAGNOSISへ移り、その後はheartbeatのみ
増え続けていた。オフライン回帰PASSでも正式実行gateが進まないことを
検出したが、「不足する実装インターフェースへ作業を継続する」経路がなかった。

**対応：**
- official-runtime-prerequisite.mjs はこの状態を
  IMPLEMENTATION_REPAIR_ATTEMPTS_EXHAUSTED と区別し、
  単なる外部障害ではないことを明示する。
- runtime-implementation-followthrough.mjs は未接続の共通Runtimeを
  署名DBの前後読取／claim付きADB-PNG／承認済みドライバー・独立期待結果／
  runtime factory組立の4課題に分解。各課題を担当ソースのSHAで
  重複排除し、同じheartbeatだけでは再依頼しない。
- readiness-supervisor.mjs は通常修復と深掘りを使い切っても、
  これらの実装課題を次のCOS作業として自動送信する。
  開発チャット終了後にはその課題の実回帰テストを独立実行し、
  本物の実機claim/正式Runner判定がない限りready/PASS扱いにしない。
- 新規のclaim-bound-physical-pair、claim-scoped-physical-control、
  claim-scoped-reviewed-driverを個別のfail-closed部品として実装。
  いずれも公式ランタイムへ最終組立・実claim照合されるまではPASSを返さない。

**動作証拠：** 新経路の回帰53件PASS、2026-10-20 09:14 PHTの
Windowsタスク終了コード0で、次アクションが
QA_RUNTIME_IMPLEMENTATION / CLAIM_BOUND_ES256_DATA_LIFECYCLEとなり、
COSへの実装修正依頼ADMITTED_NOT_COMPLETEDを実測。
以降の依頼状況と独立検証結果はdriver-readiness-state.jsonの
runtime-implementation:* 指紋別に残す。

**残ブロッカー：** 本物のexclusive RUNNING公式claimと実機でのケース別
写真・assertion・cleanupを独立証明し、source-SHA-pinned factoryを
activation-gateで認可した後、正式Runnerで新規判定が増えること。

## 09:31 PHT — 二次復旧（全修正方法で未解決となった場合）

- runtime-implementation-followthrough.mjs：4つの実装課題それぞれに
  最大2つの独立ソース版の修正試行を認める。最初の1課題を繰り返し
  編集しても後続3課題を無期限に飢餓させない。
- unresolved-runtime-escalation.mjs：4課題が実施済みで、
  同時に未完了の作業セッションがない場合に限り、実際の
  createOfficialPairedRuntimeFactory に至る最初の失敗した統合契約を
  特定・修正する二次解析を独立して1回派遣する。
- 解析が終わっても公式Runnerの物理証拠が不合格なら、
  ENGINEERING_INCIDENT_UNRESOLVED と再開条件を永続保存する。
  未変化の監視・AIチャット終了だけで同じ解析を再発行しない。
  独立ゲート／具体的なソース版／実エラーが変わった場合は再評価する。
- REALME_DEVICE_NOT_READY はソフトウェア実装不足と区別して
  DEVICE_RECONNECT_PROOF_REQUIRED と表示する。独立ADBで端末接続が
  確認できた後だけclaim付きQAへ復帰する。端末の物理接続や
  実機PINは想像で突破しない。
- Windowsの同じ5分周期タスクで二次復旧状態を保存し、
  ダッシュボードに原因、再開条件、実機の確認が必要かを別掲する。
  次アクションの受付だけで正式PASSとしない。
- 49件の原因別・実装継続・二次復旧に関する自動回帰テストはPASS。

残る実証課題：実機が接続した状態で、真のRUNNING公式claim、排他的ADB、
実PNG、署名付きbefore/after、独立D1、checkpoint/legacy、cleanupを
source-SHA-pinned factoryが結び、最初の正式QA判定を発行すること。

## 12:29 PHT — 修正依頼の乱立をやめ、既存の責任者が解決まで追跡

以前は「3回の修復+深掘り+4つの実装+法科学調査」が終了すると、
ENGINEERING_INCIDENT_UNRESOLVED を保存した後は他のケース準備へ進んでいた。
これはユーザーの「ブロッカーを自律的に解消」という要件に不適合。

### 自動修復の責任者と完了判定

- scripts/qa-autonomy/blocker-owner-continuation.mjs：
  **同じブロッカーでは元のCOS sessionIdを引き継いで修正を継続する**。
  新しいChatGPTタスク/ワーカーを毎回作らない。
- P0 QA_PAIRED_RUNTIME_ADAPTER_REQUIRED を独立rootDirectorの
  CLAIM_SCOPED_PHYSICAL_ORACLES_NOT_BOUND として扱う。
  formal-queueの計画が失敗し deferredByReason が消失しても、
  rootDirectorで同じ未解決ゲートを検出したら責任者を解除しない。
- 既存セッションでの3つの異なる実装修正戦略：
  (1) factory/activation/registry の最初の実エラー、
  (2) 実claim付き1ケースのPNG・ES256・D1・case oracle・cleanup、
  (3) Windows taskのprovider SHA/environment/approval。
  同じ戦略の無限再発行を禁止。担当adapterソースが実際に改版されたら
  新しいソースだけを1回検証する。同じheartbeatでは再依頼しない。
- 同じセッションIDへ追加入力した場合、**過去のturn_endで新しい仕事を
  完了扱いにしない**よう、送信前の終了済みturnIdを記録し、
  追加分のturn_endのみ検出する。
- 既存ライフサイクルのFAIL修正・同じcoverage group・同じ正式
  caseも、前回の修正セッションを引き継ぐ共通責任者選択関数を導入。
  異なるcase/groupへの誤ルーティングは不可。
- rootCauseでP0が残る間は、別のケース準備AIタスクを無制限に
  追加しない。すでに受け付けたCOS作業や端末claimを勝手に中断しない。
- Windows Task Schedulerの267009 (0x41301: task running)を、
  タスク状態Readyとの表示タイミング差で異常終了と誤判定しないよう修正。
- ダッシュボードに同じ担当による修復中の戦略を表示。

### 監査

51件の関連単体・統合回帰テストPASS、公式台帳SHA不変。
readiness-supervisor.mjs の実環境read-only実行で
nextAction=BLOCKER_OWNER_CONTINUATION、
既存の統合解析COSセッションを再利用する計画を実証。
Windowsタスクは継続稼働だが、すでに許可済みの別COSターンが
稼働中なら先に終了/再照合を待つ（重複修復を発行しない）。

注意：監視と同じ担当への継続修復は改善されたが、
まだ真の共通adapter factoryがreadyになったわけではない。
必須の最終証拠は公式Runnerで1件以上の正しいPASS/FAILを記録すること。
