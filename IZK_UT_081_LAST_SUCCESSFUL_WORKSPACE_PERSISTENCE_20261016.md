# IZK-UT-081｜最後に成功した店舗IDをログアウト・再起動後も保持

> **2026-10-17 11:26 PHT 追加正式実機結果：** ユーザーがRealmeで`teat`にログインした後、`manage.html`（Android QA APK910019）でもPlaywrightで本物のログアウトボタンを押し、保存済み`workspaceId=teat`が削除されログインフォームの店舗IDが空欄になることを再現した。`QA2-KEEP-PT-INP-0097`を**公式FAILで受理**。ログアウト前後の真正PNG・構造化証拠：`test-results/qa-v2-evidence/playwright-realme/role5-inp0097-manage-logout-2026-10-17T03-26-37-332Z/formal-fail-evidence.json`。本件と既存`INP-0064`の**2件の正式FAIL**は同一根本欠陥の別入口。元のローカル修正はAPK910019に未反映。ログアウト試験によりRealmeのQAセッションは終了したため、以降の認証要ページ実行は再ログインが必要。安全性制限を迂回して再ログイン済みと偽らない。

**受付**：2026-10-16、ユーザーの明示仕様変更。**判定**：LOCAL SOURCE FIXED / WAIT_TEST（iOS・Android実機正式QA未実施）。**関連既存障害**：IZK-UT-071（旧「ログアウトで店舗IDも消去」仕様は本件で撤回。パスワード・ユーザー名・権限・session削除要件は継続）。

> **2026-10-17実機QA追加結果：** Android Realme QA APK **910019** で \`QA2-KEEP-PT-INP-0064\` をPlaywright実機操作し、ログイン成功済み\`teat\`の店舗IDがログアウト時に記憶キーから削除され、実ログインフォームが空欄になった。物理PNG3枚＋操作JSONを元ケース期待値と照合し、**公式RunnerがFAILを受理**。旧APK内の\`index.html\`/\`manage.html\`はまだ旧コード（\`logout()\`で\`WORKSPACE_KEY\`削除）。現行\`mobile-app/web/index.html\`/\`manage.html\`は修正済み、専用VM7/7 PASSだが、**未配布**。QAのID\`0097\`はログイン復旧未完につき元のNOT_RUN。公式FAILは実機旧APKの結果であり、現行ソース修正が誤りだったとの判定ではない。実機自動ログイン補助の再認証には成功していないため、偽の復旧完了報告はしない。

## 原因・要求・変更範囲

- `mobile-app/web/index.html`、`mobile-app/web/manage.html` の `window.logout` が、過去の071修正時に `[mgmtName, mgmtRole, HUB_CACHE_KEY, WORKSPACE_KEY]` をまとめて `localStorage.removeItem` していた。`scrubCredentialForms` はログイン画面上の `workspaceId` と `cpWorkspace` を空欄にし、`showLogin` は保存IDを戻さなかった。
- **新受入条件**：いったんログインが成功した店舗IDだけを `AUTH_STORAGE_PREFIX+'workspaceId'` に保存し、通常ログアウト・強制終了・再起動・bfcache復帰後にそのIDをログインフォームに復元。ログイン失敗・秘密情報の安全保存失敗・ログアウトと競合する遅延応答・新規店舗登録だけでは上書きしない。異なる店舗へログイン成功したときだけ新店舗IDへ更新する。
- Native共通の2入口のみを編集し、`API.acceptLogin` 完了・`authAttempt`/現token照合後に、**トークンに含まれる認証済み店舗を `API.currentStoreId()` から取得**して記憶する。`workspaceValue`/`rememberWorkspace` は正規ID `^[a-z0-9][a-z0-9-]{2,31}$` のみ受理。`showLogin()` で保存済み店舗IDを `workspaceId` および `cpWorkspace` に自動復元。ログアウトでは `WORKSPACE_KEY` だけ削除対象から外し、名前・role・トークン・権限・各パスワード・登録情報は即時に消去。
- 店舗新規登録は成功してもログインに成功するまで端末の「最後に成功した店舗」を置換しない。登録成功画面内で新IDを入力候補として示すことは引き続き許す。Web production/test `docs/yuwaku[/test]/manage.html` は店舗固定（workspace入力自体なし）のため変更なし。
- `test/izk_ut_071_logout_privacy_regression_test.mjs` の旧workspace削除期待だけを新仕様で更新し、既存ヘッダ078による非表示方法 `visibility:hidden + disabled` も現状コードに沿って検査。`test/mobile_navigation_test.mjs` の旧 `workspaceValue` 固定文字列期待を、正規形式検査付き関数に更新。公式QAレジスタ・本番DB/API・認可手順には手を加えていない。

## 自己レビュー S01–S10（各々独立の入口で再確認）

| No | 方法・実行証拠 | 判定 |
|---|---|---|
| S01 | 旧071証拠 `handoff/GPT_実機テスト障害台帳.md` と Native `logout` 配列の `WORKSPACE_KEY` を照合。現象「成功後も消える」の直接原因箇所を特定 | PASS source |
| S02 | `API.acceptLogin` がtoken形式/署名用フィールドの構造検証後 `NativeAuth` に安全保存し、その後で `API.currentStoreId()` がtokenの店を優先する順序をコードで検査 | PASS source |
| S03 | `workspaceValue` を文字長3–32、英数ハイフン、先頭英数に制限し、不正値・空値で前の成功IDを書き換えない実VMチェック | PASS VM |
| S04 | 成功ログイン後の `rememberWorkspace(API.currentStoreId())` がsession受理と競合世代検査の後だけ動くことを実 `window.doLogin` VMで確認 | PASS VM |
| S05 | `logout` 先行の認証/権限・フォーム消去は保持し、店舗IDだけ残す。旧071実 `window.logout` で148チェックPASS | PASS VM |
| S06 | `showLogin()` がログイン・パスワード変更双方の店舗ID欄を埋め、ユーザー名・パスワードなどの個人情報は空欄であることをログアウト前後に検査 | PASS VM |
| S07 | 新しいJSコンテキストで同じ `localStorage` を再読込するコールドスタートをVMで実行。最後の成功IDが復元されることを検査 | PASS VM |
| S08 | 入力先を別店舗に変えて認証が失敗しても、永続IDは最後の成功値のままという負例を実APIモックで確認 | PASS VM |
| S09 | Secure Storage書込み失敗と、ログアウト後に到着する遅延 `acceptLogin` 成功の競合を再現し、記憶した店舗ID/Hubが復活しないことをVMで確認 | PASS VM |
| S10 | Native `index.html`/`manage.html` のバイト一致を別検査し、専用7/7 PASS・旧071 148/148 PASS・auth client 272/272 PASS・`git diff --check` exit0を確認 | PASS offline |

## 横展開レビュー H01–H10（それぞれ別の画面・機能・データ経路）

| No | 対象・検査経路 | 判定 |
|---|---|---|
| H01 | Native管理入口 `index.html` → ワークスペース入力・ログイン成功・保存・logout→再表示。実コードVMで実行 | PASS |
| H02 | Native鏡像 `manage.html` を別sourceとしてVMで実行し、バイト一致と同じ保存/復元を検証 | PASS |
| H03 | `native-auth.js` のAccess/Refresh/ログアウトmarker削除の範囲を確認。今回の変更は資格情報の永続保存/失効ロジックを変えない | PASS source |
| H04 | `api.js::currentStoreId` の署名済token優先→有効な永続workspaceへのfallback、およびDB/API認証必須・テナントのserver-side認可の分離を監査 | PASS source |
| H05 | `docs/yuwaku/manage.html`：店固定・フォームにworkspaceIDなし・資格情報消去維持。旧071ログアウトVMチェックPASS | PASS |
| H06 | `docs/yuwaku/test/manage.html`：Web TESTのログアウトと本番ミラー、prefix分離を旧071回帰で検証 | PASS |
| H07 | Android/iOS共通の再起動/`pageshow`復帰→`scrubCredentialForms`で一度入力が消えても、次の`showLogin`で成功IDのみ再水和するソース経路を逆検索 | PASS source |
| H08 | `toggleChgPw` の店舗IDと `changePasswordByLogin` のstore引数、新規店舗 `registerStore` は未認証のため保存対象から除外したことを追跡 | PASS source |
| H09 | IZK-UT-071/078のヘッダ名 `IZHeader.syncAuthDisplay`・Refresh/Back匿名化・古いユーザーを復活させないことを旧071とヘッダ実Chromium回帰で確認 | PASS offline |
| H10 | 新店舗が認証失敗/期限切れ/secure write失敗でも旧値を保持し、別店舗で**ログイン成功したときに限り**置換される運用・テナント境界・他業務キャッシュへの影響を負例で検査 | PASS VM |

## 回帰・実機への引継ぎ

- `node --test test/izk_ut_081_last_success_workspace_persistence_test.mjs`：**7/7 PASS exit0**、Native2入口、成功→logout→再起動、失敗、再成功、登録、Secure Storage失敗、遅延応答、2入口のバイト一致。
- `node test/izk_ut_071_logout_privacy_regression_test.mjs`：**148/148 PASS exit0**。同テストは以前の「店舗IDも消す」旧期待をユーザー新仕様へ更新したが、ID/パスワード/role/token/権限は従前通り必ず消去する。
- `node test/auth_client_regression_test.mjs`：**272/272 PASS exit0**。`node test/qa2_header_two_row_regression_test.mjs`：**9/9 PASS exit0**。`git diff --check`対象ファイル：exit0。
- `node test/native_auth_test.mjs`：**別件でFAIL**（旧SW release名の静的期待）。この修正に関係のないWeb/PWAキャッシュ固定文字列で失敗し、全統合PASSとは宣言しない。以前から `mobile_navigation_test.mjs` はCommissionバリデーターの旧文字列期待で失敗する状態も確認済み。
- **正式再試験**：②担当が承認済み新APK/IPA上で、実店舗IDの成功ログイン→ログアウト→再ログイン画面、アプリ終了/再起動、強制ログアウト/期限切れ、店舗変更の失敗/成功、iPhone/Androidの両方、誤店舗へAPIが通らないこと、サインアウト直後の名前/パスワード消去を検証する。正式PASSは物理証拠と公式runner受理後のみ。
- ソースのみの修正。commit/push/build/deploy、実機操作、正式runner record、Windows停止タスクの再開、ストア提出は実施せず。
