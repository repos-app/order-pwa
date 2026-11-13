# 本番汎用エラーのログ強化・ソース全体監査

案件: IZK-UT-161 / 2026-11-13 (Asia/Manila)

## 完了条件と現状

- ローカルソース変更: 実施済み。汎用API応答は顧客へ機密情報を公開しないまま維持する。
- 運用ログ: src/publicErrors.js の共通ロガーに operation, traceId, errorName, errorCode, failureReason, sourceFrame, causeName, causeCode, causeReason を追加。例外メッセージ・SQL・個人ID・トークン・URLを記録しない。DBのテーブル/列不足、制約違反、busy、タイムアウト等を名称のない固定カテゴリに変換。
- 例外起点: src/index.js / gasApi.js / hybridPublicRouter.js / controlPlaneWorker.js / tenantProvisionerService.js / fatalAlertTailWorker.js / imageStorage.js と定期処理、CI/QA・リリース実行経路の既存catchを確認・補強。
- 汎用レスポンス: api_business_failed, internal_error, api_upstream_unavailable, http_5xx が発生した場合、既存traceに紐づく izakanpai_opaque_error_requires_root_trace をWorkers Logへ追加。原例外不明なら詳細を創作しない。
- 自動ゲート: scripts/ci/generic-error-logging-gate.mjs。bare generic console log、例外本文の無加工出力、原因を失う一部catchを検出。pre-commit と .github/workflows/auto-ui-coverage.yml（PR/main push）の両方でexit 1なら停止。POSの注文やHTTP処理自体は停止しない。
- 未実施: Git commit/push、GitHub Actions正式実行、本番Worker deploy、端末実機確認、過去障害の本番traceによる根本原因確定。ローカルテスト成功とは区別。

## 全体ソース監査

コマンド: node scripts/ci/generic-error-logging-gate.mjs

拡大監査: node scripts/ci/generic-error-logging-gate.mjs --audit-all

| 対象 | ファイル | 検出違反（変更後） |
| --- | ---: | ---: |
| 本番Worker src | 116 | 0 |
| CI/リリース | 45 | 0 |
| QA運用 scripts/qa-autonomy | 1218 | 0 |
| その他スクリプト scripts（重複なし） | 1065 | 0 |
| Native Web | 36 | 0 |
| Hosted Web | 44 | 0 |
| **実行ソース全体** | **2524** | **0** |
| テスト/実機QA証拠用ソース test（別監査） | 1290 | 73候補 |

一時生成ファイル scripts/.wrangler と node_modules は、正規ソースではなく上書きされるため除外。test の73候補は、意図的なエラー検出負例と古い単発デバッグ・実機QAケースの出力を含む。**テスト用コードの残件があるため全コードの完全ゼロ宣言ではない。** 製品と運用に到達する実行ソース2524ファイルを出荷ブロック対象とし、テスト用コードは別監査に表示する。

静的走査は対象パターンを検出するが、実際のCloudflareログ保存/相関の成功、すべての動的catch内処理の完全性は証明しない。重大な業務結果は既存Control D1/Workerログと業務readbackによる検証が必要。

## 実施したテスト（ローカルのみ）

- 新規ゲート、全操作診断、サーバー共通ログ、表示秘匿の4テスト: **25/25 PASS**。367種類の既存操作に対する2570分類シナリオを含むが正式実機QAではない。
- Header/Control診断/配布ゲート/Cron/iOS・Android QA補助の7テスト: **57/57 PASS**。
- node scripts/ci/critical-ui-preservation-gate.mjs: exit 0。
- node scripts/ci/generic-error-logging-gate.mjs: 2524ファイル、違反0、exit 0。
- git diff --check: exit 0。並行開発の既存差分は保護。

## 本番確認の残件

別途配布許可・反映後、既存Control D1 diagnostics、Workers Log、アラートに同一traceの原因分類と業務結果が揃うか独立照合する。汎用応答に対応する起点ログがない場合は未確定として保持する。既発生の本番エラーの根本原因は過去ログから依然確定しておらず、新しいソースのみで過去の例外詳細を復元できない。
