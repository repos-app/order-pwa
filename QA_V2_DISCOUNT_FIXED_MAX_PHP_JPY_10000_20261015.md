# 固定額割引上限：PHP/JPY各10,000 — 実装・QA引継ぎ（2026-10-15）

## 製品オーナーの指示

**2026-10-15：PHPの固定額割引上限は₱10,000、日本円JPYの上限は¥10,000**。異なる通貨間の換算・相場参照はしない。元QA0344の「固定額 max=仕様値」にこの実在する値を結びつけ、推定・無断仮置きを禁止する。

| 店舗の保存通貨 | 固定額の許容範囲 | 境界超過の拒否 | 割合割引 |
|---|---|---|---|
| PHP | 0.01–10,000.00 | 10,000.01 は拒否 | 0.01–100% |
| JPY | 1–10,000 **整数のみ** | 10,001、および小数金額を拒否 | 0.01–100% |
| その他の保存通貨 | 今回上限は未指定、既存仕様維持 | 10,000を一律適用しない | 0.01–100% |

保存済み `currencyCode` がある店舗はその通貨を優先。古いPH/JP店舗で通貨設定が欠落した場合に限り、**保存済み `countryCode` PH→PHP / JP→JPY** で算出。両方欠けた店舗では通貨特定不能で新上限を保証しないため、後続の移行作業で別途設定を確認する。

## ソース変更と独立確認

- `src/discountRules.js`: `normalizeDiscountRule(input,settings)` が共有する `discountValueLimits(settings)` で保存時に固定額上限・JPY整数・割合100%を検証。`saveDiscountRule` は指定 `store_id` の地域設定2キーを1クエリで取得。会計用 `calculateRuleDiscount` は**既存ルールを再度検証**するため、後から通貨が変更されて既存固定額が上限超過した場合も利用できない。
- `src/billing.js`: 古い超過ルールを利用しようとした場合、受付中のAPIは `invalid_discount_fixed_max` 等の型付きエラーを返し、レシート等の更新前に終了。予期しないエラーだけ通常の例外ルートへ送る。
- `src/gasApi.js`: settingsページ権限で `getDiscountValueLimits` の**認証済み読み取り専用RPC**を提供。これは保存・会計の正規化と同一モジュールから実効上限を返す。未配信Workerから同結果を得たことにするのは禁止。
- `mobile-app/web/settings.html`: 保存済み通貨から動的 `max` / `min` / `step` を再計算。PHP/JPYの固定額max10000、JPY固定はmin1/step1、それ以外の金額はmin0.01/step any、率はmax100。保存ボタンも超過とJPY小数を日本語/英語で拒否。
- `docs/yuwaku/settings.html` と `docs/yuwaku/test/settings.html`: ブラウザー版にも同じ動作を横展開。編集・新規・初期読込・地域保存更新、PH/JP旧店舗の通貨フォールバックまで検査。
- `test/plans/qa-v2-realme-unattended-approved/QA2-KEEP-PT-INP-0344.fixed-max-policy.json`: ユーザー承認済みPHP1000000センタボ、JPY10000整数、製品仕様由来証跡。SHAが別のQA親/個別ケースと一致しない場合、0344は実機変更前に停止。
- `scripts/qa-v2-realme-0344-backend-readiness.mjs`: signed `teat` の `getDiscountValueLimits` を**読み取り専用**で確認し、ソース上の判断だけで「配信済み」と認めない。現時点で未配信のため `QA_FIXTURE_WEBVIEW_EVAL_FAILED`、読取り認証/ソースチェックの両方を条件にする。
- `scripts/qa-v2-realme-unattended-pilot.mjs`: `--plan` でも実機上のAPKバージョン/ハッシュを照合。910019をまだ入れていないRealmeで新版計画が誤ってREADYになる不具合を修正済み。

## 隔離QA APK 910019

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-qa-android-latest-local.ps1 -VersionCode 910019 -OutputName izakanpai-qa-v910019-discount-max.apk`

**BUILD SUCCESSFUL**。`build-qa-android-latest-local.ps1` は一時AndroidコピーにQA専用applicationIdを設定し、出力がある場合の上書きを拒否。ソース100件SHA整合が100/100、ビルド後ドリフト0。

| 検証項目 | 結果 |
|---|---|
| QA APK | `.android-qa-autopilot/izakanpai-qa-v910019-discount-max.apk` |
| Android package/version | `com.izakanpai.commissionpos.uitest` / `910019` |
| APK SHA256 | `aa5b0d1345f6b69e3eb47c15dbd56adad71ba2f5105aa07311a26719ddb77d1f` |
| 同一QA署名の証明書SHA | `8951f0c50757cff72c36a1026faa3948da5bb81c38766bfbeffcdefca9cef8be` |
| 埋込み settings.html SHA256 | `86eff0cb14a17a66e07d71371ac4ddee564e90138f0baa8377799517fc2cc3f0` |
| immutable pin SHA256 | `036d89c7b578e83c2488af666641c3b4d17fc18e0c9e83e7d4c9a4682d10784d` |
| 親/レシピのソース承認 | `test/plans/qa-v2-realme-unattended-approved/reviewed-two-0344-0363-910019.approval.json`（承認済、**配信・実機PASSではない**） |

**910019はRealme実機へまだインストールしていない。** 現在Realmeには910018が入っており、0344/0363の正式判定を追加せず。910019親バッチ `--plan` は独立APK不一致を検出し、`QA_PREFLIGHT_NOT_READY_QA_INSTALLED_APK_SHA256_MISMATCH`。910018の0363単独親バッチは引き続き `REVIEWED_BATCH_READY`。

## テスト・自己レビュー10観点

1. PHP 10000ちょうど / 10000.01の境界 — source PASS。
2. JPY 10000ちょうど / 10001 / 小数、HTML `min=1,step=1`の刻み幅 — source PASS。
3. 割合 100 / 100.01 と最小0.01 — source PASS。
4. 不正文字・0・負数・空欄・NaN/Infinity — source PASS。
5. `currencyCode`優先、古いPH/JPからの安全なフォールバック — source PASS。
6. USD/SGD等の未指定通貨に勝手な上限を追加しない — source PASS。
7. DB側の`store_id`分離と書込み前の拒否 — source PASS。
8. 既存超過ルールを会計処理で再拒否・受け付けエラー処理 — source PASS（実Worker検証は未実施）。
9. QA APK署名・実体SHA・版番号・入力ソース100件を凍結照合 — PASS。
10. 新バージョン承認/公式QA記録の保全、誤READY防止 — source/readonly PASS。

## 横展開10観点

1. モバイル設定画面：保存・編集・新規・通貨切替後上限再計算。
2. ブラウザー設定画面：`docs/yuwaku`、`docs/yuwaku/test`一致。
3. API保存：割引率/固定額・店舗通貨を使用。
4. 会計：保存済み旧ルール・通貨変更時に同じ上限を再検証。
5. レシート：超過利用を先に拒否し、一部会計完了・誤印字しない。
6. 商品仕様：PHP/JPY個別値をレビュー済みデータで記録。
7. QA 0344：上限仕様ポリシーSHA・依存モジュールSHA・従来の実機rollbackを維持。
8. QA 0363：独立した910018 QRバッチを維持し、今回の0344仕様変更でブロックしない。
9. Androidビルド：新910019を分離し、既存910018を上書きしない。
10. 親ランナー：実機APK SHAを`--plan`と`--run`双方で厳格照合。

## 残る最終作業／許可境界

**未実施**：Worker `izakanpai-api-teat` への配信、ライブ `getDiscountValueLimits` 応答の独立証明、旧値のサーバー拒否テスト、QA910019の実機切替、0344正式Nativeテスト。`qa-v2-realme-0344-direct.mjs` は独立Backend拒否証明がない限りNative mutation前にfail-closed。後続の配信に伴う本番影響を別途レビューしてから操作する。

公式Android QA：`PASS297 / FAIL47 / BLOCKED2 / NOT_RUN485 / RUNNING0`。既存証拠・iOS/Emulator停止設定を保全。**Git commit/push、Worker deploy、本番ストア提出なし。**
