# izakanpai: 変更・追加・外部環境変化に追従する品質ゲート

## 判定の正本

- 新しいソース/画面/テストは、既存の `change-impact.mjs`、`auto-generated-contracts.mjs`、`behavioral-test-admission.mjs` が自動検出する。機能ごとの個別ドライバー追加を前提にしない。
- **pre-commit** は最短の安全確認。変更済みテスト・直接参照テスト・構造/権限/日時/診断の共通ゲートを実行する。共通ソースの `ALL` 判定は **CIへ引き継ぐリスク判定**であり、コミット前に全131本を強制する意味ではない。
- pre-commit の自動テストは60秒のソフト予算を持つ。実行済みPASSと `DEFERRED_TO_PUSH_CI` を別に記録する。変更済みテストは予算超過でも必ず実行する。CIに存在しないテストは無言で延期できない。
- **Push/PR CI** は共通ソースなら従来どおり広範囲の fast テストと、独立した全49件S4業務テストを実行する。S4共有ソースのpre-commitは `DEFERRED_TO_CI` と記録し、PASSを作らない。
- **週次/リリース** は既存 `full-project-regression.yml` で全体・負例・隔離D1を実行する。ブラウザや隔離DBの結果をAndroid/iOS正式実機QAへ加算しない。

## 再実行とトラブルシュート

- `AUTO_CI_IMPACT` はソース影響、`AUTO_CI_HANDOFF` はコミット前/CIの分担、`AUTO_CI_CASE_RESULT` はテストごとの本当の実行時間と結果、`PRECOMMIT_GATE_RESULT` は実行/キャッシュ/延期の確定件数を記録する。
- 同一HEAD、完全一致のステージツリー、同一環境で実測PASSした証拠のみpre-commit再試行で再利用する。対象ファイル/ランタイム/フィクスチャ/実行環境が変わればキャッシュは失効する。証拠や外部イベントに依存するテストは毎回実行する。
- テスト自身のFAIL、タイムアウト、他のゲートのFAILをPASSに変換しない。コミットを高速化してもCI/リリース段階のFAILは別途修復必須。
- 新規API・新画面が直接業務テストを持たない場合、構造テストPASSのみでカバー済みにせず、既存 `behavioral-test-admission.mjs` により要修正とする。
- 外部Cloudflareやテナント追加はローカルPASSでは保証できない。本番配布時は現在のControl/物理D1インベントリ再取得、全店舗スキーマ照合、Workerソースフィンガープリント、本番RPC再照合を実施する。証拠不在はBLOCKEDとし、正常扱いしない。
- `npm run deploy` のpredeployは本番RPC実装の不一致を検知すると、既存の `build-common-tenant-worker-bindings --live` →本番設定生成→署名付きbundle/全店舗D1検証→共通Worker配布→再照合を自動実行する。現在の実装が一致すれば共通Workerの再配布を省略する。Cloudflare到達不能・証拠欠落・想定外の応答時は実際の配布を行わずFAILとする。

## 恒久回帰の証拠

- `node --test test/auto-ci/auto-discovery-contract.test.mjs test/auto-ci/change-impact-selection.test.mjs test/auto-ci/s4-execution-gate.test.mjs test/auto-ci/verified-pass-cache.test.mjs`
- `node --test test/auto-ci/common-worker-reconciliation.test.mjs`（本番変更を行わない注入テスト）
- 72ファイルの変更を再現するときは `git diff-tree --no-commit-id --name-only -r f2a35e1` の内容を `--changed=` に渡してpre-commitの選択結果を記録する。ローカルのログPASSは正式QA台帳へ転記しない。
