# izakanpai ローカル未修正障害・正式FAILの差分調査（2026-10-17）

## 判定基準と環境

- 正本: `handoff/GPT_実機テスト障害台帳.md`、`handoff/GPT_障害対応キュー.md`、`.qa-v2-official/android/state.json`、`docs/QA_AUTO_DEFECT_REGISTER.md`、各元FAIL証拠。
- 調査時HEAD: `f478b03`。共有作業ツリーには多数の既存dirty差分があるため、`git status --short`のOPEN状態を修正結果と取り違えない。
- `node scripts/qa-v2-official-runner.mjs verify` exit 0: Android `PASS357/FAIL58/BLOCKED4/NOT_RUN412`、iOS `PASS12/BLOCKED2/NOT_RUN817`（調査時点。並行QAにより変動し得る）。
- **重要**: `OPEN/REOPEN`は「LOCAL_SOURCE_UNFIXED」と同義ではない。旧APKの正式FAILと新しいLOCALソース、Workerデプロイ、現物APK、実機正式PASSを混同しない。
- 公式状態は読み取りのみ。正式QAのclaim/record/state変更、実機操作、APK/IPAビルド、commit/push/deployは今回未実施。

## 既存の障害対応キュー14件のローカル実装照合

| 障害 | 現ソースに存在する修正／根拠 | 調査分類・残作業 |
|---|---|---|
| 059 | Native TakeoutのStore ID明示・期限付き公開read。対応キュー記録 | LOCAL修正の存在あり。対象ビルドで実機再現チェックは別ゲート |
| 061 | `src/takeout.js`の`takeout_enabled`サーバー検証、Takeout画面の表示フィルター | LOCAL処理あり。通常注文UIと完全同等の操作・権限/値の実機確認は未完 |
| 064 | 共通APIの離脱時Abort/generationの変更がキューに記録 | LOCAL変更あり。反復Back・本物の端末ライフサイクル正式再検証待ち |
| 065 | `API.pageReady()`への統合がキューに記録 | LOCAL変更あり。TestFlight/Android新ビルドでのメニュー読込み実機再検証待ち |
| 066 | pagehideで一度だけlifecycle resetする共通修正がキューに記録 | LOCAL変更あり。戻る再入場の新ビルド検証待ち |
| 036 | `src/onboarding.js:normalizeEmail`のGmail/googlemail/+alias正規化、`src/controlPlaneWorker.js`のowner鍵/HMAC。`test/control_plane_provisioning_test.mjs` | LOCAL実装あり。重複登録を実運営経路/現行デプロイで証明したとは限らない |
| 039 | `src/controlPlaneWorker.js:runAutomaticDeletionJobs()` と `scheduled()`。`test/control_plane_deletion_job_test.mjs` | LOCAL実装あり。30日到達・cron・物理資源完全削除の本番E2Eは別ゲート |
| 051 | `.github/workflows/android-build.yml`はGitHub Actions/Linuxで存在し `workflow_dispatch` のみ | 古いキュー要求「main push自動実行」と2026-10-16のユーザー指示「pushとビルドの自動連携停止」が衝突するため**自動再有効化禁止**。追加修正ではなく仕様台帳の整合が必要 |
| 060 | `.github/workflows/ios-build.yml`に手動 `workflow_dispatch` の署名IPAフロー | LOCAL workflowあり。実GitHub署名/Secrets・macOSジョブ成功は未証明 |
| 067 | `receipt_print_outbox`の会計と印刷ジョブ回収処理がsrcに存在 | LOCAL実装あり。障害中断・二重実行・実紙までの正式E2Eが残る |
| 068 | `ios/App/App/BridgeViewController.swift`とAndroid MainActivityの背景canvas固定 | LOCAL実装あり。iPhoneの1～2フレームちらつき再発有無は実機確認待ち |
| 069 | `docs/D1_FLEET_0044_0046_PRODUCTION_ROLLOUT_20261017.md`に2店舗0044～0046適用・Rows Read改善が記録 | LOCAL＋一部本番反映確認あり。Cloudflare共有アカウント全体の長期監視/他サービス/新規店舗E2Eは未確定 |
| 073 | 2026-10-17長文・自然折返しNative/Web/TEST横展開とChromium実描画・回帰結果が個別MDに存在 | LOCAL修正あり。全対象端末と全画面の業務動的表示は未保証 |
| 075 | 全入力候補914件の静的台帳・多画面/直接API入力検査が各個別MDに存在 | **部分的LOCAL修正あり**。914件は障害件数ではなく、全ての入力契約/実機での完了を意味しない |

`036/039`の既存ソース整合のためのローカルテスト：
`node --test test/control_plane_provisioning_test.mjs test/control_plane_deletion_job_test.mjs` exit 0（両ファイルともPASS、内訳はそれぞれ27チェック・20チェック）。本番での完全動作を証明しない。

## キュー未同期・新規正式FAIL

| 障害 | QA CASE | 原証拠 | 調査・修正先 |
|---|---|---|---|
| IZK-UT-089 | QA2-SET-008 | `docs/IZK_UT_089_SET008_ACCENT_NOT_APPLIED_20261017.md` | 保存accentColorを管理画面へ適用するLOCAL修正：`docs/IZK_UT_089_LOCAL_FIX_20261017.md` |
| IZK-UT-090 | QA2-SET-001 | `docs/IZK_UT_090_SET001_TABLE_LABEL_NOT_PROPAGATED_20261017.md` | 保存した席呼称を注文/管理・関連画面へ適用するLOCAL修正：`docs/IZK_UT_090_LOCAL_FIX_20261017.md` |

追加の横展開漏れを`npm test`第22ステップの現物FAILから特定し、**IZK-UT-091**として正本台帳へ登録：Web TESTのバックアップ作成日時をSQLite UTCとして変換できず、Web本番/TEST HTMLミラーも不一致。`docs/IZK_UT_091_UTC_DATE_DISPLAY_LOCAL_FIX_20261017.md`にLOCAL修正と個別S/H 10+10記録。修正前のHTMLミラー不一致は再現済み、修正後`test/local_smoke_test.mjs`581チェックPASS／exit0、UTC境界実コードVMテストexit0。配布・実画面・公式判定は未実施。

同様に`npm test`のプリンタ設定回帰FAILを起点に**IZK-UT-092**を発見しローカル修正：バックエンドが現地日時にした印刷キュー時刻をNative／Web本番／Web TESTが再度UTC解釈し、日付/時刻に二重補正。3配布面の表示変換を是正し、既存プリンタ回帰12チェックPASS、新規実コードVM 4/4 PASS。詳細`docs/IZK_UT_092_PRINT_QUEUE_LOCAL_TIME_DOUBLE_SHIFT_20261017.md`。未配布・正式実機未検証。

## 追加で発見した統合セキュリティ契約差分

`npm test`第37ステップのRaw SQL台帳が、旧上限36に対して`src/commission.js`の2つの新規SQLを検出しFAIL。旧HEADとの比較、厳格なコード検査・認証済み店舗IDの出典と管理者権限、異店舗/無効IDの既存テストを確認した上で、**新規2件の正確なSQL形状を固定**して上限38へ改訂。元のcommissionソースは他担当dirtyのため変更していない。`test/tenant_raw_sql_inventory_test.mjs`はexit0／全936構文SQL呼び出しを検査、歩合関連テスト27/27 PASS。詳細は`docs/IZK_COMMISSION_RAW_SQL_SECURITY_REVIEW_20261017.md`。読取クエリ2件のソース審査であり、全SQLや本番D1の安全性完全保証ではない。

**後続の配布整合ゲート更新**: `npm run mobile:sync`でNativeの元ソースを`mobile-dist`からAndroid/iOSの生成済みWebアセットへ同期済み（exit 0）。ログイン保存用JSのオフラインSHELL欠落（既存IZK-UT-082）を追加修正し、Native印刷ブリッジの`NativeAuth.ready/getToken`直呼出しを共通`API.pageReady`での認証/店舗確認へ是正。再同期後の`npm run verify:distribution`は**exit 0**（`test-results/izk_verify_distribution_final_20261017.log`）。Web本番/TESTの日付表示JSもバイト一致・SHA同一。これは**ローカル生成アセットの同梱整合**であり、署名APK/IPAの生成・配布・実機での動作を証明しない。

両件は2026-10-17の署名済みAndroid QA APK910019で正式FAIL。LOCALソース修正を含む署名APK/IPAは未生成であり、正式状態を変えてはいけない。表示変換では履歴DBのraw席IDを書き換えない。

## 正式QAの全件評価と限界

- Android正式FAIL58件は現行時点の状態数。うち「2026-10-17に未修正であることを原資料が明示した」89/90の2件を今回修正対象として特定。**残り56件がすべてLOCAL修正済みという主張ではない**。複数は古い910015～910017の実機証拠・環境/Driver要因も含むため、CASE別ソース/ビルド/実証を確認する必要がある。
- `docs/IZK_UT_086_REGISTER_BLANK_CASH_COUNT_20261017.md`は空現金実数の不正保存防止ソース修正済み、対象`QA2-UI-register`は910019公式FAIL継続。こちらも「未修正」と誤認して再実装しない。
- `docs/QA2_DISCOUNT_LOYALTY_FIX_20261015.md`で `QA2-KEEP-PT-INP-0375`の**既存修正では0.1の正値を許容**している。ローカル入力HTMLに `min=1` があるだけで、仕様確認なしに全経路を整数限定へ変えない。正本の業務仕様が確定するまで既存正値を保持。
- 正式PASSが増えたと記録できるのは、QA担当による正しい版のPlaywright実機検査、全legacyAssertions、独立API/DB読み戻し、公式runner受理の後のみ。

## 2026-10-17 後続の最新結果

- **ソース/回帰**: `npm test`の全185 ordered project test stepsが**exit0**、`test-results/izk_source_fix_full_185_verified_20261017.log`に証跡を保存。旧期待値はただ緩和するのではなく、NativeAuthの認証境界・iOS/Android自動ビルド停止・歩合Decimal検証・Free/Pro比較画面の「購入準備中」表示・認証済み店舗IDと保護SQL・日付出典に合わせて検査を強化/最新化した。 `npm run verify:distribution`もexit0。
- **追加ローカル実ソース修正**: 旧 `docs/date-display.js` と `docs/test/date-display.js` のUTC専用共通関数未横展開を解消。5配布面SHA-256一致・日付33テストPASS。詳細は `docs/IZK_UT_091_UTC_DATE_DISPLAY_LOCAL_FIX_20261017.md`。
- **P1正式FAILのソース再照合**: `QA2-KEEP-OPR-AUTH-007` 910017ではgetOperationsDelta無token時にHTTP200を返して正式FAILだったが、LOCAL `src/index.js:1664-1685`とGAS routeに、認証なし403・storeId未指定400・異店舗403の明示分岐があり、`test/local_smoke_test.mjs`でも無tokenの403を検証済み。旧FAILは維持、新Workerデプロイ・新APKまたは直接現行APIの正式確認待ち。同様に `QA2-KEEP-OPR-ATT-011`の管理者自己打刻禁止はLOCAL `src/attendance.js` とNative Clock UIに存在し、`test/backend_auth_attendance_401_regression_test.mjs`でUI/API双方のコード経路を検査。旧APK910017の正式FAILは無断解除しない。`QA2-NEW-ONB-001`の新規店舗CTAはLOCAL `mobile-app/web/config.js` で `SELF_SIGNUP_AVAILABLE:true` かつNative index/manageに新規登録リンク・項目あり。910017での未表示は新生成アセットと署名APKで正式確認待ち。
- 公式Android stateは本処理中の別QA担当により `PASS357/FAIL59/BLOCKED4/NOT_RUN411` へ変動。**現在のFAIL59件のすべてをソース未修正と推定しない／すべてをソース修正済みと宣言しない**。正式台帳を書き換えず、実機再テスト側で証拠を増やす。
