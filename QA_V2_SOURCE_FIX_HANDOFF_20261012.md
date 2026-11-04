# izakanpai POS | 新正式 QA V2（831件）ソース修正担当引継ぎ

更新日: 2026-10-12（Asia/Manila）

## 対象と厳守事項

- 正式QA定義: `.qa-v2-official/manifest.json`（831ケース）
- 正式結果: `.qa-v2-official/android/state.json` / `.qa-v2-official/ios/state.json`
- 旧2,080ケース結果と証拠: `test-results/qa-v2-final-cutover-20261012/`（参照のみ）
- 旧FAILのソース修正台帳: `docs/ANDROID_QA_NG_FAIL_SNAPSHOT_20261010.json`（245件）
- 進捗: `node scripts/qa-v2-dashboard.mjs`
- **修正レーン専用照合**: `node scripts/qa-v2-ng-fix-report.mjs`（参照のみ）
- ケース別一覧を表示: `node scripts/qa-v2-ng-fix-report.mjs --markdown`（標準出力のみ。QA結果ファイルを変更しない）
- 自動照合回帰: `node --test test/qa_v2_ng_fix_report_test.mjs`

旧FAIL245件はすべて `manifest.oldIdToNewId` に対応先があり、新QAでは **62個のQA2ケース**に対応している。14件の旧P0 NGは独立した `QA2-KEEP-...` ケースとして残る。

旧台帳の「修正済・再検証待ち」はあくまで**旧ソース修正の主張**であり、リリース反映やOS別実機PASSを保証しない。QA2ケースが複数の旧アサーションをまとめる場合、1件のグループPASSだけで内包する旧NGすべてを自動で完全解決扱いしない。

## 旧P0の独立ケースとソース再検証

| 旧ケースID | 新QA2ケースID | 修正テーマ・主なファイル | ローカル検証 |
| --- | --- | --- | --- |
| OPR-ATT-011 | QA2-KEEP-OPR-ATT-011 | 勤怠ロール／本人・他人打刻制御（`src/attendance.js`, `src/gasApi.js`, `src/index.js`） | `backend_auth_attendance_401_regression_test.mjs` PASS |
| OPR-ORD-011 | QA2-KEEP-OPR-ORD-011 | 提供状態遷移＋在庫の整合（`src/orders.js`, `src/inventory.js`） | `backend_inventory_ledger_void_regression_test.mjs` PASS |
| OPR-PRINT-010 | QA2-KEEP-OPR-PRINT-010 | 印刷ジョブ期限切れ回収（`src/printers.js`） | `android_qa_stale_print_claim_test.mjs` PASS |
| OPR-TAKE-015 | QA2-KEEP-OPR-TAKE-015 | Native読込タイムアウト回避（`mobile-app/web/api.js`） | `native_read_transport_test.mjs` PASS |
| OPR-AUTH-027 | QA2-KEEP-OPR-AUTH-027 | GAS互換認証なし401（`src/gasApi.js`） | `backend_auth_attendance_401_regression_test.mjs` PASS |
| OPR-AUTH-028 | QA2-KEEP-OPR-AUTH-028 | Native認証なし401（`src/index.js`） | 同上 PASS |
| OPR-REC-036 | QA2-KEEP-OPR-REC-036 | Native読込連続タイムアウト（`mobile-app/web/api.js`） | `native_read_transport_test.mjs` PASS |
| OPR-REC-038 | QA2-KEEP-OPR-REC-038 | Native読込連続タイムアウト（`mobile-app/web/api.js`） | 同上 PASS |
| OPR-RACE-036 | QA2-KEEP-OPR-RACE-036 | 注文提供と在庫更新の原子性（`src/orders.js`, `src/inventory.js`） | `backend_inventory_ledger_void_regression_test.mjs` PASS |
| OPR-RACE-042 | QA2-KEEP-OPR-RACE-042 | 在庫操作の冪等性・競合制御（`src/inventory.js`） | 同上 PASS |
| PT-SET-056 | QA2-KEEP-PT-SET-056 | 初回言語設定の優先順位（`mobile-app/web/i18n.js`） | `android_qa_default_language_priority_test.mjs` PASS |
| PT-CANCEL-003 | QA2-KEEP-PT-CANCEL-003 | 提供済注文取消時の在庫／売上整合（`src/orders.js`） | `backend_inventory_ledger_void_regression_test.mjs` PASS |
| PT-AGGREGATE-074 | QA2-KEEP-PT-AGGREGATE-074 | 注文・取消・在庫の集計（`src/inventory.js`, `src/reports.js`） | 同上 PASS |
| PT-AGGREGATE-075 | QA2-KEEP-PT-AGGREGATE-075 | 在庫台帳の改名・削除／入出庫監査（`src/inventory.js`） | 同上 PASS |

**重要**: 上表は代表的な実装ファイルと既存テストの紐付けであり、各障害の実機修正を証明したものではない。元の根拠: `docs/BACKEND_NG_ISSUE_REGISTER_20261010.md` と旧FAIL個票。

## 状態管理の8段階

1. 原因調査中
2. ソース修正中
3. ソース修正済み（差分確認）
4. 単体・回帰テストPASS（テスト名・日時）
5. 修正版ビルドへの反映待ち（ビルドID・ソースSHA・migration状態確認）
6. Android実機再検証PASS（新QA2結果＋証拠）
7. iOS実機再検証PASS（新QA2結果＋証拠）
8. 完全解決（必要な両OS／独立した旧アサーションすべての証拠を確認）

新QA環境への切替時点では上表の旧P0は**段階4のローカル検証までを確認**。段階5以降の反映確認・実機判定は未実施。旧245件一括の「完全解決」を宣言しない。

## 横展開5巡（以後の新規不具合ごとに実施）

1. 同一画面と同機能で通常値／エラー値／未設定／連打・再起動を検証
2. 同種入力・操作を持つ他画面へ展開（ヘッダー、日付・年月・時刻、狭幅・横画面、キーボード、44pxタップ）
3. 日本語・英語とJPY/PHP、タイムゾーン、12h/24h、ローカル日付形式へ展開
4. Android/iOS用ローカル配布アセット、Web本番・test側の差分と認証実装の違いを照合
5. 認証／権限／store_id分離／注文・返金・在庫冪等性と回帰テストを照合

各巡の個別証拠が揃うまで「横展開5回実施済み」としない。修正のたびに旧ケースID、新QA2 ID、原因、差分ファイル、再現・回帰テスト、影響OS、実機要否を残す。

## 現状の検証根拠と次の作業

2026-10-12に修正レーンから読み取り専用で照合した時点では、新正式QAに新規FAILは未記録。AndroidでケースのRUNNINGは発生していたが、テスト端末や公式記録には触れていない。

- バックエンド注文／取消／在庫、認証／勤怠401、期限切れ印刷、Native読込、言語初期化のテストがそれぞれPASS
- 全テーブルのテナント分離、発注履歴の店舗分離、在庫入力の不正値拒否、日時表示のローカル回帰もPASS
- `test/distribution_parity_test.mjs` PASS（ローカル配布アセット整合性。公開済みビルドの更新を意味しない）
- 旧結果・runner・証拠・新QA結果はいずれも変更していない
- commit、push、APK/IPA build、配布、DB migration適用を実施していない

新QAのFAILが出たら `node scripts/qa-v2-ng-fix-report.mjs` によってOS・QA2 ID・対応旧IDを確認し、P0→注文/会計/権限→画面/日付/言語の順で修正し、実機再検証を担当QAに引き渡す。
