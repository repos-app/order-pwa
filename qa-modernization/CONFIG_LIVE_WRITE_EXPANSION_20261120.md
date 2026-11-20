# CONFIG-CROSS 実UI書込み追加QA — 2026-11-20

## 結果と判定境界

既存の `scripts/qa-modernization/local-gateway-fixture.mjs`、`s5-browser-local-harness.mjs`、実Chrome、実Gateway処理、隔離した物理SQLiteテナント2件を**再利用**した。新たなCIランナーや専用Gatewayを作らず、`test/auto-ci/` にテスト2ファイルを追加した。既存S5の単一テーブル削除→復元は再実装していない。

- **新規業務サブケース：20/20 LOCAL_PASS**（取引データ管理10、メニュー一括権限10）。各親 `node:test` ケースを含む新規TAPは22/22 PASS。
- **本日後半の218ファイル全件回帰：218/218ファイル PASS、FAIL 0、延期 0、再利用 0、終了コード 0。** 既存 `node scripts/ci/run-auto-discovered-tests.mjs` のFULL実行。ファイル単位と業務ケース単位を混同しない。
- **先行した関連6ファイルの一括回帰：TAP 63/63 PASS、FAIL 0、skip 0、exit 0。** この回帰実行時点ではメニュー一括操作の新規3ケースは未追加。追加後は上記FULLに組み込まれてPASS。
- 全件回帰対象の218ファイルは実行時 `AUTO_CI_CASE_RESULT` 218件で重複0。以前の216ファイル全件PASS時に照合したソース617ファイルは、実行後のSHA-256再比較で **差分0/617**。
- **正式実機QA：NOT_RUN、正式PASS 0、正式FAIL 0。** Cloudflare本番D1/R2、実印字、外部課金・決済は未操作。GitHub Actions不使用。今回コミット・push・デプロイは行っていない。
- **網羅性ゲート**：`configuration-coverage-status.mjs --scoped-strict` は exit **0**（限定対象はPASS）、`--strict` は exit **1**（CONFIG-CROSS-01〜06の全組合せ網羅は未完了）。全件ランナーPASSを全設定業務の完全網羅と誤認しない。

最終の機械的証拠：`test-results/qa-modernization/auto-discovered-full-218-20261120-validation.json`。全件の実行ログ：`test-results/qa-modernization/auto-discovered-full-218-20261120.log`。各新規ケースのソースSHA256、PNGスクリーンショット、Gateway操作、物理SQLite検証は後述の各 `result.json` にある。

## 1. 取引データの一括リセット → 非同期完了 → 復元

追加：`test/auto-ci/configuration-cross-live-data-admin-transaction-reset-browser.test.mjs`

`mobile-app/web/data_admin.html` を実Chromeで開き、既存の実ボタン・ダイアログとサーバー側ジョブAPIを使用した。以下の10サブケースがPASS。

1. 非System管理者に破壊操作UIがないことと、Gateway経由での削除ジョブ作成拒否
2. System管理者がDB実件数を表示し、パスワード入力・確認ダイアログで操作を検討
3. 実UIから一括削除を受付。ジョブはpendingに永続化され、受付直後の業務行は不変
4. 受付後にブラウザを閉じ、独立したサーバーディスパッチで完了。再実行では二重削除なし
5. 注文・領収書の削除、商品・設定・従業員マスタ保持、バックアップと監査、他店舗の全比較
6. 新しいChromeで完了ジョブIDと削除後の対象件数0を再取得
7. `__transactions__` の復元バックアップを実UI履歴から選択、本人パスワードで復元を受付
8. ブラウザ離脱後に復元ジョブ実行。元の注文・領収書・マスタをSQLで照合し、復元前退避も保持
9. 別のChromeで復元完了、対象件数の復活、2本のバックアップ履歴を実画面で確認
10. 間違ったパスワードの実画面操作を拒否。ジョブ・全DB不変と入力修正可能なUI復旧

このテストでは実際のリモートCloudflareスケジューラーを起動していない。隔離DB上で既存 `runPendingTransactionResetJobs` / `runPendingDataAdminJobs` を実行し、クライアントから独立した永続ジョブの処理を検証している。

## 2. メニュー一括編集の権限変更 → 実ボタン操作

追加：`test/auto-ci/configuration-cross-live-menu-bulk-permission-browser.test.mjs`

管理者本人が `users.html` の権限チェックボックスを実操作し、**同じv3認証済みスタッフセッション**で `menu_editor.html` のチェックと一括操作ボタンを押した。次の10サブケースがPASS。

1. スタッフへの編集権限付与を本物の管理者画面で保存し、本人ログインと権限DB確認
2. 2商品の一括売切：確認後のGateway実行、2商品の売切日、非選択商品の不変
3. 権限剥奪中の売切解除：Gateway拒否・画面の検証不能表示・DB不変
4. 権限復帰後の売切解除：2商品の実SQLフラグと画面表示を確認
5. 2商品のキッチン表示OFF：実一括ボタンとDBの可視フラグを照合
6. 権限剥奪中の一括削除：事前削除影響のAPIから拒否、削除RPC未発行、行不変
7. 権限復帰後の一括削除：影響プレビュー→確認→選択した1商品の削除→画面再取得、他商品と別店舗の不変
8. 仮登録商品の一括公開を権限剥奪中に実ボタンで試行→Gateway拒否、全メニュー行と仮登録ステータス不変
9. 権限を実UIで再付与後に一括公開→商品価格150を保持、仮登録のレビュー理由をクリア、画面リロード後に販売中と表示
10. 以前に一括でOFFにした2商品のキッチン表示を再度ON→物理DB・非選択商品・認証済みスタッフセッションを検証

初回の個別実行で一時的に1サブケースがFAILしたが、原因は**権限剥奪時に正しく発生する読取失敗の日本語表示**をテスト期待文言に含めていなかったこと。RPC拒否・SQL不変の期待を変更せず表示文言を追加し、単独の全ケース再実行と関連6ファイル一括回帰でともにPASSした。初回FAILを当時の履歴から消去していない。

## 3. 再実行の検証証拠

| 対象 | 結果 | 証拠 |
|---|---|---|
| 取引リセット→削除→復元の実UI | 業務10/10 LOCAL_PASS（TAP親込み11/11） | `test-results/qa-modernization/configuration-business/cross-data-admin-transaction-reset-*/result.json` |
| メニュー一括権限切替 | 業務10/10 LOCAL_PASS（TAP親込み11/11） | `test-results/qa-modernization/configuration-business/cross-live-menu-bulk-*/result.json` |
| 新規2＋既存4ファイルの一括回帰 | **TAP 63/63、FAIL 0、skip 0、exit 0** | `test-results/qa-modernization/config-live-expansion-20261120-targeted-regression.log` |
| 既存自動検出ランナーFULL | **218/218ファイルPASS、FAIL 0、再利用 0、延期 0、exit 0** | `test-results/qa-modernization/auto-discovered-full-218-20261120.log` |
| 独立の証拠整合検証 | 218件の結果と一意なファイル集合を完全照合。両最新 `result.json` がPASS、ソースSHA一致、旧617ソース差分0 | `test-results/qa-modernization/auto-discovered-full-218-20261120-validation.json` |
| 設定網羅性の機械ゲート | 限定PASS `--scoped-strict` exit 0、全組合せ未達 `--strict` exit 1 | `test-results/qa-modernization/config-live-expansion-scoped-strict-20261120.log` / `config-live-expansion-global-strict-20261120.log` |

上記ログはPowerShellの `Tee-Object` により保存。`node --test --test-concurrency=1` で実際に6ファイルを同時指定した結果であり、別々のPASSを合算して一括回帰と偽っていない。負例では意図したDBロック欠落エラーのサーバーログが1件出力されたが、確認したロック不備による削除防止テストはPASS。

本日後半、追加3ケースの単独再実行PASS後に、改めてFULL 218ファイルを既存ランナーで通し実行した。`AUTO_CI_EXECUTION_COUNTS` は `selected=218, fresh=218, reused=0, fail=0, deferred=0, durationMs=1564665`。別の検証スクリプト `test-results/qa-modernization/auto-discovered-full-218-20261120-verify.mjs` が実行ログを再パースし、218件の一意なファイル集合・ケース証拠・ソースSHA整合を独立確認している。新規業務サブケース20件と全件ファイル218件は異なる分母。

## 4. 残件と次の優先順

1. **CONFIG-CROSS-01**：28の書込み・状態変更画面に対する全ボタン単位の権限×実業務網羅は未完了。今回は従来代表25/28画面を維持し、既存2画面の未検証アクションを増やした。画面代表数自体は増やしていない。`bridge`（実印字）・`clock`（カメラ/GPS）は機器・OS別ゲート。
2. **CONFIG-CROSS-03/04**：税×SC×コミッション×全割引方式×複数スタッフ×返金、VIP/時間の全境界と支払全方式はまだ全組合せを持たない。部分額返金は現行の公開業務APIの対象外と確認されており、存在しない操作をテスト用に追加しない。
3. **CONFIG-CROSS-02/05/06**：国別レシート実印字、実APNs/FCM通知、実外部決済、同時設定競合、OSレベル通信断、本番Worker/D1復旧。ローカルGateway検証を実物配送・実機QAの代用としない。
4. **回帰範囲**：218/218全件の最新一括回帰は今回取得済み。残るのはテスト未実装の全画面・全組み合わせへの拡充と、正式実機/本番依存のQAゲートである。

本書は既存 `CONFIGURATION_MATRIX_AUDIT_20261119.md` および `configuration-coverage-status.mjs` の未完了判定を変更しない、独立した進捗証拠である。
