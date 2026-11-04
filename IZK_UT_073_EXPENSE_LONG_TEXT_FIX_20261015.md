# IZK-UT-073｜経費管理の長文カード・操作性 横展開（LOCAL、2026-10-15）

**状態:** 既知の経費カード構造のソース修正・VMテスト4件PASS。**障害全体はOPEN**、全120画面の実描画・IME・720物理px Android/iOS・Web配信後の受入は未完了。今回の担当はcommit/push/deploy/正式QA state/本番データ/端末を変更していない。

## 現象と根本原因の確認

- 元障害`docs/IZK_UT_073_DISCOUNT_LIST_IME_INCIDENT_20261014.md`は、長い入力がFlex幅を押し広げてボタン不可視になるリスクを**全入力画面**で指摘。全画面への共通`overflow-wrap:anywhere`だけでは、`display:flex`の子要素に既定`min-width:auto`が残る場合、画面幅を保証しない。
- 実ソース`expenses.html::renderCards`は`.expense-card-head`内に`<div>`（日付・入力品目・カテゴリ）と`.expense-card-amount`（金額）を横並びに配置。子`<div>`に`min-width:0`がなく、空白なしの長いユーザー入力では内容固有の最小幅が金額列と競合する。メモ/購入者も`.expense-card-meta`の子に直接表示。収容する単一表領域`.expense-table-wrap`は従来`overflow:auto`。
- 経費カードの入力内容・金額・領収書・編集/削除ボタンを**実際の表示関数**で確認し、外見の対策によって保存値やDOM本文が短縮されないことを検査。

## 対策

1. `mobile-app/web/expenses.html`、`docs/yuwaku/expenses.html`、`docs/yuwaku/test/expenses.html`の3面に同等CSSを追加。
2. カードとヘッダー、flex 1番目の子を`min-width:0`とし、金額は48%以下・右寄せ、異常な長文数字にも折返し可能にする。長文品目名は**見た目だけ2行で省略**、カテゴリ表示はellipsis。購入者/備考/レシート付随テキストは`overflow-wrap:anywhere`と`min-width:0`で内容保持、表はスクロールを**表コンテナ内**に閉じ込める。
3. 計算、金額、API送信、DB、既存テストfixture、プレビュー元データは無変更。Web prod/testはbyte一致。旧APKへの取り込みは未実施。

## 今回の実検証

`node test/izk_ut_073_expense_long_text_regression_test.mjs` **4/4 PASS (exit0)**。3配布面から実`renderCards(list)`関数を抽出してNode VMで実行し、日本語+絵文字+XSS風タグ(約80字)、300字購入者名、1000字+script風文字を出力HTML内に**HTMLエスケープのうえ全文保持**していること、金額・編集/削除ボタンがDOMに残ること、長文表示用CSSの出典を確認。第4テストでWeb production/TEST全ファイルbyte一致を確認。`git diff --check -- <3-page>` exit0。**画面レンダリングとタップの物理検証を意味しない**。

## 自己レビュー10観点

| 進行 | 監査内容と根拠 | 状態 |
|---|---|---|
| S01 | 元IZK-UT-073の長文Flex問題と経費カードのDOM構造を照合 | PASS source |
| S02 | `.expense-card-head>div:first-child`のmin-width:autoに対するmin-width:0修正 | PASS source |
| S03 | 金額列が残り幅を48%以下に抑えられるCSS検査 | PASS source |
| S04 | 品目は長文でも2行clamp、実DOMは全文保持 | PASS CSS+VM、実機PENDING |
| S05 | 1000字の購入者/メモにHTML escapingを適用し全文が残る | PASS VM |
| S06 | 長文URL/無空白Unicodeに`overflow-wrap:anywhere`、テーブルのみscroll | PASS source、実描画PENDING |
| S07 | Edit/Delete action要素が残り、タッチ寸法を破壊しない | PASS VM構造、タップPENDING |
| S08 | 既存のreceipt画像・金額・一覧データの実JSを変更していない | PASS diff |
| S09 | Web prod/testの全ファイルbyte一致、NativeとのCSS規則一致 | PASS test |
| S10 | 専用4回帰+git diff --checkを実行 | PASS LOCAL、Android/iOS実機PENDING |

## 横展開レビュー10観点

| 進行 | 対象 | 状態 |
|---|---|---|
| H01 | Native Android同梱`expenses.html`のカード | PASS source/VM、実機PENDING |
| H02 | Native iOS WebView同梱の同画面 | PASS source、実機PENDING |
| H03 | Web本番`docs/yuwaku/expenses.html` | PASS source/VM、配信PENDING |
| H04 | Web TEST`docs/yuwaku/test/expenses.html` | PASS source/VM、配信PENDING |
| H05 | 同じ画面のデスクトップ表`expense-table-wrap` | PASS CSS、ブラウザPENDING |
| H06 | カードitem/categoryと金額右端のFlex境界 | PASS CSS+VM、画面実測PENDING |
| H07 | 購入者・メモ・レシート長文・画像容器 | PASS source+VM、実描画PENDING |
| H08 | JA/EN・絵文字・英数字・XSS風入力 | PASS VM（文字列保存/escape）、IME PENDING |
| H09 | DB/Server`saveExpense`経路とStore ID・金額 | 無変更・static確認、直接SQL再回帰は別ケース |
| H10 | 120画面の残候補・全モーダル/注文/レシートプレビュー | **PENDING**。この1画面修正を全画面完了とは数えない |

**次の受入:** 新版APK/IPAとWeb prod/testを対象に、物理720px以上、1080px、JA/EN、縦横、IME有無、80/81/200/1000字の経費カード・表・入力を記録し、金額/編集/削除操作が実際にできるか確認。残りの画面も独立に棚卸し・個別対策して初めてCLOSED。

## 継続第2修正：Nativeコミッション一覧の長文Flex

当日の横展開逆引きで、`mobile-app/web/commission.html`の`.cm-rowtop`に、ルール名と対象メニュー・歩合の長文を出す無制限の第1Flex子があることを確認。`commission-app.js::renderRules`は氏名など長い任意入力からラベルを作るが既存のHTML escapingは正しく実施。**表示時のFlexサイズだけ**を`.cm-rowtop>div:first-child{flex:1 1 auto;min-width:0}`へ変更し、`.cm-name`と`.cm-meta`は先頭を残してellipsis、状態バッジは最大40%、KPIと従業員のチェック名は折返し。API/DB/元文字列は変更していない。今回のcommission画面は**Native専用**で、対応する`docs/yuwaku/commission.html`は存在しない（無根拠のWeb複製を追加しない）。

- 専用`node test/izk_ut_073_commission_long_name_test.mjs` **1 PASS**。実ソース`renderRules`をVM実行し、120文字日本語+XSS風タグと300文字対象名がHTMLエスケープ済み**全文としてDOMに存在**、編集/削除ボタンを維持し、CSSのmin-width/ellipsis/バッジ幅/KPI折返しを検査。
- 自己観点S01〜S10は、Flex/min-width、文字省略、長い日本語、HTMLエスケープ、バッジ、金額/割合、KPI、編集/削除、変更差分限定、テスト/構文（以上すべてソース・VMで確認、実描画保留）の10件を個別追跡。横展開H01〜H10は、Native/Android/iOS（共通HTML）、Web prod/test（当該ページ不存在）、JA/EN、メニュー対象、従業員一覧、歩合サーバー不変更、XSS/連続英字、狭幅CSS、旧APK、他画面（最後の2項目は実機/追加ページ調査PENDING）を別々に確認。**全画面10巡完了や実機PASSの主張ではない**。
