# Izakanpai QA再構築：進捗台帳

## 2026-11-10 PHT｜S6自動化工程100%・実機固有項目はS7（最新）

- **S6実Chromium業務6/6独立PASS**：会計断線/ACK喪失/2タブ競合/Abort、在庫・発注・AI再起動と同一ID冪等再開。個別PNG・SQL読戻し・他店舗不変・cleanup・現行ソースSHAを確認。正式iOS/AndroidのPASS追加は0。
- **S6補助回帰31/31 PASS**：共通障害5ファイルにNative/Web本番/Web TESTの30,000ms書込時計/自動再送禁止の1テストを追加。TAP・27ソースSHAを独立検証、失効/FAIL時は古いPASSに戻らない。証拠：test-results/qa-modernization/s6-regression/latest.json。
- **S6自動化工程100% COMPLETE**。ダッシュボードは全6業務と31補助回帰の現行PASSが両方揃うときのみ完了。実機30秒通信切替、2端末競合、Native/BLE等は既存S7にNETWORK-01/02を追加し、本人PASS自動登録はしない。実Cloudflareの正式並列書込性能SLOは未合意・未測定。過去のS6未達記録は条件変更前の履歴。

## 2026-11-09 19時台PHT｜S5自動化工程100%完了・S7実機に引継ぎ（最新）

- **S5実Chromium 10/10 PASS、FAIL0、STALE0**：既存9件に会計後支払訂正（現金300→GCash→冪等再送→返金→売上純額0）を追加。既存の会計→コミッション→返金UI・S2 Gatewayを再利用。残り7件の古い証拠だけ共通ランナーで再実行し、独立SQL/3PNG/監査/台帳/cleanupまで検証。
- **横断動的UI 27/27 PASS**：143画面を自動検出、960金額フィールドを27画面で実Chromium測定。月・通貨・日英・長文省略・位置揃えを検証。458動的金額呼出はソース検出のみ。並行開発による監査画面3配布面のSHA変更では元の全件証拠をSTALEと判定し、変更関連の既存テスト**12/12 PASS**を別証拠として取得。全画面再実行を繰り返さず現行ソースの独立TAP/SHA照合を復旧（12件を27件に重複計上しない）。
- **S5自動化工程＝100% COMPLETE**。独立証拠の正本は test-results/qa-modernization/s5-ui-audit/latest.json と上記実Chromium証拠。ダッシュボードも実業務全登録PASSと動的UI現在有効PASSが揃うときだけ100%表示。実機固有のUI体感・ちらつき・Native/BLEは既存S7本人チェックに引継ぎ、正式Android/iOS QA加算0。過去のS5未完了記録は旧基準の履歴。

## 2026-11-09 PHT｜S4完了条件を本人実機QAと分離・自動化工程100%確定（最新方針）

- **S4自動化工程＝100% COMPLETE**：現行ソースのSQLite49/49、隔離workerd/D1 49/49が独立証拠PASS（FAIL0、STALE0）。実Cloudflare外部AI生成・R2/D1精算、業務メールAPI→送信プロバイダー→D1台帳・再送無重複、RevenueCat Control↔店舗D1通知27/27・AIポイント用Offering商品3/3を自動化可能な範囲として実証。各実績・限界・原証拠は `docs/qa-modernization/S4_S6_COMPLETION_STATUS_20261109.md` に記録。
- **責任分界をユーザー方針に合わせて修正**：Gmail等の業務メール受信の目視・Apple Sandboxの実機購読/復元・キャンセルはS4完了の必須証拠にしない。既存S7チェック台帳へ `EMAIL-01`、`BILLING-01` を追加して引き継ぐ。スクリーンショット追加提出は要求しない。S7実機のPASSは自動登録しない。
- **誤った完成宣言を防止**：ダッシュボードはS4の登録49+49ケースがすべて現在のソースで有効PASSの場合だけ「自動化工程100%・完了」を表示し、FAIL/STALEが生じたら未完了へ戻す。実機・正式OS別QA・Storeリリースの完了とは混同しない。以下の「S4未達」記述は**方針変更以前の履歴**であり、現行完了基準を覆さない。

## 2026-11-09 PHT｜S4〜S6現行ソース有効PASSを全件復旧（最新）

- 現行のS4 SQLite **49/49 PASS**、workerd/D1 **49/49 PASS**、S5実Chromium **9/9 PASS**、S6実Chromium **6/6 PASS**。全レーンFAIL 0 / STALE 0（既存`test-catalog.mjs`のSHAと独立証拠の照合）。SQLite証拠 `test-results/qa-modernization/s4/local-api-2026-11-09T09-48-54-836Z-p9340-n1/summary.json`、隔離D1証拠は`local-d1-2026-11-09T09-48-23-233Z-p6816-n1`等の2バッチ32件＋最終バッチ15件＋単独復旧`local-d1-2026-11-09T09-56-40-496Z-p8832-n1`と先行1件。一次D1失敗は`S4-REFUND-JPY-TAX-040`の業務シナリオではなく並列workerdのcleanup `fetch failed`、元のFAILを維持し、**並列無しの単独復旧でSQL cleanupまで独立PASS**。
- S5 `test-results/qa-modernization/affected-chromium-2026-11-09T09-57-28-534Z-p23272/result.json`（9/9）、S6 `test-results/qa-modernization/affected-chromium-2026-11-09T09-58-44-232Z-p25564/result.json`（6/6）。S5カテゴリ画面で検出した共通新機能「お知らせ」呼出時のQA用D1 `prepare().all()`不足は、`local-gateway-fixture.mjs`の共通アダプターへ対応・共通回帰2/2で防止。
- S4外部実証：RevenueCat Control↔物理QA店舗D1 **27/27一致**、AIポイントApple Offering実プロバイダー**3/3**、重点負例含む回帰**13/13 PASS**。ただし業務メールGmail実受信と独立Apple購読レシートは**未証明**。原本`docs/qa-modernization/S4_S6_COMPLETION_STATUS_20261109.md`参照。**S4工程100%ではない**。commit/push/deployなし。

## 2026-11-09 PHT｜RevenueCat実APIのAIポイント商品3/3検証

- 既存GitHub Actions `revenuecat-ai-credit-offering.yml` を `apply=false` でread-only実行。run `42577839786`は成功し、同一RevenueCatプロジェクトのApple `izakanpai.ai.credits.30/100/300` 全3件が既存登録済み、Offering `ai_credits` のパッケージも3/3紐付け済み。独立証拠検証 `scripts/qa-modernization/s4-revenuecat-offering-proof.mjs` は **5/5条件PASS**、負例を含めたテスト2/2 PASS。証拠 `test-results/qa-modernization/s4/revenuecat-provider-offering-readonly-20261109.json`、認証鍵非出力・商品/Offering作成0・部署変更0・コードpush0。
- QA店舗の実Control↔Tenant通知台帳は別の独立27/27 PASSを維持。**Pro購読用商品のOffering・実Apple StoreKit購入とプロバイダーレシートの照合は未実施**であり、AIポイントカタログだけでS4工程100%にしない。

## 2026-11-09 PHT｜RevenueCat実Control↔QA店舗D1の通知台帳を独立27/27照合

- Cloudflare本番Control Workerの適用済みSandbox通知のうち、承認済みQA店舗 `teat` 6件・`yuwakubar` 21件を各物理D1と独立照合。イベントIDのSHA・種類・環境・タイムスタンプ・店舗が**27/27一致**、不一致0、重複0、許可外SKU0、購入種別3件。既存本番ルーティングで送られたSandboxイベントの**バックエンド適用台帳**についてはPASS。追加4/4負例テストPASS。実行器 `scripts/qa-modernization/s4-revenuecat-cross-d1-audit.mjs`、証拠 `test-results/qa-modernization/s4/revenuecat-cross-d1-readonly-20261109.json`。DB書込0、個別IDと顧客情報の証拠保存なし。
- **実Apple StoreKit購入の真正性は未証明**。Controlが承認したSandboxイベントの履歴だけでは、正規のApp Store決済に由来するとは確定できない。既存のTestFlight `signed-test` ソース事前ゲートはPASSだが、現行環境に独立RevenueCatプロバイダー照合用認証、Apple購入レシート、iPhoneの実操作証拠がない。S4全工程100%は認定せず、完了条件を維持。

## 2026-11-09 PHT｜Gmail直接SMTP実受信PASS（画面証拠）、業務API受信は未確認

- ユーザーがGmail画面画像 `IMG_2591.png` を提出。Cloudflareの `noreply@alerts.izakanpai.com` → 承認済み `izakanpai.system@gmail.com` に直接送信された `[izakanpai][TEST] Verified Gmail SMTP delivery check` が、**2026-11-09 14:15 PHTに受信トレイへ実到達した**ことを確認。TLS表示および本文のUTC `2026-11-09T06:15:49.434Z` が直送プローブの送信時刻と対応。ユーザー提出の実画面を根拠とするPASS（Gmail API経由の独立読み取りではない）。画像SHA256 `2db6145023d0ff5e72b1f43a8fb63a74a6c8c87f05c4d11f1668c71d5dbd72f0`、元添付IDと判断の区別を `test-results/qa-modernization/s4-email/approved-gmail-receipt-20261109.json` に保存。
- 別経路の実業務API `sendTestReport` はプロバイダー受理、物理D1 Outbox、二重送信防止、cleanupの**独立8/8 PASS**である一方、ユーザー画像には当該テストレポートは表示されていない。したがって**業務APIのGmail受信は未確認**、RevenueCat実Sandbox購入も未達でS4工程100%認定不可。今回新たな送信・D1操作は行っていない。

## 2026-11-09 PHT｜ユーザー承認GmailでS4実メール送信・D1再送を実証

- ユーザーが `izakanpai.system@gmail.com` をテスト送信先に明示承認。Cloudflare Email Sending直送1件はHTTP200、送信キュー入り、バウンス/抑止なし。**実受信は未確認**。
- `teat` の最初のAPI送信は実効Freeの `scheduled_reports` ガードが正しく働き送信0、テストfixture cleanup PASS。実効Legacyの別QA店舗 `yuwaku` で既存業務RPC `sendTestReport` を本番公開Gateway経由で実行。メールプロバイダー受理、物理D1 `outbound_email_outbox` `sent`・宛先・[TEST]件名を照合。**同一requestId再送は `duplicate:true`、Outbox完全不変**。一時メール設定・レポートスケジュール・テスト管理者/セッション・送信Outboxを元通りへ復元。新規run `s4mail-mw8vomu5-bba0591e0436`。
- 独立したread-only `scripts/qa-modernization/s4-email-live-verify.mjs` による現行ソースSHA、実行証拠、Cloudflare物理D1再読込は **8/8 PASS**。証拠 `test-results/qa-modernization/s4-email/s4mail-mw8vomu5-bba0591e0436/{evidence.json,independent-verification.json}`。受信確認のコネクターは未接続で、SMTP/Resendが受理した事実をGmail受信と混同しない。関連メール安全回帰 **14/14 PASS**。RevenueCat実購入も未達のためS4工程100%認定は引き続き不可。commit/push/deployなし。

## 2026-11-09 PHT｜S4外部AI実生成1件PASS、RevenueCat Sandbox実DB/認証を独立検証

- **実外部AI画像生成のS4業務1ケースを完走**。本番公開Gateway経由で許可済み`teat` QAテナントへ本人ログインし、Workers AI FLUX.1 schnellで画像を実生成（HTTP200、5,512ms）、R2へJPEG318,573バイトを保存・独立CLIで取得しSHA256照合。D1の月次AIポイントを1消費しreserve/commit、同一ID再送の追加課金0、同意なし拒否／追加課金0、画像/QA従業員/セッション/Wallet/台帳の完全cleanupを実証。独立検証で**13/13チェックPASS**。原証拠`test-results/qa-modernization/s4-ai-live/s4ai-mw8ss7u1-523bc3c7c1d8/evidence.json`。実モデル障害時のポイント返金は未検証。
- **実RevenueCat Sandbox D1は読み取り専用の証拠化**：独立Sandbox Tenant/Control D1、必要テーブル、過去`qa-monthly`購入2・返金1、現状Free/解約済みを確認。`qa-monthly`は現行に設定したApp Store商品IDではなく、Apple Sandboxからの購入署名・Webhook出自は未証明。ログインGatewayはセキュリティ上の意図的無効状態のまま。既存readinessに`--sandbox-db`を追加し、**固定SELECTのみ／秘密情報値なし／DB書込0**の監査証拠を出力。iOS Sandboxオプトイン時の先行AIウォレットRPCを禁止し、正常な課金呼び出しは保持。Sandboxの独立スキーマ・Webhook重複防止・認証など**70/70契約テストPASS**。実購入・復元はまだ未実施。
- **S4メール実送信・受信は安全にBLOCKED**：承認済みテスト専用受信箱・独立受信読み取りAdapterが存在しないため、任意のアドレスや運営Fatal通知Gmailへの無断送信を避けた。共通のreadinessプローブ `scripts/qa-modernization/s4-email-live-readiness.mjs` を追加し、現行環境で `APPROVED_QA_RECIPIENT_MISSING` と `INDEPENDENT_QA_INBOX_READ_ADAPTER_MISSING` を確認。**実送信0／DB変更0／実受信PASS0**、関連安全検証8/8PASS。保存先 `test-results/qa-modernization/s4-email/readiness.json`。既存 `src/email.js` のResend API受理、送信Outbox status='sent'、別宛先の過去SMTP deliveredは今回の受信証拠に算入しない。
- **現行ソースによる登録済みS4全件の独立証拠を再実行・回復**：別件Git変更で失効していた隔離workerd/D1の49ケースを既存共通S4ランナーで**1回だけ全件実行**。独立 `verifyS4Summary` は **49/49 PASS・FAIL0・BLOCKED0**。正規証拠 `test-results/qa-modernization/s4/local-d1-2026-11-09T05-14-19-023Z-p25436-n1/summary.json`（ケース別49本・528,066ms）。既存SQLiteも49/49有効PASS。正規localhost:18765のQAダッシュボードを確認済みのローカルNodeプロセスから既存タスクで再起動し、API実測で **S4 SQLite49/49・隔離D149/49** を読み戻した。S4画面の説明欄には実AIの成功と、外部メール・RevenueCat実購入が未完了である旨を表示。**S4全工程100%の判定は引き続き未達**。
- **工程100%の扱いは不変：未達**。3残件のうち実AI成功1ケースに正規証拠が増えたが、メール受信・実RevenueCat購入、実AI障害時の返金はまだS4全完了の証拠に含めない。詳細は`docs/qa-modernization/S4_S6_COMPLETION_STATUS_20261109.md`。正式Android/iOS実機QA PASSへの加算0。本番デプロイ・Git commit/pushなし。


## 2026-11-09 継続実証｜S5 コミッション全画面旅程と S6 ブラウザー送信中断

- **S5 Chromium業務9ケースのうち新規 `S5-STAFF-ORDER-009` を追加実行PASS**。スタッフ注文UI→コミッションモードON→日本語切替→日本語の未選択エラー→モーダルを閉じて英語へ戻す→対象者選択→注文120→管理画面で提供済→現金会計→コミッション伝票担当割当→OR番号/報酬詳細（追加料金20＋会計5%の6＝26）を**同一Chromiumセッション**で実行し、物理分離した隔離SQLiteの独立SQL、他店舗不変、5枚PNG SHA（日本語エラー含む）、cleanupを照合。メニューは1マスタの区分追加のみ。既存 `S5-REFUND-007` も会計300→担当者→OR詳細15→全額返金−15の横断旅程へ拡張し実行PASS。
- **S6 Chromium業務6ケースのうち新規 `S6-CHECKOUT-ABORT-006` を追加実行PASS**。書込タイムアウトの短縮時計350msとDB確定後ACK保留950msで、Chrome側のAbortController後も読み戻した会計は同一、再会計0。独立SQL/PNG/cleanupの証拠あり。**実Cloudflareの30秒やWKWebViewの本番相当実測とは区別**。
- S5/S6の証拠ゲートに今回の業務旅程独立チェックを追加し、OR詳細が未確認・担当割当RPC欠落・精算二重送信・30秒実測偽装などの証拠改ざんをPASSにしない。追加証拠契約の回帰を検証。
- S4の実購入準備を既存 `scripts/qa-revenuecat-readiness.mjs --sandbox` で読み取り専用で照合し、Sandbox Worker秘密情報の**キー名**が必要な分存在することを確認。ただし `endToEndPurchaseVerified=false`、`sandboxPurchaseEndToEndReady=false`。Apple/Google商品/Offering/テストアカウント、本物の購入からWebhookと物理D1への往復、外部メール/AI生成、実クラウド性能は未完了。**工程100%には未到達**。
- **S6実Cloudflareの読取性能基準を追加実測**：許可済み `yuwakubar` 既存QA共通フローに認証済みの読み取りRPC15回を加え、**15/15成功、p50 576ms、p95 658ms、max 658ms、失敗0**。通常注文・コミッション注文・再送の実D1照合は `API_AND_DB_PASS`、試験用レコードと診断用トレースは残存0。`test-results/izk-ut-145/qa145-mw8r4z00-30c75c/live-probe.json`。このp95は**単一店舗の逐次読取サンプルのみ**であり、本番会計SLO・実30秒/実機WKWebViewは未検証。
- 正本の工程別残件は `docs/qa-modernization/S4_S6_COMPLETION_STATUS_20261109.md`。コミット時の影響対象限定は従来どおり。今回の検証で正式Android/iOS実機QAの新規PASSは0、本番デプロイ・課金・メール実送信を実施していない。


## 2026-11-09 PHT｜S4〜S6の工程100%条件と現在の実証（未完了を残件として公開）

- 機械照合した現行有効ケース：**S4 SQLite 49/49 PASS、隔離workerd/D1 49/49 PASS、S5 実Chromium 8/8 PASS、S6 実Chromium 5/5 PASS**。正式OS別QAへのPASS加算は0。S4 044で古い商品単位コミッション前提によりFAILしていた共通Oracleは、現在の会計単位コミッションへ整合後、SQLite・D1で各1/1独立PASS。S4ケース証拠集約が古い全件FAILを優先して新しい個別実証PASSを見落とす問題は、後続の厳格独立検証結果を最優先する方式に修正し、負例4/4を含む契約回帰PASS。
- S4の**実Cloudflare物理D1**（`teat`・`yuwaku`）を既存の読み取り専用マイグレーション/所有者契約で検証し、2/2 PASS・0065・欠落0。記録 `test-results/qa-modernization/s4/remote-schema-readonly-20261109.json`。許可済み`yuwakubar` QA fixtureで実API/D1の通常注文・コミッション注文・再送冪等性・操作診断・全データcleanupを完了し、`API_AND_DB_PASS`・残存0。`test-results/izk-ut-145/qa145-mw8p5swu-bdd104/live-probe.json`。
- S5新規 `S5-OWNER-EMAIL-008` は実Chromiumで日本語/英語、無効トークン、既登録アドレス、HTTP502トレースID、ネットワーク損失、再試行、成功後の多重送信抑止を実行し**1/1 PASS**。5枚PNGのSHA256検証と隔離HTTPの証拠を保存。**外部メール送信はしていない**ので、カタログのレーンを `LOCAL_ACTUAL_CHROMIUM_ISOLATED_HTTP` と明示。S5共有テスト入口8/8 PASS。
- S6共有テスト入口5/5 PASS。通信切断・会計応答欠落・コミッション再送・診断動的追従の既存追加関連回帰28/28 PASS。発注の未確定保存テストに実際の `pending-write-replay.js` が未ロードで6件偽FAILだった原因を解消し、3画面共通ジャーナル実行で9/9 PASS。RevenueCatローカルSandbox・AIクレジット・オーナーメール・発注関連の追加24/24 PASS（外部providerのlive試験ではない）。Chromiumダッシュボード更新後の工程行テスト1/1 PASS。
- **S4〜S6工程はまだ100%認定しない**。登録済みケースが全PASSでも、本物の外部メール配送・RevenueCat Sandbox通知と物理D1・AIプロバイダー生成成功、S5主要画面の未登録業務旅程、S6の30秒境界/実クラウド性能実測が未完了。完了条件と現在の証拠・真の残件は **`docs/qa-modernization/S4_S6_COMPLETION_STATUS_20261109.md`**。CIコミット時の影響限定は維持し、物理端末判定はS7へ分離。Gitのcommit/push/新Workerデプロイ・正式Store承認は本作業から行っていない。


## 2026-11-08 PHT｜S4業務シナリオ49件へ拡張：実API/独立SQL/隔離D1で再検証

- **今回の実成果：S4登録済み業務ケースを48→49件へ拡充し、現在のソースとの整合を検証。** 新ケース `S4-COUPON-RULE-REFUND-049` は、1商品100ペソ→注文時クーポン10→会計時の承認付き20％ルール18→会計72、領収書割引合計28→全額返金−72、クーポン使用回数0・利用履歴+10/−10・会員復元を実業務APIと独立DBで確認。他店舗は変更せず、試験データはcleanupを経て元の状態へ。独立証拠の割引額、クーポン履歴、別店舗を改ざんした負例3/3検出。
- 新049は**SQLite 1/1、隔離workerd/D1 1/1**の独立証拠でPASS。D1の最初の試行で固定承認者名を比較するOracleがFAILし、従業員マスタを根拠にする共通照合へ修正。前のFAIL履歴は保持し、PASS扱いにせず後続試行で検証。
- **現行カタログ最終照合：SQLite 49/49 PASS、隔離workerd/D1 49/49 PASS、双方FAIL0／失効0／未確認0。** SQLite 49件は `test-results/qa-modernization/s4/local-api-2026-11-08T12-35-11-649Z-p4524-n1/summary.json`（独立検証49/49）。隔離D1は先行PASS29件と現在共有ソースに対して失効していた20件のみ再実行し、`test-results/qa-modernization/s4/local-d1-2026-11-08T12-35-24-230Z-p8748-n1/summary.json`（20/20 PASS）を正本として統合した。途中の旧48件の再検証も48/48実行PASSしたが、同時改修により旧証拠はSHA不一致となったため、そのまま現行PASSへ昇格しなかった。
- 49件の現在証拠へ既存不正改変**56/56検出・見逃し0**、店舗運営追加改変**15/15検出・見逃し0**。影響範囲選択は維持し、`src/discountRules.js`変更時には関連ケースへ新049を追加、`src/commissionDrink.js`は従来の048のみ。関連CI・選択・説明・suite回帰**22/22 PASS**、新049の独立改ざん検出テスト**1/1 PASS**。
- **範囲はローカルSQLite/隔離workerd-D1のS4業務API・DBに限る。** 実Cloudflare本番D1、外部AI/課金/メール、実機・実決済・印刷の保証ではない。S4登録済みケースの証拠は100%でも、S4工程そのものは部分完了であり、正式Android/iOS QAのPASS増分0。Gitコミット・Push・Workerデプロイ・Store公開は未実施。
- **稼働ダッシュボード反映の読み戻し完了**：既存Windowsタスクの正規localhost:18765サーバーを起動経路・PIDで確認して再起動し、稼働`GET /api/test-catalog`からSQLite **49/49**・隔離D1 **49/49**（失効・FAILとも0）、`/api/s3-impact-map?file=src/discountRules.js`で049の選択を確認。QAダッシュボードのS3〜S8実Chromium検査は当初1FAIL（S5/S6の事前API取得とページAPI応答の競合）→ページが実際に受け取った同じカタログ応答と照合する方式へ修正し、対象Chromium **1/1 PASS／FAIL0**。変更中のカタログの差を不具合として誤判定しない一方、ページ表示とその根拠APIの不一致はFAILのままとする。


## 2026-11-08 PHT｜S4最終再照合：現行業務48件のSQLite・隔離D1証拠を充足

- **48件の現在有効な独立業務証拠を2環境で充足**：QAダッシュボード`GET /api/test-catalog`にて `LOCAL_BUSINESS_SCENARIO`=**48/48 PASS、FAIL0・失効0・未検証0**、`LOCAL_WORKERD_D1_SCENARIO`=**48/48 PASS、FAIL0・失効0・未検証0** を実測。D1は古い47件の不整合ログを流用せず、先行確認した6件＋未検証だった42件のみ再実行。追加42件の独立Oracle+cleanupによる判定 **42/42 PASS、0FAIL、418,891ms**。正本証拠は `test-results/qa-modernization/s4/local-d1-2026-11-08T12-04-23-163Z-p6116-n1/summary.json`。6件の既存有効証拠も各ケース単位で独立検証し、48の一括実行ログが存在すると偽装しない。
- **故障検知の独立チェック**：最新版のSQLite48ケース証拠に既存56種類の不正変更を適用して**56/56検出、見逃し0**。既存店舗運営側の追加改変監査15種類も**15/15検出、見逃し0**。これは実行したテストの耐性検査であり、正式Android/iOS QA PASS件数ではない。
- **既存ダッシュボード本体へ適用・検証済み**：正規localhost:18765サーバーを実行ファイル・localhost拘束・ポート所有PIDで確認してから既存Windows非表示タスクで再起動。画面とAPIのSQLite・隔離D1分母48、`src/commissionDrink.js→S4-COMMISSION-DRINK-048`紐付けを実測。追加Chromium/HTTP回帰**3/3 PASS**、関連のcase/CI/wrapper回帰**22/22 PASS**。コミット時の影響範囲限定を維持（該当ソースから新ケース048のみ）。
- **S4工程全体はまだ部分完了**。隔離Workerd/D1と本番Cloudflare D1は別物。複数割引併用・部分返金・外部AI/課金/メールの実連携などは未保証であり、S5の実ブラウザーE2E、S7の本人実機QAをS4のPASSに算入しない。S4の工程100%を主張せず、工程進捗の推定率は条件を再定義して正式算定するまで据え置く。正式OS別QA PASS増分0。Git commit/push、Worker・Store配布は未実施。


## 2026-11-08 PHT｜S4継続：コミッションドリンク業務を新規S4ケースに統合

- **S4工程は引き続き部分完了。** 既存の固有47件を維持し、`src/commissionDrink.js` の未割当を解消する `S4-COMMISSION-DRINK-048` を正本のS4共通ランナーへ追加。単一のメニューマスタのまま2商品分の対象・追加料金・商品報酬フラグを実RPCで保存、フラグ単独更新による既存値の不意な上書き禁止、他店舗商品を含む一括保存の拒否、他店舗認証拒否、DB独立readback、全テーブルcleanup、2店舗不変を独立Oracleで検証。既存ケースの専用ランナーを重複作成せず、48件共通ランナーとケース別証拠を再利用。
- 実行結果：新ケース単独 SQLite **1/1 PASS・FAIL0・688ms**、隔離workerd/D1 **1/1 PASS・FAIL0・11,274ms**。独立証拠に対する追加の負例2件（コミッション追加額改ざん、他店舗メニューデータ改ざん）はともに検出。初回Oracle統合で`S4_INTEGRITY_OPERATION_AUDIT_MISSING_OR_EXTRA`のFAILを記録し、新RPCを共通操作ログ監査の対象に加えて解消した。過去のFAILは成果PASSに算入しない。
- 48件になったため既存SQLiteランナーを全件実行し、**48/48 PASS・FAIL0・BLOCKED0・NOT_RUN0、32,961ms**、共通SQL独立検証・cleanup完了。原証拠：`test-results/qa-modernization/s4/local-api-2026-11-08T11-53-02-596Z-p4104-n1/summary.json`。新規D1単独証拠：`test-results/qa-modernization/s4/local-d1-2026-11-08T11-49-16-323Z-p17332-n1/summary.json`。
- D1の古い全47件履歴は現行の独立`verifyS4Summary`で契約不整合（`1 !== 5`）が発生するため、**今現在の48件のPASSとして再利用しない**。既存ログは保存したまま、真に失効している5件のみを共通D1ランナーで再実行し **5/5 PASS・FAIL0、48,466ms**。原証拠：`test-results/qa-modernization/s4/local-d1-2026-11-08T11-57-02-971Z-p12504-n1/summary.json`。D1現行カタログは **6/48 PASS・42 NOT_VERIFIED・FAIL0**（新規048含む）。42件未検証は全件テスト済みとして扱わない。
- `scripts/ci/s4-execution-gate.mjs` に `src/commissionDrink.js → 048のみ` を登録し、影響範囲のみ実行する既存コミット時テスト選択は維持。既存シナリオ共通マスタ、独立Oracle、CI分母、説明・suite証拠、店舗運営ワークフローの47→48境界を連動。QAダッシュボードS4行に **SQLiteと隔離D1の有効PASS/未確認を別々に表示**、カタログは既存の正式証拠をSHA・独立Oracleと照合し、旧47件の証拠を48件に水増ししない。
- S4関連ユニット/契約の直近回帰は **20/20 PASS**、追加048改ざん負例テスト **1/1 PASS**、suite-wrapper証拠契約 **4/4 PASS**。実Chrome表示・永続ローカルdashboard反映は別途読み戻し判定する。新しいS4業務候補はまだ他にもあり、伝票内の部分返金、複数割引併用、真の外部Cloudflare D1/AI/課金等は未保証。新たな正式Android/iOS QA PASSは0。Gitコミット/Push・本番Worker反映なし。


## 2026-11-08 PHT｜S3残件3項目の選択根拠可視化・受入検証

- **S3工程限定の完了条件3/3を検証。** ①テスト選択精度（メニュー5件/コミッション1件・無関係テスト除外・未知ソースALL）、②ソース参照候補と実行証拠/業務テスト期待値の区別、③S4未割当・無参照・失効証拠の明示。関連ユニット**27/27 PASS**、実ChromiumのS3紐付け画面 **1/1 PASS**。`docs/qa-modernization/S3_REVALIDATION_20261108.md` に受入基準・限界を明記。
- 既存の `scripts/ci/change-impact.mjs`、`scripts/ci/s4-execution-gate.mjs`、`scripts/ci/run-auto-discovered-tests.mjs` を**変更せず**、新しい読み取り専用 `GET /api/s3-impact-map?file=...` と `/#s3ImpactMap` で、現在差分と任意の登録ソースからコミット自動発見/独立S4ケース/Push npmスモーク/静的参照候補の選択根拠を表示。S4現行PASS/FAIL/STALEと期待結果・検証方法を既存カタログから取得。追加QAテストは `PRECOMMIT_TIER: EXTENDED` とし、無関係な通常コミット時に常時起動させない。
- 既存S3未割当別回帰のSHA照合済み12件は別分母を維持。`src/commissionDrink.js` の別回帰4/4有効PASSもS4業務PASSへ昇格せず、S4未割当を明示。前の「最新コミットを通常差分に混ぜる」変更は撤回済み。現在差分の対象だけを基本とする。
- **S3の工程スコープ内は100%判定可能**。すべての業務機能・全分岐のカバレッジ100%やS4〜S8の完了とは異なる。正式OS別QA PASS増分0。コミット・Push・Worker配備・Store承認は未実施。

## 2026-11-08 PHT｜S3〜S8 最終照合：S3追加回帰のコミット後選択漏れを解消

- S8追加ゲートを含む`main`のコミット`5e89402`が`origin/main`と一致していることを読取確認（実際のGitHub workflow成功やStore公開を意味しない）。その後、S3再検証選択器の追加修正を実施したため、その追加修正までリモートに含まれるとは主張しない。
- 既存`s3-browser-coverage.mjs --run-affected`で**3画面72/72 PASS**、対象ソース変更0、FAIL0/SKIP0。S4独立業務**47/47現行PASS**、S5 Chromium **7/7現行PASS**、S6 Chromium **5/5現行PASS**を稼働カタログAPIから照合。これらはローカル/隔離ブラウザ・DBであり正式OS別実機PASSではない。
- 同時コミットによりS3の追加別回帰12件中1件のテストソースSHAが失効。旧`--run-affected`はクリーンなGitで新規差分0→選択0となり、12件を消す空の結果を生成する問題が見つかった。`s3-unmapped-source-probe.mjs`を変更し、**直近の非空の正規選択を維持し、そのテスト・関連ソース・TAPログのSHAは毎回再照合**する。コミット後も未確認をPASSにしない。選択器の負例含む4/4 PASS。
- 修正後の1回実行で、**実際の失効対象1ファイルだけ再実行PASS、11ファイルは検証済みPASS再利用**。S3追加別回帰は再び**12/12現在有効PASS、FAIL0、未実行0**。S4業務47件・S3 UI72件・npm親226件の分母には追加しない。
- S7は本人実機台帳12チェック・本人記録0件のまま、S8ライブは**自動PASS1、High未解決によるFAIL1、npm/CI/両OS実機要確認4**、総合NOT_READY。正式実機QA PASS増分0。6条件のリリースコマンド接続と独立QA証拠ピンのテスト完了は、正式リリース条件充足や正式承認を意味しない。
- **追加のS3選択漏れ対策（同日）**：クリーンなGitで旧候補12件を保持するだけでなく、次の差分で新しいS4未割当ソースが追加されても従来の監視対象を消さず、ソース単位で新旧候補を統合。新しいソースがテスト参照0件の場合も監視対象から落とさず `NO_TEST_REFERENCE` として保持し、実行時は非0終了にする。存在しないソース、過去証拠内の不正なテスト起動コマンドをPASSとして受け付けない。選択器7/7＋メニューSQLフィクスチャ2/2＋S8正式Store停止負例5/5、**対象回帰14/14 PASS／0FAIL／exit0**。S3実証ログ `test-results/qa-modernization/s3-unmapped-2026-11-08T10-46-24-979Z-p7112/result.json`：12件中12件をSHA再照合してPASS、再利用12・新規実行0、FAIL0。実API `/api/s3-unmapped-probe` は12PASS／失効0／参照なし0。正式OS別QAおよび本人実機QAのPASS増分0。変更はローカル未コミット。

## 2026-11-08 PHT｜S8 正式Storeリリース4経路へ6条件停止ゲート接続

- **今回の進捗：S8の「CI/CDに実際の停止条件を接続」はローカル実装と負例テストまで完了。GitHubへPushしていないためリモート適用済みとは言わない。** 従来の読取画面だけのゲートに、`scripts/ci/s8-store-release-gate.mjs`（izakanpai専用）を追加。`package.json`の`ci:release:ios`、`ci:release:android`、`ci:publish:ios`、`ci:publish:android`に既存の標準モバイル・課金共通ゲートの**後段**として組み込む。GitHubの手動`store-release-readiness.yml`はこれらのコマンドを起動するため追加ゲートを実際に通る。共通の別アプリ向けvendored validatorは変更しない。
- 新しいゲートは、独立の保護CI環境でSHA256承認済みのQA evidence JSONの`releaseReadiness`を読み取り、現在のcheckout/ビルドソースcommit一致・7日以内の証拠・既存S8の6種類のゲートID/全PASS/件数を検証する。自動テストの有効PASS=全数、全件npm証拠、現行CI、未解決障害High0かつ全未解決0、両OSの同一build/deviceの本人実機12項目以上PASSが1つでも欠ければ**BLOCK**。QA evidenceが不存在・改ざん・外部パス・保護SHA不一致ならBLOCK。既存の署名済みIPA/AAB・証明書・正規CI run・別個の正式承認も必須のまま。
- 候補証拠の生成は`scripts/qa-modernization/export-s8-release-readiness.mjs`で既存ローカル`127.0.0.1:18765/api/release-readiness`をread-only参照する。両OSの対象build/deviceを明示し、Git作業ツリーがcleanで現在ソースの6条件が本当にREADYの場合だけ**未承認候補**を`test-results/qa-modernization`へ出力。現在はHigh障害・npm/CI・本人実機の未完了により未生成であり、架空のREADYやユーザー実機PASSを発行しない。候補を正式QA evidenceへ組込み、保護設定の証拠SHAを独立レビューで更新する必要がある。
- 実行検証：`test/auto-ci/s8-store-release-gate.test.mjs`5/5 PASS（6条件、古いnpm/CI、High、両実機、異なるコミット・SHA改ざん・パストラバーサル、4経路の実配線、実CLIの無証拠拒否）。`test/auto-ci/s8-release-readiness-export.test.mjs`3/3 PASS（6条件の既存評価器からの候補生成、NOT_READY拒否、対象版不一致拒否）。既存S8 evaluator9/9 PASS、合計**17/17 PASS**。実CLI `node scripts/ci/s8-store-release-gate.mjs --release --platform=ios`は現状証拠がないため**exit1 BLOCK**。既存TestFlight配布ワークフロー検査は16/16 PASS。S7実機テストに必要なTestFlight/Firebase配布は止めず、正式Storeリリースと公開だけを対象とする。
- 現時点のライブS8ゲートは**自動PASS1／障害FAIL1／要確認4／総合NOT_READY**（前回の0/6から変化。ライブを優先）。User実機QA正式PASSの増分0。今回は本番Workerの配備・Store公開・正式承認は実施しない。ソースcommit/Pushも未実施。

## 2026-11-08 PHT｜S3〜S8 継続：S4未割当ソースの実行漏れ発見・修復

- S3の現行変更と`s4-execution-gate.mjs`の正規ケース割当を突合し、S4の47業務ケースに直接割り当てのないソース`src/commissionDrink.js`、`src/gasShape.js`、`src/menuOptions.js`の**3件**を検出。新しい専用業務ケースを捏造せず、既存`s3-source-audit.mjs`が収集していた実在テスト候補を再利用して**12ファイル**を重複排除して選定。
- 最初の12ファイル実行で**10PASS／2FAIL**。FAILは`test/menu_ai_provisional_lifecycle_test.mjs`と`test/menu_ai_workflow_backend_test.mjs`の現行メニュー管理SQLに必要な`0060_commission_item_enabled.sql`が隔離SQLiteフィクスチャに未適用であったこと（`0063_commission_drink_item_flag.sql`も現行メニュー定義として追加）。製品ソースを誤修正せずテストフィクスチャ2件を更新した。
- 改善後、**変更した2ファイルだけ再実行PASS**。元の正常10ファイルはソースSHA・テストSHA・ログSHAと0 exitを再照合して再利用し、統合判定は**12/12 PASS、FAIL0、現行一致12**。2ファイル内部のNodeテスト結果は**23PASS・0FAIL・1SKIP**（SKIPは本物の外部AIを伴う手動実行条件、成功と数えない）。過去のFAILログを保全し、勝手にPASSへ修正・削除しない。
- 新しい共通`scripts/qa-modernization/s3-unmapped-source-probe.mjs`は`--plan`／`--run`／`--run-affected`。未割当ソースは既存S3差分の直接参照候補から動的に選択し、失敗ケースの修正後にPASS済みの完全一致証拠を再利用する。テスト分母の重複やS4正式ケースPASSへの昇格はしない。Source-only候補と真のテスト完走を区別。
- `test/auto-ci/menu-admin-fixture-schema-contract.test.mjs`を追加。現行`getAllMenuForAdmin`のSQL参照カラムと実際の`migrations/*.sql`の`CREATE TABLE`／`ALTER TABLE ADD COLUMN`を**動的解析**し、現行スキーマを使うAI登録テストフィクスチャに必要なマイグレーションが欠落すればFAIL。新しいカラム追加を想定した負例テストもPASS。
- QAダッシュボードのS3工程行に「S4未割当ソース3件の別回帰・12件の有効PASS/FAIL/失効」を追加。`GET /api/s3-unmapped-probe`は保存ログSHA・現在ソースSHAを再照合した読取専用の個別証拠のみ返す。S3親1コマンドの子72件・S4独立47業務ケースとは**分母を混算しない**。
- 証拠：`test-results/qa-modernization/s3-unmapped-2026-11-08T10-06-19-102Z-p21148/result.json`（初回10PASS/2FAIL）、`s3-unmapped-2026-11-08T10-11-57-523Z-p4264/result.json`（正常10再利用＋失敗2修復→12PASS）、`s3-ai-fixture-remediation-20261108.log`（23PASS/1SKIP）、`s3-source-fixture-guard-20261108.log`。新規判定・画面を含む対象回帰**6/6 PASS、0FAIL**。これは本番Worker/D1・Native実機・正式QAのPASSではない。

## 2026-11-08 PHT｜S3〜S8 一括再検証・失効判定・工程別ライブ表示

**今回の操作と工程全体の完了は別。** S3〜S8の既存資産を再利用して、実行→独立証拠読戻し→ダッシュボード判定まで検証した。ステップ全体の推定進捗％は、定義済みの分母がないためテストPASS率で増やしていない。

| ステップ | 今回の実行実績 | 次の未完了条件 |
|---|---|---|
| S3 | 既存`s3-browser-coverage.mjs --run-affected`で実Chromiumメニュー3画面×24＝**72/72 PASS**（FAIL0/SKIP0、失効対象を修復する実行を1回実施）。ライブ証拠は並行ソース編集で**再び72件STALE_SOURCE**。 | 変更影響分析の選択漏れ・全分岐、編集が安定したソースの再評価 |
| S4 | 既存S4 wrapper **19/19 PASS**（内部では隔離SQLite/実Gateway・workerd/D1・独立SQL Oracle・47業務ケース・不正証拠検知を実行）。 | 47件の本番相当機能網羅の不足、実Cloudflare D1/外部サービス差。並行ソース変更でライブ**47件STALE_SOURCE** |
| S5 | 既存実Chromium E2E wrapper **7/7 PASS**。 | 全画面/E2E候補・本物のAI生成・メール配送。ライブ7件STALE_SOURCE |
| S6 | 既存通信断・ACK喪失・Chrome再起動/競合 wrapper **5/5 PASS**。 | ネイティブ実機・物理端末間の競合。ライブ5件STALE_SOURCE |
| S7 | 本人実機台帳の記録隔離・不正PASS拒否を含めたS7/S8合同回帰**14/14 PASS**（仮想台帳の試験であり本人PASSではない）。実機12チェック、本人判定0件、Android物理端末とiOSは両方未接続を読取確認。 | 本人のOS・ビルド・端末別の実機受入。アプリ・BLE/課金等はソーステストでは代行不可 |
| S8 | 現行source-awareリリース6ゲートを再照合。`NOT_READY`（PASS0／FAIL1／REVIEW5）。合同回帰14件に含む異常系で旧CI/部分npm/High障害/実機未承認の偽PASSを拒否。 | npm全件、主CI最新ソース一致、未解決High障害、対象実機PASS、正式CI/CD強制停止接続 |

新しい共通`scripts/qa-modernization/revalidate-affected-chromium.mjs`は、**S5/S6既存ケースの`CHROMIUM_CASES`ソース依存と実証状態**から再検証が必要なテストファイルだけを選ぶ。`--plan [S5] [S6]`でread-only確認、`--run`は1ファイル1回、実FAILを勝手に再実行で上書きせず、別ファイルが実行可能なら次へ進む。新規選択回帰2/2PASS。今回の最後の計画では12件すべて共通ソースの再変更で失効していたため、**同じ全件を何度も再実行するのは避けた**。

失効を引き起こしたファイルは実際の証拠SHAとの比較で特定：S3は3画面の`menu_editor.html`、S4は`src/gasApi.js`・`src/admin.js`・`src/orders.js`、S5の代表ケースは`src/gasApi.js`とメニュー画面、S6の代表ケースは`src/gasApi.js`。今回のテストFAILは0件であり、これらのソース更新が実装不具合を証明するわけではない。変更が完了するまでの無制限な同一ケース再実行は行わず、影響選択ランナーで次回の再実証を行う。

QAダッシュボードに`S3〜S8｜現在の実証と残るゲート`の6工程表を追加。S3子72件、S4ローカル47件、S5実Chromium7件、S6実Chromium5件、S7本人チェック12項目、S8 release6ゲートの既存正本からread-onlyで60秒更新する。`qa-dashboard/test-qa-stage-health-live.test.mjs`により、実Chromiumの6工程表・API実数照合・未取得をPASSにしない判定を検証し**1/1 PASS**。これは推定プロジェクト進捗％を自動的に増やすものではない。

稼働中のWindows QA dashboardを既存の非表示起動スクリプトで再起動し、API6経路すべてHTTP200、実Chromiumの6工程行表示・JavaScriptエラー0を確認。追加影響回帰5/5 PASS、重要UI保全ゲートPASS。稼働画面はS3 0/72有効PASS、S4 0/47、S5 0/7、S6 0/5、S7本人0、S8条件0/6（FAIL1/REVIEW5）。**これらは過去実行のFAIL件数ではなく、最新ソースと一致する独立証拠が現時点で失効している状態**を示す。

証拠の保存先：`test-results/qa-modernization/s3-s8-progress-20261108.json`（各wrapperログのSHA、case単位の現行有効/失効、S7実機接続、S8ゲート結果）。wrapper別の最新実行ログは`s4-20261108-latest-all.log`、`s5-20261108-latest-all.log`、`s6-20261108-latest-all.log`。この記録は**実行した時点の証拠**であり、並行編集後のライブ判定は常にAPIを優先する。今回の正式Android/iOS QA台帳新規PASS0、コミット/プッシュ/Worker配布0。

## 2026-11-08 PHT｜S8 リリースゲート：読み取り専用統合判定の実装・検証

- S8を**未着手→部分完了**へ変更。既存の`/api/test-catalog`、`/api/npm-test-status`、`/api/github-actions-status`、`/api/issue-register`、`/api/user-device-qa`の同じ正本を読み取り、`GET /api/release-readiness`で6条件を独立判定する。台帳の複製・上書き、ユーザー実機QAの代行、Worker配布、リリース承認は行わない。対象OS・版・端末はGETで任意指定し、未指定なら「要確認」、正式な本人判定は同じ版・端末に記録された`EXPLICIT_USER_DEVICE_QA`のイベントIDと日時がある場合のみ集計。
- 6条件：①自動テスト実行証拠のPASS/FAIL/STALE/未確認、②npm**全226登録ステップ**の現行ソース一致・完走実績（5件smokeは全件代用不可）、③GitHub mainの主CI成功とローカルHEAD/clean一致、④既存障害台帳の未解決Critical/High（OPEN/WAIT_TESTを含む）、⑤Android対象ビルド・端末の本人実機QA12件、⑥iOS対象ビルド・端末の本人実機QA12件。旧正式1,659 OS別履歴は分母に入れない。
- 判定は`NOT_READY`（現在のFAILや未解決Critical/Highあり）、`REVIEW_REQUIRED`（対象/証拠不足・未確認）、`READY`（6条件すべて証拠上PASSで最終人間承認が別途必要）。取得失敗、別コミット、未コミット、古いPASS、欠損証拠からREADYを創作しない。ローカルUIは`/#releaseReadiness`、60秒の参照再取得、対象OS/版/端末入力・不足6条件表示。**リリース実行ボタンは作らない**。
- 実データの初回S8評価根拠：ローカル自動テスト63登録・証拠行（実行時のソースに対するPASSを区別）、npm最新5/5PASSだがsourceMatch失効・全件226未実施、GitHub過去main SUCCESSだが未コミットソースとの一致なし、障害141件中未解決52件（High 21件）、ユーザー本人の実機判定0/12。**リリース不可**。この報告の根拠はAPI取得値であり、旧公式QAの判定変更は0。
- 完了条件の未達範囲：現行ソース/対象APK・IPAを確定し、必須npm全件実行とCIを一致させ、High障害解決とビルド/端末ごとの手動/ネイティブ確認、外部課金/印刷など残余リスクの確認、**リリースを停止できるCI/CDへの正式ゲート接続**、S9の総合評価とユーザー承認。S8は読取表示・評価エンジン完了で、リリース基盤全体の正式完了ではない。
- **S8実測・再発防止テスト**：S8評価エンジン9件＋HTTP API/Chromium2件＋既存カタログ/QA画面5件＝影響回帰**16/16 PASS、FAIL0**。重要UI保全ゲートPASS。既存ダッシュボードの正規localhost 18765プロセスを検証後に再起動し、API7経路HTTP200、S8表示6/6ゲート、現行の「リリース不可（NOT_READY）」と独立Chrome画面エラー0を確認。**ライブ観測は自動テスト63行中1行有効PASS・62行STALE_SOURCE、FAIL0（並行ソース更新による失効）／npm最新5/5PASSだがsourceMatch=false／GitHub現行一致0／未解決52（High21）／ユーザー本人の判定0**。失効したケースをFAILやPASSと捏造せず、現行未認定として維持。観測JSONは`test-results/qa-modernization/s8-release-readiness-20261108.json`（ローカル証拠、旧正式QA台帳は変更なし）。ソース並行変更で件数は変わるため、常にライブAPIを優先する。

## 2026-11-08 PHT｜P0〜P2実行結果：自動テスト63行の実証

**実行完了**：過去CIで失敗したコミッション2ファイルを現行ローカルで再実行し、Node内部13/13 PASS。GitHub Actions run `42453857783`（HEAD `cb8e6da3`）は公式conclusion=successを取得。古いFAIL履歴は削除していない。並行作業の未コミット差分があるため、このCI SUCCESSを「現在の未コミットソースのPASS」とは表示しない。

**npm5件**：過去のFAILコマンド5件を現行fixture・SW版の期待条件と照合し、`bilingual_data_test.mjs`の最新0063 migration追従と`auth_client_regression_test.mjs`の正式`?v=cdN`対応を実施。別作業による画像権限表示の追加で`frontend_offline_audit_regression_test.mjs`の旧メッセージ期待値が一時FAILしたため、保存の業務エラー遮断/成功後データ維持を崩さず新版と旧版の両方を認証する共通検査を更新。最終差分実行レシート `2026-11-08T06-27-42-785Z-68b5b126-49dd-499a-a7de-6c872a833e9a` は選択5/実行5/PASS5/FAIL0/`sourceStable=true`。ただしその後の別作業のソース変更により最終API確認時は`sourceMatch=false`、**現行ソース保証としては認定しない**。npm全226ステップの全件回帰は未実施。

**S4〜S6再実行**：共通APIと3面メニュー改修後にS4 full 19/19内部テストPASS、独立SQL業務ケース47/47 PASS。S5実Chromium 7/7 PASS、S6実Chromium 5/5 PASS。日付付きTAPログのSHA256、各ケースのPNG SHA・ソースSHA・DB cleanup・独立期待値を再照合。S2/S4/S5/S6の4起動wrapperはケース行と混算せず、S4/S5/S6の3件を新しい汎用`suite-wrapper-evidence.mjs`で証拠化。wrapper判定は実TAPとケースの一致に必要条件を限定し、改変・不完全ログ・失効ソースをPASSにしない。

**画面検証・現行台帳**：稼働中`127.0.0.1:18765`で4 APIともHTTP200、読み取り専用`/api/test-catalog`とローカル独立カタログ一致、**自動テスト63/63行PASS・FAIL0・STALE0・NOT_VERIFIED0**（うち**独立業務シナリオ59件・wrapper4件**、重複加算なし）。カタログ/分類/証拠改変防止9テストPASS、実Chromiumダッシュボード1PASS、既存critical-ui-preservation-gate PASS。これはローカル自動テストの現行実行証拠であり、旧正式OS別QAやユーザー実機QAの新規PASSではない。ソースが再変更された場合は動的に`STALE_SOURCE`へ変わる。

**反映範囲**：既存ダッシュボードAPIとローカル証拠のみ。Workerデプロイ、モバイル実機/印刷、全件npm回帰、ソースの一括commit/pushは今回実施していない。並行ワーカーの未コミット変更は所有せず保持する。

## 2026-11-08 PHT｜npmスモーク5FAILの自律原因調査・修正・再実行

**発端**：新npm履歴に「226登録中19件実行、14PASS/5FAIL」が残っていた。
原因調査を利用者からの個別追加指示待ちにせず、同じ実行証拠のFAILコマンドを
基点に旧ソース・現在の実装・業務境界を照合した。

**原因と修正（元のFAIL5件、5件とも個別再実行 exit0）**

1. `test/bilingual_data_test.mjs`：旧テストFixtureのSQLiteに最新の
   `order_items.commission_components_json` と後続割当列が欠落。
   現行Fixtureのみ既存0058〜0062 migrationを追加。意図した旧0025移行試験は変更なし。
2. `test/auth_client_regression_test.mjs`：新規
   `pending-write-replay.js?v=s6-1` がNative/Web本番/TESTのSW shellに無く、
   Native在庫のAIスクリプト2本もHTML/SW両方ともversion固定がない。
   3面のSWへ実URLを登録し、Native 2本をWebと同じauth版へ揃え、
   キャッシュ世代を更新。テストは実際のページJS/同一SW SHELL URLが
   合うことを確認する方式へ拡張（既存PIN検査を削除していない）。
3. `test/frontend_offline_audit_regression_test.mjs`：旧ページ内変数による
   不確定ACK再送キーの保持を期待していたが、S6では既に
   `IZPendingWrite.begin/clear`の永続化版に置き換え済み。
   3面の保持・正常終了のみclear・通信失敗後保持を検査する方式へ更新。
   独立S6 journal試験2/2 PASSで同一IDの再起動後復元と店舗/セッション隔離を確認。
4. `test/mobile_navigation_test.mjs`：Native`manage.html`の
   コミッション機能無効時のタイル抑止13行がNative`index.html`に未反映。
   既存コードと一致する機能フラグ/店舗切替/認証確認をindexへ適用し、
   index/manage同一ソース検査（192チェック）PASS。
5. `test/store_compliance_test.mjs`：新0062の
   `commission_option_assignment_guards`が、店舗完全削除の共通
   `STORE_SCOPED_DELETE_TABLES`に未登録。共通配列へ追加し、
   D1削除・tenant reset・件数集計に同時反映。
   追加の実SQLite/多店舗/障害注入試験で
   D1先行削除失敗では記録残存、成功で対象店0、隣店1、監査件数1を確認。

**独立回帰**：共通UI破壊検出12/12 PASS、S6書き込みジャーナル2/2 PASS、
コミッションを含む日英注文46チェックPASS、
`test/account_deletion_db_first_regression_test.mjs` exit0。
`node scripts/qa-modernization/business-journey-review.mjs --changed` exit0、
GPT業務候補は正式QAのPASSには計上しない。

**全体の再実行実績**：
`node scripts/run-project-test-pipeline.mjs --ci-smoke --impact`
**選択19 / PASS19 / FAIL0 / 未実行207（登録226） / exit0 /
sourceStable=true / 現行ソース一致=true**。
ローカル証拠 `test-results/npm-pipeline-runs/2026-11-08T05-03-56-614Z-0dfafb6b-c7be-4d69-a79f-46c2b31f5988.json`、
全体ログ `test-results/qa-five-fail-smoke-rerun-20261108.log`。
5個別試験のログは `test-results/qa-five-fail-triage-*.log`。
前回5FAILの履歴は削除せず、再実行後の現行成功と区別する。

**注意**：旧正式OS別PASSは増加なし。226フル回帰、
本番Worker/物理DB・アプリビルド・ユーザー実機/印刷・配布確認は未実施。
今回の変更は未commit/未push。ソース変更後の再実行と本番配布は別ゲート。

**FAIL検知時の運用**：以後、この会話・CoS作業でテストを実行してFAILを
発見した担当は、ユーザーの個別指示を待たずに
レシートの実行対象→元エラー→既存機能の契約→原因と修正→影響テスト再実行
→台帳追記まで担当する。解決できない場合も、原因・未実施・ブロッカーを
明示し、独立の別ケースへ進む。自動監視/将来のAI作業起動そのものは
既存Windowsタスク・実行中セッションの範囲に限られ、
本修正で新しい自律AI常駐や定期タスクを作成したわけではない。

## 2026-11-08 P0 npm・GitHub Actions自動連携を実装・実行

既存の`/api/npm-test-status`・`test-results/npm-pipeline-runs`・`/api/test-catalog`を再利用し、ダッシュボードに`/api/github-actions-status`を追加。既存`gh`の認証をサーバ内で使用する**読み取り専用**GitHub Actions一覧（メインブランチ、各workflow最新runと最近の失敗履歴）、ジョブ/失敗ステップ・コミットSHA・最終実行日時・リンクを取得。失敗ログから`AUTO_CI_TEST_FAILED`で**明示された実テストファイル名のみ**を抽出。3分TTLキャッシュを利用し、ソース状態変化時は直ちに失効。現在有効なPASSは実行コミット＝現ローカルHEADかつ未コミット差分なしが条件。古い成功・途中実行/中止/取得失敗をPASSにしない。画面はCIのワークフロー結果とnpmの実行ステップ、S4-S6の業務ケースのPASSを二重計上しない。

**今回の実証：** ローカルnpm直近差分テストは登録226中19件実行・14PASS/5FAIL、前後のソースFingerprintが変化したため有効PASS認定なし。失敗コマンドは下記に詳細記録済み。GitHub run `42447515445`（`02a7ac7e`）の失敗ログから自動発見40件中2件の真の失敗ファイル（`test/auto-ci/commission-receipt-assignment.test.mjs`、`test/auto-ci/commission-sc-eligible-staff.test.mjs`）を確認。以降のmainでは新runが走るため、これらは過去FAILとして保持し最新状況はAPIで都度更新する。CIのrawログ・トークンはブラウザ非公開。

独立API回帰6/6 PASS、実Chromiumでの失敗ジョブ・失敗テスト・コミット/リンク表示回帰1/1 PASS、npm証拠回帰3/3 PASS、既存重要UIゲートPASS。既存Windows非表示起動経由で`127.0.0.1:18765`を再起動し`/api/status`・`/api/npm-test-status`・`/api/github-actions-status`・`/api/test-catalog`のHTTP 200、実Chromiumのトップ表示PASSを確認。旧正式QA/本人実機の新規PASS0。モバイルビルド・Worker配備・全npm回帰は未実施。

## 2026-11-08 npmテスト実行件数の表示欠落を修正

**追加要望（npm実行履歴の閲覧）：** 過去50回のnpm実行を一覧化し、
日時、実行範囲、対象コミット、PASS/FAIL/未実行、ソース一致/完走を表示。
任意の実行を選ぶとステップごとの終了コード・実行時刻を表示する。
同じローカルJSONレシートを使用し、古いマニフェストの履歴も保持。
根拠なしのPASSや他カテゴリの正式判定とは混算しない。

**実測（ローカル変更影響CIスモーク）：登録226ステップ、選択19件、実行19件、PASS14・FAIL5・未実行207（全226に対して）。**
既存の`node scripts/run-project-test-pipeline.mjs --ci-smoke --impact`を実行し、
最後まで失敗を集計した。結果を
`test-results/npm-pipeline-runs/2026-11-08T04-35-30-956Z-76181fda-8c9f-4d1d-bea7-7cf8637beebc.json`
へ保存した。**実行中にソースFingerprintが変化したため、14件は現在有効なPASSへ認定しない。**
ソース比較が不一致になった原因は現時点で未確定。226フルテストは実行していない。
実行時FAILは以下の5ステップで、PASSの捏造・履歴上書きはしていない。

- `test/bilingual_data_test.mjs`：`order_items.commission_components_json` 列が
  実行時SQLiteに存在せず、メニュー選択注文の永続化がFAIL。
- `test/auth_client_regression_test.mjs`：`inventory.html`のスクリプトリリース固定条件がFAIL。
- `test/frontend_offline_audit_regression_test.mjs`：在庫の曖昧ACK後の再試行ID保持条件がFAIL。
- `test/mobile_navigation_test.mjs`：アプリの起動元と管理ホームのソース一致条件がFAIL。
- `test/store_compliance_test.mjs`：店舗専用`store_id`表と完全削除の整合条件がFAIL。

失敗の修正可否・本番影響は各機能担当の差分・Fixture・migrationを追跡して別途判断する。
表示改善そのものは元のnpm実行条件や正式QA/実機QA台帳を変更しない。

既存の`npm test`実行定義226件はカタログにあったが、
「登録のみ」でPASS/FAIL件数がUIに出ない問題を確認。
`scripts/ci/npm-test-evidence.mjs` の同一ソースハッシュ照合・
ローカル証拠を`scripts/run-project-test-pipeline.mjs`に共通適用。
新しい読み取り専用`/api/npm-test-status`により、
**実際に走った選択件数、PASS・FAIL、残未実行、フルと差分の区別**を
ダッシュボードのnpmテストカードへ反映。
フルを未実施のときに226件全件合格とみなさない。
詳細 `docs/QA_TEST_CATEGORY_POLICY_20261108.md`。

## 2026-11-08 S5/S6ダッシュボード実行結果統合・稼働画面実証

**実装・再実行・既存18765への再起動反映・実ブラウザ確認まで完了。** 以前の「S5/S6は登録のみ・未集計」を解消した。S2/S4と同じ正本カタログ/ダッシュボードを再利用し、`LOCAL_CHROMIUM_SCENARIO` に固定12個の個別ケースを登録。S5は**7/7 PASS（40,659ms）**、S6は**5/5 PASS（23,774ms）**。各ケースの実行日時、`result.json`相対パス、スクリーンショットの閲覧リンクを表示。S5 PNG22枚＋S6 PNG14枚＝**全36枚SHA256一致**を検証し、最新実行ごとのソースSHA、DB cleanup・他店不変、例外/外部アクセスも検証した。登録済みファイル数はPASS件数へ加算しない。

保護条件：ソース更新後は`STALE_SOURCE`、証拠未取得/破損は`NOT_VERIFIED`、最新実行の真正FAILは`FAIL`。前回PASSにフォールバックしないS6ケースの故障注入回帰1/1 PASS。ケース別画像APIのHTTP 200・12ケース代表PNGのSHA一致、パストラバーサル404・書込み405、ライブカタログ実Chromium2/2 PASS、品質トップのライブChromium1/1 PASS、重要UI保全ゲートPASS。Windowsローカル`http://127.0.0.1:18765/`は既存の非表示起動タスクを使って安全に再起動し、稼働API `/api/status`/`/api/test-catalog`とも200・S5 7/7/S6 5/5を再照合。

証拠インデックス原本は`scripts/qa-modernization/s5s6-evidence.mjs`、実行時署名元は各S5/S6 Chromium runner、表示先は`qa-dashboard/quality.js`／`qa-dashboard/app.js`。当初のS5/S6証拠にソースSHAの必要項目がなかったため、追加後に全件を再実行し、古い証拠を不当にPASSへ移行しなかった。旧正式QA/ユーザー実機の新規PASS=0、Git commit/Push/Worker配備・モバイルビルド未実施。GitHub Actions全ジョブのCI成功/失敗連携はこのS5/S6統合の対象外。

## 2026-11-08 テスト目的の見える化・カテゴリ別ケース表示

3カテゴリの**目的／実行タイミング／合格条件**をダッシュボード正面の
カードに明記。大量の詳細ケースは初期非表示とし、
`npm テスト`、`自動テスト`、`ユーザー実機テスト` の
カテゴリタブを選択した場合のみ開く。
既存カタログのカテゴリ固定フィルタ・検索・CSVを再利用し、
実機12項目は手動台帳の正本を読み取りのみ参照する。
旧正式QA1,659ケースは履歴内の専用ボタンで参照。
カテゴリ表示変更はソース業務テスト・端末実機判定・正式QAの新規PASSではない。
詳細は `docs/QA_TEST_CATEGORY_POLICY_20261108.md`。

実績（今回の変更箇所に関係する限定回帰）：新しい目的表示・選択式ケース一覧・
既存のnpmカタログ/実機台帳/障害台帳の単独ブラウザ含む
**18件PASS、0件FAIL**。その後ローカル18765サーバーへ反映し、
実Chromiumによる最終画面回帰 **1/1 PASS**。
初期のケース非表示、npm/自動/本人実機のタブ切替、
旧正式履歴、390pxレスポンシブ、JSエラー0。
新しい登録行数は別担当ソース変更の影響を受けるため画面APIの現値を正とし、
今回の分類変更で実行したS4/S5/S6業務テストや手動実機PASSは0件。

## 2026-11-08 ユーザー決定｜新QAの3カテゴリ

「npm テスト」「自動テスト」「ユーザー実機テスト」の3カテゴリに統一。
`npm テスト`はソース・コード契約・高速回帰と変更影響のCI、
`自動テスト`はS4業務API/DB・S5/S6実ブラウザーE2E・独立Oracle、
`ユーザー実機テスト`は本人のレイアウト/体感/使いやすさ/実印字。
**npmは実行経路にもなるため、S4/S5/S6がnpm経由でも自動テストに分類し、
登録実行ステップに業務ケースを足してPASSを増やさない。**
S1–S3は基盤整備、S8–S9は3カテゴリの品質と残リスクの統合判断であり
それぞれ独立したテストカテゴリではない。旧正式QAは履歴として保持する。
目的別分類正本`docs/QA_TEST_CATEGORY_POLICY_20261108.md`、
ソース正本`scripts/qa-modernization/quality-purpose.mjs`、
ダッシュボードは18765に3カードと分類フィルタを配置。
**この表示変更ではS4–S6の再実行や実ユーザーPASSは追加しない。**

実装検証：新しい分類API／カタログ・実Chromium・障害統合／
本人実機QAの一時台帳を含むローカル回帰 **22/22 PASS、0 FAIL**、
最終目的分類・実画面回帰 **6/6 PASS、0 FAIL**。
Windowsサーバー再起動後、`/api/test-catalog` 登録1,976行
（npm目的266行・業務自動51行・旧正式QA履歴1,659行）、
npmフル登録226ステップ、実ユーザー実機12チェック・本人判定0を確認。
上記は登録や複数実行経路を含み、ユニークシナリオやPASS件数ではない。
S5/S6・GitHub Actionsの現ソース一致付き結果統合は未完了。

## 2026-11-08 決定更新｜旧正式QA 1,659件消化目標は終了

利用者はQA体系を「自動テスト」と「私の実機QA」に分けると明示。
後者は画面レイアウト・感覚的なレスポンス・ユーザビリティ・プリンターを
本人が実機で確認・明示判定する。旧正式QAは原台帳を保全したまま参考履歴とし、
未消化1,659件の分母をリリース進捗・NG条件に使わない。
既存18765ダッシュボードへ `/#user-device` を追加し、
Android/iOS・版・端末別12チェックの明示判定履歴を追加。
既存障害台帳は引き続き利用者操作のみでCLOSED。
**今回の実機ユーザー判定PASS増分=0（実端末未実施）**。
自動テスト証拠との分離、API制限、ローカル実Chromium検証は
`docs/QA_USER_DEVICE_QA_SPLIT_20261108.md` に記載。
残るS5/CIの実行証拠統合は継続課題。旧正式QAの詳細は消去しない。

最終更新：2026-11-08（フィリピン時間）

**このMDがQA再構築の継続管理原本。別チャットでも最初に読み、新しい類似ロードマップを作らず更新する。**

## 0. 2026-11-07 ユーザー承認済み・最終QA運用方針

**最終目標：AIが品質確認の大部分を、データ準備・実行・期待値判定・独立DB照合・証拠保存・後片付け・結果記録まで自律完了する。人間は通常、レイアウトとユーザビリティの最終実機確認を担当する。**

- 旧来のケース専用実機ドライバーを増やす方式から移行し、共通Fixture＋共通シナリオ＋実ブラウザ＋実業務API＋独立Oracleを再利用する。準備件数やコード数をQA進捗として数えない。
- メニュー・カテゴリ・注文・会計・権限・店舗分離・保存再読込・日英・通信異常は、可能な限りWeb＋Worker＋DBにより自動化する。AIは影響分析、テスト選定・追加、FAIL原因分析、必要な修正・再テストを担う。
- 人間による実機スモークは**通常10～15分を目標**とし、レイアウト・文字サイズ・タップのしやすさ・スクロール・ちらつき・操作感を主に確認する。これはまだ実測保証ではない。
- BLE実印刷、実端末課金、カメラ、通知、OS権限などWebで代替できない機能は、API/DB側を先に自動化し、実機特有の機能は自動実機実行が可能なら利用する。自動化できない重大機能は**BLOCKED/NOT_RUNとして残す**。人間のレイアウト確認で機能テストPASSと見なさない。リリース必須の場合は個別の短いネイティブ試験またはリリース保留が必要。
- 1ケース失敗で全体を止めず、原因と証拠を残して次の実行可能ケースに進む。同一原因の無限リトライは禁止。原因が変わらず2回連続で失敗したら原因別の別手法に切り替える。
- teat・yuwakuの既存ユーザー許可は引き継ぐが、他店舗・共有DB・真正性は保護する。S2のローカルSQLite PASSをCloudflare D1、実機、公式QA PASSへ格上げしない。
- モバイルビルド、ストア配布、commit/push、本番Workerデプロイは本方針承認だけで自動実行しない。既存のAGENTS.mdの許可境界を保持する。

## 0.1 自律QA「1業務シナリオ完了」の判定条件

1. シナリオID、業務期待値、実行レーン（静的/単体/Webローカル/Worker-D1/ネイティブ/正式QA）と対象変更を確定する。
2. 共通Fixtureでテストデータ・権限・店舗を準備し、独立Readbackで開始条件を照合する。
3. 実画面や実業務APIを実行し、実際のHTTP応答や画面状態を記録する。
4. 結果を独立OracleとDB前後差分で確認し、拒否系・競合・復旧などの重要な期待値も評価する。画面に「成功」と出たことだけでPASSにしない。
5. PNG、レスポンス、DB前後、ログ、実行バージョン、所要時間を保存し、証拠欠損をFAILとして扱う。
6. 失敗時もfinally相当の後片付けを実行し、QA所有データと別店舗の不変条件を独立再照合する。
7. **PASS / FAIL / BLOCKED / NOT_RUNを実行レーン別に確定**する。ローカルテストPASSを正式QAのPASSに加算しない。

## 0.2 速度・自律性の管理KPI（実測以外をPASSにしない）

| KPI | 定義 | 現状 |
|---|---|---|
| 自律完了率 | 人間の準備/操作なしで判定・証拠・cleanupまで終了したシナリオ ÷ 開始したシナリオ | **全体未測定**（S2限定パイロットのみ） |
| 正式確定業務数 | レーン別の期待値と証拠が揃ったPASS/FAILの件数 | 全体未測定 |
| 1シナリオ所要時間 | 準備～実行～証拠確認～cleanupの実測 | S2局所テスト約2.5秒、全体の代表値ではない |
| 準備・cleanup失敗率 | データ準備/独立復旧未完了件数 ÷ 実行開始件数 | 全体未測定 |
| BLOCKED/NOT_RUN内訳 | 端末接続、API、DB、期待値、Fixture、証拠など原因別 | S3以降で整備 |
| 人間の実機確認時間 | 各リリースでのレイアウト/UX実測作業時間 | 未測定（目標10～15分） |

**実行順：** 変更時は影響先をAIが選定して高速テスト。定期的に主要業務全体の回帰。リリース前は自動テスト結果・ネイティブ必須試験・未検証リスクを統合して判定する。定期実行とリリースゲートの自動統合はS8で実装する。

## 0.3 新しいチャットへの引き継ぎ手順（必須）

1. izakanpaiワークスペースのQA_START_HERE.mdと**このファイル**、S1_inventory_report.md、S2_result_report_20261107.md、直近のステップ報告を最初に読む。
2. git statusで並行作業・未コミット差分を確認し、上書きしない。既存テスト基盤、失敗履歴、正式QA台帳と証拠を確認してから作業する。
3. 完了済みS1/S2を作り直さず、未完了ステップに進む。作業完了は「準備・コード作成」ではなく、実際のテスト実行・結果・復旧・証拠を根拠に認定する。
4. **作業終了前に必ずこのMDへ実測結果・PASS/FAIL/BLOCKED・処理時間・証拠パス・失敗原因・次のアクションを追記する。** 正式QA台帳への書き込みとは区別する。
5. ChatGPTライブラリの控えは /izakanpai/QA_MODERNIZATION_PROGRESS.md とする。**原本はWindowsワークスペースの本MD**。新チャットで差異がある場合は原本とソース/実行証拠を優先する。ライブラリへの同期は更新後に実施し、未同期なら明記する。
6. ローカルMD更新はcommit/push/deployの許可を意味しない。既存許可範囲を拡大しない。

**実装ステップ進捗：3 / 9 完了＋S4は固有47業務シナリオ。SQLite47/47PASS・25,736ms、隔離workerd/D1 47/47PASS・446,791ms。不正証拠の独立検知はSQLite56/56・D156/56（各0見逃し）。全93店舗別テーブルreadback・cleanup、カタログSTALE_SOURCE0。分割会計D1の初回Pilotで2件のテスト条件FAILを修正して全件再検証済み。S4全機能網羅は未完で部分完了、正式QA新規PASS0。詳細 S4_COMPLEX_CHECKOUT_REFUND_20261108.md。**

**最終CI/ダッシュボード確認：S4・カタログ・実Chromium回帰23テストPASS/0FAIL、npm自動発見12ファイル全成功（npm全ステップとは別）、ダッシュボード再起動後のライブAPIでSQLite47・D147・正式QA既存395。** 新しい46/47ケースではなく新規41〜47の7件を漏れなく実行。旧40ケースの過去履歴は別レポートに保持。

**2026-11-08 S5 Web E2E一次実測：既存自動発見EXTENDEDで実Chromium 4/4 PASS・0 FAIL・exit 0・21,113ms。** カテゴリ順・JA/EN→Gateway/独立SQLite 1件、発注「記録→冪等再保存→メール送信失敗の明示→同内容の新発注2件→日英の履歴/DB readback」2言語を1テスト、注文管理/会計プレビューPHP・JPY各1件。独立DB照合、異店舗不変、PNG SHA、負例・cleanupを確認。別途既存関連回帰40/40 PASS。S5新規4件とS4の47件、正式OS別QA新規PASS0を混算しない。S5は画面網羅未達で部分完了。GitHub Push/PRの軽量CIには重いS5全件を含めない。詳細 `S5_WEB_E2E_20261108.md`。

**2026-11-08 S5第二弾最終実測：実Chromiumの新規7/7 PASS・0 FAIL・exit 0・40,787ms（既存4＋AIポイント1＋在庫1＋現金会計→返金1）。** 直接起動でも同じ7/7 PASS・45,563ms。実画面・共通Gateway・独立ローカルSQLite/隔離workerdの真正レスポンス、在庫4→7→7→10→0（ACK喪失後同一キー/別便区別）、AI生成失敗で消費0／残高不足でAPI呼出0、会計300→返金−300→純売上0の領収書/DB/画面整合を確認。最新7件の証拠PNG **22/22 SHA256一致**、隔離DB cleanup・他店舗不変・異常注入検知、JS構文7/7、外部通信0。既存関連27/27PASSは**別の回帰**。初回統合試行ではNode子プロセス途中終了1 FAIL（根本原因未確定）を記録、別実行方式と正規 `node --test` の2回とも最終7/7完走。S5部分完了、正式Android/iOS QA新規PASS0。詳細 `S5_WEB_E2E_20261108.md`。

**2026-11-08 S6通信復旧／同時会計の第一弾実測：実Chromium新規2/2 PASS・0 FAIL・exit 0・9,491ms。** 1件目はブラウザオフライン→確定前HTTP断→照合のみ→明示再操作→確定後ACK喪失＋照合API断→読取のみで元領収書復旧→Chromeプロセス再起動後のDB/履歴照合。2件目は2タブで同時現金会計、先行 `OR-000001` 確定／後続 `nothing_to_bill` を受け同じ領収書へ照合、DBに領収書・会計監査各1件、二重会計0。**修正前FAILから発見したIZK-UT-139** をNative/Web本番/Web TEST 3面の読取専用復旧へ横展開して修正、障害表はWAIT_TEST（CLOSEDではない）。新規S6証拠PNG7/7 SHA256一致、他店不変/独立SQL破壊検知/全テーブルcleanup。関連3面回帰16/16PASS、S4会計/二重会計保全はSQLite2/2・隔離workerd/D12/2、旧S5全7/7再PASS、重要UI21/21PASS。**S6部分完了、正式OS別QA新規PASS0**。詳細 `S6_NETWORK_RESILIENCE_20261108.md`。

**2026-11-08 S6第二弾・再起動をまたぐ3業務E2Eの最終実測：S6統合5/5 PASS、0 FAIL、exit 0、24,123ms（既存会計2件＋新規3件）。** 入荷：在庫4→7（ACK喪失）→別Chromiumプロセスで元IDを再操作しても7→意図した新規別IDで10。発注：DB確定1件→ACK喪失・Chrome再起動→元ID同内容で1件のまま→明示「新しい発注」で2件。AI：隔離スタブによる本物の課金RPC成功で残10→9、画像保存1→ACK喪失・Chrome再起動→元IDの結果復元時9/画像1→操作者の新規再生成のみ残8/画像2。既存JSメモリ限定IDの再起動消失を`IZK-UT-140`へ登録し、**共通`pending-write-replay.js`をNative/Web本番/TEST 3面×3画面に横展開**。同じ署名・認証店舗・ユーザー・sessionに限定し、入力内容は保存せず操作署名SHA256・ID・時刻だけを永続化、起動時の自動再送禁止。**S6証拠PNG14/14 SHA256一致**、全DB表cleanup・他店不変・独立SQL破壊検出。既存S5の実Chromium7/7PASS（39,695ms）、関連Unit/AI UI19/19PASS（26,379ms）、critical UIゲートPASSは**別レーン**。障害`IZK-UT-140`はWAIT_TEST、ユーザー実機QA新規PASS0。原因/修正/失敗履歴/現物証拠は`S6_BUSINESS_RESTART_20261108.md`。**S6は代表業務部分完了、実端末/本番外部接続とメール/印刷等は未検証。**

**最新CI/表示確認：S4・カタログ・実Chromiumの22テストPASS/0FAIL、npm自動発見10ファイル実行成功（npm全221ステップではない）。旧プロセスのダッシュボードは0/0表示だったため再起動し、ライブAPIでSQLite40・workerd/D140・正式QA既存395の別集計を確認。返金横断業務の証拠・原因/対策・未保証は S4_REFUND_WORKFLOW_20261108.md。**

| ステップ | 実施内容 | 判定 | 実績・証拠 | 未完了範囲 |
|---|---|---|---|---|
| S1 | 既存テスト・正式QA・CIの棚卸し | 完了 | S1_inventory_report.md、213コマンド、適用1,659件、重複15件 | 厳密な機能カバレッジ検証はS3〜S5 |
| S2 | 共通Web/DBテスト環境・証拠管理 | 完了（ローカル） | S2_result_report_20261107.md、個別3/3PASS、CI自動発見6/6PASS | 実Cloudflare D1差異はS4、カテゴリ新UIはS5 |
| S3 | AIソース全体・変更差分監査 | **部分完了（前回のブラウザ未完走を解消：現行72/72 PASS）** | `S3_REVALIDATION_20261108.md`。追跡ソース2,586、変更44（高優先28）、変更高優先の直接参照なし0。メニュー3画面×24＝72件/72件、委託報酬36件、課金30件、その他関連回帰PASS。旧FAILと並行編集による失効・再検証履歴を保存 | ソース参照候補≠意味的な実行網羅。全機能・全分岐の変更影響選定、実D1/外部API・ネイティブ保証、QA全機能の完了率は未確定 |
| S4 | API/DBと業務不変条件の強化 | **部分完了（固有47ケース、SQLite47/47・隔離workerd/D1 47/47 PASS、不正証拠56/56×2環境検知）** | S4_COMPLEX_CHECKOUT_REFUND_20261108.md：全93店舗別テーブルの独立SQL readback、cleanup・店舗分離。旧Oracleの22改変証拠中12件見逃し履歴はS4_MUTATION_AUDIT_20261108.mdへ保存 | 47シナリオにない複数割引・部分返金・外部サービス・通信復旧・実機などは未保証 |
| S5 | Web E2E、画面・日英・操作検証拡張 | **部分完了（実Chromium新規7/7 PASS／0FAIL、40,787ms）** | S5_WEB_E2E_20261108.md。第一弾4件（カテゴリ・発注JA/EN・会計プレビューPHP/JPY）、第二弾3件（AIポイント／在庫／会計確定→全額返金）。S2/S4実Gateway・隔離SQLite/workerd/D1、独立SQL・負例・PNG22枚SHA・cleanup。既存関連27件などは別集計 | 全画面/全50候補完全E2E、実メール配送、実AI生成成功、実機、S6通信断・再起動の本番条件など未保証 |
| S6 | 通信断・ACK喪失・同時操作・復旧 | **部分完了（実Chromium固有5/5 PASS・0FAIL、24,123ms）** | S6_NETWORK_RESILIENCE_20261108.md／S6_BUSINESS_RESTART_20261108.md：会計復旧・競合2件に、入荷・発注・AI成功課金のChromeプロセス再起動3件を追加。元ID復旧と意図的な新ID、他店不変、独立SQL/負例、PNG14枚SHA。IZK-UT-139/140はSOURCE修正済みWAIT_TEST。既存S5全7/7・関連19/19は別集計 | 実機ネットワーク断・Nativeアプリの強制再起動、物理端末間の競合/本番D1・外部AI/R2・実メール/印刷などは未保証 |
| S7 | 人間による短時間実機QAへ再編 | **記録画面・12チェック整備済み／本人実機判定は未実施** | `/api/user-device-qa`、`/#user-device`、本人判定0/12 | 実機ビルド/端末での12項目、BLE、課金、カメラ、OS固有 |
| S8 | CI/QAリリース判定とダッシュボード統合 | **部分完了（6条件のread-only判定/実画面）** | `/api/release-readiness`、`/#releaseReadiness`、独立台帳照合と異常系回帰 | 現行ビルドの全npm/CI・障害・実機ゲートを満たすこと、CI/CD強制停止との正式接続 |
| S9 | 総合検証とリリース移行判定 | 未着手 | — | 最終実行証拠と承認 |

## 現行の正式QA台帳（変更なし）

| 状態 | Android | iOS |
|---|---:|---:|
| 適用件数 | 829 | 830 |
| PASS | 383 | 12 |
| FAIL | 62 | 0 |
| BLOCKED | 5 | 2 |
| NOT_RUN | 374 | 811 |
| 承認済みSKIP | 5 | 5 |
| 正式完了（PASS＋SKIP） | 388 | 17 |
| 正式未完了 | 441 | 813 |

Androidの正式PASSには旧判定再利用206件が含まれる。S2のローカルWeb PASSを公式台帳のPASSには加算しない。

## 日常の進捗確認と実行方法

- S1原本：docs/qa-modernization/S1_inventory_report.md、S1_inventory_summary.json、ケース／テスト対応CSV。
- S2原本：docs/qa-modernization/S2_result_report_20261107.md。
- S3ソース監査：docs/qa-modernization/S3_source_impact_report.md と S3_source_impact.json。最初のブラウザ全件テスト時間超過履歴と別方式9/9PASS証拠は test-results/qa-modernization/s3/。
- テストケース一覧：Windows QAダッシュボード http://127.0.0.1:18765/#qaTestCatalog 。**「npm test（プログラム自動テスト）」と「業務QA（正式OS別シナリオ）」を最上位の2系統に分離**。2026-11-07訂正時のnpm testは217実行ステップ、内部の自動発見8ファイルは1ステップの内訳。業務QAは831固有ID・OS別1,659行。全表示1,884行（重複計上の意味に注意）。全行のCSVは docs/qa-modernization/S3_test_case_catalog.csv を参照し、現在値はAPIで再集計する。
- テスト分類の意味・実装結果：docs/qa-modernization/S3_dashboard_catalog_report_20261107.md。負荷・性能/UX/技術等は各系統内の**下位分類**。ユーザーが指定した「npm test」を「RPMテスト」と誤認した過去の設計を2026-11-07に訂正。RPM性能測定の話は本件の主分類ではない。
- S2実行：node --test scripts/qa-modernization/s2-evidence.test.mjs test/auto-ci/qa-modernization-s2.test.mjs
- CI自動発見：node scripts/ci/run-auto-discovered-tests.mjs
- 証拠：test-results/qa-modernization/s2/ のrunごとのresult.json＋画面PNG。
- 正式台帳の再監査：node scripts/qa-autonomy/official-ledger-audit.mjs --summary。

原則：WebのローカルPASS、Cloudflare D1の実ランタイムPASS、ネイティブ実機PASS、公式QA PASSを混同しない。CASE単位で実行していないものはPASSにしない。

## 2026-11-07 S3の実行記録

- 現在のGit差分に対して既存追跡コード2,528ファイルを走査し、影響先を記録。旧S1の213テスト実行定義から216件に増加（並行作業の変更を反映）、追加自動発見は7件。
- S3の初回既存回帰は7ファイル中6ファイルPASS。メニュー管理ブラウザの全60ケースは監査スクリプトの100秒制限で停止し、45件PASS相当の出力を確認したがファイル全体は**FAIL（未完走）として保存**。
- 同じ失敗方式を繰り返さず、影響先の3画面×3シナリオに絞った別実行で9/9PASS・0FAIL（約22秒）を取得。全件回帰未完了はS5/S9へ引継ぎ。元ログは保持。
- 新カタログのAPI＋実Chromium UIテスト2/2PASS。軽量カタログ契約テストを既存CI自動発見へ追加し、一括テスト登録7/7ファイルPASS。
- Dashboard表示サーバーのみ最新ソースで起動済み。QA定期タスク停止/再開、正式台帳変更、ビルド、commit、push、Workerデプロイは実施していない。
- 次の未完了先頭ステップはS4。業務シナリオの真正なAPI/DB実行・独立照合の自律完了率はまだ全体未測定。

## 2026-11-07 S4 ローカル業務API/DB自律テスト実行記録

- **実績：6/6業務シナリオ正式レーンとは別のローカルPASS。** 6ケース合計2,538ms、人間の準備・操作0件。S4の局所的な自律完了率は6/6=100%。全業務QAの自律完了率ではない。
- 実行コード：scripts/qa-modernization/s4-business-scenarios.mjs。共通fixture：scripts/qa-modernization/local-gateway-fixture.mjs。独立証拠検証：scripts/qa-modernization/s4-evidence.mjs。
- 実際の本物の業務ゲートウェイと独立メモリSQLiteでカテゴリ順序、古い更新拒否、カテゴリ統合、古い統合拒否、売切、異店舗認証拒否を実行。SQL before/after・他店舗不変・復旧後readback・Gateway閉鎖をケース別に証拠化した。
- 証拠：test-results/qa-modernization/s4/local-api-2026-11-07T14-32-51-834Z-p19548-n1/summary.json、同フォルダの6ケース別JSON。各ケース別証拠で公式QA statusは変更していない。
- 失敗注入：本物のカテゴリDB変更直後に例外を投入し、FAILを保持して復旧、次ケースPASS。改変した偽PASS SQLを独立Verifierが拒否。専用テスト3/3PASS。
- 既存テスト test/common_tenant_real_business_e2e_test.mjs を再実行し、注文・オンライン現金会計・重複防止・CloudPRNTキュー・RevenueCat通知の **40チェックPASS**。既存40チェックを新S4の6件に混算しない。
- npm testの自動発見にS4が登録済み。既存CI自動発見9/9ファイル実行PASS、ダッシュボードAPI＋実Chromium検査3/3PASS。全218パイプラインコマンドの完走を意味しない。
- ダッシュボード：S4ローカルケースをnpm test系統の別ソースとして表示。ソースSHAが変化した場合はSTALE_SOURCE（再検証待ち）とし、公式QA PASSに加算しない。
- **S4残：workerd/D1実ランタイムの隔離環境検証（本番 wrangler.toml は利用しない）、既存40チェックのケース別共通ランナー統合、他の会計・在庫業務の独立Oracle。**
- 次に進む優先順：S4隔離D1互換→S4注文・会計のケース別自律化→S5実ブラウザE2E。実環境で証明できない領域は未検証のまま保持。

## 2026-11-07 S4実装と実行の継続記録（12シナリオ×2実行レーン）

- **最新：SQLite12/12 PASS、実Cloudflare workerdローカルD1/R2 12/12 PASS、両レーンFAIL0／BLOCKED0。** これは同じ12シナリオを別ランタイムで実行した延べ24行であり、正式QAの新規PASSではない。
- SQLite 12ケース・5,961ms：test-results/qa-modernization/s4/local-api-2026-11-07T15-27-10-635Z-p19516-n1/summary.json。
- workerd/D1 12ケース・83,947ms：test-results/qa-modernization/s4/local-d1-2026-11-07T15-24-13-029Z-p18696-n1/summary.json。どちらもケース別12証拠の独立SQL/cleanup/テナント隔離のVerifier検査を通過。
- S4-ORDER-QR-007〜S4-CASH-FOREIGN-ADMIN-012を追加：QR注文、再送重複防止、他店舗の表トークン拒否、現金会計、二重請求防止、別店舗管理者の会計拒否。領収書の合計100/消費税0/サービス料0、注文・レシート・支払方法・紐付けをSQLで再照合。
- 環境：テスト専用Miniflare/workerdの独立2店舗D1＋Control D1＋2つのR2のみ。全マイグレーション739文を適用。workerd側のテスト専用SQLプロビジョニングAPIを実装し、本番Worker/DBは一切変更しない。
- 根本原因と対策：Miniflare v5 Node D1 proxyのハングはworkerd内SQLの別方式で解消、マイグレーション複合文はtrigger-aware splitterで解消。QR注文の子テーブルcleanup制約は対象表拡張で解消。会計のno_targetは既存GAS互換のフラット引数に一致させて解消。D1 meta.changesとSQLiteの差は独立DB再読込へ変更。
- シナリオ用共通ランナー1本を二レーンで使い、ケース別に準備・Gateway・業務Oracle・独立SQL・cleanup・証拠まで自律完走。ローカル用の破壊的なテスト店舗以外には接続せず、正式Android/iOS QA台帳を未変更。
- npm testの自動発見対象に隔離workerd/D1現金会計の代表実行テストを追加。CIにおけるPASSはこの実行分だけ、220件前後の全npm実行ステップの完走とは区別する。
- ダッシュボード：SQLite 12 PASSとworkerd/D1 12 PASSを別KPI・別ソースで表示。現行ソースが変化した証拠はSTALE_SOURCEへ降格。正式QA PASS395とは無関係。
- S4の全体完了はまだ認めない。AI・在庫・仕入・売上・設定・従業員などの主要業務拡充が残る。次は機能別に既存npmテストを棚卸しし、Oracleと証拠が未整備の業務領域から追加。S5画面操作E2E、S6通信復旧を並行して進める。

## 2026-11-07 S4最新実行：21ケース×2独立ランタイム

- **最新結果：独立した21業務シナリオを2レーンで実行。SQLite21 PASS/0FAIL/0BLOCKED、実Cloudflare workerdローカルD1/R2 21 PASS/0FAIL/0BLOCKED。** 延べ42行は21ケース×2環境であり、正式QA新規PASSは0。
- SQLite21/21PASS・10,255ms。ケース別before/after・DB復元・独立Oracleと集計の原証拠：test-results/qa-modernization/s4/local-api-2026-11-07T15-52-45-530Z-p14396-n1/summary.json。
- 隔離workerd/D1/R2 21/21PASS・168,417ms。ケース別SQL/cleanup検証と集計の原証拠：test-results/qa-modernization/s4/local-d1-2026-11-07T15-54-08-993Z-p25768-n1/summary.json。
- 新規9ケース：在庫保存・入荷と重複防止・廃棄下限と重複防止、仕入先の冪等保存、仕入発注の二重登録防止、領収書と日次/月次売上集計の一致、Pro月次AIポイント10の1回だけ付与、AI利用不可時のクレジット非消費、在庫画面権限拒否後のAPI不許可。各ケースで2店舗の独立DB保護と復旧をSQL再照合した。
- 途中失敗：初回拡張SQLiteは20 PASS/1FAIL（GAS互換RPCでは権限エラーをHTTP200と本文ok:false/errorで返すのにHTTP403を期待した）。API契約に合わせて修正し、両ランタイム全21/21PASS。
- 偽造したAIウォレット購入残高を独立Verifierが拒否したが、テスト側の例外文言正規表現で1回FAIL。例外クラスを照合するテストへ修正し対象テストPASS。実在庫を変更した後の故障注入でDB cleanup→次ケース継続PASSも追加。
- npm自動発見の9ファイルすべて実行成功。S4の自動発見テストは9テストPASS/0FAIL。これは全npmパイプラインの全コマンドの完走ではない。
- **S4は部分完了を維持。** AI画像の実成功・ポイント実消費/RevenueCat購入、税・サービス料・割引、在庫レシピ/発注メール、詳細な権限パターン、画面操作・ネットワーク/端末固有機能は未検証。後続S5-S9の正式ステップ認定はまだ行わない。

## 2026-11-07 「RPMではなくnpm test」訂正・再検証

- QA一覧の最上位分類を NPM_TEST（パイプライン・内包自動発見）と BUSINESS_QA（公式OSケース）に修正。負荷・性能は group の下位属性として残し、npmと混同しない。
- その時点での実測：npm testパイプライン217コマンド、自動発見8ファイル（パイプライン内の1ステップで実行）、業務QA831固有ケース／Android829＋iOS830＝1,659 OS別行。表示は1,884行。登録済みの全件実行成功は未確認。
- ダッシュボードのnpm/業務QA選択、実ブラウザ絞り込み、API、CSV、旧正式台帳不変のテストを実行。qa-dashboard/test-catalog-live.test.mjs と test/auto-ci/qa-modernization-test-catalog.test.mjs で3/3 PASS。
- 更新原本は引き続き本ファイル。ChatGPTライブラリ控え /izakanpai/QA_MODERNIZATION_PROGRESS.md へも同期する。正式QAの新規PASS、ビルド、commit/push、Workerデプロイは行わない。

## 2026-11-08 QA・自動テストダッシュボードの再編

- ゼロベースの表示監査に基づき、18765正面画面を「正式QA」「S4現行ソース証拠」「npm/S5/CIの取得状態」「優先対応」に再構成。旧15工程やWindowsタスク制御、ケース一覧は折り畳み詳細で維持。障害台帳も維持。
- 最新ライブ集計（現行API取得値）：正式PASS395/適用1,659、FAIL62、BLOCKED7、NOT_RUN1,185、SKIP10。現行S4カタログPASS0、FAIL26、STALE_SOURCE21。以前のS4 47/47PASSは実行時点の履歴であり、現在の有効PASSに換算しない。
- 新規集計単体3/3PASS、実Chromiumライブ表示1/1PASS、既存カタログ/障害連携含む12/12PASS。正規Windowsタスクからサーバーを再起動し、品質JSと公式API HTTP200を確認。公式QA新規PASS0。
- 実S5証拠とGitHub Actions最新結果のソース一致付きライブ集約は未連携。失効や未取得をPASS表示しない。詳細・残件：`docs/QA_DASHBOARD_REDESIGN_20261108.md`。
- 既存runner/台帳/端末/QAスケジュールは変更せず、commit/push/Workerデプロイ/モバイルビルド未実施。ChatGPTライブラリ控えへの同期は未実施。
