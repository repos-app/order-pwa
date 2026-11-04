# iOS BILL-007〜011 SOURCE契約（2026-10-27 PHT）

対象は831件Manifestにある `QA2-KEEP-OPR-BILL-007`〜`011`。SOURCE-onlyであり、実機操作、claim取得、D1読み書き、正式判定を行っていない。

既存の `scripts/qa-autonomy/ios-business-integrity-family.mjs` に共有 `makeIosCheckoutRaceRequirement`、`checkIosCheckoutRaceEffect`、`cleanupIosCheckoutRaceFixture` を追加し、期待値・障害前提を `test/plans/qa-v2-ios-source/operation-integrity-cases.json` に記載。既存の `qa-v2-ios-claimed-bridge`、HID、DDI、独立Oracleを前提とし、新規個別実行ドライバー・publisher・登録helperは作成しない。

| ID | 独立効果 | 未接続の物理条件 |
| --- | --- | --- |
| 007 | 2タップに対しreceipt/effect各1件、重複課金0 | pending期間内2回の実HID入力とD1照合 |
| 008 | 2端末競合でreceipt/effect各1件、重複課金0 | 独立claimの2端末、リクエスト重複時間、D1照合 |
| 009 | pending中UI Backの遷移抑止、会計副作用最大1 | 実際のBack入力・pending観測 |
| 010 | pending中physical Back相当操作の遷移抑止、副作用最大1 | iOS実機で利用可能な操作のレビュー・観測 |
| 011 | pending中kill・再起動後の自動再送0、副作用最大1 | 実プロセス終了/再起動と独立リクエスト監視 |

両時点の独立テナント指定・orderId・fixtureId・claimId、異なるreadId、重複課金0、物理イベント観測証拠を要求する。後片付けは所有fixtureのみとし、領収書・監査履歴・他店舗を保全した別の独立読戻しを要求する。Oracleへ提供する各read/timelineは呼出側が取得する必要があり、SOURCE契約自身には実機/DBアクセス権はない。

オフライン検証: `node --test scripts/qa-autonomy/ios-business-integrity-family.test.mjs scripts/qa-autonomy/hourly-cross-os-audit.test.mjs` 19 PASS/0 FAIL、exit 0。`git diff --check` exit 0。正式QA PASS増加0、正式台帳/D1更新0。

ソース影響確認: (1) manifest/userActions/expectedCheckpoints、(2) IOS_SOURCE_PROVEN_GAPS、(3) 従来BCP/REFケース数・動作、(4) case-owned fixture、(5) サイン済build前提、(6) 二度押しイベント、(7) 二端末セッション独立、(8) Back中pending、(9) kill後replay、(10) 領収書とeffect整合。横展開確認: (1) 既存共通iOS bridge、(2) HID、(3) DDI、(4) 独立D1 Oracle、(5) BCP同時性、(6) REF後片付け、(7) Android会計セレクタ、(8) tenant境界、(9) レシート保全、(10) 未接続能力ゲート。これらはソース観点の棚卸しであり、実機レビュー完了の証明ではない。
