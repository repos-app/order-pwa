# Izakanpai 設定・権限・実業務E2E拡充（領収書・在庫・注文取消）

実施日：2026-11-20。適用対象：既存auto-discoveredテストと既存Chromium＋本番相当Gatewayコード＋隔離SQLite。
本番環境、外部決済、実プリンタ、ネイティブ端末を使わない**ローカル業務QA**。正式実機QAへは加算しない。

## 1. 現時点の確定実績

| 判定対象 | 実績 |
|---|---|
| 新規実業務サブケース | **24/24 LOCAL_PASS**（最初の18件＋一般スタッフ別承認6件） |
| 拡張した3ファイルの業務ケース合計 | **54/54 PASS**（16＋18＋20。TAP親は含まない） |
| 関連10テストファイル一括回帰 | **85/85 TAP PASS、FAIL 0、skip 0、exit 0** |
| 設定マトリクス＋業務Web網羅性の独立回帰 | **2ファイル、84/84 TAP PASS、FAIL 0、skip 0、exit 0** |
| 証拠整合の独立実行 | 3件の最新 result.json がPASS、42ソース参照SHA256・17枚PNG SHA256一致 |
| 設定網羅性・限定ゲート | **SCOPED_LOCAL_REGRESSION_PASS、exit 0** |
| 全設定・全業務組合せのゲート | **NOT_FULLY_VERIFIED、exit 1**（故意の未完了判定） |
| auto-discoveredテストファイル | **219**。既存ファイルへの追加なので分母は変わらない |
| 現行219ファイルFULLの通しPASS | **219/219 PASS、FAIL 0、再利用0、skip 0、exit 0**。第三回の全件新規実行で取得 |
| 正式実機QA | **NOT_RUN、PASS 0、FAIL 0** |
| ソースのコミット・push・本番反映 | **未実施**。GitHub Actions不使用 |

証拠：`test-results/qa-modernization/config-highrisk-triple-20261120-combined-regression.log`、設定・業務ゲート自体の `config-highrisk-triple-20261120-gate-regression.log`、独立検証結果 `config-highrisk-triple-20261120-validation.json`。同ディレクトリに検証プログラム `config-highrisk-triple-20261120-verify.mjs` を保存した。

## 2. 追加業務ケースとSQLオラクル

既存ファイルへ追記し、元のOwner権限編集UI、社員の本人認証、同一v3セッション、元のGateway、店舗別物理SQLiteを再利用した。**権限チェックのON/OFFだけをテストしたのではない**。変更後に実ボタンで業務を起動し、拒否時の全関連台帳不変と許可時の金額・数量・明細・監査の正しさを照合している。

### A. 領収書・支払訂正・全額返金（6新規）

原本：`test/auto-ci/configuration-cross-live-receipts-settings-users-browser.test.mjs`。追加後16/16業務PASS（Node TAP親込み17/17）。

1. 「支払訂正」実モーダルで理由未入力を拒否：Gateway RPCなし・DB不変。
2. 訂正画面を開いたまま管理者が権限取消し、本人が保存：Gateway拒否、領収書・訂正履歴・返金・監査・コミッション台帳の全SQL不変、ボタン復帰。
3. 権限復帰後に現金→カードへ実訂正：元の金額・VAT・SC・割引・明細は不変、訂正履歴と監査ログが各1件、UIに訂正履歴が表示される。コミッションの再計算・取消は起きない。
4. 返金モーダルを開いたまま権限取消し、全額返金ボタン：Gateway拒否・返金伝票0件・全関連SQL不変。
5. 権限復帰後に実返金：元伝票は変更せずマイナス伝票を1件作成。支払方法は訂正後のカードを引継ぎ、返金リンク・監査・コミッション逆符号と整合。
6. 返金後の画面では同一伝票の再返金・再訂正ボタンは非表示。処理済み訂正IDを異なる訂正へ再利用した不正要求を拒否し、**さらに新しい訂正IDでも返金済み伝票の再訂正を拒否**（`payment_correction_refunded`）、全台帳不変。

商品UIの成功ダイアログをテストが閉じる前に次のボタンを押していたため、初回実行では操作を妨げるテスト手順誤りが発生した。正しい操作としてダイアログをクリックして閉じるよう変更し、既存10件＋新規6件を再実行して全PASS。**商品ソースへの修正はしていない**。

### B. 在庫入荷・廃棄・棚卸（6新規）

原本：`test/auto-ci/configuration-cross-live-inventory-menu-browser.test.mjs`。追加後18/18業務PASS（TAP親込み19/19）。

1. 権限付与中に在庫を実画面で登録（10本、単価8.5）。入荷画面＋5、原価12.5を保存→現物理DBの在庫15・単価12.5、在庫変動履歴に入荷1件と一意な要求ID。
2. 管理者が在庫権限取消後、廃棄数量3・理由つきで実ボタン→Gateway拒否、在庫・履歴テーブル不変。
3. 復帰後に廃棄数量3が成功→在庫12、廃棄履歴−3が1件、理由と単価を照合。
4. 再度権限取消中に棚卸8→Gateway拒否、DB在庫・履歴不変。
5. 権限復帰後に棚卸8を保存→在庫8、棚卸差分−4が1件、単価不変。
6. 一覧と「変動履歴」を再読込し、入荷＋5・廃棄−3・棚卸−4と3種類の一意な処理ID、別店舗の在庫・履歴不変を確認。

既存SQL仕様は仕入原価の見積を `ROUND(数量 × 単価)` で履歴へ記録する。最初のテスト期待値62.5が実際の63と異なっていたため、**既存仕様に沿ったオラクル**へ修正し再実行。商品DBの単価12.5と数量は正確なまま。なお物理計数・カメラ・倉庫実物は別ゲート。

### C. 注文取消承認ON/OFF・在庫復元（6新規）

原本：`test/auto-ci/configuration-cross-live-admin-order-entry-browser.test.mjs`。追加後14/14業務PASS（TAP親込み15/15）。

1. 管理者が実設定画面で「注文取消にマネージャー承認必須」をONとして保存。関連在庫10本を用意し、実注文管理から提供すると在庫9・消費履歴−1になる。
2. 実取消画面で理由空欄のままボタン操作→API未送信、注文・在庫不変。
3. 取消画面を開いたままadmin権限を取消し、同じ本人ログインで実取消ボタン→Gateway拒否、注文未取消・在庫9のまま・監査0件。
4. 権限復帰後、承認ONのまま取消→注文取消・在庫9→10・返却履歴＋1が1件・監査にマネージャー承認者を保存。
5. 管理者が実設定画面で承認OFFを保存。次の注文を提供し取消→在庫が1個だけ戻り、監査には明示的に承認者なし。
6. 同一注文の再取消APIは拒否され、監査・在庫返却が二重に増えない。別店舗の注文・在庫・変動履歴も不変。

外部支払・全額返金等の処理とは別。**承認ONを一般社員＋別人の資格情報で実施する組合せは今回新規追加していない**ため、今後の横断残件。

## 3. 既存の網羅性ゲートも実ケースまで拡張

既存 `scripts/qa-modernization/configuration-coverage-status.mjs` の3レーンについて、新規ケースIDの全登録、各ケースの業務根拠フィールド、管理者権限切替回数、スクリーンショットSHA256、ソース現在性の検証を追加した。**「件数だけ増やしてPASS」の修正はしていない。**

| レーン | 新しい期待・現行LOCAL_PASS |
|---|---:|
| 在庫・商品・予約 | **18/18** |
| 設定・ユーザー・領収書 | **16/16** |
| 注文管理・注文登録 | **14/14** |

全レーンの意味判定がPASSした場合だけ、新規18件を `CONFIG-CROSS-01` の集計へ加える構造へ変更。既存の代表実UI書込み業務の証拠件数は**113**（各画面ケースの数であり、画面数ではない）。実行結果 `config-highrisk-triple-20261120-scoped-strict-final.log` と `config-highrisk-triple-20261120-full-strict-final.log` を保存。限定ゲートexit 0、完全ゲートexit 1。別の検証プログラムがこの判定とケース・画像を照合し、独立検証PASSを返した。

さらに既存の国別6か国×税/SC/端数方式テストと、業務Web要件の「証拠欠落や旧ソースをPASSとして認めない」回帰を併せて実行し、**84/84 TAP PASS**。ゲートの検証コードの変更だけを根拠にした架空のPASSではない。

### 前回のFULL219結果を改竄していない

前回のFULL219は**2回とも218 PASS・1 FAIL**。この履歴と診断を上書きせず保存した。今回の第三回は、一般スタッフの別承認ケースを追加した**後**の219ファイルを全件新規実行し、**219/219 PASS、FAIL 0、exit 0**。既存の失敗対象2ファイルも、この同一FULL実行でPASSしている。ただし、過去の一過性の設定初期化タイムアウトの根本原因までは確定できていないため「障害再発防止を完全実証した」とは主張しない。

## 4. 継続して残るリスク・別のQAゲート

CONFIG-CROSS-01〜06の**全設定×全権限×全業務組合せはまだ未網羅**。代表の書込み権限検証25/28画面という過去の集計は、今回既存3画面内の操作を増やしただけなので無根拠に28/28へ昇格しない。未網羅の各画面の個々の全アクション、一般社員・マネージャー別人承認、複数店舗での同時取消、VIP・SC・税・コミッション・返金・在庫が同時に絡む境界、実PSP・物理印刷・APNs/FCM・OSカメラ/GPS・実回線断・本番D1/R2は別途。

**正式実機QA：NOT_RUN、PASS 0、FAIL 0。** この作業でコミット、push、Worker/Web/DB本番反映、GitHub Actions実行は行っていない。他の既存未コミット資産は保持した。

## 5. 追加継続：一般スタッフと別人承認者（2026-11-20）

前項で未網羅とした「一般社員が注文取消しを試み、マネージャー本人の承認資格情報を入力する」実務シナリオを、既存の `configuration-cross-live-admin-order-entry-browser.test.mjs` に6件追記した。既存Owner画面での権限切替、一般スタッフとしての実ログイン、注文管理の取消モーダルと実Gateway・SQLiteを使用し、**追加6/6、同ファイル全20/20業務ケースPASS（Node TAP 21/21 PASS）**。

| ケース | 実操作とSQL期待条件 | 結果 |
|---|---|---|
| STAFF-LOGIN-APPROVER-INPUTS | スタッフで実ログインし、管理者がadmin画面権限を付与。提供済み注文の取消画面に別承認者ID・パスワード入力欄が表示。提供時に在庫10→9 | LOCAL_PASS |
| STAFF-BAD-APPROVER-PASSWORD | 正しいマネージャーID＋誤パスワードで取消。注文・在庫・在庫履歴・取消監査の全SQL不変 | LOCAL_PASS |
| STAFF-OTHER-TENANT-APPROVER | 別店舗に実在するマネージャーの正しい資格情報で取消を試みる。店舗スコープ不一致を拒否し、全SQL不変 | LOCAL_PASS |
| STAFF-APPROVED-COMMIT | 店舗内マネージャーによる承認後、実UIから取消成功。注文「取消」、在庫9→10、戻し＋1が1件。監査の操作人「スタッフ」、承認人「マネージャー」を別々に検証 | LOCAL_PASS |
| STAFF-REVOKED-DENIED | 取消画面表示後に実Ownerの権限チェックをOFF。正しい承認情報でもスタッフ本人に画面権限がないためGateway拒否、台帳不変 | LOCAL_PASS |
| STAFF-RESTORED-COMMIT | Ownerが権限を再付与。スタッフは再ログイン不要で同一v3トークンから取消成功。返却1件・監査1件、別店舗の履歴は不変 | LOCAL_PASS |

ケース名プレフィックス `ORDERS-VOID-`。結果 `test-results/qa-modernization/configuration-business/cross-live-admin-order-entry-*/result.json`、8枚の実画面キャプチャとそれぞれのSHA256。独立の `config-regular-staff-approval-20261120-verify.mjs` は、現在のソース15ファイル・画像8枚・ケース期待条件を再チェックして **PASS** を記録した。監査プログラムの登録ケースを旧14→**20**へ増やし、staff権限切替の3回分と6件の成果フィールド、8枚の画像も検証対象化した。

設定網羅性の限定ゲートは `SCOPED_LOCAL_REGRESSION_PASS`（exit 0、対象レーン20/20）、完全ゲートは `NOT_FULLY_VERIFIED`（exit 1、正式実機QA 0）。前回の18件と合わせ、この拡充作業での新規ケースは**24/24 LOCAL_PASS**、既存3レーン合計は16＋18＋20＝**54/54業務ケースPASS**となった。219ファイル全件の通し成績とは別の数値である。

## 6. FULL219第三回の最終結果と独立検証

既存コマンド `node scripts/ci/run-auto-discovered-tests.mjs` をGitHub Actions・合格キャッシュ・並列実行なしで起動し、219ファイルすべてを新規実行。**219 PASS / 0 FAIL / 0 deferred / 0 reused / exit 0** を記録した。ランナー記録上の `selected=219`、`fresh=219`、`exclusive=219`。このランのS4・S5双方、過去2回の別々の失敗ファイル、一般スタッフの実UI承認ケースもPASS。

| 監査項目 | 確定 |
|---|---|
| FULLログ | `test-results/qa-modernization/auto-discovered-full-219-20261120-staffapproval.log` |
| プロセス終了コードの記録 | `auto-discovered-full-219-20261120-staffapproval-exit.json`：exitCode=0 |
| FULL前のソースハッシュ | `full219-20261120-source-before-staffapproval.json`：**625ソース** |
| 既存の独立検証プログラム | `node test-results/qa-modernization/full219-20261120-verify.mjs --staffapproval` |
| 独立検証結果 | `auto-discovered-full-219-20261120-staffapproval-validation.json`：**PASS、219/219、0 FAIL、625ソース変更0** |
| スタッフ別承認独立検証 | `config-regular-staff-approval-20261120-validation.json`：**PASS、20/20、ソース15・画像8 SHA256一致** |
| 監査ゲート | scoped-strict **exit 0**、full strict **exit 1（未網羅のまま）** |
| 本番・実機 | 正式QA **NOT_RUN、PASS 0 / FAIL 0**。GitHub Actions、本番Worker/Web/DB、外部決済・プリンタ・プッシュは未実行 |

ローカル実行結果の合格と、全設定網羅の正式な完了を混同しない。今回の検証に伴うソースの**コミット・push・本番デプロイは実施していない**。
