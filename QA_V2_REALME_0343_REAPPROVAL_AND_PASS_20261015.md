# QA2-KEEP-PT-INP-0343 — 共通モジュール再承認と実機正式PASS

実施日: 2026-10-15（フィリピン時間）  対象: Realme RMX3938 / 720×1600 / QA APK 910017 / `teat`

## 実際に実施した内容

1. 正式ケース0343のレビュー済み親ドライバーとローカル依存24ファイルをSHA-256で検証し、レシピ・親承認バッチに `moduleTreeSHA256` を登録。旧承認履歴は残した。
2. 旧0343の異常終了で残った `RUNNING` を調査。署名付き `teat` 所有割引ルールの `calculationType=percent`, `enabled=false` 等がレビュー定義と一致したことを確認。元実行の全他行の歴史的基準状態は未立証と明記し、旧claimを **INTERRUPTED / NOT_RUN（PASS/FAILなし）** として公式 `release`。
3. 初回の修正版実機QAは `business-oracle-fixed` で `QA_FIXTURE_WEBVIEW_EVAL_FAILED`、形式上 `INCOMPLETE`。共通復元処理で開始時の全割引ルール状態との一致をSHA-256で証明し、公式claimを自動解放。旧問題の再発なし。
4. 共通会計画面ドライバー `scripts/qa-v2-realme-discount-checkout-witness.mjs` の `scrollIntoView({block:'center')` という WebView JavaScript構文エラー（`}` 脱落）を修正。新しい `test/qa_v2_realme_checkout_eval_syntax_test.mjs` は埋め込みWebView式も `vm.Script` でコンパイル検証する。
5. 依存ツリーを再レビューし新SHA-256を再承認。**関連オフラインテスト64件PASS**。
6. 修正版で正式QAを再実行。**CASE 0343 PASS**。実行時間 `136346 ms`、公式 `formalVerdictsAdded:1`。正式台帳のPASS `293 -> 294`、NOT_RUN `489 -> 488`、RUNNING `0`、実行ロックなし。

## ソース固定と証拠

- 最終承認依存ツリーSHA-256: `7e4c090ade7ee3379575a767da60f6249ee4b6af4288dd8d3374de7ae9712146`
- 最終レビュー記録: `test/plans/qa-v2-realme-unattended-approved/dependency-review-0343-20261015-7e4c090ade7e.json`
- 親レシピ: `test/plans/qa-v2-realme-unattended-approved/QA2-KEEP-PT-INP-0343.approved.json`
- 親バッチ: `test/plans/qa-v2-realme-unattended-approved/reviewed-discount-0343-20261015.approval.json`
- 正式証拠: `test-results/qa-v2-evidence/realme-0343-mv96mv2l/QA2-KEEP-PT-INP-0343.json`
- 証拠画像: `10`枚、すべてPNGヘッダー・720×1600・SHA-256が実ファイルと一致。会計確認は `checkout-fixed-001.png` と `checkout-percent-001.png`。
- 正式ケースの旧テスト条件1件と期待チェックポイント1件を証拠で検証。`testStoreId=teat`、`postStateVerified=true`、`crossTenantMutation=false`。
- 共通復元証拠: `test-results/qa-v2-evidence/realme-0343-mv96mv2l/QA2-KEEP-PT-INP-0343-cleanup-proof.json`。署名付き基準状態と終了状態のSHA-256はいずれも `73d980b567ff085e2e2c0e41cea32230df3d3503a7a177c815b81d38b32e3f1d`。

## 問題の区分と範囲

- 本件の停止原因は **QA_DRIVER（共通会計ドライバーの埋め込みJS構文エラー）**。アプリ本体の会計障害を意味しない。
- `QA_INFRA` 側の復元証拠検証・正式claim解放も今回動作を確認。
- **アプリ本体には修正を加えていない**。Gitコミット・プッシュ・デプロイ・ストア申請は未実施。
- 全レーン停止マーカーは保持。Realme専用の既存許可を利用し、iOS・Android Emulatorに新しいQA claimを作成していない。
- 次の未実施ケースを実行するには、対象ケースの手順と新しい依存ツリーを別途レビュー・承認する必要がある。
