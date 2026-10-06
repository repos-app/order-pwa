// Service Worker: アプリシェルをキャッシュし、オフラインでも起動できるようにする。
// API（Cloudflare Workers）へのPOSTは横取りせず素通しする。
//
// ★2026-08-23追記（Cloudflare移行に伴う重要な変更）: 静的資産（config.js/api.js含む）は
// 下のfetchハンドラで「キャッシュ優先」のため、CACHEのバージョン文字列を変えない限り、
// 既にこのPWAを使ったことがある端末では、config.jsをGAS時代のURLのまま古いキャッシュから
// 返し続けてしまう（サーバー側でconfig.jsを差し替えても反映されない＝画面がずっと重いGAS
// バックエンドに繋がったまま、という不具合の直接原因）。CACHEのバージョンを上げると、
// activateハンドラが自動的に旧キャッシュを削除するため、次回アクセス時に新しいconfig.js
// （Cloudflare Workers宛て）が確実に取得される。config.js/api.js等の静的資産を差し替える
// デプロイのたびに、このバージョン番号を必ず1つ上げること。
//
// ★2026-08-23再追記（v146・重大な不具合の修正）: v145はSHELL配列に既に削除済みの
// `admin_new.html`が残ったままだった。installハンドラの`caches.addAll(SHELL)`は1件でも
// 404すると全体が失敗する仕様のため、v145の新規インストールが実際には毎回失敗し続けて
// いた（新しいCACHEのopenだけ実行されて中身が空のまま）。インストールが失敗すると
// ブラウザは新しいService Workerをactivateしないため、既にこのPWAを使ったことがある
// 端末は「本来はv145に上がっているはず」のつもりが実際にはv144のまま固定され、config.js
// がいつまでもGAS時代のURLを指し続ける（sales.html等が読み込み中のまま止まる・古い
// バックエンドへの再試行ループが発生する、という形で症状が出た）。
// 今回、削除済みファイルをSHELLから除去し、バージョンをv146へ上げることで、次回アクセス時に
// 改めてインストールが成功し、正しいconfig.js（Cloudflare Workers宛て）へ切り替わるようにした。
// 教訓: SHELLに載せるファイルを変更する際は、必ずデプロイ後の実際のファイル一覧と突き合わせる
// こと（今回は目視確認を怠ったのが原因）。
// ★2026-08-23再々追記（v147）: 全画面点検の結果を反映（clock.htmlのpunch/getEmployeeStatuses
// 未登録バグ修正、settings.html/backup.html/purchasing.htmlのメール送信系・スプレッドシート
// バックアップ機能を「利用不可」表示に変更＋代替案を明記）。静的資産（settings.html/backup.html/
// purchasing.html）を変更したため、キャッシュを必ず入れ替える。
// ★2026-08-25追記（v149・GPTレビューで発覚、v146と全く同じ不具合の再発）: SPAプロトタイプ
// 開発中止に伴いdocs/yuwaku/spa.htmlを削除したが、このSHELL配列から './spa.html' を
// 消し忘れていた。v146の教訓（このファイル上部のコメント参照）通り、caches.addAll(SHELL)は
// 1件でも404すると全体が失敗するため、v148のインストールは実際には毎回失敗し続けていた
// 可能性が高い。SHELLから './spa.html' を除去し、バージョンをv149へ上げて再インストールを
// 発生させる。教訓を教訓のままにせず、SHELL変更のたびに実ファイル一覧との突き合わせを徹底する。
// ★2026-08-25追記（v150）: confirm()/alert()の共通ダイアログ部品として新規追加した
// ./confirm.js をSHELLへ追加。新規ファイルなのでバージョンを上げてキャッシュへ確実に含める。
// ★2026-08-27追記（v151・GPT確認レポート_Claude追加修正依頼_2026-08-27.md 指摘事項）: 店内注文
// 画面（index.html）がconfirm.jsを読み込んでいなかった（./app.jsのalert 1件・confirm 2件が
// ネイティブダイアログのまま残存）不具合を修正。index.html/app.jsの内容が変わったため、
// キャッシュを必ず入れ替える。
// ★2026-08-27追記（v152）: システム管理者専用の新規画面 data_admin.html（データインポート/
// 削除）を追加したため、SHELLへ追加してキャッシュを必ず入れ替える。
// ★2026-08-28追記（v153）: backup.htmlとdata_admin.htmlを「データバックアップ・管理」へ
// 統合し、管理メニューの導線も一本化したためキャッシュを更新する。
// v155: 本番SWのscope (/yuwaku/) は子階層の /yuwaku/test/ も含むため、初回テスト遷移を
// 本番SWが処理して本番キャッシュを見せることがあった。test配下は一切interceptしない。
const CACHE_PREFIX = 'yuwaku-production-';
// v165: ログイン障害の原因別表示と認証スキーマ事前検査対応のmanage.htmlを確実に配布する。
// v169: 地域設定の国・ロケール・通貨・タイムゾーンを選択式へ統一。
// v170: 全体利用ガイドを店舗利用者の日常フロー中心へ刷新。
// v171: 全体利用ガイドをスマホ縦読みカード化し、必須/任意の利用ケースを明示。
// v172: メニュー提供開始/終了の時刻入力をiPhone幅で縦1列へ変更。
// v173: 全体利用ガイドからの遷移先で戻る先をoverviewへ固定する。
// v174: 全管理画面の内部リンクへ安全なback遷移元を自動付与する。
// v175: 全体利用ガイドの各ボタンを対象設定へ直接スクロールする。
// v176: guide hash付きfrom=overviewへのback重複付与を防止する。
// v177: 他画面の機能ショートカットも目的セクションへ直行し、from=manageのback重複を防止する。
// v178: month/date入力と隣接アクションボタンの高さを46pxで統一する。
// v179: month/date入力を専用shellへ隔離し、Native固有幅による隣接ボタンへの侵入を防止する。
// v180: month/dateのNative文字を透明化し、アプリ描画の中央表示へ統一する。
// v181: 人気度スコア表を4列へ再編し、スマホで横スクロール不要にする。
// v182: 経費一覧をスマホカード化し、レシート画像保存失敗を正しく扱う。
// v183: 画像系設定でもAPI success:falseを成功表示せず、削除UIは保存成功後に反映する。
// v184: iPhone横向きでも経費フォーム/一覧をスマホ配置に保ち折返しを防止する。
// v185: month/date文字の絶対中央配置を反映する。
// v186: critical JSのversion付きcache fallbackを全auth世代へ許可する。
// v187: 共通年月オーバーレイを撤去し、安定headerへ戻す。
// v194: 売上・月間粗利・勤怠の対象月を会計履歴と同じNative monthレイアウトへ統一。
// v195: Native monthの固有幅を自然高さのまま親要素で制約し、隣接ボタンへの食い込みを防止。
// v196: iOS time入力をコンパクト化し、提供時間・設定時刻の縦横中央揃えと幅超過を修正。
// v197: month入力の右端に8pxの安全余白とpaint containmentを追加し、iOS Native描画が隣接ボタンへ滲むのを防止。
// v198: month/time/dateの入力本体を親幅より8px内側へ収め、iOSで右端の枠が欠ける問題を横展開修正。
// v199: month入力の親clipを廃止し、180px本体+8px描画逃げ領域でiOS Native右端の枠切れを防止。
// v200: time入力も親/inputのclipを廃止し、右8px描画余白でiOS Native右枠切れを防止。
// v201: 予約共有URLを店舗ID付きHTTPS公開URLへ変更し、公開予約フォームをマルチ店舗対応。
// v202: yuwaku専用WebはSTORE_IDを明示送信し、CloudPRNT URLも店舗ID付きへ変更。
// v203: 卓QRとテイクアウト共有URLを店舗共通HTTPS公開ページへ統一。
// v204: 月日初期値を端末時刻ではなく店舗IANAタイムゾーンへ統一。
// v205: 予約フォームを30分刻み＋メール対応にし、予約管理へメール列を追加。
// v206: iOS date inputの右枠切れ・隣接列への描画超過を全date入力へ横展開修正。
// v207: 予約フォームの日時をスマホでは縦積みにし、iOS date描画と時刻欄の重なりを構造的に解消。
// v208: 予約フォームのメールアドレスを必須化。
// v209: 予約一覧のメールリンク化と状態列レイアウトを安定化。
// v211: ファイル読込をarrayBuffer優先へ統一しProgressEvent直露出を防止。
// v212: iOS経費日付欄のNative縦伸びを44px固定で抑止。
// v214: レシピ・ユーザー管理・割引ルールの必須入力を送信前検証へ統一。
// v215: ログイン用パスワードの新規設定要件を8文字以上へ統一。
// v216: 初回言語を端末の第一優先言語からja/enへ自動設定し、共通/例外画面を統一。
// v217: 店舗設定の席数表示を保存済み呼称へ連動し、「第1席種」表記を廃止。
// v218: サンプルメニュー表示/デモ注文とスタッフ注文の認証付き再送を追加。
// v219: Pexels画像検索を運営共通キー化し、店舗設定からAPIキー入力を撤去。
// v220: 日英business fieldを対等化し、英語のみ/日本語のみ登録と相互fallbackを全機能へ横展開。
// v221: 再監査対応。多言語メニューオプション、決済、注文管理/KDS、プリンタ表示を更新。
// v228: オフライン注文再送のStore/token固定化を確実に配布する。
// v229: 注文確定ダイアログへ商品明細と合計内訳を追加。
// v232: 経費保存の冪等再送・レジ締め競合時の利用者向け案内を配布。
// v235: UI監査の設定保存エラー表示・発注メール再試行ID・フィードバック更新エラーを配布。
// v237: menu auto-translation restoration + localized save error/UI guidance.
// v238: register open/close response-loss idempotency + retry recovery.
// v239: Round 2-3 users/clock/menu fixes + offline query-navigation fallback.
// v240: bfcache resume update check in the shared API client.
// v242: Round 5 write-success/read-refresh separation across users/menu/inventory/settings.
// v244: inventory header + attendance timeout/idempotency UXを全Web配布へ確実に反映。
// v247: iOS date input overlay visibility + regional date text rerender.
// v248: move receipt-print-only settings from settings to printers.
// v249: print station requires an explicit logical printer and safely recovers ambiguous success ACKs.
// v250: synchronously load DateDisplay before date-dependent page scripts.
// v252: coupon expiry uses a collision-safe responsive phone layout.
// v253: refresh dynamic system-label localization (roles, audit/order/printer status).
// v254: cache external browser and native file export helpers used by shared-URL and backup flows.
// v255: refresh coupon form/list split and reservation Japanese date presentation.
// v256: pin the applied-language i18n runtime for async completion messages.
// v257: refresh printer persistence/error locality, runtime i18n, coupon concurrency, Bluetooth unregister and Pixabay/legal updates.
const CACHE = CACHE_PREFIX + 'v258';
const SHELL = [
  './',
  './index.html',
  './takeout.html',
  './kds.html',
  './admin.html',
  './manage.html',
  './coupons.html',
  './recipe.html',
  './drink_inv.html',
  './members.html',
  './sales.html',
  './attendance.html',
  './users.html',
  './menu_editor.html',
  './inventory.html',
  './settings.html',
  './clock.html',
  './expenses.html',
  './profit.html',
  './profit_sim.html',
  './dashboard.html',
  './register.html',
  './audit.html',
  './moves.html',
  './purchasing.html',
  './order_items.html',
  './feedback.html',
  './backup.html',
  './data_admin.html',
  './reserve.html',
  './reservations.html',
  './birthdays.html',
  './receipts.html',
  './todo.html',
  './requests.html',
  './printers.html',
  './overview.html',
  './system-overview.svg',
  './system-overview-en.svg',
  './styles.css',
  './date-controls.css?v=3',
  './date-display.js?v=auth4',
  './config.js?v=auth2',
  './header.js?v=auth13',
  './api.js?v=auth2',
  './i18n.js?v=auth3',
  './external-browser.js?v=external1',
  './native-file-export.js?v=native-export1',
  './confirm.js?v=auth2',
  './app.js?v=auth5',
  './help.js?v=auth2',
  './manifest.webmanifest',
  './admin.webmanifest',
  './attendance.webmanifest',
  './audit.webmanifest',
  './backup.webmanifest',
  './data_admin.webmanifest',
  './birthdays.webmanifest',
  './coupons.webmanifest',
  './dashboard.webmanifest',
  './expenses.webmanifest',
  './feedback.webmanifest',
  './inventory.webmanifest',
  './kds.webmanifest',
  './members.webmanifest',
  './menu_editor.webmanifest',
  './moves.webmanifest',
  './profit.webmanifest',
  './profit_sim.webmanifest',
  './purchasing.webmanifest',
  './order_items.webmanifest',
  './receipts.webmanifest',
  './recipe.webmanifest',
  './register.webmanifest',
  './reservations.webmanifest',
  './todo.webmanifest',
  './requests.webmanifest',
  './sales.webmanifest',
  './settings.webmanifest',
  './takeout.webmanifest',
  './users.webmanifest',
  './manage.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => (k.startsWith(CACHE_PREFIX) || /^yuwaku-pos-v\d+$/.test(k)) && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // GET以外・別オリジン（API）は素通し
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 認証・データ環境の分離境界。本番SWは、より深いtest環境のnavigation／静的資産を
  // キャッシュ取得もオフラインfallbackもせず、必ずブラウザの通常ネットワーク処理へ渡す。
  const scopePath = new URL(self.registration.scope).pathname;
  if (url.pathname.startsWith(scopePath + 'test/')) return;

  // Cache reads are scoped to this environment AND release, never global caches.match.
  const critical = /\/(?:config|api|header)\.js$/.test(url.pathname);
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, req.mode === 'navigate' ? { ignoreSearch: true } : undefined);
    if (!critical && req.mode !== 'navigate' && hit) return hit;
    try {
      const res = await fetch(req, critical ? { cache: 'no-store' } : undefined);
      if (!res.ok) throw new Error('http_' + res.status);
      // Unversioned auth resources must never become a fallback for versioned HTML.
      if (!critical || /^auth\d+$/.test(url.searchParams.get('v') || '')) {
        event.waitUntil(cache.put(req, res.clone()).catch(() => {}));
      }
      return res;
    } catch (error) {
      if (hit && (!critical || /^auth\d+$/.test(url.searchParams.get('v') || ''))) return hit;
      // Do not substitute index.html for an unrelated management page.
      return Response.error();
    }
  }));
});
