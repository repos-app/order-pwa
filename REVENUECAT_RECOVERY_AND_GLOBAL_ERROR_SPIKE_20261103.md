# RevenueCat検証済みWebhook復旧と共通エラー急増監視（2026-11-03）

## RevenueCat再処理の本番構成

- 既存Control Workerの15分Cron `runScheduledRevenueCatRecovery` を使用。新しいTask/Workerは作成しない。
- Production Control D1の `revenuecat_event_inbox`、`revenuecat_verified_replay` (0012)、`revenuecat_dispatch_attempts` (0013) を事前読戻し。2026-11-03時点でInbox 18件、再処理待ち0件、暗号化イベント0件、試行履歴0件。
- `REVENUECAT_WEBHOOK_SECRET` と `REVENUECAT_WEBHOOK_AUTH` は**Secret名の存在のみ**確認。内容は表示・コピーしない。
- `REVENUECAT_RECOVERY_ENABLED = 1` をControl本番varsに追加しデプロイ。受信署名/HMAC検証後のみAES-GCM暗号化した本文をControl D1へ保管し、失敗した配信のみ10分経過後に最大5件/巡回・12回まで再送する。7日超の暗号化本文は保持しない。
- 正常に適用済みの購入・サブスクリプションや顧客の残高を再作成しない。再処理0件は安全な待機状態で、実再送の正式PASSではない。

## 共通サーバー障害急増監視

- Control D1 `operational_diagnostics` と専用新規メタデータテーブル `operational_error_spike_alerts` (migration 0014) を使用し、業務正本や監査証跡は参照・削除・変更しない。
- Control 15分Cronごとに全店舗共通の固定エラー分類だけを集計する。直近15分の failed イベントが20件以上かつ前の15分に比べて3倍以上（さらに5件以上増）でアラート。絶対件数50件以上でもアラート。
- 既存 `sendPlatformEmail` と共有 `PLATFORM_EMAIL` Service Bindingを利用し、既存 `PLATFORM_SUPPORT_EMAIL` 宛て送信。原文、リクエスト本文、トークン、顧客ID・レシートをメールへ記載しない。
- D1の原子的通知claim、1時間の再送抑制、20分のstale claim復旧。送信失敗時にはエラー固定分類を保存してclaimを解放し、次回再試行。送信成功確認がなければ通知済み扱いしない。
- 管理画面 `https://izakanpai.com/admin.html` または `/admin/` の「サーバー共通障害ログ」から閲覧可能（既存Platform Admin認証必須）。15分件数、前15分件数、最終チェック・通知、最後の通知エラーだけを表示する。
- 実際に失敗件数が急増するまで実送信0件は正常であり、テストで作った20件以上のログを本番に投入して通知実績を偽造しない。

## 失敗時の境界・再確認

- `0014`適用前はCronから新しいアラートを動かさない。移行前D1 Time Travel bookmarkを記録し、移行後のテーブル/索引・既存ログ件数を独立SELECTで確認する。
- 本番Workflow検証では自動ビルド・モバイル公開を要求しない。Store Release Readinessは承認済み署名ビルド、真正QA証拠、承認ゲートが必要なため、事前条件未成立の実行をPASSとしない。
- 実再処理が発生した場合は `revenuecat_event_inbox` と `revenuecat_dispatch_attempts` の状態、encrypted replay queue の安全削除、店舗D1クレジット台帳を照合して正式な成功を確定する。
