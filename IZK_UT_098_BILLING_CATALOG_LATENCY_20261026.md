# IZK-UT-098: Pro商品表示の遅延（2026-10-26）

## 観測と原因

- iPhoneユーザー録画 `ScreenRecording_10-26-2026 15-18-55_1.mp4`：管理画面からプラン比較画面への遷移が約1.9〜2.2秒、Pro月額・年額商品が出るのは動画内約3.2秒。画面描画後に**約1秒**、商品領域が無表示のままだった。
- `mobile-app/web/billing-native.js:start()` はOwnerトークン確認→課金Identity取得→RevenueCat SDK同一顧客ID確認→`getCustomerInfo()`→`getOfferings()`を直列で実行する。前半は購入の安全条件を満たすために必要だが、後半の2つは互いに独立した読み込み処理。
- `subscription.html` の商品領域は初期状態で空。読み込み中の文言がなかったため、通信が正常でも利用者には遅延・無反応に見えた。
- 録画だけでは各RPC/StoreKitの個別所要時間を計測できない。**実機での最大ボトルネックが特定できたと断言しない**。

## 修正（ローカルソースと配布資産）

1. Free Ownerの課金ID照合を完了した後のみ、`getCustomerInfo()`と`getOfferings()`を`Promise.all`で同時に開始し、両方がそろうまで商品と購入ボタンを出さない。既存Proは商品一覧を取得せず、契約管理だけ。Legacyは追加購入不可のまま。
2. `subscription.html`に表示直後から日英対応の「購入情報とストアの商品を確認しています…」を出し、判定結果（成功・拒否・通信エラーなど）を表示したら消す。`legal.css`で控えめな中立背景を指定。
3. `API.pageReady`が拒否した場合も読み込み無限継続にせず、ログイン状態の確認失敗を示す。`token`未取得時は購入不可。API/Webhook/D1/RevenueCat商品価格の仕様変更なし。

## 実行証拠

- `node --test test/izk_ut_085_billing_qa_activation_test.mjs test/izk_ut_084_pro_comparison_always_visible_test.mjs test/billing_native_sandbox_risk_test.mjs test/billing_sandbox_native_transport_test.mjs` 初回: **32 PASS／1 FAIL**。旧`084`テストfixtureが現行RevenueCat顧客ID/APIと契約管理導線を再現していなかった。Mockを安全仕様に合わせて修正。
- 再実行時の`085`ほか前回PASS項目は再度PASS。`084`の旧fixture修正後 `node --test test/izk_ut_084_pro_comparison_always_visible_test.mjs` → **7 PASS／0 FAIL**。旧FAILは解消。
- 最終一括再実行（上記4テストファイル） → **33 PASS／0 FAIL／exit0**。
- 新テストでは`getCustomerInfo`を意図的に保留し、その間に`getOfferings`が開始済みであること、購入ボタンが出ないこと、応答後に初めてボタンが出て読み込み表示が消えることをChromiumで確認。
- `npm run mobile:sync` → **exit0**。`node test/distribution_parity_test.mjs` → **PASS**、Native source→mobile-dist/iOS/Android各101ファイル一致、iOS/Android相互103ファイル一致。
- `node test/izk_project_test_pipeline_contract_test.mjs` → **PASS**（196ステップの登録契約だけを検査。196件実行したという意味ではない）。
- **新しい署名IPA/TestFlightでの実速度検証は未実施**。実機で何ms短縮したか未確定。

## 修正後ソースレビュー10観点

|ID|観点|検査・確認|
|---|---|---|
|S01|録画での発生位置|比較表は先に出るが商品は約1秒後に現れる|
|S02|通信依存の分解|`checkToken`→Owner Identity→SDKを先行維持|
|S03|独立readの並列化|customer/offeringのPromise.allを追加|
|S04|購入条件の不変性|Owner checkと認証SDK identityを削除しない|
|S05|価格データの真正性|価格/通貨はStoreKit商品に由来、ハードコードなし|
|S06|購入ボタンの時期|両read完了前は0件のテスト|
|S07|ログイン失敗時|失敗/トークン不在では購入操作へ進まない|
|S08|Pro既存契約|商品を再提示せず契約管理のまま|
|S09|旧Legacy|Pro相当権利を維持し新規購入ボタンなし|
|S10|UI/テスト|初期Loadingと終了後非表示をChromiumテスト|

## 横展開ソースレビュー10観点

|ID|対象|検査・確認|
|---|---|---|
|H01|iOS課金画面|同じbilling-native.jsがNative iOS資産へ反映|
|H02|Android課金画面|同じbilling-native.jsがNative Android資産へ反映|
|H03|日本語|日本語の中立ロード文を追加|
|H04|英語|英語の中立ロード文を追加|
|H05|Freeオーナー|verified customer/catalogの同時read、安全試験|
|H06|Proオーナー|StoreKit管理は残し商品は提示しない試験|
|H07|Legacy|不要な課金提案なし（084の実ブラウザ試験）|
|H08|一般スタッフ|Owner拒否時は課金Identity/購入不可試験|
|H09|通信・設定異常|空Offering、無効SDK key、失敗経路のfail-closed試験|
|H10|PWA/その他ページ|Native以外では購入不可を維持、全Native資産一致|

**完了条件の区分:** ソース修正・オフライン回帰・Native配布ファイル同期済み。新iOS/Android署名ビルド、TestFlight配布、実機速度の測定、正式QA台帳反映は未実施。購入そのものも実行しない。
