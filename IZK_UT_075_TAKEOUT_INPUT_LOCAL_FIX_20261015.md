# IZK-UT-075 — テイクアウトの無言切詰め廃止（LOCAL、2026-10-15）

`src/takeout.js::submitTakeout`で`name`40、`phone`20、`pickup`20、`notes`120、`coupon`32文字が`sanitize(...).slice(0,N)`により、入力値から勝手に末尾が消えてから確定していた。**全5配布面**（Native`mobile-app/web/takeout.html`、Web本番`docs/yuwaku/takeout.html`、Web TEST`docs/yuwaku/test/takeout.html`、公開注文`docs/takeout/index.html`、公開注文TEST`docs/test/takeout/index.html`）のHTML`maxlength`も同じくpasteを無言で切り詰めていた。

**LOCAL修正**: 上記既存の業務上限だけを保存関数/直接APIで検証し、超過なら`name_too_long`等のエラーを返す。5画面の入力属性maxlengthを削除し、`paste`/`beforeinput`で選択範囲置換を考慮して明示JA/ENエラー・超過挿入だけ阻止・元値維持。`input/compositionend`と`confirmOrder`のRPC前でプログラム書込み/IME確定超過を検査。クーポン適用の別RPCの直前も同じ上限で拒否。`pickup`は選択式なので画面の自由入力を許容しないままサーバーの直接RPCを保護。既存の価格/税・クーポン処理/注文idempotency/店舗隔離は無変更。

**実テスト**: `node test/izk_ut_075_takeout_input_lengths_test.mjs` **6/6 PASS**。5面それぞれのHTMLから**実際のguard関数をNode VMで実行**し、上限ぴったり＋1のpaste拒否、置換可能、無言切詰め無し、IME入力妨害無し、programmatic超過では注文RPC前エラー、JA/EN選択の表示ソースと連携を確認。直接APIでは全5フィールド`max+1`を投げてDB書込み0、他クエリ前にエラーを返すことを独立確認。`git diff --check` PASS。新APK/ブラウザ操作・注文本番・実機QA PASSは取得していない。

## 10件の自己レビュー（各観点ごとに判定）

|ID|確認|結果|
|---|---|---|
|S01|5既存制約40/20/20/120/32の由来をAPI/UI両方で確認|PASS source|
|S02|APIで不正nameの末尾を削らず拒否|PASS direct|
|S03|APIのphone/pickup/notesを同じ保存前拒否へ|PASS direct|
|S04|APIのcouponは検証/課金処理前に拒否|PASS direct|
|S05|各画面paste過長阻止＋入力値不変|PASS VM×5|
|S06|各画面選択範囲置換が上限内なら許可|PASS VM×5|
|S07|IME合成中文字列を強制阻止しない|PASS VM×5、実機PENDING|
|S08|元値がプログラム設定で過長なら保存前エラー|PASS VM×5|
|S09|クーポン適用ボタンの別RPCも過長拒否|PASS source×5|
|S10|DOM/注文API/店舗隔離/旧バイナリ差分を区別|PASS source、配布PENDING|

## 10件の横展開レビュー

|ID|対象|結果|
|---|---|---|
|H01|Android Native WebView|PASS source/VM、APK PENDING|
|H02|iOS Native WebView|PASS source/VM、IPA PENDING|
|H03|Web production yuwaku|PASS source/VM、deploy PENDING|
|H04|Web TEST yuwaku|PASS source/VM、deploy PENDING|
|H05|公開takeout本番|PASS source/VM、deploy PENDING|
|H06|公開takeout TEST|PASS source/VM、deploy PENDING|
|H07|Backend直接API・DB write|PASS mock server 5異常値|
|H08|同一フォームJA/ENエラーとIME/貼付け|PASS source, device PENDING|
|H09|クーポンの別APIと二重送信ID|源コード変更なし、実機PENDING|
|H10|他の自由記述/メニュー/注文/印刷入力|入力台帳に継続記録、**未完了**|

**全914入力候補の修正完了・正常注文の実機PASSを意味しない。** 旧正式QA結果は不変更、commit/push/deploy/本番DB操作なし。
