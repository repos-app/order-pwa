# IZK-UT-178: 4件のテストと製品仕様の再照合（2026-11-19）

## 判定

`BW-CHECK-06`、`BW-ATT-04`、`BW-EXT-040`、`BW-EXT-049` は、
当初の期待シナリオに現行製品の承認された機能境界を越える仮定が含まれていた。
「機能が無いことを検出したテストの成功」を業務PASSに数えないため、
**テスト定義・実行内容・独立証拠Oracleを同時に修正した**。

| ID | 原テストの不適切な仮定 | 現行仕様の根拠 | 修正後の肯定的な検証 |
|---|---|---|---|
| BW-CHECK-06 | 部分会計の実行が必須 | `test/admin_partial_checkout_visibility_test.mjs` は3系統の部分会計UI無効化を明示要求 | 実Chromeで部分会計を直接起動できないことを確認し、同卓2注文を提供済に更新、**全額オンライン会計で領収書200を1件・注文2件を会計済**として独立SQL照合 |
| BW-ATT-04 | 予定勤務シフトの登録・変更が必須 | `migrations/0001_init.sql` の `shifts` はレジ開閉用。実績は `attendance` で集計 | **8時間の勤務実績・給与概算1000（時給125）**を実Chromeの月次/日次画面と独立SQLで確認、レジシフトの不変を確認 |
| BW-EXT-040 | 期限切れロットの引当が必須 | `drink_inventory` と `inventory_moves` は現時点で有効期限ロット管理を実装していない | **1個の在庫に対する必要数2の提供拒否**と注文状態・在庫不変、3個補充後の提供成功・在庫1を実ChromeからのAPI・独立SQLで確認 |
| BW-EXT-049 | 電話番号変更中の会員ポイント付与が必須 | `src/crm.js` は `phone_number` を不変のキーと定義、`mobile-app/web/members.html` は編集時 `readOnly` | **2つの独立Chromeコンテキストで会員プロフィール更新**を実施、別番号更新は拒否、元番号・会員1件・既存5ポイント不変、実DBと画面を照合 |

これらは元シナリオの「未実装機能を新しく実装した」ことを意味しない。
将来、部分会計・予定勤務シフト・期限管理ロット・会員電話番号変更を正式要件として追加する際は、
**別途仕様決定・独立ケース追加・実機QAが必要**であり、本検証で対応済みと主張しない。

## 変更と検証の完了条件

- 要求カタログ: `scripts/qa-modernization/business-web-scenario-requirements.mjs`
- 共通ランナー実体（旧ファイル名を維持）: `scripts/qa-modernization/s5-p1-blocked-legacy-features-browser.test.mjs`
- 独立証拠Oracle: `scripts/qa-modernization/p1-supplemental-evidence.mjs`
- ソース時点・画面PNG・隔離SQLの契約: `scripts/qa-modernization/s5-boundary-common-20261117.mjs`
- 206件集約: `docs/qa-modernization/IZK_UT_178_COMPLETION_STATUS.json`

テストファイルの旧名称は、共通ランナーのオーナー紐付けを変えて他ケースの
ソースハッシュを無用に失効させないため意図的に保持する。
ケース実体は既に「未対応機能の診断」ではなく「現行仕様に整合した肯定的業務検証」である。
`node --test` の成功だけではPASSとしない。独立Oracleで最新の画面PNGバイト・
実行時ソースSHA256・DB不変条件を確認し、206件ゲートに取り込む。
正式な実機QAおよび本番反映はこのローカル証拠とは別の作業である。
