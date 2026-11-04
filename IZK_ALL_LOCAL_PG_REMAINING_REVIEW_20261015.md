# izakanpai — 全残件・横展開ローカルPG是正の再監査（2026-10-15）

**目的**: ユーザーの「横展開含めてローカルPG修正の残件があれば全て実施」に対する、再現した根因・修正済み範囲・独立レビューと、**修正を強行すると互換性を壊す範囲**の境界を明示する。これはソースのみ。**commit/push/deploy/prod D1/QA state・実機操作なし**。

## ローカルで修正したもの

| 障害/範囲 | ソースの変化 | 正規の証跡とローカルテスト |
|---|---|---|
| IZK-UT-069 歩合/履歴P0 | `migrations/0046_commission_open_orders_index.sql`の部分索引＋tenant provisioner generated更新（APIのNOT IN状態契約不変更、旧未知status保持） | `docs/D1_P0_COMMISSION_INDEX_0046_20261015.md`、`test/d1_p0_commission_partial_index_0046.py`、tenant provisioning/入侵テスト |
| IZK-UT-075 公開テイクアウト | `src/takeout.js`とNative/Web本番/TEST/公開本番/公開TEST計5画面の既存上限を明示拒否 | `docs/IZK_UT_075_TAKEOUT_INPUT_LOCAL_FIX_20261015.md`、6専用PASS |
| IZK-UT-075 経費 | `src/expenses.js`とNative/Web本番/TESTの品目/メモ/購入者を明示拒否、無断日付・receipt ID切詰め排除 | `docs/IZK_UT_075_EXPENSE_FIELDS_LOCAL_FIX_20261015.md`、4専用PASS |
| IZK-UT-075 アカウント削除 | `src/accountDeletion.js`とaccount3配布面の理由500を明示拒否 | `docs/IZK_UT_075_INPUT_BATCH2_20261015.md`、専用/lifecycle PASS |
| IZK-UT-075 仕入先・購買項目 | `src/purchasing.js`とpurchasing/order_items Native/Web prod/testの既存項目上限 | `docs/IZK_UT_075_PURCHASING_INPUT_FIX_20261015.md`、独立回帰 |
| IZK-UT-073 長文UI | 既存割引/会員/経費/Commissionに加えpurchasing/order_items/receipts×3配布面の狭幅Flex/表示省略・折返し対策 | `docs/IZK_UT_073_UI_BATCH2_20261015.md`、3 CSSソース回帰 |
| IZK-UT-075 Todo | `src/tasks.js`のsliceは生成clientRequestIdと時刻の正規化に限られ、タイトル・担当・期限を勝手に切らないため**修正不要**と判断 | `docs/IZK_UT_075_TASKS_INPUT_AUDIT_20261015.md`、長文記録DB stubと3面パースPASS |
| Webオフライン配布 | `docs/yuwaku/sw.js`と`docs/yuwaku/test/sw.js`のキャッシュをv282へ更新 | source/header/local smoke専用PASS、**本番未配信** |

## static input/source audit coverage

`scripts/izk-ut-075-input-inventory.mjs`はNative324、Web本番280、Web TEST280、公開予約6×2、公開注文4×2、公開テイクアウト5×2、**計914静的入力候補**の属性・現行上限・画面ソースを`docs/IZK_UT_075_INPUT_FIELD_INVENTORY_20261015.json`へ保存。**914は不具合や未修正の数ではない**。入力上限が必要かどうかは、実際の業務用途・DB列・認可/API経路によって違う。JS動的生成の入力、NativeとWebでDOMが異なる箇所は別の監査が必要。

## ソース逆引きでまだ確認が必要な候補（全件解消と誤認しない）

- `src/admin.js` メニュー`allergens`の120字無言slice（独立入力担当が局所修正/互換性評価中）。
- `src/printers.js` printer name 60字、MAC40字、deviceName80字、プリンタID120字の静かに切り詰める経路（専任が局所修正/安全性確認中）。MACとIDはビジネス自由記述とは違うため盲目的な拒否にはしない。
- `src/billing.js` 会計時`table`40、discountId/name、approverLoginの入力正規化。金額・外部キーに影響するため、承認済み割引レコード/receipt互換の確認が前提。安易な一律削除は禁止。
- `src/integrations.js` メール送信元・通知レポート先、カテゴリ名の長さ正規化。外部連携のcanonical keysと移行要否を確認する必要。
- `src/attendance.js` 日付整形/リクエストIDのスライス。ユーザーフィールドではない経路と区別。
- `src/orders.js` reason200/actor・approverLoginの上限制御。セキュリティ監査イベントへの保存と画面経路の既存仕様を確認。
- `src/crm.js` 購入特典coupon/orderIdのスライスとstatus20。公開会員・予約の自由記述は先行対応済みだが、識別子/履歴の互換性確認が必要。
- `src/paymentMethods.js` 決済方法ラベル40/文字列240の正規化。UI側に同じ既存制約と決済履歴互換の正本があるか確認する必要。
- `src/purchaseOrders.js` 発注書明細・単位の上限。APIが配列で大量処理するので既存DB書込みとの整合を確認。

**異なる用途の`.slice(0,N)`をゼロにすることが目標ではない**。ログのプライバシー保護・ID正規化・年月日フォーマット・DB顧客入力を同じルールで修正すると互換性/セキュリティを壊す。既存の上限が確認できたユーザー入力から個別に優先、曖昧な上限は業務契約/実データ確認が必要。

### 2026-10-15 全画面／全機能の第4巡監査結果（上記旧候補を更新）

- **IZK-UT-073**: Native 44画面・Web本番38・Web TEST38・公開6の**計126 HTMLソース**を全数列挙。inline classic JS構文、イベント属性式/関数、相対リンク/アンカー、本番/TEST38対のSHA256パリティは不一致/エラー0（静的）。KDSの長い商品/席名Flexは3面で局所修正。静的レポート`docs/IZK_UT_073_126_SCREEN_MECHANICAL_AUDIT_20261015.md`、データ`docs/IZK_UT_073_PAGE_COVERAGE_20261015.json`。**この結果を126画面の実タップPASSにはしない**。
- **IZK-UT-075/API横展開**: `src/integrations.js`のreportEmail/emailFromAddress200文字、`src/orders.js`の注文取消理由200文字を、静かな切り詰めから保存前の明示拒否へ修正。対応するNative/Web本番/TESTの設定・取消画面も保存前のJA/ENエラーへ統一。`docs/IZK_UT_075_REPORT_AND_VOID_UI_FIX_20261015.md`、VM UI6 PASS、直接API回帰PASS。
- **プリンタ入力の旧残件解消**: `src/printers.js`の名前60、raw MAC40、端末ラベル80、端末ID/プリンタID120、厨房割当対象20件の過長を、prefixへの無言切り詰めとならないよう拒否。プリンタUI3面のpaste・beforeinput・保存前表示も追加。専用5/5 PASS、既存unified printer21/21 PASS。`docs/IZK_UT_075_PRINTER_INPUT_FIX_20261015.md`。印刷実機/BluetoothとWorkersの物理リリースはPENDING。
- **機能ソース台帳**: `scripts/izk-source-coverage-manifest.mjs`と`docs/IZK_ALL_FUNCTIONS_SOURCE_COVERAGE_20261015.json`で**62バックエンドsrcモジュール、Worker133静的ルート、GAS152静的RPC**のSHA/export/DB参照サインを追跡。認証・店舗間分離の静的共通dispatch構造は確認したが、個別全機能の実到達/許可/更新SQLを実証したわけではない。`docs/IZK_ALL_FUNCTIONS_SOURCE_COVERAGE_20261015.md`。
- **修正を見送る理由**: `src/billing.js`の領収書参照名・`src/paymentMethods.js`の決済履歴互換ID・`src/attendance.js`の再送/日時にあるsliceは、注文・会計の外部キーや再送防止を壊し得る。ユーザー自由入力と同じ上限制御を一律追加しない。業務仕様/不正拒否の個別証拠と動的契約試験が必要。

## 閉鎖できない非ローカルゲート

### 第5巡・2026-10-15 最終局所PG修正追補

以下は上記「要調査」の**旧記録に対する最新結果**。個別S01〜S10/H01〜H10と未確認範囲は案件ごとのMDに記録した。

- 会計：src/billing.jsのテーブル40、割引ruleID80/名称60/ID60、承認者login100の接頭辞一致を防ぐAPI側明示拒否＋adminのNative/Web本番/TEST保存前チェック。専用 test/izk_ut_075_billing_input_boundaries_test.mjs PASS。
- 外部連携：src/integrations.jsのreportEmail/from200は現行既存ソースですでに直接APIの超過拒否が実装済み。残りAI名称120はAI提示/プロンプトに限定、業務入力書込みではない。監査 test/izk_ut_075_integrations_input_audit_test.mjs PASS。
- 決済設定：3つのsettings画面×16入力欄のHTML maxlength無言切詰めを外し、paste/IME/保存前検査を維持。src/admin.js::saveSettingsはsrc/paymentMethods.jsの共通validatorによって直接RPCの名称40/案内240超過をDB読み書き前に拒否。過去永続化の長文とcash/card/gcashコードは読取時互換性を保持。直接API3 PASS、UI VM PASS。詳細 docs/IZK_UT_075_PAYMENT_METHODS_INPUT_AUDIT_20261015.md。
- 発注メール：src/purchasing.js sendPurchaseOrderEmailは直接Worker/GAS呼出しでも、PO永続契約の主名/日英160、単位32、数量100000、行100を送信枠計上前に拒否。再発注メールも共通関数経由。専用2 PASS。
- レシピ：src/purchasing.js saveRecipesのmenu/material名100字超を全件DELETE前に拒否。3つのrecipe画面も送信前に日英エラー。5専用PASS。両機能の詳細 docs/IZK_UT_075_PO_EMAIL_RECIPE_DIRECT_GUARDS_20261015.md。
- 勤怠：打刻メモ200字の無言切詰めをsrc/attendance.jsから排除。3 clock画面のIME・入力前後・打刻前の拒否、再送ID同一/競合判定テストPASS。詳細 docs/IZK_UT_075_ATTENDANCE_MEMO_FINAL_20261015.md。
- 注文・CRM：注文取消の承認者ID100文字超を別ユーザーに接頭辞一致させない。CRMの新規reward snapshotの注文ID100超は拒否、保存済みsnapshotの注文ID/クーポンcodeの返金照合は**全キー一致**を維持。A/B2店舗、101字注文ID/65字クーポンの逆仕訳回帰PASS。詳細 docs/IZK_UT_075_CRM_REWARD_PERSISTED_KEY_RISK_20261015.mdの末尾追補。
- 残るslice分類：現在のsrc/*.jsのsanitize(...).slice(0,N)は生成clientRequestId等のプロトコルID、日時、認証 actor の監査ログ、印字用receiptNo、AIモデル出力の名称候補、固定enum等の用途と見分ける必要がある。不用意な一律削除は再送・会計履歴・セキュリティを破壊する。現時点で**到達可能なユーザー自由入力に対し、追加の確定した無断切詰めは検出していない**が、動的UI・未知の長文/歴史データ・現場画面は未証明。
- 修正後のHTML機械監査を再実行：126ソース・38 Web本番/TEST対応、inline JS、ハンドラ、リンク整合、SHA parityの固定レポートを再生成。test/izk_all_screen_syntax_navigation_audit_test.mjs PASS。**物理720pxの画面操作は未検証**。

- **IZK-UT-069/P0**: Cloudflare実D1`meta.rows_read`/`rows_written`の旧/新比較、0045/0046 migration/Worker一致、PitaYasu未アクセス、7DB実量、監視未設置。ソースだけでP0本番復旧を宣言しない。
- **IZK-UT-073/P1**: 全120画面、Native短辺720物理px、iOS、Web本番/TESTの長文/IME、画面傾き、スクロール位置と操作ボタンの実描画/タップが未検証。
- **IZK-UT-074/P1**: QAドライバーの二重スクロールは修正済み、アプリ実機側の揺れの独立原因は未確定。
- **IZK-UT-075/P1**: 全入力フィールドの業務上限定義・DB直API/端末での保存前/再表示・ユーザーフィールドの長文テスト未完了。修正済み入力群だけをLOCAL PASSとする。

## 共通レビュー10自己/10横展開の受入

単にS01-S10/H01-H10の番号を並べただけでは合格にしない。個別詳細MDの具体的テスト対象、結果、PASS/PENDINGを証拠とし、**全体の10×10=200個の実機PASSを主張しない**。今回の局所修正はすべて専用テストで後退しないよう`npm test`へ追加、最後に`npm test`、`npm run mobile:sync`、`npm run verify:distribution`、`git diff --check`を独立に実行し、ログ/exit codeを別途記録する。
