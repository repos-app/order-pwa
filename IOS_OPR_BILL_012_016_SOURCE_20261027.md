# iOS OPR-BILL-012〜016 SOURCE契約（2026-10-27 PHT）

831件正本 `.qa-v2-official/manifest.json` の5件を照合した。`test/plans/qa-v2-ios-source/operation-integrity-cases.json` に期待状態、障害注入境界、所有fixtureのcleanupを定義し、既存 `scripts/qa-autonomy/ios-business-integrity-family.mjs` に共通checkout recovery要件・独立business-effect検証・owned cleanupを追加した。個別ケース/グループのJS driver、publisher、登録helperは新設していない。

| Case | 独立証拠で確定する条件 | 未成立の実機前提 |
| --- | --- | --- |
| BILL-012 | commit前通信断、receipt/effect 0、重複0 | commit境界前の通信遮断実測とD1読戻し |
| BILL-013 | commit済み応答喪失、receipt/effect 1、再会計拒否 | 実commit観測、応答遮断、拒否UI/API証拠 |
| BILL-014 | 応答受信後描画前kill、receipt/effect 1、自動再送0 | iOS kill/relaunchと描画境界・通信追跡 |
| BILL-015 | 結果不明時のReceipts照合で状態確定、最大1件 | iPhone Receipts画面と独立D1同一注文照合 |
| BILL-016 | 全active order部分会計後に残order 0、金額とfull checkoutが一致 | 所有注文群の部分会計入力、金額/全注文明細の独立照合 |

共通読戻しは `caseId/storeId=teat/fixtureId/orderId/claimId` の所有範囲、独立readId、同一DB identity、開始時receipt/effect 0、後のreceipt/effect一致、重複課金0を検証する。独立HID/network timelineには障害の発生点または部分会計、領収書照合を要求。cleanupはcase-owned行だけを操作し、領収書・監査ログ・他店舗を保全した別読戻しを要求する。実機のビルド・claim・USB接続・HID/DDI・障害注入・独立D1 Oracleは未取得のため `executableWithCurrentBridge=false` とする。

回帰: `node --test scripts/qa-autonomy/ios-business-integrity-family.test.mjs scripts/qa-autonomy/hourly-cross-os-audit.test.mjs` = **20 PASS / 0 FAIL、exit 0**。`git diff --check` 対象JSファイル exit 0。正本Manifest、正式runner/state、D1、TestFlight、実機、commit/push/deployは操作していない。**正式PASS増加0件**。

ソース確認観点: Manifest action/expected、fixture lease、store ownership、before/after read identity、receipt/effect等価、duplicate、障害発生位置、再会計拒否、再起動replay、部分会計の完済。横展開確認対象: 既存checkout race共通層、BCP/REF共通層、claimed iOS bridge、HID、DDI、独立D1 Oracle、Android同型会計、Receipts表示、print/audit保全、既存iOS監査gate。いずれもSOURCE確認であり、正式実機QA検証完了を意味しない。
