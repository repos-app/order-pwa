# S2 共通Webテスト環境・証拠管理：実装／検証結果

基準日：2026-11-07（フィリピン時間）

**判定：S2のローカル共通レーン実装・動作検証PASS。正式実機QAのPASS、実Cloudflare D1検証、ストア公開承認とは異なる。**

## 完了条件と実績

| 完了条件 | 結果 | 実測根拠 |
|---|---|---|
| 本番・teat/yuwakuを使わない隔離環境 | PASS | qa-s2-a と qa-s2-b を別々の in-memory SQLiteに構築。本番D1/R2/Workerは未接続 |
| 実Web資産のブラウザ操作 | PASS | 実 menu_editor.html / native-auth.js / api.js / confirm.js をChromiumで動作 |
| Web→APIクライアント→本物の業務Worker処理 | PASS | API.post RPC→ローカルHTTPS要求橋→commonTenantGatewayFetch→POSハンドラ |
| 更新後のDBとAPI独立照合 | PASS | 商品売切操作→DB sold_out_until→実RPC getAllMenuForAdminのsoldOutが一致 |
| 店舗分離 | PASS | qa-s2-bのDBは不変。他店舗トークンのAPIアクセスは拒否 |
| 中断・失敗後のデータ復旧 | PASS | 正常系・注入失敗系ともにベースラインへ復元しDB close |
| 証拠の記録と偽PASS拒否 | PASS | 操作経路、DB before/after/restored、画面PNG＋SHA256をrunごとに保存。PNG欠損時の偽PASSを拒否 |
| CI自動発見への統合 | PASS | 自動発見登録6件を一括実行、6/6 PASS |
| 実Cloudflare D1/workerdの完全互換検証 | 未実施 | ローカルSQLite互換アダプタでの実業務ハンドラを検証。S4で追加 |
| iOS/Android実機・BLE・StoreKit/Play Billing | 対象外 | S7で実施 |

## 実装と再利用

再利用：

- 既存の2店舗SQLite分離・D1互換方式：test/common_tenant_real_business_e2e_test.mjs
- 実業務処理：src/commonTenantGateway.js、src/index.js、src/gasApi.js、src/admin.js
- 実Web資産：mobile-app/web/menu_editor.html と関連JS
- 既存の自動発見：scripts/ci/run-auto-discovered-tests.mjs と .github/workflows/auto-ui-coverage.yml

今回の追加：

- scripts/qa-modernization/local-gateway-fixture.mjs：独立2店舗、マイグレーション適用、前後データ読取、復旧
- scripts/qa-modernization/s2-browser-business-e2e.test.mjs：本物のWeb画面・API/Worker・DBの統合テスト
- scripts/qa-modernization/s2-evidence.mjs：PNGハッシュと独立データ復旧の証拠検証
- scripts/qa-modernization/s2-evidence.test.mjs：証拠が欠損した偽PASSの拒否
- test/auto-ci/qa-modernization-s2.test.mjs：新しい自動テストを既存CIの自動発見へ追加

## テスト実行結果

個別実行コマンド：

    node --test scripts/qa-modernization/s2-evidence.test.mjs test/auto-ci/qa-modernization-s2.test.mjs

結果：**3 PASS / 0 FAIL**（2026-11-07）。実Web E2E、注入失敗後の復旧、証拠欠損拒否を含む。

既存CI自動発見：

    node scripts/ci/run-auto-discovered-tests.mjs

結果：**登録6ファイルを一括実行、6/6 PASS**（2026-11-07）。この実行はnpm test全213ステップの実行ではない。

最終個別実行の証拠：

    test-results/qa-modernization/s2/local-2026-11-07T11-53-25-255Z-p22532/result.json
    test-results/qa-modernization/s2/local-2026-11-07T11-53-25-255Z-p22532/menu-editor-after.png

verdict=PASS、API要求11件、ページエラー0件、他テナント更新0件、復旧一致。PNGのSHA256検証済み。

## 失敗履歴と注意事項

1. 初期のカテゴリ並び替えE2Eは単独実行でPASS。CI連続実行時、並行編集されたカテゴリ管理HTMLから開閉ボタンがなくなった状態を観測し、ボタン探索タイムアウトでFAIL。その後の検査ではパネルが表示されても内部の開閉フラグがfalseのため一覧が描画されない状態があった。
2. カテゴリ管理UIは別作業で変更中だったため、S2の共通基盤確認シナリオを安定した「商品一括売切」操作に変更。新しいE2Eは実Web・実Worker処理・独立DB・復旧までPASS。
3. その後カテゴリ管理の開閉ボタンがソースに再登場した。前回のFAILを現行ソースで再現済みの恒久障害とは断定しない。S5の実画面E2Eで再評価する。
4. ローカルのD1互換SQLiteはCloudflare D1との完全な同等性を証明しない。トランザクション・競合・書込フェンスの互換確認をS4に引き継ぐ。
5. 旧実機QAにある重複ペアオーナー15件は未修正。今回の新共通レーンでは個別ケース専用ドライバを増やしていない。既存正式台帳や旧証拠は変更しない。

## 次のステップ

S3：ソース全体監査と変更影響監査。S4：業務不変条件と実D1ランタイムの差異検証。S5：カテゴリを含むWeb E2Eシナリオ拡張。

**未実施：** npm testの213ステップ総実行、本番/teat/yuwakuの書込、Cloudflareリモート操作、実機QA、正式ケースの新規PASS付与、commit/push/deploy。
