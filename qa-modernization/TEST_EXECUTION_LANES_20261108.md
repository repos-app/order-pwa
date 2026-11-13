# izakanpai テスト実行レーン（2026-11-08）

## 目的と判定の境界

従来は main Push ごとに「UI／共通契約の GitHub Actions」と
「npm 221 工程の GitHub Actions」の両方が発火し、同じ自動検出テストが
繰り返し実行された。実機の正式QAとローカルの業務シナリオも混同しやすかった。
Push/PRの軽量CIは対象ソース・テスト・配布UI変更に限定し、
QA資料などのドキュメントだけのコミットでは実行しない。

| レーン | トリガー／実行コマンド | 確認するもの | 判定 |
| --- | --- | --- | --- |
| コミット前 | 既存 `.githooks/pre-commit`、`npm run test:fast` | 変更差分・UI保全・多言語の軽量チェック。変更された EXTENDED ケースは省略しない | ソースゲートのみ |
| GitHub Push/PR | `auto-ui-coverage.yml`: `run-auto-discovered-tests.mjs --ci` + `npm run test:ci-smoke` + ブラウザ/UI保全 | 自動発見の軽量契約および会計・認証・店舗DB・言語の主要回帰 | CI SUCCESS/FAIL。実機QAではない |
| npm全件 | `npm test` （221工程 + `test/auto-ci` の拡張ケース） | 詳細ロジック、入力境界、異常系、ソース棚卸し、ローカルGateway・独立SQL検証、配布物チェック | どれかFAILなら全件FAIL |
| リリース前GitHub | `full-project-regression.yml` を手動実行または `v*` タグPush | クリーン環境でモバイル生成物を準備後に npm全件回帰 | リリース検証。実機QAには代用しない |
| 正式QA | `.qa-v2-official/manifest.json` と既存の物理デバイス正式ランナー | 44画面、設定変更、端末復帰、オフライン、BLE、購入、店舗分離、実際のD1値・クリーンアップ | RUNNING claim と原証拠・独立Oracleを伴う正式PASS/FAIL |

**注意:** GitHub Actions は「テストの種類」ではなく実行環境。
CIスモークとnpm全件は重複するテストを共有するが、main Push では full を同時実行しない。
スモークPASSをnpm全件PASS・正式QA PASSと呼ばない。

## 現行の対象と重複

- npm原本: `test/project-test-commands.json` の **221工程**（削除なし）。
- Push/PR重要業務スモーク: **18工程**（npm原本から選択、全件にも残る）。
- Push/PRでは18工程の途中にFAILがあっても残りを実行し、最終終了コードはFAIL。
- 残る **203工程**はnpm全件で実行する。CIでSKIPしても成果判定を付けない。
- `test/auto-ci/**/*.test.mjs` は配置だけで自動登録される。
  `PRECOMMIT_TIER: EXTENDED` のS2/S4等はPush/PRから除外し、npm全件に残す。
- 正式QA原本: **831ユニークケース**、対象OS展開はAndroid **829**／iOS **830**。
  ローカル／GitHubのnpm結果から正式QAのPASS件数を変更する処理は存在しない。

## 前回11件のFAILはどこで検知すべきか

| 前回の失敗工程 | 適切なレーン | 理由と改善アクション |
| --- | --- | --- |
| 120, 145, 146, 147（入力項目、画面構造、関数・JSソース目録） | npm全件・リリース前 | ソースに応じて生成済み監査JSONを更新・レビューする。正式QAに移して隠さない |
| 173, 177, 195（アイコン、Capacitorプラグイン／設定、Androidネイティブ生成物） | リリース前のnpm全件 | クリーンなCIでモバイル資産生成・Capacitor同期を実施後、配布物を検査する |
| 150（認証関連スクリプトのバージョン固定） | **GitHub Push/PR + npm全件** | 更新事故やキャッシュ不整合に関わるため常時検知。現状のFAILは未解消 |
| 159（メニュー保存後のリロード失敗と状態維持） | **GitHub Push/PR + npm全件**、操作面は必要に応じ正式QA | 失敗中のユーザーデータ保持は重要な契約。ソース文字列判定だけでなく実動作でも再確認する |
| 175（注文確定ダイアログの明細・小計・税・合計） | **GitHub Push/PR + npm全件**、端末表示は正式QA | 金額／操作の主要機能であり実装とテスト期待値を突き合わせる |
| 176（店舗削除・store_id テーブル網羅） | **GitHub Push/PR + npm全件**、実データの削除・他店分離は正式QA | 重大なデータ保護上の機能でありチェックを外さない |

S2/S4のローカルGateway／SQLite／workerd／D1／R2による独立ビジネスOracleは
**npm全件の業務シナリオ検査**であり、物理端末の公式Oracleや正式QAの代替ではない。
S4の返金、JPY/PHP、税・サービス料の異常系は引き続きnpm全件に残す。

## 新しいテストが追加された場合

1. 安全・高速でGitHub Push/PRにも必要な汎用契約テストは `test/auto-ci/` に置く。追加登録は不要。
2. 処理量の大きい業務E2E・独立SQL・障害注入は `test/auto-ci/` に
   `// PRECOMMIT_TIER: EXTENDED` を付け、`npm test` に残す。
3. 既存の `test/project-test-commands.json` 配下の新しい重要業務テストを
   CIにも昇格させる場合、テストソースに単独の `// CI_TIER: SMOKE` 行を記載する。
   共通ランナーが自動選択する。未タグの新しいコマンドもnpm全件には必ず残る。
4. 実機操作・DB前後比較・PNG・独立Oracle・cleanupが必要な項目は
   既存正式QA原本に紐付け、ランナーの実行証拠が揃うまで正式結果を未確定とする。

## 確認コマンド

```powershell
npm run test:lanes
npm run test:ci-smoke
npm test
node scripts/ci/run-auto-discovered-tests.mjs --ci --list
node scripts/ci/run-auto-discovered-tests.mjs --list
```

**残作業:** 構成変更は11件の過去FAILそのものの修正ではない。
GitHub Push/PRで主要機能の4件がFAILしたら、理由を潰すまでFAILを維持する。
正式QAケースのPASS/FAILは本作業では一切更新しない。
## 2026-11-08 S4 Push/PRの影響ケース選択（旧「重要変更なら47件」方針を撤回）

GitHub Push/PRとコミット前は、**変更された機能に関連するS4ケースだけ**を実行する。共通S4ランナーを使い、機能ごとにテスト基盤を複製しない。該当テストがない場合はPASSではなくNOT_APPLICABLE。S4がまだ対応していないsrc変更はuncoveredSourceとして明記する。既存のUI・セキュリティの高速スモークは維持する。

| 変更例 | Push/PRのS4実行 |
|---|---|
| src/menuImageGeneration.js / src/menuImageSearchHandlers.js | 0件（専用の画像テストへ） |
| src/aiCredits.js | 2ケース |
| src/commission.js | 1ケース（実測約0.5秒） |
| src/refunds.js | 13ケース（実測約7.4秒） |
| src/billing.js | 30ケース |
| src/commonTenantGateway.js / src/gasApi.js / DB migration / 共通Oracle | 共通影響のため47ケース |

複数ファイル変更は対象ケースIDの和集合を取り、重複実行しない。差分の比較元SHAが取得できないときだけ全47ケースで検証し、誤SKIPを防ぐ。scripts/ci/s4-execution-gate.mjsが選択ID・個別証拠・独立PASS/FAIL判定を保存し、対象ケースがFAIL/BLOCKEDならジョブもFAILにする。重要srcを1ファイル修正しただけで無条件に47件実行する実装は撤回した。

隔離D1の全47件はPHT毎日02:00。毎週日曜02:00は追加で不正証拠56種類を検証。UTC cronの曜日差に注意：PHT月～土02:00はUTC日～金18:00（0 18 * * 0-5）、PHT日曜02:00はUTC土曜18:00（0 18 * * 6）。リリース手動/タグ時だけ全npm・独立D1全47・56ミューテーションを実行する。正式実機QA、モバイルビルド、本番デプロイとは分離。

実測：影響選択のユニットテスト13/13 PASS、報酬改修相当のSQLite1/1 PASS、返金改修相当のSQLite13/13 PASS、画像生成変更のS4はNOT_APPLICABLE。GitHubへ未Pushのため新しい定期ジョブはまだ稼働していない。
