# S6 通信断・ACK喪失・同時会計・プロセス再起動の実画面E2E（2026-11-08 PHT）

## 判定

**S6は部分完了。** 実Chromium＋既存S2独立SQLite/Gateway＋既存S4独立SQL Oracleを再利用し、今回追加したS6実画面E2Eは **2/2 PASS、0 FAIL、exit 0（9,491ms）**。新規発見した会計競合不具合 `IZK-UT-139` は再現→SOURCE修正→再実行で修正を確認し、障害ダッシュボードは **WAIT_TEST、CLOSEDではない**。

これはローカルWebの品質証拠。正式Android/iOS端末QA・実ネットワーク/本番テナントの試験ではない。正式QA台帳のPASS増分は0。

### 実ケース・原証拠

| 新規ケース | 手順と業務受入条件 | 確定結果 | 原証拠 |
|---|---|---|---|
| `S6-CHECKOUT-RECOVER-001` | 実Chromiumをオフラインにして会計不可→オンライン復帰→確定前のHTTP応答503（DB無更新）→不明状態から再タップしても**読取のみ**→画面更新して利用者の新規会計操作→バックエンド領収書確定後ACK 503→照合APIも503→次の照合で元の同一領収書復旧→**Chromeプロセスを再起動**して会計一覧・領収書履歴を確認。DBで会計済み注文2・領収書1・監査1・注文リンク2、別店舗不変、金額破壊負例検知と修復 | **PASS 1/1**。finalize要求2（最初はDB未実行、次は確定後ACK喪失）、read-only照合4回、最終領収書 OR-000001×1 | `test-results/qa-modernization/s6/S6-CHECKOUT-RECOVER-001-2026-11-08T03-24-18-857Z-p24548/result.json`、同run PNG5枚 |
| `S6-CHECKOUT-RACE-002` | 2つの実Chromium管理画面をそれぞれ事前ロード、両方で同じ提供済注文2件を会計プレビュー→**2画面から会計確定**→サーバー先行成功と後続 `nothing_to_bill`→後続は注文ID全件で独立した `getCheckoutOutcome` を実行→2画面で**同じ元領収書**を表示。SQLiteで領収書/監査各1件、双方の注文リンク全件、金額異常を検知・修復 | **PASS 1/1**。finalize要求2、getCheckoutOutcome要求1、元領収書 OR-000001×1、二重確定0 | `test-results/qa-modernization/s6/S6-CHECKOUT-RACE-002-2026-11-08T03-24-24-525Z-p24548/result.json`、同run PNG2枚 |

共通起動：`node --test test/auto-ci/qa-modernization-s6.test.mjs`。`PRECOMMIT_TIER: EXTENDED` に登録し、`run-auto-discovered-tests.mjs --list` に含まれ、通常の `--ci --list` には含めない（無関係なPush毎の重いブラウザ全件実行を避ける）。**CI登録はGitHubでの実行実績を意味しない。**

### S6証拠監査

最新2つのrun別 `result.json` に対して独立監査を実施：

- 両方 `verdict=PASS`、`formalQa=false`、`remoteCloudflare=false`、外部ホスト0、ブラウザ/Gateway予期せぬエラー0。
- PNG **7/7枚SHA256一致**、バイト数一致。実ブラウザのUI表示とGateway応答ログ、独立SQLの `before`／`after`／`cleanup` を別途保存。
- 監査対象の片方のDBを金額更新で壊して独立OracleのFAILを確認し、値を戻して再照合。全店舗の全store_id付きSQL表について `cleanup === before`、テスト対象外店舗は `after[other] === before[other]`。
- S6シナリオはS5の7件と重複する過去ケースを二重計上せず、**S6新規2件**として管理。既存S4・ソース契約・実機QAとのPASSも合算しない。

## 新規障害 IZK-UT-139：原因と修正

**修正前実Chromium FAIL**：`test-results/qa-modernization/s6/S6-CHECKOUT-RACE-002-2026-11-08T03-20-00-611Z-p7580/result.json`。2人目の `finalizeBill` 応答 `{error:"nothing_to_bill"}` に対し、管理画面が汎用エラーを表示し、既存領収書を復元する `getCheckoutOutcome` を呼ばなかった。DBの原伝票はすでに1件正しく確定しており、**UIが「処理されていない」と誤認する運用リスク**だった。

**修正方法**：3配布面 `mobile-app/web/admin.html`、`docs/yuwaku/admin.html`、`docs/yuwaku/test/admin.html` で `nothing_to_bill` を既存の `already_settled` と同じ**読取専用照合**へ合流。注文ID全件・卓・認証店舗が整合する既存領収書のみ表示し、不明な結果は未確認のまま。**再会計POST・再印刷は実行しない**。Backendの確定処理や権限ルールは変更していない。

テスト専用の競合ケースで `bootstrap` を2ページ同時に開くと、今回の環境では一度 `API is not defined` の画面JS初期化失敗も観測。**ページの初期化を1つずつ完了させた後、実際の確定送信だけを同時にする**方式へ変更した。業務上の並行会計は維持し、未初期化画面のノイズと区別。修正前のtimeout/FAIL結果を消去・PASS換算しない。

### 既存テストの実行（別集計）

| レーン | 実測 |
|---|---|
| 3配布面の会計応答喪失ソース/実DB回帰（`test/auto-ci/checkout-response-loss-recovery.test.mjs`） | **16/16 PASS**。従来10件に新規6件（競合からの復元3面＋領収書なしの偽成功拒否3面） |
| S4会計確定/二重会計防止 `S4-CASH-CHECKOUT-010`・`S4-CASH-REPEAT-011` | SQLite **2/2 PASS**、隔離workerd/D1 **2/2 PASS**、各runに独立SQL/cleanup証拠。S4全47件再実行ではない |
| 既存S5の実Chromium E2E（`qa-modernization-s5.test.mjs`） | **7/7 PASS、0FAIL、exit0、39,711ms**。新UI修正が既存カテゴリ・発注・AI・在庫・会計/返金を壊していない |
| 共通ヘッダ/重要UI保全 `critical-ui-preservation-gate.mjs`＋独立 `critical_ui_preservation_gate_test.mjs` と `qa2_header_two_row_regression_test.mjs` | ゲートPASS、独立回帰 **21/21 PASS** |
| 在庫の同一ID再試行の3配布面回帰 | **3/3 PASS**。今回の会計変更で以前の在庫リトライ保証を落とさない |

## 案件固有の自己レビュー10観点（S01〜S10）

各観点は別の安全条件・実検証結果を確認し、単なるソース検索の反復を回数に換算していない。全件**SOURCE/LOCALレベル**での確認で、実機PASSではない。

| ID | 独立観点と確認結果 | 根拠 |
|---|---|---|
| S01 | **PASS**：競合後続が `nothing_to_bill` を実際に返すことを修正前FAILログで再現 | 修正前race runのGateway `responses` に2つ目の確定結果 |
| S02 | **PASS**：`nothing_to_bill` が再書込でなく既存 `checkCheckoutOutcome()` に入る | 3配布面の分岐、修正後race `getCheckoutOutcome` 1回 |
| S03 | **PASS**：結果再照合は予め見えていた全注文ID・卓・認証トークンを送る | `admin.html` の `payRecoveryOrderIds`・`API.post('getCheckoutOutcome')` |
| S04 | **PASS**：重複・空ID・不正卓の照合を拒否し、注文一致しない場合は未確定 | `src/billing.js:getCheckoutOutcome`、既存明細不整合/重複ID試験 |
| S05 | **PASS**：認証トークンから店舗を確定し、他店舗の領収書を復元しない | `src/gasApi.js` の `requireAuth` とstoreId強制、S6交差店舗拒否 |
| S06 | **PASS**：原伝票の全リンク・金額が独立DBと一致、返金済みや一部明細だけの照合を成功扱いしない | `src/billing.js` のreceiptリンク検査、S6 SQL、従来部分選択回帰 |
| S07 | **PASS**：`nothing_to_bill` でもDBに領収書がなければ偽の成功伝票を作らない | 3配布面それぞれの新規負例（3/3） |
| S08 | **PASS**：再照合成功は表示のみで、レシートを自動再印刷しない | `checkCheckoutOutcome` に印刷呼出なし、新規復元回帰3/3 |
| S09 | **PASS**：不明状態からのボタン再押下は読取のみ、新しい支払POSTを自動作成しない | S6 recoverのfinalize2件（別々の明示的操作）、読取4件 |
| S10 | **PASS**：不正金額を独立SQLへ注入した場合にOracleがFAILし、補正後は全店舗cleanup確認 | S6二ケースの実SQL corruption・`cleanup===before`・PNG SHA7件 |

## 独立した横展開10観点（H01〜H10）

| ID | 別の配布面/業務への横展開と確認 | 根拠 |
|---|---|---|
| H01 | **PASS** Native本体 `mobile-app/web/admin.html` | 競合分岐静的照合、新規回帰2件 |
| H02 | **PASS** Web本番 `docs/yuwaku/admin.html` | 競合分岐静的照合、新規回帰2件 |
| H03 | **PASS** Web TEST `docs/yuwaku/test/admin.html` | 競合分岐静的照合、新規回帰2件 |
| H04 | **PASS** 会計不確定のJA/EN文言・共通言語切替導線を保全 | 既存言語分岐、共通ヘッダChromium回帰 |
| H05 | **PASS** Help・戻る・リフレッシュ・AI残高ヘッダの既存操作を維持 | 重要UI独立21/21＋critical UIゲート |
| H06 | **PASS** S4 SQLiteの現金会計/二重処理のSQL不変条件 | `S4-CASH-CHECKOUT-010`・`S4-CASH-REPEAT-011` 各1 PASS |
| H07 | **PASS** 隔離workerd/D1で同じ会計不変条件と証拠を検査 | 同S4のworkerd 2/2 PASS |
| H08 | **PASS** 既存S5画面回帰（会計プレビュー/全額返金を含む） | 新SOURCE差分後の7/7 PASS |
| H09 | **PASS** 在庫入荷の同一IDリトライと3配布面の再表示保証を維持 | `inventory-movement-response-loss.test.mjs` 3/3 PASS |
| H10 | **PASS** 新S6はnpm自動発見EXTENDEDに登録し、無関係Pushに全件を強制しない | `--list` S6存在、`--ci --list` からS6除外、S6直接統合2/2 PASS |

## 未完了・次のS6範囲

実機ネットワークインターフェースの抜線/切替、強制終了→Nativeアプリ再起動、複数**物理端末**の同時会計、印刷キュー/実プリンタへの副作用、テナント本番Cloudflareでの真の競合、外部決済確認は未実施。**この第一弾時点では**会計2シナリオのみ。後続S6第二弾で入荷・発注・AIの異なるChromiumプロセスをまたぐID保存と再操作を**実E2E 3/3PASS**で追加検証した（別原本 `S6_BUSINESS_RESTART_20261108.md`）。S6統合は計5/5PASS。実Nativeの強制終了はなお未検証。

既存のソースdirty差分を保全。ユーザー承認なしのGit commit/Push、Worker/Web配布、モバイルビルド、正式QA台帳更新は実施しない。次のチャットは `QA_MODERNIZATION_PROGRESS.md` を原本として継続。
