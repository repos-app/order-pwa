# IZK-UT-156 — メニュー価格自由入力 / 注文時の商品名変更

## 要求・実装対象

- メニュー編集に「価格自由入力可」を追加。既定はOFF。メニューマスタの商品名・元の価格は注文で変更しない。
- ONのメニュー商品をスタッフ注文で選択すると、商品名・基本単価を注文ごとに入力できる。数量・既存オプションは共通カート/注文/会計処理を再利用する。
- 入力した表示名・単価は `order_items` に注文時スナップショットとして保存し、元メニュー名は `source_menu_name` で紐付ける。厨房・レシートは入力名、在庫・集計・割当は元メニュー情報を使う。
- QR顧客の公開メニューから該当商品を除外し、サーバーもスタッフ未認証注文を拒否する。テイクアウトに自由入力操作はまだないため、同種商品を表示・購入対象外とする。
- 価格上限は10億（ベース単価0円は不可）。通貨ごとの小数桁、既存オプションの追加料金、店内の税・サービスチャージ計算を尊重する。

## ファイルと実行段階

- UI: `mobile-app/web/menu_editor.html`, `mobile-app/web/app.js`, `mobile-app/web/order-entry.html`, `mobile-app/web/takeout.html`
- API/ドメイン: `src/admin.js`, `src/gasShape.js`, `src/gasApi.js`, `src/orders.js`, `src/menuOptions.js`, `src/inventory.js`, `src/billing.js`, `src/printers.js`, `src/commission.js`, `src/reports.js`, `src/takeout.js`（実際の差分は `git diff` に従う）
- スキーマ: `migrations/0073_menu_order_custom_price.sql` と既存のテナントプロビジョニング用生成物
- テスト: `test/backend_menu_custom_price_order_test.mjs`, `test/auto-ci/order-commission-recipient-required-ui.test.mjs`, `test/menu_editor_price_variant_test.mjs`, `test/bilingual_option_workflow_test.mjs` など

## 検証の区分

- ソース/単体/SQLite/HTTP回帰のPASSは正式Android/iOS QAのPASSと別。採番されたチケットは **IZK-UT-156**。
- ローカル変更まで。Git commit/push、リモートD1の0073適用、Worker/Web配信、Native配布/実機正式QAはこのタスクで未実行。
- 配信前に0073の本番テナントD1適用と生成マイグレーション整合、印刷/レシート/厨房の実機証拠を確認する。
