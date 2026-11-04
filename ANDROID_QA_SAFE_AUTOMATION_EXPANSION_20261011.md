# izakanpai Android QA — 安全な自動化追加とSKIP削減（2026年10月11日）

## 実装概要

本作業は共有ワークスペースへの**ローカルソース追加とテストのみ**。端末・Emulator・稼働中プロセス・正式runner・レシピ承認状態・APK・本番D1・Cloudflareには手を触れていない。commit / push / deploy なし。

### 1. 未実装の画面テストに対する厳密な自動判定

- `scripts/android-qa-safe-case-assessor.mjs` は正式2,080件の`SCREEN`系シナリオを解析し、完全な観測証拠が提供された場合に限りPASS/FAILの**判定候補**を返す。
- 2026-10-11 10:37 PHTのrunnerでは、新たにオフライン判定器の対象になった `NOT_RUN` ケースが **10件**：`PT-SCR-007`、`009`、`013`、`025`、`031`、`037`、`043`、`053`、`071`、`083`。同じ接頭辞 `PT-SCR-` の省略表記。
- 正式画面テストは、`empty`、`single`、`normal`、`large`、`long-text`、`ja`、`en` の**7データ条件 × 上部/中央/下部の3位置 = 21個**の独立した実機観測が必要。CSS/viewport、見切れ、Safe Area、ヘッダー、入力欄・ボタン・日付・金額、モーダル、スクロール等の完全性を検証する。
- 全条件の画像/メタデータを持たない場合、またはアプリ、APK、ケースID、画面、データ条件、観測時刻、実機出自が不一致の場合は `NOT_PROVEN`。**自動的なPASSへの昇格はなし**。
- `scripts/android-qa-evidence-verifier.mjs` は現行runnerと外部で取得した観測結果を**読み取り専用**で照合するCLI。結果はあくまで候補。正式runnerへの記録件数は常に0。

```powershell
# ケース定義と候補・ハッシュを読み取り専用で表示:
node scripts/android-qa-evidence-verifier.mjs --plan

# QA実機で独立して安全に取得・審査済みの21観測×ケースのJSONがある場合だけ:
node scripts/android-qa-evidence-verifier.mjs --evidence C:\path\to\reviewed-evidence.json
```

使用する証拠ファイル形式は `{ "cases": [{ "caseId": "PT-SCR-007", "evidence": { "provenance": {...}, "observations": [...] } }] }`。現時点では観測結果を自動で収集・投入する端末操作や、実機に設定データを適用する機構は実行していない。**10ケースの実機テストが完了したという意味ではない**。

### 2. QA専用の合成シナリオデータ

- `scripts/android-qa-fixture-datasets.mjs` は7種類の画面用fixtureを**メモリ上でのみ**生成する。`empty` 0件、`single` 1件、`normal` 12件、`large` 100件、`long-text` 長文12件、`ja` 日本語12件、`en` 英語12件。
- `QA_TEST_STORE_A` / `QA_TEST_STORE_B` のような予約された合成店舗IDのみ受け付け、商品・注文・明細の全レコードに `store_id` を設定。参照先も同一店舗のものだけ許可。
- **実データ・ユーザー・D1・端末に注入する機能ではない。** 実機QAの本番環境や別店舗データに影響を与えないための作業用fixture。
- リアルな画面シナリオ成立のためには、別途レビューされたQA専用環境でのfixture投入・確認が必要。

### 3. SKIP・NOT_PROVEN原因別の再検証キュー

- `scripts/android-qa-skip-action-plan.mjs` は正式 `SKIP` と、**実際のスキップ試行証拠がある `NOT_RUN` のみ**を重複除外して優先順位付けする。
- 10:41 PHTの再照合では94件の正式SKIPと6件の証拠付きNOT_RUN、合計**100件**を対象にした。分類は入力/フォーカス43、画面データ条件・複合証跡35、回転19、その他未分類3。初期の「ナビゲーション36件」という分類は、正式SKIPの説明文を移動エラーと誤解していたため是正した。**国別条件の確証があるケースは0件**であり、画面名 `profit_sim.html` だけから国依存と決めつけない。実行ログ/runnerが変われば件数も更新される。
- 危険なレシピの自動承認・実行をしない。特に設定 `onchange` による保存、認証・パスワード、全件削除、Bluetooth接続、国/表示設定変更は手動安全審査へ分離。
- `NOT_PROVEN` をPASSにもFAILにも加算しない。状態は元のrunnerの `NOT_RUN` または `SKIP` のまま。

```powershell
node scripts/android-qa-skip-action-plan.mjs
```

### 4. 未実装テストの規模

`scripts/android-qa-coverage-audit.mjs` による先行棚卸しでは全2,080件に対して、承認済み実行ハンドラーの存在205件、実行ハンドラー追加が必要562件、実機/複合操作814件、環境依存499件だった。これは能力区分であって、実行済み件数やPASS数ではない。**今回の10ケースは新しい厳密な判定器の対象であり、全自動で21の実機証跡を収集する実行エンジンの完成ではない**。

## ローカル確認

```powershell
node test/android_qa_safe_case_assessor_test.mjs
node test/android_qa_evidence_verifier_test.mjs
node test/android_qa_fixture_datasets_test.mjs
node test/android_qa_skip_action_plan_test.mjs
node test/android_qa_runner_guard_test.mjs
node test/android_qa_emulator_lane_test.mjs
node --check scripts/android-qa-evidence-verifier.mjs
```

テスト内の架空証拠によるPASS/FAILは判定器の仕様検証専用であり、実際のrunnerに加算していない。

## 実機適用までの未完了作業

1. QA専用環境で7種類のfixtureを実際の画面へ安全に適用・復元する手順と、実機/Emulatorの各端末の所有者・隔離を審査する。
2. 同一APKのハッシュ、ケース定義、表示条件、21観測の事実を確認する。既存のrunnerは停止・初期化しない。証拠の真偽を単なるJSONプロパティで代用しない。
3. 既存の修正版APKはソースとビルド日時が異なるため、QA用APKの再ビルド/導入の許可取得後に実機再検証する。
4. 実機で全シナリオを検証した結果のみ、既存のガード付きrunnerの正式PASS/FAILとして反映できる。修正済みというだけでPASSにはならない。
