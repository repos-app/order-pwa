# QA2-UI-receipts：360 CSS px 現行ソースの独立Chromium観測

対象公式FAIL：QA2-UI-receipts、署名APK910015。返金ステータス・品目・リンクと操作ボタンが会計カードの右端で切れるとの真正実機所見。公式FAILは維持。

## 実測

`node --test test/izk_receipts_360_browser_regression_test.mjs` → exit0、3/3 PASS。Chrome/Chromium headless、モバイルviewport 360 CSS px、DPR2、touch。実HTMLのstyleを保持し、認証なしのローカルfixtureにリアルな長文返金状態、領収書への参照リンク、再印刷・返金ボタンを挿入した。HTML中の認証/API scriptは実行しない。画面画像は `test-results/izk-receipts-360-*.png`。

| 面 | document/body scrollWidth | 表の局所scrollWidth/clientWidth | max scrollLeft到達 | 長文返金リンクの完全表示 | 右端再印刷ボタン |
| --- | --- | --- | --- | --- | --- |
| Native mobile-app/web | 360/360 | 760/294 | 466/466 | scrollIntoView後 [32.6,190.7] within [33,327] | [115.7,245.2] |
| Web PROD docs/yuwaku | 360/360 | 670/294 | 376/376 | [32.6,119.6] within [33,327] | [115.5,245.0] |
| Web TEST docs/yuwaku/test | 360/360 | 670/294 | 376/376 | [32.6,119.6] within [33,327] | [115.5,245.0] |

数値はCSS px。浮動小数の端数差は1px許容。表の760px min-widthは意図した横スクロールであり、本文横溢れの不具合ではない。返金リンク、最右列操作が局所スクロールによって表示されることを観測した。Nativeの返金バッジは156.6px、Webのバッジは88pxであり、後者の表示文言が短い可能性を含め、バッジ内文字のクリップ、実データの折返し、スクリーンリーダー、リンクの業務遷移結果はこのfixtureでは正式証明していない。

## 限界と判定

現行3ソースの**本文横溢れゼロ／独立表スクロール／右端操作到達／長文リンクのスクロール可視性**は具体的に立証できた。一方、署名APK910015の旧FAILは真正端末証拠であり、現在のHTML/CSSをそのビルドが含んだ証拠はない。ログイン済みの `header.js` と実APIデータ、返金実行、日英・長文組合せおよび全ケース受入条件は未検証。分類は「現行ソースの一部観測点は安全、正式ケース全体はUNKNOWN・FAIL維持」。未修正の原因箇所を示せないため共有dirty HTML3面を推測で書き換えていない。

次の正式実機QA担当は、新しい署名版に本ソースを同梱した証明を取得し、長文領収書／返金リンク／ステータス／スクロール終了位置での再印刷・返金操作と全legacy assertionsをPlaywrightで検証する。
