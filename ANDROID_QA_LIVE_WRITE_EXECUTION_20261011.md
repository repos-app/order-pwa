# Android 実機QA・書き込みを伴う短時間ケース実行手順（2026-10-11）

対象: `.android-real-device-run/state.json` の `family=OPERATION,status=NOT_RUN`。実行店舗は `teat` に限定する。**この手順書の作成そのものでは端末操作・正式runner変更を行っていない。** 2026-10-11、ユーザーはリリース前のQA用途として `teat`・`yuwaku`・新規テナントの書き込み利用を明示許可した。ただし、この手順書は保存対象を `teat` の作成者所有QAレコードに狭める。commit、push、本番デプロイ、既存他人データの無差別削除は許可範囲に含めない。現行実機パッケージ v910015 は導入済みとの作業前提であり、APK内容・Worker/schemaとの差分は未検証。下記の「v910015候補」は画面に当該操作が存在するという意味で、合格保証ではない。

## 実DB書き込み実証（Android正式結果ではない）

- `teat` はCloudflare D1 `izakanpai-teat`、専用store `teat` 1件。リモートD1でQA一時経費を **登録→独立読取→更新→別store条件で変更0件→削除→元の経費件数1件へ復元** した。
- 再実行可能なヘルパー `scripts/android-qa-teat-remote-crud.mjs --execute` とローカルテスト `test/android_qa_teat_remote_crud_test.mjs` を作成。2026-10-11 13:45 PHT、実D1で最終結果PASS。専用marker残存0、他行を変更せず、正式Android runner判定は0件。
- D1の `meta.rows_written` はトリガー由来の内部行を含む場合があり、INSERTで4件と出た。対象行の厳密性は `RETURNING expense_id` とその後の独立読取で証明する。
- 現行リモート `teat` の `coupons.starts_at` 列は未検出。coupon開始日テストは関連schemaの適用状態を別途確認するまで保留し、誤PASSにしない。
- これらの実証は **DBレイヤーのみ**。Android画面をタップして保存した正式ケースPASSとは区別する。

## 共通実行条件

1. ログイン表示の店舗IDが `teat` であることを確認。QA固有識別子 `QA1011-<ケースID>-<時刻>` を品目/名前/メモへ入れ、開始前の `getDrinkInventory`/`getExpenses`/`getMembers`/`getReservations`/注文一覧を保存する。画面操作は担当の RMX3938 保有者のみが実施。
   特に `saveDrinkInventory` はリスト全体を保存し、省かれた行を削除する仕様。既存行を一部だけ送信してはならない。新規QA品目を追加する場合も取得した最新の全行を保持し、競合操作がないことを検証する。
2. 端末の画面録画・入力値・送信前後のUI・認証済みAPIレスポンスをひも付ける。サーバ検証は `store_id='teat'` とQA識別子/返却IDを**双方**条件にする。変更前数量、単価、対象ID、時刻、request IDを保存。
3. SQL確認は読み取り専用接続で行う。削除/補正は既存テナント業務データに触れず、当ケースで作ったQAレコードに限定する。履歴テーブルが追記型なら履歴行の消去による巻戻しを行わず、相殺移動で数量を復旧しQA履歴を残す。
4. FAIL/PASSは実際のUI操作、API/DBの前後差と仕様に基づき判断。操作不能・既存buildでUIがない・network再現不可の場合は `NOT_PROVEN` として正式runnerの状態を勝手に変更しない。

## 優先順（10件）

| ID | 優先 | v910015 | 実機入力・タップ | 必須検証（API / SQL） | ケース専用後始末 |
| --- | --- | --- | --- | --- | --- |
| **OPR-INV-005** 在庫調整+ | 1 | 候補 | `在庫管理`→新QA材料行を追加→名称/単位/在庫10/最低5/原価1→`保存`。行の`変動`→`入荷`数量2→`実行`。 | `getDrinkInventory` で数量12。`SELECT move_id,move_type,qty,qty_after FROM inventory_moves WHERE store_id='teat' AND item_name=? ORDER BY move_id DESC` で該当操作に入庫履歴が正確に1件。`drink_inventory`の同名QA行の `qty=12`。 | 同QA行に廃棄2、数量10へ復帰。作成QA行の削除可否を確認して専用行だけ削除、履歴は監査保持。 |
| **OPR-INV-006** 在庫調整- | 2 | 候補 | 上のQA材料（在庫10以上）で`変動`→`廃棄`数量1・理由`QA1011`→`実行`。 | 在庫前後差 -1、`inventory_moves`で `move_type` 廃棄のレコード1件。負在庫を許すかは同QA行の数量境界で確認し、期待を現行サーバの規則と一致させる。 | `入荷`1で元の数量へ戻す。 |
| **OPR-INV-003** 入庫二度押し | 3 | 候補 | QA行の`変動`→`入荷`数量1→`実行`を物理的に素早く2回タップ（同一モーダル）。 | `inventory_moves` の前後差は1件、qty差は+1。`inventory.html` の `mvGo.disabled=true` と requestId の重複排除をサーバ結果でも確認。 | `廃棄`1で相殺、履歴は残す。 |
| **OPR-INV-012** minimum到達 | 4 | 候補 | QA材料の在庫を10、最低数量を9で保存→`変動`→`廃棄`1→`実行`。 | `getDrinkInventory` の `stock=9,minimum=9`。対象行が低在庫色（`stock<=minimum`）になり、該当レポートがある場合はアラートも確認。 | `入荷`1、stock=10 で復元。 |
| **OPR-INV-013** minimum復旧 | 5 | 候補 | 前ケースで同QA行が最低数9/stock9となった状態→`変動`→`入荷`1→`実行`。 | `stock=10>minimum=9`、低在庫表示/警告が解除。移動履歴1件。 | QA行の初期値と一致を確認。 |
| **OPR-INV-028** 原価負数 | 6 | 候補 | QA材料の原価セルに `-1` → `保存`。 | UIで拒否/エラー表示。再取得後 `drink_inventory.unit_cost>=0` のままであり、行が増えていない。負値が保存されたならFAILとして記録（必要なら元単価にQA行のみ補正）。 | QA行の原価を1に戻す。 |
| **OPR-RES-005** 5分未満先 | 7 | 条件付き | `予約管理`→`ブラウザで開く`で `?store=teat` 公開予約フォームへ。必須項目に QA名/QA電話/QAメールを入力、店舗時刻で現在から5分未満の選択可能枠があれば選び`予約`。 | APIがvalidation拒否、`SELECT reservation_id FROM reservations WHERE store_id='teat' AND name=?` で新規行0。公開フォームは30分刻みの場合があり、5分未満の時刻をUIで選べなければ **NOT_PROVEN**。 | 正常なら作成行0。もし不正受理された場合はQA予約IDだけ取消（状態遷移仕様に従う）、FAILを保持。 |
| **OPR-ORD-002** 人数0/負/非数 | 8 | 条件付き | `注文入力`→卓選択画面→`Guests/人数`。`partyCount` は `<select>` のため通常の物理操作で0/負/非数を直接入力できない。存在しない選択肢は試験不能と記録する。 | `getAllTablePartySizes` と該当卓の保存値不変、追加注文/人数更新なし。APIレベルの不正payload拒否は独立した認証付きテストが必要。 | 画面は戻る。既存卓の人数は変更しない。 |
| **OPR-ORD-003** 人数変更→再open | 9 | 条件付き | QA用の空卓を選択→`Guests` 2を選んで`Start`→画面を閉じる→同卓を再選択/再open。人数機能は入場料/延長料設定のいずれかが有効な店舗だけ表示。 | `getAllTablePartySizes` でQA卓の値2、再表示2。保存に使うサーバ経路と表示値が一致。 | 元の人数に戻す（事前に空/未設定ならAPIでその状態へ戻せることを確認）。戻せない構成では専用QA卓以外で行わない。 |
| **OPR-FIN-009** 経費レシート画像 | 10 | 候補 | `経費`→日付/カテゴリ`備品購入`/品目`QA1011-OPR-FIN-009`/金額1/購入者`QA`→`ファイルを選択`で権利確認済みQA画像→`登録`。 | `getExpenses`で新しい経費IDが1件・`receiptImageId`有効。`SELECT expense_id,receipt_image_id,amount FROM expenses WHERE store_id='teat' AND expense_id=?` で同ID・金額1。画像の閲覧ボタンで同画像を表示。アップロード先の所有関係を確認。 | 経費一覧のQA行の削除操作（`deleteExpense`）後、同IDが存在しないことを確認。画像の孤児残留はstorage実装に依存するため別途照合。 |

## 会員の追加候補（次点）

`OPR-CRM-027` は会員編集途中の通信断・再取得のケース。`members.html` の新規登録は名前/電話/誕生日が必須で `saveMember`、編集は対象行の `編集`→備考変更→`変更を保存` で `updateMember` を呼ぶ。QA専用電話番号を作成した後、機内モード等で**変更送信時の通信断**を再現し、復帰後 `getMembers` と `SELECT phone_number,name,birthday,note FROM members WHERE store_id='teat' AND phone_number=?` のサーバ確定値を突合する。編集前のQA値へ戻す。物理端末での断線が他担当のQAと衝突するため、担当者の専有時間内だけ実行。会員削除UIは確認できず、QA電話番号の残存を許容するか専用レコード削除APIの有無を実行前に確認する。

## Worker/schemaの判定

- **現行UIで操作経路が確認できる候補**: `INV-003/005/006/012/013/028`, `FIN-009`。ただし v910015 内包HTMLと接続先Workerの稼働版が一致する証拠はまだない。`INV-028` の負原価検証は**サーバ側の拒否**も必要で、拒否仕様が未実装なら修正が必要。
- **条件付き/別方法が必要**: `RES-005` は30分枠の選択制約、`ORD-002` はselect入力制約、`ORD-003` は人数機能の店舗設定とQA卓の可逆性が障壁。これらは現在の物理UIでは完遂できない可能性がある。入力制約を回避する隠しDOM改変で実機PASSにしない。
- **将来のWorker/schema修正が必要か**は未断定。発見時はAPIエラー、HTTP status、該当RPC名、接続先build識別子を保存し、必要な変更を切り分ける。SQL列名は `migrations/0001_init.sql` を起点に記載したため、実DBの追加migration適用状況を `PRAGMA table_info(...)` で先に確認する。

## 根拠ファイル

`.android-real-device-run/state.json`（正式ID/期待値）、`mobile-app/web/inventory.html`（`saveDrinkInventory`, `receiveStock`, `logWaste`, `stocktake`）、`mobile-app/web/expenses.html`（`saveExpense`, `deleteExpense`, 画像選択）、`mobile-app/web/reservations.html`（共有URLと `updateReservationStatus`）、`mobile-app/web/order-entry.html`（卓選択 `partyCount`）、`mobile-app/web/members.html`（会員保存/編集）、`migrations/0001_init.sql`、`src/inventory.js`、`src/expenses.js`。
