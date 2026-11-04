# 注文管理「一部会計」非表示・操作停止｜SOURCE記録（2026-11-04 PHT）

## 要件

注文管理画面の一部会計を表示しない・操作できない状態にする。ただし一部会計の内部処理は残し、通常の全卓会計は継続する。対象の三面は Native元ソース mobile-app/web/admin.html、Web本番 docs/yuwaku/admin.html、Web TEST docs/yuwaku/test/admin.html。

共通方針：PARTIAL_CHECKOUT_UI_ENABLED=false。注文一覧の部分会計ボタンを生成せず、openPartial、goPartial、およびorderIds付きopenPay呼出しを表示/APIの手前で拒否。既存モーダル、注文ID選択、決済処理、JA/EN翻訳キーは削除せず保存。無効な案内を日英ヘルプから除去。配布キャッシュはNative v322→v323、Web本番 v293→v294、Web TEST v294→v295（いずれもソース変更のみ）。

## 自己レビュー S01–S10（それぞれ別の入口）

| ID | 入口・調査対象・結果 |
| --- | --- |
| S01 | 修正前のrender→ボタン生成を起点にした専用失敗テスト：flag欠落で期待どおりFAILを確認 |
| S02 | Native/Web本番/Web TESTの初期変数：全三面のOFF初期値を個別に確認 |
| S03 | 卓別レンダラのHTML出力：OFFでopenPartialボタンがDOM生成されないことを実コード評価で確認 |
| S04 | 元機能の再開可能性：明示ONにした実コード評価では一部会計ボタンが生成されることを確認 |
| S05 | 一部会計モーダル：OFFでopenPartialがfalseを返し、表示用classを追加しないことを確認 |
| S06 | 選択分を会計するボタン：OFFでgoPartialが選択入力読取および支払関数より前に戻ることを確認 |
| S07 | 直接のorderIds付きopenPay：OFFでAPIアクセス0件・会計モーダル表示0件を確認 |
| S08 | 通常のorderIdsなしopenPay：OFFでも会計preflightが成功することを検証 |
| S09 | 提供済/未提供/状態変更/オフライン・オンライン分岐：既存69ケースの会計検証を維持 |
| S10 | ヘルプ：旧一部会計案内がJA/EN両方から消え、後続説明の番号が連続することを確認 |

## 横展開レビュー H01–H10（独立した依存・配布経路）

| ID | 入口・依存先・判断 |
| --- | --- |
| H01 | Native資材生成スクリプト→mobile-app/web/admin.html：Android/iOSが同じ元ソースを利用 |
| H02 | Web本番入口→docs/yuwaku/admin.html：同型の非表示/三重ガード/ヘルプを実装 |
| H03 | Web TEST入口→docs/yuwaku/test/admin.html：本番と同型のガードを実装 |
| H04 | JA/ENのpartialキー→卓別表示：言語に関係なく非生成、定義は将来再開のため保持 |
| H05 | 店舗ロール・設定→注文管理画面：権限/プラン/店舗別のON条件を追加せず、統一OFF |
| H06 | オンライン/オフライン→openPay：注文ID付き部分会計は共通入口で拒否、全額会計を保持 |
| H07 | finalizeBill→src/billing.js：業務処理を削除せず維持、直接のAPI利用禁止は今回の仕様外 |
| H08 | 決済・割引・提供状態・領収書→通常会計導線：既存画面操作と対象回帰で非破壊を確認 |
| H09 | Native/Web本番/TEST→service-workerのadmin.htmlキャッシュ：三世代を個別に更新 |
| H10 | openPartial/goPartial/partModal逆引き→三種の注文管理HTML：他のレジ/QR注文画面は範囲外 |

## 検証・リリース境界

今回実行したSOURCE回帰：非表示27件、会計preflight69件、注文表示ブラウザ10件、共通ヘッダー46件、二段ヘッダー9件、既存UI保護12件、独立UI保護ゲートexit0。注文状態72件、割引17件、請求入力境界5件も別途PASS。いずれも**正式OS QA判定ではない**。広域mobile_navigation_testには既知の公開予約フォーム配置チェック失敗が残存。作業木のAPI/billing/offline現金処理に別担当の未commit修正があり、本案件に帰属させない。

**未実施**：commit/push、本番Web/Worker deploy、iOS/Android build、TestFlight配布、実機確認、正式QA ledger更新。正式PASS追加0。現物に反映されたとの報告は禁止。
