# Izakanpai OPEN案件：ローカル未実装・対応不要候補の再仕分け

## 2026-11-17 14:32 PHT：129・142をユーザー判断で対応不要クローズ

- ユーザー指示「1と2は問題ないです。クローズして」に従い、**IZK-UT-129／IZK-UT-142を追加修正不要としてCLOSED 2/2**（読戻し2/2）。
- 両件の理由区分は `ACCEPTED_CURRENT_BEHAVIOR`（現在の動作・品質制約をユーザーが許容）で、**修正実施／製品品質の正式PASSを意味しない**。正式QA PASS増分0、元の障害・監査記録は保持。
- 監査当時の「ローカルで不足する実装：4件」は当時の技術的分類として以下に残すが、**129・142はユーザーの判断で現在の修正キューから除外**。継続するローカル追加実装対象は **178・188のQA基盤2件**。
- 実行計画：`docs/qa-modernization/IZK_NO_ACTION_CLOSE_129_142_20261117.json`。既存共通処理 `scripts/qa-autonomy/close_no_action_review.py` で反映。
- 対応不要CLOSED累計18件。最新集計：**OPEN 50／WAIT_TEST 29／CLOSED 107**（全186件）。

## 2026-11-17 14:24 PHT：ユーザー指定の対応不要16件をCLOSED反映

- ユーザー指示「不要なやつはクローズしてください」に従い、同監査の`NO_ACTION_CANDIDATE`16件を正本SQLiteで**対応不要クローズ16/16**。監査時の分類と証拠は以下に履歴として残す。
- 新しい正本集計：**OPEN 52／WAIT_TEST 29／CLOSED 105**（全186）。修正対象から除外した16件は監査上の候補ではなく、管理上のCLOSEDになった。
- **実機確認の代用ではない**：16件すべて`user_verified=false`、`user_verified_at=NULL`、`closure_kind`と`closure_reason`に理由を保持。正式QAのPASS増分0。過去ログと誤FAILも削除しない。
- `docs/qa-modernization/IZK_NO_ACTION_CLOSE_20261117.json`（対象ID・理由）を、`scripts/qa-autonomy/close_no_action_review.py --apply --user-authorized`を通じて既存正本`scripts/qa-autonomy/issue_register_store.py`に反映。再同期後の読戻し16/16と総件数を照合。
- 現在のOPEN52件の内訳は「ローカル実装済み32／コード不足4／外部確認4／原因・効果未確定12」。現行製品機能の追加修正候補は129・142、QA基盤の追加対応は178・188。古いOPEN総件数を追加実装件数と混同しない。

- 監査日：2026-11-17 PHT
- 照合元：`handoff/issue-dashboard/issues.json`（OPEN **68件**／WAIT_TEST 29件／CLOSED 89件、全186件）
- 監査したローカルHEAD：`006eb6b`。現行ソース・既存障害台帳・修正記録・関連回帰を再利用した。
- **目的はローカルの追加実装が必要かの判定であり、OPENをそのまま未修正としない。** 本番配布、実機QA、本番障害解消、ユーザー承認とは異なる。
- このファイルは**作業方針のレビュー用**。既存障害ID・元の障害記録を消したり、正式CLOSED／PASSへ変更したりしない。`NO_ACTION_CANDIDATE`は製品方針・重複整理の**候補**であって、勝手な中止承認ではない。

## 全68件の一次仕分け（各IDは一度だけ掲載）

| 区分 | 件数 | IZK-UT-IDの末尾 |
| --- | ---: | --- |
| `FIXED_LOCAL`：現行ローカルに要求に対応するコードを確認 | **32** | 105, 106, 107, 115, 120, 121, 122, 124, 135, 138, 143, 144, 146, 147, 148, 149, 151, 152, 156, 157, 160, 161, 162, 163, 164, 179, 180, 181, 182, 185, 186, 187 |
| `NO_ACTION_CANDIDATE`：過去の単発Run・重複・旧仕様・非製品指示のため新規修正の必要性を再判定 | **16** | 110, 116, 118, 131, 141, 150, 154, 158, 159, 165, 168, 169, 170, 173, 177, 183 |
| `CODE_GAP`：現行ローカルで期待する処理が不足 | **4** | 129, 142, 178, 188 |
| `EXTERNAL_PENDING`：実装は存在し外部端末・Apple/RevenueCat/Push側の証拠が不足 | **4** | 127, 153, 166, 167 |
| `UNKNOWN`：対策コードはあるが原因／効果／データが未確認。追加修正が必要とはまだ判定不可 | **12** | 039, 113, 114, 130, 145, 155, 171, 172, 174, 175, 176, 184 |

## 対応不要・統合候補：16件

| ID | 新たな修正を不要とする候補理由 | 守る条件 |
| --- | --- | --- |
| 110 | 旧「新規注文アラーム」はKDSのスピーカー通知UI・説明に置換。`mobile-app/web/kds.html` | 現在の通知音の操作／意味が分かることは継続 |
| 116 | 旧画像検索プロバイダーの順位問題。主導線はGoogle画像検索＋利用者の権利確認へ変更。`mobile-app/web/menu_editor.html` | 現在の検索・画像登録品質は143で管理 |
| 118 | 画面・発生手順・エラー不明の古い総称的報告。113等との重複候補 | 原証拠が別根因を示すなら復活 |
| 131 | GitHub Actionsの通常QA長時間実行はCOSオンデマンドのローカル実行に移管。`docs/LOCAL_ACTIONS_MIGRATION_20261117.md` | ローカルQAの実FAILは保持して是正 |
| 141 | 「私がすべきこと」の作業案内依頼であり製品修正指示ではない | 必要な案内は別途扱う |
| 150 | 本番監視→CoSの接続試験メッセージであり顧客障害の主張ではない | 監視試験の証拠は保持 |
| 154 | 2026-11-11の単発エラー急増アラート。継続する共通通信・診断原因は155へ | 新規の急増は独立監視 |
| 158 | 当時のControl Cron監視停滞。マイグレーション後にheartbeat回復の読戻し記録 | 新たな監視停滞があれば別事象として検出 |
| 159 | 旧GitHubリリース通知CIの単発Run、真因は160/165へ分離 | 現行通知経路は184で検証 |
| 165 | GitHub通知CIの資格情報問題。GitHub通知workflow無効化、現在は手動配布後の通知・D1照合経路 | 通知自体を廃止せず184で管理 |
| 168 | 旧GitHub SimulatorのKeychain -34018。現在のGitHub Simulator workflowは無効 | 実機の認証障害は175等で別管理 |
| 169 | 旧CIで同期式データ管理を期待したテスト誤検知。非同期job期待へ修正 | 現行ローカル回帰は実FAILを維持 |
| 170 | 旧CIのS5/S6固定件数誤検知。`test/auto-ci/s5s6-evidence-catalog.test.mjs`へ件数下限・連番契約を適用 | 追加ケースの欠落／偽PASSは検知 |
| 173 | 監査担当ワーカーへの内部作業指示が誤って障害ID化されたもの | 障害・ユーザー要望として扱わない |
| 177 | 旧auto-ui Runのfeedback reload期待・画面マッピング不一致はローカル修正済み | 現行オンデマンドQAの同じ回帰は維持 |
| 183 | 182と同じ「11月のGitHub課金エラーをスキップ」の重複受付 | 182の有効な課金起動拒否のスキップ契約は維持 |

## ローカルで不足する実装：4件（再度要否・優先度を判定）

| ID | 実ソースから確認した不足 | 実施すべき内容・注意 |
| --- | --- | --- |
| **129** | `mobile-app/web/menu-ai-bulk.js:101-155,180-184`・`menu-ai-import.js:914-951`ではAIがreviewと判定した名前・価格の行も、本人確認前に「仮登録」としてDB保存できる | 誤認識行が大量にDBへ入ることを防ぐ登録前レビュー／件数確認。現在のAIメニュー取り込みを継続する前提で必要。別の導線へ廃止するなら製品判断が先 |
| **142** | `src/menuImageGeneration.js:18-30,79-99`では生成JPEGの技術的妥当性は確認するが、ブランドラベル・数量・禁止小物の**画像内容**を成功判定前に検証しない | 正確な実在商品表示を保証できない生成画像は自動成功扱いしない。Google検索＋利用者確認への仕様変更で代替するかを確認してから実装範囲を決める |
| **178** | `business-web-scenario-requirements.mjs`の**206要求中93件だけ**既存の実行ケースに結合済み。**113件未ひも付け、うちP0 49件** | 113件を一律に「テストコード未作成」とは呼ばない。現在も必要な業務ルートだけ既存S4/S5/S6にひも付け、実行・独立証拠を増やす。廃止仕様は対象外にする |
| **188** | `docs/qa-modernization/DYNAMIC_BEHAVIOR_QA_PLAN_20261117.md`の動的Behavior Contractは第1段階のみ実装。全機能への適用、ダッシュボード上の不足表示、配布SHA照合に未実装あり | 既存CI/S4/S5/共通QAゲートを再利用してP0契約から段階拡張し、実負例・再テストPASSを条件にする |

## ローカル未修正とは断定できない・原因/検証待ち：12件

- **039**：自動完全削除処理は `src/controlPlaneWorker.js` にあるが、実際の30日期限到達から物理消去のreadbackが未証明。
- **113, 130**：実AI画像／OCRの失敗入力・モデル応答・クレジット／登録DBの同じ事象の再現証拠が不足。
- **114**：AIポイント表示／確認の共通コンポーネントはあるが、各業務ルートの現在の端末・API挙動の一致未証明。
- **145**：`src/gasApi.js:getOrderSubmission` と `mobile-app/web/api.js` の二重注文防止・保存照会はローカル実装済み。元のiOS通信停止の原因は未特定。
- **155**：`src/operationalDiagnostics.js`ほか診断v2ソースあり。Cloudflareの実配備、通信切断の原因、実Observability自動アラートは未証明／一部未実装。`docs/IZK_UT_155_PRODUCTION_DIAGNOSTICS_V2.md`を参照。
- **171**：旧GitHub全体回帰Runの18/230 FAILは履歴として維持。ローカル対応結果はあるが、全同ケースの最新再実行証拠が不足。
- **172**：旧店舗のHMAC残存に対する完全purgeソースあり。過去削除済み店舗のControl DB実残存は未再確認。
- **174**：遅延到着したiOS端末エラーは診断側に修正あり。元の通信障害と保存/ACK状態は未確定。
- **175, 176**：iOS認証更新・既読ACKの復旧/重複防止ソースはある。根本通信原因・新配布版の実機効果は未確定。
- **184**：Worker本番反映後にレビュー済通知をControl D1へpublish・readbackするソースあり。Web-only/手動TestFlight経路と実D1公開は別確認。

## ソース実装済み：32件／外部依存：4件

実装済み32件のIDは上記一覧が正本。代表根拠：105/115=`test/auto-ci/izk-ut-105-115-admin-charge-regression.test.mjs`、120/121/122/124=`mobile-app/web/menu_editor.html`、135=`scripts/qa-autonomy/qa_chat_intake.py`、143=`menu_editor.html`、144=`src/menuImageModeration.js`、151/152=`src/commission.js`、156=`src/orders.js`、164=`mobile-app/web/native-auth.js`、180/185=`test/auto-ci/party-size-picker-ui.test.mjs`、181=`src/operationalDiagnostics.js`、182=`scripts/operations/github-ci-incident-watch.mjs`、186=`scripts/operations/run-local-qa.bat`、187=`scripts/qa-modernization/qa-remediation-gate.mjs`。

外部確認が中心の4件：127=StoreKit/RevenueCat購入導線、153=APNs/FCM通知配信、166=Apple契約403、167=Push署名プロファイル。ローカルで外部のApple設定を直したことにはしない。GitHubによるiOS/Androidビルドはユーザーの現行方針で無効のまま。

## 今回の独立確認と台帳運用

- 対象ローカル回帰：人数ロック/時刻23/23、オンデマンドQA・更新通知15/15、NG是正ゲート17/17、GitHub課金エラー監視20/20、S5/S6証拠契約6/6、チャット受付13/13。**各テストの結果であり正式実機QAのPASSではない。**
- `gh workflow list --all` で非リリースGitHubワークフロー5件 `disabled_manually` と照合。課金起動拒否の旧Runを何度も再調査しない。
- **正式QAの新しいPASS=0、CLOSED増分=0**。現行issueステータス68 OPENは保持。修正不要候補を製品方針の承認なしに自動CLOSEDにしない。修正した後は対象NGの原因・修正SHA・同一ケース再テストPASSで判断する。
- 続行する順序：対応不要16候補の取り扱いを決める→129/142はAI機能継続要否に従って修正対象選択→178のP0 49要求を仕様存続判定→188の既存ゲート拡張。175/176/155/172等は根因不明のまま「未修正」と断定せず独立に確認する。
