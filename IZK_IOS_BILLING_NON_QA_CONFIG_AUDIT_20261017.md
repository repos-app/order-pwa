# izakanpai POS｜iOS課金・非QA構成監査（2026-10-17 PHT）

## 対象と証拠の限界

Apple/RevenueCat既存UI読戻し記録、`codemagic.yaml`、`capacitor.config.json`、`mobile-app/web/billing-native.js`、`standards/mobile-subscriptions/v1/apps.json`、Owner/Sandbox各引継ぎを静的に点検した。今回Apple/RevenueCatの現行GUIや外部資格の再照会はしていない。**設定資料の作成のみ。QA実行・正式PASS/FAIL更新・端末操作・ビルド・Git・Store変更なし。** 未確認を完了扱いしない。

## 現時点の設定観測

| 項目 | 判定 | 直接の根拠・次の扱い |
| --- | --- | --- |
| Bundle ID | 構成一致 | `capacitor.config.json` `com.izakanpai.commissionpos`、`codemagic.yaml` のiOS signing同一。`apps.json`も一致。 |
| Apple月額/年額 | 既存記録で登録済 | `apps.json` 月額 `com.izakanpai.commissionpos.pro.monthly`、年額 `.annual`。日本¥1,980/¥19,800、PH ₱499/₱4,990、月額のみ1か月trial、日本/PH限定。**再登録・価格編集不要。** |
| RevenueCat Offering/Entitlement | 既存GUI記録で紐付け済 | `apps.json` `default` の `$rc_monthly` / `$rc_annual`、Entitlement `pro`。`docs/IZK_IOS_BILLING_CHAT_HANDOFF_20261017.md` 21:45記録に両Apple商品 `Missing Metadata`。SDK側のApple Sandbox取得可否とは別判定。 |
| App Store Connect資格 | 過去の実画面読戻しでは有効 | 同引継ぎ21:51にRevenueCat IAP key / ASC API `Valid credentials`、21:32にPaid Apps Agreement・銀行・米国税務フォーム有効、商品・グループ日英表示名保存済み。新規資格発行の必要性は現在立証されていない。 |
| 審査用スクリーンショット | 保留 | ユーザー方針で課金実機検証後に設定。`Missing Metadata` の単独原因と断定しない。審査提出・公開は未実施。 |
| iOS署名CI | 通常TestFlight用定義あり | `codemagic.yaml` `ios-testflight-build` はApp Store integration `izakanpai-apple`、app_store署名、`mobile:sync`実行、署名IPA作成。`submit_to_testflight:false` と `submit_to_app_store:false`。この設定からApple Sandbox専用IPA生成・隔離Owner API接続は証明できない。 |
| Native RevenueCat | 実装あり、購入未証明 | `capacitor.config.json` RevenueCat pluginを含む。`billing-native.js` はOwnerチェック、`getBillingIdentity`、Offering、購入・復元の呼出しを備える。公開SDKキーはサーバーが渡す方式で、iOSでは`appl_`を要求する。実Apple購入・復元実績は0件。 |
| 隔離Tenant iOS公開SDKキー | Secret名読戻し済 | `docs/IZK_IOS_BILLING_SANDBOX_OWNER_CONNECT_20261017.md` と `docs/IZK_IOS_BILLING_CONTINUED_EXECUTION_20261017.md`：隔離Tenant Secret名のみ存在確認。値の正当性・購入成功は未証明。SDKキーをCI/設定ファイルへ複製しない。 |
| Owner API経路と認証 | 未接続 | `docs/IZK_IOS_BILLING_SANDBOX_OWNER_CONNECT_20261017.md`：別Owner WorkerはService Bindingのみ、`workers_dev=false`、公開routeなし。`billingqa` employee資格fixture/Owner実ログインなし。`billing-native.js` の固定URLは到達確認のない予定URL。 |
| Sandbox専用構成の配布 | 未準備 | `scripts/qa-ios-billing-sandbox-build-prep.mjs` は既存本番生成物を触れず隔離準備する方針だが、既存記録の判定は `ready=false, staged=false`。通常CIの `mobile:sync` は共有Web資材から生成するため、現状のTestFlight IPAをSandbox用と表示しない。 |

## GPT側で設定・ソース準備を進める際の順序

1. **静的設定の正本化（本資料で実施）**：`apps.json`を商品ID・Entitlement・Offeringの正本として参照し、過去の「未登録」記載は日付の古い履歴として扱う。JP/PH価格とtrialは変更しない。
2. **Owner接続経路の構成確定（未完了）**：隔離テストOwner APIを認証境界付きの実在ルートに接続する構成を確定し、`billing-native.js` 内の固定URL・CORS Originと照合する。既存Webhook公開Ingressに通常Owner認証を追加しない。別担当のOwner接続作業と競合しないよう共有。
3. **Owner test credential（未完了）**：既存DPAPI保管手順と`makePasswordHash`を再利用できるか既存認証担当の証拠を待ち、安全性ブロック済みの新規秘密生成スクリプトを再実行しない。Owner実セッションとOwner roleの確認が完了するまで端末ビルドreadyにしない。
4. **隔離ソース・ビルド構成（未完了）**：既存 `qa-ios-billing-sandbox-build-prep.mjs` の環境・接続・ホスト検証結果を満たした場合のみ、共有`mobile-dist`/`ios`/`config.js`を変更しない一時資材を生成する。Codemagic既存署名設定は参照のみとし、専用Workflowや署名済みIPAの配布は別工程の承認と実証を必要とする。
5. **Metadataの最終確認（別工程）**：RevenueCat既存Apple2商品の`Missing Metadata`が現時点でも残るか実画面で読戻し、Apple製品/ローカライズ/審査素材の原因を区別する。Appleサーバー反映遅延や審査画像不足を単独原因と推定しない。レビュー素材と申請はユーザー指示により保留。

## ソース配布時の安全な設定テンプレート（値を埋めるのは接続構成確認後）

Sandbox iOS専用資材では次の論理フィールドを**隔離ステージングのみ**で構成する。リポジトリ追跡中の`mobile-app/web/config.js`、通常Codemagic workflowへ直接挿入しない。

```text
TEST_ENV = true
BILLING_SANDBOX_OWNER_TRANSPORT = true
BILLING_SANDBOX_OWNER_API_URL = <実在が確認された隔離HTTPS /owner endpoint>
API_URL = <独立した実在のtest login/refresh API origin>
AUTH_STORAGE_PREFIX = <production と異なる隔離prefix>
STORE_ID = billingqa（ログイン後の認証済み店舗との一致を別途必須確認）
```

これらの記載は接続先発行や証明ではない。SDK公開キーはOwnerの認可済みAPIから取得し、`appl_`検査を保つ。秘密値、購入者資格、p8/P12、CI署名証明書の値をこのテンプレートに含めない。実URLの到達性はURL文字列一致やDNSだけでは証明できないため、ビルド前に認可された別工程の接続確認を要する。

## 判定

**非QA資料作成：完了。Sandbox Owner接続・有効Ownerセッション・隔離IPA作成：未完了。Apple Sandbox本物の決済と正式QA：未実施。Release：NO-GO。** Apple商品・価格・trial・RevenueCat商品の編集、Codemagic起動・IPA配布、審査提出、本番変更、Git操作は本担当では実施していない。
