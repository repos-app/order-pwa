# Izakanpai｜Google画像検索への導線とユーザー画像利用確認（2026-11-08）

## 完了条件と実測状況

- **SOURCE実装済**：Google画像検索をメニュー画像の主導線とし、利用者が外部サイトを開いて画像を選択・端末に保存し、既存ファイル選択から登録する。検索結果の自動取得・スクレイピング・自動保存はしない。
- **SOURCE実装済**：新規の手動ファイル／URL取込で画像利用権限・許可のチェックを要求する。未チェックは`saveMenuItem`を発行しない。AI生成画像と画像を変更しない商品編集は対象外。古いインストール済みクライアントの後方互換性を維持する。
- **SOURCE実装済**：新クライアントの確認済みアップロード後に、既存店舗別`op_log`へサーバー時刻、店舗、認証された実行者、確認バージョン、画像種別と商品名を記録する。バイナリ・外部画像URL・秘密情報を保存しない。ログ保存エラーでも成功済み商品保存を偽の失敗にはせず、`imageRightsRecorded:false`で利用者に警告する。
- **規約改訂SOURCE済**：`mobile-app/web/terms.html`と`docs/app/terms.html`に、検索結果≠利用許諾、登録する店舗の確認責任、権利者の通知窓口`admin@izakanpai.com`、事案確認後の停止・削除対応方針を日英併記。
- **既存基盤再利用**：Googleリンク`openImgSearch()`、端末ファイル、`fetchImageFromUrl`、`saveMenuItem`、R2削除、`op_log`。新たな検索APIキー、スクレイピング、DB migration、新画面、独自課金なし。
- **未実施**：Worker/Hostedのデプロイ、iOS/Androidビルド配布、iPhone操作のユーザー受入、実運用D1/R2での確認履歴、権利者からの実際の削除申立対応。従ってユーザー実機QAのPASSは**0件**、本番反映は**未実施**。

## 操作シナリオ

1. 商品名（英語名優先、次に日本語名、任意キーワード）で「Google画像検索」を利用者操作で開く。
2. 店舗は画像の出典・許諾を確認して端末に保存。Googleの結果をIzakanpaiが取得することはない。
3. 既存ファイル選択から任意の写真を指定し、利用権限・許可をチェックして保存。URL直接指定・旧素材検索からの選択も同一確認を要求。
4. 保存成功後、サーバーの`op_log`に`confirmMenuImageRights`を記録。監査記録だけ失敗した場合には警告する。保存できなかった操作は監査記録を生成しない。
5. 既存画像の変更なし、AI生成成功済みURL、前回送信の失敗応答と再操作は既存挙動を維持する。

## テスト証拠

- `node --test test/auto-ci/menu-google-user-rights.test.mjs`：**14/14 PASS、0 FAIL**。Google遷移とURLエンコード、保存前チェック、手動ファイル/URL、AI/変更なし、初期化、3配布面、サーバー記録、拒否系、後方互換、隔離SQLiteの別店舗ゼロ、監査エラー時の成功整合、利用規約を検証。故障注入：チェックガード消去、未登録店舗ID。
- `node --test test/auto-ci/menu-google-user-rights.test.mjs test/menu_image_feature_ui_test.mjs test/image_fetch_regression_test.mjs test/auto-ci/menu-image-search-query.test.mjs test/pixabay_retry_test.mjs test/menu_editor_save_single_roundtrip.test.mjs`：**65/65 PASS、0 FAIL**。初回FAILはテストの古いDOM/再送ID/コミッション・保存スタブで、実実装に合わせて修正して再実行。初回の失敗をPASSへ上書きしたわけではない。監査ACKなし（旧Workerなど）でも確認記録成功と表示しない条件を含む。
- `node --test test/gas_compat_smoke_test.mjs test/menu_editor_save_single_roundtrip.test.mjs test/menu_image_generation_credit_test.mjs test/menu_save_parallel_translation_perf_test.mjs test/auto-ci/menu-image-search-handler.test.mjs`：最終再実行 **25/25 PASS、0 FAIL**。このうちGAS互換スモーク内部の**572チェックもPASS**。`menu_editor_save_single_roundtrip`は上の65ケースにも含まれるため、単純に全テスト件数を合算しない。
- `node scripts/ci/critical-ui-preservation-gate.mjs`：**PASS**。共有Help/言語/更新/戻る/AI維持。
- `node test/public_url_external_browser_test.mjs`：**43チェックPASS**（既存共通外部ブラウザ契約、今回のGoogle iPhone実起動の証拠ではない）。
- `node test-results/menu-google-responsive-20261108.mjs`：Chrome headlessで320/360/390/430 CSS pxの4幅すべてGoogleボタン/検索欄の非重なり・横溢れなし。簡易DOM部分描画であり実iPhoneの証拠ではない。
- `git diff --check`：PASS。
- `node scripts/qa-modernization/business-journey-review.mjs --changed`：exit 0。結果は**CANDIDATE_NOT_FORMAL_QA**。今回のPASS数には算入しない。

## 独立自己レビュー10観点（SOURCE）

| 観点 | 実際の照合対象と確認結果 |
| --- | --- |
| S01 主導線 | 3配布面の`imgGoogleSearchPrimary`を直接確認。任意操作で開くボタンとして存在。PASS |
| S02 検索語 | `currentMenuImageQuery()`を実コード実行。任意語優先、空欄でEN/JAフォールバック。PASS |
| S03 Google URL | `encodeURIComponent`と`tbm=isch`を実ハンドラで検証。PASS |
| S04 外部画面 | `_blank` / `noopener,noreferrer`、Google APIによる自動収集なしを確認。PASS（iPhoneの実ブラウザ起動は別） |
| S05 手動ファイル | `mFile`選択時の確認表示、未チェックのRPCゼロを実ハンドラで検証。PASS |
| S06 URL取り込み | `URL_IMG_DATA`も確認必須、サーバーに`external_url`として渡す。PASS |
| S07 AI/編集の非干渉 | `GENERATED_IMAGE_URL`、画像無変更保存で余分なチェックなし。PASS |
| S08 ログ内容 | ログに店舗・担当者・商品・同意版があり、元画像バイナリ・URLがない。PASS |
| S09 ログ失敗 | `db.run`障害を注入、`imageRightsRecorded:false`かつ保存成功を維持。監査ACK未返却も成功と表示せず。PASS |
| S10 後方互換 | 不正な明示同意値は拒否、同意フィールドを送らない旧クライアントは従来経路を維持。PASS |

## 独立横展開10観点

| 観点 | 実際の照合対象と確認結果 |
| --- | --- |
| H01 Native | `mobile-app/web/menu_editor.html`のボタン/選択/保存/言語の一式。PASS（実機未確認） |
| H02 Hosted PROD | `docs/yuwaku/menu_editor.html`で同一ハンドラのケースを実行。PASS（公開未反映） |
| H03 Hosted TEST | `docs/yuwaku/test/menu_editor.html`で同一ハンドラのケースを実行。PASS（公開未反映） |
| H04 日本語 | Google手順、免責警告、確認ラベル、監査失敗文言のキー。PASS |
| H05 英語 | 同一キーの英語版、商品英語名フォールバック。PASS |
| H06 Native利用規約 | `mobile-app/web/terms.html`で外部検索・権利・通知。PASS |
| H07 Public利用規約 | `docs/app/terms.html`で同一趣旨・連絡先。PASS |
| H08 旧画像検索 | `searchMenuImagesV2`と候補選択を二次導線に保持。画像検索単体回帰PASS |
| H09 画像取得保護 | `fetchImageFromUrl`のサイズ・HTML排除、後着応答による画像上書き防止。画像取得回帰PASS |
| H10 共通ヘッダー/AI | 共有Help/言語/更新/戻る、AIポイントと生成フローを対象回帰。PASS |

## 権利侵害通知の運用と残件

権利者の連絡は既存の`admin@izakanpai.com`へ。受信後に対象の店舗・商品・画像URL・権利主張・対応日時を運営が確認し、店舗へ連絡して画像を停止/差し替える。店舗管理者は既存のメニュー画像更新・商品削除を利用し、既存R2削除処理を通す。変更後の実URLへの配信停止の確認が必要。**運営専用の強制画像停止UIや申立自動処理は今回新設していない**ため、これらの自動完結を主張しない。

## リリース前の確認

Google画像検索ボタンがiPhoneから開けること、検索から戻ってファイル選択できること、許諾チェックの未選択/選択、保存・再表示、日英切替、サーバーの店舗別`op_log`記録、別店舗への非漏洩、権利侵害時の画像削除・配信停止を実環境で確認する。新旧クライアントの混在期間は旧クライアントに同意UIがないため、サーバーの厳格な全件必須化は段階的な移行が別途必要。
