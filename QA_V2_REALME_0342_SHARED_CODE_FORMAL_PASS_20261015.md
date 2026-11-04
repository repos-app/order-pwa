# QA2-KEEP-PT-INP-0342 — 割引コード境界・Realme正式QA PASS

2026-10-15 PHT。Realme Android 720×1600、ADB `0O64B26I28103F70`、QA APK `910017`、テスト専用店舗 `teat`。

## 実行結果

- 対象: `QA2-KEEP-PT-INP-0342`、`settings.html` の `discountCode`。
- 開始時の公式状態: `NOT_RUN`（以前の未完了試行10回）。新規正式claim取得の上、レビュー済み親ランナーで1件実行。
- 過去の試行で所有テストルールのコードが `O_BRIEN_TAG` のまま残っていた。読取専用で実際の署名済み `teat` ID・他の割引ルール数・QA専用の表示名を確認し、レビュー済みの入力ベクトルから導いた許可コードに含まれることを確認した。
- 共通復元アダプター `scripts/qa-v2-realme-retained-discount-lifecycle.mjs` を拡張。コード変更も、**所有する単一QA割引ID・正規化された許可リスト・他ルールの完全一致・保存直前の再読込・保存後の再読込**を満たす場合のみ復元できる。その他はfail-closed。
- `scripts/qa-v2-realme-native-batch-generic.mjs` を共通ライフサイクルへ接続。前の試行からのコードドリフトをレビュー済みコードに復帰した後、正式ケースの11入力ベクトルを実行。結果にかかわらず署名済み開始時データへ復元し、SHA-256復元証拠を保存する構造に改修。
- オフラインテスト **58件PASS**。元の `qa_v2_realme_0342_backend_code_oracle_test.mjs` に残る古い「直接API入力41文字を無言切詰め」の期待を、現行サーバー仕様「API直入力は `discount_code_too_long` で拒否」に修正。ドライバーによる物理入力はHTML `maxlength=40` を検証する。過去の親UIテストの `NOT_RUN` 固定期待は合成状態に分離（実際の公式台帳にある0340/0341/0343 PASSはそのまま）。
- 起動ファイル+依存17ファイルの再レビュー: ドライバーSHA-256 `966701d68db3bf950ff8e47d2e5192a58afc60772f3af6699388292717852860`、依存ツリーSHA-256 `fa883eae4f15e41520bf21b8dac23d635f636b31ad9228d004df480da61c5fe8`。承認記録 `test/plans/qa-v2-realme-unattended-approved/dependency-review-qa2-keep-pt-inp-0342-fa883eae4f15.json`。元の誤った「0340名称テスト」レシピ説明も0342コードテストの検証条件へ正した。
- 正式実機実行: `441749ms`（約7分22秒）、`attemptedCount=1`、`formalVerdictsAdded=1`、**`PASS`**。空欄拒否、前後空白、日英語、絵文字、HTML/XSS/SQL風文字列、改行、40文字と41文字のNative maxlength、保存・署名付き独立再読込・Android Back/reopen・表示エスケープを検証。

## 証拠・データ復元

- 正式証拠: `test-results/qa-v2-evidence/realme-discount-0342-6d4282051a7b7ddb/QA2-KEEP-PT-INP-0342.json`。
- PNG **23枚**、すべて画像ヘッダー/720×1600/SHA-256実ファイル一致。独立検証 `node scripts/qa-v2-realme-final-evidence-audit.mjs QA2-KEEP-PT-INP-0342` → `errors: []`、正式レガシー/期待チェックポイントPASS。
- 復元証拠: 同フォルダー `QA2-KEEP-PT-INP-0342-cleanup-proof.json` → `verified:true`・開始時/終了時ハッシュ一致。他ルールの改変なし。
- QA完了後の**別の読み取り専用照合**: 所有ルールID `229e09d2-aecb-47a3-a057-8f12d27eed34` のコードは元の `QA831_DISC_F75DC49D0AE0029B` に一致、テスト用名称も一致、他の8ルールも変更なし。
- Android公式台帳 `PASS:296→297`、`NOT_RUN:486→485`、`FAIL:47`、`BLOCKED:2`、`RUNNING:0`。`qa-v2-official-runner.mjs verify` 成功、排他ロック残留なし。
- 新規アプリFAILの確定はなし。アプリ本体のソース修正・コミット・push・deployは未実施。iOS・エミュレーターの停止設定も変更していない。

## 自己レビュー10項目

| # | 項目 | 結果 |
|---|---|---|
| S1 | 公式ケース0342・旧テストIDと期待条件を照合 | 確認 |
| S2 | 対象Realmeシリアル/910017/720×1600を固定 | 確認 |
| S3 | 署名済み `teat` と一意の所有fixture IDを照合 | 確認 |
| S4 | 前回残留コードはレビュー済みベクトルからのみ許可 | 確認 |
| S5 | 異なるコードの他ルール・他テナントを更新しない | 確認 |
| S6 | Native入力・実保存・サーバー独立読込を検証 | 確認 |
| S7 | Android Back/reopen・リストの文字列エスケープを検証 | 確認 |
| S8 | 40/41文字境界のUIとAPIの条件を区別 | 確認 |
| S9 | 全23PNG SHA/サイズとレガシー期待PASSを確認 | 確認 |
| S10 | 失敗時fail-closed・データ完全復元・公式claim解放を確認 | 確認 |

## 横展開レビュー10項目（実際の実機再テストは0342のみ）

| # | 関連ケース・領域 | 結果 |
|---|---|---|
| H1 | 0342 割引コード入力 | 正式PASS |
| H2 | 0340 日本語名称 | 共通入力ドライバーの利用、既存PASS変更なし |
| H3 | 0341 英語名称 | 共通入力ドライバーの利用、既存PASS変更なし |
| H4 | 0343 計算方式 | 共有復元アダプターの既存契約も回帰PASS |
| H5 | 0344 割引金額 | 別の正式準備が必要・今回未実施 |
| H6 | 0346 税免除 | 共有復元アダプターの既存契約も回帰PASS |
| H7 | 0348 管理者承認 | 共有復元アダプターの既存契約も回帰PASS |
| H8 | 保存時バリデーション | Native maxlengthとAPI直接入力を区別した回帰テスト |
| H9 | HTML/XSS/SQL表示 | ユーザー入力を実行せず文字列として検証、正式証拠あり |
| H10 | QA台帳・他レーン | 0342だけ公式PASS+1、他レーン停止設定維持 |
