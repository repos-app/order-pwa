# npm test 226ステップ / FAIL 32件 原因調査（2026-11-10 PHT）

## 調査範囲と実測結果

- 実行：`npm test -- --continue-on-fail`、226/226 **EXECUTED**、**PASS 194 / FAIL 32 / NOT_RUN 0**。本番や実機の正式QA判定ではない。
- 実行ログ原本：`test-results/npm-full-current-20261110.log`（PowerShellでリダイレクトしたためUTF-16 LE）。
- 正式実行レシート：`test-results/npm-pipeline-runs/` 内、run ID `2026-11-10T02-35-01-644Z-b7773105-7796-4638-b159-28826f48f332`。
- `sourceMatch=false`：実行中に並行開発でソースが変わった。したがって当該226件は**単一固定コミットの正式全件PASS証拠ではない**。FAILがあったこと自体は正当な観測であり、全件PASSに変更してはいけない。
- 32件の全てについて、失敗した最初のアサーション・SQLエラーを原本ログから抽出し、関連するテスト、アプリ実装、マイグレーション、実配布ファイルを照合した。**本調査で製品ソース/テスト期待値/DBを修正していない**。

## 共通原因の分類（32件、重複なし）

| 分類 | 件数 | ステップID | 現時点の判定 |
| --- | ---: | --- | --- |
| A. 古いSQLite fixtureが現行DBマイグレーションに追随していない | **10** | 41, 52, 53, 54, 71, 74, 88, 90, 92, 95 | **テスト基盤の根本原因確認済み**。本番D1が同じエラーとの証拠はない |
| B. 廃止済み商品別コミッション規則を検証している | **5** | 42, 82, 122, 157, 159 | **仕様/期待値の旧態化確認済み** |
| C. 抽出VMテストの新規変数初期化漏れ | **3** | 24, 104, 149 | **テストハーネス不足確認済み**。実画面の変数自体は定義済み |
| D. 画面・生成台帳・配布ビルドの固定期待値が古い | **8** | 121, 146, 147, 148, 166, 167, 171, 172 | **テスト/スナップショットの旧態化確認済み**。一部仕様照合の再テストが必要 |
| E. 実画面・配布・法務の不整合 | **3** | 96, 150, 173 | **製品側の改善対象確認済み**。下記優先事項参照 |
| F. テナントSQL安全契約の変更・レビュー不足 | **2** | 48, 207 | **新DB設計と旧QA制約の不整合を確認**。単にテストを緩めず独立セキュリティ検証が必要 |
| G. スタッフ認証経路の引数変更にテキスト検査が追従していない | **1** | 156 | **正規表現の旧態化確認済み**。実RPCは別のセキュリティテストで検証要 |

## FAIL32件の個別トレースと原因

| No. | テスト（短縮） | エラーの直接原因と判断根拠 | 分類 |
| ---: | --- | --- | :---: |
| 24 | `offline_checkout_frontend_test` | 抽出した会計JSで `checkoutFinalizeBusy is not defined`。実 `admin.html` では変数を初期化しているが、単体VMが宣言領域を読み込んでいない | C |
| 41 | `local_smoke_test` | `getReceipts` が `receipt_payment_method_corrections` 未作成でエラー。fixtureが初期マイグレーションのみ使用、現行 `0071` 不適用 | A |
| 42 | `gas_compat_smoke_test` | Freeプランで商品別Commissionルール1件作成を期待。実 `src/commission.js` の `saveRule` は廃止仕様の `commission_rules_retired` を返す | B |
| 48 | `tenant_all_tables_intrusion_test` | 新テーブル全ての `store_id` がPKの一部という旧前提が不成立。`0059` のガード表と `0071` の訂正表はグローバルIDをPKとし `store_id` はNOT NULL。専用FK/トリガーを独立検証して制約を更新すべき | F |
| 52 | `tenant_routes_intrusion_test` | `getAllEmployees` が `e.sc_distribution_eligible` カラム無し。fixtureは `0026` まで、実カラムは `0058` | A |
| 53 | `tenant_additional_auth_intrusion_test` | 同じ `sc_distribution_eligible` 未適用。アクセス禁止検証に入る前にfixture SQLで失敗 | A |
| 54 | `tenant_ninth_auth_api_test` | `bootstrap` が `mi.commission_drink_enabled` カラム無し。fixture `0026` 止まり、実カラムは `0063` | A |
| 71 | `tenant_entrypoints_reverse_pass_test` | 同じ `bootstrap` カラム無し。fixture `0032` 止まり | A |
| 74 | `sample_demo_test` | 同じ `bootstrap` カラム無し。fixture `0041` 止まり | A |
| 82 | `bilingual_option_workflow_test` | オプション価格の検証後、旧「商品別Commission規則を保存」を期待。現在その規則APIは廃止され、注文別設定へ移行済み | B |
| 88 | `staff_takeout_bootstrap_test` | `bootstrap` カラム無し。fixture `0041` 止まり | A |
| 90 | `fourth_pass_backend_global_numbers` | `EXPORTABLE_TABLES` は `commission_receipt_assignments` / `commission_sc_unallocated` を含むが、テストfixture `0042` 止まりで `0058/0059` 未作成 | A |
| 92 | `fifth_pass_backend_order_history` | `receipt_payment_correction_admin_scope` 未作成。fixture `0042` 止まり、`0071` 未適用 | A |
| 95 | `sixth_pass_parent_import_history` | `receipt_payment_method_corrections` 未作成。fixture `0042` 止まり | A |
| 96 | `sixth_pass_distribution_references_test` | `staff-push.js` は実ファイルとして存在するが、`mobile-app/web/sw.js` のオフラインSHELL配列にない。初回オフライン起動時の利用可能性を保証できない**配布物の実不整合** | E |
| 104 | `qa2_flow_a_001_offline_visibility_regression_test` | 抽出VMで `_pricingReady` 未定義。実 `admin.html` には `var _pricingReady=false` がある | C |
| 121 | `izk_ut_075_input_inventory_contract_test` | 保存した `docs/IZK_UT_075_INPUT_FIELD_INVENTORY_20261015.json` と動的再スキャン結果が不一致。画面追加/更新後のインベントリ未生成 | D |
| 122 | `izk_ut_073_commission_long_name_test` | テストが廃止した `function renderRules(){` の存在を前提にJS切り出し。商品別ルール廃止後の現行画面には旧描画関数がない | B |
| 146 | `izk_all_screen_syntax_navigation_audit_test` | `docs/yuwaku/account.html` のinline scriptsは**6件**、保存期待値は**5件**。シンタックス・ローカルリンクエラーはログ上0 | D |
| 147 | `izk-source-coverage-manifest` | 現行ソースと保存Coverage JSONが一致せず、ツールが `Coverage JSON stale` で停止 | D |
| 148 | `izk-all-frontend-js-audit` | 現行フロントソースと保存JS manifestが一致せず `Frontend JS source manifest stale` | D |
| 149 | `qa2_flow_n_002_orders_error_regression_test` | 104と同じ抽出VMの `_pricingReady` 初期値漏れ | C |
| 150 | `izk_ut_071_logout_privacy_regression_test` | 実 `mobile-app/web/index.html` のログアウトは **StaffPush解除Promiseの `.then()` 後に `API.logoutSession()` を呼ぶ**。表示上の `TOKEN` は即時に空になるがAPI内の安全な認証ストレージ消去が非同期化され、テスト時点で旧トークンが残る。**実装側の認証消去タイミング不具合** | E |
| 156 | `review_regression_test` | `dispatchDirect(...request,parsed)` と旧 `if(sessionAuth)` 位置を正規表現で固定。現行 `dispatchDirect(...request,sessionAuth,ctx)` であり、店舗ID一致チェック後に `sessionAuth` を許可する別実装へ変更済み | G |
| 157 | `audit_backend_critical_regression_test` | 旧 `commission_rules` の「USD 10.05×10%=1.01」を `prepareEntriesForBill` に期待するが、現行コミッションは商品ルールで計算しない。**1.01丸め自体の不具合と断定不可**（同じテストでクーポン丸めはPASS） | B |
| 159 | `backend_rounds_1_10_regression_test` | 旧 `saveRule` への存在しないID更新で `not_found` を期待。現在は全て `commission_rules_retired` として拒否するため期待エラーコードが旧態化。プリンター側と合算したassertがFAIL | B |
| 166 | `date_display_test` | 列挙画面が全て `type="date"` を持つ想定。しかし `mobile-app/web/commission.html` ではそのHTML inputは既に無い。date-display.js読込順は正しい | D |
| 167 | `dynamic_system_i18n_test` | 監査ログ詳細欄の旧固定HTML `'<td>'+esc(r.details)+'</td>'` を期待するが、現行は複数行詳細を `auditDetailLines` で生成。翻訳漏れと断定せず実DOMと言語挙動で再検証すべき | D |
| 171 | `native_auth_test` | Android debug/releaseスクリプトに直接 `'@capacitor\\geolocation'` 文字列があることを期待。現行は **`android-native-stage.ps1` が `capacitor.settings.gradle` からネイティブ依存を動的列挙**する共通方式。旧文字列チェックが無効 | D |
| 172 | `ios_release_readiness_test` | モバイルHTML画面数を **44・入力あり36** に固定。現行スキャンは **45・入力あり37**。新規画面を想定していない期待値 | D |
| 173 | `privacy_declaration_test` | 規約HTML（アプリ内・公開Web）の最終更新日は **2026-11-08**、登録画面/サーバーの `TERMS_VERSION` は **2026-11-07**。テスト期待は11/7。**単なるスナップショットではなく同意バージョンの整合性レビューが必要** | E |
| 207 | `tenant_sql_guard_new_table_alignment_test` | Raw-only期待リストに `commission_option_assignment_guards`、`owner_email_change_requests`、`owner_password_resets` が未登録。独立読み取り検査では前者をSQL Guardが拒否、後者2表は正しい店舗IDなら許可・異店舗IDでは拒否。**新表の正式アクセス方針の台帳更新・独立ガード契約確認が必要** | F |

## 本当に修正・確認が必要な順序

1. **P0/P1: ログアウト認証ストレージ消去（150）**。Push登録解除の非同期応答を待つ前に `API.clearSession` 相当が必ず動くよう共通管理画面を横断修正し、オフライン・Push失敗・logout即時再ログイン・遅延応答を回帰テスト。管理DOMだけ先に消えても十分ではない。
2. **P1: 正式規約の同意バージョン（173）**。11/8の規約本文が11/7から変更された内容を確認し、利用者の規約同意をどのバージョンとして保存するか整合させる。日時だけを無根拠に書き換えない。
3. **P1: オフライン配布（96）**。staff-push.jsをPWAの全参照・SWの厳密なSHELL一覧・キャッシュversionとセットで一致させる。オフライン初回起動を実ブラウザで検証する。
4. **P1: 新DB権限スキーマのレビュー（48,207）**。旧「store_idは必ずPK」制約を安易に削除せず、グローバルID+tenant FK/トリガー/書込境界の代替不変条件と新Raw-only表3件の読み書き権限を独立検証し、共通台帳に正式反映する。
5. **P2: 共通SQLite fixtureを最新の物理マイグレーションへ追従（10件）**。現行の共通fixture factory/contractを利用してテストを横展開する。旧テストごとに専用DDLは追加しない。必要に応じてレガシー相互運用のシナリオを独立に残す。
6. **P2: 廃止コミッションのテスト更新（5件）・抽出VMの共通ランタイム整合（3件）・全画面/ビルド台帳の自動更新（8件）・旧auth静的assert更新（1件）**。単なる期待値の削除はせず、置換した現行業務の積極的/負例assertを維持。自動発見・動的源泉による検知を使い再発を防ぐ。

## 正式な扱い

- **全件実行したこと**と**全件PASS**を混同しない。本ランは226/226実行済み、194 PASS・32 FAIL。失効ソースあり。
- **製品の本番障害32件という意味でもない**。大半はテストfixtureや旧期待値だが、3件（96,150,173）は製品/配布/法務の明確な改善点。
- 32件全ての修正・個別再実行・全226件の再検証・正式PASS更新は**本調査の範囲では未実施**。現行レシートのFAILを勝手にPASSへ上書きしていない。
