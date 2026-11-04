# QA2-KEEP-PT-INP-0346 — 税免除設定・Realme実機正式PASS

実施日: 2026-10-15 PHT。対象端末: Realme RMX3938、シリアル `0O64B26I28103F70`、QA APK `910017`、店舗 `teat`。

## 事前準備と正式実行

- 0346はAndroid公式台帳で `NOT_RUN`。P1「discountTaxExempt チェックボックスのON/OFF・保存・Back/reopen・派生計算」。同じ共通設定ドライバーを0348で正式PASS実績あり。
- `scripts/qa-v2-realme-dependent-tax-preflight.mjs` による読み取り専用事前確認: 署名済み`teat`店舗、所有割引ルールコード `QA831_DISC_A56C8AD600DD9B0F` が一意、税率 `0.11`、税内外 `false`、`getOperationsDelta` 成功、注文10件（請求明細はログに出さず集計値のみ）。
- `scripts/qa-v2-realme-approve-dependent-tax.mjs` で公式ケース・既存マニフェスト・所有QAデータを照合し、親レビュー付き承認ファイルを作成。`test/plans/qa-v2-realme-unattended-approved/reviewed-discount-dependent-0346-20261015.approval.json`。初回ドライバー/依存モジュールSHAは監査済み。
- 初回実機テストは `admin-0` で `QA_FIXTURE_QA_TENANT_UNVERIFIED` → `INCOMPLETE`。原因はQA_DRIVER: `admin.html` に遷移した後、設定専用の厳密な`/settings.html`認証確認を実行していた。アプリ税計算FAILではない。
- 初回実行は共通の全割引ルール復元に成功し、復元証明が確認されたため公式 `RUNNING` を自動release。旧失敗の結果をPASS/FAILにしていない。
- `scripts/qa-v2-realme-settings-batch-generic.mjs` の0346/47/48共通処理で、**設定画面の認証済みRPCコンテキストで独立した設定・注文の署名付きスナップショットを取ってから**会計画面に遷移するよう順序を修正。会計画面用に設定ページの検証を緩めることはしていない。
- `test/qa_v2_realme_settings_batch_generic_test.mjs` に実行順序の回帰テストを追加。共通の正式QA・データ復元・承認・ロール関連テスト **60件PASS**。
- 変更した共通ドライバーと依存11ファイルを再レビューして再承認。最終ドライバーSHA `b1c9994f6e59655d3e6719c625054ea6b1afd34d1126dfb79edc29de2364365a`、モジュールツリーSHA `615f09cf61e932094542266ac98eaeb6190a998fc2f30f3eb17b76640155d2ee`。独立レビュー `test/plans/qa-v2-realme-unattended-approved/dependency-review-qa2-keep-pt-inp-0346-615f09cf61e9.json`。
- 再実行: 正式 Realme ランナーで1ケース、**`PASS`**。`elapsedMs:50590`、`attemptedCount:1`、`formalVerdictsAdded:1`。

## 独立検証と原状回復

- 正式台帳 `PASS:295→296`、`NOT_RUN:487→486`、`FAIL:47`、`BLOCKED:2`、`RUNNING:0`。台帳照合 `qa-v2-official-runner.mjs verify` 成功。
- 証拠ディレクトリ `test-results/qa-v2-evidence/settings-QA2-KEEP-PT-INP-0346-cb670423a962416f`。正式証拠 `QA2-KEEP-PT-INP-0346.json`。
- 独立 `scripts/qa-v2-realme-final-evidence-audit.mjs QA2-KEEP-PT-INP-0346` → errors `[]`。PNG **10枚**すべてSHA-256と720×1600を確認、構造化トレース1件もSHA一致。
- taxExempt=true/falseの両方で `independentTax:true`・`signedOrderProof:true`。独立した税額・割引額・合計算出と署名済み未会計注文の照合あり。会計確定や売上・在庫への書込みなし。
- `QA2-KEEP-PT-INP-0346-cleanup-proof.json` は `verified:true`。開始時と終了時の全割引ルールのSHA-256が一致。QA対象の計算方式、有効化、税免除が元に戻り、他ルールに変化なし。
- 実行ロック・正式claimとも残留0件。iOSおよびエミュレータのユーザー停止指示は変更なし。APPコード/DBスキーマ、コミット、push、deploy、ストアは変更なし。

## 自己レビュー10件

| No. | 対象 | 結果 |
|---|---|---|
| S1 | 公式0346の旧チェックポイントとNativeコントロールID対応 | 確認 |
| S2 | QA実機serial/ビルド910017/解像度720px保証 | 確認 |
| S3 | 署名済み店舗 `teat` とQA所有ルール一意性 | 確認 |
| S4 | 他レーン停止・排他claim管理 | 確認 |
| S5 | 実操作ON/OFF・保存・戻る再表示 | 確認 |
| S6 | 管理画面での税設定取得の誤った認証を緩めず修正 | 確認 |
| S7 | 署名済み注文額・税率による独立計算 | 確認 |
| S8 | 他の割引ルールの不変性と所有データの完全復元 | 確認 |
| S9 | 証拠画像・ハッシュ・正式結果の整合性 | 確認 |
| S10 | 失敗時はINCOMPLETE、原状回復証明がなければrelease禁止 | 確認 |

## 横展開レビュー10件（レビューのみのものを区別）

| No. | 関連領域 | 結果 |
|---|---|---|
| H1 | 0346 税免除 | 正式PASS |
| H2 | 0347 身分証必須 | 共通設定ドライバー依存、過去PASSは変更せず |
| H3 | 0348 管理者承認 | 共通設定ドライバー依存、過去PASSは変更せず |
| H4 | 0349 割引有効化 | 他経路、今回再実行なし |
| H5 | 0343 割引計算方式 | 共通原状復元処理の利用、今回再実行なし |
| H6 | 0342 割引コード境界 | 別の入力ドライバー、次の候補として未実施 |
| H7 | 0344 割引額境界 | 正式ドライバーの準備が別途必要 |
| H8 | getSettings と getOperationsDelta | 署名済み設定ページで取得し、会計プレビューから独立させた |
| H9 | Android / iOS 他レーン | 既存停止を変更せず、Realmeのみ実行 |
| H10 | QA証拠・公式台帳・Git/デプロイ | QAのみ変更、台帳結果＋1件、コードデプロイなし |
