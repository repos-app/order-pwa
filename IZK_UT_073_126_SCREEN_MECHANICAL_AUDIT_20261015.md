# IZK-UT-073 第2波：全配布面HTML構文と静的ナビゲーション監査（2026-10-15）

## 証拠と結果

`scripts/izk-ut-073-page-coverage.mjs` に既存の画面列挙を再利用して `vm.Script` による inline `<script>` の構文コンパイル（**実行しない**）、HTML実体に書かれたイベント属性の関数本体コンパイルと先頭関数名の存在推定、HTMLに書かれた相対リンクの実ファイル存在・同一ページアンカー存在確認、Web本番/TESTの SHA-256 による厳密バイト照合を追加。script内に書かれたHTML文字列を実在DOM属性と誤検知しないよう静的属性探索からscript要素全体を除外する。src付き外部script、module/importmap、JSONなどは classic inline JavaScriptとしてコンパイルしない。クライアント上の処理は一切実行しない。

実ソース列挙：Native44、Web本番38、Web TEST38、公開注文本番1、公開テイクアウト本番1、公開TEST注文/テイクアウト/予約3、公開予約本番1、公開`docs/public`配下0、合計 **126 HTML**。先行版の123に対し追加確認した3ファイルは `docs/order/index.html`、`docs/test/order/index.html`、`docs/takeout/index.html`。残る `docs/test/takeout/index.html` は先行版ですでに列挙済みであり二重計上しない。出力 `docs/IZK_UT_073_PAGE_COVERAGE_20261015.json` は各ページの静的所見、検査結果、ハッシュ、正式物理端末 `NOT_TESTED` を保持。

初回の有効な baseline 結果：**inline JavaScript syntax errors 0、実HTMLイベント属性syntax errors 0、静的未定義関数候補 0、静的相対参照切れ 0、Web本番/TEST 38組のbyte unequal 0**。ページ内で JavaScript により作られるHTML属性・リンク、サーバー返却文字列、外部JS読み込みとその実行・相対解決、クリック実行、端末実寸は静的判定できない。関数名推定は簡易な最初の呼び出しのみ、文字列処理・間接呼び出しは実動作証拠ではない。

## 監査器そのものの検証

`node test/izk_all_screen_syntax_navigation_audit_test.mjs` は全126実ソースを読み直しJSONと一致、38組の本番/TEST実バイト比較、壊れたインライン構文、存在しない `onclick` 関数、存在しない相対 `href`、不正なイベント式、および有効な静的リンク・関数による逆方向テスト、最後に generator の再実行結果が記録JSONと完全一致することを検査し **exit0**。`node scripts/izk-ut-073-page-coverage.mjs --write` もexit0。原因を確定できる画面ソースの新規不具合は今回の範囲で検出されず、アプリHTMLの追加編集は行っていない。

## 10自己レビュー・10横展開確認

| ID | 観点・結果 |
|---|---|
| S01 | 126件の実ファイル所在列挙と123版からの差分、PASS |
| S02 | inline classic JSの構文コンパイルのみ実施し副作用なし、PASS |
| S03 | module/JSON/src script のコンパイル除外をコード確認、PASS（外部JS解析はPENDING） |
| S04 | script内部の見かけの `onclick` を実HTMLとして扱わないよう除外、PASS |
| S05 | イベント式のコンパイル検査と故障fixture、PASS |
| S06 | 静的ハンドラ識別子の未知候補検出fixture、PASS（複合動的名前はPENDING） |
| S07 | 相対ファイル/アンカーの正負fixtureとURLスキーム除外、PASS |
| S08 | バイトSHA256の完全一致だけを parity true とする、PASS |
| S09 | JSON再生成と全ページソース再検査の確定的一致、PASS |
| S10 | JavaScriptをVM内で評価しないこと、HTML実DOMやAPI/QAへの副作用がないこと、PASS |
| H01 | Native 44の各ソースを独立読み込み・検査、PASS（実描画PENDING） |
| H02 | Web本番38の各ソースを独立読み込み・検査、PASS |
| H03 | Web TEST38の各ソースを独立読み込み・検査、PASS |
| H04 | Web本番/TEST 38組のバイト一致を実測、PASS |
| H05 | 公開注文の本番/TEST両index列挙、PASS |
| H06 | 公開テイクアウト本番/TEST両index列挙、PASS |
| H07 | 公開予約本番/TEST両HTML列挙、PASS |
| H08 | 各ページの相対ファイルリンク・fragmentをチェック、PASS（runtime生成はPENDING） |
| H09 | 全ページのclassic inline scriptと静的イベント式をチェック、PASS（動的scriptはPENDING） |
| H10 | CSS長文UI候補とphysical720pxの既存PENDING明示維持、PASS（実機証拠はPENDING） |

**未完了**：物理720px Android/iPhone実画面とスクロール/タップ、外部JS・JS生成DOMに現れるナビゲーション、配布済みビルド、正式QA。commit/push/deploy/正式QA状態変更なし。
