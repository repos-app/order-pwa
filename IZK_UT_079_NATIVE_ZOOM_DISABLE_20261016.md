# IZK-UT-079 — ネイティブPOS画面の拡大を停止（2026-10-16）

## 受付・原因・判断

- **依頼**：iPhone管理画面が大きく拡大され、ヘッダ・タイルが画面外へはみ出した画像を受領。「拡大機能は訳が分からなくなるのでやめてほしい」。画像のみからアプリのビルド番号、拡大経路（ピンチ／ダブルタップ／iOSのOSレベルズーム）は確定できない。これはIZK-UT-078「2行ヘッダの左右配置」とは別問題。
- **原因範囲**：`ios/App/App/BridgeViewController.swift` はiOSフォーカス時自動ズーム対策（16px）のみで、WKWebView自体のピンチ倍率を禁止していなかった。`mobile-app/web`44 HTMLは多くが`initial-scale=1`のみで`maximum-scale=1`なし。OSアクセシビリティの表示倍率はアプリから禁止できないため今回の制御対象外。
- **要求・スコープ**：izakanpai **Nativeアプリ** iOS/Android では1倍固定（ピンチ・ダブルタップ拡大なし）、画面間遷移・スクロール・入力フォーカス・タップ・多言語を維持。Safari/Chromeの通常Web/PWAや公開注文/予約サイトでの拡大はアクセシビリティ上維持する。
- **修正**：iOS CAP `BridgeViewController`で`webView.scrollView.pinchGestureRecognizer.isEnabled=false`相当、`minimumZoomScale/maximumZoomScale=1`を設定。`WKUserScript`のdocument-start/DOMContentLoadedでviewport metaの既存要素から旧拡大属性のみを除き`minimum-scale=1, maximum-scale=1, user-scalable=no`を再設定。`mobile-app/web/config.js`ではNative認定時のみ同じmeta制限を追加（通常Webはコードを実行しない）。`touch-action:manipulation`でダブルタップズームを止めつつ通常panとタップを維持。
- **関連する既存テスト**：`test/ios_release_readiness_test.mjs`の旧チェック「Native用HTMLはユーザー任意ズームを許す」という文言を、**Web用ソースHTMLは拡大可能、WKWebViewでは無効**の契約へ更新。個別HTML44ファイルは書換えていない。
- **正式状態**：`WAIT_TEST / LOCAL SOURCE FIXED`。`git commit/push`、iOS/Androidビルド・実機端末インストール・Cloudflare/Web本番配信・公式QA runnerへの記録は未実施。

## 自己レビュー10巡（各回、異なる実検査）

| No | 検査方法・証拠 | 結果 |
|---|---|---|
| S01 | `BridgeViewController`の既存入力時16px守備範囲とpinch未抑止をコード逆引き、無関係な認証/データコードに変更が無いことを差分確認 | PASS source |
| S02 | UIKit `scrollView.pinchGestureRecognizer?.isEnabled=false`によりiOS WebViewのピンチ経路を1箇所で止めるコードを確認 | PASS source |
| S03 | 同一scrollViewの`minimumZoomScale/maximumZoomScale`が各1.0であり拡大範囲がないことを独立確認 | PASS source |
| S04 | document-start JSの`viewport`から既存`maximum-scale=5`が除去され、要求した1倍制限に置換されることをVM実行 | PASS offline |
| S05 | document-startとDOMContentLoadedの2回適用でもmetaへ重複が起きず、指定値が同一になることをVMで比較 | PASS offline |
| S06 | 既存`viewport-fit=cover`と`width=device-width`/`initial-scale=1`が消えず、safe-areaと縦向き幅の認識に影響しないことを照合 | PASS offline |
| S07 | Android Native Capacitor検出をVMで模擬し、設定内の以前の最大5倍を1倍へ上書きすることを確認 | PASS offline |
| S08 | `mobile-app/web/config.js`のSafari/Chrome非Native条件でmetaとtouch-actionに変更がないことを逆ケースで検証 | PASS offline |
| S09 | Headless mobile Chromiumで`Input.synthesizePinchGesture(scaleFactor:2)`後の`visualViewport.scale===1`、縦スクロール可能を実DOMで測定 | PASS Chromium |
| S10 | 専用7件とヘッダ/iOSキーボード関連回帰全19件exit0、Native `config.js`の`node --check`と関連差分の`git diff --check` exit0を確認。iOS SwiftコンパイルはWindowsのため未実施と区別 | PASS offline / device PENDING |

## 横展開レビュー10巡（異なる利用面・リスクの確認）

| No | 探索対象・方法 | 結果 |
|---|---|---|
| H01 | iOS `CAPBridgeViewController`一括統制を全ドキュメントで使用し、特定画面だけの個別GestureHandlerを増設していないか確認 | PASS source |
| H02 | Android Capacitor `isNativePlatform`/`getPlatform`/`capacitor:`の複数Native検出経路から`config.js`実行を確認 | PASS source/VM |
| H03 | Native44 HTMLのviewport metaと`viewport-fit=cover`を全件列挙、変更対象をshared `config.js`1本へ統一 | PASS 44/44 static |
| H04 | Nativeログイン/管理/設定などhead中に`config.js`が入る入口とdocument-start WKの実行時刻を独立追跡、HTMLごとのズーム属性を重複追加しない | PASS source |
| H05 | Web本番とWeb TESTの別`config.js`は未変更であることと、Web/PWAでズームを禁止しないテストを確認 | PASS source/VM |
| H06 | 独立公開注文・公開予約の外部WebはNativeのスクリプト対象外とし、アクセシビリティを減らさない | PASS source |
| H07 | iOSキーボードのdocument-start 16px input guard、フォーカス/IME揺れ再現テストを3件の関連回帰で照合 | PASS offline |
| H08 | 先行IZK-UT-078の2行ヘッダ・Helpボタン・左右固定X座標のPlaywright Chrome回帰9件を併走し横滑りの副作用なしを確認 | PASS offline |
| H09 | `touch-action:manipulation`がタップと通常panを許可する設定で、Chrome実モバイルフィクスチャーの縦スクロール可能性を検査 | PASS Chromium |
| H10 | 正式Android/iOS QAの既存証拠を改変しない経路を監査、`node scripts/qa-v2-official-runner.mjs verify` exit0で台帳増分なしを確認。実機iOS/Androidでのピンチ・ズーム状態は別ゲート | PASS source / physical PENDING |

## 実行コマンド・未完了

- `node --test test/izk_ut_079_native_zoom_lock_test.mjs`: **7/7 PASS exit0**（DOM/JSシミュレーション＋モバイルChromium/CDPピンチ）
- `node --test test/izk_ut_079_native_zoom_lock_test.mjs test/qa2_header_two_row_regression_test.mjs test/ios_keyboard_global_header_stability_test.mjs test/ios_keyboard_focus_layout_regression_test.mjs test/ios_keyboard_landscape_focus_no_jitter_test.mjs`: **19/19 PASS exit0**。
- `node --check mobile-app/web/config.js`・`git diff --check`対象ファイル: **exit0**。
- `node test/ios_release_readiness_test.mjs`単独は**既存の「無料iOS Simulator CIは手動またはworkflow自身の変更時だけ」**でexit1。今回のズーム修正とは異なるCI workflow検査であり成功と称さない。本件のリリース認証ゲートには未合格。
- 正式実機再試験は未実施。新版IPA/iOS WKWebViewでのピンチ・ダブルタップ→scale1、別画面遷移、ログイン、スクロール/キーボード、Android WebView、Web Safariズーム可能、iOSのアクセシビリティZoomとの分離を、配布時に担当者が確認すること。
- 修正元のSHA-256（今回の未コミット作業木）：`ios/App/App/BridgeViewController.swift` = `24EBC4C8F98A5F94D0C56A4FA6F440FF57308F8CAB5A099B3AEE5C8E49B03026`、`mobile-app/web/config.js` = `DA11BFDAD2364B4B316E574B0B19486C546EF521C27F255DB63CB8B6602CC466`。配布物・署名版SHAとは別物。
