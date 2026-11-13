# izakanpai リリース高速化（2026-11-08）

## 原因

- 2026-11-07の3 Worker本番配備自体は合計約43秒。長時間化の主因は、コミット前の全件ブラウザ/UIテスト・21件のS4業務シナリオ・220件超のnpmテストと旧SQLite fixture不整合の個別修正。
- 全13店舗は既に共有Gateway Workerを利用中。13店舗にWorkerを配備する必要はない。
- 旧pre-commitは、src/の小変更でも、全auto-ciテストおよびChromiumを含む3個の回帰スイートを毎回起動する。

## 実装済み

1. **高速コミット検証**：既存の自動発見テストランナーに --precommit を追加。S2/S4の統合テストと重い日本語/英語負例注入テストだけをEXTENDED扱いし、通常コミットでは省略する。これらのテストファイル自体やQAシナリオのソースを変更した場合にはコミット時にも実行する。新規テストはデフォルトで自動選択。
2. **全件テストは維持**：従来の npm test とPush CIでは、EXTENDEDテストも全て実行する。3つの既存ブラウザ回帰スイートもCIへ移管し、full-project-regression.ymlでmainソース更新時のnpm全件テストを別ジョブとして追加した。CI結果は正式実機QAと区別する。
3. **Worker差分配備の判定**：scripts/release/worker-impact.mjsで実際のESM import/export依存グラフから共通Gateway・Control・店舗作成Provisioner・公開APIの対象を自動算出する。店舗別Workerは作らない。文書のみなら対象Workerは0、WebやiOS画面のみならWorkerは0（ただし別途フロントエンド配布が必要）。未登録の動的srcモジュールは全Workerに広げて配備を自動拒否。DBマイグレーション変更は手動スキーマレビューが必要。
4. **安全な差分配備スクリプト**：scripts/release/deploy-impacted-workers.mjsはデフォルトで計画表示のみ。明示的な --base=SHA と --execute-production が必要。mainブランチ・Git clean・push済みHEADの確認、ローカル共通ソース・SQL・GAS互換テスト、各対象Workerのdry-runを経て必要なWorkerだけを配備する。共通Gatewayを更新する場合は現行Control登録店舗のD1/R2バインディングを毎回再取得する。
5. **回帰契約**：テストの自動発見・差分実行の退避条件・構成変更/スキーマ変更/未知のsrc変更時のFail-Closedをテストで固定する。

## コマンド

- 影響分析のみ：npm run release:impact -- --base=origin/main
- ローカル高速テスト：npm run test:fast
- リリース計画表示のみ：npm run release:workers -- --base=＜前回配備SHA＞
- デプロイ実行：npm run release:workers -- --base=＜前回配備SHA＞ --execute-production
- フル回帰：npm test

## 完了条件・制約

- 高速テストPASS ≠ 全npmテストPASS ≠ 正式Android/iOS実機QA PASS。
- GitHub Actionsのfull-project-regressionは実装済みだが、この変更のPushが行われるまではクラウドCI未実行。Worker本番デプロイも未実行。
- Web/Native画面変更のみではWorkerデプロイ対象0。別途適切なWeb配布とモバイル新ビルドが必要。
- 3〜5分は以前の目標であり、現時点の実測保証ではない。ローカル高速レーンの測定と後続リリースで効果を確認する。
