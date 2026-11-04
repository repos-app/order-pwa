# Android QA 未承認レシピの静的レビュー（2026-10-11）

## 対象と判定原則

`.android-qa-prepared/recipes/*.json` の `approved:false` は現時点で **13件**（依頼文の12件より1件多い）。以下は13件すべての `mobile-app/web/*.html` 実装を突き合わせた静的レビュー。**いずれも自動承認しない**。フォーカスやドロップダウンを開くことの安全性と、ケース全体をPASS証明できることは別であり、承認には画面・端末・表示・横向き・IMEを個別確認する必要がある。対象レシピやrunnerは一切変更していない。

| Case ID | 実画面・対象 | リスクと判定 | 承認前の具体的な準備 |
|---|---|---|---|
| PT-CTL-0051 | `clock.html` `mMemo` | **条件付き候補**。打刻ダイアログ内のテキスト。値の取得は `__punch` 時のみ、フォーカス自体に保存イベントなし。カメラ/GPS付き打刻は厳禁。 | 正規の打刻可能ユーザーのモーダル表示を確認し、タップ対象を `mMemo` に固定。打刻ボタン、撮影・GPS処理を操作しない。 |
| PT-CTL-0083 | `data_admin.html` `delPhrase` | **高リスク・保留**。全件削除の確認文言で `oninput=onDelPhraseInput` により削除ボタンが有効化されうる。フォーカス単独は保存しないが、誤操作の影響大。 | 自動対象から除外。破壊的領域を隔離したモック/非本番fixtureで検証し、`doDelete`・削除ボタンへの到達不可を証明する。 |
| PT-CTL-0140 | `inventory.html` `mvQty` | **条件付き候補**。入出庫・廃棄・棚卸モーダル内の数量。直接保存は `doMove` の `receiveStock/logWaste/stocktake` 呼び出し。 | 既存商品でモーダルを安全に表示し、数量入力・`mvGo` を触らず焦点のみを検証。 |
| PT-CTL-0142 | `inventory.html` `mvCost` | **条件付き候補**。入荷タブのみ表示。`doMove` 時には単価更新を伴いうる。 | 入荷タブの表示確認、`mvCostWrap` 可視性の事前検証。入力値変更・実行ボタンを禁止。 |
| PT-CTL-0143 | `inventory.html` `mvReason` | **条件付き候補**。廃棄タブのみ表示。`mvReasonWrap` は通常 `display:none`。 | 廃棄タブを安全に選び、実際に可視となったことを確認してから焦点のみ確認。`logWaste` を呼ばない。 |
| PT-CTL-0204 | `menu_editor.html` `mCatNew` | **非表示・保留**。初期 `display:none`、`mCat` で「新規」選択時のみ表示。保存は `save()` 内。 | 安全なカテゴリ切替で新規欄を表示し、既存商品のカテゴリを変更しないこと、`save` 非実行を事前に証明する。 |
| PT-CTL-0208 | `menu_editor.html` `mCatEnNew` | **非表示・保留**。初期 `display:none`、`mCatEn` の「新規」選択で表示。 | 英語カテゴリ欄が可視になる前提条件と未保存状態復元を確認。保存操作なしのフォーカスだけを許容する別レビュー。 |
| PT-CTL-0261 | `printers.html` `printLangSel` | **自動選択不可**。`onchange=savePrintLang()` は `rpc('saveSettings', [{printLang:next}])` を実行する。 | 選択値を一切変更しない検査専用方式を設計し、ネイティブ選択UIのキャンセルまで証拠化。現状は未承認を維持。 |
| PT-CTL-0267 | `printers.html` `logoScale` | **自動フォーカス保留**。`oninput` と `onchange` の `saveLogoScale()` は400ms後に `saveSettings` を送信。 | 単独フォーカスで input/change が一切発生しないことを独立確認し、タイマー未設定を保証。値の編集・キーボード確定・blur変化を避ける。 |
| PT-CTL-0268 | `printers.html` `btProfileScope` | **非表示・副作用あり**。親行 `display:none`、変更時 `btChangeScope()` がBluetooth切断、localStorage変更。 | UI露出条件の分析と接続状態の隔離が必要。ドロップダウン選択を自動実行しない。 |
| PT-CTL-0269 | `printers.html` `btDevice` | **非表示・機器依存**。`btDeviceRow` は検出まで `display:none`。選択自体は接続しないが、実機スキャンと機器識別情報を扱う。 | 仮想デバイスfixtureでオプション描画を確認。実機スキャン・接続・再接続・テスト印刷を行わない。 |
| PT-CTL-0392 | `purchasing.html` `poPickSel` | **条件付き候補**。ピッカーモーダル内のselect。変更ハンドラなし、確定ボタン `confirmPoPick()` が行追加。 | `openPoPicker` で表示と選択肢ロードを確認し、選択の変更は保存せず、確定ボタンには触れずにキャンセルする。 |
| PT-CTL-0528 | `support.html` `supportSend` | **条件付き・既存実装専用**。空メッセージならclick処理が即時returnし、送信なし。ただし内容があるとAPI認証・送信へ進む。 | 空文字であることをクリック直前・直後に検証。既存 `support-empty` ハンドラー以外ではクリック禁止。フォーカス/selectとは別種別。 |

## 横断的な安全条件

- `approved:false` は一件も変更しない。`approvedQueue` に未承認候補が入らないことを維持する。
- SELECTは単に開く場合でもシステムUIで変更が確定しうる。`onchange`、Bluetooth接続、RPC/保存、機器識別情報への副作用を優先して遮断する。
- フォーカス判定は対象が実際に可視・操作可能であることを必須とする。非表示フィールドを無理に表示するスクリプト操作は正式実機証明ではない。
- いずれのレシピもケース全体の合格（狭幅・縦横・IME・スクロール・ラベル・値の完全性）には独立した画面証拠が必要。静的レビュー結果だけでPASSや自動承認を発行しない。

## 照合箇所

`mobile-app/web/clock.html` (63, 159, 175-181)、`data_admin.html` (79-82, 255-283)、`inventory.html` (71-82, 253-282)、`menu_editor.html` (94-97, 426-452)、`printers.html` (104, 134, 144-153, 303-317, 366-377)、`purchasing.html` (119-123, 176-205)、`support.html` (42, 88-93)。行番号は本レビュー時点の参照位置。
