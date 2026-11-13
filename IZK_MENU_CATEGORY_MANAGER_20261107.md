# izakanpai メニューカテゴリ管理：2026-11-07 SOURCE

## 要求・完了条件

「メニュー編集」画面の「商品一覧」の直前にカテゴリ管理を配置。存在するカテゴリすべてについて、カテゴリ順の変更と日英カテゴリ名の変更を可能にする。改名は店舗内のそのカテゴリに属する販売中・販売停止・仮登録・サンプルを含む全商品へ一括反映し、注文/テイクアウト/管理の並び順を揃える。旧アプリのメニューデータ形式は維持する。

## 既存資産の再利用・ソース修正

- src/menuCategories.js は既存の settings(store_id,key,value) に menuCategoryOrder を保存。新しいテーブルやスキーマ変更なし。既存の menu_items.sort_order をカテゴリ内の順序として再利用する。未保存のカテゴリは既存の初回登場順で後ろに配置。
- src/gasApi.js、src/index.js、src/admin.js の既存メニュー取得経路で同じ sortMenuByCategory() を呼び、お客様の注文画面・店内オーダー・テイクアウト・管理画面に整合した順序を返す。管理APIは既存の menu_editor 画面権限に追加し、署名済み店舗IDを正本とする。
- カテゴリ改名は既存の completeLocalizedPair で片言語のみの入力を補完。既存の localized_fields の日英列と menu_items.category/category_en を一括更新する。既存の歩合カテゴリ適用ルール commission_rules.scope_value、カテゴリ別厨房印刷の printers.categories も同一 db.batch で更新し、名称変更後に設定が途切れないようにする。カンマ区切りのプリンターカテゴリ仕様を壊す新名称は拒否する。
- mobile-app/web/menu_editor.html、docs/yuwaku/menu_editor.html、docs/yuwaku/test/menu_editor.html：商品一覧の前に折りたたみ可能な「カテゴリ管理」を追加。長押しハンドル＋▲▼で並び替え、独立した保存ボタン、各カテゴリの ✎ から日英名称を入力して一括変更、更新予定商品数の確認、保存結果の読戻しを備える。仮登録もカテゴリ所属件数に算入する。「すべて」タブの商品もサーバー順でカテゴリごとにまとまる。
- mobile-app/web/app.js と styles.css および docs/yuwaku / docs/yuwaku/test の同名ファイル：注文画面「すべて」タブをカテゴリ単位にまとめ、日英カテゴリ見出しを表示。個別カテゴリタブと人気ランキングにはカテゴリ見出しを重複表示しない。
- 並び替え・改名いずれも HTTP 応答喪失時に未知の二重書込みを行わず、権威あるメニューを読戻して本当に反映済みかを判断する。

## 検証証拠（SOURCE、正式実機QAではない）

- node --test test/menu_category_management_test.mjs：**13/13 PASS、exit 0**。D1型SQLiteにて同時編集者の保存競合/原子的CAS、2カテゴリの同一宛先への並行改名（片方を拒否）、改名と印刷先/保存済み順序の競合、**初回順序保存中の改名競合**、SQLロールバック、旧CSVの空白、他店舗隔離、厳格なテナントSQLガード、production-styleのwrite admission fence、注文画面の日英renderMenu()を検査。
- node --test test/menu_bulk_delete_browser_test.mjs：**45/45 PASS、exit 0**。Chrome実操作で Native / Web本番 / Webテストの3面、320pxドラッグ・英語のみの名前変更・保存/改名の通信ACK喪失時の二重送信防止・旧画面操作・特殊名（all/draft/__new__/引用符）・日英切替中の入力保持・商品移動のカテゴリ境界を確認。
- 12ファイルを指定した関連Node回帰：**44/44 PASS、exit 0**。対象は新機能、仮登録・旧iPhone編集、注文/歩合、旧単価/販売単位、AI翻訳、店舗SQLガード、単一HTTP保存など。コマンド履歴は下のレビュー追記に記録。
- node test/bilingual_data_test.mjs：**85/85 PASS、exit 0**。古い単独テストフィクスチャに不足していた ai_review_reasons_json 列を追加して、日英メニュー保存、注文/印刷、在庫、バックアップ、3画面のJS構文まで通し直した。テストデータ修正は本番スキーマ変更ではない。
- node scripts/ci/critical-ui-preservation-gate.mjs：既存ヘッダー・操作保全ゲート PASS、exit 0。

## 2026-11-07 独立アドバーサリアルレビューで発見した不足と是正

前回の30/30 PASSは正常系・旧機能を中心とした結果で、**完了保証には不十分**だった。2名のread-only独立ワーカーがコードを別々に追跡し、主担当が再現テストを故意にFAILさせてから修正・再実行した。今回の重要な再発防止は以下。

1. **カテゴリ順の同時編集上書き（P1）**：旧UIスナップショットの実効順をRPCへ送信し、サーバ側で厳密照合＋SQLite条件付き保存（CAS）。別端末による後出し旧状態を拒否。初回未設定時の保存とカテゴリ改名がぶつかった場合も、店舗別mutation tokenをSQL内で比較して陳腐なカテゴリキーが残らないよう拒否。
2. **改名と並び順／厨房印刷設定の競合（P1）**：旧値の読み取り後に別設定が更新されても巻き戻さないよう、カテゴリ順JSON／印刷先CSVを同一SQLトランザクション内の現値から置換。既存印刷先に複数空白があるケースも検証。
3. **同じ新名称への並行改名によるカテゴリ統合（P1）**：店舗別menuCategoryMutationVersionの原子的claim＋後続SQLのfenceで2操作の一方だけを確定。検証後DBから取得する。新しいCTEをtenantSqlGuardが拒否した障害は、ガード許可済みjson_eachによるSQLへ変更し再PASS。
4. **英語名だけ変更した際の虚偽FAIL（P1）**：日本語canonicalが変化しなくても、旧所属全商品のJA/EN更新値が読戻せれば成功と判断する。
5. **カテゴリ識別子の衝突・画面状態喪失（P2）**：all/draft/rankingと実カテゴリ名を内部状態で区別。__new__は実カテゴリと区別できる専用内部値に変更。入力途中の日英欄は再描画でも保持し、商品▲▼のカテゴリ境界越えを不可にした。
6. **改名前の画面を開いた旧iPhoneからの再保存（P1）**：店舗別menuCategoryRenameHistoryを更新し、旧名や古い日英ラベルを保存しようとすると書込み前にmenu_category_staleを返す。実SQLiteで旧端末の価格保存がカテゴリを復活させないこと、最新値での通常保存が通ることを確認。対応アプリのエラー説明を日英で追加。内部設定キーは公開settings応答に出さない。

追加テストでは**初回FAILがあったこと自体が重要な証拠**であり、最後のPASSだけを本番実機の証拠に読み替えない。テスト単位では条件付き書込み、トランザクション、旧端末互換などを網羅したが、アプリUIとの最終確認にsigned iOS/Android実機が要る。

関連Node回帰実行:

```powershell
node --test test/menu_category_management_test.mjs test/menu_ai_provisional_lifecycle_test.mjs test/menu_bulk_state_backend_test.mjs test/commission_scope_tenant_validation_test.mjs test/menu_editor_price_variant_test.mjs test/menu_auto_translation_test.mjs test/menu_save_parallel_translation_perf_test.mjs test/tenant_sql_guard_runtime_test.mjs test/tenant_sql_guard_reverse_pass_test.mjs test/menu_editor_save_single_roundtrip.test.mjs test/menu_sale_unit_validation_test.mjs test/menu_sale_unit_transport_compat_test.mjs
```

残留リスク：
- **実機未確認**：iPhone WebKitでの長押しドラッグ、画面回転・IME、署名アプリ同梱、実Bluetooth厨房プリンター、実Cloudflare D1/Workerへのデプロイ・正規権限でのE2E。
- **厳密な並行保存**：改名前の古い画面からの通常保存は事前検査で拒否する。ただし商品保存処理とカテゴリ改名がSQLバッチ境界でほぼ同時に競合した場合の端末同時実行E2Eは未実施。レビュー済みソースだけでは完全な競合不在と断言しない。
- **旧アプリUI**：旧iPhoneの古いカテゴリからの書込みは安全優先で拒否するため、画面再読込が必要。旧版には新しい日英エラーメッセージUIが含まれない。
- **正式QA進捗**：台帳の新規PASS 0。独立したSOURCE/Chrome結果を正式デバイスQAへ加算しない。

## 横展開レビュー

1. 利用元から影響探索：メニュー取得、注文・テイクアウト、編集、日英ローカライズ、歩合ルール、厨房印刷の各参照を検索。カテゴリの参照文字列を持つ歩合・印刷を同一トランザクションで追従させた。
2. 逆方向から検証：RPC名・権限マッピング、すべての menu_editor.html 原本、D1のカテゴリ/設定フィールド、管理サンプル・仮登録/停止商品、他店舗境界を確認。3面のブラウザー回帰と厳格SQL境界テストで逆引き検証。

## リリース状態

**2026-11-07 19:12 PHTにSOURCEコミット・push・共通3Worker本番配信まで完了。**

- コミット `9aa3f838ae67abf65d93e4640f20cef4d85a27b8`（25ファイル、origin/main SHA照合済み）。
- 共通Gateway `5377b2f6-d360-4b58-ba97-18d176b1bb24`、Control Plane `1abc507b-8423-4132-8b69-ff4e16f4ade4`、公開API `13cb34ee-1c0b-4e8d-8e63-4c488dec81ea`。3Workerともdeployment statusで100%配信、公開/health HTTP 200。
- Cloudflare現行登録13店舗、テナントD1 13＋Control D1 1、店舗R2 13について配備前物理D1整合PASS、配備後のR2所有者読取監査13/13 PASS。
- iOS・Androidの新ビルド／配布、TestFlight、実機正式QAは**未実施**。正式QA PASS増分0。旧アプリは新カテゴリ管理UIを表示しない。DBスキーマ移行ファイルの追加は不要。

※ この項目の前に記録した未配布・SOURCEのみの状態は、配備前時点の過去記録を指す。

## 2026-11-07 継続リリース（カテゴリ統合・商品順序のメモリ編集）

- Git コードリリースコミット: `fd1afe46aa96083bbb5eaee9a8b9f46eaf13060c`。リモート `origin/main` へ push 照合済み。メニュー関連だけでなく未コミットのQA基盤・課金UI・ツール整理も統合。
- 商品一覧は▲▼押下の都度RPCを実行せず、ローカル配列内で入れ替え、最後に「並び順を保存」を押して1回だけ `setMenuOrder` 実行。DB内部も同一店舗の変更済み商品の `sort_order` をパラメータ化されたJSONから単一SQLで更新。保存後は読戻し、通信応答喪失時の二重書込みを防ぐ。
- メニュー主要セクションの初期表示は全閉。商品編集ボタンでは編集フォームを展開。カテゴリ統合、カテゴリ▲▼、商品▲▼境界で押しても無変更、日英画面表示を反映。
- Cloudflare: private Gateway `0171495a-f329-4aed-b195-a46b1e1fc23b`、Control Plane `dfe1e647-3b6d-4c57-b784-903ae70cb620`、public API `e47564e8-7450-4890-8160-2285d2ff4410`。3Workerとも本番配信100%を `wrangler deployments status` で確認。公開 `/health` HTTP 200。
- Cloudflare Control現行登録13店舗、Gatewayの物理D1 14（Control 1 + 店舗13）・R2 13で構成再生成・バインディング検証。R2 owner読取 **13/13 PASS**。配備後の匿名公開4操作（bootstrap/getMenu/getSettings/getTables）**13店舗×4=52/52 PASS**。本番店舗への書込みテストは行っていない。
- ローカル検証: コミット前hook PASS、メニュー編集ブラウザ60/60、ローカル総合582、GAS互換561、テナントSQL/原子的処理の関連ゲートPASS。全216～217工程の`npm test`一括完走はしておらず、既存フィクスチャ/履歴検査の古い前提で途中FAILが発生したため、該当のテストを直して個別PASSを確認。全パイプラインPASSとは記載しない。
- iOS/Androidの新規署名ビルド、TestFlight配布、実機正式QAは本リリースでは実施していない。正式QA台帳のPASS増分は0。iOSローカルWebアセットを使用する既存アプリには新UIは自動配信されない。
