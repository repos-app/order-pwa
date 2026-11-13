# S6第二弾｜入荷・発注・AI画像生成の再起動横断E2E

2026-11-08 PHT。**ローカルSOURCE改修・実Chromium検証は完了、S6全体は部分完了。** 正式なAndroid/iOS実機テスト、本番Cloudflare、外部AI接続、配布、ストア承認の完了ではない。

## 目的と既存基盤の再利用

既存のS5では在庫のACK喪失→同じページ/モーダルでの再試行、発注保存の同一ID再送、AI画像生成の失敗時ポイント0を検証済み。S6第一弾は会計の通信断・同時処理2/2 PASS。今回の差分は**Chromiumを完全終了させ別プロセスにしても、既に実行された可能性のある書込みの同一IDを復元できること**。

S2 `createLocalGatewayFixture` の2店舗別インメモリDB・本物の認証Gateway、S4 `S4_SNAPSHOT_TABLES` と独立SQL Oracle、S5のUI操作・Chromiumネットワーク遮断/PNG証拠手法を再利用。テストごとに実際の業務RPCを先にDBコミットし、その**HTTP応答だけ503で破棄**。次に実Chromeプロセスを終了して新しいChromeプロセスで同一業務を手動再操作し、DBとAPI履歴を独立照合。

## 共通SOURCE修正

既存の`mvRequestId`／`PO_RECORD_KEY`／`_menuImagePending`はプロセス内メモリだった。既存バックエンドは同じキーの重複を拒否するが、再起動でキーが消えれば別の操作として処理し得る。修正前に実環境で重複が生じたと断定せず、**旧ソースから分かった欠落**と区別する。障害 `IZK-UT-140` として台帳登録。

`mobile-app/web/pending-write-replay.js` とWeb本番`docs/yuwaku/pending-write-replay.js`、Web TEST`docs/yuwaku/test/pending-write-replay.js` を同一SHA256で配置。これを3ドメイン×3画面（inventory, purchasing, menu_editor）に読み込ませた。ブラウザlocalStorageには**入力全体を残さずSHA256(操作署名)、リクエストID、時刻のみ**を保存。環境／storeId／従業員ID／ログインセッションをキーのソルトに含めて別スコープに分離。操作ごとの署名を分け、先の失敗操作のIDが後の別操作で消えないよう、最大64件の未確定操作を保持。7日経過後は期限切れ。保存失敗、認証不正、環境/店舗不整合、想定外機能は書込み前に拒否する。**画面起動時の自動再実行は禁止**で、再送は利用者の明示的操作のみ。

既存の正常な新しい入荷・発注・AI再生成は、確定後にIDをローテーションさせる。別セッション/店舗では旧キーを拾わない。物理端末間でlocalStorageを同期するものではない。

## 最終実測：統合5/5 PASS

コマンド：`node --test test/auto-ci/qa-modernization-s6.test.mjs`。**5/5 PASS、0 FAIL、exit 0、24,123ms**。新規3件と、別チャットで完了したS6第一弾会計2件を別物として集計した。

| Case | 元の操作・故障注入・プロセス再起動後の検証 | 確定結果・証拠 |
|---|---|---|
| S6-CHECKOUT-RECOVER-001 | オフライン拒否・確定前503・確定後ACK喪失・照合失敗と再照合・別Chrome起動後の領収書履歴 | **PASS**。PNG5枚、元領収書1件 |
| S6-CHECKOUT-RACE-002 | 2画面同時会計・後続のnothing_to_billから既存領収書を読取専用で復元 | **PASS**。PNG2枚、二重会計0。先行の修正内容 `S6_NETWORK_RESILIENCE_20261108.md` |
| S6-INV-RESTART-003 | 在庫4、入荷3をGatewayで実際にDB確定させACK503、Chromeを終了して再起動、元の署名/IDで手動再入荷。別の新規入荷も操作 | **PASS**。4→7→7→10、DB移動履歴3行（初期1＋入荷2）。同一IDで移動二重作成0、別入荷は別ID。PNG2枚 |
| S6-PO-RESTART-004 | 発注保存の実DBコミット後にACK503→別Chromeプロセス→同じ仕入先/品目/数量/備考で再保存→明示的に「新しい発注」を作成 | **PASS**。1→1→2件、保存済みPOのclient_request_id維持、発注メール自動送信0。PNG2枚 |
| S6-AI-RESTART-005 | **隔離したAI成功応答・予算承認・画像ストレージスタブ**を本物のAI課金RPCへ渡し、画像生成成功直後のACK503→Chrome再起動→同一IDで既保存画像を復元→操作者による新規再生成 | **PASS**。残高10→9→9（再送二重課金なし）→8（別の生成1回）。画像保存の呼出1→1→2回。PNG3枚 |

個別証拠（いずれもローカルの隔離テスト結果）：

- `test-results/qa-modernization/s6/S6-INV-RESTART-003-2026-11-08T03-58-31-519Z-p25620/result.json`
- `test-results/qa-modernization/s6/S6-PO-RESTART-004-2026-11-08T03-58-36-369Z-p25620/result.json`
- `test-results/qa-modernization/s6/S6-AI-RESTART-005-2026-11-08T03-58-40-822Z-p25620/result.json`
- 会計2件：`S6-CHECKOUT-RECOVER-001-2026-11-08T03-58-23-022Z-p25620/result.json`、`S6-CHECKOUT-RACE-002-2026-11-08T03-58-28-763Z-p25620/result.json`（いずれも上記S6証拠フォルダ）。

### 独立証拠監査

5ファイルの `result.json` をランナーとは別プロセスで読み、**5/5 verdict PASS、PNG14/14枚SHA256一致**。出所不明の外部HTTP呼出0、予期せぬJS/Gatewayエラー0。別店舗は`after[other]===before[other]`、全店舗のSQL表を`cleanup===baseline`へ戻した。現物SQLの在庫数/AI残高を意図的に破壊した負例では独立Oracleが異常を検出し値を元に戻した。

## 既存回帰・CIポリシー（いずれもS6新規件数に足さない）

| テスト | 実測 |
|---|---|
| `node --test test/auto-ci/qa-modernization-s5.test.mjs` | **7/7 PASS、39,695ms**（今回のUI変更後に実行） |
| `node --test test/auto-ci/pending-write-replay.test.mjs test/auto-ci/inventory-movement-response-loss.test.mjs test/auto-ci/ai-credit-wallet-display.test.mjs test/ai_credit_hub_ui_test.mjs` | **19/19 PASS、26,379ms**（店舗・session・署名・失敗保存・残高表示を含む） |
| `scripts/ci/critical-ui-preservation-gate.mjs` | **PASS** |
| `scripts/ci/run-auto-discovered-tests.mjs --list` と `--ci --list` | S6 EXTENDEDは登録済み、通常の無関係なPushで全5件を強制しない。journalソース回帰は自動発見済み |

### 失敗履歴（すべて証拠保持・最終PASSとは別）

- 初回在庫VM回帰では新しい外部ジャーナル契約がテストVMになく3/3FAIL。既存テストのRPCモックに同じ共通契約を実装し、マイクロタスク完了待ちを追加して3/3PASS。
- 初期S6実Chromiumで在庫ACKの`data.ok`契約を`data.success`で誤判定、AI SQLの存在しない`units`列、月次Grantのtrigger二重実行を許す誤cleanup fixture、別名の商品に異常を注入したため検出できないSQL oracleがFAIL。契約を直し、正常系・独立Oracle負例をそれぞれ再実行。完走後の3/3 PASSは最後の実測であり、初回失敗を帳消しにはしない。
- journalのクロスVMオブジェクト比較がJavaScript realmプロトタイプ差異で1FAIL。ID/フラグの値比較に修正し、保護すべき挙動を変えず2/2PASS。

## 独立レビュー結果（S01〜S10／H01〜H10）

ソース監査は実機PASSと混同しない。S観点としてメモリ限定の旧ID・事前永続化・コミット後ACK喪失・手動再送・確定後ID更新・元入力署名・店舗/従業員/環境/session分離・ローカル保存異常のfail-closed・新規操作の別ID・独立SQL/cleanupをそれぞれ確認（S01..S10）。H観点としてNative入荷/発注/AI（H01..03）、Web本番3面（H04..06）、Web TEST3面（H07..09）、共通部品の同一SHAとS5回帰/CIレーンの独立保全（H10）を別途確認した。いずれも**SOURCE/隔離Chromium確認**で、本番配布の実態確認やiOS/Android端末QAではない。

## S6残件と次のステップ

3業務の代表再起動E2Eは完走したが、在庫の廃棄・棚卸、発注送信に成功した後の実メール配信結果、実AI外部モデル/保存R2、本番Cloudflare D1、実Nativeの強制終了・再起動・ネットワーク切替は未検証。7日のTTLやlocalStorage消去後に同じIDを保証するものではない。複数物理端末の完全同時同一操作、実プリンタを含む副作用も未保証。

ユーザー決定済みの新QA体系に合わせ、次はS7で**自動E2Eと「私の実機QA」12チェックを独立して扱う**。旧正式1,659適用台帳は履歴として維持し、これを全消化することを新KPIにしない。今回の新規正式実機PASS=0、ユーザー実機確認PASS=0。Git commit/Push、Worker/Webデプロイ、モバイルビルド・配布は実施しない。
