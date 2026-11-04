# IZK-UT-088｜Native共通ヘッダーから規約・プライバシー言語切替が動作しない

**発見** 2026-10-17 / **優先度** P2 / **状態** LOCAL SOURCE FIXED・QA APK未配布・物理再テスト待ち。

## 実機事実・正式QAとの区別

- Realme RMX3938、Android QA APK910019、Playwright。プライバシー `QA2-KEEP-PT-SCR-054`／規約 `QA2-KEEP-PT-SCR-084` の**別途品質検査**中に再現。
- URLに`?lang=ja`／`?lang=en`を付けた初期描画は、両ページとも日英の記事全文・タイトル・見出しセクション（Privacy各11／Terms各19）を正しく表示。720px実機で横溢れなし。各表示の実機PNG・SHA256、記事本文SHA256あり。
- Native共通`header.js`が旧`#langBtn`／元のBackボタンを非表示にし、`#izHeaderLang`／`#izHeaderBack`を表示。実際のユーザー操作として、**可視`#izHeaderLang`をタップ**したが`?lang=en`画面の文章・タイトル・`documentElement.lang`は`en`のまま。2画面とも再現。証拠`test-results/qa-v2-evidence/playwright-realme/role5-legal-source-bilingual-2026-10-17T03-30-48-738Z`。
- `header.js::switchLanguage`は`window.I18n.toggle`または`window.toggleLang`が無ければ`localStorage.lang`を反転して`location.reload()`。`legal.js::current()`は明示クエリ`?lang=en`を最優先するため、**毎回enへ戻る**。元のページの言語ボタンは`legal.js`に接続されているがNativeヘッダーによって非表示。これが根本原因。
- この不具合は言語切替の個別UI品質であり、元`PT-SCR-054/084`のライフサイクル原期待値（Back/Home/sleep/kill/通信復旧）そのものの失敗とは同一ではない。**両ケースを本件だけで正式FAILにしない**。現時点12 SCR正式NOT_RUN。

## 修正・影響範囲

- `mobile-app/web/legal.js`と`android/app/src/main/assets/public/legal.js`に`window.toggleLang`を公開。Native共通ヘッダーから呼ばれたときに**日英記事両方のstyle、html lang、言語ボタン、関連リンク、保存言語**を同時に切替。`?lang=`も同じ値へ`history.replaceState`してBack/reopen時の優先言語競合を防止。
- 旧`#langBtn`のイベントハンドラも同じ関数に統一。Native共通ヘッダー無しのページも同じ動作で、既存I18n・認証・金銭・DB処理は触らない。
- Nativeの2配布元は内容バイト同一（SHA256 `90b3ac5f24fdc0216eeddd431d9424b3496ca31bea38f6aa83bbb50c66d33fec2`）。Web`docs/yuwaku`／`test`には同じ日本語/英語法定ページが現存せず、`legal.js`のUI動作モデルも異なるため無差別コピーなし。
- `test/legal_article_language_toggle_regression_test.mjs`を実際の共通ヘッダー`window.toggleLang`呼出しと明示URL切替を検査するよう拡張。privacy/terms両画面のJA/EN全文表示・切替往復・別ページ遷移・localStorage復元のVM回帰PASS。既存`test/privacy_declaration_test.mjs`の**43/43 PASS**。**これらはローカル仮想DOMの試験**でありAPK910019の実機修正成功ではない。

## 自己レビュー10観点（実施したチェック／結果）

1. **S01 原因再現**：実機2ページでNative可視ボタン`#izHeaderLang`クリック後も`en`から変わらないことをスクリーン+DOM観測（FAIL→修正対象）。
2. **S02 逆方向コード追跡**：`header.js::switchLanguage`の関数探索`I18n → toggleLang → storage/reload`と`legal.js`非公開関数を照合。
3. **S03 URL優先**：`requested()`が`?lang`を第一優先するためstorage書換えだけでは解消しないことをコードと実機結果で確認。
4. **S04 完全記事切替**：`apply`が`article.lang-ja/en`両方のinline visibilityを一括更新することを既存VM試験で確認。
5. **S05 共通関数**：旧ボタンと新共通ヘッダーのイベント入口を`window.toggleLang`で統一し二重の言語状態生成をなくす。
6. **S06 日本語→英語**：Nativeヘッダー相当の`window.toggleLang()`で全文が英語、heading/html langがen、URLがlang=enになるVM試験PASS。
7. **S07 英語→日本語**：旧ボタンクリックで逆戻りし、全文とURLがjaになるVM試験PASS。
8. **S08 保存言語の再表示**：manual storage後に再DOMContentLoadedしたときの記事言語の一致をVM試験PASS。
9. **S09 例外遮断**：history APIが使えないときのcatchで画面全体の切替が不可能にならないよう、記事切替を先に実施。
10. **S10 配布同一性**：Native webソースとAndroid assetのSHA256を計算して同一であることを確認。

## 横展開レビュー10観点

1. **H01** `privacy.html`の旧ボタン`#langBtn`で日英表示をVM確認。
2. **H02** `privacy.html`の共通ヘッダー呼出し`window.toggleLang()`をVM確認。
3. **H03** `terms.html`の旧ボタンで日英表示をVM確認。
4. **H04** `terms.html`の共通ヘッダー呼出しをVM確認。
5. **H05** 共通`header.js`の`I18n`既存画面優先分岐は変更しない、と静的逆引き確認。
6. **H06** `?lang=ja`／`?lang=en`明示URLの元値とトグル後の整合をVM確認。
7. **H07** URLクエリの`lang`以外を保持したhistory置換でページのAPI URLは変化しない、と`URL.searchParams.set`のソース確認。
8. **H08** 旧表示ヘッダーhidden状態でも新`#izHeaderLang`の可視タップを優先するテスト条件へ変更し、実物旧APKのFAILは保全。
9. **H09** `docs/yuwaku`と`docs/yuwaku/test`の古い法定JSはNative専用の2ページとURL構成が違い、今回のコードを一律copyしないと配布面比較で確認。
10. **H10** 変更後に`privacy_declaration_test.mjs`43/43 PASS、法的全文とプライバシー説明項目の損傷なし。

**残件**：Android新QA APKへ署名・配布した後にRealme実機で2ページの可視共通ヘッダー操作とBack/reopenを再検証。Git commit/push、APK build/install、Worker deployなし。
