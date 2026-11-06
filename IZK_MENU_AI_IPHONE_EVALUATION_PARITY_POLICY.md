# AIメニュー解析のGPT側評価：iPhone条件一致の必須ルール

## 目的

ユーザー指示（2026-11-05）：GPT側でAI解析精度を評価する場合、**iPhone実機のデータ経路・モデル設定・バージョン・判定条件と必ず一致させる**。条件が合っていない結果を「iPhone相当の精度PASS」として報告しない。

以前の `live-final-score.json` で記録した **55/55検出、49/55全項目一致** は、独立したWrangler Workerのモデル推論を使った **研究用評価**。元PDFの以前保存したページ画像をSharpでJPEG化し、ページ別の成功モデル結果を合成している。アプリがPDF.jsで画像化した同一のバイト列、iOS WebKit、公開Router経由の課金API、同一ビルド／Worker、1回の連続した55件保存は証明されていない。したがって過去の55/55をそのまま実機同等PASSとして引用してはいけない。

## iPhone実データ経路（正）

1. iOSアプリ内 `mobile-app/web/menu-ai-import.js` でユーザーが選択した **元PDFそのもの**をPDF.js（`vendor/pdfjs`）でページごとにレンダリングする。最大15ページ。ページの長辺は最大2400px、倍率の上限は3。
2. 同じWebViewのCanvasから `menuPageImageBase64()` がJPEGデータを作り、`menuRegionDetailImages()` が位置・edgeScore付きの拡大領域画像を作る。PDF.jsの `getTextContent()` から同一ページの文字情報 `sourceText`（最大6000文字）も取得する。
3. `API.post('rpc', {fn:'analyzeMenuImageWithCredits', ...})` から **base64、mimeType、pageNumber、sourceText、detailImages、requestId** が送られる。公開Router→共通Worker→店舗専用D1へ到達し、AIポイントの台帳と同じrequestIdで冪等性を確保する。
4. Workerは管理画面で公開済みの `menu_document_vision` と `menu_document_japanese` を読み、`src/menuDocumentImport.js::analyzeMenuDocumentPage()` を実行する。ページ状況によりGemma 4とMistralによる再確認の選択が異なる。
5. 全ページの成功結果を既存IDで回収し、`menu-ai-bulk.js` の商品判定を経て `saveMenuItem` のcreate-only登録処理に渡す。スリープ時の自動継続も同じID・同じ原本PDFを使用する。

## GPT側評価の必須一致項目

| 一致させるもの | 判定条件 |
| --- | --- |
| 元PDF | iPhoneが選択した**同じPDFバイト列**のSHA-256。見た目が似た過去の `menu.pdf` や別名ファイルを代理にしない |
| 画像化処理 | iPhone RPC送信時のページJPEGバイト列、その変換を行ったアプリcommitとPDF.js、JPEG/Canvasコードの版 |
| 拡大領域・文字情報 | `sourceText`、拡大画像全件、`bbox`、`edgeScore` の値・順序まで一致 |
| 入力RPC | iPhoneから実際に送った完全な解析入力ペイロード（認証やsecretは除外）のSHA-256とページ順序 |
| サーバー | 公開Routerと共通Workerの実稼働版、処理経路、認証・AIポイントルール |
| AI | 公開済みプロンプトの版**と本文SHA-256**、主モデル、ページ別再確認モデル、プログラムのpromptVersion |
| 実行単位 | 5ページは**1回の連続した開始→結果回収→登録**で評価する。別日/別モデルのページ別ベスト結果を合成しない |
| 判定の単位 | (a)商品検出、(b)英日名称・カテゴリー・価格の完全一致、(c)余剰行、(d)サーバー確定、(e)商品DB登録件数を別々に測定 |

## 実装済みのFAILゲート

`node scripts/menu-document-iphone-parity-gate.mjs <evidence.json>`

実iPhone RPCの原本入力ハッシュと、評価側がそのRPC入力をそのまま利用した証拠を比較する。JPEG、文字、詳細画像、モデル選択、プロンプト、Worker、ページ連続性が違えば `NOT_COMPARABLE`（終了コード2）。課金台帳や商品DBの実読戻しがなければ、OCR入力だけ一致しても**エンドツーエンド同等とは主張できない**。

このゲートは**マニフェストの値の整合性検査**であり、証拠の真正性を署名検証するものでも、AI再推論やiPhone実機の正式QAを代行するものでもない。現時点でiPhoneから全ページの送信ペイロードを取得した証拠がない評価は `NOT_COMPARABLE` とする。GPT側から実績として報告する場合は必ず版・入力の出所・正式QAかローカル評価かを明記する。

## 過去の評価の正確な扱い

- 2026-11-04 ローカルWrangler実AIモデル結果：抽出55/55、全項目49/55。ただしiPhoneと入力・版が違うため **LOCAL_MODEL_EVALUATION**。
- 2026-11-05 iPhone経由でyuwakubar本番D1に保存された結果：5ページ全成功、AI生出力57件、うち見出しSOJU・Chivas重複の2件。**そのまま**の同一正解データ評価は54/55マッチ・52/55完全一致。
- 保存済み57件を現行サニタイズ処理でオフライン再生：55件、55/55マッチ・53/55完全一致。ただし過去のDBを自動更新した結果ではない。手動再構成を「実機PASS」に計上しない。

同じiPhone操作を繰り返した結果のばらつきも別途測定する。単発の55件抽出だけでは継続的な精度保証にしない。
