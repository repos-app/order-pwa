# iOS CLOSE-001〜005 SOURCE 契約・独立照合・未接続条件（2026-10-27 PHT）

## 実装結果と正式QAとの境界

- 対象: `QA2-KEEP-OPR-CLOSE-001`〜`005`。正本: `.qa-v2-official/manifest.json`（831件）。`.qa-v2-official/ios/state.json` 上は5件とも **NOT_RUN / attempts=0**。旧AndroidのPASSはiOSへ代入しない。
- 既存 `scripts/qa-autonomy/ios-business-integrity-family.mjs` に共通 `operation_close` SOURCE照合を追加。別driver/独立publisher/登録helperは新設していない。ケース別の期待・画面経路・所有cleanup・不足能力は既存 `test/plans/qa-v2-ios-source/operation-integrity-cases.json` に宣言した。
- 共通の物理要件は claimed Bridge / HID / DDI / iPhone PNG / authenticated native HTTP / 独立したteat D1 / owned cleanup を前提とする。現時点の `makeIosOperationClosePlan` と `runIosOperationCloseCase` は不足能力を明示して実行拒否する。SOURCE registry は独立claim付きD1 reader未実装のためこの5件を登録していない。
- 操作は「閉店前の状態照合」であり、`register.html` のZ締め操作そのものを実行するケースではない。

## 5ケースの業務対象と必須の独立証拠

| Case | 画面 / 業務集合 | 必須照合 | 実機前提・未解決 |
| --- | --- | --- | --- |
| CLOSE-001 | `admin.html` / 未会計・非取消 `orders` | 店舗全件の非最終注文IDとUI全件一致、不可視0 | `src/orders.js` のactive取得は特定3 status に限定。全状態を網羅する独立D1が必須 |
| CLOSE-002 | `kds.html` と `admin.html` / 厨房表示対象の未提供注文 | 独立D1・KDS・Adminの同一ID集合をそれぞれ完全照合 | 厨房非対象アイテムと古いstale表示がKDSで別処理。対象fixtureは厨房表示対象で、staleの所在も実機確認が必要 |
| CLOSE-003 | `admin.html` / 未受渡 `takeout_orders` | 受渡未完了IDを画面行と状態込みで照合 | 現行 `takeout.html` は顧客注文フォーム。管理画面で全件の受渡状態を列挙するレビュー済み経路が見つからない（`getTakeoutOrders` APIは存在） |
| CLOSE-004 | `printers.html` / `print_queue.status='pending'` | 全pending job IDと印刷キューID一致 | 画面は `getPrintQueue(60)` 固定上限。独立COUNTと全件列挙が必要。キュー取得時にstale printing claim回収の副作用があり得る |
| CLOSE-005 | `receipts.html` / 対象月の正常会計receipt | 非返金・非demoのreceipt ID集合、独立COUNT、独立成功checkout eventの一意settlement ID集合が一致 | monthページ全件巡回と店舗営業月境界の検証が必要。RF-返金を正常会計に含めない |

共通独立Oracleは、teat tenant全行の読み切り・別の集計クエリと件数一致・同一snapshot・before/afterの行状態不変・所有fixtureサンプルの包含・UI/HTTPの各route ID集合一致・iPhone画面読込完了/PNG・外部認証HTTP・複数route別のrequest IDを検査する。005ではさらにreceiptから独立した成功checkoutイベントのsettlement ID集合を要求し、同じcheckoutに二重receiptが存在しても拒否する。

共通cleanupは既存 `cleanupIosBusinessIntegrityFixture` の owned `teat` 範囲、別の独立D1読戻し、original baseline SHA、audit保持・他店舗不変・セッション/lease解放を再利用する。ケースJSONの `preserveReceipts` と `restoreOwnedInitialSnapshots` はSOURCE上の要求であり、実D1 cleanup結果は未取得。

## SOURCEレビュー S01〜S10

| 観点 | 参照・確認した事実 | 結果 |
| --- | --- | --- |
| S01 正本拘束 | `verifyIosBusinessIntegrityManifest` で831件/アクション/期待/旧ID照合 | SOURCE確認 |
| S02 共通化 | `operation_close` は既存 family関数・JSONから展開、ケース別JSなし | SOURCE確認 |
| S03 店舗所有 | `verifyIosBusinessIntegrityFixture` でteat、case owner、exclusive lease、owned sampleを要求 | SOURCE確認 |
| S04 対象件数 | 別集計 readId/SHA と完全ページ数、重複ID・欠落を拒否 | SOURCE確認 |
| S05 変化不変 | readPairとbusiness/snapshot/row-state一致を要求 | SOURCE確認 |
| S06 UI全件 | 全routeごとにloading完了、hasMore=false、ID集合一致を要求 | SOURCE確認 |
| S07 Native HTTP | store/claim/個別request/独立capture/読み切りを照合 | SOURCE確認 |
| S08 会計集計 | 通常receiptと独立成功settlementのID集合照合、二重会計ID拒否 | SOURCE確認 |
| S09 cleanup | 共通owned cleanupと別readback、baseline SHA保持、unowned不変 | SOURCE確認（実D1未実施） |
| S10 誤ったPASS防止 | `executableWithCurrentBridge=false`、plan拒否、正式Runnerに操作なし | SOURCE確認 |

## 横展開レビュー H01〜H10

| 観点 | 確認元と判断 | 結果 |
| --- | --- | --- |
| H01 Admin注文一覧 | `mobile-app/web/admin.html:373-405` は会計済/取消のみ除外。独立全状態集合で検出が必要 | 未接続UI検証 |
| H02 Backend注文状態 | `src/orders.js:310-361,398-414` はactive status限定。未知非最終statusの表示漏れを許さない | SOURCE反映 |
| H03 KDS厨房対象 | `mobile-app/web/kds.html:145-153,254-313` の非厨房商品/古い注文の扱いを確認 | 未接続UI検証 |
| H04 テイクアウトAPI | `src/takeout.js:251-352` の一覧/受渡statusと Native takeout注文フォームを比較 | UI導線不足 |
| H05 印刷Queue | `mobile-app/web/printers.html:469-491` は先頭60件、`src/printers.js:451-477` は stale claim回収の副作用あり | paging・read-only未解消 |
| H06 月別Receipts | `mobile-app/web/receipts.html:231-248` のページネーション | 全ページHID未接続 |
| H07 返金除外 | `src/reports.js:389-447` の通常/ RF- 返金件数区別 | SOURCE反映 |
| H08 他業務Oracle | BILL/BCP/REFの同じ before/after/cleanup primitives を再利用 | 既存回帰保持 |
| H09 iOS physical接続 | `scripts/qa-v2-ios-claimed-bridge.mjs`、`scripts/qa-v2-ios-ddi-admission.mjs` のclaims/USB/DDI/HIDを確認 | 実機前提未接続 |
| H10 Stage/Registry | `ios-source-contract-registry.mjs` と `ios-831-stage-action-matrix.mjs` はSOURCEのみで正式PASS化しない | 831監査回帰保持 |

## ローカル検証・残件

- `node --test scripts/qa-autonomy/ios-business-integrity-family.test.mjs` → **11/11、exit 0**。指定5件のpositive shape、ID欠落、D1件数ずれ、HTTP/UI欠落、snapshot不一致、settlement不一致、cleanup他店舗漏れをパラメータ化確認。
- `node --test scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/ios-831-stage-action-matrix.test.mjs` → **15/15、exit 0**。
- `node --check scripts/qa-autonomy/ios-business-integrity-family.mjs` → exit 0。
- 未完了: 本物のclaimed iPhone物理操作、画面座標/全ページ、独立teat D1 reader・集計・イベントlog、003の受渡一覧UI、004の60件上限・読取副作用解消、005の営業月境界読戻し、case-owned実cleanup。SOURCE fixture宣言/オフラインNodeテストを正式QAとみなさず、iOS正式PASSの増加は0。
- 本件では iPhone/TestFlight/Apple/remote D1/正式Runner・公式台帳/commit/push/deploy を操作していない。
