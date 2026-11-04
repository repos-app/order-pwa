# Stage 10 iOS ソース契約：実装と独立監査の接続（2026-10-24 PHT）

## 実証された増分と正式QAの境界

Windows `ChatOnSteroids-QA-Source-ios` が選択する先頭の5件
`QA2-KEEP-OPR-ADM-006/007/008/009/010` について、既存
`ios-void-approval-family.mjs`、`ios-void-claim-d1.mjs`、既存claimed bridgeに
実装されていた共通コードを、`ios-source-contract-registry.mjs` から直接importし、
正式831件Manifestの**各ケースの元期待条件**を照合して監査に接続した。
静的JSONの既知tap座標を作らず、実iPhone画面の矩形・現行buildの検証は引き続き
ケースごとの実行時校正を必須とする。

実行前 `ios-automation-contract-audit.mjs --once` は全813件に
`IOS_INDEPENDENT_CASE_ORACLE_NOT_BOUND` / `IOS_ISOLATED_FIXTURE_CLEANUP_NOT_BOUND`
を付け、sourceコード実装済みか否かを区別していなかった。現在は監査sidecarに
`summary.sourceAdaptersPrepared=5`、`sourceAdaptersRemaining=808` と、
この5件の `sourceContract.iosSourceAdapters=SOURCE_ADAPTERS_PRESENT_RUNTIME_UNVERIFIED`
を記録する。ダッシュボードのStage 10詳細にも**別のsource実装指標**として表示する。
実機証明のない `iosIndependentOracle` / `iosFixtureCleanup` は `NOT_BOUND`、
`automatedExecutionReady=false`、正式iOS未完了 **813**、Stage 10の独立実機契約の
完了 **0**、公式変更PASS/FAIL **0/0** を維持した。

Windows source selectorは、この5件を再依頼せず、次のsource未計上5件
`ADM-011/012/013/014/020` へ移る。
既存のsource契約が存在する別ファミリは、そのソースとManifestを個別に検証し
registryへ登録するまで「source準備済み」と数えない。

## Windowsタスクと証拠

- `ChatOnSteroids-QA-Source-ios` は Windowsタスクとして登録済み、
  `wscript.exe //B //Nologo ...hidden-task-launcher.vbs source-ios` →
  `start-source-lane.ps1 -Lane ios` → `source-lane-dispatcher.mjs` →
  `ios-source-work-selector.mjs`。タスク `LastRunTime=2026-10-24 18:39:01 PHT`、
  `LastTaskResult=0`、次回予定 `18:59:00 PHT`（2026-10-24 18時台の読取値）。
- 同時点の実行journal `source-lane-ios-state.json` は過去の5バッチを
  `CHAT_TURN_COMPLETED_NOT_QA_VERIFIED` と保持。最終実行のビジネス結果は
  `COS_CONTROL_UNAVAILABLE` / `CHATGPT_TEMPORARY_ACCESS_RESTRICTION`。
  これはスケジューラexit 0の実作業成功を意味しない。
  続く独立read-only `currentControlBlock()` の返り値は `blocked=false`、
  `inputs=50`。接続はその照会時点で回復していたが、未送信promptの実配信、
  人的実装着手または正式QAは証明されていない。
- `ios-automation-contract-audit.json` は監査CLIによってアトミック再生成済み。
  source成績と正式台帳は別ファイル。`ios/state.json` に変更なし。

## ローカル検証（実行結果）

`node --test scripts/qa-autonomy/ios-automation-contract-audit.test.mjs
scripts/qa-autonomy/ios-source-work-selector.test.mjs
scripts/qa-autonomy/ios-void-approval-family.test.mjs
scripts/qa-autonomy/ios-void-claim-d1.test.mjs` → **28/28 PASS**, exit 0。

`node --test scripts/qa-autonomy/qa-cross-platform-audit-bridge.test.mjs
qa-dashboard/automation-task-render.test.mjs
scripts/qa-autonomy/ios-automation-contract-audit.test.mjs
scripts/qa-autonomy/ios-source-work-selector.test.mjs` → **23/23 PASS**, exit 0。

`node --test scripts/qa-autonomy/ios-automation-validation-integration.test.mjs`
→ **7/7 PASS**, exit 0。二重Windows起動でsidecarが破損しないこと、
監査異常を成功に昇格させないことを含む。`git diff --check` exit 0。
これらはoffline/source回帰であり、実iPhone・D1実読戻し・正式QAではない。

実際の `makeReadOnlySnapshot()` でも
`sourceCounter=5 / sourceRemaining=808 / casePending=813 / fullStageDone=0`
`contractIntegrity=CURRENT_OFFICIAL_SCOPE / physicalProof=0` を照合（exit 0）。
この検査はdashboard用公式read-only snapshot生成のみ。

## 10回の自己レビュー（対象・結果）

1. S01：正式831 Manifestと5件の期待条件を実import関数で照合。PASS。
2. S02：ケース重複をregistryで排除。PASS。
3. S03：期待条件driftを注入し当該ケースだけsource未計上。PASS。
4. S04：必要なOracle/D1/cleanup関数欠落を注入し全件未計上。PASS。
5. S05：無関係な831件Manifestを使用しsource加点なし。PASS。
6. S06：実iPhone矩形を恒久固定JSONとして創作せず `MISSING` を保持。PASS。
7. S07：HID/DDI未実証・独立業務Oracle未実証・cleanup未実証を保持。PASS。
8. S08：source sidecarの合計とケース別source statusの件数一致を必須化。PASS。
9. S09：Stage 10本来の厳格な `automatedExecutionReady` と正式E2Eの集計を不変に保持。PASS。
10. S10：原本iOS formal 813 pending、公式0件変更、回帰exit 0、diff whitespace clean。PASS。

## 10回の横展開レビュー（異なる入口）

1. X01：既存iOS `ios-void-approval-family` のManifest guard / HID plan compilerを確認。PASS（実機PENDING）。
2. X02：`ios-void-claim-d1` のclaim+teat限定SELECT、実D1送信と証拠はPENDING。
3. X03：共通`qa-v2-ios-claimed-bridge` 呼出しを確認。HID/DDI admissionの実機はPENDING。
4. X04：`ios-source-work-selector` の未完了source再依頼防止と次5件選択、回帰PASS。
5. X05：`source-lane-dispatcher` のWindowsタスク→COSキュー到達経路を静的+実タスク情報で確認。実配信はPENDING。
6. X06：`qa-automation-backlog` の15工程Stage10 strict完了条件を維持。PASS。
7. X07：`qa-cross-platform-audit-bridge` が監査source件数を別フィールドで提示、改ざん数値をnullに。PASS。
8. X08：`qa-dashboard/app.js` の詳細表示は新規source指標を正式進捗%へ合算しない。PASS（ブラウザ描画実測PENDING）。
9. X09：`ios-automation-validation-integration` の実PowerShell実行、重複起動、失敗継続の7件。PASS。
10. X10：`ios/state.json`と`qa-v2-official-runner verify`照合、過去iOS PASS12・BLOCKED2を変えない。PASS。

未解消：現iPhoneでの画面校正、署名済みTestFlightビルド/端末、HID/DDI、
公式claim、業務DB/監査の独立実証、実cleanup、正式判定の連続実行。
今回、本番D1、Android実機、iOS実機、Apple、Git push、公式台帳は操作していない。

## 継続実装：ADM-011/012/013/014/020（同日追加）

既存 `scripts/qa-autonomy/ios-void-race-family.mjs` の **本物のcallable**
`makeIosVoidRacePlan`、`verifyIosVoidRaceManifest`、
`createIosVoidRaceOracle`、`cleanupIosVoidRaceFixture`、`runIosVoidRaceCase`
を確認した。実iPhoneの校正済み矩形を受け取るプランと、画面/独立D1/外部同時実行
イベントの照合を要求するOracleが既に存在する。ケース固有の単発driverを増殖させない。

従来は外部 `readOwnedOrder` の注入だけで、注文のレシート紐付けと永続イベント件数を
実際の独立チャネルで取得するsource adapterが無かった。今回追加した
`scripts/qa-autonomy/ios-void-race-claim-d1.mjs` は、先行5件で実証済みの
`ios-void-claim-d1.mjs` が実行する **claim確認付き / teat専用 / read-only**
注文・従業員・監査ログSELECTをそのまま再利用し、`receipt_order_links` と
`receipts` の `store_id`/`receipt_no` 複合結合から、注文専用レシートを最大3行
SELECTする。戻り値を最大1件・正しい注文・正しいテナントに制限する。

さらにサービス実装は `servedEffectCount`、`voidEffectCount`、
`checkoutEffectCount`、`finalizeCallCount` を注文statusやHID操作回数から推測せず、
別の `readDurableEvents` Providerによる実ログ証拠を**必須**としている。
このProviderは `INDEPENDENT_DURABLE_EVENT_LOG`、店舗・注文・ケース・
正式claim・DB識別・phase・別readId・SHA-256識別・全4件数の厳格な整合を
満たす必要があり、欠落、曖昧なreceipt、異店舗、失効claimでは即FAILする。
**実ログprovider自体のiPhone実行中の接続・信頼性と元イベントの証明は未実証**。
そのため、このソースを正式独立Oracle実行済み・HID成功と扱わない。

Registryはこの5件のソースに、直接importした `claimed D1 adapter` を紐付けた。
`ios-automation-contract-audit.mjs --once` の再生成値：

| ソース指標 | 継続前 | 今回 |
| --- | ---: | ---: |
| sourceAdaptersPrepared | 5 | **10** |
| sourceAdaptersRemaining | 808 | **803** |
| iOS正式未完了 | 813 | **813** |
| Stage10 full E2E done | 0 | **0** |
| physicalHidCasesVerified | 0 | **0** |
| formal iOS PASS/FAIL追加 | 0/0 | **0/0** |

次のsource未登録5件は `ADM-021/026/027 / BILL-002/003`。現在登録された先頭
10件について、**業務Oracleのcallbackがsourceにあること**と、現時点で
**外部実行callbackが正式claimに結合されたこと**は別の事実として保存する。

### 実際の検証

- `node --test`（source auditor/selector、approval/claim-D1、race/claim-D1）:
  **49 tests PASS / 0 FAIL / exit 0**。元契約全5件、スクリーン/権限不正、
  実D1 SELECTと同形のmock、照会失敗、永続イベント実証の欠落、別注文、失効claim、
  cleanup拒否、ノー正式PASSを検証。
- `node --test`（dashboard/cross-platform監査、Windows実行検証）:
  **17 tests PASS / 0 FAIL / exit 0**。WindowsのPowerShell 5.1起動、
  並列起動時atomic sidecar、失敗伝播、別計測UIを検証。
- Windows `ChatOnSteroids-QA-Source-ios`: 2026-10-24 **18:59:01 PHT**
  最終実行、`LastTaskResult=0`、`NextRunTime=19:19 PHT`、missed=0。
  実行アクションは `wscript.exe ... hidden-task-launcher.vbs source-ios`。
  Scheduler exit0はソース編集・COS配信・正式QAの証明ではない。
- 実機・Apple/TestFlight・Remote D1・正式QA台帳への新規操作なし。
  `git diff --check` exit0（共有作業木の既存PS1にLF/CRLF警告あり）。

### 継続差分の10観点自己レビュー

1. S01：831正本から011/012/013/014/020の元checkpointを動的照合、PASS。
2. S02：既存HID計画compilerが画面解像度・現行build・UI矩形を要する、PASS（実機未測定）。
3. S03：race Oracleがbefore/after/finalizeを外部承認する構造とrestoreAfterFailureを確認、PASS（実機未測定）。
4. S04：外部race controllerは画面SHA・独立矩形承認を確認する前には開始されない、PASS。
5. S05：新source readerの固定SQLはteat専用・注文キーallowlist・SELECT限定、PASS。
6. S06：元読取のclaim/DB identity/actor監査照合を再利用、再評価済み、PASS。
7. S07：receiptは `receipt_order_links JOIN receipts` の正しい実スキーマを使う、PASS。
8. S08：永続効果は実ログProviderが無ければreject、D1 statusから水増ししない、PASS。
9. S09：他店舗receipt/重複receipt、欠落readId、SHA不正、失効claimに負例回帰、PASS。
10. S10：source+5、Stage10 E2E・公式PASS追加0を分離、49+17テスト終了コード0、PASS。

### 継続差分の10観点横展開レビュー

1. X01：先行ADM006-010の独立D1パスと共通化、既存テスト6件PASS。
2. X02：claim端末シリアルのiOS shared build inspector依存を維持、実端末PENDING。
3. X03：Native `admin.html` のvoidフロー再利用、現物矩形校正PENDING。
4. X04：KDS `updateOrderStatus` の状態ガードと負例を照合、実競合PENDING。
5. X05：`src/orders.js` のatomic void+audit、DB識別一致を静的確認、実競合PENDING。
6. X06：`src/billing.js` の `receipt_order_links` INSERT、レシートの注文関連SQL一致確認。
7. X07：`migrations/0011_receipt_refunds.sql` の複合PKとJOIN列一致、PASS。
8. X08：`migrations/0029_critical_state_invariants.sql` のguardは一時的で効果履歴ではないため件数の代用から除外、PASS。
9. X09：既存 `qa-automation-backlog.mjs` は本来のStage10 E2E done条件を変更していない、PASS。
10. X10：Windows Source-ios selectorから次の5件が選ばれ、dashboard source件数と正式欄が独立、PASS。
