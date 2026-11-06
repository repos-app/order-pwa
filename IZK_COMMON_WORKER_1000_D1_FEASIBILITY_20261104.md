# izakanpai B方式：共通Worker + 店舗別D1/R2の技術検証（2026-11-04）

## 完了判定の範囲

- **LOCAL_SOURCE_POC: PASS** — 既存の `src/db.js` の物理D1ルーティングと `src/auth.js` のv3 HMAC署名を再利用。1,000店舗のバインディングを模擬し、全件対応表とリクエスト固有の最小対応表の両方でDBを選択。別DBへの誤アクセスと店舗ID・トークン改ざんを拒否。
- **WRANGLER_DRY_RUN: PASS** — 実際の `src/index.js` を単一Workerとして、仮想D1 1,000個 + 仮想R2 1,000個でWranglerローカルコンパイル。Cloudflare APIへの本番書き込みは行わない。
- **PRODUCTION_RUNTIME: NOT_TESTED** — 物理Cloudflare上で2,000バインディングを登録していない。実店舗のDB/R2、トークン更新・失効、印刷・会計の疎通は未検証。
- **MIGRATION / COMMIT / PUSH / DEPLOY: NOT_DONE** — 本番の店舗Worker、Control、公開Router、D1、R2、DNSを変更しない。新規PoCファイルはレビュー用。

## 現行ソースで再利用できる資産

1. `src/db.js`: `TENANT_DB_BINDINGS_JSON` による明示的店舗ID→binding名の対応、`resolveTenantDbBinding()`、二重割当・未登録・共有DB混入拒否。
2. `src/auth.js`: `makeAccessToken()` / `parseToken()` の署名付きv3セッショントークン。店舗ID・audience・期限・sessionIdを署名対象に含む。
3. `src/index.js`: `scopedTenantSql()` で店舗条件付きSQLを実行し、認証後の店舗IDと本文の店舗IDが異なる場合を拒否。セッション失効状態は `isCurrentEmployeeSession()` が店舗D1を参照。
4. `src/tenantProvisionerService.js`: 店舗専用D1/R2の作成・物理DBオーナーマーカー・店舗Worker設定の来歴検査。
5. `src/controlPlaneWorker.js`: Control D1のactive店舗台帳、既存の署名付きトークンからの店舗識別・ルーティング。ここでの構造解析だけは署名検証と同義ではない。

## 実行した検証

| 検証 | コマンド | 実績 | 判定 |
| --- | --- | --- | --- |
| 既存物理D1分離 | `node test/tenant_physical_d1_isolation_test.mjs` | 24チェック | PASS |
| 既存動的SQL制約 | `node test/tenant_dynamic_sql_allowlist_test.mjs` | 既存ガード通過 | PASS |
| 1,000店舗の選択・署名改ざん | `node test/tenant_common_worker_1000_binding_poc_test.mjs` | 1,000個の異なるバインディング、**2,021チェック**。全件対応表で1,000件約1,020ms、リクエスト固有対応表で1,000件約496ms（ローカルNodeでの合計、性能SLAではない） | PASS |
| 1,000 D1 + 1,000 R2のWorkerビルド | `node scripts/tenant-common-worker-binding-dryrun.mjs` | 単一実ソース `src/index.js`、2,000バインディング、合成TOML **207,194 bytes**、ビルド約1.09MB、Wrangler `--dry-run` exit 0 | PASS |

ドライランのレポート・synthetic設定ファイルは `/test-results/tenant-common-worker-1000-proof/`（Git無視対象）に保存。実顧客のDB UUID、シークレット、販売情報、注文は使っていない。

## 運用上の結論

Cloudflare D1の公式ドキュメント（2026-10-30改訂）には、Workerスクリプト1本に約5,000個のbindingを設定可能とある。`env.DB_xxx` の選択は**事前バインド済みD1**で可能だが、DB UUIDからリクエストごとに未登録D1 bindingを生成するAPIではない。

**重要な追加制限**: Cloudflare Workersの環境変数は**1変数につき最大5KB**。実際に生成した1,000店舗分の `TENANT_DB_BINDINGS_JSON` は**19,001 bytes**となり、**そのままWorker環境変数へ置く方式は不可**。2,000bindingのコンパイルPASSはこの19KB変数を除外した構成で確認した。代替策として、店舗IDから衝突しない標準binding名 `DB_${canonicalStoreId}` を導出し、**サーバー管理の有効店舗台帳で確認後**、`resolveTenantDbBinding()` にリクエスト固有の1店舗分だけの対応表を渡す方式をローカル検証した。実運用ではDB UUIDと物理オーナーマーカーを配備時・オンボーディング時に独立照合し、接続先すり替えを防ぐ必要がある。

したがって、**1,000店舗の共通POS Worker 1本**は有力。ソース更新はWorker 1本のみでよい。一方で、**新規店舗登録時には共通WorkerのD1/R2バインディングを追加する設定更新が必要**（店舗専用Worker配布は不要）。D1とR2を各1個とすると1,000店舗で2,000binding。その他シークレット・サービス設定も含めた約5,000bindingおよび1MBメタデータ制限を要管理。今回のdry-runはリモートquota証明ではない。

参考: https://developers.cloudflare.com/d1/platform/limits/ / https://developers.cloudflare.com/d1/worker-api/d1-database/

## 実移行で必須の未完了作業

1. **共通Worker専用のリクエスト入口**: 署名・期限・audience・現在のD1セッション・権限を検証。サーバー管理台帳から店舗ID→D1/R2バインディング対応を確定してから `DB`,`IMAGES`,`TENANT_ID`,`TENANT_R2_BUCKET_NAME`,`TENANT_WRITE_FENCE_REQUIRED=1` をリクエスト固有環境にセット。グローバル `env` をリクエスト間で書き換えない。全件JSON設定ではなく導出したbinding名とサーバー台帳を使う。マッピング欠落時に `env.DB` へ戻ることを許さない。
2. **匿名経路の分類**: 店舗IDだけで選択してよいのはログイン処理と公開メニューなど最小限。公開メニューの表示項目制限、QR注文の既存署名付きtableToken、プリンターのCloudPRNT専用鍵、画像GET認可を維持。アクセストークンのない処理に「従業員ログイン必須」を誤適用しない。
3. **既存Auth秘密鍵の互換性**: Provisionerは現在 `TENANT_AUTH_SECRET` を各店舗Workerへ渡している。既存の署名付きv2/v3・QRトークン・refresh sessionを破壊しない移行方法を確定。店舗ごとに秘密鍵が違う可能性も排除せず、実値の出力なしで秘密鍵の来歴と互換性を検証。
4. **既存の全経路**: `src/index.js` は `scoped(env)` でDBを使う経路を多く持つ。API/GAS互換RPC/RevenueCat/オフライン会計/プリント/R2/メール/店舗登録/削除/Cron/新旧token/logoutを網羅して正しい店舗DBとR2へ向ける。単に `scopedTenant()` だけ変えても共通化は完了しない。
5. **管理・オンボーディング**: Control `tenant_registry` + D1所有マーカーの一致を必須とし、新規店舗で共通Worker binding更新とreadbackを自動化。既存Provisionerの店舗Worker生成・更新・削除処理は共通化後の仕様に安全に更新する必要がある。設定反映前・不一致時はfail closed。
6. **本番カナリアとロールバック**: 専用QA店舗2つで実際のCloudflare D1/R2をreadbackし、別店舗ID改ざん、QR/ログイン/会計/購入/画像/印刷/オフライン同期の実行証拠を確保してから切替。現行13店舗Workerを残したまま切替・戻しを検証する。正式QA・本番切替は現時点では未実施。

## 重要な未解決事項

- 1,000件の事前バインディングはCloudflare公式上限内かつローカルビルドPASSだが、2,000bindingを**実際にCloudflareへアップロードして本番実行した証拠はない**。
- 初期PoCの `parseTenantDbBindings()` 全件JSON解析にはスケーラビリティ上の課題がある。後続の実POSハンドラ接続テストで、**ルートJSONと `env.DB` の同一D1参照は既存ガードの `tenant_db_route_shared_binding` で拒否されることが判明**。そのため共通入口で物理バインディングを検証した後、**1店舗の `DB`/`IMAGES` だけを持つ `TENANT_ID` 固定のリクエスト専用環境**を作る方式へ変更した。この方式では `TENANT_DB_BINDINGS_JSON` を業務ハンドラへ渡さない。
- `src/db.js` にはルート定義がない場合に `env.DB` を使う旧互換経路があるが、後続候補ではControl DBのactive確認、DB/R2双方の所有者照合、世代検証、`TENANT_ID` 固定とwrite-fenceを**先に強制**し、元の共有 `env.DB`・他店舗bindingを業務ハンドラへ渡さない。これは候補入口を経由しない経路が依然危険であることを否定しない。
- この検証はSQLガード/tenant marker/現行ログインを削除する根拠ではない。店舗別物理DBが守られても、他店舗への誤ルーティング防止には署名・権限・DB選択のすべてが必要。

**判断**: B方式への設計着手は技術的に妥当。移行や現行Worker廃止を承認する正式なエンドツーエンドPASSはまだない。

## 続行検証（共通Worker候補、2026-11-04）

追加成果物：`src/commonTenantGatewayCandidate.js`、`test/common_tenant_gateway_candidate_e2e_test.mjs`。**入口候補はどの本番Wrangler設定にも接続していない**。公開入口、Control、既存13店舗Workerの動作は従来どおり。

- **既存POSの実コード経由のローカルE2E**: Native `checkToken` とGAS互換 `checkToken` が、互いに異なるSQLite物理DB内の従業員レコードおよび認証セッションを実際に照合する。単純なルート関数モックのPASSとは区別。
- **認証・分離**: 改ざんした店舗ID、署名、audience、不正な型、失効セッション、Control登録の退役、不正DB所有者マーカー、不一致のroute generation、Control DB・他店舗DBのハンドル混入を拒否。
- **物理R2**: 既存Provisionerが保存する `_izakanpai/provisioning-owner.json` の全所有者情報と、物理D1所有者マーカーのDB UUIDを照合。別店舗R2へのバインディングすり替え・所有者不一致を拒否。実 `imageStorage.js` の `saveImage` / `serveImage` / `savePrivateImage` / `getPrivateImage` を2個の独立したメモリR2バケットで検証。A画像はBから読めず、private画像を公開GETできない。
- **同時アクセス・大規模設定**: A/Bを交互に40件並列アクセスしてもリクエスト専用環境を取り違えない。D1/R2計2,000個の模擬バインディング環境でも、ほかの店舗のD1/R2・Control DBをPOSハンドラへ露出しない。Nodeローカルの店舗選択P95約1.3ms（ネットワーク・Cloudflare実行環境は含まない）。
- **検証コマンド**: `node test/common_tenant_gateway_candidate_e2e_test.mjs` → **187チェックPASS**（正式QAではない）。既存1,000店舗PoC → **2,021チェックPASS**。Wrangler dry-run → **2,000合成バインディングでPASS**。これらを既存プロジェクト回帰の**217〜219工程**に登録（従来216工程は保持）。

### 追加リスクと移行ゲート

- 候補入口は現時点で**POST JSON APIのみ**。現行の匿名QR注文、GET画像、CloudPRNT、RevenueCat webhook、Control内部Cron・削除、送信メール等を迂回させる実装はない。これらの共通化・本番カナリア検証は残件。
- 毎リクエストControl D1・専用D1の所有マーカー・R2所有マーカーを読む候補であり、**実際のクラウドレイテンシとD1/R2読み取り課金は未測定**。キャッシュする場合は世代変更・削除・店舗切替時の失効確認が先に必要。
- 実Cloudflareへ2,000個のバインディングをアップロードする試験、既存JWT/QR・Refresh実トークンの互換性証明、会計・オフライン精算・AI購入・印刷の正式実行は未完了。**本番切替不可**。

### 既存QA資源の本番設定読み取り（実Cloudflare・読み取り専用）

調査した既存QA店舗は `qa-onb001-20261021-r2` と `qa-onb002-mvi38qqf-d6bd72`。ユーザー注文・会計・ログインデータは取得せず、ストレージ所有者情報のみを照合した。

1. 既存 `node scripts/rollout-existing-tenant-runtime-oauth.mjs --store <storeId>` の**read-only plan**が両店舗 `complete=1,blocked=0,preflightReady=true, runtimeStatus=already_current`。店舗WorkerのD1/R2/secret/serviceのバインディング名称と種類は、既存readbackで照合される。
2. `wrangler r2 object get izakanpai-images-<storeId>/_izakanpai/provisioning-owner.json --remote --file <ignored-output>` で実R2所有者マーカーを読み取り、対象店舗ID・environment・バケット名・DB名・routeKey一致を**2/2 PASS**。
3. `wrangler d1 execute izakanpai-<storeId> --remote --json --command="SELECT store_id,environment,database_id,route_key,worker_name,schema_version FROM tenant_provisioning_marker WHERE singleton=1"` で**実D1を読み取り**、R2 ownerの `databaseId` とD1の `database_id`、workerName/routeKey/storeId/environmentが一致することを**2/2 PASS**。両店舗の `schema_version` は `0054_offline_cash_settlements.sql`。
4. 読み取り結果はGit無視の `test-results/common-worker-b-live-r2-20261104/` に一時的に保存。店舗所有者UUIDをMarkdownやチャットへ転記しない。D1・R2の書き込み、Worker更新、新規テナント作成は行っていない。
5. Control D1の `tenant_registry`（store_id/environment/route_key/state/generation）と各QA店舗D1の `tenant_runtime_state`（store_id/route_generation/write_state）も読み取り専用で照合。両店舗 **2/2** で `active`、世代 `1=1`、write_state=`open` が一致。Cloudflare live configuration の所有者・世代読取照合は合計2店舗でPASS。

**判定範囲**：2つの実QA物理D1とR2に対する所有者メタデータの一致は実測でPASS。ただし共通Worker候補をCloudflareへデプロイしたわけではなく、ここでのPASSを**新共通Workerの本番E2E/正式QA PASSと呼んではいけない**。

### 自動回帰への組み込みと並行作業の影響

- `test/project-test-commands.json` に既存216工程を維持して、候補の1,000店舗PoC・POS/R2統合E2E・Wrangler dry-runを217〜219工程として追加。`test/izk_project_test_pipeline_contract_test.mjs` でも必須に登録。
- `test/tenant_raw_sql_inventory_test.mjs` に候補の2つのread-only D1 metadata SQLをレビューして追加。新しいSQLの未登録は全体テスト48工程を一度FAILさせた。SQL形状と店舗IDパラメータを固定し、その後の再検査で87 JS files / 59 modules / 1,002 sites PASS。
- `docs/IZK_ALL_FUNCTIONS_SOURCE_COVERAGE_20261015.json` と `docs/IZK_ALL_FRONTEND_SCRIPT_COVERAGE_20261015.json` は既存生成器から更新済み。候補はデプロイ済み・正式QA済みではなく `STATIC_INVENTORY_DOMAIN_VALIDATION_PENDING` のまま扱う。
- 新規3工程217〜219単独、後半159〜219（61工程）の部分実行はPASS。ただし、**219工程の最初から最後まで通すテストは未PASS**。同時に編集されている別機能の監査JSON変更で一時停止し、その後の再実行では**59工程の `control_plane_routing_test.mjs` がRevenueCat Sandboxの仕様更新に伴うassertionでFAIL**。これは本候補のソースを追加して発生した検証ではないが、全プロジェクトPASSとして報告しない。並行の別機能修正を勝手にrevert/上書きしない。

## Cloudflare実ランタイムでの追加検証（2026-11-04）

今回の検証は本番店舗のWorkerやDB/R2の設定・データを変更しない `wrangler dev --remote` の一時プレビューで実施した。読み取り先は既存の2つのQA物理D1/R2のみ。注文、会計、顧客データの取得や変更はしていない。一時プレビュー2件は終了済み。

### 実際のCloudflare上で検証できたこと

| 項目 | 実行事実 | 判定 |
| --- | --- | --- |
| 物理D1/R2切替 | 単一の一時プレビューWorkerにControl D1＋QA専用D1 2件＋QA専用R2 2件をバインド。Control登録・D1所有マーカー・D1世代・R2所有マーカーの一致を2店舗で照合 | **2/2 PASS** |
| 店舗ID改ざん・認可外入力 | 店舗IDと申告店舗IDの不一致2例はHTTP 403、未登録店舗はHTTP 404、検証キー不正はHTTP 403 | **4/4 PASS** |
| 40並列アクセス | 2実QA物理DBへ20件ずつ交互に計40件同時読み取り。店舗間取り違え0、所有者／世代照合40/40成功 | **40/40 PASS** |
| 1,000店舗規模のCloudflareバインディング受付 | D1 **1,001**（Control 1件＋1,000店舗相当）＋R2 **1,000**＝**2,001** バインディングの一時プレビューをCloudflareリモートで起動成功。2QA店舗の実物理リソースを参照してリモートREAD実行も2/2成功 | **実Cloudflareで受付・動作PASS** |
| 大規模バインディングで40並列 | 上記2,001バインディングの一時プレビューで、2QA店舗への40並列読み取りが40/40成功、取り違え0 | **40/40 PASS** |

**大規模テストの解釈**：1,000店舗相当の追加binding名は、既存QA物理D1/R2の2セットを繰り返し参照する合成構成。**Cloudflareが2,001個のbinding定義を受け付けて実行できることを示すが、1,000個の異なる実D1/R2を作成・稼働させた証拠ではない**。本番Workerへの通常デプロイではなく、`wrangler dev --remote` によるプレビューアップロードである。

**レイテンシ**：40並列の端末→プレビュー経由の応答p95は小規模設定で約1,959ms、大規模設定で約1,327ms。各リクエストでControl D1、物理D1の2 SELECT、R2 owner readを実行している。ローカルプロキシ・ネットワーク・preview起動状態を含む測定であり、POS本番APIの性能SLAやbinding数単独の増分と解釈してはならない。メタデータ毎回読取の負荷・料金は今後の設計課題。

**保存証拠**：Git無視ディレクトリ `test-results/common-worker-b-cloudflare-readonly-20261104/` にread-only Workerソース、2,001バインディングTOML、Cloudflare previewログ、40並列の結果JSONを保存。検証用の一時認証キーは本番の秘密鍵・POSセッションとは無関係。

**本番移行判定は未変更**：業務共通Worker候補 `src/commonTenantGatewayCandidate.js` の実Cloudflare上でのPOS本人認証／ログイン／会計／オフライン／AI購入／印刷／QR／画像／RevenueCat等の本番相当E2E、各店舗の新規binding登録と切替・rollback、実1,000独立DB稼働は未実施。既存13店舗Workerを廃止する判断は不可。

## A/Bレスポンス比較：実POS bootstrap読み取り・一時プレビュー（2026-11-04）

同一の既存QA店舗 `qa-onb001-20261021-r2` の物理D1・R2に対し、同じ最新 `src/index.js` の匿名公開メニュー初期取得 `{action:"bootstrap",storeId:"..."}` を実行。Aは当該店舗のD1/R2が直接固定された単一Workerの検証用ラッパー、Bは `src/commonTenantGatewayCandidate.js` のControl D1照合＋D1/R2所有者マーカー＋世代確認後に同じ実POS処理へ委譲する検証用ラッパー。どちらも `wrangler dev --remote` のCloudflare一時プレビューで、書き込みを許さないallowlist入口のみ公開。公開メニュー/設定/テーブルのレスポンス構造を照合（両者一致）。**QA店舗の公開メニュー件数は0件だったため、十分なメニュー行を持つ店舗での大容量応答性能は未実証**。

| 同時発行数 | A P50 | A P95 | A P99 | A成功/失敗 | B P50 | B P95 | B P99 | B成功/失敗 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 1,825ms | 2,044ms | 2,327ms | 50/0 | 2,138ms | 3,010ms | 3,109ms | 50/0 |
| 100 | 2,427ms | 2,450ms | 2,550ms | 100/0 | 3,465ms | 4,218ms | 5,827ms | 100/0 |
| 500 | 2,398ms | 4,608ms | 4,621ms | 287/213 | 4,551ms | 5,702ms | 6,104ms | 60/440 |

**500同時のP50/P95/P99は成功と失敗の双方を含む応答/通信完了時間であり、POSの正常応答レイテンシ比較には使用不可**。Aの失敗内訳はネットワークfetch例外199件とHTTP500 14件、Bは入口の所有者確認エラーを集約したHTTP503 `tenant_unavailable` 440件。Bは所有者照合のどの段階が失敗したかを対外的には秘匿する設計であり、失敗根因（Control D1集中/R2読取制限/previewサービス側制約）は今回まだ特定できていない。試験後に診断用入口を追加したが、Wrangler一時プレビューの再読み込み中に有効な診断応答が得られなかったため、根因未確定とする。**本番Workerの500同時性能がこの比率で落ちると断定しない**。

50同時ではBのP95が約966ms遅延、100同時では約1,768ms遅延。現行B候補はリクエストごとにControl台帳1 SELECT、店舗D1所有者1 SELECT、世代1 SELECT、R2所有者GETを追加しており、同じPOSコード・DBを使っても追加の遠隔ストレージアクセス分が遅延/負荷になることを実測した。**DB/R2所有権保証を捨てて最適化してはならない**。改善時には署名・サーバー管理台帳・所有者マーカー・世代/失効保証の再検証を伴うキャッシュ/短絡設計が必要。

今回の数値はローカルNode→WranglerプレビューProxy→Cloudflareの経路を含み、実際の利用者からのCloudflare本番Workerへの直接リクエストとは異なる。50/100/500で各A/Bを1回ずつ測定しただけで、統計的再現性や多店舗分散負荷を保証しない。B方式の本番移行は引き続き不可。

**証拠**：`test-results/common-worker-b-cloudflare-readonly-20261104/pos-bootstrap-benchmark-result.json`、`pos-bootstrap-benchmark.log`、`pos-a-preview.log`、`pos-b-preview.log`、`pos-baseline-a.mjs`、`pos-common-b.mjs`、`pos-a.toml`、`pos-b.toml`（Git無視、検証専用）。一時プレビューA/Bとも停止。既存店舗Worker・公開Router・物理D1/R2本番データの変更なし。

## B方式：追加ストレージ照合のレスポンス短縮（2026-11-04）

`src/commonTenantGatewayCandidate.js` の `selectPhysicalTenantEnv()` を、Control D1店舗登録1 SELECT・物理D1所有者マーカー1 SELECT・物理D1世代1 SELECT・R2所有者マーカー1 GETの**逐次実行から `Promise.all` による並列実行へ変更**。4つの判定項目はすべて存続。全件照合完了前のPOS呼び出しは引き続き禁止。認証、ルート世代、物理D1/R2検証、トークン失効、SQLガードは削除せず、所有者情報をキャッシュして古い認可を使い回す変更も行わない。

### 同一Cloudflareプレビュー上での厳密な比較

テスト専用Worker `tenant-lookup-benchmark.mjs` は、同一のQA物理D1/R2とControl DBの**同じ4つの所有者照合**を、逐次と並列でそれぞれ実行。15件ずつ順序を交互にして実行し、さらに30並列ずつ実行した。両方式とも45/45正常応答。

| 計測 | 逐次 | 並列 | 改善 |
| --- | ---: | ---: | ---: |
| サーバー内部・店舗照合 P50 | 810ms | **274ms** | **約66.2%短縮** |
| サーバー内部・店舗照合 P95 | 1,315ms | **510ms** | **約61.2%短縮** |
| プレビュー経由の全応答 P50 | 967.9ms | **343.9ms** | 約64.5%短縮 |
| プレビュー経由の全応答 P95 | 1,558.4ms | **588.3ms** | 約62.2%短縮 |

上記は**店舗照合部分**の比較であり、会計や公開メニュー初期取得の全体応答が同じ割合で改善したとは主張しない。

### 修正後の実POS bootstrap の A/B測定

前回と同じQA物理D1に対してA方式・修正後B方式の実POS `bootstrap` を再計測（Cloudflare一時プレビュー経由、各同時負荷1セット）。50同時はA/Bとも50/50正常応答、A P95=5,132ms、B P95=4,830ms。100同時は両方式99/100正常応答（残りは通信タイムアウト）、A P95=4,779ms、B P95=6,648ms。今回のプレビュー応答時間は両方式で前回より大きく変動し、**POS全体でBがAより一貫して速くなったという証明にはならない**。B方式の500同時で以前発生した503問題も未解決。直接運用する本番の性能SLA、Control D1/R2の費用、実会計やQR等の全経路性能は未検証。

### テスト・安全性

- `test/common_tenant_gateway_candidate_e2e_test.mjs` に**4ストレージ照合の並列開始を確認する非タイミング依存の回帰チェック**を追加。188チェックPASS。物理D1とR2の混入、無効店舗、署名改ざん、失効、40並列への既存の拒否テストもPASS。
- 既存1,000店舗PoC `test/tenant_common_worker_1000_binding_poc_test.mjs` は2,021チェックPASS。
- 証拠は無視ディレクトリ `test-results/common-worker-b-cloudflare-readonly-20261104/` の `lookup-compare-result.json`、`lookup-compare.log`、`pos-bootstrap-optimized-benchmark-result.json`、previewログへ保存。3件の一時プレビューは終了。
- **正式QA PASSや本番切替ではない**。ソース候補の変更のみ、既存本番13店舗のWorker・DBデータは未変更。

## 500同時アクセスの障害切り分けと再試行対策（2026-11-04 続報）

### 実Cloudflareによる切り分け結果

- **物理2QA店舗・B方式の4ストレージ照合のみ**：100同時1店舗100/100、100同時2店舗100/100、200同時2店舗200/200。500同時2店舗では401/500成功、99件はHTTPステータスを取得できない通信例外で中断。ストレージ段階別の失敗を示す返答は0件。この結果だけでは根因を通信経路と断定できない。
- **D1/R2を一切使わないCloudflareプレビュー**：同時500件を500/500正常応答。よってリクエスト数500だけで必ず通信失敗になるわけではない。
- **実POS bootstrap・B方式のin-flight所有者照合共有後**：1店舗100/100、2店舗100/100、2店舗200/200、2店舗500件を最大50同時で500/500成功。ただし2店舗に500件一斉送信すると252/500成功、248件はHTTPステータス未取得の通信例外。**500完全同時の無制限処理は未合格**。
- **Worker内にリクエストをPromise待機キューとして保持する案はFAIL**：100同時で79/100、追加再試験100同時では92/100成功。Cloudflare runtimeログに `Workers runtime canceled this request because it detected that your Worker's code had hung` が出た。これは採用しない。
- **最大35並列の即時429案も不十分**：500クライアント開始、HTTP429＋ジッター再試行を組み合わせ462/500件成功、38件HTTP500 `internal_error`。Cloudflare実ログに `D1_ERROR: D1 DB is overloaded. Requests queued for too long.` を確認。**D1への集中負荷が実際に存在することを裏付ける直接証拠**であり、通信経路のエラーだけではない。

### 候補実装に追加した恒久的な性能対策（本番未接続）

1. `src/commonTenantGatewayCandidate.js` の所有者照合に、**同一Worker isolate・同一環境・同一店舗の同時実行中のみ**単一リクエストへ統合するsingle-flightを追加。成功・失敗いずれも完了時に破棄。以降のリクエストではControl台帳・D1物理所有・世代・R2所有を再読取し、退役や店舗切替の判定を省略しない。
2. 同ファイルの**匿名公開メニュー初期取得 `bootstrap`、bodyは厳密に`action`/`storeId`の2フィールド、追加queryなし**に限り、同じ実行中の読み取りを統合。結果は各クライアント向けに独立したResponseへ複製し、リクエスト終了後に結果を保持しない。認証トークンあり、GAS互換、持ち帰り条件など追加パラメータあり、会計・QR・AI購入・状態変更は統合しない。
3. 上記によりローカルでは**100件の同時公開bootstrap（2店舗×50件）→実業務ハンドラの呼び出し2回**、次のリクエストは新規実行、認証あり/追加条件のリクエストは非統合をチェック。既存改ざん・他店舗DB/R2隔離・セッション失効・所有者再検証テストは維持。候補統合E2E `node test/common_tenant_gateway_candidate_e2e_test.mjs` **197チェックPASS**、1,000店舗PoC `node test/tenant_common_worker_1000_binding_poc_test.mjs` **2,021チェックPASS**。

### 最終実験：高速拒否429＋クライアント側のジッター再試行

QA限定の非公開一時プレビュー `pos-common-b-admission-probe.mjs` で、**Worker isolateごとの実行中上限8件**、超過はWorker内で待機せずHTTP429/Retry-Afterを返す。テスト用の公開メニューbootstrapクライアントで、429/一時通信失敗/読み取り500等にだけ上限16回・ジッター付き再試行を実装（**会計など書込みリクエストへこの再試行を横展開しない**）。

| 負荷条件 | 最終成功 | 失敗 | HTTP200 | HTTP429（再試行） | 総HTTP試行 | 最終完了P95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 500クライアント同時開始・**2店舗**に均等分散 | **500/500** | **0** | 500 | 307 | 807 | **6,932ms** |
| 500クライアント同時開始・**1店舗**に集中 | **500/500** | **0** | 500 | 256 | 756 | **6,413ms** |

実previewログでは今回の上限8・429方式について `D1_ERROR` およびHTTP500は**0件**。両条件を合計しても最終結果1,000件すべてが正常応答であることを確認。

**厳密な意味**：これは「500件の独立したリクエストが同時に到着し、再試行込みで全件完了した」証明。**500件を同時にD1で実行し切ったという意味ではない**。429は即時拒否であり、再試行をするクライアント実装が必要。8件上限はWorker isolate内部だけなので、複数isolate/リージョンや1,000店舗全体の**グローバル同時実行数を制限できた証拠ではない**。本番導入にはリクエストの冪等性、端末バックグラウンド復帰後の再試行、会計の確定/送信二重化防止、Cloudflare Durable Object等による店舗単位の全体制御の検証が必要。

**証拠保存**（Git無視）：`test-results/common-worker-b-cloudflare-readonly-20261104/` の `stages-load-result.json`、`proxy-only-load-result.json`、`pos-b-admission-preview.log`（上限35のFAIL）、`pos-singleflight-load.log`、`pos-bootstrap-coalesced-load.log`、`pos-admission-retry-load-result.json`、`pos-admission-1store-500-retry-result.json`、`pos-b-admission-8-preview.log`。既存QA物理D1/R2の読み取り以外は実施せず、実店舗Workerの本番デプロイ、DB書込み、commit/pushは行わない。**正式QAのPASS件数とは混同しない**。

## B方式のアプリ接続・段階移行の実装（2026-11-04）

本節は、上記1000店舗スケールPoCの次段階として、**本番13店舗の経路・データを一切変更せず**ソースに追加した実装と検証結果。まだ「共通Workerへ本番移行完了」ではない。

### 実装した項目

1. `src/commonTenantGatewayCandidate.js`: 実行環境ごとの公開 `bootstrap` 実行数を、**明示された** `COMMON_GATEWAY_READ_ADMISSION_LIMIT` (1〜64) に制限する選択式の簡易admission。上限超過時に処理を開始せず `HTTP 429` / `{ok:false,error:"common_gateway_busy"}` / `Retry-After: 1` を返す。待機Promiseキューを作らない。設定が無い場合は無効。これは各Worker isolateごとの制御であり**全世界の同時実行上限は保証しない**。
2. `mobile-app/web/api.js`、`docs/yuwaku/api.js`、`docs/yuwaku/test/api.js`: 既存の共通API再送制御を利用し、**明示された安全な読み取り** `bootstrap` / `getSettings` / `getAllMenuForAdmin` / `getOperationsDelta` で、上記の**特定エラー** `common_gateway_busy` が来た場合のみ最大4回・1秒以上の待機＋ジッターで再試行する。汎用429（ログイン連続失敗等）では再試行しない。`__noInternalRetry`、ページ遷移世代の破棄、従来のネットワーク再送制御は保持。**注文・会計・AI課金・ログイン・セッション回転などの書き込み処理は自動再送しない**。
3. `src/commonTenantGatewayCandidate.js` は、Android/iOS共通アプリから必ず付加される `__diagnosticTraceId` を、形式検証後に限って**匿名公開メニュー取得の重複判定から除外**。追加業務パラメータや認証付き要求は共有しない。匿名 `bootstrap` は通常のNative RPCとGAS互換 `?api=1` を**別々のkeyで束ね**、両プロトコル間で応答形式を決して混在させない。その他のGAS業務要求も共有しない。公開画像 `GET /images/<store>/...` は厳密な店舗ID形式を要求し、Control D1・物理D1/R2の所有者一致を確認してから**既存実POS画像配信コード**へ渡す。private写真・店舗IDすり替え・URLエンコード横断を拒否。
4. `src/commonTenantGatewayWorker.js`: 現行POSサービスへ接続する**非公開Service Binding用の単一共通Workerエントリ**を追加。普通の公開URL/正式本番Wrangler設定はまだ配布していない。
5. `src/controlPlaneWorker.js`: **オプトイン段階切替**を追加。Control設定 `COMMON_GATEWAY_CANARY_ENABLED=1`＋ `COMMON_GATEWAY_CANARY_STORES` に登録された店舗の、厳密な匿名 `bootstrap` だけを `COMMON_GATEWAY_SERVICE` へ渡す。画像は別フラグ `COMMON_GATEWAY_CANARY_IMAGES_ENABLED=1` が必要。既存の署名付き操作、ログイン、QR注文、会計、印刷、RevenueCat、cron、未登録店舗は専用Workerに残る。共通WorkerのService Bindingが欠落する有効カナリアは503として**無断で旧Workerへ戻さない**。フラグを無効にすれば旧Worker経路に切り戻る。**本番設定にはこれらのフラグ・Service Bindingをまだ追加していない**。

### 実行証拠と判定範囲

| 検証 | 結果 | 証明対象 |
| --- | --- | --- |
| `node test/auth_client_regression_test.mjs` | **304チェックPASS** | Web本番/test API同一、429読取再送、汎用429非再送、注文/会計/AI購入の再送禁止、既存認証 |
| `node test/native_read_transport_test.mjs` | **24チェックPASS** | Android/iOS双方のCapacitorHttpで429→同一読取再試行成功、書込み不再送、ページ遷移制御 |
| `node test/common_tenant_gateway_candidate_e2e_test.mjs` | **207チェックPASS** | Control/物理D1/R2所有者・世代・署名・権限、Native/GAS別の同時読取統合、429負荷admission、画像GET/プライベート拒否 |
| `node test/control_plane_routing_test.mjs` | **396チェックPASS** | QAカナリア経路選択、匿名・認証・追加項目の分離、画像GETスイッチ、欠落時のfail closed、フラグ切戻し |
| Cloudflare一時リモートプレビュー・実QA D1/R2 2店舗、診断trace付き100同時公開bootstrap | **100/100成功**、うち**45件**が正規のHTTP429を受け再試行し成功 | 実POS `bootstrap` と共通ゲートウェイ選択式429の実Cloudflare疎通。p95最終応答約3,543ms |

今回のCloudflare検証は**2つのQA物理DB/R2**に対する一時プレビューで、Control→共通WorkerのService Bindingを実際に本番用に切り替えた試験ではない。注文・会計・AI課金・QRトークン・CloudPRNTなどの全業務の正式E2E、各店舗へのバインディング追加/削除の自動化、複数リージョンを跨ぐ店舗別同時実行制御、rollbackの本番実演は**未完了**。正式QAのPASS件数には加算しない。

## 稼働中13店舗の接続設定自動生成と実Cloudflare検証（2026-11-04 続報）

- 新規 `scripts/build-common-tenant-worker-bindings.mjs --live`：既存の `tenantTargetsFromD1List` を再利用。Cloudflare D1 inventory／Control DBのactive店舗一覧を読み取った後、各店舗の**物理D1の所有者マーカー・世代・write state**をread-onlyで照合。**13/13店舗の所有者と世代を照合PASS**。共通Worker用 `test-results/common-tenant-private-candidate.toml` を生成（Control D1 1＋店舗D1 13＋R2 13）。`AUTH_SECRET`などの秘密鍵はファイルに含めない。R2の実所有者マーカーは起動後の要求ごとにさらに検証する。これは設定の生成であり、店舗登録フローへの自動リリース統合ではない。
- 新規 `test/common_tenant_binding_builder_test.mjs` **13/13テストPASS**：物理DB UUID混在、Control台帳の重複、不一致・欠落・世代ズレを拒否。実共通Workerエントリ `src/commonTenantGatewayWorker.js` のWrangler `--dry-run` もPASS。
- **Cloudflare remote preview：13実在店舗D1/R2 bindingの受付と動作PASS**。既存QA店舗2件のみ公開 `bootstrap` を通す、別の検証用allowlist Workerを使用し、100同時開始→**100/100正常終了、失敗0、P95=約1.33秒**。今回HTTP429が0件だったのは、同一店舗の同時取得がin-flightで統合されて8件のadmission枠を超えなかったため。以前の429再試行検証（100件、429発生）は別に有効。**13個の独立DBを全部読み書き負荷試験したわけではない**。
- 新規 `test/common_tenant_guest_route_boundary_test.mjs` **12/12テストPASS**：QR注文・卓番号の署名付きtableToken、店舗・卓・環境のすり替え拒否、未認証の会計・AI・スタッフRPC拒否、署名済みスタッフの他店舗ルート拒否、印刷用bridgeキーの限定用途をテスト。既存共通候補ローカルE2Eは**233チェックPASS**。テストに署名付き資格情報を用いるが、**実店舗への注文・会計・課金・印刷書き込みのE2Eではない**。
- 上記新規テストをプロジェクトの連続テストにステップ222/223として登録し、**217〜223の部分パイプライン7工程PASS**（それ以前はこの部分実行で検証していない）。

**切替安全境界**：既存13店舗の本番Worker、Cloudflare Control Worker、本番D1/R2データは今回変更なし。生のPOS業務全経路を一括で共通Workerへ移す前に、署名付きスタッフ・公開QR注文・印刷・RevenueCat・AI・会計/オフラインの真正なE2Eおよび切戻し実演、複数isolateを跨ぐ全体負荷制御、店舗登録時のbinding更新自動化が必要。追加のremote previewはすべて終了し、ローカルのread-only証拠は `test-results/common-worker-b-cloudflare-readonly-20261104/` に残した。**正式QAの判定・本番移行は未完了**。

## 業務経路の段階切替と実POS結合検証（2026-11-04 続報）

### ソース側で追加した安全なB方式切替

- `src/controlPlaneWorker.js` にControlから共通Workerへ渡す個別フラグを追加。既存公開メニュー・画像フラグに加え、`COMMON_GATEWAY_CANARY_GUEST_ENABLED`（公開QR注文・卓情報ほか）、`COMMON_GATEWAY_CANARY_AUTH_ENABLED`（署名付き従業員操作・会計・AI等）、`COMMON_GATEWAY_CANARY_LOGIN_ENABLED`、`COMMON_GATEWAY_CANARY_CLOUDPRNT_ENABLED`、`COMMON_GATEWAY_CANARY_REVENUECAT_ENABLED`。すべて**既定OFF**かつ `COMMON_GATEWAY_CANARY_STORES` で許可された店舗に限る。Control上で個別に無効化すれば当該経路が既存の店舗別Workerへ戻る。**実本番フラグは未有効化**。
- `src/commonTenantGatewayCandidate.js` では、公開QRの署名付き卓トークンを実POSハンドラへ渡す前に店舗・卓・環境で検証。従業員の署名・有効期限・店舗ID一致は共通Workerがチェックし、実POSが失効・権限を再検証する。未認証の会計・AI購入・スタッフRPCは拒否。CloudPRNTはPOST/GET/DELETEの既存プロトコルを保ったまま、選択済み物理D1で保管されたキー・プリンタMAC・ジョブclaim/ACKを**既存ハンドラ**で検証する。課金Webhookは**Controlで署名照合・店舗決定・イベント重複claimを完了した内部ルートのみ**共通Workerへ入り、Control共有秘密鍵・物理店舗・route generation照合を再実施する。生Webhook本文のcustomerIdでDBを選択しない。

### 今回の実行証跡

| 検証 | 結果 | 判定範囲 |
| --- | --- | --- |
| `test/common_tenant_gateway_candidate_e2e_test.mjs` | **233チェックPASS** | 2店舗間の署名・卓QR・会計/AIスタッフ操作・CloudPRNTメソッド・Control署名済課金の物理DB選択、改ざん拒否（実業務delegateがモックの部分あり） |
| `test/control_plane_routing_test.mjs` | **409チェックPASS** | Control→共通Workerの機能別ON/OFF、旧Worker切戻し、RevenueCat署名・immutable inbox・重複拒否、印刷ルート |
| `test/common_tenant_real_business_e2e_test.mjs` | **40チェックPASS** | **2つの別SQLite実DBを使用して実B gateway→実POS業務ハンドラ**を実行。QR注文・clientId二重登録拒否・他店舗注文拒否→通常現金会計・重複会計拒否・単一receipt→CloudPRNT POSTでprint_queue claim、GET内容、DELETE完了、重複ACK、他店舗印字漏洩防止。加えてControl秘密鍵で認証された通知を**実RevenueCat適用ハンドラ**へ渡し、2店舗の契約状態反映、重複イベント無害化、他店舗billing customerの権限拒否、公開アクセス拒否まで検証 |
| 既存 `test/offline_checkout_backend_test.mjs` / `test/gas_compat_smoke_test.mjs` / `test/backend_rounds_1_10_regression_test.mjs` | **全実行PASS** | 独立業務コードのオフライン現金再送/実行結果再利用・全GAS互換・印刷ジョブ原子claim等の既存回帰 |
| Cloudflare一時remote preview（2QA物理D1/R2） | **公開系の実POS読取14/14成功、書込試行403拒否** | native/GAS bootstrap、getSettings、getMenu、getTables、getMenuRanking、getReservationFormConfig。それぞれ現物理D1/R2のread-onlyで確認。**QA DBへの注文/会計/課金/印刷書込みは意図して未実施** |

通常現金会計は二重送信に `already_settled` を返して2枚目の伝票を作らない。オフライン現金会計は別の永続化された冪等記録により同一伝票を再取得する。両者の再送応答の違いを混同しない。ローカルD1互換アダプターはD1 batchの`RETURNING` result rowsを正しく再現するよう修正してから40/40チェックPASSした。RevenueCatのテスト通知は**本物のprovider送信ではなく、Controlで署名とinbox claimを通過済みとした内部配送の合成fixture**。Control側の本物の署名処理・重複判定は別の `test/control_plane_routing_test.mjs` で実行しているが、Controlと共通WorkerをService Bindingで直結したCloudflare遠隔E2Eではない。

### 未完了の採用ゲート

1. 同じ物理DBに対して実Cloudflareの**安全な書込みfixture、独立before/after、cleanup証跡付き**のControl Service Binding→共通Worker→QR/会計/印刷/RevenueCat全業務E2E。現段階の30チェックはローカルの実業務処理でありCloudflare本番や正式QAのPASSではない。実プリンタ印字・StoreKit/GooglePlay購入証跡も別途必要。
2. すべての新規登録/削除/凍結店舗を共通WorkerのD1/R2 bindingへ自動反映する運用。13店舗のリストからの**read-only設定生成は成功**しているが、Store onboardingと連動した設定更新/Cloudflare側への安全な反映/再起動/切戻しは未完了。
3. **複数Cloudflare isolate／リージョンをまたぐ同時アクセス制御**。8件という設定はisolate内だけであり、全店舗・全世界の上限を保証しない。B方式への移行後もHTTP429を読取だけ安全に再試行し、二重会計・注文送信禁止を維持する必要がある。
4. 本番Controlと共通Worker間のprivate Service Binding配備、各Tenantとの `TENANT_AUTH_SECRET` 一致または安全な検証移行、Cron/内部保守/メール・Account deletion・Legacy認証・Refresh等の経路整合、正式QAの全件確認。いずれも今回の実装・ローカル試験をもって完了扱いにしない。

**運用状態**：現行13店舗の本番Worker/DBのデータは変更していない。共通Workerの正式deploy、Git commit/push、本番カナリアONは未実施。既存未コミット変更や並列作業を破棄しない。証拠ログは `test-results/common-worker-b-cloudflare-readonly-20261104/`。テスト結果を正式QAのPASS件数には加算しない。

## QA店舗の指定変更と実Cloudflare検証：yuwakubar（2026-11-04）

**ユーザー指定：以降のB方式の実店舗QA対象は `yuwakubar` とする。 `yuwaku` とは別店舗であり、取り違え禁止。** これまで使った `qa-onb001-20261021-r2` / `qa-onb002-mvi38qqf-d6bd72` は過去のテスト証拠として保持する。今回、他店舗IDを要求してもテスト入口が拒否することを確認した。

実Cloudflare資源の読み取り専用で、Control D1 `tenant_registry` の `yuwakubar` が `state=active`、`environment=production`、`generation=1`、物理D1 `tenant_provisioning_marker` の `store_id/environment/route_key` が一致、`tenant_runtime_state` は世代1・`open` を確認。既存 `scripts/build-common-tenant-worker-bindings.mjs --live` でも稼働中13店舗の生成・物理D1所有者照合を完了。R2の所有者マーカー（version 1）も `yuwakubar`、環境・routeKey・物理DB ID・R2バケット名の一致を**5/5項目PASS**。所有者IDや秘密鍵はチャット・文書へ転記しない。

登録商品46件（`on_sale=27`、`draft=19`）。公開メニューAPIは27件を返す。通常業務データは注文4件・会計履歴1件で、今回のテスト前後の件数は同じ。ユーザーがこの店舗を検証に使用中なので、注文・会計・AI購入・印刷等の**書き込みを許可しない一時Workerラッパー**を使用。Cloudflare `wrangler dev --remote` の非公開一時プレビューにControl＋`yuwakubar`の物理D1＋R2だけをバインドし、本番Workerは変更していない。

| 実行内容 | 実測結果 |
| --- | --- |
| Native `bootstrap` / GAS `bootstrap`、GAS `getMenu/getSettings/getMenuRanking/getTables/getReservationFormConfig` | **7/7正常応答**（すべてHTTP200、実POSコード、物理D1/R2所有者を確認した共通ゲートウェイ経由） |
| 書込 `submitOrder/finalizeBill`、他店舗 `yuwaku/qa-onb001`、偽造staff token、`login` | **6/6拒否**（全てHTTP403、DB変更なし） |
| 公開メニュー25同時 | **25/25成功**、P50=662ms、P95=669ms、P99=783ms |
| 公開メニュー50同時 | **50/50成功**、P50=734ms、P95=872ms、P99=874ms |
| 公開メニュー100同時 | **100/100成功**、P50=791ms、P95=1,034ms、P99=1,040ms |

実メニュー27件の応答を含むテストであり、空メニューだった以前のQA店舗より現実的な読み取り量になっている。ただし、**Cloudflare一時プレビュー＋ローカルProxy経由**の数値であり本番ユーザーのSLAを証明しない。100件をDBで独立して処理したという意味でもない（共通Workerの同時 `bootstrap` 読み取り統合が働く）。Native専用POS APIに `getMenu/getTables` を直送すると404、Native `getSettings` は認証なしで401になるため、GAS互換公開経路だけでテストするよう検証スクリプトを修正した。既存API仕様の違いであって本番変更はしていない。

証拠：Git無視領域 `test-results/common-worker-b-cloudflare-readonly-20261104/` 内の `yuwakubar-readonly-smoke-result.json`、`yuwakubar-readonly-load-result.json`、ログ、所有者マーカー読込結果。検証用remote previewは停止済み。**店舗別本番Workerへの移行反映・コミット・プッシュ・正式QA判定は未実施**。以降の書込み実験では、`yuwakubar`専用fixture、独立before/after、重複実行オラクル、後片付けを用い、既存4件の注文・1件の会計履歴を保護すること。
