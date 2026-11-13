# S3 ソース監査・変更影響と自動テスト実行結果

記録日時: 2026-11-07T12:35:21.845Z

**S3判定:** INITIAL_REGRESSION_TIMEOUT_OR_FAILURE_KEPT_IN_HISTORY

## 登録ソース・変更影響

- 調査対象の既存コードファイル: 2528
- 現在のソース変更・新規ファイル: 31
- P0優先の変更: 9
- テストファイル直接参照候補なし: 9
- 現行の登録テスト件数: 1881
- 直接参照候補は **機能のPASSでも期待値同等性の証明でもない**。AIのレビュー候補。
- 契約監査: 1 / 1 (SOURCE CONTRACT ONLY: 実ブラウザ/DB/ネイティブの保証ではない)。

## 実際に実行した既存回帰テスト

| テストファイル | 結果 | ケースPASS | ケースFAIL | 経過ms | 証拠ログ |
|---|---|---:|---:|---:|---|
| test/menu_category_management_test.mjs | PASS (exit 0) | ? | ? | 309 | test-results/qa-modernization/s3/run-0.txt |
| test/menu_bulk_delete_browser_test.mjs | FAIL (exit null) | ? | ? | 100021 | test-results/qa-modernization/s3/run-1.txt |
| test/menu_bulk_state_backend_test.mjs | PASS (exit 0) | ? | ? | 222 | test-results/qa-modernization/s3/run-2.txt |
| test/ai_credit_wallet_ui_test.mjs | PASS (exit 0) | ? | ? | 187 | test-results/qa-modernization/s3/run-3.txt |
| test/izk_ut_085_billing_qa_activation_test.mjs | PASS (exit 0) | ? | ? | 52922 | test-results/qa-modernization/s3/run-4.txt |
| test/common_tenant_real_business_e2e_test.mjs | PASS (exit 0) | ? | ? | 1200 | test-results/qa-modernization/s3/run-5.txt |
| qa-dashboard/test-catalog-live.test.mjs | PASS (exit 0) | ? | ? | 19212 | test-results/qa-modernization/s3/run-6.txt |

## 失敗後の別手法による再検証（過去のFAIL履歴は残す）

| 対象 | 結果 | ケースPASS | ケースFAIL | 経過ms | 証拠 |
|---|---|---:|---:|---:|---|
| test/menu_bulk_delete_browser_test.mjs | PASS | 9 | 0 | 22313 | test-results/qa-modernization/s3/run-2026-11-07T12-41-13-900Z-p7056/run-0.txt |

## 変更ファイルと関連テスト（参照候補）

| ソース | 領域 | リスク | 参照候補数 |
|---|---|---|---:|
| docs/yuwaku/menu_editor.html | MENU | P0_REVIEW | 39 |
| docs/yuwaku/test/menu_editor.html | MENU | P0_REVIEW | 39 |
| mobile-app/web/billing-native.js | BILLING | P0_REVIEW | 10 |
| mobile-app/web/legal.css | CROSS_CUTTING | P0_REVIEW | 10 |
| mobile-app/web/menu_editor.html | MENU | P0_REVIEW | 39 |
| qa-dashboard/app.js | UI_UX | P1_REVIEW | 4 |
| qa-dashboard/index.html | UI_UX | P1_REVIEW | 45 |
| qa-dashboard/style.css | UI_UX | P1_REVIEW | 5 |
| qa-dashboard/test-catalog-live.test.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/ci/no-dedicated-tenant-worker-gate.mjs | TENANT | P1_REVIEW | 1 |
| scripts/common-only-source-gate.mjs | CROSS_CUTTING | P1_REVIEW | 1 |
| scripts/developer-console/app.css | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/developer-console/app.js | UI_UX | P1_REVIEW | 0 |
| scripts/developer-console/bridge.mjs | CROSS_CUTTING | P1_REVIEW | 9 |
| scripts/developer-console/index.html | UI_UX | P1_REVIEW | 45 |
| scripts/developer-console/inventory.mjs | CROSS_CUTTING | P1_REVIEW | 15 |
| scripts/developer-console/server.mjs | CROSS_CUTTING | P1_REVIEW | 7 |
| scripts/developer-console/store-metrics.mjs | CROSS_CUTTING | P1_REVIEW | 1 |
| scripts/qa-modernization/local-gateway-fixture.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-modernization/s1-inventory.mjs | CROSS_CUTTING | P1_REVIEW | 1 |
| scripts/qa-modernization/s1-inventory.test.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-modernization/s2-browser-business-e2e.test.mjs | CROSS_CUTTING | P1_REVIEW | 1 |
| scripts/qa-modernization/s2-evidence.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-modernization/s2-evidence.test.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-modernization/s3-source-audit.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-modernization/test-catalog.mjs | CROSS_CUTTING | P1_REVIEW | 0 |
| scripts/qa-v2-web-dashboard.mjs | CROSS_CUTTING | P1_REVIEW | 2 |
| src/admin.js | CROSS_CUTTING | P0_REVIEW | 22 |
| src/gasApi.js | CROSS_CUTTING | P0_REVIEW | 42 |
| src/index.js | CROSS_CUTTING | P0_REVIEW | 45 |
| src/menuCategories.js | MENU | P0_REVIEW | 2 |

## 未完了の独立検証

- S3_TEST_EQUIVALENCE_NOT_PROVEN (P0_REVIEW) → S4_S5: Referenced test files are candidates only, never a proof of end-to-end coverage
- S3_RUNTIME_D1_PENDING (P0_REVIEW) → S4: S2 source-backed local SQLite does not prove D1 runtime interoperability
- S3_RPM_BENCHMARK_METRICS_PENDING (P1_REVIEW) → S6: RPM/throughput classification exists, but measured request/minute and SLO thresholds are not asserted for every classified case
- S3_NATIVE_COVERAGE_PENDING (P0_REVIEW) → S7: Web/source tests cannot attest BLE physical print, StoreKit purchases, OS permission behavior

今回のS3監査は追跡ソース全体の定量スキャン、現在のGit差分、代表ソース契約、実行可能な既存回帰テストの組み合わせ。すべての関数の意味的正しさをAIが証明したとの主張はしない。

正式QA台帳への新規判定: 0件。ビルド・commit・push・deploy: 未実施。
