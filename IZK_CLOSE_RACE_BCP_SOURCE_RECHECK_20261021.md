# 2026-10-21 izakanpai: CLOSE-007 / RACE-034 / BCP-009 現行ソース再検証

## 判定と範囲

3件とも署名済みAndroid APK `910020` の正式FAILは保存されている一方、**現行ローカルソースには修正済み差分が既に存在し、今回新たな再現FAILはなかった**。この確認担当は既存差分を変更していない。正式QA台帳・本番・実機・Git/配布操作は実施していない。

| 正式QA ID | 正式実機の旧FAIL | 現行ソース確認 | オフライン新規回帰 | 現状 |
| --- | --- | --- | --- | --- |
| `QA2-KEEP-OPR-CLOSE-007` | PHP123.45をレジに₱123と表示 | `src/register.js:getRegisterBundle`を実SQLiteで実行した結果、card123.45/cash7.89を保持。Native/Web/TESTの`register.html`実`reload()/render()`は設定`currencyDecimalDigits=2`を反映し、₱123.45表示 | **22/22 PASS**：異なる通貨/桁/金額等の横展開H01–H10、実際の描画と配布面を使うR01–R10、旧整数通貨、バックエンド→UI確認 | 旧ソース不具合への修正あり／新ビルド実機再判定待ち |
| `QA2-KEEP-OPR-RACE-034` | Manila23:00–01:00、10分休憩2回の正味100分がAPI上0分 | `src/attendance.js:getAttendanceMonthlySummary`を実SQLiteで実行。跨日打刻、月末/年末、3休憩、他従業員・他店舗を検証し100分を算出 | **20/20 PASS**：横展開H01–H10、独立fixtureのR01–R10 | 旧ソース不具合への修正あり／新ビルド実機再判定待ち |
| `QA2-KEEP-OPR-BCP-009` | 実ZIPに`receipt_print_outbox.csv`がなくAPIが`not_found` | `src/backup.js`のホワイトリストと実SQLiteの出力を照合。Native/Web/TESTの実`backupAll()`を実行して`JSZip.file('receipt_print_outbox.csv',csv)`の呼出と店舗別データ内容を確認 | **20/20 PASS**：横展開H01–H10、異なる店舗・レコード・配布面のR01–R10 | 旧ソース不具合への修正あり／実ZIPと実機の正式再判定待ち |

## 実行証跡

- 新規3テストを一括実行：`node --test test/regressions/qa2_close007_current_register_render.test.mjs test/regressions/qa2_race034_current_sqlite_monthly.test.mjs test/regressions/qa2_bcp009_current_backup_archive.test.mjs` → **62/62 PASS、FAIL 0、終了コード0**。
- 完全ログ：`test-results/backend-candidates-20261021/three-source-current-62-tests.log`
- SHA-256：`9AD4B3515EE6367F1ED9C28D774762BD055587B0E1924DC12CC97279C2BC675A`
- **10回の独立再チェック**は3対象それぞれ`node --test --test-name-pattern='RECHECK Rxx' <専用テスト>`を各回別Nodeプロセスで実行。計**30回、30/30 PASS**。個別ログ：`test-results/backend-candidates-20261021/CLOSE007-RECHECK-R01.log`～`R10.log`、`RACE034-RECHECK-R01.log`～`R10.log`、`BCP009-RECHECK-R01.log`～`R10.log`。各ログの`tests 1/pass 1/fail 0`を確認。
- 旧回帰：`test/regressions/attendance-overnight-breaks-034.test.mjs` **4/4 PASS**、`test/backup_outbox_export_regression_test.mjs` **PASS**。ログは同証跡フォルダ内`attendance-existing-4.log`と`backup-existing.log`。

最初のBCPブラウザ経路テストは、fixtureに`order_items`など全バックアップ対象テーブルがなく、15ケースがfixture起因で失敗した。プロダクトの失敗ではないと特定し、全対象テーブルを実SQLiteで作るようテストfixtureを修正後、20/20 PASSとなった。

## 残る未検証

バックアップの実ZIP圧縮は、外部CDN版JSZipがローカルNode環境にないため`JSZip.file`の内容取得までのテストであり、生成ZIP実体・ファイル保存/共有動作は未検証。3ケース全て修正版署名ビルドでのAndroid/iOS実機操作、正式Runner claim、正式再判定および台帳反映は未実施。**今回の62件を正式QAのPASS件数には加算しない。**

詳細の英語引継ぎ：`test-results/backend-candidates-20261021/REVIEW_HANDOFF.md`。
