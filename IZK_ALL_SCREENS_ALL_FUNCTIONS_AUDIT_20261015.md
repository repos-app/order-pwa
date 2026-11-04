# izakanpai / 全画面・全機能ローカルソース横断監査 — 2026-10-15

## 判定

**今回列挙したソース集合について静的構文・参照検証を完了し、具体的に確認できたローカルソース欠陥を追加修正した。すべての実機画面・業務機能の動的実行PASSという意味ではない。** 結果を誇張して障害をCLOSEDにしない。commit・push・deploy・本番DB migration・正式QAの変更は行っていない。

## 固定した全体母集団と再現可能な証跡

| 対象 | 現行ソース母集団 | 実施した確認 | 未検証 |
|---|---:|---|---|
| HTML画面 | **126**（Native44/Web本番38/Web TEST38/公開6） | 読取・SHA、inline JS classic構文、HTMLイベント式、静的相対参照、Web prod/TEST38対byte一致。エラー0 | JavaScript動的生成のDOM、端末/ブラウザの実操作とネットワーク |
| 外部/同梱フロントJS | **52**（Native17/Web prod13/Web TEST13/公開9） | ソースSHA・node --checkの構文52/52 PASS、再生成一致 | OS/WebView/ブラウザAPI・Bluetoothの実挙動 |
| バックエンドモジュール | **62** src JS | SHA/export/DB呼出し近似値の静的棚卸し、構文/既存テスト | 62モジュール全機能の権限・SQL実行を1件ずつ網羅したわけではない |
| API dispatch入口 | **133 Workerルート / 152 GAS RPCハンドラー** | 静的ハンドラー名・共通認証/店舗権限構造を列挙 | 間接switch・各ロール×店舗×失効tokenの実行試験 |
| HTML入力候補 | **914** | 型、画面、field ID、現行max/min/step/maxlengthを再生成一致で固定 | 914件は欠陥数ではない。動的フォーム・ビジネス上限・DB制約の個別確定 |

ソース再生成・検証:

- `node scripts/izk-ut-073-page-coverage.mjs --write`
- `node test/izk_all_screen_syntax_navigation_audit_test.mjs`
- `node scripts/izk-all-frontend-js-audit.mjs --write` と引数なしの整合性検証
- `node scripts/izk-source-coverage-manifest.mjs --write` と引数なしの整合性検証
- `node scripts/izk-ut-075-input-inventory.mjs --write` と専用インベントリ契約テスト

各JSONのファイル名は `IZK_UT_073_PAGE_COVERAGE_20261015.json`、
`IZK_ALL_FRONTEND_SCRIPT_COVERAGE_20261015.json`、
`IZK_ALL_FUNCTIONS_SOURCE_COVERAGE_20261015.json`、
`IZK_UT_075_INPUT_FIELD_INVENTORY_20261015.json`（いずれも `docs/` 配下）。

## 今回修正した追加欠陥（その時点の既存上限を変更しない）

1. **プリンタ名/割当情報**: `src/printers.js`の名前60文字、MAC40、端末名80、プリンタ/端末ID120、割当先20件の切詰め・ID-prefix衝突防止を追加。Native/Web本番/TESTの `printers.html` に貼付け・IME・保存前の明示エラー。専用5件・既存プリンタ統合21件PASS。詳細 `IZK_UT_075_PRINTER_INPUT_FIX_20261015.md`。
2. **レポート送信先/送信元**: `src/integrations.js`がreportEmail/emailFromAddress 200超過を保存前に拒否し、3 `settings.html` も保存RPC前に日英の明示エラーを表示。異常SQL書込み0の直接API回帰とソース検査PASS。
3. **注文取消理由**: `src/orders.js`のreason 200超過を状態更新前に拒否、3 `admin.html`でHTTPリクエスト前にメッセージ表示。Node VM実 `doVoid`で201文字時HTTP0、ボタン不変。詳細 `IZK_UT_075_REPORT_AND_VOID_UI_FIX_20261015.md`。
4. **KDS長文Flex**: Native/Web本番/Web TESTのKDS商品名・席名に `min-width:0`/折り返しを追加、数量やアクション・DB元文字列を変えない。専用回帰PASS。詳細 `IZK_UT_073_ALL_PAGES_REAUDIT_20261015.md`。

先行局所バッチ: 0046 commission部分index、D1 SQL/PV、仕入先・PO明細・メニュー、会員、公開予約、テイクアウト、経費、割引、レート、全画面Flexの一部については `IZK_ALL_LOCAL_PG_REMAINING_REVIEW_20261015.md`と各個別報告に記録している。**すべての画面やAPIに変更が必要だったという意味ではない。**

## 閉鎖できない制約と残作業

### 全テスト起動器の横展開

今回の静的+直接API回帰を npm test に追加した結果、Windowsのコマンド文字列が **8,227文字**になり、PowerShell/npm経由で "The command line is too long" となる環境上の問題を確認した。テストを削減して成功を偽装しないため、順序付きの既存168テストをJSONへ保存し、専用契約テストを加えた **169ステップ**を、短い npm test コマンドから1件ずつ直接子プロセス実行する方式へ修正した。

- Runner: `scripts/run-project-test-pipeline.mjs`
- 元のコマンドと順序の保管: `test/project-test-commands.json`
- `package.json:scripts.test` は `node scripts/run-project-test-pipeline.mjs`
- 互換性/全数監査: `test/izk_project_test_pipeline_contract_test.mjs` PASS。特に tenant SQL監査、126画面、52JS、62 backend、プリンタ・メール・取消UIのテストが落ちていないことを確認。
- 個別プロセスで毎回終了コードを見て**最初の失敗で停止**する点は元の && 連鎖と同じ。Windowsのコマンドライン長限界を回避し、ログには検証番号/コマンド/失敗位置を記録。削除・実デバイス・本番DBは実行しない。

**実行済み**: `npm test` 終了コード0、ログ `test-results/izk_all_126_screens_62_modules_final_runner_20261015.log` の末尾 `ALL 169 ORDERED PROJECT TEST STEPS PASSED` を確認した。`npm run mobile:sync` 終了コード0、`npm run verify:distribution` 終了コード0、`git diff --check` 終了コード0。ログは同じ `test-results/` 配下の `izk_all_126_screens_62_modules_mobile_sync_20261015.log` と `izk_all_126_screens_62_modules_distribution_20261015.log` に保存。**これはローカル試験のPASSであり、Android/iOSの正式実機QAとは別**。

- **IZK-UT-069/P0**: Cloudflare本番のD1 rows_read/rows_written、migration 0045/0046、Workerデプロイ版、全7DB・PitaYasu・監視の実証。
- **IZK-UT-073/P1**: 126 HTMLの静的監査は行ったが、Android/iOSとWeb実描画で短辺720px以上、長文/日本語IME、スクロール、ボタンタップ、再訪・キル/復帰の実テストが未完了。
- **IZK-UT-074/P1**: QAドライバーの座標観察時の副作用は修正済みだが、物理スクロール揺れの独立根本原因は未確定。
- **IZK-UT-075/P1**: 914項目すべての業務上限の承認・JS動的入力・UI/Backend/DB直接整合・過去データ互換性は未確定。単なる入力属性の有無だけでP0/P1と断定しない。ID・課金/会計のキー・再送防止・日時整形の `slice` を無条件に削除しない。
- すべての実機QAをこの静的監査の結果だけでPASSへ上書きしない。

## 10回自己レビュー — 範囲と限界を分離

| No. | 実施観点 | 判定 |
|---|---|---|
| S01 | Native44/Web38×2/公開6の母数と実ファイル列挙 | PASS static |
| S02 | 126 inline JS classic構文・handler本体 | PASS static |
| S03 | 126静的リンク・関数名候補 | PASS static; runtime PENDING |
| S04 | Web本番・TESTの38対source SHA/byte一致 | PASS source |
| S05 | 52 JSの `node --check` 構文検証 | PASS static |
| S06 | 62 backend moduleのSHA・exports・DB情報を固定 | PASS static; each API runtime PENDING |
| S07 | Worker133/GAS152 dispatch入口の存在・共通auth構造 | PASS static; role-runtime PENDING |
| S08 | プリンタ60/40/80/120超過、20台超過の切詰め対策 | PASS offline; physical printer PENDING |
| S09 | メール200/取消理由200の直接API＋3 UI source | PASS offline; authenticated live PENDING |
| S10 | 不明な業務仕様の `slice` を恣意的に変更しないこと | PASS source decision; business signoff PENDING |

## 10回横展開レビュー — 配布面・業務層

| No. | 確認方向 | 判定 |
|---|---|---|
| H01 | Android native HTML/JS | 44HTML/17JS source syntax PASS; emulator PENDING |
| H02 | iOS native HTML/JS | 共通同梱source PASS; iOS physical PENDING |
| H03 | Web production | 38HTML/13JS static PASS; deployment PENDING |
| H04 | Web TEST | 38HTML/13JS static PASS; deployment PENDING |
| H05 | 公開注文/テイクアウト/予約 | 6HTML/9JS static PASS; live checkout PENDING |
| H06 | Worker API | 133 entries extracted; role/store runtime PENDING |
| H07 | GAS API | 152 handlers extracted; role/store runtime PENDING |
| H08 | Print Host/Bluetooth/KDS | 5 negative +21 integration tests, KDS CSS PASS; device PENDING |
| H09 | D1 migration/store isolation/commission | prior SQLite/tenant tests PASS; production index and real rows PENDING |
| H10 | 914 HTML入力候補、認証・会計・レポート・各機能 | inventory PASS, individual business rule/physical PENDING |

**この資料は「ソース全数の静的点検＋確定した個別不具合への修正」の証跡であり、「全画面全機能の動的合格」「横展開漏れ0件」の保証ではない。**
