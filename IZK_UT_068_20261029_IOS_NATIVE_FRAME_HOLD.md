# IZK-UT-068 再発: iPhone画面遷移の白フレーム (2026-10-29)

## 入力、根因、完了条件

- User iPhone video ScreenRecording_10-29-2026 16-54-39_1.mp4: 6.97秒、30fps。0.75秒付近にほぼ白のフレーム、4.8〜5秒付近に画面再描画の途切れを確認。
- 10/24、10/26、10/28の対策はcanvas色・cross-document View TransitionとCSS opacity/animationの調整。実Chromium回帰は成功していたが、WKWebViewで旧画面の保持が続く保証がなく、実機PASSにはなっていなかった。
- 新対策: iOS native WKWebViewの旧フレームをアプリ内メモリで保持し、移動先Documentのpageshow後2回のrequestAnimationFrameで解除。cancel/failure時は1.8秒で確実に解除。Capacitor既存navigationDelegate、認証、書込みガード、画面ルーティングは変更しない。
- **SOURCE修正のみ完了**。Windows上でのJS・ソース契約の回帰はPASS。Swiftビルド・署名IPA・TestFlight配信・iPhone実機確認は未実施。正式QA PASS増分0。

## 差分とSOURCE検証

- ios/App/App/BridgeViewController.swift: 既存Bridge内へ独立した弱参照WKScriptMessageHandler、atDocumentStartのpointerdown/clickメッセージ、UIKit snapshotView、painted時解除、1.8秒fail-safeを追加。画像を永続化しない。
- test/izk_ut_068_ios_native_frame_hold_test.mjs: WebKit独自のcapacitor:// URLはURL.originがnullになりうるため、protocol/hostの比較で同一アプリを判定。内部リンク・共通戻る・非対象外部リンク・同Document hash・mutation中を検証。
- test/project-test-commands.jsonに共通テスト登録。
- 既存068、095、079と新068の合同回帰 **12 PASS / 0 FAIL / exit0**。初回の独自scheme判定1 FAILを修正後に再実行。pipeline契約は **198 ordered steps登録PASS / exit0**（198件実行ではない）。git diff --check PASS。

## 自己ソースレビュー S01–S10

| 観点 | 確認と状態 |
|---|---|
| S01 録画 | 0.75秒/5秒の異常フレームを動画で確認 |
| S02 履歴 | 過去3回の対策と今回のCSS依存限界を比較 |
| S03 共有入口 | StoryboardがBridgeViewControllerを利用することを確認 |
| S04 Delegate保全 | Capacitor標準delegateを上書きしない差分を確認 |
| S05 先行取得 | atDocumentStart、pointerdown captureを確認 |
| S06 保持面 | 同じWKWebViewにsnapshotViewを重ねることを確認 |
| S07 次画面 | pageshow→二重RAF→painted解除をfixture検証 |
| S08 失敗復帰 | 1.8秒failsafe・cleanupをsourceテスト |
| S09 書込み | API.isMutationPendingでcaptureを抑止するfixture検証 |
| S10 メモリ | handlerがownerをweak参照しsnapshotは解放される構造を検証 |

## 横展開ソースレビュー H01–H10

| 観点 | 確認と状態 |
|---|---|
| H01 管理→打刻 | clock.htmlの遷移を対象、実機PENDING |
| H02 打刻→管理 | clock.htmlの管理戻りanchorを対象 |
| H03 管理→ユーザー | users.htmlへの新Documentリンクを対象 |
| H04 ユーザー→管理 | users.htmlの戻りanchorを対象 |
| H05 共有戻る | header.jsの共通Back/Manage両ボタンも対象 |
| H06 独自scheme | capacitor:// 同一ホスト判定のsource fixture PASS |
| H07 除外リンク | 外部/別タブ/hash/mutation中は対象外のfixture PASS |
| H08 Web/PWA | Swift側のみ変更、Web prod/TESTは不変更 |
| H09 Android | NativeScreenHold.java を追加し横展開。Android実機の効果は未判定 |
| H10 既存回帰 | 068/095/079 + 新068のsource回帰12 PASS、実機は別判定 |

## 受入条件

新署名IPAをiPhoneへ配布後、管理↔打刻、管理↔ユーザー管理をそれぞれ反復録画。白/黒中間フレーム、ゴースト像、戻り操作の阻害がないことを30fps以上で確認。fail-safe後の操作可能性も確認する。正式PASS前にCLOSEDとしない。

## 2026-10-29 Android横展開

- Android NativeScreenHold.java: CapacitorのWebViewClientを変更せず、WebViewCompat.addWebMessageListenerをローカルorigin / main-frameに制限し、DOCUMENT_START_SCRIPT対応環境に仕込む。MainActivity.load()でCapacitor初回loadUrlより先に登録する。非対応端末では既存動作を維持する。
- Android専用のiz-screen-hold.js: 同一originリンク、共通戻る、キーボード操作のみを捕捉。外部・hash・別タブ・書込み中は除外する。
- Bitmapは端末メモリだけに保持し、次Documentのpageshow→二重rAF→postVisualStateCallbackで解除。1.8秒の強制解放とActivity終了時の解放を実施する。
- Android GradleコンパイルとRealme実機の表示・戻る・失敗時復帰はソース回帰とは別に確認する。正式QA PASSはまだ付与しない。

### Androidの確認状況（SOURCE）

- Android専用回帰4 PASS、iOS対策併走6 PASS、従来のクロスDocument Chromiumテストは単独実行で2 PASS。テストコマンド台帳は199手順の整合PASS。
- SDK 36 / Java 21 / ローカルGradleキャッシュを使った個別 `javac` で NativeScreenHold.java と MainActivity.java のコンパイル成功。後者は既存プリンターPluginをstubに置き換えた限定コンパイルであり、全APKビルドではない。最初のjavacで検出したVisualStateCallback抽象クラス、およびonDestroy公開範囲を修正済。
- Androidアプリ全体のGradleコンパイルは依然PENDING。SDKパス明示後も `@aparajita/capacitor-secure-storage` の `build/generated/res/resValues/debug` / `build/intermediates/incremental/debug/packageDebugResources` フォルダーを削除できないWindows/OneDriveロックで停止。プラグインの出力物は削除・変更せず、公式QAランナーには介入していない。
- Android実機Realmeによる管理↔打刻、管理↔ユーザー、共通Back、遷移失敗後1.8秒以内の復帰は未確認。SOURCEと正式QAの判定を分ける。
