# IZK-UT-094 — 全画面共通ヘッダー2段目：共通操作は右、画面固有操作は左（2026-10-18）

## 受付・期待値・根本原因

- **報告**：Android実機 Realme RMX3938 の設定画面（QA APK910020）で、ヘッダー上段「⚙設定」「👤あつし」、下段の共通ヘルプ `?`、言語 `EN`、更新 `↻`、戻る `←` が左端から並んでいる写真。利用者が既に指示していた「共通ボタンは全画面共通の右端、画面固有ボタンは左端」に反する。
- **優先度**：P2、共通UI配置不一致。正式Android旧CASEをこのソース修正だけでPASSにしない。
- **根因**：共通 `header.js` の `init()` が `toolbar.appendChild(actions); toolbar.appendChild(extra)` と誤った順で、CSS `.iz-header-toolbar` が `justify-content:flex-start;overflow-x:auto`、`#izHeaderExtra` が `flex:0 0 auto` となっていた。固有ボタン追加時は共通操作も水平スクロールして位置が移る構造。Hosted Web本番とTESTでも同じ構造で、さらに時計を toolbar 末尾へ移動していた。
- **本修正**：Native / Web PROD / Web TEST の `header.js` **3個所の共通部品**のみで、2段目に `#izHeaderExtra` **→** `#izHeaderActions` の順に配置。前者は左側で `flex:1 1 auto`・横スクロール可能、後者は `margin-left:auto`・`flex:0 0 auto` で右端固定。toolbar本体はスクロールしない。Hosted時計は本来の上段 `#izHeaderMeta` に保持し、操作ボタンの右端を妨げない。画面固有ボタンの実DOMノード・イベントリスナー移動、言語/更新/戻る/ヘルプ本体、権限や処理中ガードは変更なし。
- **配布キャッシュ**：Native `header.js?v=auth27` / SW `v317`、Hosted PROD `auth19` / `v286`、Hosted TEST `auth19` / `v287` に各対応する config/precacheを更新。これは将来の配布に備えた **LOCAL版管理**であり本番公開や端末インストール完了ではない。
- **版管理**：開始時Git `4e8ff192f8436880bcc58ba328dfb5cf8aac6734`。他の並行チャットがsrc/controlPlaneWorkerや課金、正式QAツールを編集しているので、他者dirty差分をstage/reset/sync/build/deployしない。実機APK910020への更新は別手順・別承認・別配布版。正式QA manifest/stateを編集しない。

## 修正前・修正後の受入と回帰

1. `test/izk_ut_094_header_toolbar_alignment_test.mjs` を修正前に追加。**RED**：Native/Web本番/TESTいずれも「固有左・共通右」の構造assertが失敗し、Chromium 360pxの右端固定条件も失敗（`4 tests / 0 pass`）。
2. 修正後同テスト **GREEN / exit0**：3配布面の実 `addStyles()` CSSを抽出してVM実行、Chrome実座標で360/800 CSS px × 固有操作0/1/12個を確認。共通 `? EN ↻ ←`（Hostedはさらに⌂のslot）のX/Yがケースを通じて1px以内で不変、共通右端と親行の右端が揃う、固有操作は左、重なり0、固有側だけが横スクロール、toolbar本体はスクロールせず。44px以上のタップ領域と2段の高さを検査。
3. 既存 `test/qa2_header_two_row_regression_test.mjs` はDOM順・スクロール責務の旧期待を正仕様へ直し、実Chromiumでタイトル短縮、ヘルプ実表示、移動した固有ボタンのclick発火、日英切替、戻る非表示の位置不変を継続検証。
4. 既存 `test/qa2_ui_header_720_regression_test.mjs` / `test/header_component_test.mjs` に、行固定・固有側スクロール・DOM順の改定を反映。`test/izk_ut_089_accent_regression_test.mjs` の現行配布バージョン期待を厳格更新。
5. 恒久 `test/project-test-commands.json` に新094専用テストを追加。テストログ `test-results/izk_094_header_focused_20261018.log`。ステップごとのexitで判定し、`npm test` 全量の成功とは混同しない。
6. 独立関連テスト `test/mobile_navigation_test.mjs` **191 checks exit0**、`test/native_auth_test.mjs` **112 checks exit0**、`test/local_smoke_test.mjs` **581 checks exit0**。一方、旧 `test/izk_ut_073_shared_layout_audit_test.mjs` は **exit1**（今回未変更の `mobile-app/web/styles.css` の `.quickbar` 狭幅 `overflow-x:hidden`、および `index/manage/overview/profit_sim` の旧 root `overflow-x:hidden` を検出）。今回修正した共通header CSSとは別コンポーネントであり、無関係な注文UIを品質ゲートから外したり広域修正したりせず、既存不備として保留。
7. `node scripts/izk-source-coverage-manifest.mjs` は **exit1**。バックエンド `src/*.js` に並行作業の未コミット変更があるため、SOURCE COVERAGE JSONが現在のworktreeと不一致。今回の変更は共通frontendヘッダーであり、他担当の未確定バックエンドSHAを含むmanifestの自動確定は行わない。

## 自己レビュー10巡 S01–S10

| No | 入口→確認した具体的証拠 | 結果 |
| --- | --- | --- |
| S01 | ユーザーのRealme設定画面画像→ヘルプ/EN/↻/←の実配置と旧配置要件を比較 | FAIL（変更前確認）→是正 |
| S02 | `init()` が共通 `actions` を `extra` より先にappendするコードをトレース→順序反転 | PASS（構造） |
| S03 | toolbarの `justify-content:flex-start` が共通ボタンを左に置くCSS→両端分離へ | PASS（配置） |
| S04 | 固有操作領域 `flex:0 0 auto` が固定ボタン群を押し出す構造→`flex:1 1 auto;min-width:0` に修正 | PASS（flex） |
| S05 | 全toolbarの `overflow-x:auto` は共通ボタン自体をスクロール→toolbar overflow hidden / extra専用scrollへ | PASS（責務分離） |
| S06 | extra0 / extra1 / extra12 をChrome 360/800で幾何assertし、固定共通操作のX/Y不変を検証 | PASS（source/browser） |
| S07 | `visibility:hidden` のヘルプ/戻るslotも占有位置を残す既存設計を維持し、2段目に第三段が発生しない実Chromeテスト | PASS |
| S08 | 各操作の44pxタップ領域と隣接操作の非重複、本文の位置をChromium fixtureで計測 | PASS（source/browser） |
| S09 | 言語・ヘルプ・更新・戻る各イベントと `API.guardNavigation` 経路は一切改変せず、既存ヘッダーChromium操作テストで遷移とHelp表示維持 | PASS（source/browser） |
| S10 | Native固定ヘッダー+spacerとHosted stickyを分けて維持し、配布JS/Web TEST SHA比較・`git diff --check`を確認 | PASS（SOURCE） |

## 横展開10巡 H01–H10

| No | 逆引き・独立配布面・テスト | 結果 |
| --- | --- | --- |
| H01 | Android Native `mobile-app/web/header.js` 入口→画面固有操作の `takeLegacyExtras` 移動→`init`右端固定 | PASS（SOURCE）／実機PENDING |
| H02 | iOS Capacitor共用 `mobile-app/web/header.js`→iOS/WKWebView 狭幅・safe-area・44px hit CSS維持をレビュー | PASS（SOURCE）／iPhone PENDING |
| H03 | Hosted PROD `docs/yuwaku/header.js`→同画面の旧時計DOM移動を解消しトップメタに保持 | PASS（SOURCE）／公開PENDING |
| H04 | Hosted TEST `docs/yuwaku/test/header.js`→本番HostedとのSHA byte一致を確認 | PASS（SOURCE） |
| H05 | 360px（720物理px,320dpi）× Native/Hostedの3配布面→共通操作右端不変/固有ボタン独立スクロール | PASS（Chrome） |
| H06 | 800pxデスクトップ幅×3配布面→固有0/1/12件でも共通ボタン右端座標を保持 | PASS（Chrome） |
| H07 | Help未登録時のhidden占有と登録後Help overlay表示、戻るhidden切替→既存 `qa2_header_two_row_regression_test` 実Chromium | PASS（Chrome） |
| H08 | NativeとHostedのJS loader configをそれぞれSW precache参照と照合し新 `auth27/auth19` に同期、旧キャッシュ世代を上げる | PASS（LOCAL）／配布PENDING |
| H09 | 旧テストの `actions→extra` / toolbar全体スクロール期待を逆引きし、qa2/header_component/720の旧期待を新規幾何assertに置換 | PASS（SOURCE+TEST） |
| H10 | 共通DOMを迂回するローカルUI（予約/公開/法定画面等）では同じ管理共通ヘッダーを使わない導線を確認。ページ個別CSSのヘッダー用44pxタッチ強制を保持。全正式QAは別ゲート | PASS（SOURCE）／全画面実機PENDING |

**結論**：共通部品とキャッシュのLOCAL修正、独立10+10のソース/Chromium検査。APK/IPA配布、Web公開、全126画面の正式Playwright QA PASSではない。配布済QA APK910020は旧表示のまま。新APKを作る際は他チャットの未確定dirtyを混ぜず、versionCode・署名・SHA256を固定してから正式実機再試験する。
