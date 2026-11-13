# 注文確認画面｜サービス料の会計見込み表示（2026-11-07）

## 目的と完了条件

- 注文登録額には従来どおりサービス料を含めず、注文確認ダイアログに会計見込み額を別表示する。
- サービス料率が0%なら未設定として扱い、サービス料の表示および見込み額の専用見出しを出さない。
- 内税／外税、VAT、クーポン、ポイント、日英の表示を維持し、会計時の二重加算を防ぐ。
- Native / Web production / Web test / 公開注文画面への横展開と、既存テストパイプラインへの登録を確認する。

## 実装内容

- 対象: `mobile-app/web/app.js`, `docs/yuwaku/app.js`, `docs/yuwaku/test/app.js`, `docs/public/order-app.js`。
- 既存 `payBreakdown()` を使う `orderCheckoutEstimate()` を追加。クーポン控除後の品目小計にサービス料・VATを計算し、ポイント控除後の見込み額を表示する。
- `send()` から `UIConfirm` に見込みサービス料と見込み合計を表示。0%では両方とも従来の表示形式を維持する。
- 日本語・英語とも、サービス料率を表示する。VATの内税表示は追加請求と誤認させないまま維持。
- `order.totalPrice` と `doSubmit()` を変更していない。サービス料の確定は既存 `src/billing.js::breakdownAmounts()` が担当する。
- 将来の入場料・延長料や会計時割引などの変動があるため、表示上は「見込み」と明示している。

## 代表期待値

| ケース | 品目小計 | サービス料 | VAT表示 | 会計見込み合計 |
| --- | ---: | ---: | ---: | ---: |
| サービス10%外付け、VAT12%内税 | ₱12,000.00 | +₱1,200.00 | うち₱1,285.71 | ₱13,200.00 |
| サービス0%、VAT12%内税 | ₱12,000.00 | 非表示 | うち₱1,285.71 | 従来の「合計」₱12,000.00 |
| サービス10%内包、VAT12%内税 | ₱12,000.00 | うち₱1,090.91 | うち₱1,285.71 | ₱12,000.00 |
| サービス10%外付け、VAT12%外税 | ₱12,000.00 | +₱1,200.00 | +₱1,584.00 | ₱14,784.00 |
| クーポン₱1,200＋ポイント₱300、サービス10%外付け | ₱12,000.00 | +₱1,080.00 | うち₱1,157.14 | ₱11,580.00 |

## 検証証拠（SOURCE/オフライン、正式QAとは別）

1. `node test/order_confirmation_checkout_preview_test.mjs` → **24件PASS / 0 FAIL**。4配布面それぞれで実際の `send()` から確認文面を生成し、金額・0%非表示・日英・送信payload不変を判定。テストは `test/project-test-commands.json` に追加。
2. `node test/order_status_totals_test.mjs` → **8件PASS / 0 FAIL**。既存の会計見込み・バックエンド計算・本番/テスト一致を確認。
3. `node test/regional_settings_test.mjs` → **18件PASS / 0 FAIL**。端数処理・通貨・レシートなどを回帰確認。
4. `node scripts/ci/critical-ui-preservation-gate.mjs` → PASS。共通ヘッダー等の既存操作を保全。
5. `node test/order_submit_offline_boundary_test.mjs` → PASS。オフライン/エラー境界を回帰確認。
6. `node scripts/izk-all-frontend-js-audit.mjs --write` および通常監査 → **71/71 JavaScript構文PASS**。ソースハッシュ台帳を現状へ再生成。
7. `node --check docs/public/order-app.js`、`node --check test/order_confirmation_checkout_preview_test.mjs`、`git diff --check` → exit 0。

## 横展開の確認・制約

- native, Web production, Web test, public orderの4箇所で既存 `send()` の表示分岐を更新した。Web productionとtestはバイト一致を確認。
- 設定読込・計算は既存の店別`serviceRate/serviceInclusive/taxRate/taxInclusive`を利用。Workerの会計計算、DB、レシートは変更なし。
- VATを含む表示のほか、クーポン・ポイント・オフライン注文の既存経路を確認。ローカル回帰テストは正式実機QA PASSを意味しない。
- **共有ワークスペースの並行作業によるGit反映**: ソース修正、テスト、パイプライン登録は `f463ba6b26d39fe64f33fe138d9c1629ff86c59f` に含まれる。2026-11-07 23:59 PHT以降、`git ls-remote origin refs/heads/main` でも同SHAを確認。本作業としてcommit/push操作は行っていない。
- **未実施/未確認**: Web/Worker本番反映、iOS/Androidビルド・配布、物理端末での正式QA。正式QA増分0。
- 他作業の未コミット変更には手を加えず、既存資産を利用した。
