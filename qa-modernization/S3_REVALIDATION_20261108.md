# S3 変更影響監査・ブラウザ全ケース再検証（2026-11-08）

## ダッシュボード親子表示（追加）

- **npmテスト親1登録コマンド**：`node --test test/menu_bulk_delete_browser_test.mjs`。S3子ケース72件は親を展開して確認し、npmの登録分母には加算しない。
- **表示場所**：「詳細テストケースを見る」→「npm テスト」→「S3：親1コマンドの子72ケースを見る」。3画面別の子ケース結果・実行時間・証拠ログ・履歴を確認できる。現行証拠は`/api/s3-npm-children`で判定し、古いソースのPASSは`STALE_SOURCE`として扱う。実行当時のログは過去履歴に残る。
- 既存の`/api/test-catalog`登録行数、親npmの`NOT_VERIFIED`などの正本判定、旧正式OS別QA台帳は変更しない。実行履歴の過去PASSを新しい正式PASSとして数えない。

## 判定

**S3_PARTIAL_COMPLETE_WITH_FULL_MENU_BROWSER_PASS**。S3の未完走だったメニュー画面テストを、既存の共通テスト定義を変更せず画面ソース別に実行し、**現在の登録72ケース（3画面×24）の完全PASS**を取得した。旧「60ケース／100秒上限で45件まで実行」の記録は削除しない。完走済みの全72ケースと、過去45件の部分進捗は同じPASS件数として重複しない。

## 実行と証拠

| 確認対象 | 実際の結果 | 証拠 |
|---|---|---|
| mobile-app/webメニュー画面 | 24/24 PASS、0FAIL、0SKIP | `test-results/qa-modernization/s3-menu-mobile-20261108.log` |
| docs/yuwakuメニュー画面 | 24/24 PASS、0FAIL、0SKIP | `test-results/qa-modernization/s3-menu-yuwaku-20261108.log` |
| docs/yuwaku/testメニュー画面 | 24/24 PASS、0FAIL、0SKIP | `test-results/qa-modernization/s3-menu-yuwaku-test-20261108.log` |
| 72ケース証拠独立照合 | 72/72 PASS、0失効 | `test-results/qa-modernization/s3-menu-full-20261108.json` |
| 共通カテゴリー／テナント実業務／在庫一括／AI財布関連 | 31/31 PASS（初回1FAIL修正・再実行） | `test-results/qa-modernization/s3-source-contract-smoke-20261108.log` |
| RevenueCat課金・Sandbox保護 | 30/30 PASS | `test-results/qa-modernization/s3-billing-qa-20261108.log` |
| 委託報酬・レディースドリンク業務とUI | 36/36 PASS | `test-results/qa-modernization/s3-commission-related-20261108.log` |
| 新しいコミッションドリンク共通JSの3面一致／選択／追加料金 | 2/2 PASS | `test/auto-ci/commission-drink-shared-ui-contract.test.mjs` |
| QAダッシュボードのカタログ／実Chromium | 2/2 PASS | `test-results/qa-modernization/s3-catalog-qa-20261108.log` |
| シャード検証の虚偽PASS防止・UTF-16LE対策 | 1/1 PASS | `test/auto-ci/s3-browser-coverage.test.mjs` |

**検出・復旧実績：** テスト用の注文レンダラ実行環境で、追加された`hasOrderOptions`と`commissionDrinkModeFor`が未定義だったため1件FAIL。実製品は変更せず、オプションなし・コミッションOFFというテスト前提に合う共通補助関数を仮想環境へ渡した。31件を再実行し31/31PASS。モバイル版メニュー画面が初回PASS後に並行編集されたため、証拠検証が正しく`STALE_SOURCE`を検出。既存ログを`s3-full-browser/historical-.../`へ保全し、影響した**1画面24件のみ**再実行し、最終72/72有効PASSへ復帰した。

**テスト環境の境界：** 72件は実Chromiumとテスト用RPC応答（モック）によるUI操作検証。実Worker/D1 readback、BLE/StoreKit、実メール、実AIサービスの合格とは認定しない。業務側の真正API/DBテストはS4/S5/S6の独立レーンに分離。

## ソース全体・変更影響（監査時点のスナップショット）

- 追跡ソース：**2,586ファイル**。変更・追加対象：**44ファイル**、うち高優先度の変更：**28ファイル**。
- テストファイルの直接参照候補なし：**6ファイル**。いずれもQA画面/監査スクリプトの領域であり、**高優先度28ファイルで直接参照0のものは0件**。
- 初回の直接参照漏れ3ファイル（`commission-drink-settings.js` の3画面）は、同一ソース・HTML読み込み・有効/無効・一括料金・0料金の共通UIをテストし、変更影響候補を再検出できるよう改善した。
- `s3-source-audit.mjs`の差分取得を`git diff HEAD`へ変更し、未ステージだけでなくステージ済みの変更も検出する。既存のソース契約（カテゴリ管理RPC＋3画面）は**1/1 PASS_SOURCE_CONTRACT_ONLY**。
- 原本：`test-results/qa-modernization/s3-source-audit-current-20261108.json`。作業ツリーは他の開発作業でも更新されるため、上記件数は**監査時刻の値**であり固定進捗ではない。

## S3残件（次工程へ引き継ぐ前に明示）

1. ソースファイル名の参照候補と実際の業務テスト網羅率は同義ではない。複数の関数・条件分岐の意味的同等性を自動証明する仕組みは未完了。S3の一次監査を**全機能PASSへ昇格させない**。
2. ソース変更時のテスト選択精度（誤選択・漏れ）、差分解析に基づく実行計画の自律運用の全機能適用は未確認。今回の高優先度28ファイルに対するテスト参照候補ありは**実行PASS28件**を意味しない。
3. 実D1とローカルSQLite／隔離workerdの差、全UI画面・生成AI/メール・物理端末の真正性はS4〜S7へ、全npm／CI一致・リリース停止ゲートはS8〜S9へ引き継ぐ。
4. 並行ソース変更後は、`node scripts/qa-modernization/s3-browser-coverage.mjs --verify` で失効を検出し、`--run-affected` で**失効/FAILした画面群だけ**を再実行する。将来の完全実行は`--run`（新しい証拠ディレクトリ）を使う。古い証拠や旧正式1,659 OS別判定は上書きしない。

**正式OS別QA新規PASS：0件。** 変更のコミット・プッシュ・Worker反映、実機実行・正式承認はこのS3再検証には含まれない。

## 2026-11-08｜S3の追加完了条件（変更影響分析・選択根拠・未カバー検知）

先述の「残件」は以前の監査時点の記録。今回のS3工程スコープは「実際のテスト選択規則を正しく説明・可視化し、漏れ・未カバー・過去証拠を誤認しないこと」と定義する。全機能の挙動をS3だけで証明する条件にはしない（S4〜S7担当）。

| S3完了条件 | 実装・判定の根拠 |
| --- | --- |
| ①選択精度 | 既存の `classifyChanges` / `selectImpactedCommands` / `selectPrecommitTests` / `modePlan` をそのまま呼ぶ `s3-impact-map.mjs` を追加。メニュー変更→S4固有5件、コミッション変更→S4固有1件。無関係な認証/会計スモークの不選択、未知ソースは安全側にALL。コミット時のテスト追加実行なし |
| ②実効性の区別 | QAダッシュボード `/#s3ImpactMap` に「ソース→コミット時自動発見→S4業務ケースの期待結果・検証方法・現行証拠→Push時npmスモーク→静的参照候補」を表示。静的参照だけで意味的網羅やPASSを主張しない。S3別回帰証拠もS4証拠から独立表示 |
| ③未カバー検知 | `src/commissionDrink.js` のようなS4未割当は `S4_BUSINESS_SCENARIO_NOT_MAPPED`。新規未割当で参照0なら `NO_S4_CASE_AND_NO_SOURCE_REFERENCE`。ソース変更のCI分類が未知ならALLへフォールバック。欠落・失効証拠はPASS扱いしない |

検証対象：`test/auto-ci/s3-impact-map-contract.test.mjs`、`change-impact-selection.test.mjs`、`precommit-auto-gates.test.mjs`、`s3-unmapped-source-probe.test.mjs`、`s4-execution-gate.test.mjs`、`qa-dashboard/test-s3-impact-map-live.test.mjs`。最新の対象ユニット結果 **27/27 PASS**、実Chromium画面 **1/1 PASS**、FAIL0。既存のS3 UI72件と未割当12件の実証とは分母を混ぜない。実Chromiumでは `src/commission.js`、`src/menuCategories.js`、`src/commissionDrink.js` の切替・期待結果・未割当・API入力検証・JSエラーなしを確認。

**この限定されたS3完了条件3/3は充足。工程スコープ内の進捗を100%と評価可能。** 全ソース・全条件分岐の真の業務テスト網羅率が100%という意味ではない。S4未割当の機能固有API/E2E、外部D1/課金/BLE/物理端末・S8の全件npm/リリースゲートは後続工程の未完了条件として残す。旧正式OS別QA・本人実機判定の新規PASSは0。commit/push/Worker/ストア配布は未実施。
