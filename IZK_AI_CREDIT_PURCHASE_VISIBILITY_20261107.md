# izakanpai AIクレジット購入欄が空白になる問題（2026-11-07）

## 判定と完了条件

- 申告: iPhoneの「プランとお支払い」→「AIクレジット」に説明と残高更新ボタンだけがあり、30/100/300ポイントの購入導線がない（Yuwaku Bar Owner）。
- **原因確定（SOURCE）**: `mobile-app/web/legal.css` の `.status{display:none}` に対し、`mobile-app/web/billing-native.js` の購入可能／購入不可の商品行がともに `className='status'` を設定。`#aiCreditWallet` と `#aiCreditStatus` も同じ非表示クラス。Pro商品の表示行だけは `style.display='block'` を使っていたため症状が異なった。
- 修正: 商品行は専用の `ai-credit-pack` に変更して常時可視化。残高・警告は専用CSSで可視化。セッション照合より前に既知の3パックを**購入不可状態で**表示し、認証エラー時も理由を明示する。
- 成功条件: 本来購入可能なオーナーにはストア価格の3商品・購入ボタンが表示され、失敗状態でも空白にならず、3商品の購入ボタンは無効のまま理由が表示される。これらはローカルの疑似Native実行で確認。実際のApple StoreKit・Webhook・iPhone表示は未検証。

## 変更と安全境界

| ソース | 修正 |
|---|---|
| `mobile-app/web/billing-native.js` | 2つの商品生成分岐の行class変更、セッション事前検証中・失敗時の安全な商品表示 |
| `mobile-app/web/legal.css` | AIウォレット／商品／通知だけに限定したCSS（旧`.status`は維持） |
| `test/ai_credit_wallet_ui_test.mjs` | CSS回帰契約と実JavaScriptのDOM/RevenueCatモックテストを追加 |
| `test/auto-ci/ai-credit-wallet-display.test.mjs` | 既存のCI自動発見テストへ上記の専用テストを登録 |

決済商品IDは既存の `izakanpai.ai.credits.30`, `.100`, `.300`、価格はApple/Googleの `priceString` を使用。オーナー・店舗・署名付きサーバー購入台帳・RevenueCat `ai_credits` Offering確認や購入結果不確定時の再購入防止は変更していない。無効な商品を購入可能にする修正ではない。API・Worker・D1・本番データの変更なし。

## レビュー記録（ソース観点、実機QAと別）

| ID | 独立観点・確認した根拠 | 結果 |
|---|---|---|
| S01 | スクリーンショットとHTML: `subscription.html` #aiCreditProductsの空白構造 | 根因整合 |
| S02 | CSS: `legal.css` の `.status{display:none}` とProの `.status.ok/err` | 根因確定 |
| S03 | 正常商品生成: `billing-native.js` の `creditPackages.forEach` と専用class | 修正 |
| S04 | 非正常商品生成: `showUnavailableCreditPacks` の無効ボタンと専用class | 修正 |
| S05 | 残高UI: `#aiCreditWallet` と `refreshCreditBalance` の応答表示 | 修正 |
| S06 | エラーUI: `#aiCreditStatus:not(:empty)` と `creditStatus()` | 修正 |
| S07 | 起動エラー: `API.pageReady` 失敗前に3商品を無効表示 | 修正・DOMテスト |
| S08 | 権限: checkToken/accountOwner / billing SDK identity によるfail closed | 変更なし・DOM負例 |
| S09 | 価格と二重購入: Offering/SKU/receipt/pending 状態を保全 | 変更なし・専用既存テスト |
| S10 | 変更差分・JavaScript構文・CSSセレクタの限定範囲 | `git diff --check`, `node --check` PASS |
| H01 | iOS: Native Capacitor用 `subscription.html` → `billing-native.js` → `legal.css` | 同じ修正対象 |
| H02 | Android: iOSと共通のNative Web assetsを利用する導線 | 同じ修正対象 |
| H03 | Web production: `docs/yuwaku` に当該Native購入画面/JSはない | 非適用 |
| H04 | Web TEST: `docs/yuwaku/test` に当該Native購入画面/JSはない | 非適用 |
| H05 | 同じ `.status` を使用するPro商品行は `style.display='block'` のまま | 既存機能維持 |
| H06 | ウォレットAPI `getAiCreditWallet` と `purchaseReceipts.bySku` の参照 | 変更なし |
| H07 | D1 ledger/RevenueCat Webhookの付与経路 | 画面表示限定・変更なし |
| H08 | 日本語・英語: 3商品とメッセージの `en()` 分岐、通貨はストア文字列 | 変更なし |
| H09 | 共通ヘッダー・AI残高バッジ・復元/契約管理UIの保存 | UI保護ゲートPASS |
| H10 | 旧 class の逆引き: 決済商品用の `.status` 行は2か所除去、Pro行は意図的に残存 | 修正確認 |

## 検証状態

- 修正前 `node --test test/ai_credit_wallet_ui_test.mjs` は新規表示回帰が **1 FAIL**（元コードで非表示classが残存）。
- 修正後、同ファイル **10 PASS / 0 FAIL**、再利用した自動CI入口も **10 PASS / 0 FAIL**。
- 最終差分でNative課金・オーナー・既存ヘッダー等7ファイル横断を再実行し **59 PASS / 0 FAIL**、exit 0（`node --test test/ai_credit_wallet_ui_test.mjs test/ai_credit_purchase_recovery_test.mjs test/ai_credit_hub_ui_test.mjs test/billing_native_sandbox_risk_test.mjs test/izk_ut_085_billing_qa_activation_test.mjs test/qa_billing_owner_wiring_preflight_test.mjs test/critical_ui_preservation_gate_test.mjs`）。
- `node scripts/ci/critical-ui-preservation-gate.mjs` PASS、JS構文PASS、`git diff --check` PASS。
- **未実施**: iOS/Android新ビルド、配布、実機での表示/タップ、Apple Sandbox消耗型購入・RevenueCat署名済Webhook/D1増分の照合。公式QA PASS増分0。commit/push/Worker deployも未実施。
- 別担当の `docs/qa-modernization/` と `scripts/qa-modernization/` などの未追跡作業には一切触れていない。

## リリース上の注意

NativeアプリはCapacitorのローカルアセットを同梱するため、ソース修正だけでは現在インストール済みのiPhoneに反映されない。ビルド・TestFlight配布は別途の明示指示が必要。反映後も販売可能であるには、オーナー認証、サーバーの購入台帳、RevenueCat OfferingとApp Storeの商品公開が有効であることの実機確認が必要。
