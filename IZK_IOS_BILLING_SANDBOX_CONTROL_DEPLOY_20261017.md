# izakanpai POS iOS Billing — Control隔離配備と実RevenueCat回帰（2026-10-17 22:16 PHT）

## 適用範囲

既存の課金引継ぎ正本 `docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md` と `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` を継続した証拠。今回の実通信は**izakanpaiの隔離課金Sandbox Control/IngressとD1のみ**で、Apple StoreKit Sandboxの実購入・復元ではない。Test StoreとApple App Storeの購入結果を混同しない。本番Worker/D1や店舗・iPhone・公式QA Runnerは操作しない。App Store審査提出、本番公開、掲載素材登録なし。

## 事前検証

- 変更ソース `src/controlPlaneWorker.js` SHA-256 `8A57D795AB36F6D69080B96FDA7E31CF29980DEF9F9CAD1F9D7DB07CEE4466B3`。以前のControl同一Webhookイベント二重dispatch修正（atomic `UPDATE` claim）のコード・テストは`docs/IZK_BILLING_SANDBOX_WEBHOOK_REVIEW_20261017.md`参照。
- `.tenant-provisioner/billing-sandbox/wrangler.control.toml` のWorker=`izakanpai-billing-sandbox-control`、D1=`izakanpai-billing-sandbox-control-db`（`14002180-c4df-4873-b17a-8ededd002d7c`）、Service=`izakanpai-billing-sandbox-tenant`、`AUTH_ENVIRONMENT=test`、`workers_dev=false`を事前チェック。本番DB IDと異なることを確認。
- `wrangler deploy --dry-run --config ...` **exit 0**、87.40 KiB/gzip15.53 KiB、Bindingは隔離`CONTROL_DB`・`TENANT_BILLINGQA`・test環境のみ。
- ローカル改修の回帰：Node課金10群 **94/94 PASS (exit0)**、`node test/control_plane_routing_test.mjs` **45/45 PASS (exit0)**。正式QAではない。

## リモート配備の実態（警告を無視しない）

隔離Controlへの`wrangler deploy --config .tenant-provisioner/billing-sandbox/wrangler.control.toml`で、Cloudflare Dashboardのremote/local設定差異を示す警告が発生し、PowerShell 5.1がNativeCommandErrorとして扱ったため**呼出しコマンドはexit 1**になった。これを「未配備」と推測せず、Wrangler deployment listを別コマンドで再読戻しした。

結果は新Version `b52b1846-d4a8-406a-90de-edfad59c2dd3` が**2026-10-17T14:12:12Z、100%配備済み**（作成時刻14:12:10Z）。Controlの`CONTROL_SERVICE_SECRET`・`REVENUECAT_WEBHOOK_AUTH`・`REVENUECAT_WEBHOOK_SECRET`の3 Secret名もremoteで存在確認済み（値非表示）。したがって、**配備処理自体はRemoteで成立している**が、PowerShell警告のexit 1を成功コードと偽らない。次のControl再配備前に、remote/localの追加変数・ルート差分を精査する。Wranglerの`--keep-vars`はDashboard管理varsの保全に利用可能だが、今回の配備には使っていない。

## 配備後のRevenueCat SaaS → Cloudflare → D1 回帰

- 対象は既存RevenueCat Project `7fcf50db`、`izakanpai POS - Sandbox Billing QA`（Webhook `whintgr7670c16a83`）、**App Storeアプリのみ／Sandbox only／HMAC ON／Authorizationマスク値**。Productや公開設定を再作成・変更しない。
- 配備前のControl D1 `revenuecat_event_inbox` 総数 **5件**。RevenueCat GUI `Send Test Event` で新規実`TEST`を1回発行。RC GUI Response **HTTP 200**（`.tenant-provisioner/billing-sandbox/rc_control_after_deploy_test_result_2216.png`）。
- 独立した遠隔SQL読戻しでControl D1 **6件**、`MAX(received_at)=2026-10-17 14:15:20 UTC`。Tenant D1 `billingqa` プランは配備前後とも **Free**。RC TESTが実Service/HMACを通って記録され、誤ってProにならないことを確認。実Apple購入通知ではない。
- 代表的な負例を、**配備後の公開Ingressへ実HTTPで実行**：`GET /`→404、`GET /webhooks/revenuecat`→405、**無署名**`POST /webhooks/revenuecat`→401、`POST /internal/operator/delete`→404、すべて期待と一致 **4/4 PASS**。IngressはWebhook専用を維持。
- この1回のTESTは22:00 PHTの別TEST（HTTP200、Control D1 4→5）とは別の2回目。いずれも**Apple Sandbox正式QA件数に算入しない**。

## 未完了・次回の受入条件

1. **iPhone Apple Sandbox StoreKit商品取得は未実施。** 隔離TenantのiOS RevenueCat`appl_`公開SDKキーは22:05にremote Secretへ追加済み・名前確認PASSだが、隔離Webhook IngressはOwner`checkToken`/ `rpc(getBillingIdentity)`の公開経路を持たない。安全な隔離Owner認証API/ログイン用テストビルドの準備が必要。
2. Controlの`ignored_unknown`イベントの後からroute登録した場合の未再送、同じSKUの異original transaction返金、Tenant無変更でもControl`applied`と記録する事象、allowlist適用の厳格性は未解消。実購入より先にCustomer routeを作り、境界負例・独立D1を検証する。
3. **同一ID並行raceの修正はローカル45/45 PASS、Cloudflareの基本実通信PASSだが、Remoteで同時配信負荷自体を再現した正式証拠はまだない。**
4. RevenueCat Apple商品2件の`Missing Metadata`は22:00より前の実画面で継続確認済。審査用スクリーンショットはユーザー方針によりテスト後まで保留、App Review提出・公開は禁止。
5. **正式iPhone QA：PASS 0 / FAIL 0（未実施）**。今回のオフライン94＋45・Remoteテスト4/4・RevenueCat SaaS TEST×2を公式CASE PASSと混同しない。次に申請が必要なのは隔離アプリAPIとテストビルド・実機の排他的claimのみ。
