# IZK-UT-068 再発 — iOS画面遷移の半透明クロスフェード（2026-10-26）

## 入力証拠と差分原因

- 利用者提供のiPhone録画 `ScreenRecording_10-26-2026 14-50-19_1.mp4`（4.93秒、30fps）で、「管理 → 注文管理 → 管理 → 注文管理」を連続して切り替えると、新旧Documentが透過して重なる状態が複数回見える。10/24の『白い中間フレーム』とは異なる現象。
- 前回対策（`docs/IZK_UT_068_20261024_CROSS_DOCUMENT_FLASH_LOCAL_FIX.md`）でネイティブアプリの `@view-transition{navigation:auto}` を追加したが、通常の動き設定ではUA既定の約0.25秒クロスフェードを使い続けていた。`prefers-reduced-motion:reduce` だけに旧・新スナップショットの極短アニメーションを指定したため、通常設定のiPhoneでは重なりが生じる。
- 今回はNative共通の `mobile-app/web/config.js` でroot group・旧root・新rootのアニメーションを**常時** `none!important` とした。新Documentが準備できるまで旧rootを保持するためのopt-inは維持。認証、戻る、書込中の画面遷移ガード、Nativeの背景色、PWAには触れない。
- **適用判定の境界:** ソース回帰と配布用ファイル同期は実行済み。新しい署名IPA/TestFlightの配布およびiPhone実画面の再録画は未実施のため、iOS実機のちらつき解消は **PENDING**。

## 実行結果

- `node --test test/izk_ut_068_cross_document_flash_regression_test.mjs test/izk_ut_095_header_navigation_flicker_test.mjs test/izk_ut_079_native_zoom_lock_test.mjs` → **10 PASS / 0 FAIL**。実ブラウザの同一origin・別Document遷移、`pageswap` / `pagereveal` のViewTransition実在、遷移両側の3つの擬似要素の computed `animationName=none` を含む。
- `npm run mobile:sync` → **exit 0**（NativeのAndroid/iOS双方に同じ`mobile-app/web`ソースを複写）。
- `node test/distribution_parity_test.mjs` → **PASS**（native source→mobile-dist/iOS/Androidの各101ファイル一致、iOS↔Android 103ファイル一致）。
- `git diff --check -- mobile-app/web/config.js test/izk_ut_068_cross_document_flash_regression_test.mjs` → **exit 0**。

## ソース修正後レビュー10観点（実機PASSとは独立）

| 観点 | 確認結果 |
| --- | --- |
| S01 現象 | 4.93秒録画で新旧画面の半透明重なりを確認 |
| S02 旧対策との違い | 白い中間フレーム対策は旧root保持、今回の問題はUA既定クロスフェード |
| S03 直接原因 | `@view-transition` に通常設定用のanimation抑止が未指定だった |
| S04 影響箇所 | 共通config.jsのみを修正。個別ページ専用分岐なし |
| S05 旧root保持 | `navigation:auto`を残し、遷移実在をChromium fixtureで検証 |
| S06 root group | `::view-transition-group(root)` の動きも停止（computed style検査） |
| S07 旧・新snapshot | 両側`animationName=none`をChromium fixtureで検証 |
| S08 各人の動き設定 | 常時適用。reduce設定だけに依存しないソース条件を検査 |
| S09 オプトインと二重注入 | Native専用条件とID二重注入回避を維持（回帰テスト） |
| S10 既存ナビ・UI | 旧ヘッダー095・拡大079を含む10/10 PASS |

## 横展開レビュー10観点（ソース・配布確認）

| 観点 | 確認結果 |
| --- | --- |
| H01 管理→注文管理 | 同一origin HTML遷移なら共通CSSが作用。iPhone再検証PENDING |
| H02 注文管理→管理 | 逆方向も両端config読み込み対象。iPhone再検証PENDING |
| H03 管理→メニュー編集 | 別HTMLも同じconfig；端末表示PENDING |
| H04 管理→設定など | 全44 HTML画面の共通config条件を回帰テストで走査 |
| H05 旧alias | `drink_inv.html` の単純リダイレクト扱いを維持 |
| H06 iOS資産 | Native source/iOSの101ファイル一致、実機PENDING |
| H07 Android資産 | Native source/Androidの101ファイル一致、実機PENDING |
| H08 iOS・Android間 | 103ファイル一致、個別OS専用CSS追加なし |
| H09 Web/PWA | Web fixtureの共通style未注入を検査、既存公開Webソース無変更 |
| H10 認証/ヘッダー/ズーム | 095・079回帰を併走、戻るやmutation guardのコード変更なし |

## 次に必要な確認

- iOSは新規署名版のビルド・TestFlight配信後、同じ「管理 ↔ 注文管理」を反復操作し、30fps以上で『白/黒中間フレームなし・半透明の重なりなし』を確認する。Androidも対象だが、このiPhone録画をAndroidの正式判定には使わない。
- CSS View Transitionに未対応の古いWKWebView/Android WebViewではこのルールを解釈しない。対応外エンジンの解消は未保証。
