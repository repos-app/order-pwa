# izakanpai iOS 勤怠 ATT-012〜016：SOURCE実装・未実行ハンドオフ

**2026-10-24 PHT / source-only**。正本 `.qa-v2-official/manifest.json` の831件、対象5件の`legacyId`と`expectedCheckpoints`を検証。作業時点の`.qa-v2-official/ios/state.json`は5件すべて`NOT_RUN`・attempts 0。今回はiPhone/Apple/Cloudflare/公式Runnerの実行、claim、証跡収集、正式判定、D1/台帳更新、commit/push/deployを行っていない。

## 実装と照合先

- `scripts/qa-autonomy/ios-attendance-break-family.mjs`：ATT-012〜016専用の**1つの共通ファミリ**。既存`runIosClaimedCase`、iOS serial、HID/DDI、独立UI Oracle、認証済API観測、D1読戻しProvider、ケース所有のcleanup Providerに接続する実行契約。実装が自前でiPhone/official Runnerを操作しない。
- `scripts/qa-autonomy/ios-attendance-break-family.test.mjs`：既存正本Manifestを読んで仕様drift、case ID、画面座標、実状態、履歴不変、他従業員・他店舗、写真/GPS、リクエストID、認証、cleanup、Bridge障害を反例付きで検証する11件。
- `scripts/qa-autonomy/ios-attendance-family.mjs`（001/002/003/009/011）と既存業務UI/Workerには本レーンから変更なし。他workerのdirtyファイル保護。

## 個別実機契約（実証は未取得）

| case | 事前fixture/履歴（店舗ローカル同日） | iPhone操作と独立業務Oracle | cleanup |
| --- | --- | --- | --- |
| 012 | owned Staff＝`勤務中`、履歴`[出勤]` | 自分のtile→休憩開始。`勤務中→休憩中`、`休憩開始`行**正確に1**、実送信`client_request_id`・写真/GPSのD1一致 | 当該従業員とowned行のみ、監査を保存 |
| 013 | owned Staff＝`勤務中`、履歴`[出勤]` | 自分のtile→**物理連続2タップ**、同一対象・500ms以内・独立計時。二重休憩0、DB追加行1、余分なserver効果0 | 同上。HID burst未解決のため物理実行ゲートを閉じる |
| 014 | owned Staff＝`休憩中`、履歴`[出勤,休憩開始]` | 自分のtile→休憩終了。`休憩中→勤務中`、`休憩終了`行**正確に1**、前履歴保持 | 同上。過去休憩記録とその後のaudit保持 |
| 015 | owned Staff＝`勤務中`、履歴`[出勤]` | 自分のtileで休憩終了不可のUIを独立観測。本人・staff認証済APIで`休憩終了`を要求し`not_on_break`を実拒否。D1追加0、状態不変 | 同上。負例で生成した認証済API receiptと監査を保全 |
| 016 | owned Staff＝`勤務中`、履歴`[出勤]` | 自分のtile→退勤。`勤務中→退勤済`、`退勤`行**正確に1**、写真/GPS・送信request ID・履歴不変 | 同上。退勤記録と監査を保存 |

全5件は`teat`、employee/fixture/case owner、店舗営業日、before/afterの**異なるDB read ID**、同一claim/DB identity、店舗間不変を要求。画面上の期待文言だけでは正式PASSを認めない。後始末もケースごとの`expectedBeforeKinds/expectedNewKind/expectedNewRowCount/expectedAfterStatus`を渡し、独立読戻しを要求する。

## 実行ブロッカーと次工程

- 全5件：現行インストール済TestFlightビルドの実識別、物理iPhone/HID/DDI接続、画面ごとに現物から取った`uiTargets`矩形、テスト専用本人ログイン/カメラ/GPS、店舗当日のowned fixture/history準備、各ケースの公式claim、独立UI/API/D1/event trace実測、監査保持cleanup Provider、正式証跡reviewが未確認。`OBSERVED_IPHONE_SCREEN`はソーステストの仮値では充足されない。
- **013固有：既存`runIosClaimedCase`は1タップごとにcapture/Oracle評価する。500ms以内の2タップを保証できず、旧002と同型の不足。共有claimed bridgeで原子的なHID burst・独立計時・録画receiptを実装し、その挙動を検証するまでは`IOS_ATT_BREAK_ATOMIC_HID_BURST_UNSUPPORTED`で停止。013のために共通Runnerを迂回してはいけない。**
- 015はUIでは禁止操作が見えないため、独立認証済API負例（actor employee/role、request receipt、`not_on_break`）が必須。UIが不可視だけでは成功扱いしない。
- 013だけが未対応でも、012/014/015/016の独立したsource contractは実行準備継続可能。登録済みWindows Schedulerの起動やダッシュボードsidecarは正式QA判定の根拠ではない。

## レビュー記録（静的・オフライン範囲）

独立レビューの入口を分け、iPhoneや配信中IPAが要る箇所は **PENDING** とした。11件の契約テストと隣接回帰は実端末証拠ではない。

| 自己レビュー | 根拠 / 結果 |
| --- | --- |
| S01 仕様 | 831正本・5 legacy/checkpointの完全一致、drift反例 PASS |
| S02 ケース排他 | 017、未知case、他OS scopeの適用拒否、Bridge再利用 PASS |
| S03 入力境界 | 履歴順序、状態、店舗ローカル営業日、座標矩形、case ownerの拒否 PASS |
| S04 認証 | Staff本人のfixture、015の認証済本人API否定のreceiptとactor照合 PASS（実ログイン PENDING） |
| S05 競合 | 013の2 HID/同一ボタン/500ms/DB一意/副作用0を別々に反例検査 PASS（本当のburst PENDING） |
| S06 DB不変 | 既存行の同値、row count、他従業員、claim/read ID、異店舗不変を反例注入 PASS |
| S07 UI | 観測座標/installed build一致と015のボタン不在、Bridge screen hash契約 PASS（実画面 PENDING） |
| S08 例外/cleanup | source runner失敗＋cleanup失敗をAggregateErrorで保全、owned/audit独立照合 PASS |
| S09 回帰 | 新規11/11、隣接36/36ではなく**11+10+12+14＝47/47**を実行しexit 0確認 |
| S10 差分 | 新規2ファイル+本書、`node --check`、`git diff --check` exit 0（他workerの既存差分未編集） |

| 横展開 | 別入口の確認 / 結果 |
| --- | --- |
| H01 Native UI | `mobile-app/web/clock.html`の`勤務中/休憩中`ボタン分岐とカメラ/GPS要求を逆引き、source一致 |
| H02 iOS HID/DDI | `qa-v2-ios-claimed-bridge.mjs`のlease/画面SHA/1tap/capture順序を確認、35件回帰PASS；013 burstはPENDING |
| H03 Web production | `docs/yuwaku/clock.html`の`apiPost('punch')`とrequestIdを確認、配信中UI動作PENDING |
| H04 Web TEST | `docs/yuwaku/test/clock.html`の同経路を確認、デプロイ版差分・実操作PENDING |
| H05 管理者画面 | `attendance.html`を確認。管理者自身の打刻は別011ケース、UIガード82checks PASS |
| H06 Native API | `src/attendance.js:punch`の`not_working/not_on_break/not_in`、idempotency/本人role guard確認。23 checks PASS |
| H07 D1 | `store_id`スコープ・request重複防御・SQLに先行状態条件あり、独立D1実測PENDING |
| H08 言語 | clock.htmlのJA/EN `pBs/pBe/pOut`と `ERR` を逆検索。実スクリーン言語切替 PENDING |
| H09 状態交差 | 012と014の互換状態、015の否定と016退勤、011 admin拒否を別入口で検査 PASS（実機PENDING） |
| H10 非関連画面 | claimed bridge/void race/billingの回帰と正本iOS source-audit、サイドカーの「source宣言≠Oracle接続」を確認 PASS |

実行結果（いずれもコマンド exit 0）：

```text
node --test scripts/qa-autonomy/ios-attendance-break-family.test.mjs scripts/qa-autonomy/ios-attendance-family.test.mjs scripts/qa-autonomy/ios-adm-billing-family.test.mjs scripts/qa-autonomy/ios-void-race-family.test.mjs
  47/47 PASS（新規11）
node --test test/qa_v2_ios_claimed_bridge_test.mjs test/qa_v2_ios_lane_preflight_test.mjs
  35/35 PASS
node --test scripts/qa-autonomy/ios-automation-contract-audit.test.mjs scripts/qa-autonomy/qa-ios-contract-scope.test.mjs
  9/9 PASS
node test/qa2_keep_opr_att_011_ui_role_guard_test.mjs
  82 UI guard checks PASS
node --test test/attendance_idempotency_regression_test.mjs
  1/1 PASS
node test/backend_auth_attendance_401_regression_test.mjs
  23 backend checks PASS
```

実装ファイル SHA-256（最後の契約改修後）：`3B935DB33D85B22D1D29DC712FEC3C7B94DC0CCDD690E5A715798D8821BD4057`。

**正式iOS QA追加PASS=0 / FAIL=0。5件とも現行台帳ではNOT_RUN。SOURCE実装とユニット検証を正式証拠に変換しない。**
