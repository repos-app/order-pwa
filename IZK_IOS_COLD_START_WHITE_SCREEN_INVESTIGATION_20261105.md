# izakanpai iOS 起動時の白画面：調査記録（2026-11-05）

## 現象・動画に基づく事実

- 提供された動画 ScreenRecording_11-05-2026 01-27-23_1.mp4 は約11.5秒。
- ホーム画面から POS を起動後、約2～5秒の範囲でアプリ領域が全面白。アプリを離れて再度開くと Yuwaku Bar Owner の管理メニューが正常表示。
- 動画は512×1108、30fps。2.5～5.0秒のアプリ中央部（幅60%、高さ35%）は各サンプルで全画素が同一の明るい色（動画デコード後BGR=246,243,244、標準偏差0）。表示されているのはローディング文言もカードもない、完全に均一な背景面。
- 通常の画面遷移時の一瞬のちらつきとは区別する。LaunchScreen の Splash 画像は濃紺・ロゴ入りであり、白い画面とは異なる。

## ソース調査の確定事項

1. Capacitor iOS は同梱HTMLから画面表示する。調査時に web/index、mobile-dist/index、iOS/public/index の SHA256 がすべて一致した。
2. 管理画面HTML側には9秒の認証処理ウォッチドッグが存在するが、DOMの読み込みそのものが失敗すると動作できない。
3. Capacitor標準 WebViewDelegationHandler.swift の WebContent終了コールバックは既に bridge.reset と webView.reload を呼ぶ。「終了時の復旧が未実装」は誤り。
4. 独自 BridgeViewController.swift はロード前に旧Service Worker/Cacheの削除を非同期開始し、削除完了時に無条件で reloadFromOrigin を呼んでいた。これは Capacitor が行う最初の provisional navigation と競合する可能性がある（コード上確認済み）。
5. 実際に問題の端末に旧SW登録が残っていたか、WebContentプロセスが停止したか、about:blank が表示されたかはログがなく未確認。4は確定根因ではなく、再現可能な危険経路。
6. 調査時にiPhoneのUSB接続、端末クラッシュログ、WebKitログは取得できなかった。

## 実施した修正

- 初期ロード中にキャッシュ削除を走らせず、可視DOMのネイティブヘルスチェック後にのみ旧キャッシュを削除。削除完了からの無条件reloadを廃止。全期間の全Webキャッシュ消去ではなく、旧Service Worker登録があるレコードだけを削除対象とした。
- WKWebViewが応答しない場合もUIKitの再読み込みUIに到達する処理を追加。再読み込みはユーザー操作時のみで、業務書き込み・会計の自動再送を行わない。
- pageshow + RAF だけを正常表示と判定しない。可視本文の検証を行い、ナビゲーションごとにチェックする。
- 診断用ログ IZK_NATIVE_VIEW_APPEARED / IZK_NATIVE_PAGE_SHOW / IZK_NATIVE_CANVAS_HEALTHY / IZK_NATIVE_CANVAS_UNHEALTHY / IZK_NATIVE_LEGACY_SW_CLEANUP / IZK_NATIVE_BLANK_RECOVERY_RETRY を追加。機密情報・店舗ID・注文情報は記録しない。
- Capacitor既存のdelegate、認証、DB、注文処理、AndroidおよびWeb/PWAには変更なし。

## QAステータス

- 既存テスト izk_ut_068_ios_native_frame_hold_test.mjs を拡張し、SW cache cleanup初期化、監視と手動復旧の契約を追加。
- iOS native frame hold、zoom lock、native header flicker、navigation/auth race の合同回帰は PASS。ios_release_readiness_test は43チェックPASS。git diff --check はPASS。
- macOS Swiftコンパイル、実際のIPAビルド、TestFlight配信、iPhone実機再現、クラッシュログ照合は未実施。正式QA判定増分0。
- 今回修正した実行時競合が録画の唯一の原因とは断定せず、再発時のネイティブログと物理端末証拠で判断する。
