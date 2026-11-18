# IZK-UT-178 / P0実ブラウザ・業務シナリオ拡充（2026-11-17 PHT）

## 実装対象と完了条件

「画面操作→実API→独立DB Oracle→再表示／異常後復旧」を既存S4/S5/S6ランナーに追加。静的なソース文字列照合だけでは要求リンクを付けない。テストIDの登録・実行PASS・製品の正式実機QAは独立した指標で管理する。現行製品を改変せず、端末の認可や実サービスの副作用のない隔離テナントを使う。

| 集計（変更前→変更後） | 件数 |
| --- | ---: |
| 要求総数 | 206→206 |
| 実行ケースへの要求紐付け | **93→98（+5）** |
| 未紐付け | **113→108（-5）** |
| うちP0未紐付け | **49→44（-5）** |
| S4の実行シナリオ総数 | **64→66（+2）** |
| 追加の正式実機QA PASS | **0** |

### 新しいP0 Oracleと独立証拠

| 要求 | 現行実行ケース | 具体的なユーザー行動・検証経路 | 何を根拠にPASSさせるか |
| --- | --- | --- | --- |
| `BW-EXT-003` | `S4-SECOND-SESSION-PAID-VOID-065` **新規** | 管理者Aが注文確定→別認証セッションでログインした端末Bが確定済み注文取消を試す→正規返金RPCで逆伝票を発行→Bが領収書一覧を再読込 | 実Gatewayの`already_settled`、元伝票100＋逆伝票−100、純売上0、監査2件、店舗B不変、QAセッション削除。SQLiteとworkerd D1の両方で同じ独立SQL Oracle |
| `BW-EXT-006` | `S4-SECOND-ADMIN-TAX-SNAPSHOT-066` **新規** | 管理者Aが注文作成→別の管理者BがVAT 12%へ設定変更→Aが決済→Aが税率0%へ再変更→元領収書を再取得 | 確定時点の小計100・VAT12・合計112が領収書・行明細・監査に固定される。QA専用社員／セッション削除と店舗B不変。SQLiteとworkerd D1の両方で同じ独立SQL Oracle |
| `BW-EXT-018` | `S5-DATA-STAGED-RESUME-051` **既存強化** | 実Chromiumの2タブで同一CSVジョブを読み、タブAで送信と進捗更新、タブBでも受付状態更新→Aを閉じる→サーバー側dispatcher→Bで完了件数を更新→B再読込 | `stageDataAdminImport`・chunk・queueが各1回、server job ID1件、pending→completed、affectedCount2・errorCode=null、両タブのステータス、SQL変更2行と店舗B不変、PNGとソースhashを独立証拠とする |
| `BW-EXT-002` | `S6-CHECKOUT-DUPL-NAV-007` **新規Chromium** | 実ブラウザで会計確定ボタンを連打→DB確定後のACKを意図的に遅らせて処理中に画面移動→戻り操作・領収書画面を再表示 | API `finalizeBill` 要求1回、処理中ボタン禁止、DB領収書1件、再表示で同一OR番号、二重会計なし、故意の領収書改ざんが独立SQLによりFAIL |
| `BW-EXT-023` | `S5-DATA-STAGED-RESUME-051` **既存Chromium強化** | 実CSVで数式先頭`=2+2`とHTML`<img ...>`を店舗にインポート→データ管理画面からCSVエクスポート→仕入先マスタの実画面へ移動 | DBには元の文字列のまま保存、CSVの式は`'=2+2`に無害化、HTMLが実DOM `<img>`にならない、スクリプトが走らない、他店舗不変。CSV画面操作とSQL＋PNGを独立照合 |

### 既存基盤を再利用

- 共通API・実DB：`scripts/qa-modernization/s4-business-scenarios.mjs`／`local-gateway-fixture.mjs`／`s4-workerd-fixture.mjs`。各fixtureでQA用途の独立セッショントークンを発行し、**本番シークレットには触れない**。
- 独立Oracle：`scripts/qa-modernization/s4-evidence.mjs`／`s4-integrity-oracle.mjs`。商品価格・税額・領収書・ログ・他店舗不変を検査。元の業務コードが返す`success`だけでは合格しない。
- 実Chromium：`scripts/qa-modernization/s5-data-staged-resume-browser.test.mjs`、証拠ゲート`scripts/qa-modernization/s5s6-evidence.mjs`。PNG、サーバーjob、2タブ状態とSQLを照合。
- CSV出力の実ファイル`exported-suppliers.csv`をダウンロードから保存し、SHA-256・サイズ・内容（数式の無害化とHTML原文）を共通証拠ゲートが読み直す。真偽値だけの自己申告でPASSとしない。
- S6の新規会計連打ケースも共通Chromium/Gatewayハーネスを再利用。Webでの処理中遷移とDB反映を検証するが、ネイティブアプリのバックグラウンド実機QAの代用にはしない。
- `test/auto-ci/izk-ut-178-new-p0-oracles.test.mjs`を共通auto-ciレーンへ追加。要求ID→実行IDと、独立SQL receipt line-priceの**破壊注入で必ずFAILになる検知力**をテスト。
- ダッシュボードのシナリオ説明 `scripts/qa-modernization/business-test-readable.mjs` に新規2件の日本語の操作・期待結果を追加。

### 検証結果（正式QAと混同しない）

| 検証 | 結果 |
| --- | --- |
| 新S4-065／066：隔離SQLite単独 | 両件 PASS |
| 新S4-065／066：隔離workerd/D1単独 | 両件 PASS |
| S5-051 CSV2タブ＋server job＋SQLite＋独立Chromium oracle | 1/1 PASS |
| S6-007 会計連打＋画面遷移＋ACK保留＋領収書読戻し・故障注入 | 1/1 PASS |
| S5-051 数式注入・HTMLの入出力・実画面エスケープ追加 | 1/1 PASS |
| 新P0契約テスト＋偽伝票／二重送信・不正証拠の故障注入 | **4/4 PASS**。故障状態を正しく拒否、正式QAには計上しない |
| `business-web-coverage`＋S4実行ゲート | 15/15 PASS |
| S4既存64件＋新2件、隔離SQLite全件回帰 | **66/66 PASS、FAIL 0、BLOCKED 0、独立検証66件**。`test-results/qa-modernization/s4/local-api-2026-11-17T07-09-11-263Z-p11676-n1/summary.json` |
| 隔離workerd/D1のS4全件回帰 | **66/66 PASS、FAIL 0、BLOCKED 0、独立検証66件**。`test-results/qa-modernization/s4/local-d1-2026-11-17T07-09-01-131Z-p32820-n1/summary.json` |
| `business-test-readable`＋S4登録契約 | 10/10 PASS |
| 既存3件＋新S6-007のChromium会計復旧・競合全件 | **4/4 PASS**。最新ソースSHA一致・独立PNG/SQL証拠で4/4 PASS |
| S5-051 CSV2タブ＋式注入／HTML＋再取込・出力 | **1/1 PASS**。最新ソースSHA一致・実出力CSVハッシュ・独立PNG/SQL証拠でPASS |
| 正式端末・本番Cloudflare・本番DB判定 | 実施なし／正式QA PASS増分0 |

### 残り108要求の取り扱い

- 現行206要求のうち、未リンク108件（P0 44件）はすべて製品バグではない。実行可能なP0から、**ユーザー操作・サーバーRPC・DB状態・他店舗影響がそろうケースだけ**を新規登録する。
- 既存のS4/S5/S6実証に部分的に含まれる要求でも、独立した期待値が欠けていれば`caseId`を空欄に保持する。単純な広域テストの存在だけでは紐付けない。
- `BW-EXT-075`は、通信断中の現金受領メモと**正式なオンライン会計確定**を区別する必要がある。現行の「オフラインで正式会計確定しない」条件を守りながら、通信復帰後の二重確定防止と耐久記録を検証する未紐付け要求として残す。
- 外部Apple／実プリンター等を必要とする要求はローカルダミー・シミュレーターで実機PASSにしない。
- 再実行で未解消NGがあれば、既存NG remediationゲートを通し、偽PASS／古い実行証拠の流用を禁止する。

## 今回のリリース境界

変更は共通テストソース・fixture・要求対応表と本報告のみ。製品コードの改変、コミット／プッシュ、Worker／DB本番反映、モバイルビルド、正式実機QA判定は行わない。

**IZK-UT-178はOPEN継続。** 要求全206件に対する網羅完了ではなく、独立証拠まで揃ったP0要求を5件追加した実績である。正式実機QA増分は0件。
