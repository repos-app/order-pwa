# IZK-UT-179 — v1.1更新通知の登録件数を変更件数として表示しない

## 原因と再発防止

- 既存 `scripts/release/announcement-draft.mjs` は変更ファイル名から抽象的な機能分類だけを生成し、コミット単位でControl D1に公開していた。
- `src/announcementReadState.js` が同一リリースのコミット通知をまとめる際に `（N件）` を追記し、同じ定型文を結合した。そのためv1.1の18件が具体的な機能変更18項目であるかのように見えた。
- `src/releaseAnnouncementSummary.js` が個別の確定変更点を抽出し、見出し・分類だけの自動文・重複・複数回の注意書きを除外する。詳細が無い場合は虚偽の変更点を作らず未登録と表示する。
- `src/announcementReadState.js` は内部通知件数を顧客向けタイトルに付けず、既存の認証済み既読処理、店舗/従業員分離、グループACKは変更しない。
- `mobile-app/web/announcement-center.js` とWeb本番/TESTの同名ファイルに同じフォールバックを実装。ヘッダー・Service Workerの参照を `v=15` に変更。
- `scripts/release/announcement-draft.mjs` とpreflightは具体的なJA/ENレビュー内容の無い自動案内を `SKIPPED_REVIEW_REQUIRED` として公開前に停止する。レビュー済み `docs/releases/reviewed.json` が実際に変更されたプッシュのみ自動検出し、古い文面は再使用しない。
- v1.1の具体的な主な変更点は既存の `test-results/release-notices/reviewed.json` と `reviewed-20261112.json` を根拠として7項目に統合。配布状況による差は1回だけ明示。

## ローカル検証

- 2026-11-17: `node --test test/announcement_center_ui_test.mjs test/announcement_read_crosscheck_10_test.mjs test/announcement_release_grouping_backend_test.mjs test/auto-ci/release-announcement-draft.test.mjs test/auto-ci/release-announcement-d1-preflight.test.mjs` — **35/35 PASS、0 FAIL、exit 0**。
- 18件の自動通知＋レビュー済み2通知の重複と未読集約、レビュー済みゼロ件、7件/81件の既読まとめ、日英、v1.1/v1.2分離、3配布面のChromium画面操作をカバー。
- `node scripts/ci/critical-ui-preservation-gate.mjs` — exit 0。
- 3配布面のannouncement-center.jsのSHA-256一致、関連git差分 `diff --check` — exit 0。
- レビューでたどった独立経路: `mobile-app/web/header.js` / `docs/yuwaku/header.js` / `docs/yuwaku/test/header.js` → announcement-center、各SWキャッシュ参照、`src/gasApi.js` のRPC、`src/announcementReadState.js` の認証・既読処理、`src/platformAnnouncements.js` のControl D1公開カタログ、生成スクリプトとreadback。

## 作業状態と未実施

- ソース実装・上記ローカル回帰: 完了。障害受付: `IZK-UT-179`。
- **Git commit/push 0、Worker deploy 0、Control D1本番変更0、iOS/Androidビルド/配布0、本人実機確認0**。既存の他案件の未コミット差分には触れない。
- 原本 v1.1 (166) のTestFlightアプリに対する改善反映と、Control D1にレビュー済み文面を実際に公開する確認は未実施。iOS/Androidビルドは別途明示許可が必要。
- 本書のコードレビューと回帰テストを、正式実機PASSや本番反映済みの証拠とは扱わない。案件別S01–S10/H01–H10の全巡証拠は別途未完了。
