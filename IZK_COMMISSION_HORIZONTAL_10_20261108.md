# SC・歩合・スタッフ報酬 横展開10観点監査（2026-11-08）

## 完了条件・検証区分
- 現行 Native/Web 本番/Web TEST のユーザー向けSC・歩合の設定画面が二重に存在しないこと。
- 従来の1件のメニューマスタ・従業員マスタ・報酬台帳を継続して使用すること。
- 変更時のスタッフ情報やドリンク設定の意図しない上書き、店舗跨ぎ書込を拒否すること。
- 10回は同一テストの反復ではなく、異なる業務境界を個別に調べる。

## 横展開10回の確定結果

| 回 | 調査観点 | 確認・対応の証拠 | 判定 |
|---:|---|---|---|
| 01 | 店舗設定 | Native/Web本番/TESTの `settings.html` から報酬設定と古いJS読込を撤去。SC徴収率は店舗設定のまま | PASS |
| 02 | 従業員管理 | 3版の `users.html` からSC対象編集を撤去。従来の従業員ID・DBフラグは保持 | PASS |
| 03 | 商品コミッション | 3版の `menu_editor.html` から通常の商品歩合対象チェックを撤去。報酬画面の商品一覧で編集 | PASS |
| 04 | 分配率・機能スイッチ | 各報酬ページの3機能ON/OFF、SC分配率、対象ユーザー一覧の一意性 | PASS |
| 05 | 3つの配布面 | `commission-app.js` は Native/Web本番/TEST でバイト一致。Webには専用戻る導線を提供 | PASS |
| 06 | SC更新API | `saveCommissionScEligibleStaff` は管理職以上・同一store_id・対象ID検証。SCユーザー取得と会計担当取得で従業員スナップショットを共有 | PASS |
| 07 | 商品マスタ | `getOrderedAdminMenuRows` を共通利用、商品・ドリンクフラグを `saveCommissionDrinkItems` で部分更新。サンプル除外、他店舗拒否。新メニューマスタを作らない | PASS |
| 08 | 注文入力 | コミッションモードと受取スタッフ選択はスタッフ注文処理に残す。一般顧客の公開QR画面に従業員一覧を返さない | PASS |
| 09 | サービス料 | お客様のSC徴収 (`serviceRate`) と従業員へ渡す割合 (`commissionScStaffSharePercent`) を分け、後者をSCタブのみで編集 | PASS |
| 10 | 計上済み報酬 | 既存の会計時スナップショット、後付け伝票担当割当、支払、返金取消の専用台帳・処理を維持 | PASS |

固定テスト：`node --test test/auto-ci/commission-horizontal-consolidation-10.test.mjs` = 10 PASS / 0 FAIL。

## 付随する具体的修正
- `src/commissionDrink.js` に通常の商品歩合対象を同じ既存商品マスタの属性として追加。更新する項目だけを送るため、商品の歩合対象変更がドリンク対象／追加料金を巻き戻さない。
- `mobile-app/web/commission-app.js` に商品歩合対象とドリンク対象の独立チェックを表示。3つの配布面で共通実装を使用。
- SC担当・ユーザー表示のDB取得を二重に発行せず、同じ同一テナントスナップショットを使用。
- 旧 `commission-drink-settings.js` は旧キャッシュ済みHTMLとの互換のため静的ファイルとして保持。ただし最新の設定ページでは一切ロードせず、現行の二重編集画面ではない。
- `saveEmployee` と `saveMenuItem` が従来持つSC・商品歩合フラグの互換受理は、すでに配布済みのクライアント向けバックエンド互換処理。最新UIからは送信しない。

## 追加統合の判断・実施（同日追記）
- **「追加料金をスタッフ報酬対象にする」はユーザー判断により廃止**。レディースドリンクで代替できるため報酬画面へ移設しない。3版のメニュー編集チェック・個別率・選択時の旧ロジックを削除。
- 全注文画面で旧オプションを非表示とし、古いキャッシュ／アプリからの注文指定はサーバーで拒否。旧メニュー保存時にも当該グループを除外する。一般のサイズ・トッピングの追加料金処理には影響させない。
- 会計済みのオプション報酬は過去の帳簿と返金逆仕訳として保持。会計後に旧オプションの報酬担当を付け替えるUI・RPCは廃止。`test/auto-ci/commission-retired-option-boundary.test.mjs` で再導入を検知する。
- 店舗側のサービス料徴収率、スタッフマスタの時給、および注文時の受取スタッフ指定は業務目的が違うため移設対象外。

## 検証・反映の境界
- `commission-horizontal-consolidation-10` 10/10 PASS（静的横断）。
- 先行統合時の `commission-feature-option-ledger`、`commission-workspace-configuration`、`commission-sc-eligible-staff`、`commission-drink-shared-ui-contract`、`commission-receipt-assignment` は55/55 PASS。旧機能廃止後は期待結果を「旧オプション拒否／ドリンク計上／歴史的返金保存」に切り替えて再実行する。
- 既存の会計APIスモーク572件PASS、Native管理画面ナビゲーション192件PASS、SQL呼出し監査PASS、360px ChromeレンダリングPASS。
- これはソースとローカル検証。正式実機のPASS／FAIL台帳には算入していない。現在のタスクではcommit/push/Worker deploy・本番D1適用は実施していない。
