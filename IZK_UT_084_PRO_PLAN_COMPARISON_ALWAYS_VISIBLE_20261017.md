# IZK-UT-084｜Pro版比較導線の常時表示・課金受付準備中の案内

**2026-10-17／ユーザー明示依頼**：「Pro版の正式公開前でもプラン比較画面は常時表示、購入機能は準備完了まで無効、Pro版は準備中と案内」へ変更。**状態：LOCAL SOURCE IMPLEMENTED / WAIT_TEST**。Native iOS/Android管理ホームのUIのみを主対象とし、既存Web本番/TESTやサーバー権限・課金Webhooksは変更しない。

## 旧仕様の問題・新仕様

- 旧 `mobile-app/web/config.js` は安全のため `BILLING_AVAILABLE:false`。しかし同じフラグで管理メニュー `subscription.html` のタイル、Freeの比較バナー、設定ページの比較リンクまで非表示にしていたため、Proの存在や機能差を見つけにくかった。
- **新仕様**：購入フラグは**falseを維持**。Nativeログイン済みユーザーの役割・現在プランに関係なく、下部 `••• その他` → `システム` → `Free／Pro プラン比較` を表示。Free利用者には比較バナー、Freeの設定画面にも比較リンクと「Pro版の購入は準備中」を表示。設定変更ができない一般スタッフでもプラン比較は閲覧可能とする。
- `subscription.html` の冒頭にJA/ENの常時可視「購入受付準備中」案内を追加。**初月無料案内・購入商品・購入/復元ボタンはフラグOFF時に非表示**。比較表は常時表示するが、勝手に課金・自動Pro変更はしない。料金や製品は架空の数値を追加せず、既存の比較表を維持する。
- `BILLING_AVAILABLE:true` へ将来切替えた場合の既存正式SDK/Webhook仕様は維持。Pro/legacyアカウントへの有効期限・既存ユーザー特典チェックを廃止しない。

## 変更した実装

1. `mobile-app/web/index.html`・同一Native入口 `manage.html`：`visibleTile()` の課金OFFによる比較タイル除外を削除し、Freeバナーを購入フラグに関係なく表示。購入OFFの時はタイルを「Free／Pro プラン比較」「Pro版の購入は準備中」に明示変更。Free以外のバナーと、FreeでPro専用業務タイルを表示しない既存ルールは継続。
2. `mobile-app/web/settings.html`：Free利用者の比較案内を購入OFFでも表示し、購入が準備中であることを併記。ロイヤリティ・定期レポートのFreeプラン非表示は従来どおり。
3. `mobile-app/web/subscription.html`：準備中メッセージを表の前に表示。初月無料・購入復元アクションをHTML初期描画から不可視とし、ネットワーク遅延・未ログインでも誤表示を防ぐ。
4. `mobile-app/web/billing-native.js`：課金停止時は料金・RevenueCat取得を呼ばず、比較案内のみ。購入と復元の入口を独立して `BILLING_AVAILABLE` で再チェックし、操作がたまたま発火してもNative課金画面へ進まない。正式課金が有効な将来はサーバーで対象が確認された後に商品表示。旧Pro/legacyには初月無料案内・購入をちらつかせない。
5. `mobile-app/web/api.js`：`subscription.html` へのページ権限を「店舗設定settings」から**ログイン済みであれば誰でも閲覧できる情報ページ**（`__authenticated_info__`）へ変更。ページ境界ではtokenを `checkToken` で確認し、スタッフのsettings/他画面の権限・アカウント削除には昇格させない。Pro機能エラー時の「プランを見る」も購入OFFで表示し、比較へ誘導する。
6. `mobile-app/web/sw.js`：Native以前のService Workerキャッシュ混在を防ぐ版更新（v313→v314）。Capacitor Nativeは既存方針どおりService Workerを無効化する。Web本番/TESTへのデプロイはしない。

## 10回自己レビュー（異なる検証入口の実施結果）

| No. | コード・検証手段と結果 |
|---|---|
| S01 | Native `config.js` の `BILLING_AVAILABLE:false` が変更されていないことを実ファイル読戻しで検査：PASS |
| S02 | `visibleTile()` が非owner・設定権限なし・簡易モードONでも `subscription.html` を返すことを実ソース抽出VMで検証：PASS |
| S03 | Free/Pro/legacy × 日英 × 簡易/全機能 × Native2入口をレンダラーVMで実行し、常時比較タイルがありFreeのみバナーがあることを照合：PASS |
| S04 | 既存Pro業務機能のFree側機能ゲート条件 `PRO_TILE_URLS` が意図せず開放されないことをソース・VMで検証：PASS |
| S05 | 課金OFF時の `subscription.html` の「準備中」表示と購入・復元・初月無料の非表示を実Chromiumで確認：PASS |
| S06 | Chromium実行時にNative Purchasesモックのconfigure/purchase/restoreとサーバーgetBillingIdentityが**0回**であることを測定：PASS |
| S07 | ユーザー操作なしに購入が始まる経路を `purchase()`／`restore()` の冒頭ガード、HTML初期状態で独立検査：PASS |
| S08 | 通常スタッフのsettings=falseでも閲覧可、settings.htmlは拒否、tokenなしは拒否を実権限ガード抽出VMで検証：PASS |
| S09 | `BILLING_AVAILABLE:true` の将来経路でもserver verified pro/legacyが購入画面・トライアル表示を受け取らないことを実Chromiumで検証：PASS |
| S10 | Native `index.html`/`manage.html` SHA一致、JS syntax/Git whitespace、専用7/7・課金連携27/27・既存permission guard回帰PASS：PASS。実機は別途PENDING |

## 10回横展開レビュー（別画面・別境界）

| No. | 対象と実証結果 |
|---|---|
| H01 | Native iPhone相当320/360/390 CSS幅で比較表と準備中表示をChromeレイアウト検証：PASS browser（実iPhoneはPENDING） |
| H02 | Native Android相当430 CSS幅・横向き800 CSS幅で比較表・横はみ出しなし：PASS browser（RealmeはPENDING） |
| H03 | Native `index.html` 管理メニューの「その他→システム」＋シンプルホーム状態で比較タイルあり：PASS VM |
| H04 | Native `manage.html` 独立URLも同じ結果・2HTMLのバイト一致：PASS VM |
| H05 | Native `settings.html` Free限定で比較案内、Pro/legacyの設定は従来どおり、他Pro機能のFreeゲート維持：PASS source/VM |
| H06 | Pro限定業務ページ共通 `api.js` の誘導バナーは購入OFFでもプラン比較へ遷移可、settings権限は移譲しない：PASS source/guard |
| H07 | Native `subscription.html` 日英表示と各幅レイアウト・比較表の行数・無料試用非表示をChromiumで検査：PASS |
| H08 | RevenueCatネイティブSDKとサーバーwebhook/entitlement計算は変更せず、BILLING_AVAILABLE:falseで購入操作不達を実モック計測：PASS |
| H09 | 本番Web `docs/yuwaku` とTEST `docs/yuwaku/test` について今回は仕様変更・配布を実施せず、Native専用管理メニューと混同しない：PASS scope |
| H10 | 既存ログイン・bfcache画面境界のpermission guard回帰PASS。Android/iOS正式831件のcase stateは閲覧のみ、ソース修正だけでPASSへ更新しない：PASS offline/physical PENDING |

## 実行した回帰と既知の別失敗

- `node --test test/izk_ut_084_pro_comparison_always_visible_test.mjs`：**7/7 PASS**（Nativeレンダラー/権限ガード実関数/Chromium10条件＋pro/legacy状態）。
- `node test/subscription_integration_test.mjs`：**27/27 PASS**、無料／有料認可・RevenueCat連携の既存回帰含む。
- `node test/permission_route_guard_regression_test.mjs`：**PASS**。
- `node test/mobile_navigation_test.mjs`：本件変更箇所に関する「Freeでも比較表示」「設定案内」等のチェックはPASSするが、**別件Commission rule validatorの既存固定文字列検査で最終exit1**。全体PASSとは記載しない。
- `node test/local_smoke_test.mjs`：既存Web/TEST Service Worker `v282` 固定期待（現行Web側はv284）で本件箇所到達前に失敗。これも本件のパス変更によるFAILではない。
- 実Android/iOS端末に新バイナリを入れて比較画面・実プラン・ログアウトや画面復帰を確認する正式QAは未実施。本番課金を有効化することも、価格や課金契約を新設することもしない。今回 **Git commit/push、ビルド/デプロイ、ストア提出、正式QA stateへの書込みなし**。
