# IZK-UT-083｜店舗・ログインID変更時に以前の自動補完資格情報が残る

**発見** 2026-10-17 / **優先度** P1 High（端末上の資格情報露出・意図しない再保存の危険） / **状態** LOCAL SOURCE FIXED・WAIT_TEST / **既存関連** IZK-UT-081・082。

## 現象・再現と影響

izakanpai POS Native管理ログインで、IZK-UT-082に追加した「ログインID・パスワードを保存する」機能に新しい欠陥を発見。店舗 `teat` の保存ログインID `staff1` と保存パスワードを自動補完後、店舗欄を別の店舗IDに編集しても、前店舗の値が入力欄に残り得る。

**旧コードの直接原因**：`mobile-app/web/remember-login.js::restore()`が `credential = null; filledPassword = ''` と自動補完の由来情報を先に破棄したため、別店舗へ移行する前に旧値を消すことができなかった。ログインIDの自動補完には削除対象を追跡するマーカー自体がなかった。`workspaceId` は `change` イベントのみで反応し、入力途中は失効していない。加えて別ログインIDを入力しても「パスワード保存」チェックがONのままで、**保存した覚えのない別ユーザーのパスワードを保存し得る**状態だった。

これは**他店舗サーバーデータ流出を確認したという意味ではない**。クライアントの表示・オプトイン同意・端末保管スコープの問題。直前のIZK-UT-082自体は新APK/IPA未配布のため、現行配布済み端末に本不具合が存在するとは未確認。

## 修正・スコープ

- **変更した製品ソース**：`mobile-app/web/remember-login.js` のみ。Native管理画面 `index.html` / `manage.html` は同じ共有スクリプトを既に読み込む。Native iOS/Androidとも反映対象。Web本番/TESTはNative専用記憶機能を読まず変更なし。
- `filledLoginId` を新設し、プログラムによって補完したログインIDを追跡。`clearAutoFilledIdentity()` は由来マーカーと現在の欄が一致する時だけ消去し、**ユーザーが手入力した別のログインIDを無断消去しない**。
- `restore()`で自動補完元を破棄する**前**に、前店舗の自動補完IDとパスワードを消去する。保存済みIDの店舗が現在店舗と一致した時だけ再補完。
- `workspaceId` の `input` 時点で世代番号をインクリメントし自動補完値・チェックを即時クリア。`change`時には現在店舗の保存情報のみ再読込み。
- `loginId` の `input` 時、保存先アカウントと一致しなくなった場合は「パスワードを保存」のチェックを**OFFへ戻す**。新ログインIDでの保存は新たな明示チェックが必要。同じIDへ戻しても暗黙再同意しない。
- Keychain/Keystoreの実パスワード削除はユーザーのチェック解除・パスワード変更・パスワード保存を選ばないログイン成功時の既存処理に委任。店舗IDを変更する**だけ**ではユーザーが明示的に保存した鍵の削除はせず、現在フォームへの自動補完を抑止する。旧token削除・店舗権限・APIは変更なし。

## まず失敗を確認 → 修正後の再試験

1. 修正前ソースの `restore()` に対し `security: switching tenant after autofill ...` を追加。**1ケースFAILを確認**（ログインID `'staff1' !== ''`）。
2. 店舗切替時の自動補完クリアを実装。既存と追加の専用ケースは10/10 PASS。
3. `security: changing saved login ID revokes password opt-in`を追加し、**修正前の当該経路でFAILを確認**（別ユーザーに切り替えてもチェック `true`）。
4. ID変更時のパスワード保存チェックの再同意制御を実装。旧テストの「元IDに戻せば自動補完」という期待を、安全な「再度チェックONが必要」へ訂正。
5. さらに `workspace` を入力中に消去する負例、未完了のSecure Storage応答を破棄する負例、手入力IDを保護する負例と、**実ChromiumのブラウザInputイベント**による再現を追加。最終専用 **14/14 PASS、exit0**。

## 自己レビュー S01–S10（方法が異なる独立観点）

| 巡 | 確認したコード・手法と証拠 | 判定 |
|---|---|---|
| S01 | 修正前 `restore()` のマーカー消去順を読むだけでなく、実JS VMの店舗切替負例で元IDが残るFAILを確定 | FAIL再現→修正PASS |
| S02 | 自動補完IDの出所を `filledLoginId` で保持し、自動/手入力を区別する分岐をソース確認 | PASS source |
| S03 | パスワード自動補完と手入力値が一致する場合のみ消す境界を`clearAutoFilledIdentity`の条件とVMで検証 | PASS VM |
| S04 | 店舗変更`input`（フォーカスがある状態）で再描画待ちなしにID/PWが空になることを実Chromiumで測定 | PASS Chromium |
| S05 | 店舗変更`change`／blurで保存情報読込が再実行されても、違う店舗のVault値を補完しないことを実Chromiumで確認 | PASS Chromium |
| S06 | 旧NativeAuth読込のPromiseが店舗変更後に解決する競合を遅延制御し、`generation`比較で再補完を拒絶することをVM検証 | PASS VM |
| S07 | ID変更時にパスワード保存チェックがONのまま残る旧問題を別の赤テストで確定。修正でOFFへ戻り、再同意なしに別IDのパスワードを保存しないことを検証 | FAIL再現→修正PASS |
| S08 | 元IDへ戻した時にも自動再同意しない一方、ユーザーがチェックを再選択すると元Vault値が読めることを負例/正例で確認 | PASS VM |
| S09 | ログインIDを手入力してから店舗IDを変えた場合に手入力IDを残すことを別ケースで確認。保存由来のIDだけを消して過剰消去しない | PASS VM |
| S10 | `node --test test/izk_ut_082_remember_login_optin_test.mjs` **14/14 PASS**、JS構文検査PASS、差分空白検査PASS、ソースSHA採取 | PASS offline |

## 横展開 H01–H10（画面、プラットフォーム、認証境界の別経路）

| 巡 | 範囲／アプローチ | 判定 |
|---|---|---|
| H01 | `mobile-app/web/index.html`における保存チェックとscript読込 → 共通remember JSへ連結を静的逆引き | PASS source |
| H02 | `mobile-app/web/manage.html`の同構造・ID/Password入力先の参照を独立逆引きし、別コピーのrememberロジックが無いことを確認 | PASS source |
| H03 | iOS Native `native-auth.js`のdevice-only Keychain項目とtokenの別Keyを確認。今回のUI修正がsession失効処理を変えていないことを検査 | PASS source/VM |
| H04 | Android Native `native-auth.js`の同じSecureStorage境界を検査。NodeのNative pluginモックで保存/削除が別キーであることを検査 | PASS VM |
| H05 | Web production `docs/yuwaku`の管理入口にNative-only remember-login読み込みが無いことを独立検索 | PASS source |
| H06 | Web TEST `docs/yuwaku/test`の管理入口にNative-only remember-login読み込みが無いことを独立検索 | PASS source |
| H07 | IZK-UT-081の最後の成功店舗ID永続化と、店舗入力変更時のフォーム資格情報消去を区別（成功記憶のキーは今回消さない） | PASS 7/7 legacy VM |
| H08 | IZK-UT-071のlogout時資格情報削除・匿名化と今回のフォームクリアを併走検査 | PASS 148/148 legacy |
| H09 | `auth_client_regression_test` によるtoken/tenant処理272件を併走し、認可のAPI側ロジック未変更を確認 | PASS 272/272 legacy |
| H10 | 保存チェック配置の既存Chromium 320/360/430 CSS幅と新Chromiumの実DOM input/change経路を独立試験。iOS/Android**実機**表示・Keychain/Keystoreは正式再試験待ち | PASS local / physical PENDING |

## 残課題・再試験条件

- 原因はローカル新機能の未配布差分であり、物理APK/IPAでの再現はしていない。**実機正式PASSではない**。
- 修正版APK/IPAのビルド身元確定後、Android共通Playwright runner/iPhone例外transportで「店舗A・保存ON→ログアウト→店舗Bに切替」「Aの保存ユーザーID変更→Bで非保存ログイン」「手入力ユーザーは保持」「遅延secure storage」「端末回転・IME・再起動」を独立観測する。
- 実機観測前に`Keychain/Keystore`が本物の端末で読めること、旧ビルドと修正ビルドのSHA、保存解除後のVault消去、token失効を確認。**Git commit/push・APK/IPA build・deploy・ストア提出・公式QA claim/record・停止タスク起動は実施しない**。
