# IZK-UT-068 / IZK-UT-099 / IZK-UT-084 再発: 画面重なりと管理ホームの後着カード (2026-10-28)

## 対象・再発証拠・完了条件

- ユーザー提供 iPhone 録画 `ScreenRecording_10-28-2026 18-38-22_1.mp4`。管理ホームと在庫管理を往復する遷移で半透明の画面重なりが残り、管理ホーム表示後に「はじめの設定」とプラン比較案内が後着して画面が押し下げられる。
- 過去の `IZK-UT-068` は View Transition の **アニメーション停止**と旧画面保持のローカル対策。今回の再発に対しては、重なり合う旧/新snapshotの **合成・不透明度**にも対策する。WKWebViewでの実際の一瞬の描画は署名版実機の再撮影なしにPASS扱いしない。
- `IZK-UT-099` の以前の言語同期は、2RPC完了後の文字列の再翻訳を解決するものだった。最初に非同期の2RPCを待ってからカードをDOM追加するという **表示時刻・レイアウト変化**は残っていた。
- プラン比較案内は `checkAndShow()` がサーバーplan再検証の度に一度隠し、`showHub()->renderHub()` で再表示していた。認可はAPIで再検証を継続しつつ、既に描画した案内の不要なhideを削除する。

## ローカル共通実装

1. `mobile-app/web/config.js`（Native共通、iOS/Android全画面）：`@view-transition{navigation:auto}` を保持したまま `::view-transition-image-pair(root)` の合成を isolate + normal に限定し、old snapshot を `opacity:0`、new snapshot を `opacity:1` に指定。root各アニメーションnoneは維持。非対応WebViewでは効果未証明。
2. `mobile-app/web/index.html` と `manage.html` は同一ソース。以前検証したチェックリストの `menuDone/staffDone` の真偽値だけを `storeId` 付き既存 `manageHubCache` に保管。復帰の `showHub` から**同期的に再描画**し、その後 `getSettings` と既存メニュー・スタッフ照合で更新。異なる店舗ID、無トークン、権限なし、未完了設定の状態は描画しない。失敗したメニュー/スタッフRPCを空配列とみなさず、既存表示を無意味に書換えない。
3. 管理ホームでのトークン再検証時は既存のFreeプラン比較案内をいったん隠さず維持する。`renderHub` のHTMLが未変更ならナビ、その他タブ、業務タイルを再生成しない。権限・プランのAPI照合、および購入のOwnerチェックは不変。
4. 新規店舗の初回ログインなど、**店舗別snapshotがまだ存在しない初回描画**は後着カードの完全な除去を未証明。先行表示は既検証snapshotを持つ画面復帰を対象にする。未観測状態からの表示は業務RPCで確認した後に限る。
5. Web production/TEST側の管理ホームはNativeとは異なるHTMLとAPI権限/課金表示のため、Native実装を無差別コピーしない。今回はNativeで録画された現象を対象とする。`docs/yuwaku/` と `docs/yuwaku/test/` の既存差分は保持。

## 実行結果（ローカル、正式QAとは別）

- 対象 `node --test test/setup_checklist_language_regression.test.mjs test/izk_ut_084_pro_comparison_always_visible_test.mjs test/izk_ut_068_cross_document_flash_regression_test.mjs test/izk_ut_095_header_navigation_flicker_test.mjs`：**35 PASS / 0 FAIL / exit0**。実Chromium別DocumentのViewTransition・old/new opacity、JA/EN非同期切替、snapshotの即時表示・異店舗拒否、Free案内・DOM再構築の不変条件を検査。
- `node --test test/izk_ut_080_android_hub_scroll_regression_test.mjs test/izk_ut_079_native_zoom_lock_test.mjs`：初回 **10 PASS / 1 FAIL**（080テストVMの `document.getElementById` 欠落。既存Native configの実行コンテキストに未追従）。テストfixtureにブラウザ標準の `getElementById` / `setTimeout` を追加して再実行 **11 PASS / 0 FAIL / exit0**。アプリのスクロールコードは無変更。
- `node test/izk_ut_054_auth_recovery_test.mjs`：50検査PASS、exit0。`node test/izk_project_test_pipeline_contract_test.mjs`：196登録ステップ契約PASS、exit0（**196テストを実行した意味ではない**）。
- `node test/mobile_navigation_test.mjs`：**FAIL / exit1**。公開予約フォームのrootパス想定に関する、10/27時点の既知の他案件の失敗。今回の管理ホーム・Native遷移修正のPASSと混同しない。全体 `npm test` の完了を主張しない。
- `npm run mobile:sync`：exit0。Native source→mobile-dist/iOS/Android 各101件一致・不一致0、iOS↔Android 103件一致・不一致0。`node test/distribution_parity_test.mjs` exit0。署名IPA/APK新ビルド・TestFlight配布・端末実測・正式QA runner/台帳PASS更新は **未実施**。
- `git diff --check`：関連ソース/テストでexit0。ユーザー許可のないcommit/push/deployを実施せず、他担当の大量の未コミット変更は保護。

## ソース自己レビュー S01–S10（個別観点、各実施済み・SOURCE PASS）

| ID | 独立観点 | 確認内容と根拠 |
|---|---|---|
| S01 | 旧チラつき原因との区別 | 10/24白中間フレーム、10/26既定crossfade、10/28旧新snapshotの残る半透明を過去資料と録画で比較 |
| S02 | navigation opt-in | `config.js` の Native条件と `@view-transition{navigation:auto}` を保持、別Document実Chromium検証 |
| S03 | root animation | `::view-transition-group/old/new(root)` で `animation:none!important` を保持、計算style検証 |
| S04 | 合成・透過 | 新規image-pair isolation/normalとold opacity0/new opacity1を両画面で計算style検証 |
| S05 | キャッシュの機密性 | `setupSnapshot` はstoreId+4種類の状態値だけ。名前、商品、従業員配列、トークンを永続化しない |
| S06 | Store分離 | `activeStoreId()` との一致を読み取り・非同期RPC後・persist前に確認。異店舗fixture非表示テスト |
| S07 | Roleと設定条件 | `setupManagerRole()`・`TOKEN`・`onboardingCompleted` の既存ガードを同期先行paintにも適用 |
| S08 | RPC失敗と競合 | 2本の既存RPCは並列、片方失敗時に空データとして反映せず、古い応答が別店舗に届いても適用禁止 |
| S09 | Free案内と認可 | 再チェック中のbanner hideだけを除去。`checkToken`、`renderHub` plan判定、subscription Owner検証は保持 |
| S10 | 再描画と入力保全 | 同一タブの`mtabs`/`moreTabs`/`tiles` DOM不変テスト、言語再翻訳・checklistリンク・Androidスクロールの既存テスト成功 |

## 横展開レビュー H01–H10（異なる対象・逆引き）

| ID | 観点 | 確認内容と根拠 |
|---|---|---|
| H01 | 管理→在庫画面 | Native全操作画面がconfigを読込む既存44画面走査。今回のiPhone実機効果はPENDING |
| H02 | 在庫→管理画面 | `pageswap` と `pagereveal` の双方でViewTransition、old/new styleの共通読込をChromium検証 |
| H03 | 設定など他の業務HTML | 共通config参照による全ネイティブ画面対策。個別ページ専用コード不追加 |
| H04 | 管理ホーム2入口 | `index.html`/`manage.html`完全同一バイト、同じ回帰を両入口で実施 |
| H05 | iOS配布資産 | Native source→iOS同梱101一致、未署名/未インストール状態 |
| H06 | Android配布資産 | Native source→Android同梱101一致、Android hub scroll/zoomの11テスト成功 |
| H07 | iOS/Android相互 | 両同梱103ファイル一致、プラットフォーム別に同型修正を重複実装していない |
| H08 | 日本語・英語 | checklist動的9文言と静的見出しが再翻訳され、RPC応答順を変えるJA/EN 20テスト成功 |
| H09 | Free/Pro/legacy と一般権限 | プラン比較の表示・購入ガードの既存7ケースと追加安定化ケースで確認。権限のないsetup cardは非表示 |
| H10 | Web/PWA/他業務の影響・正式QA境界 | configのNative専用条件、Web未注入をChrome検査。Web版は変更なし。正式実機QA/本番配信の証拠はなくPENDING |

### 判定

ローカルソース修正・専用回帰・配布資産同期 **完了**。特に「はじめの設定」の初回キャッシュなし表示、実機WKWebViewでの画面重なり除去、署名版の配布とユーザー端末の体感評価は **未判定**。この点を正式PASSに繰り上げない。
