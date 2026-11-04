# IZK-UT-097 — Windows正式QAの自動実行が実行条件不足で停滞

状態: OPEN / 区分: QAインフラ・自動化 / 重要度: Critical / 検出: 2026-10-25 PHT

## 事実と再現

- 2026-10-25 14:21 PHT、既存 `ChatOnSteroids-QA-*` 11件はすべて Windows Task Scheduler 上で Disabled。`Formal-Queue` 直前の終了コードは `2`。
- `resume-scheduled-qa.ps1 -Apply` 実行後、11件すべて Ready に戻った。`Formal-Queue` は 14:33:35 にタスクから起動したが、終了コード `2`、出力 `NO_USER_AUTHORIZED_CASE_READY`。同時の公式Android台帳は PASS383、FAIL62、RUNNING0。正式判定増分0。
- Realme ADB 接続・QAアプリ前面・承認済み署名APK・teat D1 read・QA Worker ES256 smoke の成立を別々に確認。smokeは正式QAではない。
- `--plan --user-authorized`: 実行可能0、`QA_PAIRED_RUNTIME_ADAPTER_REQUIRED` 76件。そのうちソース契約未成立59、共通Fixture接続欠落7、追加の複数端末/署名付きOracle条件など10。
- `root-cause-director.json`: device/db/signer/liveIssuer/factory=true、claimBoundPhysicalEvidence=false、runnable=false。同じstageの掃引247回でも正式増分0。
- CoS入力3件が12時間近く未配送。コントロールAPIはconnectedだが3入力は元conversationId不在、配送完了・実作業の証拠なし。

## 修正内容と検証

- 無効化された既存タスクのActionと停止マーカーを検証して11件の登録を再有効化。変更失敗時には部分ロールバックする復旧スクリプトを追加。
- 正式Queue/Source/Runtimeについて原因別復旧ルーティング、実作業のない終了コード0の再分類、子プロセス単位の5分無進捗終了の共通監督を改修。これらの実運用成功は各タスクの再走行と正式台帳の増分にて継続検証する。
- 真正なD1 SELECTのタイムアウトだけ、正式claimを再検証後に最大1回再実行。認証・SQL・claim失権を再試行しない。既存ES256公開鍵を保持。
- ダッシュボードに共通環境の6条件・未充足ケース数・claim付き実機証拠・鮮度付き実行可能件数・最終異常・各ケース不足条件を表示。保留期間超過時は以前の可実行件数を使わない。
- ソース・UI回帰は13/13 PASS（Chromiumで公式両OSケース1254未完了・15工程を照合）。D1+Fixture重点ソーステスト21/21 PASS。これらは正式PASS/FAILではない。

## 修正対象のソースレビュー10項目（S01-S10）

1. S01: 共通device/db/signer/liveIssuer/factoryとclaimBoundPhysicalEvidenceを区別。最後がfalseならREADYにしない。テストPASS。
2. S02: 共通診断が15分を超過した場合UNKNOWN扱いにし、未確認を正式実行可能として表示しない。テストPASS。
3. S03: 正式Queue診断が10分超過した場合runnableCasesをnullにし旧値0/1を現在値として扱わない。テストPASS。
4. S04: AndroidとiOSを別tierで診断し、iOSにAndroidの証拠を転用しない。既存ケース投影テストPASS。
5. S05: ケースごとのmissingConditionsを公式未完了一覧・対応するautomation IDと照合する。実台帳スモークPASS。
6. S06: claim証跡未成立時でもES256/D1 smokeのみの結果を正式判定に変換しない。実台帳監査・テストPASS。
7. S07: 公式PASS/FAIL増分はrun ID/manifest同一性と正式判定日付のある変更のみ集計。テストPASS。
8. S08: 旧PASS移行を新規実行PASSと誤計上しない。テストPASS。
9. S09: 除外 `QA2-KEEP-PT-INP-0344` は既存除外集合から保持し、他ケースの投影を継続。既存投影テストPASS。
10. S10: 台帳読み込みの投影はread-only。Android/iOS公式stateの前後バイト同一性を実台帳スモークで確認、PASS。

## 同種事象の横展開ソースレビュー10項目（H01-H10）

1. H01: Windows監視のReadyと実際のformal claim/verdictを分離。現実の終了コード2と台帳増分0を照合。
2. H02: ADB PATH欠落でもSDK絶対パスの実機接続診断が成立することを実測。
3. H03: D1 SELECT retryは一時的タイムアウトのみ最大2実行、DB更新や認証失敗時には再実行しない。テストPASS。
4. H04: claim失権後の2回目D1 SELECTを拒否。テストPASS。
5. H05: ES256署名自称のレスポンスをOracleで承認しない。FixtureソーステストPASS。
6. H06: Fixtureの所属店舗・所有者・case/claim境界を共通契約で確認。FixtureソーステストPASS。
7. H07: CoS HTTP受付・ブラウザ配送・本当の編集完了を混同しない。監査値は未配送3件で表示。
8. H08: 画面の未成立条件表示は `textContent` 経由とし、不正なHTMLとして解釈しない。JS構文PASS。
9. H09: 両OS全件1254・15工程の旧UI保持と進捗の重複計上なしをChromium E2Eで確認、PASS。
10. H10: ダッシュボードAPIは正式台帳の内部verdict fingerprintを公開しない。HTTPテストPASS。

## 残る合格条件と取扱い

上記20件はソース契約のレビューです。正式QAの実機反復20回を実施したという意味ではありません。正式に合格するには共通Fixtureの実運用Callback/claim-linked signed-D1 Oracleと物理 gesture/PNGを成立させ、1件以上を正式Runnerで実行し独立照合で判定追加し、次ケースへ自動進行する必要があります。未実施・未承認の作業は引き続きOPEN。

## 2026-10-25 16時台：手動QAブロッカー調査（本チャット追記）

- 利用者のWindowsタスク停止方針を実環境で照合した結果、11件の `ChatOnSteroids-QA-*` はまだ `Ready` で、実際の次回トリガーが設定されていた。既存11件を `Stop-ScheduledTask`（Runningの場合のみ）および `Disable-ScheduledTask` で無効化し、`Get-ScheduledTask` により **Disabled 11件**を読み戻した。以降、Windowsタスク起動・再有効化を行わず、診断とチャット起点の安全な実行に限定。
- `node scripts/qa-v2-official-runner.mjs verify`: Android **PASS383/FAIL62/BLOCKED5/SKIP5/NOT_RUN376**、iOS **PASS12/BLOCKED2/SKIP5/NOT_RUN812**。AndroidはRUNNING0、直近2時間の新規正式判定0。正式台帳・manifestは直接編集していない。
- 実機接続、承認済みAPK、ストアteatの利用条件は成立しているが、`node scripts/qa-v2-realme-unattended-pilot.mjs --plan --user-authorized` は承認候補76件を全件 `QA_PAIRED_RUNTIME_ADAPTER_REQUIRED` により繰延べ、実行予定0。これは診断修正によって正式ケースの実行数が増えたことを意味しない。
- 診断自体の偽原因を除去：`qa-v2-admission-diagnose.mjs` の旧 `scripts/qa-v2-*` 限定正規表現は正式admissionが認める `scripts/qa-autonomy/qa2-*-driver.mjs` を98件も `SCRIPT_PATH_NOT_ALLOWLISTED` と誤分類していた。正式admissionと共通の `safeScript` を再利用し、claim-scoped案件では過去APK版だけで拒否しない。対象ケース単位のdata/driver準備を評価し、QA所有の動的店舗契約と `executable:false` を反映。
- 修正後 `admission-diagnosis.json` 353レコード：SOURCEチェックPASS相当47、driver module-tree drift189、driver source drift30、既判定52、準備不足3、SOURCE ONLY明示10、module-tree例外4、script SHA欠落9、script許可外5、module-tree SHA欠落4。**47は正式admission確定件数でも新規正式PASSでもない。**
- `qa-v2-throughput-monitor.mjs` は上記実際のdrift原因を取り込み、AndroidのNOT_RUNを `PREPARED_PIN_STALE=191`、`PREPARED_DRIVER_REPAIR=31`、`PREPARED_WAITING_RUNTIME_PROVIDER=39`、その他54/32/17/9/1に分類。旧文言の「providerフォルダが存在しない」を実際のclaim/D1/fixture未充足条件へ修正。SHAを自動更新して信頼判定を飛ばす処置は行っていない。
- `qa-v2-realme-unattended-pilot.mjs` のsource-complete generic casesは `recipe.fixtureMode` を `none` / `ordinary` へ変更されてもcase-owned共通Runtimeの不足でpreclaim deferする。既存source-only recipeから正式claimへ誤入場する抜け道を閉じる修正。
- テスト：`node --test scripts/qa-v2-realme-user-authorized-admission-detail.test.mjs scripts/qa-v2-realme-user-authorized-admission.test.mjs` **25/25 PASS**、`node --test scripts/qa-autonomy/qa-runtime-providers/paired-case-contract.test.mjs scripts/qa-autonomy/official-runtime-registry.test.mjs` **25/25 PASS**、対象 `.mjs` 構文と `git diff --check` exit0。これらはソース回帰であり正式QA判定件数に加算しない。

### 今回のソース自己レビュー10観点（端末QAと分離）

| ID | 実際に確認した境界 | 検査結果 |
| --- | --- | --- |
| S01 | 正式admission `safeScript` と診断 `safeScript` の実装一致 | 同一関数をexport/import、既存許可例で回帰PASS |
| S02 | 非claim-scoped旧directの許可範囲 | 旧 `qa-v2-*` のみを維持、qa-autonomy scriptを拒否する負例PASS |
| S03 | path traversalで任意スクリプトへ到達しないか | `../secrets.mjs` は不許可、負例PASS |
| S04 | claim-scoped案件の旧APK build情報の扱い | 現行署名APKを独立検証、過去のrecipe build mismatchを入場理由にしない既存テストPASS |
| S05 | 実機シリアル・物理レーンの検証 | source診断は `android-physical` と許可Realme serialを照合、既存admissionと一致 |
| S06 | QAデータの店鋪分離 | `isValidClaimScopedStoreContract` を共通参照、teatおよび限定的な動的onboarding storeだけ許可 |
| S07 | 兄弟ケースの未完成が準備済みケースへ連座しないか | 正式admissionと同じ単独rowの `validateDataDriverPreparation` を使用 |
| S08 | source-onlyのphysical claim回避 | `executable:false` を診断し、正式admissionも入場を拒否する既存回帰PASS |
| S09 | driver本体SHAとimportツリーSHAの同一性 | どちらのdriftも診断に残し、黙って再pinしないことをコードで確認 |
| S10 | unbound generic fixture種別の改ざん | `fixtureMode:none/ordinary/undefined` の3負例で共通runtimeをpreclaim defer、PASS |

### 今回の横展開ソースレビュー10観点（正式QAとは独立）

| ID | 関連ソース・影響面 | 検査結果 |
| --- | --- | --- |
| H01 | `qa-v2-throughput-monitor.mjs` のstale分類 | 新しい `DRIVER_MODULE_TREE_CHANGED` / `DRIVER_SOURCE_CHANGED_SINCE_PIN` を拾うよう修正 |
| H02 | 同monitorの準備不足分類 | allowlist/ハッシュ不備、実行不可フラグと準備エラーをdriver repairへ振分け |
| H03 | 同monitorのruntime文言 | 実在するproviderフォルダの不在という誤説明を除去 |
| H04 | `qa-v2-realme-unattended-pilot.mjs` のpreclaim gate | global registry登録だけではgeneric caseがRUNNINGを獲得しない回帰PASS |
| H05 | `paired-case-contract.test.mjs` の他10 family | caseごとにsource欠落を先に照合し、generic fixtureを流用しない回帰PASS |
| H06 | official runtime registryのsigned readback/physical proof | trusted registryの独立証拠を要求する既存回帰PASS |
| H07 | QA除外ケース | `QA2-KEEP-PT-INP-0344`/`0363` の明示除外はadmission内に残存 |
| H08 | 同一ケース複数source owner | `qa-source-coverage-selection.mjs --duplicates` に既存重複あり。別案件のownerを勝手に書換えない、未解消として保全 |
| H09 | 公式Android/iOS台帳への副作用 | 修正対象はソースと診断出力だけ。両OS `verify` 前後件数不変、正式PASS増分0 |
| H10 | Windowsタスク/CoS transportへの影響 | 修正側でタスク登録/起動を行わず、11件Disabledを維持。CoS配送停滞は別の外部ブロッカーとして保留 |

残条件：source pin drift 191件は各関連差分・group regressionを確認してから修正。実機正式判定の最優先条件は、claim-owned fixture操作/独立D1・ES256業務オラクル/画面操作を接続し、正式Runnerで少なくとも1件の完全判定を得ること。診断やソーステストのPASSを代用しない。

### 実際のRuntime仮有効化を使った追加の判別

- `node scripts/qa-autonomy/qa-runtime-providers/activation-gate.mjs` exit0、`admitted:true`、`admissionPhase=PRECLAIM_SOURCE_AND_ISSUER_CAPABILITIES`、`officialClaimVerified:false`。これは既存QA用ES256/D1/実機接続の**事前能力登録**であり、ケース実行を意味しない。
- Windowsタスクを触らず、**当該PowerShell子プロセスだけ**に `QA_OFFICIAL_RUNTIME_PROVIDER=scripts/qa-autonomy/qa-runtime-providers/signed-physical-v1.mjs` と上記activation-gateが示すSHA256を設定し、`node scripts/qa-v2-realme-unattended-pilot.mjs --plan --user-authorized` を実施後、環境変数を削除。結果は `runtimeProvider.ready=true`、`reason=PROVIDER_ADMITTED`、物理Realme接続と署名APK確認true、それでも `pending=0`、`deferredRuntimeCases=76`。内訳はSOURCE契約未成立59、generic fixtureの認証・独立業務callback不足7、BILLING090のQA Fixture/二端末契約不足5、RACE318の第二actorとES256/D1未接続5。
- したがってグローバルproviderの事前登録のみで実行可能数は増えず、ケース単位の正式業務契約が次の確定ブロッカー。Workerを再デプロイしたり公開鍵を再生成する操作は今回行っていない。実行可能0の状態で`--run`を強行していない。

### Realme正式claimを取得した安全な実機試行

別担当による `QA2-KEEP-OPR-REC-004` の直接実機試行では、承認APK `910027`・物理Realme `0O64B26I28103F70` で**公式RunnerのRUNNING claim取得**、WebView `currentStoreId()=teat` と `authReady=true` を確認。Settings `tableLabelEn` を `Table→TableQA` で保存、QA専用remote D1で更新値を独立SELECTし、Back→再openでも `TableQA` が再表示された。さらに実機UIで元の `Table` に戻し、remote D1で復元確認。記録は `test-results/qa-v2-evidence/worker2-realme-rec004/physical-attempt.json` と同フォルダ内の実機PNG17件。

ただし、このケースは承認済み独立Oracle `test/plans/qa-approved-oracles/QA2-KEEP-OPR-REC-004.json` がなく、critical negativeCases および Back直後の時間測定などの全検証に未到達。**正式PASS/FAILは不可**として公式Runner `release` でclaimを解放。最終 `NOT_RUN` であり、実機で部分的に確認できたことを正式PASS数へ加算しない。承認済みOracle一覧とAndroid未実行の交差は1件のみ（`QA2-NEW-ONB-004`、別種の新規店舗作成前提）。既存の共通Oracleが広範に未整備であることを次の本質的ボトルネックとして把握。

### Windowsタスクの停止が維持されない事故への独立ガード

停止確認後の再照会で11件がすべて`Ready`へ戻り、実際の直近起動時刻も付いていた。タスク再開スクリプト `scripts/qa-autonomy/resume-scheduled-qa.ps1` には明示的な `-Apply` で11件を有効化する経路がある一方、Windows Task Scheduler Operationalログから起動元は取得できず、今回の再有効化元は確証なし。11件を**再度Disabled**にした上で、別のチャットからの正式QAを阻害しないスケジューラ専用 `.qa-v2-official/qa-windows-tasks-paused-by-user.json` を新設した。

- `hidden-task-launcher.vbs`: 11件のタスクに共通の最上位起動口で専用停止マーカーを検査し、発見したら子プロセス実行前にexit3。
- `start-scheduled-qa-supervised.ps1`: スーパーバイザ起動前と実行直前・実行中に停止マーカーを検査。動作中のタスクだけを停止し、独立した実機QAのPIDには触らない。
- `resume-scheduled-qa.ps1`: `-Apply` による再有効化を専用停止マーカーがある間は拒否。利用者が明示的に再開を承認するまでは停止が優先。
- 実測：PowerShellパーサ2ファイル共にエラー0件、`cscript.exe //Nologo ...hidden-task-launcher.vbs dashboard` exit3、`start-scheduled-qa-supervised.ps1 -Mode source-driver` exit3、`resume-scheduled-qa.ps1 -Apply` exit1 / `QA_WINDOWS_SCHEDULE_USER_STOP_ACTIVE_CANNOT_RESUME`、Windows Scheduler全11件Disabledを再確認。正式Runnerのpausedフラグと直接claim経路は変更していない。

停止ガードのソース自己レビュー10観点（いずれもソース検査、実機QAとは別）：S01 user要求に合う独立停止契約、S02 11共通VBS起動口適用、S03 VBSで子プロセス生成前判定、S04 PowerShell supervisor初期判定、S05 spawn直前の再判定、S06 実行中2秒の再判定、S07 タスク自身のPIDツリー限定kill維持、S08 再開用Applyの停止拒否、S09 PS5.1構文を実際に解析、S10 3経路の負例実行で全拒否を確認。

停止ガードのソース横展開10観点（正式テストと独立）：H01 dashboard、H02 continuity-observer、H03 driver-readiness、H04 formal-queue、H05 runtime-blockers、H06 task-work-validation、H07 source-pairs、H08 source-driver/source-data、H09 source-evidence/source-ios、H10 resume-scheduled-qa。H01–H09は11タスク共通の`hidden-task-launcher.vbs`の既存Select Case routeで停止判定より後にchild launchすることを確認。H10は`-Apply`事前判定を負例実行、拒否確認。
