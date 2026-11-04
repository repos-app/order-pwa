# izakanpai ローカル障害修正・10回横展開/10回再チェック監査 — 2026-10-21

## 判定基準・作業境界
- 実ソースの失敗を再現できた障害だけを LOCAL_FIXED とする。旧署名APKの正式FAILのみでは LOCAL_UNFIXED としない。
- 公式831件QAの正式PASS/FAIL、Android/iOS端末、Cloudflare本番、Git push、署名APK/IPAビルドは変更していない。修正の現行ビルド/現物でのE2Eは別。
- 共有dirty作業ツリーの既存変更を維持。ローカルソース改修、実Chromium回帰、バックエンド・テナントSQLite試験、生成資産同期を実施。

## 完了した実行ゲート
- 全量: npm test → **192/192 ordered project steps PASS, exit 0**。証拠 test-results/local-defect-review-20261021/npm-full-final-192-after-translation.log。
- ビルド前: npm run mobile:sync → **exit 0**。Android/iOSにWeb生成資産を同期。証拠 mobile-sync-after-local-fixes.log。
- 配布整合: npm run verify:distribution → **exit 0**。証拠 verify-distribution-after-mobile-sync.log。
- 固定ソース照合: 全126画面の構文/遷移・38組Web本番/テストのバイト整合、69モジュールのコード登録、53出荷Frontend JS構文検査で PASS。

## 各独立障害グループと20検証
| 対象・修正 | 横展開10回 | 修正後再チェック10回 | 主要証拠 |
|---|---:|---:|---|
| 注文管理の長文商品名、3配布面で価格・操作ボタンに重なる文字分割CSS | **10/10 実Chrome PASS** | **10/10 独立実行 PASS** | admin-10-horizontal-chromium.log / recheck-01..10.log |
| 注文クイック操作の幅不足・非表示、共有CSS3面 | **10/10 実Chrome PASS** | **10/10 実Chrome PASS** | test-results/izk-ut-073-quickbar-20-checks.log、docs/IZK_UT_073_QUICKBAR_REACHABILITY_20261021.md |
| 8画面のルートoverflow:hiddenによる横方向クリッピング | **10/10 実Chrome PASS** | **10/10 実行 PASS** | root-horizontal-10-chrome-after-profit.log / root-recheck-results.json |
| レポート送信先・送信者の不正メール形式を共通バックエンドが通す問題 | **10/10 PASS** | **10/10 PASS** | test-results/backend-validation-20261021/REVIEW_HANDOFF.md、horizontal-and-rechecks.log |
| Tax/Service rate 0..100%、step0.1 を迂回して0.11を保存できる問題 | **10/10 PASS** | **10/10 PASS** | 同上、両値の独立ケースと再チェック |
| 仕入先メール送信で存在しないvalidSupplierEmailが参照されていた問題 | **10/10 実関数 PASS** | **10/10 独立実行 PASS** | purchase-email-H10.log / purchase-email-recheck-results.json |
| 英語商品名の手入力済み表記をAIサイズ補正が上書きする問題 | **10/10 実関数 PASS** | **10/10 PASS** | translation-manual-after-option-H10.log / translation-final-rechecks.json / menu_auto_translation_test.mjs |
| 0047 Migration導入後のテナントスキーマ検証漏れ・生成バンドル不一致 | **10/10 厳格契約PASS** | **10/10 独立実行PASS** | migration-0047-H10.log / migration-0047-rechecks.json |

## 統合回帰で追加解消した不整合
- 発注メール・レポートメール共通validatorの呼出境界を接続。手入力の200文字メールは、有効なmailboxのみを許可。
- 税率・サービス料の旧step=anyテストを現行QA入力契約 min0/max100/step0.1 に統一。適切な境界正値、無効小数値、DB副作用なしを検査。
- backup全件削除テストはCSV公開済みreceipt_print_outboxを二重計数しない。SQLiteバックアップ対象を実inventoryから評価。
- Migration 0047追加後の固定46件という古い条件を、連番・欠番・重複を確かめる共通ガードへ転換。将来追加時も非連続マイグレーションは拒否。
- src/tenantProvisioningMigrations.generated.jsを既存生成スクリプトで再生成。src/tenantD1SchemaContract.jsは0047 original_transaction_idを必須化。旧0046を最新PASSにしない。
- RevenueCat署名済みイベントの2つのCONTROL_DB exact event_id failure writeと、Subscriptionのスコープ済み旧スキーマ読取を個別SQL契約へ追加。SQL台帳の単なる無制限緩和はしない。
- 古いmoves狭幅nowrap/クイック操作hiddenのテストは、既存の現行「2段表示」「44px操作」「横方向到達可能」に合う厳格な検査へ刷新。
- 入力フィールド候補inventory、126画面カバレッジ、Frontend JS監査、69ソースモジュールmanifestを既存生成器で再作成・再照合。全体192ステップでPASS。

## 追加の旧APK FAIL候補3件に対する現行ソース独立実行
- QA2-KEEP-OPR-CLOSE-007: Native/Web PROD/TESTの現行レジ表示＋実SQLiteで、PHP 123.45および7.89等の小数を確認。現行ソースは **22/22 PASS**。修正版APKでの正式確認は未実施。
- QA2-KEEP-OPR-RACE-034: Manila 23:00-翌01:00、休憩10分×2 → 正味100分、月跨ぎ・店舗分離を実SQLiteで確認。現行ソースは **20/20 PASS**。修正版APKの正式確認は未実施。
- QA2-KEEP-OPR-BCP-009: 実SQLite outboxエクスポートと3つのdata_admin.htmlでのbackupAllがreceipt_print_outbox.csvをJSZip.fileへ含めることを確認。現行ソースは **20/20 PASS**。外部JSZipでの圧縮・実ファイル保存/実機は未実施。
- 3候補とも既存ソースに修正が存在し、今回のソース追記は0。各**横展開10/10・別Node実行の再チェック10/10**、計30個の独立再チェックログがPASS。
- 証拠: docs/IZK_CLOSE_RACE_BCP_SOURCE_RECHECK_20261021.md、test-results/backend-candidates-20261021/three-source-current-62-tests.log、test-results/local-defect-review-20261021/three-current-source-independent-prime.log。Primeによる独立再実行も **62/62 PASS**。
`n## 全障害LOCAL_FIXEDの確定状況・未確定理由
- docs/QA_AUTO_DEFECT_REGISTER.mdは**74件**（読み取った台帳値）。60件 TRIAGE_EVIDENCE_REQUIRED +10件 TRIAGE_REQUIRED = **70件 UNDETERMINED**、非アプリ修正3件、リリース証拠待ちアプリ1件。
- これら70件は旧署名APKの失敗または未到達の候補を含む。個々に現行ソースで未修正の証拠は揃っていないため、74件全てが「ローカル修正完了」とは宣言しない。
- 履歴上の端末/配布依存案件 (例 QA2-SET-012の公式runtime adapter/oracle、実プリンタ、印刷Outbox、旧Android端末の表示) は、新署名APK/IPA・backend配布・正しいQA専有権と実機証跡が必要。これらを回帰PASSに読み替えない。
- Android/iOS正式QA台帳、公式件数、正式PASS/FAILは本作業で変更なし。

## 主要実行証拠の所在
- test-results/local-defect-review-20261021/ (上記 H/Rログ、各npm試行ログ、配布整合、SQL security、生成資産検査)
- test-results/backend-validation-20261021/REVIEW_HANDOFF.md (現物FAIL再現、共有メール/率のH10/R10証拠)
- docs/IZK_UT_073_QUICKBAR_REACHABILITY_20261021.md (共通CSSの独立H10/S10ブラウザ記録)
## 2026-10-22 最終統合追補（ヘッダー・UI）
- IZK-UT-096: 現行のプライバシー/利用規約画面で、共通headerのタイトルが日英テキストを両方連結表示する問題を実Chromeで再現（修正前2/8 FAIL）。共通renderTitleのvisibleHeadingTextをNative/Web本番/Webテスト3つのheader.jsへ限定修正。非表示/aria-hiddenな子を除外、空タイトルはdocument.titleにfallback。
- 新規Chromiumテスト: test/izk_ut_096_bilingual_header_20_chromium.test.mjs。横展開H01-H10、自己再チェックS01-S10を含む **20/20 PASS**。元画面/配布面への既存関連31/31 PASS。
- 旧APKでFAILしたコミッションヘッダーの画面幅360px/390px/480px/800px、利用規約/プライバシーの日英表示、予約エラーの日英再表示を現行コードで実Chrome再検証し **8/8 PASS**。過去の正式FAILは変更していない。
- 独立UI 3スイート（20件+20件+8件）を2026-10-22に再実行し **48/48 PASS**。証拠 test-results/local-defect-review-20261022/new-ui-regressions.log。
- 正式QAの新PASSではなく、現行ローカルソース回帰のPASS。署名APK/IPA作成、端末実証、本番リリースと正式台帳更新は未実施。
## 2026-10-22 最新ソース全量確定（最終統合）
- 2026-10-22 の新規実Chrome 3スイート **48/48 PASS**、終了コード0。証拠 test-results/local-defect-review-20261022/new-ui-regressions.log。
- 現行HTMLから既存生成器で126画面監査台帳を再生成。126画面の構文/リンク/イベント検査、38組のWeb本番・テストbyte一致 PASS。page-coverage-126-verify.log。
- 69ソースモジュール、53出荷Frontend JSの監査台帳を再生成。
- **最終 npm test → 192/192 ordered steps PASS、exit 0**。npm-full-192-after-coverage-refresh.log。最初の試行は監査JSON staleで144番目停止→再生成→全量最初から再実行し解消。既存のPASSを流用せず確認。
- **npm run mobile:sync → exit 0**。最新WebをAndroid/iOS生成資産に同期。mobile-sync-final.log。
- **npm run verify:distribution → exit 0**。distribution-verify-final.log。Native/Web本番/TESTのheader.jsの構文・git diff --checkもexit 0。
- 全証拠の基点は test-results/local-defect-review-20261022/。
- 正式Android/iOS QA台帳の再判定なし。74件の障害台帳のうち70件がUNDETERMINEDのため、全障害のLOCAL修正完了とは断定しない。