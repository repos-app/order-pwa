# IZK-UT-069 / D1 0044–0046 全店舗・新規店舗基準の本番適用

**実行日:** 2026-10-17 PHT（Cloudflare実行ログはUTC 2026-10-16）
**ユーザー承認:** 「全部の店舗とベースD1に適用して」
**範囲:** izakanpai物理店舗D1全件＋新規店舗Provisionerの基準Migration・必須スキーマ検査。
**実行状態:** **既存店舗2/2 本番適用完了／Provisioner本番配布完了**。アカウント全体の長期課金監視・実新規店舗E2Eは別ゲート。

## 対象・除外

Cloudflare同一アカウントの `wrangler d1 list --json` に表示された**9 DB**を分類。対象は所有証明済み `izakanpai-teat`（UUID `988cc818-fb77-49ff-aacd-c925991257bd`）と `izakanpai-yuwaku`（UUID `b0aa5df0-1022-4013-91f6-51126331830b`）の**2件すべて**。開始時の両店舗 `tenant_provisioning_marker.schema_version=0043_coupon_start_date.sql` を本番SQLで確認。

`izakanpai-platform` / `izakanpai-control` は店舗用テーブルを持たず、0044–0046を誤適用しない。他アプリ（hataraku-nihongo 2 DB / PitaYasu 1 DB / KuraPinas 2 DB）も対象外。**独立した「ベースD1」実体はない**。今後の店の基準は `migrations/*.sql` → `src/tenantProvisioningMigrations.generated.js` → `src/tenantProvisionerService.js` によってD1へ生成する仕組み。

## バックアップ・差分適用・Cloudflare実測

機密を含むフルSQLエクスポートは `.qa-v2-official/android/d1-fleet-migrations-0044-0046-20261017/` の中に保管し、ローカル `.git/info/exclude` でGit追跡除外した。**バックアップデータをGit/会話へ公開しない**。

| 店舗 | 事前フルバックアップ | SHA-256（ファイル） | 移行結果 |
|---|---:|---|---|
| `teat` | 854,951 bytes | `bfb3f5eb3af3578c6c9bd2ab7367313475dfd432fec64a27412be150d9eb2ba9` | 39 SQL / rows_written 60 / success true |
| `yuwaku` | 18,422,104 bytes | `255f6250905f545a4dbeb8261cea08f819931bdf4cde58a5b1e6cbbb7dca7f2a` | 39 SQL / rows_written 45 / success true |

バックアップをオフラインSQLiteでそれぞれ再生して0044→0045→0046、店別marker更新まで再現し、注文74/36,132件と店舗1/1の件数を保全、`PRAGMA integrity_check=ok`、全オブジェクト出現、27個の0045 trigger、部分索引選択を確認。単独適用SQLはバックアップと同じローカル専用フォルダに各店舗別UUID・store IDを明示して作成。

本番ではQA `teat` に先行適用、実D1でowner marker・版0046・必要3オブジェクト・trigger27・注文74件・`EXPLAIN QUERY PLAN`を独立検証した後、`yuwaku` に適用。両店舗とも `purchase_orders` / `operations_revision` / `idx_orders_commission_open_store_date` が存在し、revision seed 1行、schema marker **`0046_commission_open_orders_index.sql`**。`yuwaku`注文36,132件維持。両店とも `EXPLAIN` は `SEARCH orders USING INDEX idx_orders_commission_open_store_date (store_id=?)`。

### 同一述語・別INDEX指定による本番D1行読取比較

比較SQLは実クライアントAPIとは別の**読み取り専用 `COUNT(*)` ベンチマーク**。旧 `idx_orders_store_status` を強制した場合と、新 `idx_orders_commission_open_store_date` を強制した場合で `WHERE store_id=? AND status NOT IN ('会計済','取消')` を同一に固定。

| 店舗 | 旧 rows_read | 新 rows_read | 返却件数（両SQL一致） |
|---|---:|---:|---:|
| `teat` | 74 | 13 | 13 |
| `yuwaku` | 36,132 | 0 | 0 |

両店舗とも Cloudflare D1 `meta.rows_read` と `rows_written=0` を確認。**この特定検索の実効果は確認済み**だが、アカウント全体の24時間 rows_read / rows_written・実ページ経由の長期負荷・0045トリガーの更新時書込み増幅までは未計測であり、全体P0 CLOSEDと混同しない。

## 新規店舗の基準・本番Provisioner反映

- generated migration の実データは **45件**（プラットフォーム専用0040を除外）、末尾は0043/0044/0045/0046。SHA連結digest `6cedb12fbd09dd6bc570d211e8b1be7b87247dd6c613352ce4bb2b6b686c4a06`、HEADに含まれる生成物と同じ。**新規店舗作成時のベースはもともと0046 SQLまで同梱済み**で、今回本番の既存D1と必須検査を追いつかせた。
- `src/tenantD1SchemaContract.js` の必須検査を旧0043のみから0044 purchase_orders+索引/店境界trigger、0045 operations_revision+27trigger、0046 commission partial indexまで拡張。テナントID/環境/DB UUID照合も継続。契約不足時はFail Closed。
- `test/tenant_d1_schema_contract_gate_test.mjs` と `test/tenant_provisioner_service_test.mjs` の実装を新契約に合わせ、正常/不足パスと失敗モックを独立回帰。Provisioner `wrangler deploy --dry-run --keep-vars` 成功後、**本番 `izakanpai-tenant-provisioner` をデプロイ**。新Version ID `a7f4ff30-7fa6-47c4-8479-660d95771dee`、Cloudflare Worker ETag `2b1739c7e5370b474b715e05e1d241aae4d4a96d9917e8b7621b263a7d7ff57a`。既存3 Secret種類とControl service bindingをversion metadataで確認。cron `*/15 * * * *` は旧仕様を維持。
- `izakanpai-tenant-template` は別D1を持つテンプレートではなく、Provisionerが新店舗Workerのコードを複製するベースWorker。10/16に配布済みのVersion `2d379363-8c5a-4a7b-8f47-d70f795a83cc` を保持し、今回のD1スキーマ変更だけを理由とした不要な再デプロイは行わない。新規店舗がデプロイで本当に登録できるかという外部E2Eは未実施。
- `node scripts/tenant-d1-schema-contract-gate.mjs --all` は**新しい0046契約**で `{ok:true,count:2}`、`teat/yuwaku`とも `failures:[]`。これはCloudflareリモート実D1照会の結果。

## 自己レビュー10巡／横展開10巡

| 巡 | 自己レビュー（各々異なる根拠） | 判定 |
|---|---|---|
| S01 | Cloudflare D1一覧9DBを実取得し店舗2・別用途7を除外 | PASS |
| S02 | 各店舗markerをstore ID/DB UUID/environmentまで本番SQL確認 | PASS |
| S03 | 2店舗の完全SQLバックアップとファイルサイズ/各SHA取得、Git隔離 | PASS |
| S04 | 両バックアップをSQLiteに再生し3 migrationのDDL・data preservation・integrityを独立検査 | PASS |
| S05 | 0044 purchase_ordersのStore/supplier外部キーと索引・3trigger成立をオフライン/本番で検査 | PASS |
| S06 | 0045 revision seed＋計27triggerが全店舗に存在することを本番metadataで検査 | PASS |
| S07 | 0046新部分索引が旧未知ステータスを維持する同一述語でEXPLAIN選択されることをオフライン/本番で検査 | PASS |
| S08 | `teat`成功と版0046/注文保持を受理してから `yuwaku`へ進行したことを実順序で確認 | PASS |
| S09 | Cloudflare D1の同条件旧INDEX指定 vs 新INDEX指定で返却数・rows_readを計測し、比較対象を混同しない | PASS |
| S10 | generated digest・Gate本番2/2・Provisionerの新Worker版/Secret binding保持・Nodeプロビジョニングテスト/差分形式を検証 | PASS |

| 巡 | 横展開（独立対象・経路） | 判定 |
|---|---|---|
| H01 | QA物理店舗 `teat` 本番D1全オブジェクト・row/owner・planner | PASS |
| H02 | 実店舗 `yuwaku` 本番D1全オブジェクト・row/owner・planner | PASS |
| H03 | `izakanpai-platform` は店舗migration対象から除外、構造の混同を防止 | PASS |
| H04 | `izakanpai-control` は同様に除外し所有マーカーを保持 | PASS |
| H05 | HatarakuNihonGO 2 / PitaYasu 1 / KuraPinas 2 DBは非対象と照合 | PASS |
| H06 | 新規店舗のMigration生成器が0046まで含むことと、旧0043/新0046を区別するschema gate | PASS |
| H07 | Provisioner Workerの実本番デプロイと更新後のBinding/Secrets種類を検査 | PASS |
| H08 | Template WorkerとProvisioner Workerを別機能として確認。Template自体に物理D1がないことを検査 | PASS |
| H09 | 歩合対象注文の旧/新SQLの結果一致・実D1 index planner・局所rows_readを確認 | PASS |
| H10 | 既存注文数、0045トリガーによるrows_written増幅、店舗以外を含むアカウント全体Usage・新規店舗の実E2Eを別ゲート管理 | **局所PASS／長期計測・新店E2E PENDING** |

## 未完了・運用注意

新しい物理店舗を実際に1店舗作って後片付けするE2Eは未実施（本番実店舗作成が伴うため）。D1フリープラン/有料プランの契約状態、日次/毎時のトータルUsage、PitaYasu/KuraPinasを含む全アプリの負荷削減率は本件で確認していない。他システムのDBには触れていない。正式Android/iOS QA台帳にPASS追加なし、停止済みWindowsタスクの起動なし。今回Git commit/push、アプリAPK/IPA/ユーザー向け店舗Workerの再デプロイはしていない。
