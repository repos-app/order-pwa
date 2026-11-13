# Izakanpai ヘルプ・実装 追加5巡監査

監査日: 2026-11-11。対象: 現在の共有ワークツリー。OpenAI API・外部従量課金なし。
**CI/ローカル検証と正式な実機QAは別物**。コミット・Push・Worker反映・実機QAはこの監査で実施しない。

## 第1巡: 全画面のヘルプ・表示導線・日英・配布面

- 123 HTML（アプリ45、Web本番39、Webテスト39）を棚卸し。修正後はアプリ41画面/245日英項目、Web本番38/216、Webテスト38/216
- 未登録4アプリ画面（旧在庫/スタッフ呼出転送、プライバシー/規約）、Web各1画面（転送）は既存の想定対象外として区別
- Web本番とテストの全39ページのHelp項目が完全一致。アプリ固有機能をWebへ誤コピーしない
- KDSのサウンド切替がベルからスピーカーに変わったのに英語版の文言・ボタンが一部旧仕様だったため3面を修正
- Webメニュー編集の並び順確定ボタンとカテゴリ操作の説明を修正

## 第2巡: 会計・レシピ原価・利益・返金・データ欠損

- 月間利益で不明レシピ原価や壊れた/旧形式の伝票を0円として見せていた。src/expenses.js は原価未知品目数・不完全フラグを返し、3つの利益画面で暫定値と警告を日英表示
- 給与集計の例外が0円扱いになっていた。wagesIncomplete で別の暫定警告を表示。処理は継続するが「正しい利益」と誤認させない
- src/purchasing.js のレシピ原価マップと src/reports.js の原価/返金処理は前回の修正を再利用
- 管理メニュー、初期表示、プラン比較、従業員権限表示に旧「月間粗利」が残存。月間利益へ訂正
- メニューの在庫紐付け文言「注文時に減算」を「提供済で減算」へ訂正
- 回帰: test/monthly_profit_completeness_regression_test.mjs。原価正常/不明/壊れた明細、給与DB障害、店舗分離をSQLiteで検証

## 第3巡: 権限・店舗分離・バックアップ・機密情報

- APIとGAS互換RPCに認証済店舗ID、ページ権限、Proプランの共通ガードが存在することをソース確認
- CSV出力の employees.password_hash は既に除外済み。ただし printers.print_lease_token、print_queue.claim_token が露出可能だったため、共通 src/backup.js のエクスポート除外へ追加
- test/backup_employee_secret_export_test.mjs: 2店舗の各データが分離され、パスワード/リース/印刷claimがCSVに含まれないことをSQLiteで検証
- 登録されたプッシュ端末トークン用テーブルはエクスポート許可リストに含まれていないことを確認

## 第4巡: 異常系・再読み込み・多重送信・日時

- Todo完了状態のRPC応答を待つ間、同じタスクの連打による応答順逆転を防止。保存中はチェック操作無効、サーバーのUTC完了日時を利用
- 誕生日クーポンで同一会員/月の発行連打をsingle-flightに変更。月の変更・同月再読み込みで古いレスポンスが新しい一覧を上書きしないよう取得世代番号で無効化
- test/help_async_race_regression_test.mjs の仮想DOM/RPC試験で、古いレスポンスの後着と発行連打を3面それぞれで実際に注入しPASS
- サーバー側の選択月、月初/月末、有効開始、発行済み履歴、テナント分離は既存のSQLite試験を継続

## 第5巡: 横展開・回帰と再発防止

- test/help_five_rounds_cross_surface_test.mjs に全123 HTMLと全WebミラーのHelp実登録・JA/EN、原価/並び順/音アイコン、主要5画面のインラインJS構文検証を実装
- 新設 test/auto-ci/help-semantic-five-rounds.test.mjs は関連実コード・QA資産を共通スイートで再利用。既存の自動発見CIがUI変更時に選択することを確認
- 既存 scripts/ci/run-impacted-ui-gates.mjs に全画面Help/多重操作の独立回帰を追加。静的ゲートは従来の日本語/英語/共通UI機能を維持
- test/mobile_navigation_test.mjs のKDS期待値を新しいスピーカー仕様へ更新。機能制限を緩めるのではなく、新仕様の存在を要求

## QA結果と証拠範囲

対象テストスイートはローカルで実行して成功。端末/本番の正式台帳は今回変更していない。

| 試験 | ローカル実行結果 |
|---|---|
| 5巡共通auto-ci統合試験 | 14 PASS / 0 FAIL |
| 変更影響UIゲート（ソース事前チェック） | PASS |
| ローカル共通スモーク | 583 PASS |
| GAS互換スモーク | 573 PASS |
| バックエンドRound1–10回帰 | 43 PASS |
| モバイル導線回帰 | 192 PASS（KDS期待値の修正後） |
| Web/TEST Helpミラー差分 | 0画面 |
| 正式Android/iOS実機QA | 0件（未実施） |

**制限**: 全ページのHelp登録/日英必須項目/3面整合は機械的にカバーしたが、
すべての機能と全文の意味が正しいという数学的な保証はできない。実運用データでの現物突き合わせ、
Native BLE、印刷実機、ストア課金、本番Worker反映は別の正式QAが必要。無料CIは外部LLMを呼ばない。

---

## 追加の第6〜10巡（通算10巡）: 再深掘り・実装修正・検証

今回も既存の5巡成果物/CIを再利用し、従量課金AI APIや本番DB操作は実施していない。

### 第6巡: 実装/Help逆方向照合・商品名と原価

- 月間利益の自動原価だけがオプション付き商品名（例: Food (Large)）を元のメニューへ正規化しておらず、実際に原価があるにも関わらず未知として扱われる問題を修正
- src/menuOptions.js の既存 resolveStoredMenuName を使用。正規商品自体に括弧がある場合、存在する商品名を優先して誤った原価の付替えを防止
- src/purchasing.js の原価マップ取得時の既存メニュー参照を再利用。追加の独立クエリ往復は発生させない
- test/monthly_profit_completeness_regression_test.mjs にオプション付き明細・同名接頭辞の別商品を追加してPASS

### 第7巡: 売上・人気商品・壊れた過去伝票

- src/reports.js の人気商品と売上分析に、JSON配列中の null や不正単価/数量がある場合の例外・金額欠落の可能性を確認
- 共通 isUsableReceiptDetailArray で1明細ずつ検証。不正なレシートは既存の「内訳不明・旧形式」集計へ振分け、売上額を消したり原価を捏造したりしない
- 営業日別内訳も不正配列で例外を投げない。日別総売上は既存のレシート合計値を維持
- test/sales_cost_rate_regression_test.mjs の破損明細を実DBで注入してPASS

### 第8巡: 将来のスキーマ追加時のCSV機密保護

- 前5巡で列別に除外した印刷 claim/lease トークンに加え、将来既存のCSV出力許可テーブルへ追加され得る password / token / secret / credential / API key / private key 系列を汎用フィルタで除外
- client_request_id のような業務用IDは保持し、他店舗データを混入させない
- test/backup_employee_secret_export_test.mjs の新規「未知の秘密列」試験を追加してPASS

### 第9巡: Todo保存中・再読み込み中の応答競合

- Todoで完了操作中に再読み込みすると、古い読込結果が楽観更新を上書きする場合があった。各読込の世代番号と保留中の書込状態で古い結果を無効化
- リトライ等で同じサーバー行が返る場合に、既存の行IDを更新して二重表示を回避
- test/help_async_race_regression_test.mjs でアプリ/Web本番/Webテストの実JSを仮想DOMへ投入し、古い読込結果の後着、保留中の完了更新、重複保存応答を実際に注入してPASS

### 第10巡: Help横展開とCIの実効性

- アプリのメニュー編集Helpにも、在庫を減らすタイミングが注文時ではなく「提供済」であることを日英で明記。3配布面のHelp項目内に提供済/Servedが存在することを自動検証
- 自動発見CIで src/expenses.js / src/reports.js / src/purchasing.js / src/backup.js / todo.html / birthdays.html の6種の変更に対して、共通5巡回帰スイートが選択されることを確認
- 変更影響UIゲート、日英・画面・ローカル共通スモーク・GAS互換・モバイル導線・バックエンド回帰を再実行

### 通算第6〜10巡の最終検証（正式実機QAと別管理）

| ローカル検証 | 結果 |
|---|---|
| Help/CI/単独Help導線試験 | 30 PASS / 0 FAIL |
| 今回の業務・安全・競合回帰試験 | 12 PASS / 0 FAIL |
| 変更影響UIゲート | 20 PASS / 0 FAIL（全ゲート通過） |
| ローカル共通スモーク | 583 PASS |
| GAS互換スモーク | 573 PASS |
| バックエンドRound1–10 | 43 PASS |
| モバイルナビゲーション | 192 PASS |
| 統合Help+サーバー性能/並列処理契約 | 24 PASS / 0 FAIL |
| ソース構文検査 / git diff --check | PASS |
| 正式Android/iOS実機QA | 今回0件（未実施） |

**完了区分**: 追加5巡のソース監査・修正・ローカル回帰・既存CI選択確認まで完了。
GitHub Actions実ジョブ、実機操作、公式台帳更新、Commit、Push、Worker本番反映は本作業では未実施。
レビューした機能以外の全業務シナリオの正式PASSを意味しない。

---

## 第11〜15巡（通算15巡）: サーバー入力・月境界・CSV取込・非同期書込

実施日: 2026-11-11。前10巡で作成した共通原価・Help/CI・SQLiteテスト基盤を再利用。
OpenAI API/従量課金サービスは使用していない。作業開始時点で未コミット変更140件が
共有ワークツリーに存在していたため、無関係な差分をリセットせず修正箇所のみを更新した。

### 第11巡: レシピ保存と原価マスタの不正入力

- src/purchasing.js の saveRecipes は、UIが数量を検査していても、直接RPCから null や
  配列以外、負数、0、NaN/Infinity 等が入力されると、既存レシピ全件DELETEを実行したり
  不正な数量を0として保存できた。配列以外・不正数量・空欄をDELETE前に拒否した
- 明示した空配列 [] だけは、従来どおり店舗のレシピ全削除という業務意図を維持
- 過去に保存済みの不正な負/非数のレシピ数量、負の材料単価は正確な原価ではないため
  未算定として扱う。集計で負数原価による見せかけの利益を作らない
- test/izk_ut_075_recipe_save_lengths_test.mjs と
  test/sales_cost_rate_regression_test.mjs に拒否・無変異・旧データの反例を追加

### 第12巡: 原価の一意性・営業月境界・返金

- drink_inventory に同名材料が重複すると、配列の取得順に依存して原価単価が変わっていた。
  src/purchasing.js で材料名の重複を検知し、その材料を使用する商品を原価不明にする
- test/sales_cost_rate_regression_test.mjs で同名材料の異なる単価を注入し、恣意的な
  単価を採用しないことを確認
- フィリピン時間Asia/Manilaの10月末/11月初、11月末/12月初のUTC境界および11月末返金を
  test/monthly_profit_completeness_regression_test.mjs で検証。
  11月分だけの売上と返金相殺した原価が算出されることを確認

### 第13巡: CSV出力と取込を対で保護

- 前10巡ではバックアップCSVからパスワード・印刷claim/lease・APIトークン等を除外したが、
  システム管理者向けCSV「取込」は、手で追加した秘密列をそのまま受け付ける経路が残っていた
- 共通の isCredentialExportColumn を src/dataAdmin.js の取込検証にも適用。
  実際に列が存在する場合は credential_import_forbidden を返し、書込ロックやデータ変更前に拒否
- test/backup_employee_secret_export_test.mjs に正式なシステムパスワード認証を通した
  不正秘密列の動的反例を追加。書き込み0件で拒否することを確認

### 第14巡: Todo追加・削除の競合

- 前10巡のTodo完了チェックsingle-flight以外にも、追加/削除中の古い再読込で最新一覧が
  上書きされるケースと、重複追加・削除RPCの連打経路が残っていた
- mobile-app/web、docs/yuwaku、docs/yuwaku/test の共通ロジックに
  書込中フラグと取得世代の無効化を実装
- test/help_async_race_regression_test.mjs で実JSを仮想DOMに読み込み、3面それぞれで
  追加・完了・削除中の古いRPC応答、二重操作、同じIDの再応答を注入してPASS

### 第15巡: CI横展開と回帰確認

- 既存 test/auto-ci/help-semantic-five-rounds.test.mjs にレシピAPI入力検証を追加。
  新しいテスト仕組みを並立させず、既存のCI自動発見/Help・原価・CSV・非同期回帰を継承
- 3配布面、全画面Help、Web本番/テストの文面一致、UI構文、バックエンド共通スモークと
  GAS互換、データ管理のインポート/復元をローカルで再検証

### 第11〜15巡の検証（重複計上せず、すべてローカル）

| 試験 | 結果 |
|---|---|
| 統合Help/業務/CI/導線の対象テスト | 53 PASS / 0 FAIL |
| 変更影響UIゲート | 20 PASS / 0 FAIL、ゲート完了 |
| レシピ・売上原価・月次利益の初期専用回帰 | 9 PASS / 0 FAIL |
| CSVの機密列出力/取込（動的取込認証含む） | 5 PASS / 0 FAIL |
| Todo/誕生日クーポンの動的RPC競合試験 | 3 PASS / 0 FAIL |
| ローカル共通スモーク | 583 PASS |
| GAS互換共通スモーク | 573 PASS |
| モバイルナビゲーション | 192 PASS |
| バックエンドRound1–10 | 43 PASS |
| データ管理の注文・復元回帰 | PASS |
| 正式Android/iOS実機QA | 今回0件、未実施 |

**正確な状態**: 第11〜15巡の追加監査・発見問題の修正・テストコード追加・
既存CI/ローカル回帰まで完了。GitHub Actionsの本番実行や実機での正式台帳PASS、
コミット、Push、Workerデプロイは未実施。

---

## 第16〜20巡（通算20巡）: 破壊的入力・特殊商品名・CSV形状・保存後レスポンス

実施日: 2026-11-11。共有ワークツリーを保護し、既存の共通処理と
test/auto-ci/help-semantic-five-rounds.test.mjs を再利用した。
OpenAI API・本番DB操作は実施していない。

### 第16巡: レシピ保存APIの識別子と重複検証

- saveRecipes は、同じメニュー/材料キーを複数回渡した場合や、制御文字の除去によって
  2件の入力が同じキーへ正規化された場合、DELETEとINSERTのバッチへ進んでいた
- src/purchasing.js で、型・制御文字除去後の空欄、重複した正規化複合キーを
  破壊的書込前に拒否するよう修正
- test/izk_ut_075_recipe_save_lengths_test.mjs に空/異型・複合キー衝突を追加し
  DELETE/INSERT準備が行われないことを確認

### 第17巡: JS予約プロパティ名と売上/原価

- 原価・売上・人気商品・カテゴリ別の検索表に通常のJSオブジェクトを使う場合、
  constructor、__proto__、toString などの商品名がプロトタイプ属性と衝突する
- src/purchasing.js の材料原価・商品原価、src/reports.js の商品/カテゴリ/
  売上内訳辞書を Object.create(null) へ変更
- test/sales_cost_rate_regression_test.mjs でこれら特殊名を本物のSQLiteメニュー・
  レシピ・レシートとして挿入し、数量/売上/原価/カテゴリ/人気商品が正しいことを確認

### 第18巡: 破壊的CSV取込の列と行の形状

- システム認証後のCSV全置換で、列名重複・空ヘッダー・行列数の欠落/過剰・
  配列以外や不正なセル型を受けた場合、意図と違う値の上書き/NULL化が起こり得た
- src/dataAdmin.js はSQL操作前にこれらを bad_header/bad_rows で拒否
- mobile-app/web/api.js と docs/yuwaku/api.js、docs/yuwaku/test/api.js に
  エラー修正手順をJA/ENで追加。前巡の秘密列拒否とレシピ重複拒否も3面で説明
- test/backup_employee_secret_export_test.mjs で管理者パスワード認証を通過させ、
  悪いCSVでもDB mutationが0回であることを確認

### 第19巡: Todo保存成功後に遅延した古い取得結果

- 前巡までの pending guard では、保存中に起動した一覧取得の応答が
  **保存成功と pending解除の後**に届くと、まだ古い内容に戻る余地があった
- 追加/完了変更/削除それぞれの最終処理で取得世代を進め、
  保存中に始まった古い読込を確実に無効化
- saveTodo が {success:false} 等の予期しない応答を返した場合、
  成功扱いで入力を消去せず、失敗メッセージと元の入力を維持
- test/help_async_race_regression_test.mjs は3画面の実JSを仮想DOM/RPCで
  実行し、書込完了後に古い一覧を返す、異常応答を返す等の順序を検証

### 第20巡: 横展開、既存CIでの実行選択、回帰

- UIエラーのJA/EN説明はアプリ/Web本番/Webテストに横展開
- Web本番とWebテストの todo.html / api.js の内容が完全一致することを確認
- 変更ファイル5種（src/purchasing.js、reports.js、backup.js、dataAdmin.js、
  mobile-app/web/todo.html）で自動発見CIが
  test/auto-ci/help-semantic-five-rounds.test.mjs を選択することを確認
- 既存の業務、CI、Help登録、画面導線、データ管理取込/復元をローカルで再実行

### 第16〜20巡の証拠範囲

| ローカル実行試験 | 結果 |
|---|---|
| Help/業務/CI/画面導線統合テスト | 59 PASS / 0 FAIL |
| 変更影響UIゲート | 20 PASS / 0 FAIL、ゲートPASS |
| ローカル共通スモーク | 583 PASS |
| GAS互換スモーク | 573 PASS |
| モバイル導線 | 192 PASS |
| バックエンド Round 1–10 | 43 PASS |
| データ管理CSV取込/復元の既存回帰 | PASS |
| 多言語レポート | 12 PASS |
| JS構文、git diff --check | PASS |
| CI変更影響セレクタ | 5/5ファイルで対象スイート選択 |
| Android/iOS正式実機QA | この巡は0件、未実施 |

**完了区分**: 第16〜20巡のソース監査・修正・回帰・ローカルCI選択確認まで完了。
コミット、Push、GitHub Actions実ジョブ、本番Worker反映、実機正式QA台帳更新は実施していない。
全業務フローの網羅的な正式PASSを意味しない。

---

## 第21〜30巡（通算30巡）: 不正な伝票・CSV数式・誕生日発行・Todo障害の独立監査

実施日: 2026-11-11。既存の20巡ソース・共通Help/業務/CI試験を再利用。
テストはローカルSQLite/仮想画面/RPCを使用し、OpenAI API、本番DB、実機には接続しない。
今回の確認・修正は既存の未コミット共有資産を削除せず実施した。

1. **第21巡 原価の数量境界**: receipts.items_json の qty:null / qty:true は
   Number() で0/1へ暗黙変換される。src/expenses.js で実際の数値/文字列だけを許容し、
   無効な数量・商品名を原価不明として通知。SQLiteで実際の利益・欠損フラグを検証
2. **第22巡 売上の明細境界**: src/reports.js の共通有効明細判定を強化。
   真偽値・null単価/数量や不正名称の明細があるレシートは売上分析で「内訳不明」へ移し、
   売上合計を落とさず、虚偽の原価率を作らないことを検証
3. **第23巡 卓人数の識別子境界**: getAllTablePartySizes で__proto__等の卓名が
   JS通常オブジェクトと衝突し、人数を正しく返せない。Object.fromEntriesに変更。
   特殊な卓名と2店舗分離をSQLiteで検証
4. **第24巡 API権限の独立照合**: src/index.js の画面別ルート権限表、
   src/gasApi.js のRPC権限表、src/dataAdmin.js のSystemロール/本人パスワード再認証と
   店舗ID認証元採用を照合。既存の侵入・テナント分離テストを実行。ここは追加変更不要
5. **第25巡 CSV数式安全性**: Backup / Data Admin の計6画面はCSVの引用符だけを
   エスケープし、=HYPERLINK等を表計算ソフトで開く際の数式化リスクがあった。
   既存API共通コードにcsvSafeCell/csvRestoreCellを導入し、式になり得る文字列を安全化、
   Data Admin再取込時には元の文字列へ復元。3配布面で実CSV生成/パースの往復を検証
6. **第26巡 CSV全置換の未知列**: 正しくない列名を黙って無視すると、
   データ全置換時に元の列値が消える。src/dataAdmin.jsで未知列やstore_idのみの
   CSVを更新前に拒否。管理者認証済みの異常CSVがSQL変更0回で失敗することを検証
7. **第27巡 誕生日クーポン月の省略**: issueBirthdayCouponでmonth引数がない場合、
   会員の誕生月一致判定を迂回できた。月指定/省略に関わらず一致を必須化し、
   既存のbirthdayCouponIdentityを使用してコード/期限算出の重複を除去
8. **第28巡 Todo取得エラー**: 初期getTodos失敗を空配列へ置換すると、
   通信失敗が「タスクなし」と誤認される。初期読込ではエラー表示または認証画面遷移、
   再取得失敗時は従前の確定済み一覧を保持してエラー表示。3面の実JS/RPCテストで検証
9. **第29巡 Help/実装ドキュメント一致**: 月間利益や誕生日クーポンに残っていた
   実装コメントの旧説明を修正。データ管理HelpにCSVの機密情報除外・数式安全化・
   再取込時復元・未知列拒否をJA/ENで追記。Web本番とWebテストのHelp全39画面一致
10. **第30巡 回帰とCI連携**: 上記専用反例を
    test/pos_twenty_one_to_thirty_regression_test.mjs と既存業務回帰に追加し、
    test/auto-ci/help-semantic-five-rounds.test.mjs に統合。
    8種類の変更ファイルについて自動発見CIが共通テストを選択することを確認

### 回帰FAILと解消経緯

初回の全体回帰では、誕生日以外の月でもクーポン発行が成功するという
**旧仕様を期待したテスト**がローカルスモークとバックエンド回帰でFAIL。
本来の業務ルールは緩めず、誕生月以外への発行拒否を明示した反例を追加。
発行成功のテストデータだけを店舗の当月生まれへ修正し再実行してPASSを確認。
これはコード不具合を隠すための単純な期待値変更ではなく、新仕様の拒否条件を
テストに追加したもの。結果は下記最終実行値のみを正式なローカル結果として記載。

| ローカル検証 | 最終結果 |
|---|---|
| Help/業務/CI/導線の統合Nodeテスト | 61 PASS / 0 FAIL |
| 変更影響UIゲート | 20 PASS / 0 FAIL |
| ローカル共通スモーク（拒否条件を1件追加） | 584 PASS |
| GAS互換スモーク | 573 PASS |
| バックエンドRound1–10 | 43 PASS |
| モバイルナビゲーション | 192 PASS |
| データ管理CSV取込/復元・テナント侵入 | PASS |
| 新規CSV安全化・卓人数の動的テスト | 2 PASS |
| 自動発見CIの変更ファイル選択 | 8/8選択 |
| 正式Android/iOS実機QA | 今回0件、未実施 |

**完了条件**: 第21〜30巡のソース監査・修正・実行可能なローカル回帰・既存CIへの統合。
GitHub Actions実ジョブ、実機正式QA、コミット/Push、Worker本番反映は
今回未実施。ローカルのPASSは公式台帳上の新たな実機PASSを意味しない。

---

## 第31〜40巡（通算40巡）: 新しい負のケースで監査継続

実施日: 2026-11-11。過去30巡のソース修正・SQL試験・Help監査・
CI自動発見基盤・既存BCP-009実ZIP呼び出し試験を再利用。
本番DB/Worker/実機を操作せず、外部従量課金AI APIも使用していない。

### 第31・32巡: 実商品と仮想集計行の名前衝突

- 本物の商品名「(内訳不明・旧形式)」と旧/破損レシートの仮想内訳行が、
  src/reports.js で同じitemMapキーを使って衝突していた
- 集計用行を独立配列として保持し、unknownBreakdownを明示。
  商品名が一致しても、仮想行の数量/売上/原価を実商品のものに置換しない
- 実SQLの両方のレシートを組合せ、実商品19と不明売上35が2行独立、
  実商品原価4と不明原価nullを維持することを検証

### 第33巡: 月間利益の経費分類がJS組込名と衝突

- src/expenses.js の費目分類にconstructorなどの旧/custom categoryが入ると、
  Object.prototype由来の値に引っかかり「その他」に加算されない
- Object.hasOwnを使って本物の分類のみを認め、不明カテゴリを「その他」へ合算
- 実SQLiteの25単位の不明分類が「その他」へ反映されることを回帰

### 第34巡: 不正引用符CSVによる全置換のデータ損失

- 3つのdata_admin.htmlのCSVパーサは閉じ忘れ引用符や途中に埋め込んだ引用符を
  そのまま取り込み、行列数とデータ内容を誤解釈する可能性があった
- 引用開始位置、閉じ忘れ、閉じた後の不正文字を検証しbad_csv_quotesで拒否
- 3面で実JSを評価し、正常なUnicode/カンマ/改行付きCSVは往復保存でき、
  不正なCSVは取込前に例外となることを検証

### 第35・36巡: 不完全なバックアップZIPの成功誤認

- backup.htmlとdata_admin.htmlの6画面でテーブル取得が失敗しても、
  エラー説明のテキストをCSVとしてZIPに入れ「バックアップ成功」を表示できた
- 空/不正のテーブル一覧と個別テーブル取得失敗を検出し、共有・保存前に処理全体を中止
- test/regressions/qa2_bcp009_current_backup_archive.test.mjs は、
  既存の実HTML backupAllをSQLiteと動的RPCで実行。
  全3配布面の失敗テーブル・空一覧を注入し、23 PASS/0 FAIL
- CSV共通シリアライザ導入に合わせてこの既存試験も実API.csvSafeCellを呼ぶよう修正。
  テスト用スタブ不足を残さず修復

### 第37巡: 誕生日クーポン金額の非有限値

- birthdayCouponAmount=負数/Infinity/NaN/0 が保存された場合、
  0を勝手に100へ変換したり負値/非有限額で新規発行できる経路があった
- 未設定時の標準額100を維持しつつ、設定が存在して正の有限数でない場合は
  invalid_birthday_coupon_amountで新規発行を拒否
- 再発行では既存クーポン値を先に返すため、
  設定が壊れていても既発行クーポンの冪等取得は可能
- test/birthday_month_todo_regression_test.mjsへ4種の悪い設定を動的注入

### 第38巡: UIエラーとヘルプの横展開

- API共通日英エラー説明を3面に導入し、クーポン設定不正、
  テーブル一覧なし、特定テーブルのバックアップ失敗を案内
- バックアップHelpの旧「失敗テーブルのエラーCSVをZIPに含める」説明を
  新しい不完全ZIPの保存拒否へ3面で改訂
- Web本番/テストのbackup・data_admin・api・todo完全一致を確認

### 第39巡: CIの新規負のテスト導入

- test/auto-ci/help-semantic-five-rounds.test.mjsに既存BCP-009の実HTML試験を統合
- src/reports.js、expenses.js、crm.js、dataAdmin.js、mobile-app/webの
  backup.html、data_admin.html、api.jsという7種の変更で
  自動発見CIが共通テストを選択することを確認

### 第40巡: 広域回帰と未解決区分

- 上記の修正に対し既存の回帰テストを同一ワークツリーから実行
- 初回の新規反例テストには「仮想行が本物の原価を拾う」「経費カテゴリの継承属性」が
  実際にFAILしたが、原因修正後の再実行でPASS
- 既存BCP-009試験もCSV共通APIのスタブ不足でFAILしていたため
  共通APIの本物のロジックを評価する試験へ変更後、23/23 PASS

| 最終ローカル検証 | 結果 |
|---|---|
| Help/業務/CSV/BCP統合Nodeテスト | 84 PASS / 0 FAIL |
| 変更影響UIゲート | 20 PASS / 0 FAIL |
| ローカル共通スモーク | 584 PASS |
| GAS互換スモーク | 573 PASS |
| バックエンドRound 1–10 | 43 PASS |
| モバイルナビゲーション | 192 PASS |
| BCP-009実HTMLバックアップ | 23 PASS（統合に含む） |
| CSV取込/復元・履歴 | PASS |
| 店舗分離CSV/コミッション侵入 | 22 PASS |
| CI自動選択 | 7/7変更ファイルで対象スイート選択 |
| JS構文 / git diff --check | PASS |
| Android/iOS正式実機QA | 今回0件（未実施） |

**状態**: 通算31〜40巡の追加監査・確認不具合の修正・ローカル対象回帰は完了。
今回最後に実行したテスト群ではFAILは未検出。ただし全機能・全端末・本番環境で
不具合がゼロと確認したわけではない。GitHub Actions実ジョブ、正式実機QA、
コミット、Push、本番Worker反映は行っていない。
