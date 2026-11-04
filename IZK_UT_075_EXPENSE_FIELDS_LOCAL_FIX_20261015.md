# IZK-UT-075 — 経費管理の無言切詰め廃止（LOCAL）

2026-10-15、`src/expenses.js::saveExpense`と3配布面`expenses.html`を対応。**既存API上限**: 品目80字・備考200字・購入者60字を踏襲。元の`sanitize().slice(0,N)`はユーザーが入力した末尾を勝手に削除して保存していたため、保存前に`item_too_long`/`memo_too_long`/`purchaser_too_long`を返す。日時`YYYY-MM-DD`に余分な尾部がある場合も`invalid_date`で拒否（先頭10字だけを日付として扱わない）。領収書イメージIDも既存2048字の無言切詰めではなく`invalid_receipt_image`。

Native`mobile-app/web/expenses.html`、Web本番`docs/yuwaku/expenses.html`、Web TEST`docs/yuwaku/test/expenses.html`では、paste/beforeinputの元値と選択範囲を確認して**上限超過時だけ挿入を止め、日英で入力長エラーを表示**。IME合成を強制遮断せず、合成確定/プログラム書き込みでは保存前再検証。元値・一覧/画像・DB上の既存品目は勝手に修正・消去しない。関連長文カードCSSの変更は`docs/IZK_UT_073_EXPENSE_LONG_TEXT_FIX_20261015.md`で別途追跡。

**証拠**: `node test/izk_ut_075_expense_fields_test.mjs` **4/4 PASS**。実HTMLガードをNode VMで3面実行し、上限ぴったりの後に1字pasteするとエラー/阻止、1字選択範囲置換は受理、プログラム設定max+1は保存前エラー。API直呼びは3文字入力と日付・image ID過長を全部SQL読書き前に拒否。これだけでAndroid/iOS実画面やCloudflare production SQLの正しさを証明したわけではない。

## 自己レビュー10観点

| No | 判定内容 | 結果 |
|---|---|---|
| S01 | 既存DB保存仕様と3文字列の元上限を確認 | PASS source |
| S02 | サーバー`item`過長拒否、入力値を省略しない | PASS direct |
| S03 | サーバー`memo`過長拒否 | PASS direct |
| S04 | サーバー`purchaser`過長拒否 | PASS direct |
| S05 | 日付10字の前方だけを採用する脆弱性を排除 | PASS direct |
| S06 | receipt image IDの不正な末尾欠落を排除 | PASS direct |
| S07 | 元文字超過でDB読書き0をモックで確認 | PASS direct |
| S08 | paste、選択範囲置換の正常/拒否境界 | PASS VM×3 |
| S09 | プログラム値＋IME確定時も保存前エラー | PASS source/VM、物理IME PENDING |
| S10 | Native/Web/TESTのJSとCSSを局所改修、形式差の無断変更なし | PASS source、ビルドPENDING |

## 横展開レビュー10観点

| No | 対象/経路 | 結果 |
|---|---|---|
| H01 | Native Android同梱expenses.html | PASS source/VM、APK PENDING |
| H02 | Native iOS同梱expenses.html | PASS source/VM、IPA PENDING |
| H03 | Web本番expenses.html | PASS source/VM、deploy PENDING |
| H04 | Web TEST expenses.html | PASS source/VM、deploy PENDING |
| H05 | 同画面品目入力/カード一覧の値保持 | JS不変/先行073 VM PASS、実描画PENDING |
| H06 | 備考/購入者の長文折返し/入力長 | PASS CSS+VM、実描画PENDING |
| H07 | 店舗ID認証/他店書込み分離 | DB APIの既存storeId契約に無変更、live PENDING |
| H08 | 領収書アップロード/画像閲覧 | イメージIDの不正超過を拒否、実R2 PENDING |
| H09 | 売上/利益計算・金額丸め | 既存source無変更、関連回帰PENDING |
| H10 | 仕入/Purchasing・POS入力の別上限 | `IZK_UT_075_INPUT_FIELD_INVENTORY`に追跡、**追加調査PENDING** |

**重要**: 本修正は3配布面・APIのローカル修正。コミット/プッシュ/デプロイ/DB migration/公式QA stateには反映していない。`IZK-UT-075`は全入力候補/実機未完了につきOPEN維持。
