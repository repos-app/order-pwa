# 旧オプション追加料金→スタッフ報酬機能の廃止（2026-11-08）

## 利用者判断／完了条件
「追加料金をスタッフ報酬対象にする」はレディースドリンク機能で代替するため、画面チェックだけでなく新規注文・報酬計算・会計後の割当機構を廃止。メニューマスタを二重化しない。一般オプションの追加料金、商品歩合、SC分配、レディースドリンクは維持。

## 変更済みソース
- `mobile-app/web/menu_editor.html`、`docs/yuwaku/{,test/}menu_editor.html`：旧オプション報酬チェック、率属性、機能フラグ取得を撤去。過去の `recipient_charge` グループを非表示にし、明示的なメニュー保存で廃止グループを落とす。通常オプション編集は保持。
- `mobile-app/web/app.js`、`docs/yuwaku/{,test/}app.js`、`docs/public/order-app.js`：旧オプショングループをON/OFF状態と無関係に表示しない。古い注文カートの旧オプションを除外。Nativeの受取スタッフ選択はレディースドリンク時だけ表示。
- `src/menuOptions.js`：旧オプションの報酬率・報酬構成生成を撤去し、従来クライアントの旧オプション指定は常に `retired_recipient_charge_option` で拒否。
- `src/orders.js`：注文時オプション報酬の計算／加算を撤去。`commissionDrink` のスタッフ認証・対象者・料金・率・帳簿スナップショット処理を維持。
- `src/gasShape.js`：旧スタッフ関連オプションはドリンク対象フラグにかかわらず注文メニューから除外。
- `src/admin.js`：古いクライアントのメニュー保存で旧報酬オプション・率が再導入されないよう正規化。
- `src/commission.js`、`src/gasApi.js`：旧 `saveReceiptOptionStaffAssignment` 書込経路と権限ルーティングを撤去。
- `mobile-app/web/commission-app.js`、`docs/yuwaku/{,test/}commission-app.js`：昔の報酬スナップショットを読み取り専用表示。変更ボタンを撤去。3配布面の同一コードを維持。

## 消していないものと理由
- 過去に注文された `order_items.commission_components_json`、`commission_receipt_assignments.option_snapshots_json`、確定報酬台帳 `commission_entries`：当時の支払義務、月別報酬、返金・逆仕訳を破壊しないため保存。既存注文を後日会計する場合も元契約の計算スナップショットを保持。
- 既存DBのメニューオプションJSON中に残る旧 `recipient_charge` 属性：今回DBを強制一括消去しない。全注文UIから非表示、APIで注文拒否、個別編集時には除去。既存会計記録の表示を勝手に改変しない。
- 店舗の `commissionOrderEnabled` と `commissionOrderDefaultPercent`：レディースドリンクの機能ON/OFFと報酬率に使用するため維持。

## ローカル検証
- `node --test test/auto-ci/commission-feature-option-ledger.test.mjs test/auto-ci/commission-order-option-e2e.test.mjs test/auto-ci/order-commission-recipient-required-ui.test.mjs test/auto-ci/commission-receipt-assignment.test.mjs`：35 PASS／0 FAIL。旧機能の代わりに「旧注文拒否」「通常オプション料金だけ請求」「ドリンク注文報酬・JPY/PHP・返金」「歴史的帳簿の維持」を確認。
- `test/auto-ci/commission-retired-option-boundary.test.mjs`：旧機能の再導入防止契約。Native/Web本番/Web TEST・注文サーバー・旧APIを検査。
- 関連する上記新規テスト＋旧機能置換後の `commission-feature-option-ledger`／`commission-order-option-e2e`／`commission-sc-eligible-staff` 等を一括実行して **68 PASS／0 FAIL**。
- `test/local_smoke_test.mjs`：582 CHECKS PASS。Web本番・TESTにも報酬画面を持つ現在の設計へ旧テスト期待を更新。
- `test/menu_options_regression_test.mjs`：PASS。`test/bilingual_data_test.mjs`：85 PASS。
- `test/gas_compat_smoke_test.mjs`：572 CHECKS PASS。`test/mobile_navigation_test.mjs`：192 CHECKS PASS。

## 反映区分
上記はソース修正とローカル検証の範囲。コミット／プッシュ／Worker・Web本番へのデプロイ／実機正式QAは本件では未実施。従来のSC対象者スキーマ0058適用要否も本番反映前に別途検証が必要。
