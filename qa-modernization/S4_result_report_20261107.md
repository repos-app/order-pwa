# S4：業務API・DBの自律結合テスト（2026-11-07）

## 2026-11-08 最新S4

下記の40件以前の数字は過去履歴。複数商品・分割会計・スタッフ報酬・会員クーポン・並行返金の7件追加後、現行は47業務ケースでSQLite47/47・隔離workerd/D147/47PASS、両環境で不正証拠56/56検知。最新の事実と未保証範囲は S4_COMPLEX_CHECKOUT_REFUND_20261108.md と QA_MODERNIZATION_PROGRESS.md を参照。

## 最新版への引き継ぎ（2026-11-08）

このファイルの33ケース以前の表は履歴。現在のS4は**注文→会計→返金→3帳票の整合性検証を含む固有40業務シナリオ**に拡張済み。SQLite40/40・隔離workerd/D1 40/40ローカルPASS、不正証拠の改変検出は両レーン40/40、D1の古い証拠13件は再実行13/13PASSで置き換えた。全93店舗別DBテーブル監視、正式QA増加0。**最新の詳細・失敗履歴・証拠・未保証領域は S4_REFUND_WORKFLOW_20261108.md と QA_MODERNIZATION_PROGRESS.md を参照。**

## 2026-11-08 PHT 通貨別（JPY/PHP）テストの追加

**追加の検証契約：同じ会計業務を通貨設定ごとに再実行する。PHPは countryCode=PH / currencyCode=PHP / currencyDecimalDigits=2、JPYは countryCode=JP / currencyCode=JPY / currencyDecimalDigits=0。** どちらのレーンでも実APIの応答・receipt DB・税/サービス料/割引額・売上確定・テナント分離・cleanupを独立照合し、片方がPASSしても他方をPASS扱いしない。

| 設定 | PHP（小数2桁） | JPY（小数0桁） |
|---|---|---|
| サービス料0%・税0% | total 100.00、service 0、tax 0 | total 100、service 0、tax 0 |
| サービス料10%外税＋設定税率12%外税 | total 123.20、service 10、tax 13.20 | total 123、service 10、tax 13 |
| サービス料10%外税＋設定税率12%内税 | total 110.00、service 10、tax 10.71 | total 110、service 10、tax 11 |
| 20%割引 | total 80.00、discount 20 | total 80、discount 20 |
| 固定額10.25の割引 | total 89.75、割引登録成功 | 小数JPY額として登録拒否、領収書0 |

**注意：テスト中の設定税率12%は通貨丸め差を検証するための任意の店舗設定値であり、日本の標準消費税率を意味しない。** 税率と通貨は別々に店舗設定される。

ケース名：PHPの S4-BILL-022〜025、JPYの S4-BILL-JPY-028〜032、PHPの小数固定割引 S4-BILL-PHP-FIXED-FRACTION-033。各業務ロジックのOracleは本番のroundMoney()を呼ばず、期待金額を独立した固定値として照合する。JPY receipt のVATを13.2に改変した偽証拠も独立Oracleが拒否した。

**確定済み：SQLite全33ケース33PASS/0FAIL/0BLOCKED、16,118ms**。証拠原本 test-results/qa-modernization/s4/local-api-2026-11-07T16-20-16-294Z-p7252-n1/summary.json。

**確定済み：隔離workerd/D1全33ケース33PASS/0FAIL/0BLOCKED、295,408ms**。証拠原本 test-results/qa-modernization/s4/local-d1-2026-11-07T16-20-43-448Z-p18824-n1/summary.json。

同じ33シナリオを2つの独立した環境で実行した延べ66証拠行。SQLite・workerdのそれぞれでケース別の独立Oracle、DB readback、cleanup、店舗分離、証拠検証にPASSした。正式Android/iOS QAの新規PASSは0。別途通貨10パターンの独立回帰テスト2件PASS（実通貨10ケース・偽造VAT拒否）。

---

**以下の「21ケース」「12ケース」「6ケース」は旧版の実行履歴であり、最新の全件数ではない。**

## 最新結果：21業務シナリオのSQLite／隔離workerd-D1実行

**S4業務の固有21シナリオ：SQLite21 PASS/0 FAIL/0 BLOCKED、隔離Cloudflare workerd＋D1/R2でも21 PASS/0 FAIL/0 BLOCKED。** 同一21件を2レーンで実行した延べ42検証行であり、42種類の独立ケースではない。正式実機QA新規PASSは0件。

| レーン | PASS | FAIL | BLOCKED | 全件所要時間 | 原証拠 |
|---|---:|---:|---:|---:|---|
| 本物のGateway＋SQLite | 21 | 0 | 0 | 10,255ms | test-results/qa-modernization/s4/local-api-2026-11-07T15-52-45-530Z-p14396-n1/summary.json |
| workerd＋隔離Cloudflare D1/R2 | 21 | 0 | 0 | 168,417ms | test-results/qa-modernization/s4/local-d1-2026-11-07T15-54-08-993Z-p25768-n1/summary.json |

### 今回追加した9ケース（S4-013〜021）

| ケース | 業務内容 | 独立SQL/実API判定 |
|---|---|---|
| S4-INV-SAVE-013 | 商品在庫の登録・再表示 | 数量4、原価25、初期入庫台帳・翻訳データ |
| S4-INV-RECEIVE-014 | 入荷3と同一クライアントIDの再送 | 在庫7、入荷移動台帳1行のみ |
| S4-INV-WASTE-015 | 在庫4に対する廃棄7の適用と再送 | 在庫0、適用数量-4、移動台帳1行のみ |
| S4-SUPPLIER-SAVE-016 | 仕入先作成・同一内容の再送 | 仕入先1行、名称・言語・メール確認 |
| S4-PO-REPLAY-017 | 仕入発注6個・同一IDの再送 | 発注1行、数量・仕入先紐付けの整合 |
| S4-SALES-RECEIPT-018 | 注文→現金会計→売上集計 | 領収書100と日次・月次集計100の一致 |
| S4-AI-WALLET-019 | Pro月次クレジット照会2回 | 10ポイントの月次付与1回、購入残高0 |
| S4-AI-NO-CHARGE-020 | AIモデル実行不可時に取込要求 | feature disabled、ポイント残高不変・予約0 |
| S4-ROLE-DENY-021 | 権限設定で在庫ページを拒否 | RPC本文ok:false、forbidden_page:inventory、在庫DB不変 |

共通ランナーでFixture→実業務API→独立テナントSQL before/after→Oracle→cleanup再読込→Gateway閉鎖→ケース別JSON・証拠SHA256確認まで自律実行。D1はテスト用にマイグレーション・初期データを投入したローカルworkerd実D1バインディングであり、CloudflareリモートD1や本番環境ではない。

### 初期の失敗と修正履歴

- 最初の21ケースSQLite実行は20 PASS / 1 FAIL。S4-ROLE-DENY-021で、GAS互換RPCがHTTP200でも本文ok:false/errorを返す契約をHTTP403と誤解していた。本文を正式な判定に変更し、SQLite21/21と隔離D1 21/21の再実行でPASS。
- 偽造AIウォレット残高をVerifierが正しく拒否したが、テスト側のエラー文字列マッチが大文字・小文字の違いでFAIL。AssertionErrorクラス照合に修正し、対象ケースとnpm自動発見全体でPASS。
- 新規の入荷失敗注入では、実在庫DB更新直後に例外を発生させ、復旧後のDB原本一致と次の廃棄ケースPASSを確認。AI購入残高を偽造したPASS証拠の拒否も確認。

### 対象外・次に必要な確認

今回のAIケースは月次付与と実モデル未使用時の非課金であり、**AIメニュー画像解析/生成/検索の実成功、ポイント実消費、RevenueCatの実購入を検証したわけではない**。税・サービス料・割引・返金、仕入メール送信、在庫レシピ連携、スタッフ権限の組合せなども未網羅。

S4は他業務の網羅率未測定のため部分完了。正式QA台帳、実機、リモートD1、Worker配備、コミット/プッシュ、モバイルビルドは今回変更していない。

---

## 最新結果：共通12シナリオをSQLiteと隔離workerd/D1で完走

**現在の完了実績：共通12業務シナリオ×2つの実行レーンで24行の検証記録を取得（同じ12シナリオなので24種類の独立ケースではない）。SQLite 12 PASS・0 FAIL、workerd/D1 12 PASS・0 FAIL、正式実機QA新規PASS 0。**

| 実行レーン | PASS | FAIL | BLOCKED | 実測所要時間 | 実行証拠 |
|---|---:|---:|---:|---:|---|
| 本物のGateway＋独立SQLite | 12 | 0 | 0 | 5,961 ms | test-results/qa-modernization/s4/local-api-2026-11-07T15-27-10-635Z-p19516-n1/summary.json |
| 本物のworkerd＋独立D1/R2 | 12 | 0 | 0 | 83,947 ms | test-results/qa-modernization/s4/local-d1-2026-11-07T15-24-13-029Z-p18696-n1/summary.json |

追加6シナリオ：S4-ORDER-QR-007（QR注文・保存）、S4-ORDER-REPLAY-008（再送時の注文重複防止）、S4-ORDER-FOREIGN-TABLE-009（別店舗のテーブルトークン拒否）、S4-CASH-CHECKOUT-010（提供済注文の現金会計、領収書・明細・最終金額100の独立SQL照合）、S4-CASH-REPEAT-011（同じ請求を再実行しても領収書1枚）、S4-CASH-FOREIGN-ADMIN-012（別店舗の管理者による会計拒否）。元の6カテゴリ等と合わせ全12ケース。

各ケースは、異なる独立店舗のD1/SQLite不変確認、SQL before/after、依存テーブルまで含めたcleanup、DB再照合、Gateway閉鎖、ハッシュ付き証拠ファイルを満たした場合のみPASS。Local D1はMiniflareによるCloudflare workerdの実ランタイムであり、Mock D1ではないが、CloudflareリモートD1でも正式実機QAでもない。

### workerd/D1の失敗と実質的な対策

1. インストール済みMiniflare v5の設定形式が旧例と異なり、worker設定形式を修正した。
2. MiniflareのNode側D1プロキシ取得がWindowsで進まなかった。**同方式の再試行を止め、隔離workerd内でテスト用SQLを実行するルートに変更**。それにより実D1/R2を使用し、D1をNodeモックへ戻さなかった。
3. D1.execで複数行のマイグレーションを流す方式が不適切だったため、コメント・引用符・トリガー本体を保持するSQLスプリッターを用意。**現行全マイグレーションの739文**をNode SQLite側でもパースして検証後、workerd上で両店舗に実行した。
4. 初期のQR注文ケースで論理子テーブルによるcleanup拒否。保存・削除対象を注文・明細・レシート・連結表など依存表まで広げ、後片付けを成功させた。
5. 会計データをネストして送信したところno_targetを取得。アプリの実GAS互換API契約はフラット引数なので、既存実装と一致する形で再実行しPASS。
6. D1の変更件数はトリガー経由の更新数も含めて返り、Node SQLiteとは異なる。件数で誤判定せず、**注文の提供済状態を独立SQLで読み直す**共通Oracleに変更。

### npm test・ダッシュボードへの横展開

- S4専用の新しいパイプラインコマンドは追加せず、既存のnpm test自動発見で共有ランナーを起動。隔離workerd/D1の現金会計代表1シナリオも自動発見に登録。
- カタログにはLocal SQLite 12行とworkerd/D1 12行をレーン別に登録。npm testの実行ステップ数には加算しない。公式QA PASS395件は変更しない。
- Dashboardの2つの独立KPI「S4ローカル業務API PASS」「S4 workerd/D1 PASS」をそれぞれ12で表示。現在のソースSHAが証拠時と異なる場合はSTALE_SOURCE（再検証待ち）でFAIL-CLOSED。

### 未実施

- AI画像検索/生成・AIメニュー取込・在庫・仕入・売上集計・権限組合せなど全主要業務をこの12ケースで網羅していない。**S4の全機能カバレッジ認定は未完了**。
- オフラインACK/競合/再送の広域障害注入はS6。Webの画面網羅と多言語はS5。
- リモート本番D1、実店舗、モバイル実機、正式QA台帳の新規判定、モバイルビルド、commit、push、Worker deployは実施していない。

---

## 初回6ケースの履歴（以下は拡充前の記録）

## 実際の到達点

**ローカル共通基盤で自律業務6シナリオを準備→実Gateway/API→独立SQLite照合→後片付け→独立証拠再検証まで完了。6 PASS / 0 FAIL / 0 BLOCKED。正式実機QAのPASS増加は0。**

実行証拠（代表の最終全件ラン）：

- test-results/qa-modernization/s4/local-api-2026-11-07T14-32-51-834Z-p19548-n1/summary.json
- 上記runのケース別6つのJSON。各ケースのGatewayレスポンス、変更前後のテナントDB表、他店舗の不変確認、全表のリストア後readback、閉鎖/再アクセス拒否を含む。
- シナリオ数6、独立Verifier承認6、所要時間 **2,538 ms（6ケース合計）**。手動作業0。環境・PC負荷で変動するため速度保証値ではない。

| シナリオ | 実行した業務条件 | 結果 |
|---|---|---|
| S4-CAT-ORDER-001 | カテゴリ保存→設定DBの順番再確認 | PASS |
| S4-CAT-ORDER-STALE-002 | 古い前提の並び順保存を拒否→DB不変 | PASS |
| S4-CAT-MERGE-003 | 飲料2商品を食品カテゴリへ統合→商品・多言語項目・統合履歴をSQLで確認 | PASS |
| S4-CAT-MERGE-STALE-004 | 数量の古いカテゴリ統合を拒否→DB不変 | PASS |
| S4-MENU-SELLOUT-005 | 商品売切RPC→実メニューAPIの再取得と独立DB確認 | PASS |
| S4-TENANT-DENY-006 | 店舗Aトークンで店舗Bへアクセス→拒否、両店舗のDB不変 | PASS |

## 自律性・復旧の実験

- 1ケースごとにS2から再利用した**完全独立のメモリ内店舗DB 2つ**を起動。各店舗に本物のマイグレーションと管理者トークンを適用。本物の src/commonTenantGateway.js、src/index.js、src/gasApi.js と業務モジュールのコードを実行。
- 独立Oracleはケース名ごとの具体的なSQL差分とRPCの戻り値から再判定。自己申告 verdict:PASS のみではPASSにならない。
- SQL変化の有無にかかわらず finally 経路で5表の原本スナップショットへ復旧、独立SQL再照合。両店舗DBを閉じ、閉鎖後Gatewayが拒否することまで確認。
- **実際のカテゴリ順序変更を成功させた直後**に意図的な例外を発生させたテストでは、FAILと証拠を記録し、SQLは復旧。その後の別ケースがPASSしており、1ケースの失敗で全体が止まらないことを証明した。
- DB画像を加工した偽PASSを独立Verifierが拒否するテストもPASS。これは偽造耐性の全保証ではなく、再現可能な期待条件・独立証拠への基本ゲート。
- 監査から途中で誤って「最新の6ケース全件」証拠を上書きしないよう、1呼び出しごとの固有runIdへ改修。全6ケース成功証拠と故障注入証拠を別runに保存する。

## 既存業務資産の再利用

- test/common_tenant_real_business_e2e_test.mjs を変更せずに実行。2店舗の実ゲートウェイでQR注文、オンライン現金会計、重複処理、CloudPRNT受付・ACK、RevenueCat通知の不変条件を **40チェックPASS / 終了コード0** と確認。
- これは従来からあるローカル業務結合テストの再実行。今回の新S4ケース「6件」に加算していない。実CloudPRNT物理印刷やApple Sandbox購入を保証しない。
- test/auto-ci/qa-modernization-s4.test.mjs を既存 scripts/ci/run-auto-discovered-tests.mjs に自動発見させ、既存 npm test パイプラインの自動検証へ登録（手動の専用コマンド増設なし）。
- S4単体テスト：6件自律完了、失敗注入時の継続・復旧、偽PASS拒否 **3/3 PASS**。
- 既存CI自動発見：9ファイルすべて実行成功。ダッシュボードAPI・CSV・実Chromiumのテスト：3/3 PASS。

## ダッシュボード連携

- 既存URL http://127.0.0.1:18765/#qaTestCatalog で「npm test」系統の「S4業務API実行証拠」を選択可能。
- ソースのSHA256が実行時と変化していたら、古いローカルPASSを現行コードのPASSとせず STALE_SOURCE に降格する。
- UIに **「S4ローカル業務API PASS」** の独立KPIを表示。正式QA PASS395件は増加させない。
- 登録テスト・その内部の自動発見と、実行済みS4シナリオは別ソースを維持。表示行数は「独立したnpm実行コマンド数」と一致しない。

## 未実施・ブロッカー

1. **Cloudflare workerd/D1実ランタイム互換試験は未実行**。現行 wrangler.toml は本番Worker名とControl/Provisionerサービスを指定するため、そのまま起動・更新せず、独立したQAローカルworkerd構成を準備する必要がある。
2. QR注文・会計・課金・印刷の**既存40チェック**は今回既存テストを実行したが、新S4の6ケースと同等のケース別独立証拠にはまだ統合していない。
3. 全登録218件のnpm test完走、iOS/Android実機、正式証拠署名や実機台帳反映、実D1/本番配備は実施していない。
4. S5で実画面全体のPlaywright E2E、S6でACK喪失・並行処理・ネットワーク故障、S7でネイティブ、S8でシナリオ実行履歴とリリースゲートへ展開する。

**S4判定：ローカルAPI/DB共通ランナーの初期6ケースは実装・実行・独立証拠検証完了。workerd/D1互換と他業務の新ランナー展開が残るため、S4全体は部分完了。**
