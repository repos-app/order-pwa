# 旧店舗別Worker所有者メタデータの撤去（2026-11-05）

## 結果

- 目的：実体のない `izakanpai-api-<storeId>` を物理D1/R2の所有者欄に新規記録・照合する旧仕様を廃止する。旧Workerを新規作成・復旧せず、既存13店舗の物理D1/R2とControlの店舗分離を維持する。
- 結論：**13/13店舗のD1 `tenant_provisioning_marker.worker_name` を削除し、R2 `_izakanpai/provisioning-owner.json` をVersion 2（旧 `workerName` なし）へ移行**。共通GatewayとProvisionerはVersion 2以外を拒否する。新規店舗の生成処理も旧名称を記録しない。
- 確認済み：全13店舗についてControlの店舗ID/routeKey/generation、物理D1 UUID、D1 runtime generation、物理R2バケットとVersion 2所有者内容の読み取り照合を実施。
- 旧専用Workerのデプロイ・再作成なし。注文・会計・顧客の業務データ変更なし。旧メタデータ用の一度限りの移行スクリプトは完了後に削除。

## Cloudflare作業と実証

1. 事前全件照合：13/13 PASS（変更なし）。
2. 移行互換Workerを先行反映し、シークレットや物理D1/R2を保持：
   - private `izakanpai-common-gateway` Version `ccc66744-4ba5-4a98-a0dc-390778c1699e` 100%。
   - `izakanpai-tenant-provisioner` Version `5d40e02b-2183-44f3-bc37-4b8565766ec5` 100%。
   - `teat`、`yuwakubar` の本番公開API 8/8成功を確認してから変更を開始。
3. 全13店舗のR2所有者JSONを旧版からVersion 2に変換し、D1の旧カラムを削除。元のR2所有者JSON、D1照合結果、各店舗の結果は無視対象ローカル `test-results/legacy-worker-owner-retirement-20261105/` に保存。
4. 初回実行：**12 PASS / 1 FAIL（yuwaku）**。これは記録から消していない。個別の独立した再読み取りでは、`yuwaku` のD1旧カラム削除とR2 Version 2更新が実際に完了していた。
5. 全13店舗を読み取り専用で再検証：**13 PASS / 0 FAIL**。結果 `result-verify.json`。これは正式Android/iOS QAを意味しない。
6. 旧Version 1所有者の受け入れをソースから完全撤去し、最終版を反映：
   - `izakanpai-common-gateway` Version `d52bce95-146e-448c-86a8-9758d2c2a306`、100%配備。
   - `izakanpai-tenant-provisioner` Version `d534d12b-badd-4be9-8b43-a9527e41513f`、100%配備。
   - Cloudflareの `AUTH_SECRET`、`AUTH_SECRET_TEAT`、`AUTH_SECRET_YUWAKU`、`CONTROL_SERVICE_SECRET` と `PLATFORM_BILLING`／`PLATFORM_EMAIL`、D1/R2 bindingsが維持されていることをバージョン読み取りで確認。
7. **最終本番確認**：13店舗×4公開API（`bootstrap/getMenu/getSettings/getTables`）**52/52 HTTP 200・成功**。独立R2所有者監査 **13/13 PASS**。`test-results/common-worker-b-cloudflare-readonly-20261104/public-read-*-owner_strict_final.json` および `r2-owner-all-active-audit.json` に証拠保存。

## 実装・回帰

- `src/tenantProvisionerService.js`：新規D1 markerの旧カラム作成を廃止。新規R2 ownerをVersion 2で発行。既存Version 2以外は拒否。
- `src/commonTenantGateway.js`：物理D1/R2・Control世代による照合を維持し、R2 owner Version 2・全7項目のみを許可。旧名での照合を除去。
- 開発者コンソール・R2監査・QA店舗所有者確認も旧カラム/旧フィールドの参照を廃止。
- 旧デプロイ運用資料 `docs/IZK_TENANT_WORKER_RELEASE_POLICY_20261104.md` を削除。CIに旧Worker名の所有者記録を再導入させない検査を追加。回帰テスト `test/physical_owner_metadata_retirement_test.mjs` を共通テストパイプラインへ登録。
- 正式なAndroid/iOS実機QA、実課金購入、実新規店舗作成E2Eは**未実施**でありPASS件数へ加算しない。

## 補足

既存資料・Git履歴中の旧Worker名は歴史的証拠。現在の稼働中店舗専用Workerを意味しない。QA専用の独立Workerや共通GatewayのService Bindingは本変更の削除対象ではない。

## 追加整理（2026-11-05、正式QA対象外）

- 開発者コンソールの完全削除画面および運用READMEを訂正。削除するのは対象店舗専用のD1/R2と共通Gateway内の該当bindingであり、共通Worker本体は削除しない。画面内で「対象店舗の共通Worker接続」と「共通Worker本体」を区別。
- 実行中ソースに残っていた旧店舗専用Workerへの転送・処理というコメントを現在の共通Gateway構成へ訂正。課金SDKキーのローカル上書き挙動など、実際に使用中の機能は変更しない。
- システム構成HTMLの概要、Mermaid構成図、デプロイフロー、データ構成、環境説明を現行の4 Worker構成へ更新。deploy_everything.bat は実際にはPublic RouterとFrontendを更新し、Common Gateway／Control／Provisionerは別途更新することを明記。
- Native APIソース内の旧経路説明1行のみ修正。並行作業中のUI／AI解析修正はコミットに混入させない。
- CIの no-dedicated-tenant-worker-gate に、旧構成の説明文や古い構成図の再混入を検出する条件を追加。
- 本番4サービスの現行配備割合はすべて100%。登録APIへの不正な店舗IDによる非破壊的な疎通は HTTP 200／invalid_workspace で想定どおり拒否された。店舗作成・D1/R2作成は実行していない。
- **実新規店舗作成・ログイン・資源削除の本番E2Eは未実施。**本番Controlに開発者用削除シークレットがなく、Windowsローカル開発者コンソールの資格情報も未設定であるため、削除可能性が確認できない試験用店舗を本番に作らない。これは残る本番E2Eのブロッカーであり、非破壊的な疎通PASSと混同しない。
