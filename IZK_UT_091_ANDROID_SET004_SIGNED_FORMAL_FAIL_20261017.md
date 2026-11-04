# IZK-UT-091 — Android SET-004 署名実機での正式FAIL

2026-10-17。状態: QA2-SET-004 Android正式FAIL受理。アプリ修正はLOCALのみ、署名再ビルド・再検証未実施。

## 実行と原因

- Realme RMX3938 / ADB 0O64B26I28103F70、署名QA APK 910019、QA店舗 teat（Asia/Manila）。
- 元ケース QA2-SET-004 / PT-SET-025 / all-date-ui。
- バックアップ行 f9f6bbdd-573a-4fbc-b007-843563f45184、SQLite UTC 2026-10-06 04:16:38。
- 正しい店舗表示 10/06/2026 12:16:38、実際のAndroid画面 10/06/2026 04:16:38（8時間差）。
- Playwright真正実機画面、認証済みlistDataBackups、独立リモートD1を突合して再現。公式Runner record FAIL受理、整合性検証正常。
- 原本証拠: test-results/qa-v2-evidence/playwright-realme/SET004-UTC-BACKUP-2026-10-17T12-15-27-470Z/formal-fail-evidence.json、independent-witness.json、realme-data-admin-utc-mismatch.png。
- migrations/0006_data_admin_backups.sql はUTCを無接尾辞で保存。src/dataAdmin.js のlistBackupsはそのまま返す。旧UIのDateDisplay.formatDateTimeは無接尾辞をローカル時刻として表示していた。
- 既存のIZK-UT-091はWeb TESTコピーの同根不整合を台帳に登録済み。重複採番しない。本追記はAndroid正式FAILの追加証拠。

## ローカル修正

共通DateDisplayへUTC起点と確定したフィールド専用のformatUtcDateTimeを追加。通常のformatDateTime（日常の現地時刻）とformat（日付だけ）は変えない。data_admin画面はUTC専用呼出しに移行し、地域設定が非同期に到着した時にはBACKUP_ROWSを再描画する。Android内蔵・Web・公開コピーは各々キャッシュ指定auth5で整備。別担当の追加レビューで、プリンタジョブのAPI応答createdは**既に店舗現地時刻へ変換済み**と確認され、プリンタ側はformatDateTimeに戻す修正を実施（IZK-UT-092）。二重変換しないことを別途回帰で確認した。

## 自己レビュー S01–S10（コード・証拠を独立の観点で確認）

| ID | 確認方法 | 結果 |
|---|---|---|
| S01 | migration 0006の時刻の生成元を調査 | SQLite datetime(now) UTCを確認 |
| S02 | dataAdmin.js listBackupsのSQLを追跡 | UTC文字列を加工せず返すことを確認 |
| S03 | 旧DateDisplayのローカル分岐と新関数の境界を比較 | 旧関数は不変 |
| S04 | 秒付きSQL時刻の正規表現とZ付与を実VMで検査 | PASS |
| S05 | 秒省略時刻の00秒補完をVMで実行 | PASS |
| S06 | 明示UTC ISOの二重変換防止をVMで実行 | PASS |
| S07 | Asia/ManilaのUTC +08計算と実行済みD1を独立照合 | PASS |
| S08 | Asia/Tokyoと夏時間Europe/Londonを実VMで比較 | PASS |
| S09 | 予約の現地壁時計日時と日付のみ値の既存形式維持を実VMで比較 | PASS |
| S10 | 非同期I18nの再描画をソース分岐で再レビュー。ロール・業務書込みを追加しない差分を確認 | ソースPASS、実配布待ち |

## 横展開レビュー H01–H10（対象画面別・配布面別）

| ID | 対象 | 結果 |
|---|---|---|
| H01 | Android内蔵の日時モジュールとdata_admin | LOCAL修正、APK未更新 |
| H02 | mobile-app/webの同2ファイル | LOCAL修正、デプロイ未実施 |
| H03 | docs/yuwakuの公開コピー | 同一仕様で修正 |
| H04 | docs/yuwaku/testのTESTコピー | 別担当の整合修正と回帰テスト確認 |
| H05 | printersの印刷キュー日時（4配布面） | APIが既に現地時刻へ変換するため二重UTC変換を禁止（IZK-UT-092） |
| H06 | auditのtoUtcDate経路 | 既存でUTC明示済み、変更不要 |
| H07 | feedbackのtoUtcDate経路 | 既存でUTC明示済み、変更不要 |
| H08 | movesのtoUtcDate経路 | 既存でUTC明示済み、変更不要 |
| H09 | reserveの予約入力日時 | 現地時刻を維持し、UTCと誤認しない |
| H10 | receipts、reservations、members、todoの日付ソース | 保存起点の異なる値を一律UTC変換せず、未検証は保留 |

## 確認と残件

- date-display-sqlite-utc.test.mjs の実コードVM・配布面検証7/7 PASS。
- diff whitespace検査にエラーなし。既存IZK-UT-091 Web TEST担当は別途S10/H10とWebスモーク581件成功を記録。
- 未実施: 署名済み修正版Android/iOSビルド、実機再判定、デプロイ、紙印刷テスト、iOS実機。すべて未完了とし、QA2-SET-004の公式FAILをPASSに変えない。
