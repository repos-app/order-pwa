# IZK-UT-102 — Pro購入確認画面の開始応答が見えない（2026-10-26）

## 入力証拠・原因

- iPhone画面録画 `ScreenRecording_10-26-2026 15-42-18_1.mp4`（約5.2秒・30fps）。購入画面を開いた状態で、赤い「購入を完了できませんでした。」が表示されたまま、AppleのIn-App Purchaseシートが後半になって初めて現れる。処理中の表示が見えず、利用者が何度も購入ボタンを押したと報告。
- 前回のIZK-UT-098は**商品一覧が表示されるまで**の遅延であり、今回は**購入ボタンを押してからOSの確認シートが開くまで**の別問題。既存 `billing-native.js` は `revalidateOwnerIdentity(true)`（Owner確認→Billing Identity再取得→RevenueCat顧客ID確認）と新鮮な `getOfferings()` を順次待ってから `purchasePackage()` を呼ぶ。Apple／Googleのネイティブ画面起動時間も加算される。
- 実際の録画だけでネットワーク/SDK/StoreKitそれぞれの所要時間は測れない。セキュリティ上必要なOwner・Store・商品再照合の省略はしない。
- 旧コードは操作直後に押下したボタンのみ`disabled=true`にするが、視覚的な進行表示も以前の失敗メッセージの消去もなく、別プランや購入復元は見かけ上操作可能だった。`billingBusy`ガードにより同一ページ内での二重native呼出しは既に防御されていたが、UIはその状態を伝えていなかった。

## 実装修正

- 共通の `billing-native.js`：購入を受け付けた**同期タイミングで**灰色の進行状態と「再度押す必要はありません」を出す。以前のエラーを消す。選択した購入ボタンは「購入確認を準備中…」に変更。
- 月額／年額の**全購入ボタンと復元／契約管理ボタン**を待機中は無効化。言語切替による商品再描画でもビジー状態を維持。複数回押してもNative `purchasePackage`へ1回しか進まない。
- Owner・SDK本人確認、直前のOffering更新後は「Apple／Googleの購入確認画面を呼び出しています」と表示。シートから応答後は「サーバーで確認中」を示す。購入成功・キャンセル・失敗後は全ボタンとメッセージを戻す。OSシートが開いたことと購入完了を混同しない。
- `subscription.html`の状態表示を `role=status aria-live=polite` に変更、`legal.css`へ共通のニュートラルな進行表示とdisabled視覚効果を追加。
- 設定・課金ID/API/Webhook/実際の課金動作・本番テナントデータには変更なし。購入試行・課金は実行していない。

## 検証証拠（ソースレベル）

- `test/izk_ut_085_billing_qa_activation_test.mjs` にiOS/AndroidのOwner認証を保留するシナリオを追加。押下直後の進行メッセージ、旧エラー消去、全プランのdisabled、別ボタンの疑似連打中に `purchasePackage` 0件、再開後ちょうど1件を検査。
- ネイティブ購入シートを保留して連打し、単一呼出し・中止応答後のボタン復帰を確認するシナリオを追加。購入はSDKモックのみ。
- 最初の総合テストでは検証fixtureが購入後の**別のOwner再照会まで誤って保留**し1件タイムアウト。fixtureの待機を2回目の認証照会に限定して別原因を修正。新規2件の再実行 **2/2 PASS**。
- 総合回帰 `node --test test/izk_ut_085_billing_qa_activation_test.mjs test/izk_ut_084_pro_comparison_always_visible_test.mjs test/billing_native_sandbox_risk_test.mjs test/billing_sandbox_native_transport_test.mjs` → **35 PASS／0 FAIL／exit0**（最終実行）。正式実機QA判定ではなく、モック・Chromium・ソース回帰である。
- 新規TestFlight版での物理端末検証とAppleの実際の確認シート起動時間測定は未実施。Native画面の表示速度そのものの短縮は未確認。

## 修正後レビュー10観点

|ID|対象|確認|
|---|---|---|
|S01|事象の区別|商品ロードIZK-UT-098と今回の購入押下後の無反応を区分|
|S02|録画|以前の赤いエラーが残り、新しいシートが遅れて出る経過を確認|
|S03|必須ゲート|Owner、店舗、RevenueCat ID、商品再取得を維持|
|S04|操作即時応答|認証Promiseを保留しても進行メッセージを表示|
|S05|二重購入|`billingBusy`の受付時同期確定を維持、疑似連打中のnative呼出しを抑止|
|S06|プラン選択|月額／年額両方を無効化|
|S07|復元・契約管理|Native購入中は代替操作も無効化|
|S08|旧エラー|購入再試行直後に古い失敗文面を置換|
|S09|OSシート|ネイティブ呼出し中は『呼び出しています』と表現し確定購入を偽装しない|
|S10|終了経路|キャンセル・完了後にボタンの通常ラベル/disabledを復帰|

## 横展開レビュー10観点（実機実行件数ではない）

|ID|対象|確認|
|---|---|---|
|H01|iOS Native|共有billing-native.jsでiOSモック検証|
|H02|Android Native|同じ関数のAndroidモック検証|
|H03|日本語|即時確認・不要な連打抑止文面あり|
|H04|英語|同等の英語文面あり|
|H05|月額|選択後ボタンが一時的に無効化|
|H06|年額|別プランも一時的に無効化|
|H07|言語切替|再描画時もbusy状態を再適用する共通関数|
|H08|Restore|購入中の復元不能・終了時のrestoreReadyに従う復帰|
|H09|Owner/SDK異常|既存失敗経路はfail-closed・支払シートを起動しない|
|H10|既存Pro/Legacy/Web|既存の購入権限・プラン管理分岐を変更しない|

## 完了判定

- ソース修正・自動回帰・Native asset同期・commit/pushと、**実際のTestFlight配信・実機確認**は分けて判定する。後者が実施されるまでiOS実機の問題解消は未確認。
