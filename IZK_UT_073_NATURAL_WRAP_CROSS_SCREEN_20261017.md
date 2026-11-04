# IZK-UT-073｜不自然な文字折り返しを廃止・全画面横展開（2026-10-17）

**利用者の最新指示**：「073やって。不自然な折り返しはやめて」。**実施状態**：LOCAL SOURCE REWORKED（ソースと一部ブラウザ描画回帰PASS、修正版Native実機と全120業務画面のデータ入りE2Eは未検証）。**旧074**は別途ユーザー判断でCLOSED、正式QA台帳は変更しない。

## 原因と統一方針

共通 `header.js`（Native／Web本番／TEST）が `body{overflow-wrap:anywhere}` を注入しており、本文・ボタン・表まで長い単語が任意の文字境界で折れる可能性があった。さらに前回073の局所CSSに `overflow-wrap:anywhere` が93箇所と `word-break:break-word` が34箇所あり、長い英単語、コード、金額、席名などで同じ問題が残っていた。

**新方針**：

1. **画面全体の一律強制改行は禁止**。共通ヘッダーの `body` は `overflow-wrap:normal;word-break:normal`。日本語・英語の自然な文節/単語境界を使う。
2. **短い画面名・席名・クーポンコード・ステータス**は原則1行、必要時 `…` で省略。コード・席名・商品名の元値は維持し、表示上の省略は `title` で全文参照可能。既存の共通ヘッダーのUTF-8 14バイト/10バイト省略仕様は保持。
3. **本文・説明**は自然に複数行で表示。`white-space:normal;overflow-wrap:normal;word-break:normal`。無改行の長い記号列・ID・英数字については、その**項目内だけ**必要時横スクロールとし、価格/数量/ボタンの列を押し出さない。
4. **価格・数量・操作ボタン**は文字単位の不自然な分割禁止。数字は1行で、長い金額は当該欄でスクロール可能とし、勝手な桁数省略はしない。KDSの数量と管理画面操作ボタンはFlexの別領域。
5. **入力した文字そのものは一切変更しない**。データ切詰め、APIリクエスト/DB値、既存JS業務ロジック、認証・権限・テナント境界は変更しない。表は既存の横スクロールコンテナを活かす。ログ/URLの技術表示の `word-break:break-all` は通常本文ではなく意図的な長いデバッグ用出力として維持。

## 変更・配布面

- 共通 `mobile-app/web/header.js`, `docs/yuwaku/header.js`, `docs/yuwaku/test/header.js`：bodyへの `overflow-wrap:anywhere` 注入を廃止。
- 3配布面の **HTML合計54ファイル**に残る任意位置改行93件、`word-break:break-word`34件を改訂。全120 HTMLを静的走査し、これらの旧指定が残らないことを確認。新たなファイルリストは `git diff --name-only` とテストにより再生成可能。新規画面はこのルールに従う。
- 独立の狭幅リスクが高い `kds.html`（席名・商品名・数量）、`admin.html`（注文名・価格・提供ボタン）、`coupons.html`（クーポンコード・状態）、`expenses.html`（購入品目・金額・操作）、`moves.html`（ヘッダー・戻る操作）を**Native/Web本番/Web TESTそれぞれ局所再修正**。Native専用の `commission.html` も金額・長いバッジ名と折返しを再設計。
- KDS席名・商品名、クーポンコードにはHTMLの `title` を追加。値を属性に書く際は既存の `esc` でHTML特殊文字をエスケープする。文字列そのものや注文数量・価格に加工なし。
- キャッシュ版を更新し古い共通CSSの再利用を避ける。Native `header.js?v=auth25` / Service Worker `v313`、Web/TEST `header.js?v=auth17` / Service Worker `v284`。**ソースのバージョン更新でありビルド/配布はしていない**。

## 修正自己レビュー10巡（異なる方法と実測結果）

| 巡 | 実施内容 | 結果 |
|---|---|---|
| S01 | 共通ヘッダー3ソースを逆参照し、過剰な `body anywhere` が117管理画面に継承される原因を特定 | PASS source |
| S02 | Native44/Web38/TEST38のHTML 120入口を独立走査し旧 `overflow-wrap:anywhere` と `word-break:break-word` が0であることをNode回帰で照合 | PASS 120/120 static |
| S03 | KDS Flex `t-table` と `nm` の元値/表示値を追跡し、数量を固定列に残し、英語は単語間で自然折り返し・長い無改行ラベルは局所スクロール | PASS Chrome geometry |
| S04 | KDS席名と品目は `esc` した表示文字とtitleが同じ元値であることをソース/Chrome属性で確認。元のデータはtruncateしていない | PASS source/Chrome |
| S05 | 管理注文 `admin.html` の長文品目に `word-break:normal`＋局所Xスクロール、price/actionは独立のFlex列で表示 | PASS Chrome geometry |
| S06 | クーポンの無改行コードをnowrap/ellipsis/titleへ、状態バッジの右側を維持。3系統でコード全文属性と重なりなしを検証 | PASS Chrome geometry |
| S07 | 経費カードの入力値全文保持と2行の自然な説明・金額1行・操作ボタン維持をVMとChromeで照合 | PASS Chrome geometry |
| S08 | 在庫移動ヘッダーが極狭320pxでも任意位置折返し/第三行化せず、省略と操作ストリップを分離することを実座標で検査 | PASS Chrome geometry |
| S09 | 共通ヘッダーのタイトル/ログイン者の14/10 UTF-8 byte省略・二段構成と各種ボタンX位置を既存Playwrightで再確認 | PASS header9/9 |
| S10 | 新規 Chromium+HTML静的テストを含む選定Node **142/142 PASS**、QA2-FLOW-N-002 82チェックPASS、KDS DOM契約PASS、対象の `git diff --check` / JS構文check 0を確認 | PASS offline |

## 横展開レビュー10巡

| 巡 | 範囲 | 結果 |
|---|---|---|
| H01 | Native管理入口44 HTMLと共通CSS、config cache bust、ログイン・印刷・KDSを含む | PASS static、代表Chrome PASS |
| H02 | Web本番38 HTMLと共通CSS、SW版・メニュー整合性を横展開 | PASS static、代表Chrome PASS |
| H03 | Web TEST38 HTMLをWeb本番38 HTMLとバイト比較 | **38/38一致** |
| H04 | KDS商品名/席名のNative/Web/TESTの動的 `dispItemName`/seatLabelをそれぞれ確認 | PASS3/3 |
| H05 | 管理注文名/金額/提供済みボタンとエラー表示、旧QA2-FLOW-N-002 82チェック | PASS3/3 source/Chrome |
| H06 | クーポンの一覧コード/状態・日英候補と改行禁止、全文保持 | PASS3/3 source/Chrome |
| H07 | 経費の金額/長文品目/購入者/メモ/編集・削除ボタンと旧073テスト | PASS3/3 source/Chrome |
| H08 | 在庫移動 `moves` の長いヘッダー/戻る等の固定ボタン、既存PT-CTLタップ領域 | PASS3/3 source/Chrome |
| H09 | Commission Nativeのスタッフ名・KPI金額/バッジと既存137系業務ロジック切離し | PASS source regression、動的実データ未検証 |
| H10 | 320/360/430/800 CSS幅×3配布面×5代表画面 = **60実ブラウザ描画**、iOS/Android正式実機と全120画面の完全な動的長文実画面は別ゲート | PASS60代表 / full physical PENDING |

## テストログと区別すべき残件

- `node --test test/izk_ut_073_natural_wrap_chromium_test.mjs`: **2/2 PASS**（120画面static + 60 Chromium fixture）。
- 073関連の全画面入口監査、費用、歩合、購買/レシート/商品一覧、8画面狭幅レイアウトをまとめた `node --test`: **142/142 PASS**。
- `node test/izk_ut_073_kds_long_label_source_test.mjs`、`node test/android_qa_pt_ctl_20261012_layout_test.mjs`、`node test/qa_v2_8page_web_css_parity_test.mjs`: **PASS**。
- `node test/qa2_flow_n_002_orders_error_regression_test.mjs`：**82チェックPASS**。`node --test test/qa2_header_two_row_regression_test.mjs`：**9/9 PASS**。
- `node test/mobile_navigation_test.mjs` はCommission validatorの**既存の別件ソース文字列期待**で途中FAIL。本件により未修正になったと判定しないが、全総合PASSとも称さない。
- 物理Realme/iPhone（短辺720物理pxを含む）の実画面、長文入力/IME、ドライバー不使用の単独タッチ・KDS発話、全120ページへの業務データ投入を**実行していない**。HTML静的全件＋代表5画面のChromeだけで正式PASSとせず、**IZK-UT-073は引き続き OPEN（LOCAL SOURCE REWORKED／実機・動的業務画面横展開確認待ち）**とする。
- コミット・プッシュ・Worker配布・Web本番反映・APK/IPAビルド・正式QA case claim/record・スケジューラ再開を行っていない。
