# 2026-11-08 発注履歴 UTC 8時間ずれ修正（SOURCE）

## 事象と根因

- 2026-11-08 03:49頃のiPhone操作後、発注履歴に「2026-11-07 19:48:35」。発注先はテスト発注先、品目はサンミゲル・ライト1本。フィリピン時間より8時間前。
- migrations/0044_purchase_orders.sql で purchase_orders.created_at は SQLite datetime('now')＝UTC（Zなし）。
- src/purchaseOrders.js は同値を createdAt で返す。DB保存は変えなくてよい。
- mobile-app/web と docs/yuwaku（本番・TEST）の purchasing.html は旧実装で esc(po.createdAt) を直接描画。根因を特定。
- 端末の現在のD1レコード読み戻し・本番配信の実地検証は未実施。画面とソースからの原因特定。

## 変更

- 上記3面で既存 date-display.js?v=auth5 をconfigより先に読み込み、DateDisplay.formatUtcDateTime(po.createdAt) で店舗設定の IANA timezone / dateFormat を適用。
- PO_HISTORY をキャッシュし、初期表示・更新・I18nの地域設定非同期反映時に描画。再描画時に不要なDB読込を増やさない。エラー時は履歴キャッシュを破棄。
- UTCのDB保存、発注ID、冪等性、メール送信と業務内容は変更しない。

## 回帰（実行済）

- node --test test/auto-ci/purchasing-po-history-timezone.test.mjs test/purchase_orders_durable_test.mjs test/purchase_order_ui_record_before_email_test.mjs test/izk_ut_091_utc_date_display_test.mjs：10/10 PASS、FAIL0、exit0。
- 3面の日時テスト：UTC 2026-11-07 19:48:35 → PH 11/08/2026 03:48:35、JP 2026/11/08 04:48:35、GB 07/11/2026 19:48:35、US東部 11/07/2026 14:48:35。品目、言語、空一覧、XSSエスケープと再描画を検証。
- 故障注入：UTC変換を生値出力に置換すると旧表示が再現し、正しい日時期待値に不一致となることを確認。
- node test/date_display_test.mjs：34/34 PASS、exit0。
- node --test test/auto-ci/purchasing-language-actions.test.mjs：1/1 PASS、exit0。
- node scripts/ci/critical-ui-preservation-gate.mjs：PASS、exit0。
- git diff --check：exit0（他担当の未コミットファイルに改行警告あり）。

## 自己レビュー 10観点（ソースと実行済テストに基づく、正式実機QAではない）

| 観点 | 結果・根拠 |
|---|---|
| S01 現象再現 | PASS：故障注入でUTC直接表示を再現 |
| S02 原因位置 | PASS：3面の同型表示処理を特定 |
| S03 保存時刻の意味 | PASS：0044 migrationとsrc/purchaseOrders.jsを確認 |
| S04 共通部品 | PASS：既存のformatUtcDateTimeを使用 |
| S05 読込順 | PASS：3面ともconfigより前の同期読込をテスト |
| S06 日付形式 | PASS：PH/JP/GB/USの実行期待値一致 |
| S07 非同期設定 | PASS：I18n callbackから再描画を確認 |
| S08 表示内容 | PASS：品目・数量・空一覧・HTMLエスケープ検証 |
| S09 障害時 | PASS：RPC失敗時のエラー表示とキャッシュ無効化をコード確認 |
| S10 データ保全 | PASS：DB/作成/メール無変更、PO永続化テスト成功 |

## 独立横展開 10観点（別入口の比較・負例・配布面を確認）

| 観点 | 結果・根拠 |
|---|---|
| H01 Native | PASS：Native一次ソースと実行テスト |
| H02 Web本番 | PASS：Web本番の別実行テスト |
| H03 Web TEST | PASS：Web TESTの別実行テスト |
| H04 他日時の区別 | PASS：日時共通APIのUTCとローカル壁時計の使い分けを確認 |
| H05 PH UTC+8 | PASS：翌日03:48:35を検証 |
| H06 JP UTC+9 | PASS：翌日04:48:35を検証、8時間固定でない |
| H07 GB日付形式 | PASS：11月UTC+0、DD/MM/YYYYを検証 |
| H08 US DST境界側 | PASS：11月標準時UTC-5、MM/DD/YYYYを検証 |
| H09 言語・地域再描画 | PASS：JA/ENブラウザ＋変更時の再描画 |
| H10 旧コード残存とUI保全 | PASS：3面の生UTC表示を除去、共通UI保全ゲート成功 |

## 完了境界

- SOURCE修正、関連ローカルテストのみ完了。正式QA PASS増分0。
- 未実施：commit/push、Webデプロイ、モバイル資材同期、iOS/Androidビルド・配布、iPhone現物確認、ライブD1照合、正式実機QA。
- iPhoneアプリへの反映には新しい配布物が必要。モバイルビルド・配布の新規明示許可ゲートを維持する。
