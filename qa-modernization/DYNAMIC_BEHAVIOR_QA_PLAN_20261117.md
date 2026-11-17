# Izakanpai 全修正共通・動的Behavior Contract QA 計画（2026-11-17）

## 状態・目的

- **現在の状態：第1段階のローカル試験実装済み。全修正への必須適用・本番リリース照合・正式実機QAは未実施。** 第1段階の実装範囲と未対応を末尾に追記。
- 原因事例 IZK-UT-180/185：DB入場時刻は初回注文へ変更された一方、UIは保存済み人数をロックした。旧UIテストとChromiumテストは「保存直後のロック」を正解と扱った。
- 目的：今後の修正・機能追加・障害対応で、実装だけが更新されても「要求どおりに変化し、維持部分が壊れていない」証明なしでは完了扱いにしない。
- 制約：既存の共通 CI / S4 / S5-S6 / QA runner / NG remediation / 証拠管理を再利用。新しい専用ランナーを機能ごとに増やさない。GitHub Actions に一般QA/ビルドを依存させない。モバイルビルド・配布、正式QA、ユーザー承認は既存許可境界を維持。

## 現存資産と不足

| 既存資産 | 再利用 | 現存の不足点 |
| --- | --- | --- |
| scripts/ci/change-impact.mjs | 変更ファイル、機能ドメイン、参照元の選択 | ファイル差分で意味上の仕様変更までは確定不可 |
| scripts/qa-modernization/business-journey-review.mjs | 実装が影響する業務シナリオ候補を提示 | 候補は実行ケースでも独立した期待値でもない |
| scripts/ci/behavioral-test-admission.mjs | 新規コード／APIに実行可能テストの参照があるか検査 | 旧期待値のままPASSする問題は判定不可 |
| scripts/ci/run-auto-discovered-tests.mjs | 選択された単体／契約／高速回帰を既存レーンで実行 | テスト自体の誤った期待値を判定しない |
| scripts/ci/s4-execution-gate.mjs + s4-mutation-audit.mjs | 独立API/DBオラクル・負例注入 | 仕様変更に応じた「オラクル期待値の差分」は未保証 |
| scripts/qa-modernization/revalidate-affected-chromium.mjs | 実Chromium操作、画面・DB証拠の再検証 | 画面テストが旧仕様を期待していてもPASSする |
| scripts/qa-modernization/qa-remediation-gate.mjs | NG分類→根因・変更証拠→新しいPASS証拠を照合 | そもそも仕様どおりのオラクルが無いNG見逃しは防げない |
| .githooks/pre-commit / ローカル runner | 実行の入口と差分ゲート | 新しい「要求→独立オラクル→検知能力」ゲートが必要 |

## 提案する唯一の共通機構：Behavior Contract

修正受付時に、ユーザー要求・既存承認仕様・障害再現手順を根拠として、実装から独立した契約を1件以上発行する。原則として既存業務シナリオ（S4/S5/S6）の条件を更新し、機能専用ハードコードを避ける。

契約フィールド（案）：

```yaml
change_id: IZK-UT-185
source_requirements: [IZK-UT-180, IZK-UT-185]
domain: ORDER_ENTRY
actor: staff
trigger: party_size_saved
preconditions: [table_selected, active_orders_count=0]
expected_ui: [party_count_enabled=true, change_button_visible=false]
expected_db: [party_size_persisted=true, entered_at=0]
preserve: [store_isolation, order_pricing, saved_count, auth_rules]
transition_after: first_order_committed
expected_after: [party_count_enabled=false, entered_at_started=true]
negative_controls: [reintroduce_saved_count_lock]
surfaces: [native_webview, yuwaku_web, yuwaku_test]
owners: [S5-PARTY-LIFECYCLE-042]
risk: high
```

- 契約作成のアシストはAIが可能。ただしAI生成値を「確認済み仕様」に自動昇格しない。既存明示仕様と矛盾する場合は `SPEC_CONFLICT`、曖昧なら `SPEC_REVIEW_REQUIRED` として証明を止める。
- 契約の期待値の作成元（ユーザー要求・過去承認・以前の契約）を保持。製品コードや現在の挙動から期待値を自動コピーしない。
- 仕様に触れない内部リファクタリングも、既存の関連契約を `PRESERVE` として選択して照合する。
- 旧契約の期待値を変更する場合、新旧diff、変更理由、関連issue/依頼の参照を記録する。期待値の無根拠な書換えを禁止。

## 動的な実行パイプライン

1. **差分→変更候補**：git staged/worktree + source dependency + 画面ルート/API/DBカラム/利用機能を既存 change-impact / journey-review で収集。追加だけでなく削除・条件式の変更を含む。
2. **契約更新の必要性検査**：変更候補と既存契約を突合して、「変更すべき条件」「変えてはいけない条件」を列挙。画面動作・API返却・保存・権限・状態遷移の変更があり契約差分が無ければ `EXPECTED_BEHAVIOR_UNVERIFIED`。業務意味変更無しの根拠がある場合のみ preservation 契約で通す。
3. **ケース生成**：共通シナリオに前条件→操作→UI/API/DBオラクル→後続操作→再読込を埋め込む。通常/異常、未登録→登録→再編集→確定、競合、再送、取消、期限切れ、言語、店舗、端末サイズをリスクに応じて選択。組合せ爆発を避け、境界値・pairwise・高リスク完全列挙。
4. **テスト検知力の検証**：既存のS4 mutationと本件の負例方式を共通アダプターに統合。変更仕様ごとに最低1件の旧不具合・誤実装のfaultを隔離して注入。正実装PASSかつ負例FAILを証拠とする。負例がPASSした場合は `TEST_ORACLE_INEFFECTIVE` としてゲートFAIL。
5. **対象レーン実行**：既存auto-CI/S4/Chromiumのファイルとケースを影響元に紐付けて起動。単純な静的チェックを業務PASSと数えない。ソース+契約+fixture+runnerのhashが一致するPASSのみ再利用。
6. **失敗を継続処理**：既存qa-remediation-gateに PRODUCT/TEST/ENVIRONMENTを記録。根本原因＋修正差分＋対象ケース再実行PASS＋悪影響なしをセットで照合。FAILが1件出ても独立実行可能な他ケースを継続。過去の同一失敗を無限再実行しない。
7. **反映証明**：リリースmanifestで `source_sha` / `contract_sha` / `test_sha` / `web_asset_sha` / `worker_version` / `mobile_build_id` と対象環境を結び、ローカルPASSと本番動作確認を混同しない。

## ゲートと成果物

| ゲート | FAIL条件 | 完了に必要な証拠 |
| --- | --- | --- |
| CHANGE_CONTRACT_GATE | 仕様変更の根拠・契約diff不足／期待値がコード由来／未承認競合 | 要求→旧期待→新期待→維持条件の紐付け |
| ORACLE_ADMISSION_GATE | 影響を受けた契約に実行可能なUI/API/DB assertionがない | Assertion ID＋実行ケースID＋対象環境 |
| ORACLE_KILL_GATE | 間違った実装・旧バグを注入しても関連テストがPASSする | mutation識別子、予想FAIL、実測FAIL |
| IMPACT_EXECUTION_GATE | 必須影響ケースのFAIL / NOT_RUN / STALE / 証拠欠落 | ソース/fixture/契約一致の新規証拠 |
| RELEASE_PROVENANCE_GATE | 反映環境のbinary/asset/Workerが検証済みソースと一致しない | ビルド/デプロイIDと実環境読み戻し |
| FORMAL_QA_GATE | 正式実機検証やユーザー承認をソースPASSで代替 | 実機証拠・正式台帳の明示的PASS（対象時のみ） |

状態は `REPORTED → SPEC_READY → CODE_CHANGED → TEST_VERIFIED → READY_FOR_DEPLOY → DEPLOYED → DEVICE_VERIFIED → ACCEPTED` に分ける。自動遷移はハッシュと実証のあるものだけ。未実行をPASSへ補完しない。

## 優先度と運用負荷

- **P0**（決済、注文/人数、料金、権限、テナント、削除、同期）：必須状態遷移＋DB/権限負例＋実Chromium。リリース版での再検証が必要。
- **P1**（管理画面、設定、言語、UI導線）：通常＋境界＋再読み込み＋差分画面操作。表示変更のみなら既存画像/UI契約を再利用。
- **P2**（文言や内部整理で挙動不変）：構造/ローカライズ/既存preserve契約の差分実行。無関係なS4/S5全走は不要。
- 通常はローカルPCで差分実行。定期フル回帰は別系統で監視。GitHub Actionsで一般QAやアプリビルドを動かさない。

## 段階導入・完了条件

1. **第1段階：独立仕様契約の導入** — 現行案件・重要機能の仕様を既存S4/S5レジストリへ紐付け、契約diff・未マッピング検出を実装。実装完了条件＝契約が無い変更では明確なFAILが出る。
2. **第2段階：汎用オラクル生成／mutation** — 既存シナリオのテストadapterに導入。旧仕様期待値を入れた例と、正/負両方を試す。完了条件＝既知の故障サンプルを検出でき、正常ケースを不当にFAILにしない。
3. **第3段階：既存ローカルQAゲートへ接続** — pre-commit / ローカルrunner / QAダッシュボード。完了条件＝未カバー・無効Oracle・ stale PASS・NG未修正がそれぞれ個別のFAILとして可視化される。
4. **第4段階：リリース証明・横展開** — Worker/Web/アプリビルドが許可された際だけreadback照合。P0から順に他ドメインへ導入。完了条件＝検証済みソースと配布版の不一致を検出し、未配布は未完了のまま保持。

## 評価指標（設計目標であり現時点の実績ではない）

- 変更影響で生じた契約未マッピング：**0件**（変更完了ゲート）。
- 必須仕様assertionの実行率：**100%**（未実行はPASSしない）。
- P0契約の旧不具合・誤実装mutation検知率：**100%**（注入した故障に対して）。
- NGを修正せずに完了へ移した件数：**0件**。
- staleなソースで再利用したPASS：**0件**。
- リリース対象でソース・アセット・実環境の照合が欠落した完了判定：**0件**。
- 正式QA増分：正式ケースの証拠を満たしたPASS/FAILの実数のみ。

## 実装時の禁止事項

- AIが現行コードを読んで「期待動作」を捏造し、そのままテストをPASSさせること。
- テストが通るように承認済み期待値を書き換えること。
- コード行数やテスト登録数をユーザー受入・正式QAの進捗へ換算すること。
- 1ケースの異常で全作業を止めたり、同じ原因で無限再試行したりすること。
- GitHub課金エラーを一般QA稼働の前提にすること。
- ユーザー指示のないモバイルビルド・TestFlight配布・正式QA承認を代行すること。

## 2026-11-17 第1段階の実装・検証記録（ローカル試験導入）

- 継続管理番号：`IZK-UT-188`（全修正共通・動的Behavior Contract QA。試験導入済み、全機能適用未完了のためOPEN維持）。
- 新規共通契約正本：`docs/qa-modernization/behavior-contracts.v1.json`。ユーザー要求 `IZK-UT-185` の注文前/初回注文後/最終注文取消後のUI/DB期待値、維持条件、対象ソース範囲、S4/S5/auto-ciオラクル、旧不具合への負例を定義。製品実装ファイルから期待値を生成しない。
- 共通判定器：`scripts/ci/behavior-contract-gate.mjs`。`--changed` / `--staged` / `--ci --base=<SHA>`、`--enforce=registered|all` に対応。Git diffの変更行と各契約の対象関数領域を突合し、未対応ソースは既存 `business-journey-review` のワークフロー情報から `SPEC_REVIEW_REQUIRED` の契約ドラフト候補を出力。**候補の期待値は `null` であり、候補を実行PASSへ加算しない。**
- 仕様改訂防止：契約の期待値・スコープ・維持条件・テスト/負例の定義を変更する場合、revisionと根拠文の変更を必須化。元契約削除、検証マーカー消滅、対象ソース範囲消滅をFAIL。AIでユーザー承認そのものを代行しない。
- テスト接続：`test/auto-ci/party-size-picker-ui.test.mjs` と既存実Chromium `S5-PARTY-LIFECYCLE-042` が同じ独立期待値を読み、旧保存済み人数ロックを注入した負例を継続実行。S5独立証拠のsourcePathsに契約JSONと判定器を追加し、契約変更時には旧Chromium PASSを再利用できない。
- 既存入口：`.githooks/pre-commit` の `business-journey-review` と `behavioral-test-admission` の間へ `--staged --enforce=registered` を追加。**既存の他作業を妨げない登録済み関数領域の試験適用**。`--enforce=all` は全未契約ソースをFAILする厳格モードだが、他作業者の未完了差分にはいきなり強制しない。
- 登録外の変更は緑の包括保証にせず `KNOWN_SCOPE_ADMITTED_UNMAPPED_REMAIN`。同時編集中のローカル差分でソース変更29ファイル、**登録済み契約に属する変更行のあるファイル4件、未契約変更行のあるファイル29件**を検出し、29件の仕様レビュー候補を作成。4ファイルは契約領域以外の変更行も含むため両方に登場する。旧「4件カバーだから他の同一ファイル変更もPASS」という集計を防止。厳格 `--enforce=all` は未契約変更29件に対し実際にexit1/FAIL、登録済み領域モードでは未契約ありを報告しつつ既存並行作業を遮断しない。
- 共通ゲートおよび変更影響・人数UI/APIの焦点回帰：**40/40 PASS、FAIL0**（既存の関連ケースを含む）。本番相当Chromium+隔離SQLite `S5-PARTY-LIFECYCLE-042` 1/1 PASS（実機QAではない）。個別の重複実行件数を合計しない。
- **次の実作業**：P0ドメインの未契約仕様を根拠付きで埋める、汎用負例/オラクル証拠を独立したリリース判定へ連結する、ダッシュボード表示、検証済ソースと実配布版の照合。全件のユーザー承認・正式QAを自動作成しない。
- Git commit / push / Worker / D1反映 / モバイルビルド・配布は未実施。正式実機QA増分0。既存未コミット差分は保護。

## 2026-11-17 第2段階：P0注文・会計・権限・削除に共通契約を横展開（IZK-UT-188）

- 契約数 **1→5**。`IZK-UT-185`（人数ロック）に加え、`IZK-UT-145`（注文応答不明時のstaff-only読戻し）、`IZK-UT-105/115`（PHP/JPY VAT・SC・割引の二重計上禁止）、`IZK-UT-009`（新画面/直接RPCの未承認権限拒否）、`IZK-UT-039/172`（店舗削除時の物理削除完了証明、所有者識別情報消去、他店舗不変）を登録。
- 共通契約は元の問題報告と製品コードから独立した期待値を保持。実装変更から期待値を自動生成しない。各契約は source scope・保持すべき不変条件・業務/WEBテスト・旧挙動への負例を保持。既存の自動/業務/実Chromiumテストを再利用しており、機能専用ランナーは増設していない。
- **誤実装の故障注入検知**：注文readback未確認を強制成功扱い、内税VATを二重加算（Native/Web本番/Web TEST 3画面）、保護ページRPCの拒否条件を迂回、未retired状態のControl DBを早期消去。正しいソースでは業務オラクルPASS、故障注入したソースでは同じオラクルが意図通りFAILとなる。
- `contractAutoOraclePaths` を既存 `run-auto-discovered-tests.mjs` のCI/ローカルprecommit両方へ接続。契約JSONの更新だけでも **5領域すべての既存auto-ciオラクル/負例**が差分実行候補に入る。ソース単位でも関連契約だけを選び、会計修正で店舗削除テストを無条件に選ばないことを検証。未登録仕様の候補は `SPEC_REVIEW_REQUIRED` のまま。
- S5実ブラウザ会計PHP/JPY、権限RPC全否認、人数ライフサイクルでは、契約JSON・契約ゲート自身のSHAを正式なsourceHashes対象へ追加。`S5-PARTY-LIFECYCLE-042` の独立証拠検証にも `preOrderEditable`・`firstOrderLocksHeadcount` の必須trueを追加し、以前の不足した業務要件を証拠側で見逃さない。
- **ローカル実績**：関連契約・画面/権限・読戻し・Control DB削除のNode焦点回帰 **46/46 PASS**。既存の会計全組合せ＋SQLite確定レシート＋印字整合の大きな総合回帰は **193/193 PASS**。共通差分セレクタの回帰 **35/35 PASS**。いずれも重複するテストを合算しない。実Chromium **S5-CHECKOUT-PHP-003 / JPY-004 / PARTY-LIFECYCLE-042 / RPC-PERMISSION-MATRIX-044の4/4 PASS**。独立 `latestChromiumResults` の最新source SHA照合で4件とも `INDEPENDENT_CHROMIUM_EVIDENCE_VERIFIED`/`sourceFresh:true` を再確認。正式iOS/Android QA PASS追加0。
- **実際に検出・修正した証拠問題**：S5独立証拠の検証条件を強化後、以前の4ケースが `STALE_SOURCE` と正しく判定される状態を確認。変更された `s5s6-evidence.mjs` だけが差分と特定し、同じ4ケースを再実行して上記の現行SHA一致を確定した。古い成功証拠をPASSとして流用していない。
- **残件**：`--changed --enforce=all` は現行並行変更ソース30ファイルのうち、契約に含まれる変更領域9件を検知した一方、契約対象外変更行は30ファイルに残存し、意図どおり `FAIL`/exit1。これは同一ファイルに登録範囲/未登録範囲の双方が存在するため矛盾ではない。全機能への契約付与、`--enforce=all` の正式precommit必須化、契約実行証拠とリリースSHA照合、QAダッシュボード表示、配布済みアプリ実機確認は**未実施**。
- **今回も未実施**：コミット・プッシュ、Worker/本番DB反映、モバイルビルド/配布。IZK-UT-188をOPEN維持し、他作業者のdirty差分を保護。

## 2026-11-17 第3段階：基準差分30ファイルの契約網羅とstrictローカル必須化

- **比較基準の固定**：当初の未契約30ファイルを `272d7c5dd632d5b380f3ab1596b564a3380edad4` からの製品差分で継続評価。作業中、別作業者の `37020ac0f65a55f568a571e69fdefd8c1991f34c` コミットによって元のstaged差分がHEADへ入ったため、`--changed` の見かけの0件を改善成果として数えていない。`node scripts/ci/behavior-contract-gate.mjs --ci --base=272d7c5dd632d5b380f3ab1596b564a3380edad4 --enforce=all` に切替えて同じ30製品ファイルで再判定した。
- **契約1→9件の段階実績**：第2段階の5件に加え、`IZK-UT-184`（同一リリース通知集約とレビュー済み具体的変更の保持・3画面キャッシュ一致）、`IZK-UT-181`（正常8時間セッション期限切れは障害ERRORではないが認証拒否を保持）、`IZK-UT-161`（クライアント診断送信中の中立UIとACK依存）、`IZK-UT-048`（提供済注文取消で実際の過去在庫消費を一度だけ返却）をユーザー要求/既存業務シナリオに紐付け追加。既存185・145・105も改訂理由と出典を記録し、人数ロック・独立会計・staff-only readbackの対象関数を適切に細分化した。実装コードの変更だけから期待結果を自動捏造しない。
- **同一条件での未契約ファイル数**：30 → 19（更新通知）→ 12（人数・会計の既存契約拡張）→ 2（診断/在庫返却）→ **0 / 30**。現在のstrict差分判定は **9契約・81スコープ適合検出・未対応変更ファイル0・パッチ位置未検証0・ブロック0・exit0・`ADMISSION_READY_NOT_EXECUTION_PASS`**。81は契約領域へのマッチで、正式テストPASS件数ではない。独立証拠 `test-results/qa-modernization/ci-gates/strict-final-validation.json`。
- **実装した共通再発防止**：`.githooks/pre-commit` を `--staged --enforce=registered` から **`--staged --enforce=all`** に変更。将来、新しい未契約変更行が生じたらレビュー必要と判定し、既知機能の別関数を誤って一括カバーせずコミット前でFAILする。複数の互いに重ならない関数領域を1契約へ追加できる共通検証を導入し、重複した領域はFAIL。契約の改訂履歴は `verifyContractRevisions` で維持。既存 auto-ci・S4・S5 の実行基盤をそのまま使う。
- **独立Oracle/故障注入**：`P1_MUTANT_RELEASE_REPEAT`（同じ変更の重複）、`P0_MUTANT_NORMAL_EXPIRY_AS_ERROR`（正常認証失効を障害計上）、`P1_MUTANT_DIAGNOSTIC_DISCLOSURE`（送信中のエラーログ名漏れ）、`P0_MUTANT_VOID_RESTOCK_SIGN`（返却が再消費になる）を追加。正実装でPASS・意図的に誤った実装でFAILすることを確認。
- **今回の実行証拠**：Node契約/注文/通知/診断/在庫焦点 **28/28 PASS**、クライアント診断既存レーン **224/224 PASS**（重複計上しない）、strict/ソースマッピング回帰 **15/15 PASS**。S4独立SQLite業務 `S4-RECIPE-VOID-060` と `S4-PARTIAL-SERVED-VOID-064` の対象テスト **2/2 PASS**、偽造在庫返却/他注文取消を拒否。Chromium独立証拠 **S5 PHP/JPY/人数ライフサイクル/権限 4/4 PASS**、4ケースとも `sourceFresh:true` / `INDEPENDENT_CHROMIUM_EVIDENCE_VERIFIED` を再実行確認。第2段階の会計全パターン193/193は既存実行記録であり、今回の重複ない新しいPASSへ加算しない。
- **完了境界と残件**：今回の30ファイル差分の仕様契約照合とローカルprecommitコード改修は完了。実際のGit commitでフックを通した運用実証、全機能全経路の要件網羅、QAダッシュボードへの契約不足表示、検証したローカルソースと本番Worker/端末ビルドの版一致、ユーザー端末での正式QA判定は**未完了**。正式実機QA PASS増分0、契約の登録自体は正式な要求承認ではない。コード・テスト・台帳はローカル保存、今回の作業からcommit/push/Worker/D1/アプリビルド/配布は実施していない。並行作業者の差分は保全し、`IZK-UT-188` はOPENのまま。
