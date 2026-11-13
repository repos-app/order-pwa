# izakanpai 画像検索「モエエシャンドン」実API検証（2026-11-07）

## 検証範囲
- 本番公開API `https://izakanpai-api.izakanpai.workers.dev/?api=1`
- 既存のQA用DPAPI保管済み `teat-admin` で正常ログインし、アプリと同じ `action=rpc,fn=searchMenuImages,args=[query]` を実送信。
- 中央サービス経由の実Pixabayを呼び出し。モック、画面だけの検索結果、Web検索代用ではない。
- QA店舗 `teat` での実行であり、`yuwakubar` 本番利用者のログイン・画面操作は未実施。検索関数とPixabay共通キー・リクエスト条件は共通だが、店舗別キャッシュ状態は異なる。

## 実測
| 入力 | 実RPC応答 | 内容 |
|---|---|---|
| モエエシャンドン | success=true, items=0 | 画像なし |
| Moet Chandon Imperial Brut champagne bottle | success=true, items=15 | 全15件目視確認。Moët & Chandon Impérial Brutの正面商品画像は0。候補は一般的なシャンパン写真・他ブランド等。 |
| Moet Chandon | error=image_search_rate_limited | 429 |
| Moet champagne bottle | error=image_search_rate_limited | 429 |
| champagne bottle | error=image_search_rate_limited | 429 |

- 英語長文検索の実RPC時間は約1.23秒、後続429応答は約0.6秒。
- 確認したプレビュー例: [候補1](https://pixabay.com/photos/sparkling-wine-spirits-bottle-7679665/) は別銘柄のボトル＋シャンパングラス、[候補2](https://pixabay.com/photos/champagne-restaurant-ice-gastronomy-4736380/) はシャンパンのアイスバケット写真。
- `izakanpai-teat` の正式D1読み取り: 2026-11-07T13時UTCのPixabay API呼出記録5件、最終HTTP 429、provider報告limit=100/remaining=98。残枠98でも429が発生したため、429を単純な100回消費と断定できない。
- ローカル証跡：`test-results/image-search-moenov07/`（15件の画像・URL一覧・一覧画像）。画面・QA用サービスの実呼出のみで、注文・商品等の業務データは変更していない。検索用キャッシュ・利用回数カウンターは通常RPCとして更新。

## 結論
- 現行Pixabay検索はブランド商品を探すデータソースとして不適切。英語への変換だけでは改善不十分であることを実画像15件で再現。
- 新しい検索APIやAI再ランキングを使う将来方式は**未実装・未実行**。一般Web画像検索ではモエの正面商品写真が見つかるが、それはアプリでの採用・保存・権利確認を証明しない。
- 今後の完了条件: 提案する新検索APIをアプリの実RPCパスに接続し、同一入力で商品一致・ブランド正確性・利用権限・429復旧を実測してから採用判定する。
