# IZK-UT-178 / 第2弾 P0 WEB・独立DB実行ケース拡充

2026-11-17 / 既存のS5 Chromium・隔離テナントDB・QA証拠ゲートを再利用。本番Worker、実店舗、端末テストは含まない。

## 今回の成果と正式な状態

| 指標 | 前回 | 今回 | 増分 |
| --- | ---: | ---: | ---: |
| 要求総数 | 206 | 206 | 0 |
| 実行ケース紐付け | 98 | **109** | **+11** |
| 未紐付け | 108 | **97** | -11 |
| P0未紐付け | 44 | **33** | -11 |
| 新規Chromiumシナリオ | — | **3** | +3 |
| 正式実機QA PASS増分 | 0 | **0** | 0 |

**今回の紐付け増分は11要求。** S5の実Chromiumテスト内で独立SQL Oracleにより業務の整合性も証明するものを含むが、S4の業務QAを11件新たに実行したわけではない。共通のケース登録に `independentBusinessOracle` を明示し、要求側は `executionLane=web_with_independent_db_oracle` として実際の実行レーンを保持する。ソース不一致・欠損・FAIL・証拠未読込は業務要求もPASSとしない。登録だけではPASSとならない契約テスト済み。

## 追加した3つの実行ケースと既存CSVケースの強化

### `S5-DATA-JOB-LIFECYCLE-053` / data_admin.html

実ブラウザの削除確認・削除ジョブ登録→画面遷移・終了→セッション失効→サーバー実行→有効な別セッションからジョブ・バックアップ再読込→実ブラウザで復元確定→画面終了→サーバー復元→再読込。遅延・復旧・境界条件も含む。

- 消去対象仕入先の行数・処理時刻・ジョブID・再実行回数・バックアップ／復元前バックアップ履歴を物理SQLiteで照合。削除後0行、復元後は元の1行と完全一致。
- ジョブの新しい実行中リースは奪わず、36分経過の失効リースのみ再実行。継続実行しても二重処理なし。**Cloudflare本番Workerの実プロセス停止・再起動ではなく、孤立したrunningレコードを用いた決定的な復旧試験**。
- 旧認証セッションは401となり、別店舗バックアップIDを指定しても `not_found` で拒否。別店舗のSQL、従業員・権限・パスワードハッシュ、外部印刷設定・ダミー通知端末、Pro権利・設定が不変。
- 別のシステム管理者の独立署名セッションから、復元ジョブ実行中の全テーブル削除を拒否。ジョブ数2件を保ち、競合操作の重複なし。
- pending時は削除・取込操作が無効で、処理中の画面離脱と復帰後に完了件数1件を表示。7枚以上のPNGと、実RPC／DBスナップショットとSHA256で独立照合。

紐付け：`BW-DATA-02`、`BW-DATA-04`、`BW-EXT-021`、`BW-EXT-022`、`BW-EXT-025`、`BW-EXT-026`（6件、実行はS5 Web + 独立DB Oracle）、`BW-EXT-020`、`BW-EXT-073`（WEB）。

**再ログインの独立証拠を追加**：復元受付後に最初の実ブラウザを閉じ、別の新しいブラウザで`index.html`のワークスペース・ログインID・パスワードを実入力して`login` API成功を確認。ログイン後の`data_admin.html`実遷移で、復元済みジョブID・時刻・バックアップ行をサーバーから再取得し、画面の完了件数とSQLiteに一致することを検証。QAハーネスがページ遷移ごとにテスト用トークンを再注入していた誤動作を、初回のみ初期化する共通方式へ修正。これによりログアウト済み旧トークンの復活も防止し、既存`S5-SESSION-REVOKE-048`の実ブラウザ回帰でPASSを確認。

既存 `S5-DATA-STAGED-RESUME-051` の実CSV操作・タブを閉じた後のサーバー処理継続と独立SQL Oracleに `BW-EXT-015` を追加紐付け。さらに全監視タブを終了後、独立ブラウザタブから**実ログインフォーム**を通して再認証し、CSVジョブ完了とDB結果を読戻した。証拠ハッシュ対象のソース一覧は固定手入力ではなく、共通`captureChromiumSources`と一元化。

### `S5-DATA-CSV-DUPLICATE-055` / data_admin.html

重複した仕入先キー2行を含むCSVを実画面から取込し、処理途中に同じファイル／ジョブIDを再送。元ジョブIDでの再登録は1件に集約し、サーバーの失敗確定後も元の仕入先行と別店舗データがすべて不変であることを検証。さらに新しいジョブとして同一ファイルを再投入しても同じ原子的失敗となり、成功件数0・バックアップ0・ステージング行削除を独立SQLiteで確認。紐付け：`BW-EXT-016`（S5 Web＋独立DB Oracle）。

### `S5-LOGIN-DOUBLE-ACK-054` / manage.html

誤パスワードを実ログインUIへ入力→失敗理由表示・セッション生成ゼロ→正規ログインの署名セッション作成後、HTTP ACKだけを遅延→ログインボタン二重押しの抑止→実ブラウザで別画面へ遷移・戻る→認証済みUIが復活しないことを照合。

実Gatewayへのログイン要求1回、新規セッション1件。業務SQL・別店舗SQLの不変をSHA256で独立検証。3枚の実スクリーンショット・ソースハッシュを保存。紐付け：`BW-EXT-028`（WEB）。

## 検証結果

| 実行 | 結果 |
| --- | --- |
| 新規S5-053 / 実Chromium・Gateway・SQLite・証拠保存 | **1/1 PASS** |
| 新規S5-054 / 実Chromium・Gateway・SQLite・証拠保存 | **1/1 PASS** |
| 新規S5-055 / 重複CSV＋同一ジョブの再送・DB照合 | **1/1 PASS** |
| 3新規＋既存CSV2タブケース、最新ソースで再実行 | **4/4 PASS** |
| ビジネス／WEB要求分類、画面一覧、失敗証拠の拒否、実行ID登録、契約回帰 | **22/22 PASS**（最新ソースで再検証） |
| ビジネスデータ改ざん、競合、二重ログインなどの偽証拠注入 | 正しくNGになることを契約テストで確認 |
| 本番・実機の正式QA | **未実施、正式PASS増分0** |

証拠：

- `test-results/qa-modernization/s5-data-jobs/S5-DATA-JOB-LIFECYCLE-053-2026-11-17T08-02-10-108Z-p32652/result.json`
- `test-results/qa-modernization/s5-login/S5-LOGIN-DOUBLE-ACK-054-2026-11-17T08-02-10-150Z-p34012/result.json`
- `test-results/qa-modernization/s5-data-csv-negative/` 配下の最新 `S5-DATA-CSV-DUPLICATE-055-*/result.json`

ソース：

- `scripts/qa-modernization/s5-data-job-lifecycle-browser.test.mjs`
- `scripts/qa-modernization/s5-login-concurrent-browser.test.mjs`
- `scripts/qa-modernization/s5-data-csv-duplicate-browser.test.mjs`
- `scripts/qa-modernization/s5s6-evidence.mjs`
- `scripts/qa-modernization/business-web-scenario-requirements.mjs`
- `scripts/qa-modernization/business-test-readable.mjs`
- `scripts/qa-modernization/business-web-coverage.test.mjs`
- `test/auto-ci/izk-ut-178-new-p0-oracles.test.mjs`

## 未完了・制約

- `BW-EXT-019` は本番Workerの実再起動を伴う証明がないため未紐付け。失効リースの再開のみ実証。
- `BW-EXT-020` は新しい実ブラウザから`index.html`で正規ログインし、`data_admin.html`で復元結果まで再読込するシナリオがPASSしたため紐付け済み。旧ハーネスのトークン再注入で発生した一時的な401は初回だけ認証初期化する方式へ修正し、旧セッション失効の回帰もPASSした。未完了の物理端末・クラウド再起動検証と混同しない。
- `BW-CROSS-04` の削除・復元・CSV全3種類の同時複数タブ監視はまだ一つの包括ケースとして未証明。CSVの独立2タブは前回S5-051でPASS。
- S5の2ケースを業務／WEB双方の証拠に利用しても、独立したS4の全件実行や実機QAの件数は増やさない。
- 本番へのWorker/DB反映、コミット・プッシュ、iOS/Androidビルドは行っていない。既存の別作業者の変更は触れずに保持した。

**結論：IZK-UT-178はOPEN継続。206要求の全件完了を宣言しない。**
