# izakanpai POS｜GPT自主継続：iOS課金Sandbox接続・ビルド準備（2026-10-17 23時台 PHT）

前回正本：docs/IZK_IOS_BILLING_SANDBOX_OWNER_CONNECT_20261017.md。今回も物理iPhone、正式QA claim、App Review・本番公開、本番Worker/D1、Git commit/push、IPA配布は行っていない。資格情報生成の安全性ゲートで拒否された方式は再試行しない。

## 1. iOS Sandbox向け資材生成の隠れていた根本不具合を修正

対象：scripts/qa-ios-billing-sandbox-build-prep.mjs、test/qa_ios_billing_sandbox_build_prep_test.mjs。

- BEFORE：Owner接続を合成条件で準備済みとした一時fixtureに、実際のprepare()を通すテストを追加。従来は不足条件で終了する3件しかなかったため、初めて成功経路の Array.map(resolve) が渡す index と array により path.resolve が TypeError ERR_INVALID_ARG_TYPE になることを検出。3 PASS／2 FAIL、exit1。
- AFTER：パス判定を明示処理へ変更。現在は既存親ディレクトリの realpath とシンボリックリンクを検査し、共有作業木の内側・その祖先への出力を禁止。テストfixtureでの生成・設定・拒否・クリーンアップを検証済み。
- TEST環境コピー限定：Auth Storage・Offline DB・API URLを別test名前空間に変更し、SELF_SIGNUP_AVAILABLE=falseへ固定。Order／Reservation／Takeoutの本番公開URLをRFC 6761 .invalidドメインに置換。Native index/manageに埋め込まれた本番メール確認・法定リンクもステージングコピーのみ無効化。本番ソースのconfig.jsはbyte一致を確認。
- 任意のシンボリックリンクや生成済みHTML/JS/JSONで検出できる本番API・公開ホストが残る場合は資材生成を拒否。Secret名・値などを生成コードに埋め込んでいない。実repo rootで合成endpoint応答を入場証拠に使うことも拒否。
- 新しい成功・負例を合わせて専用テスト **7/7 PASS、exit0、skip0**。成功は一時の模擬Rootと合成HTTPでのみ確認。現実のコマンドは依然Owner/Login未接続で ready:false／staged:false、exit1の**正しいNO-GO**。IPAは作成しない。

## 2. Native課金認証漏れの修正

対象：mobile-app/web/billing-native.js、test/billing_native_sandbox_risk_test.mjs、docs/IZK_BILLING_NATIVE_SANDBOX_RISKS_20261017.md。

- 初期状態はOwner応答のstoreId欠落が受理され、configured:trueでもcustomerIdやentitlementIdが欠けたままRevenueCat.configureが動き得た。
- 修正前の回帰は **1 PASS／2 FAIL・exit1**。修正後はOwner有効応答の店舗厳密一致、SANDBOX、Apple appl_公開キー、billingqa限定のRevenueCat customerId UUID、entitlement pro、configuredの真偽型を必須にした。Test Store test_・匿名customerId・他店舗はreject。既存production/Android経路は維持。
- 専用・隣接テスト17件PASS（詳細は別レビュー文書）。本物のStoreKit購入・RevenueCat契約付与・D1反映は未検証。

## 3. Ownerログイン・接続ゲートの継続

- 新しいソース点検器 scripts/qa-billing-owner-wiring-preflight.mjs と専用テストを作成。隔離Tenantの認証・session/refresh実装、OwnerのCORS・店舗制限・Service Binding構成を点検。
- 遠隔で必要な認証migration 0016/0017/0020 とAUTH_SECRETは前回作業で隔離Tenantにのみ適用／読み戻し済み。今回は追加のSecret/SQL書き込みなし。
- **Owner専用Workerは非公開のまま**、billingqa既存Ownerの安全なログインID/ハッシュ登録と正規Session発行の入口が未整備。共通ゲートは owner_login_route=BLOCKED、exit1。公開Proxy・擬似Ownerログイン・秘密の平文保存は行っていない。

## 4. 総合回帰

| 実行対象 | 結果 | 範囲 |
| --- | --- | --- |
| 課金・Owner・Native・SQLite・Metadata・Build Prep・Preflight関連Node15ファイル | **126/126 PASS exit0** | ソース／模擬／SQLite回帰 |
| Control routing | **48/48 PASS exit0** | Control隔離回帰 |
| Subscription integration | **27/27 PASS exit0** | 既存連携回帰 |
| Build Prep専用 | **7/7 PASS exit0** | 合成endpointで成功側まで実行 |
| Release正式ゲート | **exit1／NO-GO** | Apple StoreKit実購入なし |
| iPhone公式Sandbox QA | **今回PASS 0／FAIL 0** | 未claim・未実施 |

## 5. ソース自己レビュー：独立10観点

| ID | 対象・実際の検査 |
| --- | --- |
| S01 | 旧Array.map(resolve)が成功分岐でTypeError、BEFORE exit1。 |
| S02 | 修正後に実prepare()が一時作業ディレクトリへ正しいステージングコピーを生成。 |
| S03 | 元のNative config.jsはコピー前後でbyte一致。 |
| S04 | root内handoff等への出力を拒否、パスrealpathも比較。 |
| S05 | checkout直結Rootに合成endpoint検証を許可しない。 |
| S06 | TEST_ENV、API_URL、test Auth Storage、test Offline DBは明示確認。 |
| S07 | self signupはstageのみfalse、誤った実店舗登録を防止。 |
| S08 | Order／Takeout／Reservationはstageのみ.invalidに変更。 |
| S09 | 追加した本番API絶対URLを含むunsafe.jsが検知され資材未出力。 |
| S10 | 実Windows上のシンボリックリンクを準備しコピー拒否、skip0。 |

## 6. 横展開レビュー：独立10観点

| ID | 関連経路・結果 |
| --- | --- |
| H01 | mobile:prepareは共有mobile-distを削除再生成するため呼ばない。 |
| H02 | mobile:syncはNativeへ変更反映するため呼ばない。 |
| H03 | Native index.htmlの本番確認メールリンクをステージコピーだけ無効化。 |
| H04 | Native manage.htmlの同型リンクもステージコピーだけ無効化。 |
| H05 | 原本config.jsのproduction APIと公開URLは一切変更しない。 |
| H06 | api.jsのproduction/test認証Audience隔離契約は保持。 |
| H07 | billing-native.jsのApple appl_／顧客ID／Owner店舗境界を別回帰。 |
| H08 | Owner Workerのworkers_dev=false維持、勝手に公開しない。 |
| H09 | 認証Secret・DB SQLを今回は読み替えず変更せず、Owner fixture未完を明示。 |
| H10 | QA台帳/Android実機/iPhone/IPA/ストア審査の書込みゼロ。 |

## 7. 残ブロッカー

既存テストOwnerの安全な資格情報保管方式はDPAPIを再利用可能だが、それを正式な既存Owner1行にのみ反映する承認済みSQL操作経路が未整備。初回に危険な独自資格生成スクリプトが安全性ゲートで止められたため、同方式の再実行は禁止。ログインとrefreshの**実Ownerセッション**および専用Owner APIへの正しいiOS Auth到達が証明されるまで新しいIPAを配布しない。Owner URLのGETのステータスだけではログイン/refresh正当性を証明できない点と、資材の動的URL組立まで完全に監査できていない点もPENDING。
