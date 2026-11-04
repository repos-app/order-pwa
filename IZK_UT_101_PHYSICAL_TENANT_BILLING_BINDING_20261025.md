# IZK-UT-101: 物理Tenantの課金Binding欠落（共通Provisioner）

## 発見と事実（2026-10-25 PHT）

- iPhoneの課金画面に「この端末用のRevenueCat公開SDKキーがサーバーに登録されていません」が表示された。
- teat実環境のremote-preview read-only Broker通信：`secretConfigured=true`, `serviceBindingConfigured=true`, HTTP 200, iOS Appleキー形式PASS。値を出力・保存していない。
- Cloudflare現在配備の `test1` Tenant (10/25 04:28Z作成) には `CONTROL_SERVICE_SECRET` Secretはあるが `PLATFORM_BILLING` Bindingがなかった。Control D1では`test1`も`teat`もactive。ユーザー端末がどちらにログインしていたかは未確認。
- `scripts/tenant-provisioner-lib.mjs` のWrangler出力には課金Bindingがあるが、**新規物理Tenantを作る別の本番実装** `src/tenantProvisionerService.js` の `tenantBindings()` には `LEGACY_AUTH`/`PLATFORM_EMAIL`のみ。`assertTenantWorkerSettings()`も課金Bindingを検査しておらず、Provisioner経路で作った全新規店舗に欠落が起こり得た。これはソースと実配備の両方で確認できる共通原因。

## 改修と実結果

- 共通`tenantBindings()`に本番用`PLATFORM_BILLING`→`izakanpai-api`を追加。
- `assertTenantWorkerSettings()`にBinding一致を要求。既存Workerの正当性、D1/R2の一致、コードハッシュを検証したうえで、旧Provisioner製Workerの「課金Bindingだけ欠落」を自動補完。別サービスへの付け替えは禁止。秘密値は継承（取得・出力なし）。
- 既存のAI Binding移行と同時に補修できるようにして、個別ケース専用ロジックの増殖を避けた。
- 旧店舗削除時の正当性検証では、課金Bindingの欠落だけで削除不能にしない。D1/R2/Token等の厳格な検証は維持。
- `scripts/tenant-production-isolation-audit.mjs`も課金Bindingを共通必須項目として更新。
- 回帰12件PASS、FAIL 0 (`tenant_provisioner_service`, `tenant_provisioner_control_deployment_readiness`, `tenant_internal_provisioning_boundary`, `control_plane_provisioning`, `billing_shared_platform_sdk`, `tenant_provisioner`)。Provisioner自身の統合チェック38点PASS。
- Provisioner Workerを本番に更新。最初の版 `26f87559-7e09-4906-87b7-88a81b26ac50` の後、cleanup後方互換と保守用共通関数exportを反映した最終版 `f5e19b25-d3fe-4882-9eee-0759924ea830` を配備。通常Cron `*/15`を維持。
- `test1`は既存Provisionerの `ensureTenantWorker()`をremote-previewで呼び、現在のWorkerコードのテンプレート一致・DB所有・既存Binding等を検査した後、**不足の1 Bindingのみ**補完した。既存Workerの再作成なし (`workerCreated:false`)。読戻し：新現行バージョン `18783412-b467-4218-8185-e1a23626599c` が100%配備、`PLATFORM_BILLING:service:izakanpai-api`、既存DB/Secretは維持。
- `teat`設定変更なし。Control/Tenant D1の業務データ書換えなし、課金・Webhook・Pro付与なし。端末ログイン店舗の確証・StoreKit購入成功・正式QA判定は未実証。
- Control Registry上の active 12店舗を一括確認する読取り試行では、Worker単位のバージョン取得が全件 `VERSION_UNVERIFIED` となり、監査結果としては使用不可（独立で成功した`teat`/`test1`/`yuwaku`取得と矛盾）。この一括監査を正式なカバレッジには算入しない。QA用の多数の一時店舗は未確認。

## 修正後自己レビュー（10観点、すべてソース対象）

1. 物理Tenant生成経路を修正、Wrangler手動生成経路だけで終わらせない。
2. 全店舗共通サービスBindingを使用、キー配布の店舗別設定を増やさない。
3. `production`のみ課金Bindingを生成し、Sandbox混在を回避。
4. サービス名は既存cfg.publicWorkerを利用、別Workerへの転送は禁止。
5. `assertTenantWorkerSettings`で型・サービス一致を検証。
6. 既存Workerのコードhash一致を先に検証し、異なる実装を無断上書きしない。
7. D1/R2・Tenant ID・Secret構成の既存ガードを継続。
8. Secret変更時はinheritのみ（実値を読まない・出さない）。
9. 旧AI Bindingの補完と一回のPATCHで共存可能。
10. 課金以外の異種・不正Bindingを自動修正しない。

## 同種横展開レビュー（10観点、ソース対象／実機QAとは別）

1. 新規店舗の`tenantBindings()`に適用。
2. `test1`のような旧Provisioner生成店舗の欠落に適用。
3. 既存`teat`の完全Bindingは無改修で維持。
4. 既存`yuwaku`の完全Bindingは無改修で維持。
5. `LEGACY_AUTH`と`PLATFORM_EMAIL`の既存接続を残す。
6. iOSは`appl_`、Androidは`goog_`の既存判定を維持。
7. 不正な他Worker Service Bindingは拒否。
8. 追加の異物D1/R2 Bindingは拒否。
9. テンプレート/既存Workerコード差異は無変更で拒否。
10. 旧店舗の正式削除・cleanupは、課金Binding欠落だけで停止させない。

## 正式完了の残条件

- ユーザー端末のログイン店舗がどこかを確認し、iPhoneで「プランとお支払い」にRevenueCat実Offeringが表示されること。
- 購入、Apple Sandbox決済、正規RevenueCat通知、Control経由Tenant D1状態、復元・画面再表示を証拠で確認。現時点では正式課金QA PASS追加0。

## 2026-10-26 PHT 追跡修正：Binding補完だけでは課金画面が復旧しなかった

原因の切り分け：最初のiPhone画面の利用者名とOwnerの既存DB行を、個人情報を返さないread-only `COUNT(*)` で照合。対象は `test1`（1）、`teat`（0）、`yuwaku`（0）。ログイン店舗そのもののトークンを閲覧したわけではないが、表示名と一致するOwnerが存在するのは `test1`。`test1` で `store_plans` free 1行、active Owner 1行、billing_customers 0行をread-only確認。

**二段目の根本原因**：`test1` はProvisionerが `izakanpai-tenant-template` のコードを複製して作成。テンプレート稼働コードの版 `c34c5edb-0a90-44d1-aed2-ae8285db0a2d` は **2026-10-17 14:04 UTC** 配備。一方、共通Billing Brokerを使うサーバーコードの取り込みは10/24（`25105f9`）以後だった。10/25の対処は `PLATFORM_BILLING` メタデータだけ補完し、**Workerコード自身を更新していなかった**。したがってユーザーの再読込後も旧サーバー実装が動く。

実際に行った対応（店別の業務DB内容や課金プランには書込なし）：

- `test1` の稼働Versionで `DB` UUID、`TENANT_ID`、`AUTH_ENVIRONMENT`、R2名、既存課金Binding/Secret名を検証し、既存共通 `renderTenantWrangler` で同じBindingを持つ一時Configを作成。最新版 `src/index.js` の **dry-run PASS** 後、`test1` のみコード更新。Version `036ad5d4-2c68-4e22-afa6-5b943c114bcb` が100%稼働し、`PLATFORM_BILLING=izakanpai-api` と `AUTH_SECRET`/`CONTROL_SERVICE_SECRET` 保持をRemote read-backで確認。
- 新規登録で使う `izakanpai-tenant-template` も同じ最新版 `src/index.js` に更新。Version `2e7f5586-480c-4863-8c20-5df16da5d81b` 100%稼働、Worker `AI` bindingのみを維持。公開ルートは作らない。
- `src/tenantProvisionerService.js` で、Cloudflareから取得した**実テンプレートのバンドル本文**に `PLATFORM_BILLING` とiOS用公開SDKキー参照が存在することを、コピー直前に共通検証。古いテンプレートなら `tenant_template_billing_broker_stale` でFail Closed。架空のキーや不正な代替Backendで購入可能にしない。
- 共通Provisioner版 `621cf3a0-0066-4d98-b899-f9367b02fca3` 本番配備、通常Cron `*/15`維持。テストでは旧テンプレート拒否／Broker対応テンプレート許可を追加。
- 課金・Provisioner周辺テスト28件PASS（配備前のサーバーソース・UI回帰）。新規テンプレートガードの回帰10件PASS/0FAIL、Wrangler dry-run成功。これらは公式iOS購入QA PASSではない。
- 公開Router `/health` HTTP 200、`test1` へ到達する無効認証のread-only `checkToken` HTTP 401（正しく拒否）。この負例はOwner課金Identity取得成功の証拠ではない。
- Remote Control D1 activeの12店舗のWorker metadataを再監査：`test1`/`teat`/`yuwaku` の3店舗は `PLATFORM_BILLING` OK、過去のQAオンボーディング用9店舗はMISSING。**9店舗は今回更新せず**、QA店舗 `teat` 以外のテスト実施や既存業務データへの書込は行わない。
- iPhone/TestFlightに同梱されている古い `billing-native.js` の日本語診断文言はサーバー配備だけでは更新されない。アプリ配布は未実施、Native実購入とRevenueCat実通知は未確認。

### 二段目修正ソース・自己レビュー10観点

| No. | 点検 | 結果 |
|---|---|---|
| S01 | 店舗別のUIコードではなくWorkerテンプレートの稼働版差を確認 | 10/17の古い版を確認 |
| S02 | `test1` D1のUUIDとWorkerのBinding一致 | 一致 |
| S03 | User/Owner照合はDBの集約数のみ（個人情報未出力） | 確認 |
| S04 | Worker配備前に通常のテストとdry-runを実行 | PASS |
| S05 | 本番更新時に課金Secretを置換・出力しない | Secret名保持を確認 |
| S06 | テンプレートの安全確認は実Cloudflareバンドル本文を見る | `workerContent`で取得 |
| S07 | Broker参照とiOS公開キー参照の両方を要求 | `assertTenantTemplateBillingBroker` |
| S08 | 古いテンプレートでは新Tenantを作成しない | stale拒否テストPASS |
| S09 | 既存コードDigest・D1/R2所有照合は削除しない | `ensureTenantWorker`順序を確認 |
| S10 | `teat`/`yuwaku`など他店舗のプランとデータは変更しない | 他店舗書込なし |

### 同種事象の横展開レビュー10観点（ソースレベル）

| No. | 対象 | 結果 |
|---|---|---|
| X01 | 新店舗作成の実Provisioner経路 | コピー直前のバンドル検査追加 |
| X02 | `renderTenantWrangler` 手動生成経路 | 既存共通Binding再利用 |
| X03 | `test1`（ユーザー画面とOwner名一致） | 最新コードへの再配備確認 |
| X04 | `teat`（QA正本） | 既存の正常Binding保持 |
| X05 | `yuwaku`（本番既存） | 既存の正常Binding保持 |
| X06 | 9個のQAオンボーディング用既存Worker | 欠落を監査、未改修と記録 |
| X07 | 旧テンプレートのiOSキー失敗 | 自動コピーを拒否 |
| X08 | Android用の既存OS別キー判定 | `subscriptions.js`のOS分岐維持 |
| X09 | 配布済みNative資材 | 旧文言の残存を明確化、未配布 |
| X10 | 正式QA／Apple Sandbox購入・Webhook/D1 | 実証なし、正式PASS増分0 |

**未完了：** ユーザーiPhoneから再読込して実際のOffering表示確認、Apple Sandbox取引、真正WebhookとD1 Pro反映・復元、古い他店舗Workerへの対応計画。サーバーを配備しただけで「課金復旧PASS」としない。
