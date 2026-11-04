# izakanpai Android QA — 6項目の追加改善実装・検証記録

更新日：2026年10月11日（PHT）

### 最新ランナースナップショット（11:06 PHT）

正式2,080件：PASS 407、FAIL 220、BLOCKED 288、SKIP 100、NOT_RUN 1,065。**判定済みはPASS+FAIL+BLOCKED=915件（44.0%）**。SKIPは確定判定に加算しない。直近の増加はSKIP6件であり、PASS/FAILの増加は確認されていない。実機は旧プロセスPID 7212で巡回中、Emulatorはホスト空き1.49 GiBで低メモリ安全停止中。新コードの実機効果は未検証。

## 安全境界

同時稼働しているAndroid実機・Emulatorと正式2,080件runnerは本作業で**操作・停止・初期化・編集していない**。ソースと独立したローカル回帰テストだけを変更。commit/push/本番deploy/Worker/D1 migration/Android APKインストールは行わない。現在動くプロセスは起動時コードを保持しているため、次回QA所有者の安全な起動までは新しいスケジューラーが適用されたとは言えない。

## ① 無成果巡回を段階的に抑制（実機・Emulator共通）

- `scripts/android-qa-route-yield-gate.mjs` を実装。実行しても**正式ケースのPASS/FAILが増えなかった**画面だけ、同じ画面で2回確認後に20分→60分→120分の上限付きバックオフを設定する。
- `scripts/android-qa-windows-driver.mjs` に統合。ケースIDと正式ステータス、承認済みレシピ、再試行可否、画面/ドライバー/observerの更新日時を合わせた署名が変わったら即再評価する。
- 明示的な個別テスト指定、`once`実行、非記録モードでは自動抑制せず、ユーザーが狙った検証を省略しない。PASS/FAILは重複なしの対象ケースID遷移のみで判定し、SKIPや他ケースの進捗を成果に数えない。
- バックオフは**プロセス内メモリのみ**。プロセス再起動でリセットされ、正式runnerを書き換えない。

## ② Emulatorで無意味な4回観測を省略

- `scripts/android-qa-observation-plan.mjs` を追加。実装済みの実機観測器で判定可能な `44px` ボタン、入力ラベル欠落、管理画面の決済表示と、Emulatorの入力制約候補を正式runner/staging両方で照合する。
- 保留ケースが一つもない画面では、4区画のCDP/ADB observerを実行しない。入力制約だけ残る画面は、その観測だけを行い、関係のないautopilotプロセスを起動しない。
- 正式ケース全体の全条件を満たさない限りPASSにはせず、客観的な不具合を確認したFAIL候補だけ扱う既存の証拠基準を維持。
- 端末メモリ不足時のEmulator停止規則を優先し、勝手な再起動・追加エミュレーター起動はしない。

## ③ 未対応テストの実装拡張（安全な範囲）

- 前回追加済みの `scripts/android-qa-safe-case-assessor.mjs` は、完全な実機観測があれば未実行 `PT-SCR` 10ケースの正式条件を独立照合できる。`scripts/android-qa-evidence-verifier.mjs --plan` でケース定義ハッシュ・必要21観測を確認できる。
- 今回、`scripts/android-qa-safe-target-preconditions.mjs` を新規追加し、打刻メモ欄、在庫移動の数量/原価/理由、新規日英カテゴリの6ターゲットを安全な操作前提として識別可能にした。**フォーカスだけで保存・打刻・在庫操作を実行しない。**
- 未承認レシピは承認状態を維持し、新規の全部入り実機PASSを捏造しない。複合テストの完全な実機手順・安全審査を要するケースは残件として明示する。

## ④ 安全なQA専用テストデータの準備・復元

- `scripts/android-qa-fixture-datasets.mjs` は、empty/single/normal/large/long-text/ja/en の7条件をメモリ上で生成する。すべて合成の `QA_TEST_STORE_*` 店舗IDを保持。
- `scripts/android-qa-fixture-transaction.mjs` は同じメモリ内でのstage/検証/rollbackを提供。商品・注文・明細の同店舗外部キー、重複ID、異なるstore_id、改ざん、checksum不一致を拒否し、元データを変更しない。
- D1や実店舗への投入を行うには**別途QA環境の明確な隔離、既存データのスナップショット、戻し確認、正式承認**が必要。現時点での実機QAへのデータ注入はしていない。

## ⑤ 非表示入力欄を理由別に診断

- `scripts/android-qa-input-eligibility.mjs` とドライバーの読取専用DOM検査を強化。PH労務欄、入場料/延長料、打刻モーダル、在庫入出庫モーダル、在庫の入荷/廃棄タブ、カテゴリ「新規」選択欄の各条件をCSS表示状態を見て区別する。
- 非表示/操作不能時は `NOT_PROVEN` と理由を報告する。アプリ設定やフォーム値の勝手な変更は禁止。`test/android_qa_input_probe_conditional_test.mjs` で本番ドライバーが生成する同じJS式をfixture DOMに対して検証。

## ⑥ APK・修正管理・再検証連動

- `scripts/android-qa-apk-readiness.mjs` がソースとAndroid取り込み資産のSHA-256差とローカルAPKの鮮度を読み取り専用でチェック。
- `scripts/android-qa-retest-readiness.mjs` が障害スナップショット・バックエンド修正管理表をケースID単位で重複排除し、修正済み候補・release/install待ち・実機PASSを分離する。
- `scripts/android-qa-live-retest-dashboard.mjs` は**最新の正式runner**に対して障害スナップショットをケースIDで照合。最新FAIL、スナップショットにない新規FAIL、修正候補のままFAIL、元FAILからPASSへ移ったが実機・APK証跡が不足するケース、修正後実機PASSを別々に集計する。単に旧FAILが消えても「実機再検証済み」としない。
- `docs/ANDROID_QA_APK_RETEST_PLAN_20261011.md` にリリース順序とAPK / Cloudflare Worker / D1 migrationの前提を記載。**修正ソースがあるだけで実機PASSとは判定しない**。
- 実機でのインストールバージョンが未確認のため、修正版APKのインストールと正式FAIL再実行はまだ実施していない。

## 推奨ローカル回帰テスト

```powershell
node test/android_qa_route_yield_gate_test.mjs
node test/android_qa_observation_plan_test.mjs
node test/android_qa_safe_target_preconditions_test.mjs
node test/android_qa_input_probe_conditional_test.mjs
node test/android_qa_fixture_datasets_test.mjs
node test/android_qa_fixture_transaction_test.mjs
node test/android_qa_retest_readiness_test.mjs
node test/android_qa_live_retest_dashboard_test.mjs
node test/android_qa_safe_case_assessor_test.mjs
node test/android_qa_evidence_verifier_test.mjs
node test/android_qa_runner_guard_test.mjs
node test/android_qa_emulator_lane_test.mjs
node --check scripts/android-qa-windows-driver.mjs
```

確認できる監査コマンド（本番/端末を操作しない）：

```powershell
node scripts/android-qa-evidence-verifier.mjs --plan
node scripts/android-qa-retest-readiness.mjs
node scripts/android-qa-live-retest-dashboard.mjs
node scripts/android-qa-apk-readiness.mjs
```

### 制約

本対策の**コードが通ること**と、正式runnerの確定件数が実際に増えたことは別。安全な次回QA起動、最新QA APKの検証と実機証跡が揃うまで、削減効果・修正完了・端末PASS件数は未確認として扱う。
