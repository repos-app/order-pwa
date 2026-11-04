# IZK-UT-078 — 全画面共通ヘッダ2段統一（ローカル修正／2026-10-16）

## 根因・範囲・実施内容

- **原報告**：iPhone管理画面の画像で画面名／ログイン者／Help／言語／更新／戻るの配置と折返しが不統一。ユーザーによる**新仕様**：上段小文字タイトル左・ユーザー右、14/10 UTF-8バイト以上は`...`、下段共通ボタン左寄せ固定・元サイズ維持、全画面へ横展開。
- **根因**：NativeとWebの`header.js`に単一flex行と幅430px以下の複数行flex-wrap、画面別extraとユーザーの競合が存在。NativeのHelpはヘッダ先頭へ後挿入、WebのHelpは独立FABだったため共通操作の開始座標が一致しなかった。
- **修正**：Native/Web本番/Web TESTの`header.js`、`help.js`、`config.js`、`sw.js`。2行の構造・左右整列を共通化し、3バイト`...`を**総バイト上限の内数**として日本語/Unicode結合絵文字を切らずに省略。UI表示は短縮、tooltip/aria-labelには元の全文とrole。Help、言語、更新、管理/戻るの固定順スロットは非表示でも位置を保持し操作はdisabled。旧画面固有の見出し・ボタンイベントは維持、文字変更をObserverでミラー。固有ボタンが多いときは操作行内の横スクロールで2行を保持。iOS/Androidの44pxタッチ判定を保持。
- **元ソースの差異**：Nativeはfixed header＋動的spacer＋Native後戻り遷移、Webはsticky header＋店舗timezoneの時計。双方の動作を消さず、Web時計は2行目末尾へ移動。
- **対象画面棚卸し**：`mobile-app/web`44 HTML（共通ヘッダ43）、`docs/yuwaku`38 HTML（共通37）、`docs/yuwaku/test`38 HTML（共通37）。**全120入口／共通適用117画面**。未適用3件は各`drink_inv.html`のinventoryへの即時転送専用。一般顧客向け独立公開注文/予約等は管理ログインユーザーのヘッダを使わないため本UIの外側。

## 修正後・自己レビュー S01–S10（異なるコード・観測方法）

| 巡 | 独立観点、方法と証拠 | ソース結果 |
|---|---|---|
| S01 | 表示値が14/10 UTF-8**バイト**境界で変わることを実`abbreviateUtf8`関数をVM実行し、日本語/英字の境界値で照合 | PASS |
| S02 | 4バイト絵文字とZWJ結合系列を`Intl.Segmenter`+`TextEncoder`で処理し、文字途中で切断せず`...`のみとする負例を実テスト | PASS |
| S03 | 画面名の全文が`title`/`aria-label`に残り、表示値だけが切り詰められることをChrome実DOMで検証 | PASS |
| S04 | ユーザー名の全文・roleはツールチップに保持し、表示上は名前だけ10バイト上限。JP/ENのrole更新をブラウザで検証 | PASS |
| S05 | Nativeの`iz-header-top`/`iz-header-toolbar`の上下DOM、`#izHeaderTitle`左と`#izHeaderMeta`右をChromium360px/800pxで座標検証 | PASS |
| S06 | 同じブラウザ寸法でWeb本番/TESTにNativeと同じ2段構造、共通ボタンの左右順と`#izHeaderExtra`移設を確認 | PASS |
| S07 | Helpが非表示でも固定幅スロットを保持し、利用開始後も言語・更新・戻るのX座標を維持。Chromeで操作切替前後の座標値一致 | PASS |
| S08 | 既存h1は元DOMのまま、動的`textContent`変更で表示タイトルが追従することを実MutationObserverで確認 | PASS |
| S09 | 既存セッションtokenを取り消して`syncAuthDisplay`でユーザーが消え、別ユーザーとして表示が再作成されることを3面の実DOMで確認 | PASS |
| S10 | 専用 `node --test test/qa2_header_two_row_regression_test.mjs` 9テストexit0、3本headerとhelpのJS構文exit0、変更差分に`git diff --check` exit0 | PASS |

## 横展開レビュー H01–H10（別の探索入口・対象）

| 巡 | 関連画面/機能への逆引き・根拠 | ソース結果 |
|---|---|---|
| H01 | Native `mobile-app/web` 内すべてのHTML44件を配置入口`config.js`から棚卸し、適用43＋redirect1に分類 | PASS |
| H02 | Web本番 `docs/yuwaku` 38 HTMLを独立列挙し共通ヘッダ37＋redirect1と照合 | PASS |
| H03 | Web TEST `docs/yuwaku/test` 38 HTMLについて上記とは別に列挙し37＋redirect1と照合 | PASS |
| H04 | 共通資材バージョンを参照元`config.js`→`header.js`→`sw.js`の順に追い、Native `auth24/v312`、Web/TEST `auth16/v283` の一致を回帰で検証 | PASS |
| H05 | Native `help.js`の旧後挿入とWeb/TESTの旧FABを逆引きし、各3面でHelpモーダル起動かつFAB未追加を実Chromiumで検証 | PASS |
| H06 | `takeLegacyExtras`が旧画面の`h1`・ページ独自button/linkを扱うルートを調べ、DOM移設後も固有button click回数が正しいことを3面で検証 | PASS |
| H07 | 共通言語・更新・戻る・管理のpolicyをソース検査し、不可視スロットをdisabledにすることで非許可操作を増やさない確認 | PASS source |
| H08 | Nativeの固定ヘッダspacer/安全領域とWebのsticky/店舗時刻を独立照合し、header DOM以外の戻り先・timezone・フォーム処理を維持 | PASS source |
| H09 | iPhone/Android指先44px・回転後の入力欄フォーカス・狭いlandscape IME補正を既存Chromium/VM横展開回帰で確認 | PASS offline |
| H10 | QA2-NEW-VIS-001やQA2-UI-birthdays等の旧「タイトル全文」受入条件を新14バイト省略仕様と照合し、旧証拠を改竄せず**新仕様に沿う再試験が必要**と障害078に明記 | PASS source / 現場QA PENDING |

## 実行証跡と保留

- `node --test test/qa2_header_two_row_regression_test.mjs` → **9/9 PASS、exit0**。うち実Chrome/EdgeのCSS幅360/800で3面のサイズと2段座標、実際の`header.js`でタイトル・ユーザー・画面固有ボタン・ヘルプ・別アカウントへの切替を実施（モックしたローカル文書であり本番画面/実機QAではない）。
- `node --test test/android_qa_five_scope_checks_test.mjs test/android_qa_chrome_touch_geometry_test.mjs test/android_qa_focus_visibility_test.mjs test/android_qa_shared_touch_localization_test.mjs test/android_qa_floating_ime_coverage_test.mjs` → **5/5 PASS、exit0**。
- **未実施**：ユーザーの実iPhone/Androidバージョンに今回の差分を含む署名アプリの作成・導入、全117ページの実機逐次タップ・既存画面とのbody/header実重なり、既存正式ケースのclaim/validate/record。本番Web配布も行っていない。したがって正式な端末側PASSは**PENDING**。
- ローカル自己・横展開各10観点と正式物理QAは別概念。公式831件のQA台帳、他担当dirty差分、Windows停止タスク、配布済みworkerは更新していない。次は①で新ビルド/配布の差分身元確認、②でPlaywright実行（iOSは検証済み例外transport）を行う。
