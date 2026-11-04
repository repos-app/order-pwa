# QA2-KEEP-OPR-ATT-011 / QA2-FLOW-A-001 / QA2-NEW-OS-002 — 未解決QA修正レビュー

**日付:** 2026-10-13。**範囲:** ローカルソース・Node VM / SQLite HTTPのみ。本番API、Cloudflare、実機、公式QA stateは変更していない。正式FAILは新ビルドによる受入試験まで維持。

## QA2-KEEP-OPR-ATT-011 — 管理者本人が打刻できる

**旧FAIL証拠:** Android Emulator APK910017でシステムユーザーの本人タイルをタップすると打刻modalで緑色の出勤ボタンが表示された。打刻自体は行われていない。

**根本原因と対応:** 現行 `attendance.getEmployeeStatuses` は `canPunch=false` を計算し、Native/GASの打刻APIも管理者を拒否しているが、画面 `clock.html` はサーバーから来た `e.canPunch===true` の1条件だけを信用して表示・modal・submitまで進める構造だった。過去ビルドや古いレスポンスではUIが誤操作導線を露出した。Native・Web本番・Web TESTの `clock.html` に `ownPunchRole` および `canOperate` を追加。可視カード・modal・実際の打刻呼出しで、**本人IDと許可された役割の両方**を補助判定する。これはUI防御層であり最終的な本人権限はサーバーで照合する。

### 自己レビュー10回（ソース＋実VM、各項実施）

1. 権限判定は `v2` / `v3` トークンの形式を認識し、形式外はUI拒否する。
2. `システム` 役割の古い`canPunch=true`でも非操作になる実VM。
3. `管理者` 役割の古い`canPunch=true`でも非操作になる実VM。
4. `system`/`admin` 役割の大小文字差を含む拒否を実VMで確認。
5. 未知役割と空役割はfail closedする実VMで確認。
6. 自店舗の許可された `スタッフ` / `一般` / `staff` / `general` / `manager` / `マネージャー` の本人打刻だけ許可する実VM。
7. 同じ許可役割でも別従業員IDのタイルは操作不可という実VM。
8. サーバー側 `canPunch=false` は許可役割でも優先して拒否する実VM。
9. 表示行 `render`、modal `__open`、送信 `__punch` 全3箇所で同じガードを使うソース逆検索と専用テスト。
10. `test/backend_auth_attendance_401_regression_test.mjs` のSQL/Native API 23 PASS、UI専用82 PASS、Web鏡像一致、`npm test`への登録を確認。

### 横展開10回（ソース＋実VM、各項実施）

1. Native `mobile-app/web/clock.html` へ実装＋検証。
2. Web production `docs/yuwaku/clock.html` へ実装＋検証。
3. Web TEST `docs/yuwaku/test/clock.html` へ実装＋検証。
4. 管理者自身の名札・打刻modal入口に `view-only` が付くよう変更。
5. 管理者の直接JS `__open(index)` にも二重ガード。
6. 管理者の直接JS `__punch(type)` にも二重ガード。
7. 管理者を除きマネージャー・スタッフの本人打刻導線を保持。
8. 他人タイル不正操作を本人UID比較で保護。
9. `src/index.js:handlePunch` / GAS互換 `src/gasApi.js` / `attendance.punch` の既存管理者サーバー拒否を確認。
10. `attendance.getEmployeeStatuses` の `canPunch` サーバー側役割判定と、Native/GAS/本番/test画面の一致を確認。

**証跡:** `test/qa2_keep_opr_att_011_ui_role_guard_test.mjs`: **82 PASS**。`test/backend_auth_attendance_401_regression_test.mjs`: **23 PASS**。実機の再ログイン/キャッシュバージョン確認は残件。

## QA2-FLOW-A-001 — オフライン中にエラー表示なし

**旧FAIL証拠:** Android Emulatorのネットワーク切断時、管理Hubと注文管理に既存注文が表示されたが、オフライン/通信不可の明示がなかった。オンライン復帰とセッション保持は成功。

**原因と修正:** Native管理画面はすでに `hubOfflineBanner` とCapacitor Networkとの連携を持つ最新ソースだった。一方で注文管理 `admin.html` は前バッチに追加した独立 `#opsReadError` のネットワークエラー時表示に依存し、**回線が切れた瞬間やキャッシュ画面表示中の未リクエスト状態**を表示しなかった。Native/Web production/Web TEST `admin.html` の `offline` イベント・初回`navigator.onLine`・`online` 復帰再取得を追加し、回線断ならAPIを呼ぶ前に `offline` の読み取り失敗状態を表示する。保存済み注文を消去しない。既存のエラー別日本語/英語案内に追加した。

### 自己レビュー10回（ソース＋実VM、各項実施）

1. 回線断検知に `navigator.onLine===false` を明示使用。
2. オフライン時は新たな差分読取fetchを行わないVMテスト。
3. オフライン時も既存 `orders` 配列を保持するVMテスト。
4. オフライン時は正常返却ではなく `{ok:false,error:'offline'}` にするVMテスト。
5. 注文一覧外の `#opsReadError` に日本語「オフライン」を表示するVMテスト。
6. ネットワーク `offline` イベントで読み取り中でなくとも警告を表示するコード/VM検証。
7. `online` イベント後は強制 `load(true)` で通信の再確認を行うコード/VM検証。
8. 注文一覧の成功処理だけが警告を消し、失敗表示から成功と誤判定しない前バッチの回帰を確認。
9. Native管理Hub `hubOfflineBanner` は認証後もDOMに残り、Capacitorネットワーク状態とpageshowで再描画されることを確認。
10. 日英メッセージ・Web production/test parity・`npm test`への追加を確認。

### 横展開10回（ソース＋実VM、各項実施）

1. Native注文管理に通信断の即時表示。
2. Web production注文管理に同じ表示。
3. Web TEST注文管理に同じ表示。
4. Native管理ホームの従来バナーが存在することを確認。
5. Web production管理ホームの従来バナーが存在することを確認。
6. Web TEST管理ホームの従来バナーが存在することを確認。
7. `navigator.onLine` false の起動時。
8. `offline` event 発火時。
9. `online` event後の再取得。
10. 既存の注文数と注文配列を保持し、二重注文を勝手に送らない逆検索。

**証跡:** `test/qa2_flow_a_001_offline_visibility_regression_test.mjs`: **31 PASS**（注文管理のNode VM＋配布経路確認に加え、Native管理画面のCapacitor通信接続/失敗/復旧を実際の埋込みscript VMで実行）。`test/qa2_flow_n_002_orders_error_regression_test.mjs`: 既存のエラー別読取回帰。iOS/Androidの実機での通信遮断表示は保留。

## QA2-NEW-OS-002 — 物理OS操作

正式FAILの概要自身が「Landscape/Portrait復帰とBack操作は実機で成功し、別で観察したログインIME被覆だけが失敗」と述べている。新しい根本原因ではなく **IZK-UT-070** と同一。前バッチで Native Android `adjustResize` と非中央固定スクロールレイアウトを修正し、`test/qa2_login_signup_ime_regression_test.mjs`と関連10×10レビューを `test-results/qa-v2-evidence/QA2_LOGIN_SIGNUP_IME_FIX_REVIEW_20261013.md`に記録済み。今回のOS操作自体は正式PASSに変更せず、新しいAPKでIME対応と回転/戻るの独立確認が必要。

## 全件の原則

この報告の10/10は**コード・自動テストレビューの完了**であり、**Android実機・iOS実機・Cloudflare配布PASSではない**。既存の公式FAILは保全。commit/push/deploy/本番DB更新なし。
