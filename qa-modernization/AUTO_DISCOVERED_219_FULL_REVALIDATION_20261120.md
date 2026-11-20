# Izakanpai 自動テスト219件全件回帰・検出不具合修正・証拠監査

日付：2026-11-20（Asia/Manila）
実行：ローカルWindows・既存 scripts/ci/run-auto-discovered-tests.mjs。GitHub Actions不使用。
範囲：既存Chrome/Gateway/隔離SQLite/Node自動テスト。**本番クラウド、実決済、物理端末、正式実機QAは実行していない。**

## 1. 今回の確定結果

| 実行 | ファイル分母 | PASS | FAIL | skip/延期 | 再利用 | exit |
|---|---:|---:|---:|---:|---:|---:|
| FULL初回（修正前） | **219** | **218** | **1** | 0 | 0 | **1** |
| FULL再実行（取引データ管理修正後） | **219** | **218** | **1** | 0 | 0 | **1** |
| 2つのFAIL対象を現行ソースで一括ローカル再実行 | **2ファイル** | **18 TAP PASS** | 0 | 0 | ― | **0** |
| 取引データ管理の追加関連4ファイル | **4ファイル** | **32 TAP PASS** | 0 | 0 | ― | **0** |

**重要：219/219の同一時点FULL PASSは現在まだ存在しない。** 218件のFULL PASSと残る1件の個別PASSを合算して「219/219全件PASS」と記録しない。TAPサブテスト18件・32件とファイル分母219も別。

**S4・S5・S6統合テストは両方のFULLでPASS。** FULLで検出された別々のFAIL2件は、相互に上書きせず、元ログ・ステータスを保管。

## 2. 失敗履歴、原因と対策

### 2-1. 初回のFAIL：取引消去後の「誤パスワード」表示

- テスト：test/auto-ci/configuration-cross-live-data-admin-transaction-reset-browser.test.mjs
- 該当業務：DATA-RESET-BAD-PASSWORD-NO-JOB-AND-UI-RECOVERY
- 初回：9/10業務PASS、最後の誤パスワード受付結果メッセージ待機が16秒でタイムアウト。
- Gateway実リクエストは queueTransactionReset に対し ok=false を返した。別テナント隔離SQLiteの消去・復元の前9ケースはPASS。
- 原因：受付不明の状態で前回完了済みジョブのステータスを再取得すると、画面がこれを今回の「削除完了」として扱い、エラー表示を上書きし得る。単なるタイムアウト延長では解消しない。
- 製品修正：mobile-app/web/data_admin.html に受付不明フラグと直前ジョブIDの比較を追加。今回受付失敗と同じ旧完了ジョブを新しい成功として通知しない。
- 追加テスト：失敗後のジョブ再照会と件数プレビュー再取得が完了した時点でも、誤パスワードの受付不明メッセージが上書きされないことを明示確認。
- 現行：実Chrome/Gateway/SQLiteテスト単独11/11 TAP PASS、関連4ファイル32/32 TAP PASS、続くFULL再実行中のこのファイルもPASS。

**未解消の境界**：実際のACK喪失、同時ジョブ状態応答の逆転、別端末からの割込みと再試行の完全冪等性は未検証。現在の修正が、これらをすべて解決したとは判定しない。

### 2-2. FULL再実行の別FAIL：設定画面初期化が完了しない

- テスト：test/auto-ci/configuration-cross-extended-settlement-browser.test.mjs
- 該当：CONFIG-CROSS-03/04 のうち、3番目の隔離テナント・ブラウザを起動する前処理。
- FULL再実行：先行4業務ケースはPASS。その後 settings.html で savedLocaleValues が初期化されるのを16秒待ったがタイムアウト。残り2業務は**未実行**。この段階で金額・SC・コミッション計算の不一致が検出されたわけではない。
- 根本原因：**未特定**。FULL初回には同じファイルがPASSしたが、再回帰時にはブラウザ初期化、実Gateway応答、ページJSエラーの内訳を保存していなかった。
- テスト診断修正：失敗時に recent Gateway requests（成功/拒否）、JSエラー、外部通信ブロック、DOM状態、PNGとSHA256を保存し、前処理失敗を proof.setupFailures に独立記録。6件中4件PASS・残2件未実行の場合、FAIL0とは誤報しない。**盲目的にタイムアウトを延長・再読込・自動再試行してPASSへ上書きしていない。**
- 現行：診断追加後の個別再実行で6/6業務PASS（TAP親込み7/7）。取引消去と一括実行した最新テストで18/18 TAP PASS。ただし同一219ファイルのFULLをもう一度実行した結果ではないため、再実行時のFULL FAILは残る。

## 3. 実行結果と監査の証拠

- 初回FULLログ：test-results/qa-modernization/auto-discovered-full-219-20261120.log
- 初回終了コード：test-results/qa-modernization/auto-discovered-full-219-20261120-exit.json
- 初回独立検証：test-results/qa-modernization/auto-discovered-full-219-20261120-validation.json（verdict=FAIL、218/219、ソース差分0）
- 初回実行時ソース：test-results/qa-modernization/full219-20261120-source-before.json
- 修正後FULLログ：test-results/qa-modernization/auto-discovered-full-219-20261120-postfix.log
- 修正後FULL終了コード：test-results/qa-modernization/auto-discovered-full-219-20261120-postfix-exit.json
- 修正後FULL独立検証：test-results/qa-modernization/auto-discovered-full-219-20261120-postfix-validation.json（verdict=FAIL、218/219、ソース差分0）
- 修正後実行時ソース：test-results/qa-modernization/full219-20261120-source-before-postfix.json
- 取引消去関連4ファイル：test-results/qa-modernization/full219-data-admin-fix-targeted-20261120.log（32/32 TAP PASS）
- 2 FAIL対象の現行ソース一括実行：test-results/qa-modernization/full219-final-failed-two-combined-20261120.log（18/18 TAP PASS）
- 設定初期化の診断追加後：test-results/qa-modernization/full219-extended-settlement-diagnostic-final-20261120.log（7/7 TAP PASS）
- 現行ローカルケース証拠：test-results/qa-modernization/configuration-business/ 内の最新 cross-data-admin-transaction-reset-*、cross-extended-settlement-*、cross-live-category-merge-* の各 result.json／PNG。
- 再照合プログラム：test-results/qa-modernization/full219-20261120-remediation-verify.mjs
- 独立再照合結果：test-results/qa-modernization/full219-20261120-remediation-validation.json（実行済みFULL2回・最新18 TAP・3系統のソースSHA/PNG・修正差分を照合し PASS。ただしFULL 219/219への昇格判定ではない）

2つのFULLは共に **219件fresh / reused 0 / deferred 0 / ソース625ファイルの実行時ドリフト0**。初回後の現在ソース差分は意図した data_admin.html と取引消去E2Eと拡張会計E2Eの3ファイル、2回目FULL後は診断改善した拡張会計E2Eの1ファイル。独立検証で不明な差分なし。

## 4. 監査ゲートと今後の高リスク残件

- configuration-coverage-status.mjs --scoped-strict：**exit 0**、現在追加した限定ローカル業務の証拠はPASS。
- 同 --strict：**exit 1**。CONFIG-CROSS-01〜06の全組合せはまだ完全網羅ではない。
- 代表権限書込みの最新値：**25/28画面**。過去13/28の監査スナップショットを最新の分母へ誤用しない。34保護画面の単純ナビゲーション検証と、画面内全アクションの実業務検証も混同しない。
- 優先の未完了：領収書の全額返金・支払方法訂正を、実本人の権限取消・復帰と報酬台帳まで確認／注文取消承認ON/OFFと在庫・監査一回性／在庫の入荷・廃棄・棚卸の権限取消中実操作拒否・再送冪等性。
- 別ゲート：物理プリンタ/ACK、通知実配送、実決済・返金、OSカメラ/GPS、Cloudflare本番D1/R2、真の回線切断。

**正式実機QA：NOT_RUN、正式PASS 0、正式FAIL 0。** GitHub Actions不使用。今回コミット・push・Worker/Web/DBデプロイなし。他の大量未コミットソースは触れていない。
