# izakanpai — 変更影響テスト実行の共通化 (2026-11-08)

## 実施範囲と原則

- 共通分類：`scripts/ci/change-impact.mjs`。新しいソース・画面・不明な依存先・共有基盤・DB変更は **ALL** に倒す。ドキュメントのみは **NONE**。
- 独立したS4の47業務ケース選定は既存の`s4-execution-gate.mjs`を保持。テストの業務オラクルや正式QA台帳は変更しない。
- 自動検出テスト：`run-auto-discovered-tests.mjs` の`--precommit` / `--ci`で同じ分類を使う。
- 既存npm smoke：`run-project-test-pipeline.mjs --ci-smoke --impact`で同じ分類を使う。完全なnpm回帰の226手順の原本は変更しない。
- UI：`run-impacted-ui-gates.mjs`でHTML/共通UIに影響があるときだけ既存の言語・ヘッダー・三つの視覚回帰を呼ぶ。
- Worker：`deploy-impacted-workers.mjs`のWorker依存グラフ／D1マイグレーション安全検査を維持。影響のあるauto-ciとsmokeを行い、従来のGAS互換572項目は共有基盤・DB・未知変更の場合に実行する。
- 夜間業務回帰：既存の`.github/workflows/s4-isolated-business-nightly.yml`（02:00 Asia/Manila）を維持。フルnpm回帰は既存タグ／手動ゲートを維持。
- Source/CI PASSは実機正式QA PASSではない。未コミットの他担当ファイルには手を触れず、CIのクリーンcheckoutで確定検証する。

## 影響確認の例

| Changed path | auto-ci選択 | npm smoke選択 | 備考 |
| --- | --- | --- | --- |
| `src/menuCategories.js` | 関連メニュー／在庫 | 4/19 | メニュー並べ替え＋下流 |
| `src/billing.js` | 関連会計／コミッション | 4/19 | フロントのみの在庫監査を除外 |
| `src/gasApi.js` | push-safe全件 | 19/19 | 共通入口 |
| `src/newUnmappedBusiness.js` | push-safe全件 | 19/19 | 未知・選定漏れ防止 |
| `docs/order/new-order.html` | push-safe全件 | 19/19 | 未分類の新規画面 |
| `README.md` | 0 | 0 | 非実行文書 |

## 検証結果と未完了

- 影響選択／既存ワーカーグラフ／既存S4ゲート周辺のnode:test群：35/35 PASS（途中の異常を修正後）。
- `src/billing.js`に相当する既存npm smoke：4手順／4手順PASS。記録：`test-results/ci-impact-billing-smoke-v2.log`。
- 先行する広めの対象選択では、無関係な別担当による編集中の`inventory.html`検査にFAILが1件あり、フロント専用監査をバックエンド変更から分離して再実行。
- 同時編集されていたコミッション画面が生成済みAndroid資産と不一致で、別の実行でコミッション自動テスト2本がFAIL。基礎コードの正式結果としてPASSにはしていない。原因は他担当の変更中ソースであり、本改修で対象ファイルは変更しない。
- GitHub Actions実機実行（コミット／push前）、Worker本番デプロイ、iOS/Android実機QAは **未実施**。
- 同一SHAのGitHub CI成功証拠によるリリーステスト省略は **未実装**。信頼できるCI成功レコードとリリース時のSHA照合がない状態でJSONファイルを根拠にPASSを再利用しない。

## ローカル再検証

```powershell
node --test test/auto-ci/change-impact-selection.test.mjs test/auto-ci/auto-discovery-contract.test.mjs test/auto-ci/precommit-auto-gates.test.mjs test/auto-ci/test-lane-policy.test.mjs test/auto-ci/s4-execution-gate.test.mjs test/release_worker_impact_test.mjs
node scripts/ci/run-auto-discovered-tests.mjs --ci --changed=src/billing.js --list
node scripts/run-project-test-pipeline.mjs --ci-smoke --changed=src/billing.js --list
node scripts/run-project-test-pipeline.mjs --ci-smoke --changed=src/billing.js
node scripts/ci/run-impacted-ui-gates.mjs --ci --changed=mobile-app/web/admin.html --list
```
