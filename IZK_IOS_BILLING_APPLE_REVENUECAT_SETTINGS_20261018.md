# izakanpai POS｜Apple / RevenueCat 設定監査（2026-10-18 PHT）

## 判定範囲と証拠の時点

- 対象は **App Store Connect App `6815685162`**（Bundle `com.izakanpai.commissionpos`）、**RevenueCat Project `7fcf50db`**、RC App `app1c17f56b4a`。別プロジェクトやRevenueCat Test Storeの擬似商品と混同しない。
- 本書は既存の2026-10-17認証済みGUI観測、gitignored画面証跡、設定観測JSONを突き合わせた**読み取り専用監査**。2026-10-18時点でBrowserタブ取得を試みたが、接続側が `Browser access requires the originating browser context` を返したため、**本日付のASC/RCライブ再読戻しは実施できていない**。以下の「確認済み」は**記載日時の確認**を指し、現在も変わっていない保証ではない。
- 設定の保存、キー閲覧・転記、課金・テスト、スクリーンショット登録、審査提出、Worker/DB更新、Git操作は今回行っていない。

## Apple Store Connect：最後の実画面で確認した状態

| 項目 | 2026-10-17の保存・読戻し記録 | 最新性と残件 |
|---|---|---|
| アプリ | `6815685162` / `com.izakanpai.commissionpos` | 同一Appを引き続き使う。2026-10-18再読戻しなし |
| 自動更新グループ | `izakanpai Pro` / group `22487367`。日本語・英語（米国）の表示名保存・読戻し | `asc_group_both_locales_readback_2129.png`（21:29頃） |
| 月額商品 | `6823916048` / `com.izakanpai.commissionpos.pro.monthly`、日本¥1,980、フィリピン₱499、日本・フィリピンのみ提供、月額の日本語・英語説明は保存済み | 1か月無料の初回オファー：2026-10-17開始、終了日なし、対象2地域。顧客の無料対象資格はApple判定 |
| 年額商品 | `6823916607` / `com.izakanpai.commissionpos.pro.annual`、日本¥19,800、フィリピン₱4,990、対象2地域。年額の日本語・英語説明は保存・再読戻し済み | `asc_annual_ja_en_table_verified_2124.png`および後の`asc_annual_localization_find_2139.png`。年額の無料体験・12か月分割払いは設定なし |
| 商用資格 | Paid Apps Agreement／Free Apps Agreement有効、銀行1口座有効、表示される米国税務フォーム2件有効 | 21:32頃の `asc_business_readback_2132.png` と `asc_business_tax_footer_2132.png`。個人・金融情報は転記しない |
| 審査素材 | Apple IAP審査用画像およびApp Store掲載用スクリーンショット未登録。初回サブスクは新App Versionと同時提出が必要というApple画面案内を記録 | **ユーザー方針により実購入テスト後まで延期**。審査提出なし |

初期の`IZK_IOS_SUBSCRIPTION_APP_STORE_SETUP_20261017.md`には年額とグループの言語情報が未保存とあるが、その後の **21:08–21:45 PHT** GUI記録により解消している。古い「年額未保存」の記述を現在のブロッカーとして数えない。

## RevenueCat：最後の実画面で確認した状態

| 項目 | 観測結果 | 証拠と境界 |
|---|---|---|
| Product catalog | Apple本物の月額・年額商品がそれぞれ1件ずつ存在、両方 `Missing Metadata` | 21:43頃 `rc_products_live_loaded_2143.png`、年額詳細`rc_annual_product_details_2144.png`。**今回再読戻しなし** |
| Entitlement | `pro` にApple 2商品とTest Store 2商品の計4件。Apple各商品で`1 Entitlements` | 既存登録維持。Test Store 2件は実Appleの購入証拠にならない |
| Offering | `default` に `$rc_monthly` / `$rc_annual`。各パッケージに対応するApple商品と別プラットフォームのTest Store商品 | 2026-10-17の既存GUI読戻し結果。紐付け再作成不要 |
| Apple接続 | Bundle ID一致。In-App Purchase Key / App Store Connect APIとも `Valid credentials` | 21:51頃 `rc_apple_credentials_section_2151.png`、`rc_asc_api_credentials_readback_2151.png`。秘密キーは扱わない |
| 実購入 | StoreKit商品取得、Sandbox課金、restore、App→Webhook→Control/Tenant D1のPro確定は未判定 | RevenueCat Webhook TESTのHTTP 200は本物のApple購入証拠ではない |

`Missing Metadata` の要因について、商品・グループの言語情報、価格、Paid Apps Agreement、銀行・既知税務情報、RCのApple資格がすべて**前回観測時点で揃っていた**。**IAP審査用スクリーンショット未登録は有力な未解消候補**だが、RCの一括ステータスだけでは根因を断定できない。Apple Sandboxで商品取得可能な場合もあるため、Metadata表示だけでStoreKit取得結果を代替しない。

## 今進められる設定上の判断と保留条件

1. **変更不要と判断できる既存設定**：ASC App / Group / SKUの再作成、既存2商品の価格・対象地域・月額初回Offerの再設定、RC `pro`・`default` の再作成、Apple連携キー再発行。現在のGUIで明確な差分が見つかるまでは維持する。
2. **読み取りで再確認できる設定**：同じASC App `6815685162`のサブスクリプション2商品、グループ両言語、Business契約・銀行・税務の有効表示。RC Project `7fcf50db`のApple製品2行・Metadata status・`pro`と`default`・Apple接続Valid credentials。アカウント値やキーは記録しない。
3. **今は意図的に保留**：IAP review screenshotおよびiPhone 6.9-inch / iPad 13-inchのApp Store掲載スクリーンショット、商品とアプリのApple審査提出、本番公開。掲載画像は実際の画面・対象解像度が確定し、別チャットでの購入検証を経た後に登録する。
4. **別チャットの正式QAに依存**：現在配布中のiOSビルド識別、SandboxのStoreKit `getOfferings`、月額/年額の購入・復元・満了/返金と有効Proの遠隔反映。正式QA PASS/FAILはいずれもこの監査では加算しない。

## 出典・再確認先

- `docs/IZK_IOS_BILLING_CONTINUATION_20261017.md` の **21:08–21:51 PHT GUI観測**（年額/グループの保存・契約・RC Metadata・資格）、`docs/IZK_IOS_SUBSCRIPTION_APP_STORE_SETUP_20261017.md`（商品ID、価格、地域、Offering）、`docs/IZK_IOS_BILLING_SETTINGS_ONLY_HANDOFF_20261017.md`（担当境界）。
- 機械可読の観測記録：`standards/mobile-subscriptions/v1/apple-metadata-observation.json`（observedOn `2026-10-17`、`missing-metadata`、`reviewScreenshot=deferred`）。原証跡は`.tenant-provisioner/billing-sandbox/` のgitignored画像にあり、契約画面の個人情報画像を公開文書へコピーしない。
- 初回App Store提出の全般的な入力と画像要件：`handoff/APP_STORE_CONNECT_SUBMISSION_20261003.md`。この資料は10月3日時点の案であり、画面の最新保存状態を意味しない。

**2026-10-18監査結果：既存設定の再作成は不要。設定資料の整合を確認したが、本日のライブ再確認とApple Sandbox本物の購入検証は未完であり、課金公開判定はNO-GO。**
