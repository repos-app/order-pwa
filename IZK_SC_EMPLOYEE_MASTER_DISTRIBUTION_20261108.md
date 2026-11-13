# SC分配：在籍・対象ONの従業員全員で均等分配（2026-11-08）

## 確定した業務仕様
- Service Charge（SC）のスタッフ配分は商品担当割当、出勤・勤怠、個人売上に依存しない。
- 「歩合・スタッフ報酬」→「SC分配」のユーザー一覧で `SC分配対象` がON、かつ `status='在籍'` の従業員全員を会計時点で抽出して均等分配する。DBフラグは既存の従業員マスタに保存し、初期値はOFF。
- `commissionScStaffSharePercent` は徴収SCのうち従業員へ回す割合。店舗のSC徴収率（`serviceRate`）と別物。
- SC対象者0名、商品担当未割当であっても、SC分配のみを理由に会計を止めない。配分予定額を会計伝票単位の `commission_sc_unallocated` 台帳に記録。金額0なら記録しない。
- 商品別・カテゴリ別・全商品ルールに該当する商品歩合の担当者必須チェックは継続。商品歩合とSCは独立。
- 返金時は元のSC分配台帳を従来どおり反転、未分配台帳は `reversed` 化。会計確定後の従業員設定変更は過去の配分を変更しない。
- 旧 `sales` 分配方式は、従業員マスタ基準と両立しないため廃止。移行時に保存済み設定を `equal` に統一。

## 実装箇所
- `migrations/0058_commission_sc_eligible_staff.sql`: 従業員の対象フラグ、未分配SC台帳、索引、旧設定の正規化。
- `src/admin.js`: 従業員取得・作成・編集。部分更新ではフラグを維持し、非Booleanを拒否。
- `src/commission.js`: 商品歩合とSC配分判定を分離。均等分配・丸め・スナップショット・月別未分配集計。
- `src/billing.js`: 会計結果に `serviceChargeUnallocated` を追加。既存の会計トランザクションへ組込済み。
- `src/refunds.js`: 同一返金トランザクションで未分配SCを取消。
- `mobile-app/web/users.html`, `docs/yuwaku/users.html`, `docs/yuwaku/test/users.html`: SC分配チェックを撤去。ユーザー管理の通常保存では従来のSCフラグを保持。
- `mobile-app/web/commission.html`, `mobile-app/web/commission-app.js`: SC均等分配の説明、全ユーザー一覧と対象チェック、対象人数、0名時と報酬レポートの未分配額表示。
- `docs/yuwaku/{,test/}commission.html`, `docs/yuwaku/{,test/}commission-app.js`, `docs/yuwaku/{,test/}manage.html`: Web本番・TESTにも同じ報酬管理UI・処理・管理メニュー導線を配備可能なソースとして追加。Native正本JSとの内容一致をテストで固定。
- `src/commission.js`, `src/gasApi.js`: 既存フラグを店舗スコープで専用更新する `saveCommissionScEligibleStaff` RPC（マネージャー以上）。SC配分ロジックは変更なし。
- `mobile-app/web/settings.html`, `docs/yuwaku/{,test/}settings.html`: 重複するコミッション設定とドリンク設定を撤去し、歩合・スタッフ報酬に集約。
- `mobile-app/web/menu_editor.html`, `docs/yuwaku/{,test/}menu_editor.html`: 商品全体の歩合対象ON/OFFを撤去。代わりに報酬管理画面の商品一覧で通常の商品歩合対象・コミッションドリンク対象を独立編集。
- `src/commissionDrink.js`: 同一 `menu_items` 行の通常商品歩合フラグとドリンク対象／追加料金を部分更新で統合。旧APIからのドリンク専用更新も互換保持。
- `test/auto-ci/commission-horizontal-consolidation-10.test.mjs` と `docs/IZK_COMMISSION_HORIZONTAL_10_20261108.md`: 10独立観点を固定。同日追加決定で旧オーダーオプショングループ報酬指定を廃止し、レディースドリンクへ一本化。
- `src/tenantDb.js`, `src/tenantD1SchemaContract.js`, `src/accountDeletion.js`, `src/backup.js`, `src/dataAdmin.js`: 店舗分離・移行ゲート・バックアップ・完全削除/復元への統合。
- `src/tenantProvisioningMigrations.generated.js`: 既存生成器で0058まで再生成。

## テスト証拠（正式実機QAではなくローカル）
- `node test/gas_compat_smoke_test.mjs`: 572 business checks PASS。担当者未割当、SC対象0名で注文→会計成功→未分配レコード→返金取消を実RPC・tenant SQL guard経由で確認。
- `node --test test/auto-ci/commission-sc-eligible-staff.test.mjs`: 8/8 PASS。移行時OFF、在籍2名への均等分配・他店舗/非対象/退職者除外、0名未分配、返金、商品歩合の担当必須、従業員権限、異店舗伝票への未分配台帳偽装拒否、UI配布面。
- `node --test test/commission_input_precision_regression_test.mjs test/commission_scope_tenant_validation_test.mjs test/qa_horizontal_commission_review_20.test.mjs`: 関連する既存32件PASS（上記7件とまとめて38件PASSした記録あり）。
- `node test/tenant_raw_sql_inventory_test.mjs`: PASS。新規SC SQLの店舗限定を監査登録。並行変更の会計レスポンス再取得2 SQLも固定の店舗/注文ID条件を監査。
- `node test/tenant_d1_schema_contract_gate_test.mjs`: PASS。0058未適用・列欠落・索引欠落を拒否する共通スキーマゲート。
- 0058には未分配台帳の伝票番号・店舗一致をDBで拒否するトリガーがあり、スキーマゲートでトリガー存在も検証。
- `node test/data_admin_orders_regression_test.mjs`、`node test/tenant_pass4_backup_import_intrusion_test.mjs`、`node test/account_deletion_db_first_regression_test.mjs`、`node test/auto-ci/checkout-response-loss-recovery.test.mjs`: PASS。

## 反映・正式QAの未完了
- 本件の作業範囲はソース実装とローカルテスト。コミット、プッシュ、Workerデプロイ、本番/teat/yuwaku D1への0058実適用、Android/iOS配布、実機正式QAは実施していない。
- リリース順序は**店舗ごとの物理D1に0058を正式適用・スキーマ契約で読戻し確認 → Worker更新 → Web/Native配布**。前後逆転は従業員取得／会計APIの列・テーブル欠落となるため不可。
- 配布後の正式QAでは「SC対象0名／全員OFF／対象ONの退職者／店舗跨ぎ／商品歩合だけ担当未割当／通常・分割会計／返金／JPY・PHP丸め／日英」を実API・実DB・実機証拠で判定する。オフラインテストPASSを正式QAに算入しない。
