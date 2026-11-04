# TestFlight SANDBOX購入の共通QA登録（2026-10-30）

## 実態

- 通常の PRODUCTION 決済はすべての有効な店舗で共通の署名検証・テナント別ルート処理を通る。
- TestFlight/StoreKit の SANDBOX は実際の支払を証明しないため、**本番の任意の店舗にProを無条件付与してはいけない**。
- 旧システムは Control/Tenant の二重 REVENUECAT_QA_SANDBOX_STORE_IDS=teat に依存し、test1など別のQA店舗でSandbox取引がProに反映されなかった。

## 新しい仕組み

1. control-plane/0009_revenuecat_sandbox_enrollments.sql を正式なControl D1に一度だけ適用する。
2. QA利用を認めた店舗を revenuecat_sandbox_enrollments に store_id / 将来のUTC expires_at / 監査用 reason で登録する。店舗IDはソースやWranglerの許可リストに書かない。
3. Controlは署名済みWebhookから購入者IDで実際のTenantルートを確定し、Apple Sandbox・許可商品・期限内の登録を照合する。合格した通知だけに内部認証済みのQA許可を付与してTenantに送る。
4. Tenantは tenant.internal の内部認証が成功した通知だけにQA許可を適用し、該当店舗のbilling_customers・イベント・Pro権限期限を既存の共通処理で照合する。
5. 登録期限後は新たなSandbox通知を拒否する。正常な本番決済とテナント分離には影響しない。

## 運用

Control D1での登録例（承認されたQA店舗だけを指定）:

```sql
INSERT INTO revenuecat_sandbox_enrollments (store_id, expires_at, reason)
VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ','now','+7 days'), ?)
ON CONFLICT(store_id) DO UPDATE SET
  expires_at=excluded.expires_at, reason=excluded.reason;
```

Pro権限を直接D1へ書き込んだり、RevenueCatイベントを捏造しない。過去に拒否された購入については実際のApple/RevenueCat取引・Webhook再送を確認し、オーナー操作の「購入を復元」を活用する。画面の購入完了表示だけではPro PASSとしない。

## その他の店舗ID固定分岐監査

- src/crm.js のQA会員fixture削除、src/qaAttestation.js の正式QA Oracle、src/qaReservationFixtureApi.js の予約fixtureは**QA専用の破壊的・証跡保護処理**であり通常CRM/予約利用の店舗制限ではない。全店舗へ開放しない。
- src/hybridPublicRouter.js と src/controlPlaneWorker.js の /qa/attest/readback 固定転送は正式QA専用で、一般RPC・予約・課金経路とは独立する。
- mobile-app/web/billing-native.js と src/billingSandboxOwnerApi.js の billingqa は隔離された検証用オーナー認証経路であり、一般課金の getBillingIdentity には作用しない。
- 一般機能に固定店舗IDによるPro購入・復元の許可分岐は見つからず、通常店舗ルートは tenant_registry と認証情報から導出する。

## 本番デプロイ・独立読戻し（2026-10-30 01:59〜02:01 PHT）

- User-approved code commit `ad73450` を基準とし、未コミットのFormal QA remediator 2ファイルには非接触。
- 旧版Control `735d37b4-7011-4c76-9664-3035a03314e2` を確認し、元のControlサービス12件/Secret4件を保持することを前提にdry-run PASS。本番版 `0e6bd059-7875-4020-afe6-5fca1c1195f2` が100%稼働。再読戻しで12サービス・4 Secretを確認。旧Sandbox店名環境変数は新Versionから消去。
- 旧版test1 `036ad5d4-2c68-4e22-afa6-5b943c114bcb` のD1/R2/Tenant ID/Secret2/課金Service Binding3を読戻し後、既存共通 `renderTenantWrangler` を再利用してdry-run PASS。最新版 `4d55cd7d-b05f-43bd-9f01-102874e78a1b` が100%稼働。Secret2、課金Service3、D1同一性を配備後にも確認。
- Control D1の新テーブルとQA登録は `test1` と `teat` の2店舗、2026-11-05T17:53:02Zまで有効。購入情報・課金プランの手動上書きなし。
- 本番read-only検証で `test1` への正規SANDBOX `PRODUCT_CHANGE` 1件がControl `applied` / Tenant受信履歴に記録された。イベント元product_idは月額、pro entitlement配列は存在。ただし PRODUCT_CHANGE は情報通知のため新規Pro権限を確定しない。test1のstore_plansはFree、store_subscription_stateは0件。このイベントだけでは年額購読が有効であることを確認できず、Pro正式PASSは0件。
- 検証：Control routing 54チェック、課金/DB/HMAC 38テスト、関連Tenant/billing/hybridテスト9件PASS（すべてローカル）。実機のApple年額購入・復元はこのデプロイ作業で再実行していない。
- 新規Tenantの再発防止として共有テンプレート `izakanpai-tenant-template` の旧版 `2e7f5586-480c-4863-8c20-5df16da5d81b` を最新共通コードへ更新し、Version `cd22a26c-ff85-459d-9e6e-93c17352f5d5` が100%稼働。AI Bindingのみ保持し公開ターゲットなし。既存の顧客店舗・業務DBは変更しない。
- 追加のread-only再検証でもtest1は PRODUCT_CHANGE 1件のみ、ProはFree、active subscription rowは0件。真正なINITIAL_PURCHASE/RENEWAL等の有効な課金イベント、または公式RevenueCat購入履歴の突合が必要。既存の別Tenant Workerを一括上書きしていないため、そのWorkerの最新版同期は別作業（現時点のユーザーtest1と今後作成される新規Tenantは対応済み）。
