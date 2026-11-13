# izakanpai 店舗運営視点・50候補の実行カバレッジ

Generated from the existing S4 operator journey catalog. No formal device verdict is changed.
Related issues: IZK-UT-108, IZK-UT-136, IZK-UT-137 (WAIT_TEST: source/local verification only).

## 観測された実行結果

- 実Gateway＋独立SQLite DB＋cleanup: 11件PASS / 0件FAIL（5業務）
- 既存S4独立証拠への故障注入: 29/29件検知
- 連続業務操作への追加故障注入: 15/15件検知
- 更新後の隔離workerd D1実行: 11/11 PASS、既存関連29/29＋追加15/15故障検出
- 更新後のworkerd証拠: test-results/qa-modernization/s4/local-d1-2026-11-08T02-06-46-389Z-p23880-n1/operator-journey-summary.json
- 隔離workerd D1の週次実行: 47/47 PASS、56/56故障検出、5/5業務PASS
- 週次ゲート証拠: test-results/qa-modernization/ci-gates/s4-weekly-2026-11-08T01-17-20-152Z-p9912.json
- 最終証拠: test-results/qa-modernization/s4/local-api-2026-11-08T02-06-15-317Z-p12852-n1/operator-journey-summary.json
- 正式Android/iOS QA新規PASS: **0件**（ローカル検証と区別）

## 50候補の分類（正確なカバレッジ）

- 候補数: 50
- 既存/拡張した業務Oracleに**部分的な裏付け**がある候補: 50
- うち今回追加した独立実行ケース・ブラウザ/SQLiteテストへの紐付け: 28
- 専用の連続操作・UI/DB/外部副作用テストが不足する候補: 0
- 50候補として正式完了判定できた件数: 0
- 50件の部分カバーはローカル・ブラウザ・隔離DBテストの裏付けであり、実機の完全な業務E2E保証ではない。

| 候補ID | 状態 | S4ケース | 自動テスト・追加故障注入 |
| --- | --- | --- | --- |
| OPS-PURCHASING-retry | PARTIAL_S4_ORACLE | S4-PO-REPLAY-017 |  |
| OPS-PURCHASING-follow_up | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/purchase-order-delivery-status.test.mjs |
| OPS-PURCHASING-repeat | PARTIAL_S4_ORACLE | S4-PO-REPLAY-017 |  |
| OPS-PURCHASING-failure | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/purchase-order-delivery-status.test.mjs |
| OPS-PURCHASING-readback | PARTIAL_S4_ORACLE | S4-PO-REPLAY-017 |  |
| OPS-PURCHASING-other_store | PARTIAL_S4_ORACLE | S4-PO-REPLAY-017 |  |
| OPS-PURCHASING-operator_meaning | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/purchasing-language-actions.test.mjs |
| OPS-PURCHASING-offline | PARTIAL_EXTENDED_ORACLE | 未割当 | test/purchase_order_ui_record_before_email_test.mjs |
| OPS-PURCHASING-localization | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/purchase-order-history-status.test.mjs, test/auto-ci/purchasing-language-actions.test.mjs |
| OPS-PURCHASING-downstream | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/purchase-order-delivery-status.test.mjs |
| OPS-STOCK-retry | PARTIAL_S4_ORACLE | S4-INV-RECEIVE-014, S4-INV-WASTE-015 |  |
| OPS-STOCK-follow_up | PARTIAL_EXTENDED_ORACLE | S4-INV-RECEIVE-014 | OJ04, OJ05 |
| OPS-STOCK-repeat | PARTIAL_EXTENDED_ORACLE | S4-INV-RECEIVE-014 | OJ04, OJ05 |
| OPS-STOCK-failure | PARTIAL_S4_ORACLE | S4-INV-RECEIVE-014, S4-INV-WASTE-015 |  |
| OPS-STOCK-readback | PARTIAL_S4_ORACLE | S4-INV-RECEIVE-014, S4-INV-WASTE-015 |  |
| OPS-STOCK-other_store | PARTIAL_EXTENDED_ORACLE | S4-INV-RECEIVE-014 |  |
| OPS-STOCK-operator_meaning | PARTIAL_EXTENDED_ORACLE | S4-INV-RECEIVE-014 | OJ04, OJ05 |
| OPS-STOCK-offline | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/inventory-movement-response-loss.test.mjs |
| OPS-STOCK-localization | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/inventory-category-menu-order.test.mjs |
| OPS-STOCK-downstream | PARTIAL_S4_ORACLE | S4-INV-RECEIVE-014, S4-INV-WASTE-015 |  |
| OPS-CHECKOUT-retry | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-CHECKOUT-follow_up | PARTIAL_EXTENDED_ORACLE | S4-ORDER-MULTI-REFUND-041 | OJ07 |
| OPS-CHECKOUT-repeat | PARTIAL_EXTENDED_ORACLE | S4-CASH-REPEAT-011 | OJ10, OJ11 |
| OPS-CHECKOUT-failure | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-CHECKOUT-readback | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-CHECKOUT-other_store | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-CHECKOUT-operator_meaning | PARTIAL_EXTENDED_ORACLE | S4-CASH-REPEAT-011 | OJ10, OJ11 |
| OPS-CHECKOUT-offline | PARTIAL_EXTENDED_ORACLE | S4-CASH-REPEAT-011 | test/auto-ci/checkout-response-loss-recovery.test.mjs, OJ12, OJ13, OJ14, OJ15 |
| OPS-CHECKOUT-localization | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-CHECKOUT-downstream | PARTIAL_S4_ORACLE | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 |  |
| OPS-BILLING-retry | PARTIAL_S4_ORACLE | S4-AI-WALLET-019, S4-AI-NO-CHARGE-020 |  |
| OPS-BILLING-follow_up | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_generation_credit_test.mjs, test/menu_image_feature_ui_test.mjs |
| OPS-BILLING-repeat | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_generation_credit_test.mjs |
| OPS-BILLING-failure | PARTIAL_S4_ORACLE | S4-AI-WALLET-019, S4-AI-NO-CHARGE-020 |  |
| OPS-BILLING-readback | PARTIAL_S4_ORACLE | S4-AI-WALLET-019, S4-AI-NO-CHARGE-020 |  |
| OPS-BILLING-other_store | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_generation_credit_test.mjs |
| OPS-BILLING-operator_meaning | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_feature_ui_test.mjs |
| OPS-BILLING-offline | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_feature_ui_test.mjs |
| OPS-BILLING-localization | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_image_generation_credit_test.mjs |
| OPS-BILLING-downstream | PARTIAL_S4_ORACLE | S4-AI-WALLET-019, S4-AI-NO-CHARGE-020 |  |
| OPS-CATEGORIES-retry | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_bulk_delete_browser_test.mjs |
| OPS-CATEGORIES-follow_up | PARTIAL_EXTENDED_ORACLE | S4-CAT-ORDER-001 | OJ01, OJ02, OJ03 |
| OPS-CATEGORIES-repeat | PARTIAL_EXTENDED_ORACLE | S4-CAT-ORDER-001 | OJ01, OJ02, OJ03 |
| OPS-CATEGORIES-failure | PARTIAL_S4_ORACLE | S4-CAT-ORDER-001, S4-CAT-MERGE-003 |  |
| OPS-CATEGORIES-readback | PARTIAL_S4_ORACLE | S4-CAT-ORDER-001, S4-CAT-MERGE-003 |  |
| OPS-CATEGORIES-other_store | PARTIAL_S4_ORACLE | S4-CAT-ORDER-001, S4-CAT-MERGE-003 |  |
| OPS-CATEGORIES-operator_meaning | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_bulk_delete_browser_test.mjs |
| OPS-CATEGORIES-offline | PARTIAL_EXTENDED_ORACLE | 未割当 | test/menu_bulk_delete_browser_test.mjs |
| OPS-CATEGORIES-localization | PARTIAL_EXTENDED_ORACLE | 未割当 | test/auto-ci/inventory-category-menu-order.test.mjs |
| OPS-CATEGORIES-downstream | PARTIAL_S4_ORACLE | S4-CAT-ORDER-001, S4-CAT-MERGE-003 |  |

## 業務ごとの独立した実行証拠

| 業務 | 実行ケースID | 検証範囲 |
| --- | --- | --- |
| PURCHASING | S4-PO-REPLAY-017 | Gateway API、DB状態、他店舗不変・後片付け、独立証拠検証 |
| STOCK | S4-INV-RECEIVE-014, S4-INV-WASTE-015 | Gateway API、DB状態、他店舗不変・後片付け、独立証拠検証 |
| CHECKOUT | S4-BILL-JPY-SERVICE-VAT-029, S4-REFUND-FULL-034, S4-CASH-REPEAT-011, S4-ORDER-MULTI-REFUND-041 | Gateway API、DB状態、他店舗不変・後片付け、独立証拠検証 |
| BILLING | S4-AI-WALLET-019, S4-AI-NO-CHARGE-020 | Gateway API、DB状態、他店舗不変・後片付け、独立証拠検証 |
| CATEGORIES | S4-CAT-ORDER-001, S4-CAT-MERGE-003 | Gateway API、DB状態、他店舗不変・後片付け、独立証拠検証 |

## 残件（未実施をPASSとしない）

- UI操作に起因する違和感、実際のリロード/通信断、JA/ENの利用者理解、外部メール配送や課金サービスなどは追加E2Eが必要。
- 50候補すべての自動実行完了は**未達**。部分カバーは運用観点の完全E2E保証ではない。差分から候補を列挙する仕組みとGPT向け開発手順は接続済みだが、CI単独でGPTが未知のシナリオを作るものではない。
- OPS-CHECKOUT-offlineの部分カバー：オンライン決済確定後の通信応答喪失、読取のみの領収書復旧、確定前の通信断、誤店舗照合、重複印刷なしをローカル実API/SQLite/画面JSとS4隔離Workerdで検証。実機でのネットワーク切断操作・アプリ強制終了後のUI復旧は未実施。
- 旧オフライン現金会計はセキュリティ上拒否する仕様を維持。通信断は決済を許可する意味ではない。
- 本番Worker/D1マイグレーション・モバイルビルド/配布・iPhone/Android正式QAは未実施。正式PASS増分は0。
- Push時は影響がある既存S4/高速契約のみ、夜間は47業務ケース、週次は56故障注入を既存ゲートで実施。5業務の結果は**同じS4証拠から集約**する（追加の全件S4二重実行はしない）。
