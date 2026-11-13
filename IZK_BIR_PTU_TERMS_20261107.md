# izakanpai 利用規約：BIR印刷物・PTU責任分界（2026-11-07）

## 決定事項と完了条件

- izakanpaiのレシート・注文票・会計明細は税務上の正式Sales Invoiceではなく、注文・金額確認／内部管理用の参考書類。
- 正式な税務Invoiceは導入店舗がBIR登録済み帳票など適法な別手段で発行・保管する。
- BIR登録・PTU（Permit to Use）の取得要否の判断、必要な申請・届出・法令遵守は各導入店舗の責任。PTU不要を保証しない。
- izakanpai運営者はBIR認定や店舗のPTU申請代行を提供しない。
- 利用規約（公開WebとNativeの日英）への記載、規約改定日の整合、登録時の同意版記録が今回のsource完了条件。

## ソース変更

- `docs/app/terms.html`、`mobile-app/web/terms.html`：第3条直後へ3-1項を日英追記。利用規約のみ改定日を2026-11-07へ変更。
- `mobile-app/web/index.html`、`mobile-app/web/manage.html`：登録時に送るTerms版を2026-11-07へ更新。プライバシーポリシーは従来版を維持。
- `src/onboarding.js`：最新版を認識したクライアントだけ新しい同意版で記録し、既存アプリなど古い登録経路は2026-10-05として記録。ユーザーが見ていない改定版に同意したという虚偽の記録を避ける。
- `android/app/src/main/assets/public`、`ios/App/App/public`：上記Native3ファイルを既存一次ソースからローカル同期。両ディレクトリはGit管理の一次ソースではなく、ビルド・配布済みの証拠ではない。
- `test/privacy_declaration_test.mjs`、`test/gas_compat_smoke_test.mjs`：BIR/PTU日英文言と改定版の整合、最新版の登録記録を確認。

## 自己レビュー（source、独立した10観点）

| 観点 | ソースで確認した事項 | 判定 |
|---|---|---|
| S01 | 第2条の既存非認定注意と第3-1条が矛盾しない | PASS |
| S02 | 参考レシートを正式Sales Invoiceと誤認させない | PASS |
| S03 | 別途発行する正式Invoiceと保存責任を明記 | PASS |
| S04 | PTU取得要否は店舗が判断するが「任意」とは書かない | PASS |
| S05 | 必要な申請・税務順守は店舗が実施すると明記 | PASS |
| S06 | 開発者のBIR認定取得・PTU申請代行を提供しないと明記 | PASS |
| S07 | RDOへの確認案内を日英に設置 | PASS |
| S08 | 日本語と英語の法的責任範囲が対応 | PASS |
| S09 | 規約版と最終更新日2026-11-07が一致 | PASS |
| S10 | 旧クライアントが新規約を既読と誤記録しない分岐を設置 | PASS（ソース・静的回帰） |

## 横展開レビュー（source、独立した10観点）

| 観点 | 確認内容 | 判定 |
|---|---|---|
| H01 | Native一次 `mobile-app/web/terms.html` の日英記事 | PASS |
| H02 | 公開Web `docs/app/terms.html` の異なるレイアウトと日英記事 | PASS |
| H03 | Android内蔵 `terms.html` の一次ソースとのSHA一致 | PASS（ローカルのみ） |
| H04 | iOS内蔵 `terms.html` の一次ソースとのSHA一致 | PASS（ローカルのみ） |
| H05 | Native `index.html` と `manage.html` の同意版一致 | PASS |
| H06 | iOS/Android内蔵 `index.html`/`manage.html` の一次ソースとのSHA一致 | PASS（ローカルのみ） |
| H07 | サーバー `src/onboarding.js` の旧版・新版区別 | PASS（ソース確認） |
| H08 | GAS互換登録の実SQLite回帰で新版保存 | PASS（561件の中の1件） |
| H09 | Nativeの規約記事の日英切替（VM既存テスト） | PASS |
| H10 | 旧記事の残存経路と別の公開配布面を検索。法定規約は前記2ソース、yuwaku/testに同等の規約HTMLなし | PASS |

## テスト・配布状態

- `node test/privacy_declaration_test.mjs`：**48/48 PASS、exit 0**（新規約文言・版・旧クライアント静的分岐を含む）。
- `node test/legal_article_language_toggle_regression_test.mjs`：**PASS、exit 0**（Native規約・プライバシー記事のJA/EN切替）。
- `node test/gas_compat_smoke_test.mjs`：**561/561 PASS、exit 0**（実SQLite。新版登録保存を含む。旧版登録の独立実行は未実施）。
- `node --check`（関連JS）と`git diff --check`：exit 0。
- **未実施**：commit、push、公開Web配信、Worker deploy、iOS/Android新ビルド・配布、実機正式QA。正式PASS加算0。配布行為は別途承認が必要。モバイルビルドは新しい対象明示の許可が必要。
- 税務上のシステム区分やPTUの取得要否は店舗用途によって異なる。条文は個別店舗に対する法的結論を提供せず、BIR/RDOへの確認を求める。
