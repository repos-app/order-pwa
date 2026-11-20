# Izakanpai — Data Admin 通信応答喪失・正式QA/リリース残件の監査

**実施日:** 2026-11-20。既存Chrome/Gateway/SQLite、既存の `configuration-cross-live-data-admin-transaction-reset-browser.test.mjs` を再利用。GitHub Actions不使用。

## 今回の実行済み成果

| 項目 | 結果 |
|---|---|
| 取引削除ジョブACK喪失の新規業務ケース | **3/3 LOCAL_PASS** |
| 同一画面の既存＋追加業務ケース | **13/13 LOCAL_PASS**（Node TAP親を含め14/14） |
| データ管理・Transaction Reset・設定/業務Webの関連6ファイル一括回帰 | **119/119 TAP PASS、FAIL0、skip0、exit0** |
| 中央網羅性監査に追加した独立レーン | `crossLiveDataAdminReset` **13/13 LOCAL_PASS**、最新ソースと画像10件のSHA256も照合 |
| ローカル限定ゲート | **SCOPED_LOCAL_REGRESSION_PASS / exit0** |
| 全設定×権限×業務・実機完全ゲート | **NOT_FULLY_VERIFIED / exit1**。全網羅という虚偽のPASSへ書き換えていない |

### ケース 11：サーバー受付後の応答だけを喪失

実ブラウザの「取引データ削除」ボタンと確認ダイアログ、パスワード認証を経由。既存の production Gateway 関数が実SQLiteへ **pending削除ジョブを確定した後だけ**、ローカル検証器がHTTP結果を503に差し替える。ブラウザは受付不明を表示してジョブ状態を再照会する。

**PASSオラクル：** ブラウザが受付失敗を観測し、実DBに追加されたジョブは正確に1件。自動重送なし、確定前の注文・領収書は未削除、処理中は「削除」ボタンが無効で二重実行不可。

### ケース 12：画面を閉じてもサーバーで1回だけ実行

ブラウザを閉じ、既存 `runPendingTransactionResetJobs` の実ジョブ実行を行う。再ディスパッチしても処理対象なし。ジョブのattempts=1、completed、バックアップIDあり。注文・領収書だけを削除し、別店舗の業務レコードとマスタは不変。

### ケース 13：新しいブラウザで結果を復元

新たなChromeセッションで `data_admin.html` を開くと、同一ジョブIDのcompleted表示・削除対象0件・二重操作不可を確認。DB上の該当ジョブIDも1件のみ。

これは**テスト用応答喪失の障害注入**であり、実OSの通信切断・実Cloudflare Worker再起動・本番D1競合を証明するものではない。

## 証拠

- 実行ソース：`test/auto-ci/configuration-cross-live-data-admin-transaction-reset-browser.test.mjs`
- 最新のケース実行結果：`test-results/qa-modernization/configuration-business/cross-data-admin-transaction-reset-*/result.json`（schema `izakanpai.qa.config-cross-live-data-admin-reset.v1`）
- 画面画像10件：同じ実行ディレクトリ内のPNG、SHA256とバイト数を記録
- 関連一括回帰：`test-results/qa-modernization/config-data-admin-ack-loss-related-20261120.log`
- 中央監査実行：`test-results/qa-modernization/config-data-admin-ack-loss-20261120-scoped.log` および `config-data-admin-ack-loss-20261120-strict.log`
- 中央監査ソース：`scripts/qa-modernization/configuration-coverage-status.mjs`

## 正式QAの未完了境界を分ける

保護画面は34、永続書込み・状態変更・端末操作面は28。通常ロールの権限付与→剥奪→復帰＋実UI操作を行った代表**25/28**画面とは別に、今回の **data_admin はSystemロール限定の破壊操作として13件検証**。Systemロール専用機能に通常社員の権限トグルを仮定して、通常の権限フロー数を無根拠に26へ増やさない。

残る物理境界は `bridge.html` のBluetooth/USB印刷と実ACK、`clock.html` のOSカメラ/GPS付き勤怠打刻。ほかにも各画面内のすべてのボタン×各ロール×全設定組合せ、真の複数Cloudflare Worker間競合、実PSP/返金、端末のネットワーク断、APNs/FCM通知の正式試験は未完了。

**今回の正式実機QA：NOT_RUN、新規確定PASS 0／新規確定FAIL 0。** Android SDKのADB本体は `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` に存在したが、絶対パスから実行した `adb devices -l` の接続端末は**0台**。このWindows環境では `xcrun` と `xcodebuild` が使用できず、iPhone/Realme端末の実操作テストは実施されていない。過去の正式NGスナップショットには2026-10-10時点のAndroid **245件のFAIL** が存在し、今回0件と混同しない（読み取り専用結果：`test-results/qa-modernization/android-device-readiness-20261120.json`）。これらをソーステストのPASSで代用しない。

## リリース安全ゲート

既存 `scripts/release/deploy-impacted-workers.mjs` は、本番操作前にクリーンな全リンクworktree・push済み`origin/main`一致・GitHubリモートSHA照合・変更インパクト検査・ライブDB全テナントスキーマ・dry-run・デプロイ指紋照合を必須とする。未コミットの開発変更を含めたままのWorkerデプロイは防がれる。

本監査記録は、**コード・ローカルQAの実装済みと、本番反映・正式承認の未実施を明確に区別**する。後続の実行結果が揃うまで本番Worker/DB、配信Web、ネイティブアプリの反映を成功と記録しない。

### 本番読取り照合で発見したブロッカー

`node scripts/release/verify-deployed-rpc-contract.mjs` の読み取り専用チェックを実行したところ、RPC名の一致確認後に **`PRODUCTION_RPC_IMPLEMENTATION_DRIFT`** となり、**exit 1**。現在のソースから導出した実装digestと本番Common Gatewayのdigestが一致せず、現行ソースがすべて本番反映されたとは言えない（証拠：`test-results/qa-modernization/live-rpc-contract-readonly-20261120.log`）。プロダクトコードへの差分があるため、Workerの再公開には既存のライブD1スキーマチェックと認証済みデプロイ証拠が必要。

インデックスには多数の先行QA/修正ファイルがステージ済みで、同時作業者による更新も観測されている。リモートpushで動作するGitHub Actionsの `push:` 定義は4ファイルに存在。ユーザーの**GitHub Actions不使用**指示に従い、これらを不用意に実行するpushは行っていない。未確認のステージ済み差分を独断でリリース確定扱いにしない。
