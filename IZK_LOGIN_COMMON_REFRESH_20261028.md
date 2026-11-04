# 管理ログイン画面にも既存共通「↻ 更新」を表示（2026-10-28）

## 発見・根因と受入条件

利用者報告: 管理ログイン画面に他画面と同じ共通更新ボタンがない。既存の `header.js` は全画面で1個の `izHeaderRefresh` を構築しているが、`manage.html` の未ログイン時だけ `pagePolicy().showRefresh` を false にしていた。新規ボタンの実装や認証APIの変更は不要。

受入条件: Native iOS/Android・Web本番・Web TESTで、ログイン前後とも同じヘッダー位置に更新ボタン1個を表示し、ユーザー操作でのみリロードする。入力済みログイン／パスワード変更値がある時は確認で取消可能、未保存のパスワードを持ち越し用ストレージへ保存しない。ログアウト後のユーザー情報は消えたままで、権限・戻る制限・Mutationナビゲーションガードは維持。日本語と英語に対応。

## 変更した共有資産

- `mobile-app/web/header.js`, `docs/yuwaku/header.js`, `docs/yuwaku/test/header.js`: ページ方針は `showRefresh: true`。既存 `izHeaderRefresh` のクリックに `refreshPage()` を割り当て、既存 `navigationAllowed()` を通す。表示中の `loginView` の入力値を検査し、事前確認を日本語/英語で出す。取消ならフォーム・URL・Documentを保持。承認なら `location.reload()`。トークン・パスワードの保存・送信処理は追加しない。
- Web本番/TEST `config.js` の共通ヘッダー版を `auth19 → auth20`、Service Workerのキャッシュを production `v286 → v287` / local TEST `v287 → v288` へ更新し、新旧混在のまま旧ヘッダーが残らないようにした。Web TESTのAPI接続先（localhost）や配布条件は変えない。
- `test/login_common_refresh_regression.test.mjs` を既存197工程のテストパイプラインへ追加。既存のヘッダー/ログアウト/アクセントテストを更新。Nativeの `index.html`/`manage.html` などログイン/管理ページ個別にボタンを複製しない。

## 実行済み（ローカル）

- Chromium実ブラウザ新専用テスト **4/4 PASS / exit0**: Native/Web本番/Web TESTの3ヘッダーでログイン時表示が1個、操作可、未保存情報の日本語確認取消、守るべきフィールドの残存、Mutation guard、英語確認承認後の実リロード、更新処理による `sessionStorage` 追加なし、Web本番/TEST同一ソース。
- 共通ヘッダー旧試験 **46チェックPASS / exit0**。ログアウト・プライバシー **164チェックPASS / exit0**。共通アクセント/ヘッダー遷移/二段ヘッダー/固定配置テスト **18/18 PASS**、専用テストと合わせて **22/22 PASS / exit0**。
- `test/izk_project_test_pipeline_contract_test.mjs` **197登録工程の契約確認PASS**。197工程全てを今回実行したという意味ではない。
- `npm run mobile:sync` **exit0**。Native source↔mobile-dist/iOS/Android各101ファイル一致・不一致0、iOS↔Android103一致、Web本番↔Web TESTの非環境差分ファイル88一致。`node test/distribution_parity_test.mjs` **exit0**。全体 `npm test` は未実行。
- `git diff --check` **exit0**。署名IPA/TestFlight配布・Android APK新規インストール・Web本番Deploy・実機正式QA/公式台帳更新は未実施。commit/push/deployは行わない。他担当の未コミット変更を保全。

## 自己レビュー（S01–S10、互いに異なるコード観点）

| 観点 | 対象/実証 | SOURCE |
|---|---|---|
| S01 根本の再現 | `pagePolicy(manage,false)` の従来 `showRefresh:false` が欠落の原因 | PASS |
| S02 ボタンの単一性 | `izHeaderRefresh` を既存 `button()` で1個生成し、追加DOMなし | PASS（Chromium） |
| S03 共通呼び出し | `refreshPage` は3ヘッダーで同じ業務なしリロード契約 | PASS（Chromium） |
| S04 保存境界 | フォーム値をストレージ・URL・API送信せず `confirm` の真偽値だけを使用 | PASS（ソース＋VM/Chromium） |
| S05 入力値保全 | 確認取消で入力中のID/パスワードとDocumentが保持される | PASS（Chromium） |
| S06 ナビゲーション安全 | `navigationAllowed()` がfalseなら確認もリロードも起こさない | PASS（Chromium） |
| S07 日本語/英語 | `currentLang` に従い日英文を切替え、共通ラベルも既存 `renderLanguage` に従う | PASS（Chromium） |
| S08 サインアウト境界 | `syncAuthDisplay` で本人情報を消し、更新ボタンだけ表示 | PASS（ログアウト164チェック） |
| S09 戻る/日時 | ログイン画面の戻る無効化とWeb時計非表示はそのまま | PASS（header46チェック） |
| S10 表示設計 | 360px等で共通二段ヘッダー位置を変更せず、固定アクション列を使う | PASS（header位置Chromium） |

## 横展開レビュー（H01–H10、独立の経路・条件）

| 観点 | 対象/実証 | SOURCE |
|---|---|---|
| H01 Native管理ログイン | `mobile-app/web/header.js` の未ログイン方針とクリック | PASS |
| H02 Native管理ログイン後 | 同じ共通ボタンを管理メニュー/業務画面でも継続 | PASS（pagePolicy） |
| H03 Web本番ログイン | `docs/yuwaku/header.js` 同型修正 | PASS（Chromium） |
| H04 Web TESTログイン | テスト環境用 `header.js` 同型修正、接続先変更なし | PASS（Chromium） |
| H05 Web間差分の排除 | Web本番とTESTの `header.js` 内容が完全一致 | PASS（distribution test） |
| H06 Webキャッシュ参照 | Web本番 `config.js` と `sw.js` の `auth20/v287` 整合 | PASS（089回帰） |
| H07 TESTキャッシュ参照 | Web TEST `config.js` と `sw.js` の `auth20/v288` 整合 | PASS（089回帰） |
| H08 iOS同梱 | Native先頭ソースとiOSアセットがbyte一致、新IPAは未配布 | PASS source / PENDING device |
| H09 Android同梱 | NativeソースとAndroidアセットがbyte一致、新APKは未配布 | PASS source / PENDING device |
| H10 言語・セッション・外部依存 | JA/EN、ログアウト/認証/Mutation guard、Web/native差分は共通テストで確認。実サービス通信・実端末は未実施 | PASS source / PENDING device |

**実際の完了状態:** ソース実装と限定回帰テスト、配布前の静的資産同期は完了。iOS/Android署名版・Web本番公開・正式QA判定は未完了。
