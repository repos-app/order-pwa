# CONFIG-CROSS-01 — 全34保護画面の書込み操作・権限実UIテスト残ギャップ監査

**再実行後の追記（2026-11-19）**：本監査の元スナップショットは
メニューUI修正による当時のソースハッシュ差を正しくFAILとした履歴。
その後、在庫/メニュー/予約の権限実ブラウザ12ケースを修正後のソースで再実行し
12/12 PASS、共通監査ゲートの当該レーンがLOCAL_PASSへ復帰した。
したがって現在有効な代表実UI権限操作の証拠は**13/28画面・55/55業務ケース**。
下記の監査作業時点での「10/28」「43/43」「L†」は履歴であり
現在のSOURCE_STALE判定を意味しない。未網羅は依然**15/28画面**で、
実機別ゲートと各画面内の全業務アクションの網羅も依然未完了。
現在の証拠は共通監査ゲートの
test-results/qa-modernization/configuration-matrix/configuration-coverage-status.json
を優先して参照する。

監査日: **2026-11-19**。対象: 現行 `src/permissionScreenCatalog.generated.js` の `category='protected'` 全件。**この文書は独立監査**であり、`CONFIGURATION_MATRIX_AUDIT_20261119.md` と `configuration-coverage-status.mjs` を編集・上書きしない。

## 1. 方法と確定分母

`PERMISSION_SCREEN_CATALOG.filter(screen => screen.category === 'protected')` を Node で実際に評価し、対応する `mobile-app/web/<file>` 34ファイルを全て読み取った。各画面で `rpc('...')`、`API.post('...')` の文字列リテラルと `onclick/onchange/onsubmit` を抽出した。外部業務JSで動作する `commission.html → commission-app.js`、`order-entry.html → app.js` も抽出対象に含め、`src/gasApi.js` の権限制御／ハンドラ、既存 S5 テスト、実際の `result.json` を突き合わせた。動的関数名・イベント経由・データ管理ジョブ等は単純な正規表現で網羅できないため、下表の操作名と例外は別途ソースを読んで補完した。

- 生成カタログの **保護画面34、固有権限キー29**。`admin`、`backup`、`inventory`、`printers`、`profit` はそれぞれ2画面で共有する。34画面と29権限を同じ分母で扱わない。
- ソース上、利用者による永続変更・状態遷移・デバイス操作が存在する画面 **28/34**。通常の保存・削除・承認操作を持たない閲覧/エクスポート専用画面 **6/34**（attendance, audit, backup, moves, profit, sales）。
- 静的に検出された「画面×APIリテラル」延べ **RPC呼出名158、API.postの直接呼出名80**、各画面内の一意DOMイベント属性延べ **385**。これらは書込みケース数でも実行済みテスト件数でもない（読取り・重複RPCや共通 `rpc` を含み、JS生成イベントを網羅しない）。
- 監査時点の機械抽出・画面別ソースSHA-256・各既存PASS証拠の現在ソースハッシュ比較の結果を `test-results/qa-modernization/configuration-business/config-write-surface-audit-20261119.json` に保存。ファイルSHA-256: `52c513b5b8b1c19b013bccfb8aa4fe20d951bf9f7e706af7ed8d0dfbf3e84062`。

判定凡例: **L**＝実Users権限エディタで付与→剥奪→復旧、同一ログイン中の対象画面操作と物理SQLiteの成功・拒否不変を確認した代表操作がある。**L†**＝Lに相当する過去PASS証拠はあるが、監査時点で関連ソースハッシュ不一致（再利用不可）。**B**＝既存業務S5で実ブラウザとSQLiteの正方向の操作などがあるが、この画面の同一セッション権限剥奪→復旧までは未証明。**G**＝全画面の許可/拒否ナビゲーションとRPCゲートの一般証拠のみ。**閲覧**＝この画面固有の書込みUIなし。Bの多くは2026-11-18の当時PASSであり、後述のとおり最新 `gasApi.js` とS5ハーネスのハッシュ差分があるため「現行完全PASS」に数えない。

## 2. 34画面すべての書込み面とブラウザ証拠

以下の「操作」は画面に**存在する**処理の列挙であり、削除/承認UIが存在しない画面へ新規操作を仮定しない。Lもその画面の**全ボタンを完遂したという意味ではない**。

| # | 保護画面（権限キー） | 現行UIの実行可能な書込み・状態変更と境界 | 既存の業務ブラウザ証拠 | 権限×実UI SQL |
|---:|---|---|---|---|
| 1 | `admin.html` (`admin`) | 注文状態・取消、人数/入場時刻変更、品目/料金補正、現金/カード等の決済確定。外部決済の実送金は別ゲート | `S5-CHECKOUT-PHP-003/JPY-004`、`S5-ORDER-CHARGE-EDIT-091`、`configuration-cross-role-write` | **B**：設定変更・決済SQLと権限RPC拒否あり、画面内の全操作を同一権限剥奪下で検証したわけではない |
| 2 | `attendance.html` (`attendance`) | 勤怠月次/日別集計、打刻証拠の表示。**更新・削除UIなし** | `S5-ATTENDANCE-021` | **閲覧** |
| 3 | `audit.html` (`audit`) | 操作履歴・監査フィルタ表示。**更新・削除UIなし** | `S5-AUDIT-034` | **閲覧** |
| 4 | `backup.html` (`backup`) | CSV/全表エクスポート（ダウンロード）。**DB更新・削除UIなし**。破壊的操作は別画面の `data_admin.html` | `S5-DATA-EXPORT-035` | **閲覧** |
| 5 | `birthdays.html` (`birthdays`) | 誕生月クーポン発行 `issueBirthdayCoupon` | `S5-BIRTHDAYS-028` | **B/G** |
| 6 | `bridge.html` (`printers`) | Bluetooth接続/切断/解除、ブリッジ紐付け・ポーリング・印刷ACK。Bluetooth実機接続/紙出力は物理端末依存 | `S5-BRIDGE-RECONNECT-050`（ローカルブラウザ制御） | **G・実機境界** |
| 7 | `clock.html` (`clock`) | 出退勤・休憩開始/終了の打刻（動的 `API.post(action)`）。OS位置測位の真偽は実機依存 | `S5-ATTENDANCE-021`（管理者打刻拒否）、`BW-ATT-03` | **B/G** |
| 8 | `commission.html` (`commission`) | `commission-app.js` から割合・従業員割当・機能設定等の保存。売上/返金台帳へ波及 | `configuration-cross-commission-refund` 6/6 PASS、`configuration-cross-extended-settlement` | **B/G** |
| 9 | `coupons.html` (`coupons`) | クーポン登録/編集/削除（`saveCoupons` 全リスト確定） | `S5-COUPONS-026`、`configuration-cross-live-todo-mutations` | **L** |
| 10 | `dashboard.html` (`dashboard`) | 売上目標 `saveSettings` | `S5-DASHBOARD-031` | **B/G** |
| 11 | `data_admin.html` (`backup`) | 削除・全取引消去・CSVインポート・バックアップ復元・ジョブ取消（`queueDataAdminJob`、`queueTransactionReset` 等）。非同期完了/失敗・R2実運用は別確認 | `S5-DATA-JOB-LIFECYCLE-053`、`S5-DATA-STAGED-RESUME-051` | **B/G・高リスク** |
| 12 | `expenses.html` (`expenses`) | 経費保存/編集/削除、領収書添付 | `S5-EXPENSES-016`、`configuration-cross-live-expense-mutations` | **L**（費用レコード） |
| 13 | `feedback.html` (`feedback`) | 顧客フィードバックの承認/拒否（`moderateFeedback`）。一般の削除UIなし | `S5-FEEDBACK-036` | **B/G** |
| 14 | `inventory.html` (`inventory`) | 在庫一覧登録/編集/行削除 `saveDrinkInventory`、入荷/廃棄/棚卸、商品紐付け | `S5-INV-006`、`S5-STOCK-MOVES-033`、`configuration-cross-live-inventory-menu` | **L†**（一覧保存/削除。移動/紐付けの権限ライフサイクルは残る） |
| 15 | `kds.html` (`kds`) | 調理中/提供済み等 `updateOrderStatus`、キッチン優先度。物理キッチン印刷は別 | `S5-KDS-011`、`BW-KDS-03/04` | **B/G** |
| 16 | `members.html` (`members`) | 会員登録/既存会員編集。通常の会員削除UIは存在しない（QA専用削除RPCと混同しない） | `S5-MEMBERS-024`、`configuration-cross-live-todo-mutations` | **L**（作成・更新） |
| 17 | `menu_editor.html` (`menu_editor`) | 商品登録/編集/削除、売切、カテゴリ改名/統合、並び替え、一括変更/削除。画像検索・AI利用は外部連携あり | `S5-CATEGORY-001`、`S5-MENU-DELETE-IMPACT-057`、`configuration-cross-live-inventory-menu` | **L†**（商品CRUD。カテゴリ統合・一括操作等は残る） |
| 18 | `moves.html` (`inventory`) | 在庫変動履歴の表示/ページ移動。**更新・削除UIなし** | `S5-STOCK-MOVES-033` | **閲覧** |
| 19 | `order-entry.html` (`admin`) | `app.js` 経由の発注・数量訂正/取消、注文ステータス・席運用。決済は管理画面/ゲートウェイ別経路 | `S5-STAFF-ORDER-009`、`S5-ORDER-CHARGE-EDIT-091` | **B/G** |
| 20 | `order_items.html` (`order_items`) | 発注基準品目の保存/編集/削除（`saveOrderItem/deleteOrderItem`） | `S5-ORDER-ITEMS-032`、`configuration-cross-live-purchase-approval` | **L** |
| 21 | `printers.html` (`printers`) | 論理プリンタ登録/編集/削除、印刷設定、再印刷キュー処理・ACK。実印字/機器接続は別 | `S5-PRINT-014`、`configuration-cross-live-purchase-approval` | **L**（論理プリンタCRUD。実印字は残る） |
| 22 | `profit.html` (`profit`) | 粗利/経費などの集計表示。**この画面固有の保存・削除UIなし** | `S5-PROFIT-027` | **閲覧** |
| 23 | `profit_sim.html` (`profit`) | シミュレーション前提の保存 `profitSimSaveSettings`、実績取込の確定 | `BW-PAGE-014` | **B/G** |
| 24 | `purchasing.html` (`purchasing`) | 仕入先登録/編集/削除、PO起票/承認/入荷、発注メール送信（実メール配送は外部） | `S5-PO-002`、`configuration-cross-live-purchase-approval` | **L**（PO承認と仕入先CRUD。入荷承認や外部送信は残る） |
| 25 | `receipts.html` (`receipts`) | 全額返金 `refundReceipt`、支払方法訂正、領収書再印刷（印字確認は物理端末） | `S5-REFUND-007`、`S5-PAYMENT-CORRECTION-010`、`configuration-cross-role-write` | **B/G** |
| 26 | `recipe.html` (`recipe`) | 消費材料の紐付け登録/数量編集/行削除（`saveRecipes` 全体確定） | `S5-RECIPE-030`、`configuration-cross-live-extra-surfaces` | **L** |
| 27 | `register.html` (`register`) | 開店 `openShift`、実現金入力→レジ締め `closeShift`。現金実物計数は利用者行為 | `S5-REGISTER-029`、`configuration-cross-live-extra-surfaces` | **L** |
| 28 | `requests.html` (`requests`) | 申し入れ投稿、マネージャーの対応状態/メモ更新、削除 | `S5-REQUESTS-020`、`configuration-cross-live-extra-surfaces` | **L** |
| 29 | `reservations.html` (`reservations`) | 既存予約日時/人数/割当席・状態を保存。**管理画面に予約新規作成/削除UIなし**（新規登録は公開予約フォーム） | `S5-RESERVATION-017`、`configuration-cross-live-inventory-menu` | **L†**（既存予約編集） |
| 30 | `sales.html` (`sales`) | 売上/人気商品分析の参照。**この画面固有の保存・削除UIなし** | `S5-SALES-025` | **閲覧** |
| 31 | `settings.html` (`settings`) | 税/通貨/国、SC、座席/VIP/ディスカウント、報告・メール・画像等の各保存/削除、二次設定への波及 | `S5-SETTINGS-012`、`configuration-cross-fee-discount`、`configuration-cross-role-write` | **B/G・高リスク** |
| 32 | `takeout.html` (`takeout`) | カート確定→持帰り注文 `submitTakeout`。実PSP決済は別経路 | `S5-TAKEOUT-018`、`BW-TAKE-04` | **B/G** |
| 33 | `todo.html` (`todo`) | ToDo作成/編集/完了/削除 | `S5-TODO-019`、`configuration-cross-live-todo-mutations` | **L** |
| 34 | `users.html` (`users`) | 従業員作成/編集/削除、29権限キーの管理者向け保存 `savePermissionMatrix` | `S5-PERMISSIONS-013`、`configuration-cross-all-screen-editor`、`configuration-cross-role-write` | **B/G**（権限管理者による変更は実証。権限剥奪された同一社員による全ユーザーCRUD拒否は未実証） |

## 3. 数値化したギャップ（同じ分母で比較）

| 判定対象 | 監査直前 | 本監査の追加テスト後 | 解釈 |
|---|---:|---:|---|
| 権限を持つ保護画面 | 34 | **34** | カタログ自体は変更していない |
| 固有権限キー | 29 | **29** | 複数画面で共有するキーあり |
| 書込み・業務状態/端末操作面がある画面 | 28 | **28** | 6画面は閲覧/エクスポートのみ |
| 代表の実UI書込みに対し grant→revoke→restore＋SQL確認を一通り実行した画面（過去PASS含む） | 10/28 | **13/28 (46.4%)** | 本監査で `requests`、`recipe`、`register` の3画面・13業務ケースを追加 |
| 上記の代表操作証拠がない書込み/端末画面 | 18/28 | **15/28 (53.6%)** | 次節の15画面 |
| 上記のうち監査時点で**全参照ソースSHA-256が現在と一致**する現行証拠 | 旧証拠の同一SHA判定が必要 | **10/28** | `inventory/menu_editor/reservations` の共有12ケースの証拠は、現在の `menu_editor.html` と1ファイル不一致。履歴PASSを現行PASSへ流用しない |
| 全34保護画面の許可/拒否ナビゲーション | 68/68 | **68/68 PASS（現行ハッシュ一致）** | `cross-all-screen-editor`。画面内の書込み/削除/承認の全網羅を意味しない |

既存 `cross-live-todo` 11/11、`cross-live-po-approval` 15/15、`cross-live-expense` 4/4、`cross-live-inventory-menu` 12/12、今回の `cross-live-extra-surfaces` 13/13 により、代表的権限UI業務ケースの履歴総数は **55/55 PASS**。ただし `cross-live-inventory-menu` 12件は監査時点で `mobile-app/web/menu_editor.html` のSHA-256が変わっており、**現行ハッシュ一致として計上できるのは43/43業務ケース／10画面**である。TAP親テスト件数は業務件数へ加算しない。いずれも正式実機QAではない。

現時点で代表の権限実UIテストがない15画面は `admin`、`birthdays`、`bridge`、`clock`、`commission`、`dashboard`、`data_admin`、`feedback`、`kds`、`order-entry`、`profit_sim`、`receipts`、`settings`、`takeout`、`users`。特に `data_admin` の非同期削除/復元、`settings` の税/割引変更、`receipts` の返金・支払方法訂正、`admin` の会計確定、`commission` の算定・明細は高優先度。**13画面で代表操作がPASSしていても、たとえば在庫移動/紐付け、メニュー一括削除、PO入荷、論理プリンタ以外の実印字など、同画面の未テスト操作は残る。** 操作種別全件の総分母はUI・ロール・環境により変化するため、静的抽出したRPC名を単純に全テスト数へ換算しない。

## 4. 今回の追加Chrome/Gateway/SQLite検証と証拠

新規作成は `test/auto-ci/configuration-cross-live-extra-surfaces-browser.test.mjs` **1ファイルのみ**。既存 `local-gateway-fixture.mjs` と `s5-browser-local-harness.mjs`、実Chrome、既存本番Gateway処理、別テナントに分離した物理SQLiteを再利用。マネージャーID/パスワードで本当にログインし、管理者の本物の `users.html` チェックボックスから `requests`／`recipe`／`register` の権限を**11回**切替。変更後も同じv3社員セッションで以下を実行した。

- `requests` **4/4**：申し入れ投稿の登録行、権限剥奪中の状態変更および削除を拒否、SQL全行不変と失敗後のUI状態復帰、再付与後の解決済み更新と削除を確認。
- `recipe` **4/4**：実フォームからビール商品に `QA Extra Grain` を0.75で登録、剥奪後の数量変更/行削除を拒否、再付与後1.5へ編集して削除、SQLの数量・行存在を検証。
- `register` **5/5**：開店フロート500で作成、剥奪後レジ締め拒否・SQL不変、復旧して実現金500で締め、再度剥奪して開店拒否、復旧後フロート800の新シフトが1件のみ追加。シフトIDの辞書順を時系列と誤認しないよう状態で照合。

最終コマンド: `node --test test/auto-ci/configuration-cross-live-extra-surfaces-browser.test.mjs`、**exit 0、業務13/13 PASS、FAIL 0、skip 0**（Node TAP親込み14/14 PASS）。証拠は `test-results/qa-modernization/configuration-business/cross-live-extra-surfaces-2026-11-19T10-52-59-142Z-p33244/result.json` に `schema=izakanpai.qa.config-cross-live-extra-surfaces.v1`、`verdict=PASS`、`fixtureClosed=true`、`otherTenantUnchanged=true`、15ソースSHA-256、拒否画面スクリーンショット3件のSHA-256を保存。各テストで他店舗の `requests`／`recipes`／`shifts` を比較し変更ゼロを確認。正式QA **0件**、本番・外部決済・実機操作 **0件**。

途中検出した2つの**テスト実装**の問題も最終ケースに反映した。最初のTAP PASS時に総合証拠JSONだけがFAILだった原因は、他店舗チェック完了フラグのフィールド名が不一致だったため。修正後の再実行で別のFAIL（UUIDで並ぶシフトを時系列とみなした期待値）が出たので、現在の `open` ステータスとフロート値による照合へ修正。最終実行でTAP 14/14と証拠JSON PASSの両方を確認し、以前のFAIL証拠をPASSで上書きしていない。

## 5. GPTから実行できる操作と別ゲート

**現在のローカル自動実行範囲**は、Chromium上の入力/クリック、既存Gatewayの権限・署名・失敗応答、隔離SQLite実テーブルの追加/更新/削除・差分確認、認証セッション継続、別店舗の不変確認、ソースハッシュ付証拠である。対象APIとDBがローカル閉域で再現できる限り、ほかの15画面も同じ仕組みで段階的に拡張できる。外部インフラの疑似レスポンスを、実外部配送/実課金PASSと主張しない。

**別ゲートに残すもの**は、Bluetooth/USB接続と紙の実印字（`bridge`、`printers`、`kds`、`receipts`）、OS位置情報と実打刻の位置精度（`clock`）、現実のドロワー内現金実計数（`register`）、実際のカード/GCash等外部決済・返金と金融事業者明細（`admin`、`takeout`、`receipts`）、メール配信・画像取得/AI実課金・R2/本番D1等の外部反映・復旧（`purchasing`、`menu_editor`、`data_admin`、`settings`）である。現地実機評価や顧客本番操作を伴うものは、今回の隔離Gateway結果では代替できない。

**未実施**：全15残画面のライブ権限UI書込み、L/L†対象画面の全アクション、現行 `menu_editor.html` 差分反映後の先行12ケース再実行、現地実機QA、Git commit/push/deploy、GitHub Actions。worker-2の全体回帰と競合しないよう既存テストや他ソースは変更していない。
