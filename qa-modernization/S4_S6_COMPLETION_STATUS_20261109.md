# S4〜S6 完了条件と実証状況（2026-11-09 PHT）

## 2026-11-10 PHT｜S6自動化工程100%、実機固有の復旧はS7へ（現行判定）

**S6自動化工程：100% COMPLETE**。実Chromiumの登録済み障害復旧業務6/6と、共通障害回帰31/31が現行ソースで独立PASSになった。正式Android/iOS実機QAと性能SLOの認定は別。

| 完了条件 | 実証結果 |
| --- | --- |
| 会計障害・競合 | オフライン拒否、確定前切断、確定後ACK喪失・状態読戻し、実Chromiumの2タブ同時会計、Abort後の領収書照合。独立SQL・PNG SHA・他店舗不変とcleanupを確認。**3/3 PASS** |
| 業務再起動 | 在庫・発注・AIを成功後ACK喪失→別Chromeプロセスから同一IDで復旧、二重計上・二重発注・二重課金を防止。独立SQL・PNG/cleanup。**3/3 PASS** |
| 共通障害・診断・時間境界の回帰 | 既存5ファイル＋30秒書込時計テスト1ファイルの計31テスト。会計再送/コミッション/在庫/永続ID・診断自動追従。本番Native/Hosted/TESTの30,000ms設定・書込自動再送禁止。実行TAPと27依存ソースSHAの独立検証。**31/31 PASS、FAIL0、STALE0** |

証拠は test-results/qa-modernization/s6-regression/latest.json と、既存 test-catalog の LOCAL_CHROMIUM_SCENARIO・S6個別6件。独立確認コマンド：node scripts/qa-modernization/s6-resilience-regression-evidence.mjs --verify。ダッシュボードは**6/6と31/31の双方が現行ソースで有効PASSのときだけS6自動化100%**と表示し、FAIL/STALEで自動的に取り消す。回帰31件を6業務ケースや正式端末PASSへ重複計上しない。

**S7実機QAへ移管**：NETWORK-01（iOS WKWebView/Android WebViewで実回線切替、実30秒応答超過、復帰後の会計と再送防止）、NETWORK-02（2実機の同時会計、Native復帰・BLE競合）。既存LAYOUT/FEEL/UX/PRINTも活用する。2項目登録だけで本人PASSは自動付与しない。実Cloudflareの並列書込p95/p99・正式負荷SLOは**未合意・未測定**。旧記録の逐次読み取り15/15・p95 658msを会計性能PASSに代用しない。今回はcommit/push/deployなし。後述の旧「S6未達」は方針変更前の履歴。

## 2026-11-09 19時台PHT｜S5自動化工程100%、実機QAはS7へ移管（現行の判定）

**S5自動化工程：100% COMPLETE**。今回の自動化完了範囲は、現行の実Chromium業務シナリオ10件と、既存の横断動的UI監査27テスト。正式iOS/Android実機QAとは別。

| 完了条件 | 検証結果 |
| --- | --- |
| S5実Chromium業務 | **10/10 PASS、FAIL0、STALE0**。過去9件に会計後支払訂正を1件追加し、並行更新で失効した7件のみ既存共通ランナーで再検証。実DOM/Gateway/独立SQL/PNG SHA/他店舗不変/cleanupを確認 |
| 支払方法訂正の業務連続操作（10件の内数） | 現金300→GCashへ訂正、必須理由、日英/店舗設定の表示名、訂正履歴、SQL台帳・監査各1件、同一ID再送重複0、コミッション15不変、返金はGCashのマイナス伝票、純売上0、3PNG/cleanup |
| 横断動的UI監査 | **27/27 PASS**。143画面を自動検出。960金額フィールドを27画面で実Chromium測定、月入力・長文省略・日英/通貨・報酬金額の位置揃えも検証。458個の動的金額呼出はソース検出のみで、実画面測定には混算しない |
| 並行更新による証拠失効への対応 | 全件実行中に監査ログ画面の3配布面が更新されたため、古いソースハッシュの証拠をSTALE判定。新旧SHAを比較し、影響する既存テストだけ12/12 PASSで復旧。**この12件は補助証拠で、27件へ加算しない** |

正本：S5実Chromiumの影響復旧は test-results/qa-modernization/affected-chromium-2026-11-09T11-08-26-531Z-p24888/result.json、動的監査は test-results/qa-modernization/s5-ui-audit/latest.json。後者は実TAP・変更前後のソースSHA・差分再検証の独立証拠を確認する。ダッシュボードのS5完了表示は両方が現行ソースで有効PASSのときだけ100%で、変更や新規未実行ケースにより自動的に未完了へ戻る。

**限界とS7への引継ぎ**：143画面すべての業務操作をE2E実行したという意味ではない。実機のUI体感・ちらつき・ネイティブ表示・BLEプリンタは既存S7のLAYOUT/FEEL/UX/PRINTで本人が確認する。メール/AI/RevenueCatの自動化可能な実連携はS4の証拠を再利用し、S5で重複配送・再購入を要求しない。実機PASSを捏造しない。本作業でcommit/push/deployなし。以下の「S5未達」はこの方針より前の履歴。

## 2026-11-09｜ユーザー承認：S4自動化工程は100%完了、実機固有の受入はS7へ移管（現行の判定）

**S4（業務API・DB・自動化可能な外部連携）の完了判定：100% / COMPLETE。** この判定は利用者が明示した責任分界に基づく。自動化できる部分を実行・独立証拠まで残し、実際のメール受信箱の目視やApple StoreKitの実機Sandbox購入・復元をS4完了の必須条件としない。これらはS7本人実機QAへ引き継ぐ。

| S4自動化完了条件 | 実行・証拠 | 判定 |
| --- | --- | --- |
| 登録済み業務API・SQLite・cleanup | 現行ソース49/49、独立SQL Oracle、cleanup | **PASS** |
| 隔離workerd/D1の同じ業務49ケース | 現行ソース49/49、独立照合、データ復元、失効0 | **PASS** |
| 実Cloudflare外部AI画像生成 | Workers AI→R2→D1ポイント精算、同一ID再送、同意拒否、QAデータcleanup。独立13/13チェックPASS | **PASS（実行済みの外部連携証拠）** |
| 業務メールの自動化可能部分 | 実業務API送信、プロバイダー受付、D1 Outbox送信記録、同一ID重複防止、cleanupの独立8/8 | **PASS（送信処理）** |
| RevenueCatの自動化可能部分 | Control↔店舗D1イベント27/27一致、AIポイント商品・Offering実API 3/3、関連認証/Webhook回帰70/70 | **PASS（通知・契約・設定）** |

**S7本人実機QAへの引継ぎ（S4の未完了には含めない）**：

- `EMAIL-01`：Gmail等の受信箱で業務メールが見えるか。ユーザーは追加スクリーンショット・受信証拠を提出する必要はない。任意の目視確認。
- `BILLING-01`：iOS TestFlight/Apple SandboxのPro購読・復元・キャンセル操作。実機固有の購入者操作とStoreKitの挙動を本人が確認する。既存の適用済みD1/Webhookイベントを実Appleレシートの真正性と混同しない。

`scripts/qa-user-device-qa.mjs` の既存S7チェック定義に登録済み。**S7への項目登録とS7の本人PASS判定は別**（自動でPASSを付けない）。正式Android/iOS QA台帳・リリース承認・本番配布もS4完了とは別条件。今後ソース変更で49ケースの証拠が失効した場合、ダッシュボードのS4自動化完了表示も自動で未完了へ戻る。

この節が現行の完了基準であり、以下の「実受信・実Apple購入がないためS4未達」などの以前の記述は**条件変更前の履歴**として保存する。実施していないメール受信や購入をPASSに変更したものではない。

## 2026-11-09 18時台PHT｜現行ソースのS4〜S6全登録ケース復旧（最新）

- **現行独立証拠カタログ：S4 SQLite 49/49 PASS、隔離workerd/D1 49/49 PASS、S5 Chromium 9/9 PASS、S6 Chromium 6/6 PASS。全レーンでFAIL 0、STALE_SOURCE 0。** 最終結果は固定ログでなく、既存 `scripts/qa-modernization/test-catalog.mjs` の現在のSHA照合結果を正本とする。
- S4 SQLite実行証拠 `test-results/qa-modernization/s4/local-api-2026-11-09T09-48-54-836Z-p9340-n1/summary.json`。隔離workerd/D1は16件×3分割と既存1件の計49件。証拠 `local-d1-2026-11-09T09-48-23-233Z-p6816-n1`、`local-d1-2026-11-09T09-48-23-246Z-p6816-n2`、`local-d1-2026-11-09T09-51-40-103Z-p6816-n3`。3バッチ目の `S4-REFUND-JPY-TAX-040` は業務検証に成功したが、並列Miniflareでの**後片付け中にfetch failed**で一次FAIL。並列を廃し、該当1件を既存runnerで**単独再実行**し、SQL cleanup含む独立検証1/1 PASS `local-d1-2026-11-09T09-56-40-496Z-p8832-n1/summary.json`。元のFAIL証拠は削除しない。既存テスト共通実装を使うため、業務処理専用の例外分岐を増やしていない。
- S5復旧 `test-results/qa-modernization/affected-chromium-2026-11-09T09-57-28-534Z-p23272/result.json`（9/9）、S6復旧 `test-results/qa-modernization/affected-chromium-2026-11-09T09-58-44-232Z-p25564/result.json`（6/6）。S5カテゴリ画面の以前のFAILは、新設の共通お知らせ取得RPCとQA共通D1アダプターの`prepare().all()`非対応で発生。**S2共通アダプターのみ**Cloudflare D1のbind無しprepareに対応し、Control内のお知らせ表を最小追加して横断解消。実カテゴリ画面・QA共通契約を再検証しPASS。
- QA共通アダプター、実Control↔物理店舗D1 27/27、RevenueCat実APIのApple AIクレジット商品3/3、業務メールプロバイダー+D1判定の負例回帰を合わせた**重点自動回帰13/13 PASS**。QA判定を源泉とする実行結果であり、ソース検査だけのPASSではない。
- RevenueCat実購入者のプロバイダー照合に関して、`teat` の物理D1で1店舗1オーナー制約を確認。最初の一時Owner経路は**2人目の追加で拒否**されたが、fixture削除・D1件数復元は確認済み。以後 `s4-revenuecat-subscriber-live.mjs` は**既存オーナーの認証済みセッション専用の読み取り方式**へ変更し、追加Owner・既存パスワード変更・DB書込はしない。現行環境には本人の承認済みOwnerセッションがなく、独立RevenueCat加入者レコード照合は**未実施**。
- **S4工程全体100%は未認定**。業務API→送信プロバイダー→Gmail受信箱に入った「業務メールの実受信」と、RevenueCat購読者情報/実Apple StoreKitレシート・購読復元/返金の独立証拠が欠けている。Gmail直送スクリーンショット、AIポイント商品カタログ、Control↔D1イベントは別の証拠であり代用しない。今回のソース変更に対するcommit/push/deployなし、正式iOS/Android実機QAの加算0。

## 2026-11-09｜RevenueCat実APIの商品・Offering登録をGitHub Actionsから照合（最新）

- **AIポイント商品3/3と`ai_credits` Offering：実RevenueCat REST v2でPASS**。既存の読み取り専用GitHub Actions `.github/workflows/revenuecat-ai-credit-offering.yml`（`apply=false`）を実行。成功run `42577839786`、HEAD `9ed734d1227ef4f0de72750253be3ad6c356ed41`。iOSの `izakanpai.ai.credits.30/100/300` は商品登録済み、Offeringへの3パッケージ紐付け確認。Node.jsの再判定ゲート `scripts/qa-modernization/s4-revenuecat-offering-proof.mjs` で**5/5証拠契約PASS**、負例含むテスト2/2 PASS。証拠 `test-results/qa-modernization/s4/revenuecat-provider-offering-readonly-20261109.json`。GitHubに保持された認証キーは読み出さず、実APIの読み取り以外の操作は0。
- これは**AIポイント商品カタログ**の実Provider PASSであり、Pro月額・年額のOffering検証、Apple StoreKit実購入、RevenueCat実Subscriberの購入レシート・復元照合ではない。S4工程100%は依然未認定。Apple SDK公開キーと独立Pro Provider照合用の実行環境が現在のWindowsワークスペースにない（GitHub Actionsのread-only既存業務だけを使用）。

## 2026-11-09｜RevenueCat本番Controlと物理QA店舗D1の独立照合（最新）

- **Cloudflare実Control→店舗D1のSANDBOX通知台帳：27/27一致**。既存の本番Control D1 `izakanpai-control` と、QA店舗 `izakanpai-teat`（6件）・`izakanpai-yuwakubar`（21件）を固定SELECTのみで独立取得し、イベントIDのSHA256・種類・環境・日時・対象店舗・`applied` を照合。マッチ27/27、不一致0、欠落0、重複0、他店舗0、許可外商品ID0。購入イベント3件。独立テスト4/4 PASS。証拠 `test-results/qa-modernization/s4/revenuecat-cross-d1-readonly-20261109.json`、実行器 `scripts/qa-modernization/s4-revenuecat-cross-d1-audit.mjs`。書込0、イベントID・顧客情報は証拠へ保存せず。
- **StoreKit実購入の真正性は依然未検証**。Control→Tenantが適用済みでありApple用商品IDに一致する事実は、実Appleレシートの出自やRevenueCatプロバイダーの購読情報と同じではない。現行ローカル環境にRevenueCat REST v2シークレット/Apple検証資格情報は無く、独立SandboxログインGatewayも意図的に無効。従来の正常なTestFlight向け `qa-billing-testflight-preflight.mjs signed-test` はソース検査でPASSしたが、iOS実端末の新規決済は実行していない。**工程S4 100%の未完了条件として保持**。

## 2026-11-09｜Gmail受信画面のユーザー提出証拠を照合（最新）

- **Cloudflare直接SMTP→Gmail受信トレイ：PASS（ユーザー提出実画面）**。ユーザーが送信したGmailスクリーンショット `IMG_2591.png` では、件名 `[izakanpai][TEST] Verified Gmail SMTP delivery check`、送信元 `noreply@alerts.izakanpai.com`、宛先 `izakanpai.system@gmail.com`、2026-11-09 14:15 PHT、受信トレイ、TLS表示、本文のUTC `2026-11-09T06:15:49.434Z` を確認。直送テスト `probe-fatal-email-direct-delivery.mjs` の本文時刻と一致。添付画像のSHA256 `2db6145023d0ff5e72b1f43a8fb63a74a6c8c87f05c4d11f1668c71d5dbd72f0`（614,311 bytes）、出典と判定は `test-results/qa-modernization/s4-email/approved-gmail-receipt-20261109.json` に記録。Gmail接続APIによる独立受信確認ではなく、**画面による利用者提出の到達証拠**。
- **Izakanpai実業務APIの受信画面は依然未確認**。別のQA店舗 `yuwaku` の `sendTestReport` はプロバイダー受理・D1 Outbox・同ID再送・後片付けを独立8/8 PASS（run `s4mail-mw8vomu5-bba0591e0436`）として実証済み。しかし提出画像は**直接SMTPテストの同件名スレッド**であり、`sendTestReport` のテストレポート件名は写っていない。業務API→Gmail実受信は `NOT_VERIFIED` とし、S4工程全体も100%とは認定しない。

## 2026-11-09｜承認済みGmail宛のS4実メールAPI/D1実証（最も新しい追記）

- **送信先の承認条件は解消**：オペレーターがS4テスト宛先として `izakanpai.system@gmail.com` を明示承認。テスト専用SMTPではない運営Gmailを勝手に使わないという以前の制約を、この宛先・今回のS4検証に限って更新した。送信先は既存プローブ内で固定。Gmail受信箱の読み取りコネクターは接続されていないため、受信証拠までは未完了。
- **Cloudflare送信基盤の直送テストを実施**：既存固定宛先 `scripts/release/probe-fatal-email-direct-delivery.mjs --execute-production` を1回実行。HTTP200、provider accepted、queued=true、bounced=false、suppressed=false、message_idあり。これは**送信キュー入り**の確認であり、Gmail受信の証明ではない。後続のCloudflare Email Sending診断はまだ旧・他宛先の配送記録しか確認できず、今回の到達PASSには転用しない。
- **Izakanpai実業務API→物理D1→送信プロバイダー→再送冪等性はPASS**：最初の `teat` はRevenueCat期限切れによる実効Freeのため、送信前のPro機能ガードで拒否（外部送信0、QA fixture cleanup PASS）。実効Legacyで該当機能が使える既存QA店舗 `yuwaku` に切り替え、`scripts/qa-modernization/s4-email-live-qa.mjs --authorized-ops-gmail` でQA一時管理者→`reportEnabled=off`／承認宛先を短期設定→実 `sendTestReport` RPC→D1 `outbound_email_outbox` の `sent` 読戻し→同じリクエストID再送 `duplicate:true`／outbox不変→元のメール宛先・スケジュール・管理者・セッション・台帳のcleanupを完了。API HTTP200、provider accepted、IDあり、報告run `s4mail-mw8vomu5-bba0591e0436`。実行証拠 `test-results/qa-modernization/s4-email/s4mail-mw8vomu5-bba0591e0436/evidence.json`。
- **独立検証 8/8 PASS**：別プロセス `s4-email-live-verify.mjs` で現行ソースSHA、送信受理、実送信台帳、宛先一致、二重送信防止、復旧後の独立Cloudflare物理D1件数とスケジュール復元を読み戻し。結果 `test-results/qa-modernization/s4-email/s4mail-mw8vomu5-bba0591e0436/independent-verification.json`。関連安全回帰14/14 PASS。**Gmail実受信は未確認**なので工程S4全体100%は未達。正式Android/iOS実機QA加算0、commit/push/deployなし。

## 2026-11-09｜S4外部連携の追加実証（本節が以前の記録より新しい）

| S4残件 | 最新の実判定 | 根拠と残件 |
| --- | --- | --- |
| 実AI画像生成→保存→ポイント精算→再送→cleanup | **実外部AI成功 PASS（1ケース）** | `scripts/qa-modernization/s4-ai-live-external-probe.mjs`。QA店舗 `teat`、Cloudflare Workers AI FLUX.1 schnell 200／5,512ms、実R2 JPEG 318,573バイト、SHA256独立検証、D1月次ポイント1→0・台帳1件、同一IDの再送は追加課金0、同意なし要求は拒否／0課金。R2・D1・セッション・QA従業員・クレジット操作のcleanupを独立readback。`test-results/qa-modernization/s4-ai-live/s4ai-mw8ss7u1-523bc3c7c1d8/evidence.json`。**実AIプロバイダー障害からの返金は未実証**（ローカル故障注入は別） |
| 実RevenueCat Sandbox購入→署名Webhook→物理D1→復元・返金 | **未完了** | `node scripts/qa-revenuecat-readiness.mjs --sandbox --sandbox-db` でSandbox秘密情報の**キー名**と実Cloudflare Control/Tenant D1のテーブル・過去イベント件数を確認。過去の `qa-monthly` 2購入・1返金は現在設定済みApp Store商品IDと一致せず、**真のApp Store購入証拠に採用しない**。現在のSandboxログインGatewayは意図的に無効で、Apple/Google実購入アカウントと購入通知署名チェーンも未検証。`test-results/qa-modernization/s4/revenuecat-sandbox-readonly-20261109.json`、書込0。Sandboxの独立SQLite/認証/暗号化Webhook/契約ガード回帰は **70/70 PASS** |
| 本物のメール配送・受信・送信台帳／再送・失敗 | **送信/API/D1/冪等性 PASS、受信のみ未確認** | 上部最新追記の通り、承認済みGmailに実送信。QA `yuwaku` で `sendTestReport`、Outbox送信記録・同一ID再送 `duplicate:true`・完全cleanupを独立8/8照合。Gmailの受信箱に接続できないため**到達PASSは未認定**。Cloudflare直送キュー登録も実証済み。 |

RevenueCatテストで、隔離Sandbox用iOSアプリが本人確認前に通常のAIクレジット残高RPCを余分に呼んでいたことを検出。`mobile-app/web/billing-native.js` にSandbox明示オプトイン時の先行RPC禁止を実装し、従来の正常なiOS/Android通信は維持。古い契約テスト4FAIL→修正後 **70/70 PASS**。これは購入テストの安全な準備であり、**実購入を実施したという意味ではない**。

並行Gitソース変更により一時失効していたS4隔離workerd/D1登録49ケースは、現行ソースで既存共通ランナーを**1回**再実行し、`verifyS4Summary` の独立検証 **49/49 PASS** を確認。証拠 `test-results/qa-modernization/s4/local-d1-2026-11-09T05-14-19-023Z-p25436-n1/summary.json`。SQLite49/49有効PASS。ダッシュボード `http://127.0.0.1:18765/` の現行S4行をAPI・静的アセットの読み戻しで確認。登録ケース100%と外部連携受入の未達は別判定。

## 2026-11-09追加実証（本節が下の初期スナップショットより新しい）

- **S5-REFUND-007（既存ケースの拡張）**：会計→会計伝票の従業員割当→OR番号・会計300.00・コミッション15.00表示→全額返金→-15の逆仕訳まで同一ブラウザーで実行。小計300×5%の独立SQLと他店舗不変、3枚PNG、全テーブルcleanupを確認。注文時の担当者選択は新規S5-STAFF-ORDER-009で別途実証。
- **更新後S5：9/9有効PASS**。`S5-STAFF-ORDER-009` を追加し、同一Chromiumセッションでスタッフ注文画面のコミッションON→日本語へ切替→対象者未選択の日本語エラー→モーダル終了後英語へ切替→対象者選択・120の注文→管理画面で提供済→現金会計120→コミッション画面で会計担当割当→OR別報酬詳細まで実行。商品追加手当20と会計小計5%の6を別勘定でSQL照合し、OR詳細で合計26を確認。メニューマスタ重複0、他店舗不変、5 PNG（日本語エラー画面を含む）、全テーブルcleanupを実証。別途S5-REFUND-007では会計→担当割当→報酬詳細→全額返金の逆仕訳を証明済み。
- **更新後S6：6/6有効PASS**（下記の短縮時計ケースを含む）。独立証拠の集約には従来のPNG/SHA/cleanupに加え、今回のコミッション画面・注文・会計・詳細・返金の業務経由と短縮時計の読戻し根拠を検証する負例オラクルを追加。偽の工程証拠でPASSを付けない。
- **S4 RevenueCat実Sandboxの準備確認のみ前進**。既存 `node scripts/qa-revenuecat-readiness.mjs --sandbox` を読取専用で実行し、両Sandbox Workerの必要シークレット**名称の存在**とSDK/ルートの静的構成を確認。`sandboxRemoteSecretNamesReady=true`、`endToEndPurchaseVerified=false`。Apple/Google Offering・購入アカウント、Sandbox Owner認証API、実購入→署名Webhook→物理D1の往復証拠が不足。秘密情報の値・実取引の成否は確認していない。
- **S6 実Cloudflareの読み取り基準計測を追加**：既存 `scripts/qa-modernization/izk-ut145-live-probe.mjs --authorized-yuwakubar` 内の許可済みQAセッションで `getCommissionFeatures` を認証付きで15回実施。成功**15/15**、p50 **576ms**、p95 **658ms**、最大**658ms**、失敗0、30秒超0。通常/コミッション注文・同一ID再送も実Gateway＋物理D1でPASS。試験用テーブル・商品・従業員・注文・診断データは残存0の独立検証済み。`test-results/izk-ut-145/qa145-mw8r4z00-30c75c/live-probe.json`。**1店舗・逐次15リクエストの読み取り実測のみ**であり、会計のp95、負荷SLO、WKWebViewの30秒障害を検証したものではない。
- **S6 実Chromium 6/6有効PASS**。新規S6-CHECKOUT-ABORT-006は書込時計350ms・サーバー確定後ACK保留950msの短縮時計で実ブラウザーAbortControllerと領収書再照合を検証。会計重複0、独立SQL・2枚PNG・cleanupを確認。**実Cloudflare30秒/WKWebView実機の計測ではない**ため、下記S6の実環境条件は未完了。
- 登録済みケースのPASSと工程100%は区別。外部メールの実配送、実RevenueCat Sandbox・AI生成、注文入力時のコミッション担当者選択、実クラウド性能は未達のまま。

## 判定ルール

- **登録済みケースのPASS率100%は工程完了率100%と同義ではない。** 未登録の主要業務・外部プロバイダー・性能条件を恣意的に除外しない。
- 現行ソースに対して有効な独立証拠のみPASS。変更で証拠が失効したら過去PASSを使わない。今後の履歴はこのファイルの固定スナップショットでなく、`GET /api/test-catalog` の最新結果を正とする。
- 旧OS別正式実機QA・利用者による画面の操作感・Store承認はS7/S8/S9の別工程。S4〜S6のPASSとして付け替えない。
- コミット/PR時の実行対象は既存の変更影響セレクターのまま。広範囲の再検証は今回の明示的な工程検証・必要な証拠更新に限定。

## S4：業務API・DB

| 完了条件 | 判定 | 実証・未完了 |
| --- | --- | --- |
| 現行49件・実業務APIと独立SQL/cleanup（SQLite） | **PASS 49/49** | `GET /api/test-catalog` の `LOCAL_BUSINESS_SCENARIO`、各ケース証拠SHA |
| 同じ49件・隔離workerd/D1 | **PASS 49/49** | `LOCAL_WORKERD_D1_SCENARIO`、独立検証付きの再実行48件 `test-results/qa-modernization/s4/local-d1-2026-11-09T03-13-51-424Z-p2696-n1/summary.json` と044単独PASS |
| 実Cloudflare物理D1の所有者・マイグレーション・トリガー・列契約 | **PASS 2/2** | `teat`、`yuwaku` を既存の読み取り専用ゲートで確認。両方0065、欠落0。記録 `test-results/qa-modernization/s4/remote-schema-readonly-20261109.json`（書込0） |
| 実Cloudflare APIとD1の注文冪等性・コミッション・店舗別削除 | **PASS 1業務フロー** | ユーザー許可済み `yuwakubar` QA fixture。通常/コミッション注文・同一ID再送、独立D1読取、全fixture残存0。`test-results/izk-ut-145/qa145-mw8p5swu-bdd104/live-probe.json` |
| 本物のメール配送サービスに関する送信→受信/失敗→台帳照合 | **未完了** | S5発注メールエラーとオーナーメール変更のローカル/HTTP隔離回帰はPASS。ただし実プロバイダー配送はしていない |
| 実RevenueCat Sandbox通知→物理D1→購入/復元/返金の一貫性 | **未完了** | SQLiteの隔離サンドボックス11件程度の各回帰はPASS。実サンドボックス通知・クラウド上の購入契約とは別 |
| 実AI画像プロバイダーの生成成功・ポイント精算/失敗 | **未完了** | 隔離AIポイント/失敗UIの検証はPASS。プロバイダー外部生成成功は未確認 |

## S5：業務画面E2E

| 完了条件 | 判定 | 実証・未完了 |
| --- | --- | --- |
| 登録済み実Chromium業務操作・API/SQL/PNG独立証拠 | **PASS 9/9** | 上部の更新を正本とする。通常の業務8件にスタッフの注文→提供済→会計→コミッション詳細を追加。各ケースのソースSHA・PNG・cleanupを個別照合 |
| オーナーメールの本番ページでJA/EN・無効リンク・重複・502参照ID・通信失敗・二重送信防止 | **PASS 1/1** | 新規 `S5-OWNER-EMAIL-008`。実Chrome・5 PNG SHA。HTTP APIは隔離応答であり、実メール配送や実DB操作は**行っていない** |
| コミッション対象者の注文時選択→提供済→会計→担当割当→従業員詳細の画面E2E | **PASS 1/1（S5-STAFF-ORDER-009）** | 同一実Chrome、実共通Gateway/SQLite、担当者必須、注文120、報酬20+6=26、OR別詳細、4 PNG、全表cleanup。S5-REFUND-007で返金−15も別途実証 |
| 主要全画面の横断UI業務・JA/EN・表示幅・動的切替を業務操作で保証 | **未完了** | 画面横断レイアウト自動テストは別レーン。登録8ケースだけで全画面E2E完了とは判定しない |
| 外部AI成功/メール配送など画面から実プロバイダーまで | **未完了** | 現在は隔離/エラー模擬の経路だけが確認済み |

## S6：障害・通信復旧・同時処理・性能

| 完了条件 | 判定 | 実証・未完了 |
| --- | --- | --- |
| 登録済み実Chromium復旧ケース | **PASS 6/6** | 会計断線・競合・応答後遅延によるブラウザー中断、在庫/発注/AI再起動。実Chrome + 独立PNG/DB証拠 |
| 回線応答欠落・コミッション注文/会計再送・店舗分離の関連回帰 | **PASS 28/28** | `commission-order-timeout-regression`、`checkout-response-loss-recovery`、`inventory-movement-response-loss`、`server-diagnostics-coverage` の合計。ケースによりVMまたは隔離Gateway; Chromiumの正式5ケースには加算しない |
| 発注メール操作の連続タップ・未確定保存の再試行 | **PASS 9/9** | 従来テストに共有 `pending-write-replay.js` がロードされず6件偽FAIL。**既存の共通ジャーナルをVMテストに実ロード**して 3画面×3テストPASS。業務コードは変更していない |
| 実Cloudflareの30秒境界（サーバー処理時間とWKWebView切断の分離） | **未完了** | 現在のライブQA注文数件は成功・所要時間採取済みだが、30秒切断を再現して原因分離する実証は未取得。ネイティブ固有の端末操作はS7と分担 |
| 実Cloudflareの認証付き読み取りレスポンス基準 | **PASS 15/15（性能SLO非認定）** | `yuwakubar` 逐次15件、p50 576ms・p95 658ms・最大658ms。正常応答・D1読戻し・QA fixture cleanupを照合 |
| 並列負荷・会計SLOの実クラウドp95/p99と回復条件 | **未完了** | 取得済み基準は読み取り逐次15件のみ。決済の並列負荷・p95/p99・SLO閾値の業務承認と実測が未確定 |

## 現状の工程完了判定

**S4・S5・S6すべて未達（工程100%判定不可）。** 登録済みケースのPASSはそれぞれ100%でも、上記の未完了条件には実行証拠がない。初期推定工程進捗率（S4=60%、S5=50%、S6=50%）を根拠なしに100%へ上書きしない。次は実際の外部サービスの安全なテスト環境と、S5のコミッション業務E2E、S6の30秒境界/性能条件を優先する。
