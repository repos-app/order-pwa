# izakanpai 共通Worker専用構成 — 2026-11-05 本番反映・整理記録

## 最終構成

`izakanpai-api`（公開Router）→ `izakanpai-control-plane`（店舗認証・経路）→ **非公開 `izakanpai-common-gateway`** → **店舗ごとに物理的に独立した D1 / R2**。

新規登録は `izakanpai-tenant-provisioner` が専用 D1 / R2 を作成し、共有Workerのバインディングを拡張する。**店舗別Workerは作成しない。** 旧方式へのフォールバック、旧Worker生成CLI、旧認証ブリッジ、旧移行ジョブ、旧QA互換コードはソースから削除済み。

## 検証済み結果

| 対象 | 結果 | 検証方法 |
| --- | --- | --- |
| 本番Control上の稼働店舗 | **13/13 `runtime_mode=common`** | Cloudflare D1 リモート読み取り専用SELECT |
| 店舗別物理D1 / R2 | **13/13 所有者照合PASS** | Control登録情報、D1実体・マーカー、R2 owner GET |
| 不要な旧店舗専用Worker | **13/13 削除確認** | Cloudflareへの全13件独立問い合わせ、Worker不存在を確認 |
| 本番公開API | **52/52 PASS（13店舗 × 4操作）** | `bootstrap`, `getMenu`, `getSettings`, `getTables` の実通信、読み取りのみ |
| 共通Worker配備 | **PASS** | `aa78f02e-3f17-47d6-82f2-735f6b45fd0d`、100%配信 |
| Control配備 | **PASS** | `f207a8b4-198a-4a8c-a26b-1ad2973fd9da` |
| Provisioner配備 | **PASS** | `c99afade-2118-4d2b-b0ee-671fc07fd9f8` |
| 公開Router配備 | **PASS** | `ea305126-0406-4c70-a37e-c8bf92766191` |
| プロジェクト回帰テスト | **205/205段階PASS** | 整理後ソースの一括ローカル実行。正式QAではない |
| ソース整合性 | **19/19 PASS** | `node scripts/common-only-source-gate.mjs` |
| GitHub反映 | **完了** | `main` / `c712d13`（整理・実装コミット） |

## 保持する資産と削除した資産

- **保持**：13店舗のD1/R2、Control登録、認証シークレット、現行課金・印刷・注文処理、`src/index.js`（共通Workerが実際に呼ぶPOS本体）、開発者専用の店舗完全削除機能。
- **削除**：旧専用Worker 13件、専用Worker生成用のテンプレート、旧ローカルProvisoner CLI、店舗別Workerを生成・再配備するGitHub Actions、旧経路分岐、旧切替機構、旧鍵移送、旧QA専用スクリプトと互換テスト。
- R2所有者レコード内の `workerName=izakanpai-api-<店舗>` は、**既存データの作成元を示す不変の所有者メタデータ**。現行のサービスバインディングや実在Workerを指すものではない。所有権整合を壊すため、物理データを無理に書き換えない。

## 正式QAとして計上しないもの

205段階のプロジェクト回帰テストや52件のAPI読み取りは、**正式なAndroid/iOS端末QAのPASSではない**。正式QAはこの整理済み構成で新しく実施する。

現時点では、実機の全ケース、実プリンター印字、Apple/Googleの実購入、本番での新規店舗作成→D1/R2配備→削除の一連のE2Eは、この作業で新たに正式検証していない。旧QA台帳や旧方式の互換確認を、新構成の完了条件にしない。

## 証拠（ワークスペースの `test-results/` 配下、Git非管理）

- `common-only-final-205-20261105.log`
- `common-worker-b-cloudflare-readonly-20261104/r2-owner-all-active-audit.json`
- `common-worker-b-cloudflare-readonly-20261104/public-read-*-cleanup-final-20261105.json`
- `common-gateway-production.toml`（13店舗の物理D1/R2から再生成した配備用スナップショット）

この構成では、旧店舗Workerの復活や旧仕組みへの切戻しを前提にしない。
