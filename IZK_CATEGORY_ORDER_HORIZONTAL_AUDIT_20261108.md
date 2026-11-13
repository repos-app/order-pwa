# カテゴリ表示順・10観点横展開監査（2026-11-08）

## 完了条件

在庫のカテゴリ選択をメニュー画面の正本順に一致させ、利用元10観点を監査。原因を修正し、正常系だけでなく例外・負例を自動テストに組み込み、既存CIへ登録する。SOURCE検証を実機QAとして報告しない。

## 10観点とソース対策

| No | 領域 | 監査所見・対処 | 自動テスト |
|---|---|---|---|
| 01 | 顧客注文/管理カテゴリ | 仮登録・停止商品を事前除外すると初出カテゴリ順が変化。全商品を正本としてランク判定、表示可能行に適用。tenantDb経由 | H01 |
| 02 | 設定済みカテゴリ順 | 保存したmenuCategoryOrderが顧客・管理・在庫候補で一致 | H02 |
| 03 | 非公開商品 | 仮登録・販売停止だけのカテゴリも在庫候補から失われない | H03 |
| 04 | 店舗分離 | 店舗Aのカテゴリや保存順を店舗Bに漏らさない | H04 |
| 05 | 日英/機密 | localized_fieldsの日英ラベルを維持し、専用RPCは価格などを返さない | H05 |
| 06 | 権限 | 在庫・プリンター担当者にmenu_editor全メニュー取得権限を与えず、専用のカテゴリのみ閲覧を認可 | H06 |
| 07 | プリンター選択 | JS Object.keysがカテゴリ10,2,1を数値順1,2,10へ変えていた。専用RPC配列の順を保持 | H07 |
| 08 | Native/GAS API | 同順位商品の並びをsort_order,nameで安定化 | H08 |
| 09 | 注文タブ復帰 | 他画面でカテゴリが改名・統合されたら旧タブ選択を「すべて」に復旧 | H09 |
| 10 | 公開テイクアウト | 言語初期化が通信エラー表示要素を消していた。初回成功前はメニューを再描画せず、通信失敗を可視化 | H10 |

追加 H11: 在庫画面3面でカテゴリ専用RPCの取得、在庫専用カテゴリの末尾追加、日英の重複防止を検証。

## 実施結果

- test/auto-ci/menu-category-horizontal-parity.test.mjs: 11/11 PASS（実SQLite、権限制御、失効タブ、プリンター、言語切替の負例）。
- test/auto-ci/inventory-category-menu-order.test.mjs: 12/12 PASS（3面、日英、変更順、権限・重複）。
- test/auto-ci/inventory-category-browser.test.mjs: Chromeモバイル幅390pxで3面×日英を実DOMで検証。コード存在確認だけではない。
- 既存メニューカテゴリ18/18、メニュー編集Chromeブラウザー72/72、テイクアウト56/56、日英85/85、権限回帰と共通UI保全もPASS。
- scripts/ci/auto-ui-i18n-gate.mjs は全138画面を走査してゲートPASS（既知レビュー対象は維持、正式実機PASSではない）。
- scripts/ci/run-auto-discovered-tests.mjs --ci --list で追加テストを検出。既存CIによりpush/PR、既存precommitによりcommit前に実行される。新しいworkflowは不要。

## 残件・境界

在庫画面の「メニューから追加」は当初、管理メニュー取得に依存し、在庫権限のみの担当者では利用できなかった。以下のP0追加対応で解消した。

当初、既存SQL監査で別の新規purchaseOrderSender.jsの未登録SQLによるFAIL、発注リトライ回帰のFAIL、および旧テストハーネスのAUTH_PREFIX未定義を観測。後続のSQL監査・発注P0追加対応は以下の通り。旧テストハーネスの別件について全テストPASSとは主張しない。

本件の正式実機QA PASS増分0。コミット・push・Worker配備・iOS署名ビルド・TestFlightは未実施。SOURCEのPASSやChromeテストを正式Android/iOSデバイスPASSに読み替えない。

## P0追加対応（同日・実際の作業結果）

1. 在庫担当者がメニュー商品を追加・紐づけするため、限定API getMenuInventoryLinkOptions を既存 src/menuCategories.js のtenantDbと日英共通ローカライズ処理で実装。メニュー商品名（日英）・既存紐づけだけ返し、価格、原価、販売状態、画像などは返さない。GAS/RPCとNative両経路でinventory権限を強制し、全メニューのmenu_editor権限は開放しない。3つのinventory.htmlの初期取得・更新処理を限定APIへ変更。
2. 在庫権限だけの実セッションを使ったGAS互換API往復で限定取得、管理メニュー取得拒否、Native API限定取得、在庫への実紐づけを確認（test/gas_compat_smoke_test.mjs）。同スモーク全568チェックPASS。3画面のChrome実DOMでは「既存在庫への紐づけ」「メニューから新規行追加」「日本語・英語」まで確認。test/auto-ci/inventory-menu-link-permission.test.mjs は実SQLiteの店舗分離・保存順・情報制限・権限マッピングを3/3 PASS。
3. SQL監査は店舗正本取得の新規 purchaseOrderSender.js を監査し、tenantDbで店舗ID検証、読み取り固定SQLの正確な形状と引数を test/tenant_raw_sql_inventory_test.mjs に登録。purchaseOrders.jsの発注済みPOメールの新規2件のSQLは店舗+POキー条件付きで個別監査。監査 exit0、100 JS・66 SQLモジュール・1040 syntactic sites。監査件数は正式QA PASSではない。
4. 発注の旧文字列回帰（frontend_offline_audit_regression_test.mjs）は同時進行変更で実施時すでに253 PASS。ただし実処理の負例で、発注確認中の連打によりUIConfirmが二重に作成され先行Promiseが未決着になる再現可能なP0を発見した。3面に確認開始から保存・メール完了までのPO_ACTION_PENDING排他を実装。キャンセル・失敗時解除。保存ACKにはPO IDを必須化し、応答喪失で同一リクエストIDを再利用。3面の実ハンドラーVMテストで二重確認、曖昧保存/メール再送、明示的新規発注を検査。
5. 発注関連5テストファイルの再実行20/20 PASS、frontend/offline監査253 PASS、権限ルートテストPASS、注文/在庫HTTP回帰8/8 PASS。自動検出テストは既存のtest/auto-ciで展開し、ルート変更による手作業登録を不要にした。

**反映区分:** ソース・ローカルテスト完了。コミット、Push、Worker配備、物理端末・遠隔D1・外部メール送達の正式実運用確認は実施していない。
