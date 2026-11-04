# IZK-UT-099 — 初期設定チェックリストだけ日英が混在する

2026-10-25 / iPhone TestFlight画面報告。「はじめの設定」「設定を確認」は日本語、チェックリストの「Required: start with one device」「Basic store setup complete」など9文言が英語。「なったりならなかったり」する再現性の低い事象。

## 根本原因

- `mobile-app/web/index.html` / `manage.html` の `renderSetupChecklist()` は `getAllMenuForAdmin` と `getAllEmployees` の2本の非同期RPCが完了してから文字列を `innerHTML` へ挿入する。
- 以前の実装は `setupT(key)` で**挿入した瞬間の言語**を選ぶだけで、挿入後の要素に `data-t` 属性がない。
- 既存 `i18n.js` の `apply()` は `[data-t]` のみ翻訳し直す。静的見出しは `data-t` を持ち日本語に変わるが、非同期作成したリストだけ以前の英語を表示し続ける。
- 手動変更・店舗既定言語の後着・端末言語・RPC完了の順序次第で再現したりしなかったりする。国別税率や現在の店舗通貨が直接の原因ではない。

## 修正

非同期で生成する9文言（`setupRequiredTitle`, `setupBasicDone`, `setupMenuTask`, `setupOptionalTitle`, `setupQrTask`, `setupKitchenTask`, `setupPrinterTask`, `setupStaffTask`, `setupGuideTask`）に、既存の全画面共通 `data-t` 翻訳属性を追加。`setupT` による初回表示はそのまま保ち、以後の `I18n.apply` が静的見出しと同時に再翻訳する。新規RPC、独自翻訳機構、時間待ち、ページ再読み込み、端末/店舗言語設定の書き換えは**不要**。

## ソース再レビュー10観点

1. 対象が非同期で生成されることを実コードで確認。
2. 従来の9個の `setupT` キーを変えない。
3. 必須カテゴリ見出しは `data-t` へ登録。
4. 店舗基本設定完了は `data-t` へ登録。
5. メニュー登録タスクは `data-t` へ登録。
6. 任意カテゴリ見出しは `data-t` へ登録。
7. QRと厨房タスクを `data-t` へ登録。
8. プリンタとスタッフタスクを `data-t` へ登録。
9. ガイドタスクを `data-t` へ登録。
10. 認証トークンの新旧保護、RPC回数・権限表示、URLの遷移先、メニュー1品以上で消える仕様を維持。

## 横展開10シナリオ（index / manage 各10件）

実コードの `renderSetupChecklist`、実 `i18n.js`、実日英辞書、Chromiumを組み合わせた `node --test test/setup_checklist_language_regression.test.mjs`:

1. 初期英語表示。
2. 英語生成済みリストを日本語へ手動切替。
3. 最初から日本語店舗既定言語。
4. 英語生成後に非同期の日本語既定が到着。
5. 日本語手動選択が後続の英語既定より優先。
6. RPC応答未着中に日本語へ切替。
7. RPC応答未着中に英語へ切替。
8. 日本語→英語→日本語の反復切替。
9. 日本語生成後に英語店舗既定が到着。
10. 権限縮小による項目部分表示でも日本語へ切替。

すべての表示状態で、共通ヘッダーと動的リストの言語、要素キーと翻訳文、正常な既存遷移URL、言語切替で新たなRPCが発生しないことを検証。**20 PASS / 0 FAIL**（ローカルブラウザ実行）。これは正式iOS/Android実機QA判定ではない。

## 次工程と区別

配布資産への `mobile:sync` とSHA照合、TestFlightビルド配信、iPhone再実機確認、正式QA記録はそれぞれ別の作業であり、完了したものだけを結果報告する。
