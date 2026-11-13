# izakanpai｜カテゴリ管理行の位置合わせ・コンパクト化（2026-11-08）

## 受付・期待結果

ユーザーのTestFlight画面（Yuwaku Bar Owner）で、カテゴリ行の選択チェックが商品行より右、カテゴリ左端に不要な点々、カテゴリ行に大きな空白があると確認。要求は「商品行と同じチェックの左位置」「点々の削除」「カテゴリ行の高さ縮小」。既存のカテゴリ▲▼順序変更・編集・複数選択統合・保存は維持。対象はメニュー編集画面のみ。

## 原因・修正

- 原因：カテゴリ専用gridの1列目がドラッグハンドル、2列目が▲▼、3列目のカテゴリ名ラベル内にチェックを配置。編集ボタンは次のgrid行を占有していた。
- 対策：商品行と共通の `menu-row-check` を1列目で再利用し、▲▼を2列目、名称を3列目、編集ボタンを4列目・同一行へ移動。▲▼は38→32px、縦paddingは6→4px。編集ボタンのタッチ高44pxを維持。
- 不要な点々・Pointer Eventsドラッグ処理と日英ヘルプのドラッグ案内を削除。▲▼はメモリ上でカテゴリ順を変更し、別途保存する既存動作を維持。
- Native一次ソース `mobile-app/web/menu_editor.html`、Web production `docs/yuwaku/menu_editor.html`、Web test `docs/yuwaku/test/menu_editor.html` の3面へ同一箇所を反映。商品行 `.mi` と `src/menuCategories.js` / API / D1 は変更なし。
- チェックは商品チェック同様にブラウザー既定のflex縮小を許し、座標・表示幅の一致をブラウザ実測で検証。カテゴリ名のクリックでも選択／解除できるよう `label[for]` を設定。

## 自己レビュー（ソースを個別観点で確認）

| 観点 | チェックと証拠 | 判定 |
|---|---|---|
| S01 グリッドの列 | 商品用26/44pxをカテゴリにも共用し、チェック・矢印の列が一致 | SOURCE PASS |
| S02 チェックの実寸 | 余分なmin-width指定を外し、商品チェックと同じ描画幅・x座標（ブラウザ） | SOURCE/Browser PASS |
| S03 ラベル操作 | `id/for`対応、名前クリック時のチェックON/OFF（3面ブラウザ） | SOURCE/Browser PASS |
| S04 不要UI除去 | `cat-manager-grip`、ポインターイベントdrag関連とdrag-targetを3面で不在確認 | SOURCE PASS |
| S05 並び替え | `moveCategory`を維持、境界操作no-op、逆方向入替あり（ブラウザ） | SOURCE/Browser PASS |
| S06 保存境界 | `categoryOrderDraft`→`saveCategoryOrder`のみRPC、通信応答喪失読戻しをブラウザ検証 | SOURCE/Browser PASS |
| S07 選択状態 | `categorySelected`とカテゴリ名キーを維持、選択統合対象が並び順に追従（ブラウザ） | SOURCE/Browser PASS |
| S08 編集 | 編集ボタン44px、改名フォーム展開と英語名だけの改名をブラウザ検証 | SOURCE/Browser PASS |
| S09 統合 | 選択カテゴリの統合・仮登録移動・失敗時の選択保持をブラウザ検証 | SOURCE/Browser PASS |
| S10 日英説明 | 日本語・英語のドラッグ案内を削除、▲▼案内を残して言語切替テストを維持 | SOURCE/Browser PASS |

## 横展開レビュー（変更箇所からの探索と逆引き）

| 観点 | チェックと証拠 | 判定 |
|---|---|---|
| H01 Native | `mobile-app/web/menu_editor.html`のCSS・描画・順序処理 | SOURCE PASS |
| H02 Web production | `docs/yuwaku/menu_editor.html`同型変更 | SOURCE PASS |
| H03 Web test | `docs/yuwaku/test/menu_editor.html`同型変更 | SOURCE PASS |
| H04 3面同一性 | category CSS / row DOM / moveCategoryの各部分SHA-256先頭12桁が3面すべて一致 | SOURCE PASS |
| H05 商品UI保全 | 既存`.mi`、商品▲▼50px、商品チェック位置を基準に実座標比較 | SOURCE/Browser PASS |
| H06 狭幅320px | チェック、▲▼、編集、スクロールはみ出しなし | Browser PASS |
| H07 390px幅 | 同じ要素のサイズ・無重複・画面幅内表示 | Browser PASS |
| H08 768px幅 | 横幅拡張時も行高さと操作ボタンを維持 | Browser PASS |
| H09 API・DB影響 | `src/menuCategories.js`、`src/gasApi.js`、`src/index.js`は変更なし。別途カテゴリ管理18件で権限・DB整合を回帰 | SOURCE/Local PASS |
| H10 既存共通ヘッダー保全 | `scripts/ci/critical-ui-preservation-gate.mjs` exit0 | SOURCE PASS |

## ローカル検証とリリース境界

- `node --test test/menu_bulk_delete_browser_test.mjs` **72/72 PASS、exit 0**。3面の全ブラウザ回帰。
- テスト追加後のコンパクト行専用フィルタ `node --test --test-name-pattern="compact category rows keep checkbox" test/menu_bulk_delete_browser_test.mjs` **3/3 PASS、exit 0**。名称ラベルクリックでの選択切替も追加検証。
- `node --test --test-name-pattern="all main menu editor sections toggle" test/menu_bulk_delete_browser_test.mjs` **3/3 PASS、exit 0**。元はチェック幅20px対商品19pxの不一致で3件FAIL。カテゴリ側の固定min-widthを除去して再実行PASS。
- `node --test test/menu_category_management_test.mjs` **18/18 PASS、exit 0**。旧ドラッグ存在チェックを廃止して不要ハンドル不在に変更。
- `node scripts/ci/critical-ui-preservation-gate.mjs` **PASS、exit 0**。`git diff --check` **exit 0**。
- 正式iPhone・Android実機QAは未実施。正式QA台帳へのPASS増分0。iOS/Androidビルド、TestFlight配布、commit、push、Worker配備はこの作業では実施していない。既存の他作業の未コミット差分には触れない。
