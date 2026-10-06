// API クライアント ＋ オフライン送信キュー（IndexedDB）
// GASは Content-Type: text/plain でPOSTするとプリフライトを回避できる。
(function () {
  const CFG = Object.freeze(Object.assign({}, window.APP_CONFIG || {}));
  const AUTH_PREFIX = CFG.AUTH_STORAGE_PREFIX;
  const API = {};

  function publicStoreFromQuery() {
    if (typeof location === 'undefined') return '';
    var storeId = String(new URLSearchParams(location.search).get('store') || '').trim().toLowerCase();
    return /^[a-z0-9][a-z0-9-]{2,31}$/.test(storeId) ? storeId : '';
  }

  // 同一originの本番／テスト間で、古い親Service Workerが別環境のconfig.jsを返しても
  // データ取得前にfail closedする。認証情報は削除せず、誤環境での表示とAPI通信だけを止める。
  function environmentMismatch() {
    var pathIsTest = /\/test(?:\/|$)/i.test(location.pathname);
    var configIsTest = CFG.TEST_ENV === true || /^test$/i.test(String(CFG.VERSION || '')) || /api-test\./i.test(String(CFG.API_URL || ''));
    var localTestApi = pathIsTest && CFG.TEST_ENV === true && /^http:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/i.test(String(CFG.API_URL || ''));
    var env = pathIsTest ? 'test' : 'production';
    var expectedPrefix = 'izakanpai:' + env + ':';
    var expectedDb = 'izakanpai-pos-' + env;
    if (CFG.PUBLIC_ORDER === true) {
      var publicStoreId = publicStoreFromQuery();
      if (!publicStoreId) return true;
      expectedPrefix += 'public-order:' + publicStoreId + ':';
      expectedDb += '-public-order-' + publicStoreId;
    }
    return pathIsTest !== configIsTest || CFG.AUTH_SCHEMA_VERSION !== 2 ||
      AUTH_PREFIX !== expectedPrefix ||
      CFG.STORAGE_PREFIX !== expectedPrefix || CFG.OFFLINE_DB_NAME !== expectedDb ||
      (!/^https:\/\//i.test(String(CFG.API_URL || '')) && !localTestApi) ||
      (!localTestApi && /api-test\./i.test(String(CFG.API_URL || '')) !== pathIsTest);
  }
  function blockEnvironmentMismatch() {
    if (!environmentMismatch() || document.getElementById('izEnvMismatch')) return;
    var el = document.createElement('div');
    el.id = 'izEnvMismatch';
    el.setAttribute('role', 'alert');
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#fff;color:#991b1b;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font:700 18px/1.6 sans-serif';
    el.textContent = '環境情報が一致しないため表示を停止しました。ページを再読み込みしてください。 / Environment mismatch. Reload this page.';
    (document.body || document.documentElement).appendChild(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', blockEnvironmentMismatch, { once: true });
  else blockEnvironmentMismatch();
  window.addEventListener('pageshow', blockEnvironmentMismatch);
  API.authReady = function () {
    blockEnvironmentMismatch();
    return !environmentMismatch();
  };
  function storedToken() {
    try { return localStorage.getItem(AUTH_PREFIX + 'mgmtToken') || ''; } catch (e) { return ''; }
  }
  function storedRefreshToken() {
    try { return localStorage.getItem(AUTH_PREFIX + 'mgmtRefreshToken') || ''; } catch (e) { return ''; }
  }
  // Structural validation only; authenticity/authorization always remains server-side.
  function tokenInfo(token, allowExpired) {
    if (typeof token !== 'string') return null;
    var dot = token.lastIndexOf('.'), parts = token.slice(0, dot).split('~');
    if (dot < 0 || !/^[a-f0-9]{64}$/.test(token.slice(dot + 1)) ||
        !((parts.length === 6 && parts[0] === 'v2') || (parts.length === 7 && parts[0] === 'v3')) ||
        !Number.isFinite(Number(parts[1])) || (!allowExpired && Number(parts[1]) <= Date.now()) ||
        !parts[2] || !parts[3] || !parts[4] || parts[5] !== (CFG.TEST_ENV ? 'test' : 'production')) return null;
    return { version:parts[0], exp:Number(parts[1]), role:parts[2], store:parts[3], uid:parts[4], audience:parts[5], sessionId:parts[6]||'' };
  }
  function validRefreshToken(token) {
    return /^(?:r1\.[0-9a-f-]{36}\.[0-9a-f]{64}|r2\.[a-z0-9][a-z0-9-]{0,31}\.[0-9a-f-]{36}\.[0-9a-f]{64})$/i.test(String(token || ''));
  }
  API.acceptLogin = function (r) {
    if (!API.authReady()) throw new Error('environment_mismatch');
    var info = tokenInfo(r && r.token);
    if (!info || info.role !== r.role) throw new Error('invalid_login_response');
    // Token is written last: partially failed persistence must not announce login success.
    localStorage.setItem(AUTH_PREFIX + 'mgmtName', r.name || '');
    localStorage.setItem(AUTH_PREFIX + 'mgmtRole', r.role);
    if (info.version === 'v3') {
      if (!validRefreshToken(r.refreshToken)) throw new Error('invalid_login_response');
      localStorage.setItem(AUTH_PREFIX + 'mgmtRefreshToken', r.refreshToken);
    } else localStorage.removeItem(AUTH_PREFIX + 'mgmtRefreshToken');
    localStorage.setItem(AUTH_PREFIX + 'mgmtToken', r.token);
    if (storedToken() !== r.token) throw new Error('auth_storage_unavailable');
  };
  API.isCurrentToken = function (token) { return !!token && storedToken() === token; };
  API.currentStoreId = function () {
    var info = tokenInfo(storedToken(), true);
    if (info) return info.store;
    if (CFG.STORE_ID) return String(CFG.STORE_ID);
    return CFG.PUBLIC_ORDER === true ? publicStoreFromQuery() : '';
  };
  API.clearSession = function () {
    try { localStorage.removeItem(AUTH_PREFIX + 'mgmtToken'); localStorage.removeItem(AUTH_PREFIX + 'mgmtRefreshToken'); } catch (e) {}
  };
  API.imageUrl = function (value) {
    var v = String(value || '');
    return /^https:\/\//i.test(v) ? v : '';
  };

  // ---- ロード中オーバーレイ（全アクション共通の待機表示。完了で自動クローズ）----
  // api.js は全ページが読み込むため、ここに置くだけで共通部品になる。
  const _load = (function () {
    let count = 0, el = null, txt = null, hideTimer = null;
    function ensure() {
      if (el || typeof document === 'undefined' || !document.body) return;
      const st = document.createElement('style');
      st.textContent = '@keyframes izspin{to{transform:rotate(360deg)}}'
        + '#izLoad{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.42);opacity:0;transition:opacity .15s;}'
        + '#izLoad.on{opacity:1;}'
        + '#izLoad .box{background:#fff;border-radius:14px;padding:20px 26px;display:flex;flex-direction:column;align-items:center;gap:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);min-width:150px;}'
        + '#izLoad .sp{width:34px;height:34px;border:3px solid #e5e7eb;border-top-color:#0f172a;border-radius:50%;animation:izspin .8s linear infinite;}'
        + '#izLoad .tx{font-size:14px;font-weight:800;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Noto Sans JP\',sans-serif;}';
      document.head.appendChild(st);
      el = document.createElement('div'); el.id = 'izLoad';
      el.innerHTML = '<div class="box"><div class="sp"></div><div class="tx" id="izLoadTx"></div></div>';
      document.body.appendChild(el);
      txt = el.querySelector('#izLoadTx');
    }
    function defMsg() { return _isEN() ? 'Please wait…' : '処理中…'; }
    return {
      show: function (msg) {
        count++; ensure(); if (!el) return;
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (txt) txt.textContent = msg || defMsg();
        el.style.display = 'flex'; void el.offsetWidth; el.classList.add('on');
      },
      hide: function () {
        count = Math.max(0, count - 1); if (count > 0 || !el) return;
        el.classList.remove('on');
        hideTimer = setTimeout(function () { if (count === 0 && el) el.style.display = 'none'; }, 160);
      }
    };
  })();
  API.loading = _load; // 手動利用も可（API.loading.show('...') / .hide()）

  // 定期ポーリング等、待機表示を出さない（点滅防止）アクション
  const BG_ACTIONS = { checkToken: 1, getOrders: 1, getOperationsDelta: 1, checkoutStatus: 1, bootstrap: 1, getSettings: 1, getStaffCalls: 1, getTableCheckoutStamp: 1 };
  const TABLE_SESSION_ACTIONS = { submitOrder:1, getOrdersByTable:1, getTableCheckoutStamp:1, setTablePartySize:1, getTablePartySize:1, callStaff:1, submitFeedback:1 };
  const BG_RPC = { getPrintQueue: 1, getPrintQueueCounts: 1, getSettings: 1 };

  // ---- タイムアウト設定（全画面共通・唯一の定義元）----
  // [応答速度改善(2026-08-22)/タイムアウト共通化] 従来は各画面（admin.html/kds.html/dashboard.html/
  // profit.html/sales.html/inventory.html等）がそれぞれ独自にミリ秒の数値をベタ書きしており、
  // 「何秒でタイムアウトさせるか」の方針が画面ごとにバラバラで、変更時にファイルを横断して
  // 探す必要があった。ここを唯一の定義元とし、各画面はAPI.TIMEOUT_MS.xxxを参照する（数値を
  // 直接書かない）。個々のRPCの実際の応答分布は izakanpai_perf_report_2026-08-22.xlsx を参照。
  //   fast    : 4.5秒  … 注文状況・KDS等、体感速度を最優先し「遅ければ次のポーリングに任せる」画面向け
  //   default : 30秒   … 上記以外の一般的な読み取り・書き込み全般の既定値（未指定時はこれが使われる）
  //   write   : 30秒   … 客が結果を待つ書き込み系（submitOrder/submitTakeoutOrder/finalizeBill等）。
  //             defaultと同値だが、defaultの方針を今後変えても影響を受けないよう意図的に独立させている
  //   heavy   : 23秒   … 売上集計等の重いRPC（画面側が独自のbusyRetryで再試行するため、内部再送は
  //             行わずdefaultよりむしろ短く区切る。詳細はdashboard.html等の_HEAVY_RPC_TIMEOUT_MS参照）
  //   ai      : 45秒   … システムAI画像解析。実物のボトル画像はテスト画像より
  //             大幅に時間がかかり得るため、他より大きく余裕を持たせる
  var TIMEOUT_MS = { fast: 4500, read: 8000, default: 30000, write: 30000, heavy: 23000, ai: 45000 };
  API.TIMEOUT_MS = TIMEOUT_MS; // 各画面から参照する唯一の公開窓口

  // ---- 通信エラー時の自動リトライ＋再読み込み案内バナー（全アクション共通）----
  // GAS側のコールドスタート等で最初の呼び出しが固まる/404になることがあるため、
  // 「読み取り系」アクションに限り1回だけ自動リトライする（書き込み系は二重実行を避けるためリトライしない）。
  // それでも失敗した場合は控えめなバナーで案内する（次に何か1回でも成功すれば自動的に消える）。
  const _FETCH_TIMEOUT_MS = TIMEOUT_MS.default;
  const _RETRY_DELAY_MS = 1200;
  const _READ_ACTIONS = { getSettings: 1, checkToken: 1, bootstrap: 1, checkoutStatus: 1, getStaffCalls: 1, getTableCheckoutStamp: 1, getOperationsDelta: 1, getEmployeeStatuses: 1 };
  function _isReadOnly(action, fn) {
    if (action === 'rpc') return /^(get|check|list|count|fetch)/i.test(fn || '');
    return !!_READ_ACTIONS[action];
  }
  function _isEN() { try { if(window.I18n&&typeof window.I18n.lang==='function')return window.I18n.lang()==='en';var s=localStorage.getItem('lang');if(s==='ja'||s==='en')return s==='en';var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;return String(first||'').toLowerCase().indexOf('ja')!==0; } catch (e) { return true; } }
  API.userErrorText = function (error, fallback) {
    var raw = String(error && (error.code || error.message) || error || '').trim();
    var en = _isEN();
    var defaultGeneric = en ? 'The operation could not be completed. Please try again.' : '処理を完了できませんでした。もう一度お試しください。';
    var generic = fallback || defaultGeneric;
    if (en && /[ぁ-んァ-ヶ一-龠]/.test(generic)) generic = defaultGeneric;
    var network = en ? 'Could not connect to the server. Please check your connection and try again.' : 'サーバーに接続できませんでした。通信状況を確認して、もう一度お試しください。';
    var permission = en ? 'You do not have permission to perform this operation.' : 'この操作を行う権限がありません。';
    var notFound = en ? 'The requested data could not be found.' : '対象のデータが見つかりませんでした。';
    var retryLater = en ? 'Too many attempts were made. Please wait a while and try again.' : '操作回数が多すぎます。しばらく待ってからもう一度お試しください。';
    var code = raw.toLowerCase();
    if (!raw) return generic;
    if (code === 'unauthorized' || code === 'invalid_refresh_session' || code === 'stale_session_response') return en ? 'Your session has expired. Please log in again.' : 'ログインの有効期限が切れました。再度ログインしてください。';
    if (code === 'forbidden' || code.indexOf('forbidden_page:') === 0 || code === 'forbidden_fn') return permission;
    if (code === 'owner_cannot_delete') return en ? 'The registered owner cannot be deleted.' : '登録オーナーは削除できません。';
    if (code === 'owner_must_remain_active') return en ? 'The registered owner must remain active with a login ID.' : '登録オーナーは在籍状態かつログインIDありで維持してください。';
    if (code === 'not_found' || code.endsWith('_not_found')) return notFound;
    if (code === 'rate_limited' || code === 'signup_rate_limited' || code === 'login_rate_limited') return retryLater;
    if (code === 'coupon_unavailable') return en
      ? 'This coupon is no longer available. Please remove it or choose another coupon, then submit the order again.'
      : 'このクーポンは現在ご利用いただけません。クーポンを外すか別のクーポンを選び、もう一度注文してください。';
    if (code === 'register_shift_changed') return en
      ? 'The register was closed or changed while this transaction was being saved. Refresh the screen and try again.'
      : '保存中にレジ締め状態が変わりました。画面を更新して、もう一度お試しください。';
    if (code === 'state_changed') return en
      ? 'This data was changed by another operation. Refresh to get the latest state, then review and save again.'
      : '別の操作でデータが更新されました。画面を更新して最新状態を確認し、内容を確認してからもう一度保存してください。';
    if (code === 'auth') return en
      ? 'Authentication failed. Check the password or credentials you entered and try again.'
      : '認証に失敗しました。入力したパスワードまたは認証情報を確認して、もう一度お試しください。';
    if (code === 'data_admin_busy') return en
      ? 'Another data delete, import, or restore is in progress. Wait a moment and try again.'
      : '別のデータ削除・インポート・復元処理を実行中です。少し待ってから、もう一度お試しください。';
    if (code === 'data_admin_schema_outdated') return en
      ? 'The database update required for Data Admin has not been applied. Apply the latest database migration, then try again.'
      : 'データ管理に必要なデータベース更新が未適用です。最新のデータベースマイグレーションを適用してから、もう一度お試しください。';
    if (code === 'linked_commission_entries') return en
      ? 'These order items have settled commission history and cannot be deleted or replaced by themselves. Delete or replace the Orders table instead.'
      : 'この注文明細には確定済みの歩合履歴があるため、注文明細だけを削除・全置換できません。Ordersテーブル側から削除または全置換してください。';
    if (code === 'bad_header' || code === 'no_matching_columns') return en
      ? 'The CSV header does not match the selected table. Export that table again and import the exported CSV without changing its header.'
      : 'CSVのヘッダーが選択したテーブルと一致しません。対象テーブルをもう一度書き出し、ヘッダーを変更せずにインポートしてください。';
    if (code === 'invalid_parent') return en
      ? 'The CSV contains detail rows whose parent record does not exist in this store. Check the file and its selected table, then try again.'
      : 'CSVに、この店舗に存在しない親データを参照する明細が含まれています。ファイルと対象テーブルを確認して、もう一度お試しください。';
    if (code === 'unsupported_import_identity') return en
      ? 'This table cannot be safely replaced from this CSV format. Export the table again and use the newly exported file.'
      : 'このCSV形式では、このテーブルを安全に全置換できません。対象テーブルをもう一度書き出し、新しく書き出したCSVを使用してください。';
    if (code === 'corrupt_backup') return en
      ? 'This backup cannot be restored safely because its contents are incomplete or invalid. Choose another backup.'
      : 'バックアップの内容が不完全または不正なため、安全に復元できません。別のバックアップを選択してください。';
    if (code === 'row_too_large_for_auto_backup') return en
      ? 'A row is too large to create the required automatic backup. Reduce that record size before running this operation.'
      : '自動バックアップに保存できない大きさのデータがあります。対象データを小さくしてから、この操作を実行してください。';
    if (code === 'tenant_write_frozen' || code === 'tenant_write_fence_not_ready') return en
      ? 'This store database is temporarily unavailable for writes during maintenance. Wait a moment and try again.'
      : 'メンテナンス中のため、この店舗データベースへの書き込みを一時停止しています。少し待ってから、もう一度お試しください。';
    if (code === 'translation_unavailable') return en
      ? 'Automatic translation is temporarily unavailable. Please try saving again later, or enter both Japanese and English.'
      : '自動翻訳を一時的に利用できません。時間をおいて再度保存するか、日本語・英語の両方を入力してください。';
    if (code === 'no_printer') return en ? 'No enabled printer is configured. Open Printer Settings, configure or enable a printer, then try again.' : '有効なプリンタが設定されていません。プリンター設定でプリンタを登録・有効化してから、もう一度お試しください。';
    if (code === 'bluetooth_permission_denied') return en ? 'Bluetooth permission is not allowed. Enable Bluetooth permission for this app in device settings, then retry.' : 'Bluetoothの権限が許可されていません。端末設定でこのアプリのBluetooth権限を許可してから、再試行してください。';
    if (code === 'bluetooth_unavailable') return en ? 'Bluetooth is unavailable or turned off. Turn Bluetooth on, then retry.' : 'Bluetoothを利用できないか、OFFになっています。BluetoothをONにしてから再試行してください。';
    if (/^(?:device_not_found|no_devices|scan_failed_\d+)$/.test(code)) return en ? 'The saved printer could not be found. Make sure the printer is powered on and nearby, then reconnect it from Printer Settings.' : '保存済みプリンタを見つけられません。プリンタの電源と距離を確認し、プリンター設定から再接続してください。';
    if (/^(?:connect_failed|not_connected|printer_disconnected)$/.test(code)) return en ? 'Could not connect to the Bluetooth printer. Check that it is powered on and not connected to another device, then retry.' : 'Bluetoothプリンタに接続できませんでした。電源・他端末との接続状態を確認してから再試行してください。';
    if (code === 'connect_timeout') return en ? 'Bluetooth connection timed out. Retry with the printer nearby and powered on; if it repeats, check the connection-stage log in Printer Settings.' : 'Bluetooth接続がタイムアウトしました。プリンタの電源と距離を確認して再試行し、再発する場合はプリンター設定の接続段階ログを確認してください。';
    if (/^(?:service_discovery_failed|no_services)$/.test(code)) return en ? 'The device connected, but its Bluetooth services could not be discovered. Open Printer Settings and check the GATT log before retrying.' : '機器への接続後、Bluetoothサービスを取得できませんでした。プリンター設定のGATTログを確認してから再試行してください。';
    if (/^(?:characteristic_required|characteristic_not_found|characteristic_not_writable|printer_not_ready)$/.test(code)) return en ? 'The printer connection profile is not ready. Reconnect the printer from Printer Settings and select the detected printer again.' : 'プリンタの接続情報を確定できていません。プリンター設定から再接続し、検出されたプリンタを選び直してください。';
    if (/^(?:write_failed|invalid_print_data)$/.test(code)) return en ? 'Print data could not be sent to the printer. Check the connection and paper/printer state, then retry.' : '印刷データをプリンタへ送信できませんでした。接続状態や用紙・プリンタ本体を確認してから再試行してください。';
    if (code === 'print_ack_unknown') return en ? 'The print data was sent, but completion could not be confirmed. To prevent duplicate printing, reconnect and retry from the same print screen.' : '印刷データは送信されましたが、完了確認ができませんでした。二重印刷防止のため、同じ印刷画面から再接続して再試行してください。';
    if (code === 'duplicate_name') return en
      ? 'The same name is already in use. Use a unique name and try again.'
      : '同じ名前が既に使われています。重複しない名前に変更して、もう一度お試しください。';
    if (code === 'stale_recipe_reference') return en
      ? 'A menu item or inventory item used by this recipe has changed. Refresh the screen, review the selections, and save again.'
      : 'レシピが参照するメニューまたは在庫材料が更新されました。画面を更新して選択内容を確認し、もう一度保存してください。';
    if (code === 'invalid_url') return en ? 'The image URL is invalid.' : '画像URLが正しくありません。';
    if (code === 'not_image') return en ? 'The selected URL did not return an image. Choose another image.' : '選択したURLから画像を取得できませんでした。別の画像を選択してください。';
    if (code === 'too_large') return en ? 'The image is too large. Choose an image smaller than 8 MB.' : '画像サイズが大きすぎます。8MB未満の画像を選択してください。';
    if (code === 'image_fetch_timeout') return en ? 'The image server did not respond in time. Choose another image or try again.' : '画像配信元からの応答がタイムアウトしました。別の画像を選ぶか、もう一度お試しください。';
    if (code === 'image_fetch_failed') return en ? 'The image could not be fetched. Choose another image or try again.' : '画像を取得できませんでした。別の画像を選ぶか、もう一度お試しください。';
    if (code === 'http_403') return en ? 'The image provider refused the download. Choose another image.' : '画像配信元から取得を拒否されました。別の画像を選択してください。';
    if (code === 'http_404') return en ? 'The image is no longer available. Choose another image.' : '画像が見つかりません。別の画像を選択してください。';
    if (code === 'http_429') return en ? 'The image provider is temporarily rate-limiting downloads. Try again later.' : '画像配信元の利用上限に達しています。時間をおいて再度お試しください。';
    if (code.indexOf('plan_feature_pro_required') === 0) return en ? 'This feature is available on the Pro plan.' : 'この機能はProプランでご利用いただけます。';
    if (/^(?:http_\d+|api_error|internal_error|save_failed|delete_failed|request_failed|load_failed|server_busy_retry|environment_mismatch|auth_environment_not_configured)$/.test(code)) return generic;
    if (/failed to fetch|networkerror|aborterror|fetch is aborted|\baborted\b|timeout/i.test(raw)) return network;
    if (/d1_error|sqlite|constraint|primary\s*key|foreign\s*key|sql\b|typeerror|referenceerror|syntaxerror|stack|\bat\s+[^\s]+\s*\(/i.test(raw)) return generic;
    if (/[ぁ-んァ-ヶ一-龠]/.test(raw)) return en ? generic : raw;
    if (/\s/.test(raw) && !/^[A-Za-z]+(?:Error|Exception)\b/.test(raw)) return raw;
    return generic;
  };
  const _errBar = (function () {
    let el = null;
    function ensure() {
      if (el || typeof document === 'undefined' || !document.body) return;
      const st = document.createElement('style');
      st.textContent = '#izErrBar{position:fixed;left:0;right:0;bottom:0;z-index:99998;display:none;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;background:#b91c1c;color:#fff;font:700 13px -apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Noto Sans JP\',sans-serif;padding:10px 14px;text-align:center;}'
        + '#izErrBar button{background:#fff;color:#b91c1c;border:0;border-radius:8px;padding:6px 14px;font-weight:800;cursor:pointer;}';
      document.head.appendChild(st);
      el = document.createElement('div'); el.id = 'izErrBar';
      el.innerHTML = '<span id="izErrTx"></span><button type="button" id="izErrBtn"></button>';
      el.querySelector('#izErrBtn').onclick = function () { location.reload(); };
      document.body.appendChild(el);
    }
    return {
      show: function () {
        ensure(); if (!el) return;
        el.querySelector('#izErrTx').textContent = _isEN()
          ? 'Having trouble connecting to the server. Some data may not have loaded correctly.'
          : 'サーバーとの通信がうまくいっていません。データが正しく表示されていない可能性があります。';
        el.querySelector('#izErrBtn').textContent = _isEN() ? '🔄 Reload' : '🔄 再読み込み';
        el.style.display = 'flex';
      },
      hide: function () { if (el) el.style.display = 'none'; }
    };
  })();

  function _fetchOnce(body, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(function () { ctrl.abort('timeout'); }, ms);
    return fetch(CFG.API_URL + '?api=1', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow',
      signal: ctrl.signal
    }).then(function (res) {
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          return res.json().catch(function () { throw new Error('http_' + res.status); });
        }
        throw new Error('http_' + res.status);
      }
      return res.json();
    }).finally(function () { clearTimeout(t); });
  }

  const _readFetchPending = new Map();
  function _fetchReadOnce(body, ms) {
    const key = String(ms) + '\n' + body;
    if (_readFetchPending.has(key)) return _readFetchPending.get(key);
    const request = _fetchOnce(body, ms).finally(function () {
      if (_readFetchPending.get(key) === request) _readFetchPending.delete(key);
    });
    _readFetchPending.set(key, request);
    return request;
  }

  var refreshPending = null;
  API.refreshSession = function () {
    if (refreshPending) return refreshPending;
    var beforeToken = storedToken(), before = tokenInfo(beforeToken, true), refreshToken = storedRefreshToken();
    if (!before || before.version !== 'v3' || !refreshToken) return Promise.reject(new Error('invalid_refresh_session'));
    refreshPending = _fetchOnce(JSON.stringify({ action:'refreshSession', storeId:before.store, refreshToken:refreshToken }), TIMEOUT_MS.fast)
      .then(function (json) {
        var after = tokenInfo(json && json.token), nextRefresh = String(json && json.refreshToken || '');
        if (!json || !json.ok || !after || !validRefreshToken(nextRefresh) ||
            before.role !== after.role || before.store !== after.store || before.uid !== after.uid ||
            before.audience !== after.audience || before.sessionId !== after.sessionId || storedToken() !== beforeToken) {
          var invalid = new Error((json && json.error) || 'invalid_refresh_session');
          invalid.__authInvalid = true;
          throw invalid;
        }
        localStorage.setItem(AUTH_PREFIX + 'mgmtRefreshToken', nextRefresh);
        localStorage.setItem(AUTH_PREFIX + 'mgmtToken', json.token);
        return json.token;
      }).catch(function (error) {
        // Hosted Web は複数タブで localStorage のsessionを共有する。別タブが先に
        // refresh tokenをローテーションした場合、このタブの旧refreshは無効になるが、
        // その失敗で新しい共有sessionまで消してはいけない。
        var currentToken = storedToken(), currentRefresh = storedRefreshToken();
        if (currentToken !== beforeToken || currentRefresh !== refreshToken) {
          var current = tokenInfo(currentToken, true);
          if (current && current.version === 'v3' && validRefreshToken(currentRefresh) &&
              current.role === before.role && current.store === before.store && current.uid === before.uid &&
              current.audience === before.audience && current.sessionId === before.sessionId) {
            return currentToken;
          }
        }
        if (error && error.__authInvalid && currentToken === beforeToken && currentRefresh === refreshToken) API.clearSession();
        throw error;
      }).finally(function () { refreshPending = null; });
    return refreshPending;
  };
  API.logoutSession = async function () {
    var token = storedToken(), refreshToken = storedRefreshToken();
    var info = tokenInfo(token, true);
    try {
      if (token || refreshToken) await _fetchOnce(JSON.stringify({ action:'logoutSession', storeId:info ? info.store : '', token:token, refreshToken:refreshToken }), TIMEOUT_MS.fast);
    } catch (e) {
      // Local logout must complete even while offline; server expiry remains the fallback.
    } finally { API.clearSession(); }
  };

  // ---- 低レベル POST ----
  // [GPT第22回レポート対応/G22-1] 重い集計RPC（getSalesAnalytics等）は、呼び出し元（各画面）が
  // 独自のbusy/timeout再試行ロジック（rpcBusyRetry）を持つ。API.post自身の内部再送（下記canRetry）と
  // 重ねると最大4 fetch・総待ち時間100秒超になり得たため、呼び出し元は以下のオプションを渡せる：
  //   payload.__timeoutMs         : このリクエストのfetchタイムアウトを個別に指定（省略時は既定25秒）
  //   payload.__noInternalRetry   : trueならAPI.post自身の内部再送を行わない（＝常に1 fetchのみ）
  // これにより「内部再送」と「画面側再送」の責務を分離し、二重再試行を避ける。
  API.post = async function (action, payload) {
    if (environmentMismatch()) {
      blockEnvironmentMismatch();
      throw new Error('environment_mismatch');
    }
    payload = payload || {};
    const readOnly = _isReadOnly(action, payload.fn);
    const silent = !!payload.__silent || BG_ACTIONS[action] || (action === 'rpc' && BG_RPC[payload.fn]);
    const timeoutMs = (typeof payload.__timeoutMs === 'number') ? payload.__timeoutMs : (readOnly ? TIMEOUT_MS.read : _FETCH_TIMEOUT_MS);
    const noInternalRetry = !!payload.__noInternalRetry;
    const send = Object.assign({}, payload); delete send.__silent; delete send.__msg; delete send.__timeoutMs; delete send.__noInternalRetry;
    if (!send.storeId) {
      if (CFG.STORE_ID) send.storeId = CFG.STORE_ID;
      else if (CFG.PUBLIC_ORDER === true) send.storeId = publicStoreFromQuery();
    }
    if (TABLE_SESSION_ACTIONS[action] && !send.token && !send.tableToken && typeof location !== 'undefined') {
      send.tableToken = new URLSearchParams(location.search).get('t') || '';
    }
    // 2026-08-25追加: 各画面はログイン時に取得したTOKENをページ内変数として持ち続けており、
    // サーバー側がスライディング・エクスパイア（下記newToken参照）でトークンを再発行しても
    // ページ内変数までは自動更新されない。送信直前にlocalStorageのmgmtToken（＝直前のレスポンスの
    // newTokenで更新され得る最新値）があればそちらを優先することで、各画面のコードを一切
    // 変更せずに「操作が続く限りログイン状態を保持する」を実現する。token不要な公開アクション
    // （客注文画面等）には影響しない。
    if (send.token) {
      const latest = storedToken();
      if (latest) send.token = latest;
      const access = tokenInfo(send.token, true);
      if (access && access.version === 'v3' && access.exp <= Date.now() + 60000) {
        try { send.token = await API.refreshSession(); }
        catch (e) {
          var fallbackToken = storedToken();
          var fallbackInfo = tokenInfo(fallbackToken, true);
          if (!fallbackToken) { location.href = './manage.html'; throw new Error('unauthorized'); }
          if (fallbackInfo && fallbackInfo.exp > Date.now()) send.token = fallbackToken;
          else throw e;
        }
      }
    }
    const body = JSON.stringify(Object.assign({ action: action }, send));
    const canRetry = !noInternalRetry && readOnly;
    const fetchOnce = readOnly ? _fetchReadOnce : _fetchOnce;
    if (!silent) _load.show(payload.__msg);
    try {
      let json;
      try {
        json = await fetchOnce(body, timeoutMs);
      } catch (e1) {
        if (!canRetry) { if (!silent) _errBar.show(); throw e1; }
        await new Promise(function (r) { setTimeout(r, _RETRY_DELAY_MS); });
        try {
          json = await fetchOnce(body, timeoutMs);
        } catch (e2) {
          if (!silent) _errBar.show();
          throw e2;
        }
      }
      _errBar.hide();
      if (!json.ok) {
        // ログイントークン失効（unauthorized）は生のエラーを見せず、管理画面（ログイン）へ自動的に戻す
        if (json.error === 'unauthorized' && API.isCurrentToken(send.token)) {
          try { API.clearSession(); localStorage.removeItem(AUTH_PREFIX + 'mgmtName'); localStorage.removeItem(AUTH_PREFIX + 'mgmtRole'); } catch (e) {}
          location.href = './manage.html';
        }
        // Legacy page catch handlers redirect on the literal "unauthorized".
        // A stale rejection must not trigger those handlers against a newer login.
        const stale = json.error === 'unauthorized' && storedToken() && !API.isCurrentToken(send.token);
        const e = new Error(stale ? 'stale_session_response' : (json.error || 'api_error')); e.__server = true; throw e;
      }
      if (send.token && !API.isCurrentToken(send.token)) {
        const sent = tokenInfo(send.token), current = tokenInfo(storedToken());
        if (!current || !sent || sent.uid !== current.uid || sent.store !== current.store || sent.role !== current.role || sent.audience !== current.audience) {
          throw new Error('stale_session_response');
        }
      }
      // 2026-08-25追加: サーバー側（gasApi.js handleGasCompatRequest）がスライディング・
      // エクスパイアで再発行したトークンをlocalStorageへ反映する。これにより、設定画面で
      // 設定したログイン保持時間の範囲内で操作が続く限りログイン状態が維持され、無操作のまま
      // その時間が過ぎれば（新しいnewTokenが来ないため）元のトークンの期限どおり自動的に
      // ログアウトされる。
      if (json.newToken && API.isCurrentToken(send.token)) {
        const before = tokenInfo(send.token), after = tokenInfo(json.newToken);
        if (before && after && before.role === after.role && before.store === after.store && before.uid === after.uid && before.audience === after.audience) {
          try { localStorage.setItem(AUTH_PREFIX + 'mgmtToken', json.newToken); } catch (e) {}
        }
      }
      return json;
    } finally {
      if (!silent) _load.hide();
    }
  };

  API.dateKeysInTimeZone = function (timeZone, at) {
    var tz = String(timeZone || 'UTC').trim() || 'UTC';
    var now = at instanceof Date ? at : new Date();
    var parts;
    try {
      parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
    } catch (e) {
      tz = 'UTC';
      parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
    }
    var map = {};
    parts.forEach(function (p) { if (p.type !== 'literal') map[p.type] = p.value; });
    var date = map.year + '-' + map.month + '-' + map.day;
    return { timezone:tz, date:date, month:map.year + '-' + map.month };
  };

  API.getStoreDateKeys = function () {
    return API.post('getSettings', { __silent:true }).then(function (r) {
      var settings = (r && r.data) || {};
      return API.dateKeysInTimeZone(settings.timezone || 'UTC');
    }).catch(function () {
      return API.dateKeysInTimeZone('UTC');
    });
  };

  API.initStoreDateInputs = function (specs, onAdjusted) {
    specs = Array.isArray(specs) ? specs : [];
    var fallback = API.dateKeysInTimeZone('UTC'), initial = {};
    specs.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (!el || !fallback[s.kind]) return;
      if (!el.value) el.value = fallback[s.kind];
      initial[s.id] = el.value;
    });
    if (window.DateDisplay) window.DateDisplay.refresh();
    return API.getStoreDateKeys().then(function (keys) {
      var adjusted = false;
      specs.forEach(function (s) {
        var el = document.getElementById(s.id);
        if (!el || !keys[s.kind] || initial[s.id] === undefined) return;
        if (el.value === initial[s.id] && el.value !== keys[s.kind]) {
          el.value = keys[s.kind];
          adjusted = true;
        }
      });
      if (window.DateDisplay) window.DateDisplay.refresh();
      if (adjusted && typeof onAdjusted === 'function') onAdjusted(keys);
      return keys;
    });
  };

  // ---- IndexedDB（送信待ち注文の保管） ----
  function openDB() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(CFG.OFFLINE_DB_NAME, 1);
      r.onupgradeneeded = function () {
        const db = r.result;
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function tx(store, mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
    }));
  }
  API.queuePut = (rec) => tx('outbox', 'readwrite', (s) => s.put(rec));
  API.queueDel = (id) => tx('outbox', 'readwrite', (s) => s.delete(id));
  API.queueAll = () => tx('outbox', 'readonly', (s) => {
    return new Promise((resolve) => {
      const items = [];
      s.openCursor().onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { items.push(cur.value); cur.continue(); }
        else resolve(items);
      };
    });
  });

  // ---- 注文送信（オフライン耐性つき） ----
  // 返り値: 'sent'（サーバ確定） / 'queued'（オフライン保留）
  // clientId でサーバ側が冪等化するため、再送しても二重登録されない。
  API.submitOrder = async function (order, authToken) {
    if (!order.clientId) order.clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    var currentQueueStoreId = API.currentStoreId() || '';
    var authQueueStoreId = (authToken && tokenInfo(authToken, true) || {}).store || '';
    if (authQueueStoreId && currentQueueStoreId && authQueueStoreId !== currentQueueStoreId) {
      return 'rejected:store_context_mismatch';
    }
    var queueStoreId = authQueueStoreId || currentQueueStoreId;
    var authQueueInfo = authToken ? tokenInfo(authToken, true) : null;
    var queueSessionId = authQueueInfo && authQueueInfo.sessionId || '';
    var queueUserId = authQueueInfo && authQueueInfo.uid || '';
    // Never create an unassigned outbox record. It could later be replayed
    // under a different staff account/store after logout and login.
    if (!queueStoreId) return 'rejected:store_context_required';
    // オフラインが自明なら即キュー（無駄な待ち時間を回避）
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await API.queuePut({ id: order.clientId, storeId: queueStoreId, sessionId: queueSessionId, userId: queueUserId, order: order, token: authToken || '', ts: Date.now(), attempts: 0 });
      return 'queued';
    }
    try {
      const payload = { order: order, __timeoutMs: TIMEOUT_MS.write };
      if (authToken) payload.token = authToken;
      const res = await API.post('submitOrder', payload);
      const d = res && res.data;
      // [H4] ロック競合による一時的な失敗はサーバー未登録なので再送キューへ（「拒否」扱いにしない）。
      if (d === 'Locked, please retry') { await API.queuePut({ id: order.clientId, storeId: queueStoreId, sessionId: queueSessionId, userId: queueUserId, order: order, token: authToken || '', ts: Date.now(), attempts: 0 }); return 'queued'; }
      if (d && d !== 'OK') {
        var rejectReason = (typeof d === 'object' && d.error) ? d.error : d;
        return 'rejected:' + rejectReason;
      }   // サーバが拒否（例: Invalid table / coupon_unavailable）。キューせず即エラー通知
      return 'sent';
    } catch (err) {
      await API.queuePut({ id: order.clientId, storeId: queueStoreId, sessionId: queueSessionId, userId: queueUserId, order: order, token: authToken || '', ts: Date.now(), attempts: 0 });
      return 'queued';
    }
  };

  // ---- 送信待ちの再送（online復帰・定期・起動時に呼ぶ） ----
  // ネットワーク不通なら中断して次の機会に。サーバ到達済みの業務エラーは
  // 再送しても無駄なので試行上限で破棄し、キューの目詰まりを防ぐ。
  var _flushPending = null;
  API.canFlushQueuedOrder = function (rec, currentStoreId) {
    // Legacy records without an immutable originating store are quarantined;
    // never fill their empty storeId using the currently logged-in session.
    if (!(rec && typeof rec.storeId === 'string' && rec.storeId &&
      currentStoreId && rec.storeId === currentStoreId)) return false;
    if (rec.blocked) return false;
    if (rec.token) {
      var info = tokenInfo(rec.token, true);
      if (!info || info.store !== rec.storeId) return false;
      var currentInfo = tokenInfo(storedToken(), true);
      if (!currentInfo || currentInfo.store !== rec.storeId || currentInfo.uid !== info.uid) return false;
      var originatingSessionId = rec.sessionId || info.sessionId || '';
      if (originatingSessionId && currentInfo.sessionId !== originatingSessionId) return false;
      if (!originatingSessionId && info.version === 'v2' && rec.token !== storedToken()) return false;
    }
    return true;
  };
  API.flush = function () {
    if (_flushPending) return _flushPending;
    _flushPending = (async function () {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { sent: 0, dropped: 0, remaining: await API.pendingCount(), offline: true };
      }
      const pending = await API.queueAll();
      let sent = 0, dropped = 0, quarantined = 0;
      const currentStoreId = API.currentStoreId() || '';
      for (const rec of pending) {
        if (!API.canFlushQueuedOrder(rec, currentStoreId)) {
          quarantined++;
          continue;
        }
      try {
        const payload = { order: rec.order, __silent: true, __timeoutMs: TIMEOUT_MS.write };
        if (rec.storeId) payload.storeId = rec.storeId;
        if (rec.token) payload.token = rec.token;
        const res = await API.post('submitOrder', payload);
        const d = res && res.data;
        if (d === 'Locked, please retry') {
          rec.attempts = (rec.attempts || 0) + 1;
          await API.queuePut(rec);
          continue;
        }
        if (d && d !== 'OK') {
          rec.attempts = (rec.attempts || 0) + 1;
          rec.blocked = true;
          rec.lastError = String((typeof d === 'object' && d.error) ? d.error : d);
          await API.queuePut(rec);
          continue;
        }
        await API.queueDel(rec.id);
        sent++;
      } catch (err) {
        if (err && err.__server) {
          rec.attempts = (rec.attempts || 0) + 1;
          rec.blocked = true;
          rec.lastError = String(err.message || err || 'server_error');
          await API.queuePut(rec);
          continue; // 次の保留分へ
        }
        break; // ネットワーク不通。次の機会に。
      }
      }
      const remaining = await API.pendingCount();
      return { sent: sent, dropped: dropped, remaining: remaining, quarantined: quarantined };
    })().finally(function () { _flushPending = null; });
    return _flushPending;
  };

  API.pendingCount = async function () {
    const status = await API.pendingStatus();
    return status.sendable;
  };
  API.pendingStatus = async function () {
    const all = await API.queueAll();
    const currentStoreId = API.currentStoreId() || '';
    var sendable=0, attention=0;
    all.forEach(function(rec){
      if (!(rec && rec.storeId && currentStoreId && rec.storeId===currentStoreId)) return;
      if (rec.blocked) { attention++; return; }
      if (API.canFlushQueuedOrder(rec,currentStoreId)) sendable++;
    });
    return { sendable:sendable, attention:attention };
  };

  function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer), out = '', chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) out += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
    return btoa(out);
  }
  API.fileToBase64 = async function (file) {
    if (!file) throw new Error('file_required');
    if (typeof file.arrayBuffer === 'function') { try { return bufferToBase64(await file.arrayBuffer()); } catch (e) {} }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '').split(',')[1] || ''); };
      reader.onerror = function () { reject(new Error('file_read_failed')); };
      reader.onabort = function () { reject(new Error('file_read_aborted')); };
      try { reader.readAsDataURL(file); } catch (e) { reject(new Error('file_read_failed')); }
    });
  };
  API.readFileAsDataURL = async function (file) { return 'data:' + String((file && file.type) || 'application/octet-stream') + ';base64,' + await API.fileToBase64(file); };
  API.readFileAsText = async function (file) {
    if (!file) throw new Error('file_required');
    if (typeof file.text === 'function') { try { return await file.text(); } catch (e) {} }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('file_read_failed')); };
      reader.onabort = function () { reject(new Error('file_read_aborted')); };
      try { reader.readAsText(file, 'utf-8'); } catch (e) { reject(new Error('file_read_failed')); }
    });
  };

  window.API = API;

  // Authenticated HTML is reachable through guide links, bookmarks and bfcache as well as the
  // management hub. Enforce the same page matrix at the page boundary and re-check on bfcache
  // restore so a permission revoked while the page was open cannot keep operating.
  const PAGE_PERMISSION = Object.freeze({
    'admin.html':'admin','kds.html':'kds','takeout.html':'takeout','order-entry.html':'admin',
    'dashboard.html':'dashboard','sales.html':'sales','expenses.html':'expenses','profit.html':'profit','profit_sim.html':'profit',
    'register.html':'register','feedback.html':'feedback','receipts.html':'receipts','commission.html':'commission',
    'inventory.html':'inventory','drink_inv.html':'inventory','moves.html':'inventory','purchasing.html':'purchasing','order_items.html':'order_items',
    'menu_editor.html':'menu_editor','recipe.html':'recipe','clock.html':'clock','attendance.html':'attendance','users.html':'users',
    'todo.html':'todo','requests.html':'requests','members.html':'members','birthdays.html':'birthdays','coupons.html':'coupons',
    'reservations.html':'reservations','printers.html':'printers','bridge.html':'printers','audit.html':'audit',
    'data_admin.html':'backup','backup.html':'backup','settings.html':'settings','subscription.html':'settings'
  });
  function localPageName(href) {
    try {
      var u = href ? new URL(href, location.href) : new URL(location.href);
      if (u.origin !== location.origin) return '';
      return (u.pathname.split('/').pop() || 'index.html').toLowerCase();
    } catch (e) { return ''; }
  }
  function permissionReturnTarget(search, hash, currentPage) {
    try {
      var qs = new URLSearchParams(String(search || ''));
      if (qs.get('from') === 'overview') {
        var anchor = String(qs.get('return') || '').trim();
        if (!/^guide-overview-[a-z0-9-]+$/i.test(anchor)) {
          var guideHash = String(hash || '').replace(/^#/, '');
          var fallback = {'guide-menu-form':'guide-overview-start','guide-order-start':'guide-overview-start','guide-seat-qr':'guide-overview-qr','guide-kitchen-setting':'guide-overview-kitchen','guide-kds-orders':'guide-overview-kitchen','guide-printer-setup':'guide-overview-printer','guide-bridge-connect':'guide-overview-printer'};
          anchor = fallback[guideHash] || '';
        }
        return './overview.html' + (anchor ? '#'+anchor : '');
      }
      var back = String(qs.get('back') || '').trim().toLowerCase();
      if (/^[a-z0-9_-]+\.html$/i.test(back) && back !== String(currentPage || '').toLowerCase()) return './' + back;
    } catch (e) {}
    return '';
  }
  function rememberPermissionPage(page) {
    page = String(page || '').trim().toLowerCase();
    if (!/^[a-z0-9_-]+\.html$/i.test(page)) return;
    try { sessionStorage.setItem('izPermissionLastAllowedPage', page); } catch (e) {}
  }
  function lastAllowedPermissionTarget(currentPage) {
    try {
      var page = String(sessionStorage.getItem('izPermissionLastAllowedPage') || '').trim().toLowerCase();
      if (/^[a-z0-9_-]+\.html$/i.test(page) && page !== String(currentPage || '').toLowerCase()) return './' + page;
    } catch (e) {}
    return '';
  }
  function denyPage() {
    var en = String(document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    try { sessionStorage.setItem('izPermissionNotice', en ? 'You do not have permission to open that page.' : 'この画面を開く権限がありません。'); } catch (e) {}
    try {
      var explicitReturn = permissionReturnTarget(location.search, location.hash, localPageName());
      if (explicitReturn) { location.replace(explicitReturn); return; }
    } catch (e) {}
    var lastAllowedReturn = lastAllowedPermissionTarget(localPageName());
    if (lastAllowedReturn) { location.replace(lastAllowedReturn); return; }
    try {
      if (document.referrer) {
        var ref = new URL(document.referrer);
        if (ref.origin === location.origin && history.length > 1) { history.back(); return; }
      }
    } catch (e) {}
    location.replace('./manage.html?permission=denied');
  }
  var permissionGateEl = null;
  function ensurePermissionGate() {
    if (permissionGateEl || typeof document === 'undefined' || !document.body) return permissionGateEl;
    var st = document.createElement('style');
    st.textContent = '#izPermissionGate{position:fixed;inset:0;z-index:2147483646;display:none;align-items:center;justify-content:center;padding:24px;background:#f8fafc;color:#17233a;font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;text-align:center}'
      + '#izPermissionGate .iz-permission-card{width:min(440px,100%);background:#fff;border:1px solid #d8e1ee;border-radius:16px;padding:20px;box-shadow:0 12px 36px rgba(15,23,42,.14)}'
      + '#izPermissionGate button{margin-top:14px;border:0;border-radius:10px;padding:10px 16px;background:#0b48bd;color:#fff;font-weight:800;cursor:pointer}';
    document.head.appendChild(st);
    permissionGateEl = document.createElement('div'); permissionGateEl.id = 'izPermissionGate';
    permissionGateEl.innerHTML = '<div class="iz-permission-card"><div id="izPermissionGateText"></div><button type="button" id="izPermissionGateRetry"></button></div>';
    document.body.appendChild(permissionGateEl);
    return permissionGateEl;
  }
  function showPermissionGate(state, retry) {
    var gate = ensurePermissionGate(); if (!gate) return;
    var en = String(document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var checking = state !== 'network';
    gate.querySelector('#izPermissionGateText').textContent = checking ? (en ? 'Checking your access…' : 'アクセス権限を確認しています…') : (en ? 'Cannot connect right now. Check your connection and try again.' : '通信できません。接続を確認して再試行してください。');
    var btn = gate.querySelector('#izPermissionGateRetry');
    btn.textContent = en ? 'Retry' : '再試行'; btn.style.display = checking ? 'none' : '';
    btn.onclick = typeof retry === 'function' ? retry : null;
    gate.style.display = 'flex';
  }
  function hidePermissionGate() { if (permissionGateEl) permissionGateEl.style.display = 'none'; }
  function showPermissionNotice() {
    var message = '';
    try { message = sessionStorage.getItem('izPermissionNotice') || ''; if (message) sessionStorage.removeItem('izPermissionNotice'); } catch (e) {}
    if (!message) return;
    setTimeout(function () {
      if (typeof window.UIAlert === 'function') window.UIAlert(message);
      else {
        var old = document.getElementById('izPermissionNoticeBox'); if (old) old.remove();
        var box = document.createElement('div'); box.id = 'izPermissionNoticeBox'; box.textContent = message;
        box.style.cssText = 'position:fixed;left:16px;right:16px;top:max(16px,env(safe-area-inset-top));z-index:2147483647;margin:auto;max-width:520px;background:#7f1d1d;color:#fff;padding:13px 16px;border-radius:12px;box-shadow:0 8px 24px rgba(15,23,42,.28);font:700 14px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;';
        (document.body || document.documentElement).appendChild(box); setTimeout(function(){ if(box.parentNode) box.remove(); }, 3500);
      }
    }, 0);
  }
  var permissionLinkObserver = null, permissionLinkMe = null;
  function filterPermissionLinks(me) {
    permissionLinkMe = me || permissionLinkMe;
    me = permissionLinkMe;
    var allowed = (me && (me.roleAllowed || me.allowed)) || {};
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var target = localPageName(a.getAttribute('href'));
      var key = PAGE_PERMISSION[target];
      var denied = (target === 'account.html' && !(me && me.accountOwner === true)) || (key && allowed[key] !== true);
      if (denied && localPageName() === 'overview.html') { a.hidden = false; a.removeAttribute('aria-hidden'); a.removeAttribute('data-permission-hidden'); a.setAttribute('data-permission-denied', ''); }
      else if (denied) { a.hidden = true; a.setAttribute('aria-hidden', 'true'); a.setAttribute('data-permission-hidden', ''); }
      else { a.removeAttribute('data-permission-denied'); }
    });
    if (!permissionLinkObserver && typeof MutationObserver !== 'undefined' && document.documentElement) {
      permissionLinkObserver = new MutationObserver(function (changes) {
        if (changes.some(function (c) { return c.addedNodes && c.addedNodes.length; })) filterPermissionLinks(permissionLinkMe);
      });
      permissionLinkObserver.observe(document.documentElement, { childList:true, subtree:true });
    }
  }
  var overviewPermissionClickBound = false;
  function bindOverviewPermissionNavigation() {
    if (overviewPermissionClickBound || typeof document === 'undefined') return;
    overviewPermissionClickBound = true;
    document.addEventListener('click', function (ev) {
      if (localPageName() !== 'overview.html') return;
      var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null; if (!a) return;
      var target = localPageName(a.getAttribute('href')), key = PAGE_PERMISSION[target]; if (!key) return;
      ev.preventDefault(); ev.stopPropagation();
      function finish(){ var allowed=(permissionLinkMe&&(permissionLinkMe.roleAllowed||permissionLinkMe.allowed))||{}; if(allowed[key]===true){location.href=a.getAttribute('href');return;} var en=String(document.documentElement.lang||'').toLowerCase().indexOf('en')===0; try{sessionStorage.setItem('izPermissionNotice',en?'You do not have permission to open that page.':'この画面を開く権限がありません。');}catch(e){} showPermissionNotice(); }
      if(permissionLinkMe){finish();return;} API.enforcePagePermission().then(function(ok){if(ok)finish();}).catch(function(){});
    }, true);
  }
  API.enforcePagePermission = async function () {
    if (typeof location === 'undefined' || typeof document === 'undefined') return true;
    var page = localPageName();
    var key = PAGE_PERMISSION[page];
    var nativePrintOneShot = page === 'bridge.html' && /(?:^|[?&])oneshot=1(?:&|$)/.test(String(location.search || ''));
    var shouldInspectLinks = page === 'overview.html';
    var accountPage = page === 'account.html';
    if (!key && !accountPage && !shouldInspectLinks) return true;
    var token = storedToken();
    if (!token) { if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
    try {
      var r = await API.post('checkToken', { token:token, __silent:true, __noInternalRetry:true });
      if (!r || !r.valid || !r.me) { if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
      filterPermissionLinks(r.me);
      if (accountPage && r.me.accountOwner !== true) { hidePermissionGate(); denyPage(); return false; }
      var allowed = r.me.roleAllowed || r.me.allowed || {};
      if (nativePrintOneShot) {
        if (!(allowed.admin === true || allowed.receipts === true || allowed.printers === true || allowed.settings === true)) { hidePermissionGate(); denyPage(); return false; }
      } else if (key && allowed[key] !== true) { hidePermissionGate(); denyPage(); return false; }
      if (key || accountPage) hidePermissionGate();
      rememberPermissionPage(page);
      return true;
    } catch (e) {
      var code = String(e && e.message || e || '');
      if (e && e.__server && /^(?:forbidden|forbidden_page:|forbidden_fn)/.test(code)) { if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
      if (code === 'unauthorized' || code === 'stale_session_response') { if (key || accountPage) hidePermissionGate(); return false; }
      if (key || accountPage) showPermissionGate('network', function(){ API.enforcePagePermission().catch(function(){}); });
      return false;
    }
  };
  function runPagePermissionGuard() { API.enforcePagePermission().catch(function () {}); }
  if (typeof document !== 'undefined') {
    bindOverviewPermissionNavigation();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ showPermissionNotice(); runPagePermissionGuard(); }, { once:true });
    else { showPermissionNotice(); runPagePermissionGuard(); }
    window.addEventListener('pageshow', function (event) { showPermissionNotice(); if (event.persisted) runPagePermissionGuard(); });
  }



  // ---- テスト環境バッジ（config.jsで TEST_ENV:true のときだけ表示。本番では出ない）----
  if (CFG && CFG.TEST_ENV && typeof document !== 'undefined') {
    var _mkBadge = function () {
      if (document.getElementById('izTestBadge')) return;
      var b = document.createElement('div');
      b.id = 'izTestBadge';
      b.textContent = '🧪 TEST';
      b.style.cssText = 'position:fixed;left:0;bottom:0;z-index:2147483647;background:#b91c1c;color:#fff;font:800 12px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:4px 10px;border-top-right-radius:8px;letter-spacing:1px;pointer-events:none;opacity:.92;';
      (document.body || document.documentElement).appendChild(b);
    };
    if (document.body) _mkBadge(); else document.addEventListener('DOMContentLoaded', _mkBadge);
  }

  // Register on every screen, including login. Never reload during login/form entry:
  // Critical auth scripts prefer network, with exact-release offline fallback only.
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    function registerServiceWorker() {
      try { return navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(function () {}); }
      catch (e) { return Promise.resolve(); }
    }
    registerServiceWorker();
    window.addEventListener('pageshow', function (event) {
      if (!event.persisted) return;
      try {
        navigator.serviceWorker.getRegistration('./').then(function (registration) {
          if (registration) return registration.update();
          return registerServiceWorker();
        }).catch(function () {});
      } catch (e) {}
    });
  }

  // 入力欄でEnter→そのブロックの主ボタンを実行（フォーム未使用のため共通で補う）。
  // i18n.js を読まないページ（注文/KDS/テイクアウト等）でもここで有効化。二重バインドは防止。
  if (typeof window !== 'undefined' && !window.__izEnterBound) {
    window.__izEnterBound = true;
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229 || e.defaultPrevented) return;
      var t = e.target;
      if (!t || t.tagName !== 'INPUT') return;
      var ty = (t.getAttribute('type') || 'text').toLowerCase();
      if (['checkbox','radio','file','button','submit','reset','range','color','date','datetime-local','month','week','time'].indexOf(ty) >= 0) return;
      if (t.hasAttribute('data-noenter')) return;
      var scope = (t.closest && t.closest('.card, .login, form, .sheet, .box, section')) || document.body;
      var btns = scope.querySelectorAll('button'), fb = null, i, b, cls;
      for (i = 0; i < btns.length; i++) {
        b = btns[i];
        if (b.hasAttribute('data-tlang') || b.disabled) continue;
        if (b.offsetParent === null && b.getClientRects().length === 0) continue;
        if (!fb) fb = b;
        cls = ' ' + b.className + ' ';
        if (cls.indexOf(' btn-sec ') < 0 && cls.indexOf(' sec ') < 0 && cls.indexOf(' act-back ') < 0 && cls.indexOf(' close ') < 0) { fb = b; break; }
      }
      if (fb) { e.preventDefault(); fb.click(); }
    }, false);
  }
})();
