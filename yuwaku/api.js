// API クライアント ＋ オフライン送信キュー（IndexedDB）
// GASは Content-Type: text/plain でPOSTするとプリフライトを回避できる。
(function () {
  const CFG = Object.freeze(Object.assign({}, window.APP_CONFIG || {}));
  const AUTH_PREFIX = CFG.AUTH_STORAGE_PREFIX;
  const API = {};
  // Shared CSV serializer for Backup and Data Admin. Quote-based CSV escaping
  // alone does not protect spreadsheet viewers from formula execution.
  // Prefix potentially active *text* fields with an apostrophe. A doubled
  // apostrophe protects original text that already starts with one.
  API.csvSafeCell = function (value) {
    var s = value == null ? '' : String(value);
    if (typeof value === 'string' && /^'*[ \t\r\n]*[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  API.csvRestoreCell = function (value) {
    var s = String(value == null ? '' : value);
    return /^'+[ \t\r\n]*[=+\-@]/.test(s) ? s.slice(1) : s;
  };

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
  function setStoredToken(token) {
    var before = storedToken(), next = String(token || '');
    if (next) localStorage.setItem(AUTH_PREFIX + 'mgmtToken', next);
    else localStorage.removeItem(AUTH_PREFIX + 'mgmtToken');
    if (before !== next) {
      // localStorage 'storage' never fires in the writing document.
      // The shared header must see refresh/logout without a page reload.
      // No credentials are carried in the event.
      try { window.dispatchEvent(new Event('iz-auth-session-changed')); } catch (_) {}
    }
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
    setStoredToken(r.token);
    if (storedToken() !== r.token) throw new Error('auth_storage_unavailable');
  };
  API.isCurrentToken = function (token) { return !!token && storedToken() === token; };
  API.currentStoreId = function () {
    var info = tokenInfo(storedToken(), true);
    if (info) return info.store;
    if (CFG.STORE_ID) return String(CFG.STORE_ID);
    return CFG.PUBLIC_ORDER === true ? publicStoreFromQuery() : '';
  };
  API.currentToken = storedToken;
  API.pageReady = function (options) {
    options = options || {};
    var token = storedToken() || '';
    var storeId = API.currentStoreId();
    if ((options.auth || 'optional') === 'required' && !token) return Promise.reject(new Error('unauthorized'));
    if (options.requireStore === true && !storeId) return Promise.reject(new Error('invalid_store_link'));
    return Promise.resolve(Object.freeze({ token:token, storeId:storeId }));
  };
  API.clearSession = function () {
    try { setStoredToken(''); localStorage.removeItem(AUTH_PREFIX + 'mgmtRefreshToken'); } catch (e) {}
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
      },
      reset: function () {
        count = 0;
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        if (el) { el.classList.remove('on'); el.style.display = 'none'; }
      }
    };
  })();
  API.loading = _load; // 手動利用も可（API.loading.show('...') / .hide()）

  // 定期ポーリング等、待機表示を出さない（点滅防止）アクション
  const BG_ACTIONS = { checkToken: 1, getOrders: 1, getOperationsDelta: 1, checkoutStatus: 1, bootstrap: 1, getSettings: 1, getStaffCalls: 1, getTableCheckoutStamp: 1 };
  const TABLE_SESSION_ACTIONS = { submitOrder:1, getOrdersByTable:1, getTableCheckoutStamp:1, setTablePartySize:1, getTablePartySize:1, callStaff:1, submitFeedback:1 };
  const BG_RPC = { getPrintQueue: 1, getPrintQueueCounts: 1, getSettings: 1, searchMenuImages: 1, searchMenuImagesV2: 1 };
  const BACKGROUND_MUTATION_ACTIONS = { bridgePoll:1, bridgeAck:1 };
  const BACKGROUND_MUTATION_RPC = { nativePrintPoll:1, nativePrintAck:1, searchMenuImages:1 };

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
  // Common-Worker 429 is a rejection BEFORE any tenant business handler runs.
  // Repeat only proven read-only actions, never payments, orders or purchases.
  const _BACKPRESSURE_READ_ACTIONS = { bootstrap:1, getSettings:1, getAllMenuForAdmin:1, getOperationsDelta:1 };
  function _backpressureDelay(attempt) {
    return Math.min(3000, 1000 * Math.pow(1.4, attempt)) + Math.floor(Math.random() * 200);
  }
  const _READ_ACTIONS = { getSettings: 1, checkToken: 1, bootstrap: 1, checkoutStatus: 1, getStaffCalls: 1, getTableCheckoutStamp: 1, getOperationsDelta: 1, getEmployeeStatuses: 1, validateCoupon:1, loyaltyLookup:1, verifyManagerApproval:1 };
  const _READ_RPC = { exportSheetData:1, profitSimGetMonthly:1 };
  function _isReadOnly(action, fn) {
    if (action === 'rpc') return !!_READ_RPC[fn] || /^(get|check|list|count|fetch)/i.test(fn || '');
    return !!_READ_ACTIONS[action] || /^(get|check|list|count|fetch)/i.test(String(action || ''));
  }
  var _mutationSeq = 0;
  var _activeMutations = new Map();
  var _uncertainMutation = null;
  var _mutationMarkerKey = AUTH_PREFIX + 'mutationPending';
  function mutationSnapshot() {
    var items = Array.from(_activeMutations.values());
    return { pending:items.length > 0, count:items.length, actions:items.map(function (x) { return x.action; }), startedAt:items.length ? Math.min.apply(null, items.map(function (x) { return x.startedAt; })) : 0 };
  }
  function persistMutationMarker(entry) { try { localStorage.setItem(_mutationMarkerKey, JSON.stringify({ action:entry.action, startedAt:entry.startedAt })); } catch (e) {} }
  function persistCurrentMutationMarker(){if(_activeMutations.size){var activeItems=Array.from(_activeMutations.values()),active=activeItems[activeItems.length-1];if(active)persistMutationMarker(active);return;}if(_uncertainMutation){try{localStorage.setItem(_mutationMarkerKey,JSON.stringify(_uncertainMutation));}catch(e){}return;}try{localStorage.removeItem(_mutationMarkerKey);}catch(e){}}
  function emitMutationChange() {
    try { if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('iz:mutationchange', { detail:mutationSnapshot() })); } catch (e) {}
  }
  function beginMutation(action) {
    var id='m'+(++_mutationSeq), entry={id:id,action:String(action||'write'),startedAt:Date.now()};
    _activeMutations.set(id,entry); persistMutationMarker(entry); emitMutationChange(); return id;
  }
  function mutationOutcomeUncertain(error) {
    if(!error||error.__abandonedWrite)return false;if(error.__server&&!/^http_5\d\d$/i.test(String(error.message||'')))return false;
    var raw=String((error&&(error.code||error.message))||error||'');
    return /(?:AbortError|timeout|timed out|failed to fetch|networkerror|network request failed|load failed|connection was lost|could not connect|invalid_server_response|stale_session_response|http_5\d\d)/i.test(raw);
  }
  function endMutation(id,uncertain){var entry=_activeMutations.get(id)||null;_activeMutations.delete(id);if(uncertain&&entry)_uncertainMutation={action:entry.action,startedAt:entry.startedAt,uncertain:true,endedAt:Date.now()};persistCurrentMutationMarker();emitMutationChange();}
  function ensureMutationNotice() {
    if (typeof document === 'undefined' || !document.body) return null;
    var el=document.getElementById('izMutationNotice'); if(el)return el;
    el=document.createElement('div'); el.id='izMutationNotice'; el.setAttribute('role','alert');
    el.style.cssText='position:fixed;left:16px;right:16px;bottom:18px;z-index:2147483646;display:none;padding:13px 16px;border-radius:12px;background:#111827;color:#fff;font:800 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,.28)';
    document.body.appendChild(el); return el;
  }
  function mutationBusyText(){return _isEN()?'Processing is still in progress. Please wait until it finishes before leaving this screen.':'処理中です。完了するまでこの画面でお待ちください。';}
  API.mutationState=mutationSnapshot;
  API.isMutationPending=function(){return _activeMutations.size>0;};
  API.guardNavigation=function(){
    if(!_activeMutations.size)return true;
    var el=ensureMutationNotice(); if(el){el.textContent=mutationBusyText();el.style.display='block';clearTimeout(el.__izHideTimer);el.__izHideTimer=setTimeout(function(){if(el)el.style.display='none';},2600);} return false;
  };
  API.consumeInterruptedMutation=function(){
    var raw='';try{raw=localStorage.getItem(_mutationMarkerKey)||'';}catch(e){}
    if(!raw||_activeMutations.size)return null;
    try{var marker=JSON.parse(raw);localStorage.removeItem(_mutationMarkerKey);_uncertainMutation=null;return marker&&marker.startedAt?marker:null;}catch(e){try{localStorage.removeItem(_mutationMarkerKey);}catch(_){}return null;}
  };
  API.resolveMutationUncertainty=function(action){if(_activeMutations.size)return false;if(_uncertainMutation&&action&&String(_uncertainMutation.action||'')!==String(action))return false;_uncertainMutation=null;persistCurrentMutationMarker();return true;};
  if(typeof window!=='undefined'&&window.addEventListener){
    window.addEventListener('beforeunload',function(event){if(!_activeMutations.size)return;event.preventDefault();event.returnValue='';return '';});
    if(typeof document!=='undefined'&&document.addEventListener){document.addEventListener('click',function(event){if(!_activeMutations.size)return;event.preventDefault();event.stopImmediatePropagation();API.guardNavigation();},true);document.addEventListener('submit',function(event){if(!_activeMutations.size)return;event.preventDefault();event.stopImmediatePropagation();API.guardNavigation();},true);}
    try{localStorage.removeItem(_mutationMarkerKey);}catch(e){}
  }
  function _isEN() { try { if(window.I18n&&typeof window.I18n.lang==='function')return window.I18n.lang()==='en';var visible=typeof document!=='undefined'&&document.documentElement&&document.documentElement.dataset&&document.documentElement.dataset.lang;if(visible==='ja'||visible==='en')return visible==='en';var s=localStorage.getItem('lang');if(s==='ja'||s==='en')return s==='en';var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;return String(first||'').toLowerCase().indexOf('ja')!==0; } catch (e) { return true; } }
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
    if (code === 'menu_category_stale' || code === 'category_order_stale' || code === 'category_state_changed')
      return en ? 'The menu category was updated on another device. Refresh the menu editor before saving again.'
        : '別の端末でカテゴリが変更されています。メニュー編集画面を更新してから、内容を確認して保存してください。';
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
    if (code === 'transaction_reset_schema_unavailable' || code === 'transaction_reset_schema_invalid') return en
      ? 'Cannot safely inspect all database tables. Transaction deletion was blocked; contact system support.'
      : '全DBテーブルを安全に検証できないため、取引データの削除を中止しました。システム管理者に確認してください。';
    if (code === 'transaction_reset_unclassified_schema' || code === 'transaction_reset_unscoped_child' || code === 'transaction_reset_protected_child' || code === 'transaction_reset_policy_conflict' || code === 'transaction_reset_dependency_cycle') return en
      ? 'An added table has not passed the transaction/master classification check. No data was deleted. Update the schema policy and CI contract.'
      : '追加テーブルの取引／マスタ分類が未確認です。削除していません。DB分類・CIゲートを更新してください。';
    if (code === 'transaction_reset_schema_outdated') return en
      ? 'This database is missing a transaction-reset migration or concurrent-write lock. No data was deleted. Apply all current migrations.'
      : '取引データ初期化に必要なDBマイグレーションか書き込みロックが不足しています。削除していません。最新マイグレーションを適用してください。';
    if (code === 'transaction_reset_incomplete') return en
      ? 'Transaction reset could not be verified. Check the backup and database before retrying.'
      : '取引データ初期化の完了を検証できませんでした。再操作前にバックアップとDB状態を確認してください。';
    if (code === 'linked_commission_entries') return en
      ? 'These order items have settled commission history and cannot be deleted or replaced by themselves. Delete or replace the Orders table instead.'
      : 'この注文明細には確定済みの歩合履歴があるため、注文明細だけを削除・全置換できません。Ordersテーブル側から削除または全置換してください。';
    if (code === 'bad_header' || code === 'no_matching_columns') return en
      ? 'The CSV header does not match the selected table. Export that table again and import the exported CSV without changing its header.'
      : 'CSVのヘッダーが選択したテーブルと一致しません。対象テーブルをもう一度書き出し、ヘッダーを変更せずにインポートしてください。';
    if (code === 'bad_rows') return en
      ? 'The CSV has missing, extra, or invalid cells. Correct its rows to match the header before importing.'
      : 'CSVの行に欠落・余分なセルや不正な値があります。全行の列数をヘッダーと一致させてください。';
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
    if (code === 'table_in_use') return en
      ? 'One or more seats are still occupied or have active orders. Finish their checkout before reducing the seat count or removing a seating type.'
      : '使用中・未会計の席があるため席数の削減や席種の削除はできません。該当席の会計・退席を完了してから保存してください。';
    if (code === 'invalid_custom_seat_types' || code === 'invalid_seat_count' || code === 'too_many_seats') return en
      ? 'Check each seating type name and count (0–200 each, 1,000 seats in total).'
      : '席種の名称と席数を確認してください（各0〜200席、合計1,000席以内）。';
    if (code === 'invalid_table') return en ? 'The selected table is no longer valid. Select the table again and retry.' : '選択した席が現在の店舗設定と一致しません。席を選び直して再試行してください。';
    if (code === 'no_items') return en ? 'There are no items in this order.' : '注文商品がありません。';
    if (code === 'invalid_quantity') return en ? 'One or more item quantities are invalid. Review the order and retry.' : '商品の数量が正しくありません。注文内容を確認して再試行してください。';
    if (code === 'unknown_item' || code === 'item_unavailable') return en ? 'A menu item in this order is no longer available. Refresh the menu and review the order.' : '注文内の商品が現在のメニューで利用できません。メニューを更新して注文内容を確認してください。';
    if (code === 'item_sold_out') return en ? 'A menu item in this order is sold out. Refresh the menu and review the order.' : '注文内の商品が売り切れになりました。メニューを更新して注文内容を確認してください。';
    if (code === 'sample_item_unavailable' || code === 'mixed_sample_order') return en ? 'This sample order combination cannot be submitted. Review the order and retry.' : 'このサンプル注文の組み合わせでは送信できません。注文内容を確認してください。';
    if (code === 'validation_failed') return en ? 'The order did not pass server validation. Review the table and items, then retry.' : '注文内容のサーバー検証に失敗しました。席と商品を確認して再試行してください。';
    if (code === 'table_state_changed') return en ? 'The selected table changed while the order was being saved. Select the table again and retry.' : '注文保存中に席設定が変更されました。席を選び直して再試行してください。';
    if (code === 'loyalty_points_changed') return en ? 'The member point balance changed while the order was being saved. Refresh the member information and retry.' : '注文保存中に会員ポイント残高が変更されました。会員情報を更新して再試行してください。';
    if (code === 'order_persist_failed') return en ? 'The server could not save the order data. This is an order-save error, not a printing error. Retry after a moment; if it continues, report code: order_persist_failed.' : '注文データをサーバーへ保存できませんでした。印刷処理ではなく注文保存処理のエラーです。少し待って再試行し、続く場合はエラーコード order_persist_failed を連絡してください。';
    if (code === 'order_print_enqueue_failed') return en ? 'The order was saved, but the print job could not be queued. The order is registered; check Printer Settings or the print host before printing again.' : '注文は登録されましたが、印刷ジョブを登録できませんでした。注文自体は登録済みです。再印刷する前にプリンター設定または印刷担当端末を確認してください。';
    if (code === 'store_context_mismatch' || code === 'store_context_required' || code === 'tenant_store_mismatch') return en ? 'The current store and login session do not match. Sign in to this store again before retrying.' : '現在の店舗とログイン情報が一致していません。この店舗へログインし直してから再試行してください。';
    if (code === 'environment_mismatch') return en ? 'The app environment does not match the server environment. Reopen the app and sign in again.' : 'アプリとサーバーの接続環境が一致していません。アプリを開き直して再ログインしてください。';
    if (code === 'request_failed') return en ? 'The request result could not be confirmed. Check the relevant list or history before trying again; do not blindly repeat a payment or other write.' : '処理結果を確認できませんでした。再試行前に対象の一覧・履歴で反映状況を確認してください。会計などの書き込みを確認なしに繰り返さないでください。';
    if (code === 'internal_error' || code === 'api_error') return en ? 'A server error prevented confirmation of this operation. Check whether the change was saved before retrying. If it continues, contact support with code: '+code+'.' : 'サーバー内部エラーで処理結果を確認できません。再試行前に保存・更新結果を確認してください。続く場合はサポートへエラーコード '+code+' を伝えてください。';
    if (code === 'api_upstream_unavailable' || code === 'common_gateway_unavailable' || code === 'control_route_unavailable') return en
      ? 'The service is temporarily unavailable. Check whether the operation was completed before retrying; contact support if it continues. ('+code+')'
      : 'サーバーのサービスが一時的に利用できません。再試行前に処理結果を確認し、続く場合はサポートへご連絡ください。（'+code+'）';
    if (code === 'common_gateway_busy' || code === 'server_busy_retry') return en
      ? 'The server is temporarily busy. Wait a moment, check the result, then try again if needed.'
      : 'サーバーが混み合っています。少し待ち、処理結果を確認してから必要に応じて再試行してください。';
    if (code === 'account_owner_required') return en ? 'Only the registered store owner may perform this action. Sign in using the owner account.' : 'この操作は登録済みの店舗オーナー専用です。オーナーのアカウントでログインしてください。';
    if (code === 'wrong_password') return en ? 'The current password is incorrect. Check it and try again.' : '現在のパスワードが違います。確認して入力し直してください。';
    if (code === 'reason_too_long') return en ? 'The reason must be 500 characters or fewer.' : '理由は500文字以内で入力してください。';
    if (code === 'no_pending_request') return en ? 'There is no pending deletion request to cancel. Refresh the account page to check its current status.' : '取り消し可能な削除申請がありません。アカウント画面を再表示して現在の状態を確認してください。';
    if (code === 'cancel_deadline_passed' || code === 'erasure_in_progress') return en
      ? 'The cancellation deadline has passed or permanent deletion has started. Cancellation is no longer available.'
      : '取消期限を過ぎたか、完全削除処理が始まっています。この申請は取り消せません。';
    if (code === 'owner_email_missing') return en ? 'The store owner has no registered email address. Add one before requesting deletion.' : 'オーナーのメールアドレスが未登録です。アドレスを登録してから削除申請してください。';
    if (code === 'operator_email_not_configured') return en ? 'Deletion notifications cannot be sent because the operator email is not configured. Contact support.' : '運営側の通知メール設定が未完了のため削除申請を進められません。サポートへご連絡ください。';
    if (code === 'email_unverified') return en ? 'Verify your email address using the confirmation link before continuing.' : 'メール内の確認リンクでアドレスを認証してから操作してください。';
    if (code === 'email_taken' || code === 'email_taken_or_pending') return en ? 'This email address is already registered or pending verification. Choose another email address.' : 'このメールアドレスは登録済みか確認待ちです。別のメールアドレスをご利用ください。';
    if (code === 'duplicate_code' || code === 'discount_code_exists') return en ? 'This code is already in use. Enter a different code.' : '同じコードが既に登録されています。別のコードを入力してください。';
    if (code === 'insufficient_stock') return en ? 'Not enough stock is available. Check the inventory and adjust the quantity.' : '在庫数が不足しています。在庫と数量を確認してください。';
    if (code === 'already_refunded' || code === 'already_void' || code === 'already_settled') return en
      ? 'This transaction has already been completed or cancelled. Refresh the list and check its current status before taking another action.'
      : 'この取引は既に処理済みです。一覧を再表示し、現在の状態を確認してから操作してください。';
    if (code === 'translation_unavailable') return en
      ? 'Automatic translation is temporarily unavailable. Please try saving again later, or enter both Japanese and English.'
      : '自動翻訳を一時的に利用できません。時間をおいて再度保存するか、日本語・英語の両方を入力してください。';
    if (code === 'no_printer') return en ? 'No enabled printer is configured. Open Printer Settings, configure or enable a printer, then try again.' : '有効なプリンタが設定されていません。プリンター設定でプリンタを登録・有効化してから、もう一度お試しください。';
    if (code === 'printer_not_configured') return en ? 'Bluetooth is not configured for this printer on its assigned print-host device. Open Printer Settings on that device and connect the printer.' : 'このプリンタは印刷担当端末でBluetooth設定が完了していません。担当端末のプリンター設定から接続してください。';
    if (/^(?:printer_assignment_required|printer_assignment_invalid|print_device_required)$/.test(code)) return en ? 'No valid print-host device is assigned to this printer. Assign a print host in Printer Settings and retry.' : 'このプリンタの印刷担当端末が未設定、または割当が無効です。プリンター設定で担当端末を設定してから再試行してください。';
    if (code === 'printer_connect_failed') return en ? 'The assigned print host could not connect to the saved Bluetooth printer. Check printer power and the saved connection in Printer Settings.' : '印刷担当端末から保存済みBluetoothプリンタへ接続できませんでした。電源とプリンター設定の接続情報を確認してください。';
    if (code === 'printer_profile_unavailable') return en ? 'The Bluetooth printer was found, but its saved print profile could not be restored. Reconnect it from Printer Settings.' : 'Bluetoothプリンタは見つかりましたが、保存済み印刷設定を復元できませんでした。プリンター設定から再接続してください。';
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
    if (code === 'duplicate_recipe') return en
      ? 'The same menu item and ingredient appear more than once. Remove duplicate recipe rows and save again.'
      : '同じメニューと材料の組合せが複数行あります。重複行を削除してから保存してください。';
    if (code === 'credential_import_forbidden') return en
      ? 'The CSV includes a password, token, or secret column. Remove credential columns before importing.'
      : 'CSVにパスワード・トークンなどの機密列が含まれています。機密列を除外してから取り込んでください。';
    if (code === 'invalid_birthday_coupon_amount') return en
      ? 'The birthday coupon amount is invalid. Set birthdayCouponAmount to a positive finite amount and retry.'
      : '誕生日クーポンの金額が不正です。birthdayCouponAmountを正の有限な金額に修正して再試行してください。';
    if (code === 'backup_no_tables') return en
      ? 'The server returned no backup tables. The ZIP was not saved; retry after checking the connection.'
      : 'バックアップ対象テーブルを取得できませんでした。ZIPは保存していません。接続を確認して再試行してください。';
    if (/^backup_table_failed: [a-z_]+$/.test(code)) return en
      ? 'Backup stopped because the table ' + code.slice(21) + ' could not be exported. No incomplete ZIP was saved.'
      : 'テーブル ' + code.slice(21) + ' の書き出しに失敗したため、バックアップを中止しました。不完全なZIPは保存していません。';
    if (code === 'invalid_url') return en ? 'The image URL is invalid.' : '画像URLが正しくありません。';
    if (code === 'not_image') return en ? 'The selected URL did not return an image. Choose another image.' : '選択したURLから画像を取得できませんでした。別の画像を選択してください。';
    if (code === 'too_large') return en ? 'The image is too large. Choose an image smaller than 8 MB.' : '画像サイズが大きすぎます。8MB未満の画像を選択してください。';
    if (code === 'image_fetch_timeout') return en ? 'The image server did not respond in time. Choose another image or try again.' : '画像配信元からの応答がタイムアウトしました。別の画像を選ぶか、もう一度お試しください。';
    if (code === 'image_fetch_failed') return en ? 'The image could not be fetched. Choose another image or try again.' : '画像を取得できませんでした。別の画像を選ぶか、もう一度お試しください。';
    // HTTP codes apply to all API operations, not only image fetches.
    if (code === 'http_403') return en ? 'The server denied this operation (HTTP 403). Check your login and permissions before trying again.' : 'サーバーが操作を拒否しました（HTTP 403）。ログイン状態と操作権限を確認してください。';
    if (code === 'http_404') return en ? 'The requested resource was not found (HTTP 404). Reopen the screen and verify the selected item.' : '対象のデータまたはサービスが見つかりません（HTTP 404）。画面を開き直して対象を確認してください。';
    if (code === 'http_429') return en ? 'Too many requests were made (HTTP 429). Wait a moment and check the operation result before retrying.' : 'アクセス回数の制限に達しました（HTTP 429）。少し待ち、処理結果を確認してから再試行してください。';
    if (code.indexOf('plan_feature_pro_required') === 0) return en ? 'This feature is available on the Pro plan.' : 'この機能はProプランでご利用いただけます。';
    if (code === 'request_timeout') return en ? 'The order request timed out. Please check the order status before trying again.' : '注文送信がタイムアウトしました。注文状況を確認してから再試行してください。';
    if (/^http_5\d\d$/.test(code)) return en ? 'The server returned '+code+'. Check the operation status before retrying; contact support with this code if it continues.' : 'サーバーエラー '+code+' が発生しました。再試行前に処理結果を確認し、続く場合はこのコードをサポートへお伝えください。';
    if (code === 'locked, please retry') return en ? 'The order could not be accepted because the server was busy. Please try again.' : 'サーバーが混み合っているため注文を受け付けられませんでした。もう一度お試しください。';
    if (code === 'save_failed') return en
      ? 'The save result could not be confirmed. Check whether the change is already reflected before saving again. (save_failed)'
      : '保存結果を確認できませんでした。もう一度保存する前に、変更が反映済みか確認してください。（save_failed）';
    if (code === 'delete_failed') return en
      ? 'The deletion result could not be confirmed. Refresh the list before attempting to delete again. (delete_failed)'
      : '削除結果を確認できませんでした。再度削除する前に一覧を更新して状態を確認してください。（delete_failed）';
    if (code === 'load_failed') return en
      ? 'The data could not be loaded. Check your connection and reopen the screen. (load_failed)'
      : 'データを読み込めませんでした。通信状態を確認して画面を開き直してください。（load_failed）';
    if (code === 'auth_environment_not_configured') return en
      ? 'The login service has not been configured correctly. Contact support. (auth_environment_not_configured)'
      : 'ログインサービスの設定が不完全です。サポートへご連絡ください。（auth_environment_not_configured）';
    if (/^http_\d+$/.test(code)) return en ? 'The server returned error '+code+'. Check the result before retrying and contact support if the issue continues.' : 'サーバーエラー '+code+' が発生しました。再試行前に結果を確認し、続く場合はサポートへご連絡ください。';
    if (/failed to fetch|networkerror|aborterror|fetch is aborted|\baborted\b|timeout/i.test(raw)) return network;
    if (/d1_error|sqlite|constraint|primary\s*key|foreign\s*key|sql\b|typeerror|referenceerror|syntaxerror|stack|\bat\s+[^\s]+\s*\(/i.test(raw)) return generic;
    if (/[ぁ-んァ-ヶ一-龠]/.test(raw)) return en ? generic : raw;
    if (/\s/.test(raw) && !/^[A-Za-z]+(?:Error|Exception)\b/.test(raw)) return raw;
    // A stable, compact public code is safe to show, unlike exception text,
    // SQL or HTTP response bodies. This keeps unmapped future business errors
    // diagnosable on-screen without pretending to know their root cause.
    if (/^[a-z][a-z0-9_]{2,63}$/.test(code) && !/^(?:error|failed|unknown|unknown_error)$/.test(code))
      return en ? 'The operation could not be completed. Check the result before retrying; if the issue continues, contact support with code: '+code+'.'
        : '処理を完了できませんでした。再試行前に結果を確認し、続く場合はサポートへエラーコード '+code+' をお伝えください。';
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

  const _readControllers = new Set();
  const _foregroundWriteControllers = new Set();
  function staleReadLifecycleError(){var e=new Error('stale_page_lifecycle');e.__staleLifecycle=true;return e;}
  function abandonedPageWriteError(){var e=new Error('abandoned_page_write');e.__abandonedWrite=true;return e;}
  function _abortForegroundWrites(){_foregroundWriteControllers.forEach(function(ctrl){try{ctrl.__izAbandonedWrite=true;ctrl.abort();}catch(e){}});_foregroundWriteControllers.clear();_activeMutations.clear();_uncertainMutation=null;persistCurrentMutationMarker();emitMutationChange();if(_load&&typeof _load.reset==='function')_load.reset();}
  function _fetchOnce(body, ms, lifecycleBound, foregroundWrite) {
    const ctrl = new AbortController();
    if(lifecycleBound)_readControllers.add(ctrl);
    if(foregroundWrite)_foregroundWriteControllers.add(ctrl);
    const t = setTimeout(function () { ctrl.abort('timeout'); }, ms);
    return fetch(CFG.API_URL + '?api=1', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow',
      signal: ctrl.signal
    }).catch(function(error){if(foregroundWrite&&ctrl.__izAbandonedWrite)throw abandonedPageWriteError();if(lifecycleBound&&ctrl.__izPageLifecycleAbort)throw staleReadLifecycleError();throw error;}).then(function (res) {
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          return res.json().catch(function () { throw new Error('http_' + res.status); });
        }
        throw new Error('http_' + res.status);
      }
      return res.json();
    }).finally(function () { clearTimeout(t); if(lifecycleBound)_readControllers.delete(ctrl); if(foregroundWrite)_foregroundWriteControllers.delete(ctrl); });
  }

  const _readFetchPending = new Map();
  let _readLifecycleGeneration = 0;
  function _resetReadLifecycle() {
    _readLifecycleGeneration++;
    refreshPending = null;
    _readFetchPending.clear();
    _readControllers.forEach(function(ctrl){try{ctrl.__izPageLifecycleAbort=true;ctrl.abort();}catch(e){}});
    _readControllers.clear();
  }
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('pagehide', function(){_abortForegroundWrites();_resetReadLifecycle();});
    window.addEventListener('pageshow', function (event) { if (event && event.persisted) _resetReadLifecycle(); });
  }
  function _fetchReadOnce(body, ms) {
    const generation = _readLifecycleGeneration;
    const key = String(generation) + '\n' + String(ms) + '\n' + body;
    if (_readFetchPending.has(key)) return _readFetchPending.get(key);
    const request = _fetchOnce(body, ms, true).then(function(json){if(generation!==_readLifecycleGeneration)throw staleReadLifecycleError();return json;}).finally(function () {
      if (_readFetchPending.get(key) === request) _readFetchPending.delete(key);
    });
    _readFetchPending.set(key, request);
    return request;
  }
  function _fetchForegroundWriteOnce(body, ms){return _fetchOnce(body,ms,false,true);}

  var refreshPending = null;
  API.refreshSession = function () {
    if (refreshPending) return refreshPending;
    var refreshGeneration = _readLifecycleGeneration;
    var beforeToken = storedToken(), before = tokenInfo(beforeToken, true), refreshToken = storedRefreshToken();
    if (!before || before.version !== 'v3' || !refreshToken) return Promise.reject(new Error('invalid_refresh_session'));
    var operation = _fetchOnce(JSON.stringify({ action:'refreshSession', storeId:before.store, refreshToken:refreshToken }), TIMEOUT_MS.fast)
      .then(function (json) {
        if (refreshGeneration !== _readLifecycleGeneration) throw staleReadLifecycleError();
        var after = tokenInfo(json && json.token), nextRefresh = String(json && json.refreshToken || '');
        if (!json || !json.ok || !after || !validRefreshToken(nextRefresh) ||
            before.role !== after.role || before.store !== after.store || before.uid !== after.uid ||
            before.audience !== after.audience || before.sessionId !== after.sessionId || storedToken() !== beforeToken) {
          var invalid = new Error((json && json.error) || 'invalid_refresh_session');
          invalid.__authInvalid = true;
          throw invalid;
        }
        localStorage.setItem(AUTH_PREFIX + 'mgmtRefreshToken', nextRefresh);
        setStoredToken(json.token);
        return json.token;
      }).catch(function (error) {
        if (error && error.__staleLifecycle) throw error;
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
      });
    var tracked = operation.finally(function () { if (refreshPending === tracked) refreshPending = null; });
    refreshPending = tracked;
    return refreshPending;
  };
  API.logoutSession = async function () {
    var token = storedToken(), refreshToken = storedRefreshToken();
    var info = tokenInfo(token, true);
    // Revoke browser-local credentials before any slow/offline network attempt.
    API.clearSession();
    try {
      if (token || refreshToken) await _fetchOnce(JSON.stringify({ action:'logoutSession', storeId:info ? info.store : '', token:token, refreshToken:refreshToken }), TIMEOUT_MS.fast);
    } catch (e) {
      // Local logout must complete even while offline; server expiry remains the fallback.
    }
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
    const silent = readOnly || !!payload.__silent || BG_ACTIONS[action] || (action === 'rpc' && BG_RPC[payload.fn]);
    const timeoutMs = (typeof payload.__timeoutMs === 'number') ? payload.__timeoutMs : (readOnly ? TIMEOUT_MS.read : _FETCH_TIMEOUT_MS);
    const noInternalRetry = !!payload.__noInternalRetry;
    const backgroundMutation = payload.__backgroundMutation === true || !!BACKGROUND_MUTATION_ACTIONS[action] || (action === 'rpc' && !!BACKGROUND_MUTATION_RPC[payload.fn]);
    const send = Object.assign({}, payload); delete send.__silent; delete send.__msg; delete send.__timeoutMs; delete send.__noInternalRetry; delete send.__backgroundMutation;
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
    const canRetryBackpressure = canRetry && !!_BACKPRESSURE_READ_ACTIONS[action];
    const retryGeneration = _readLifecycleGeneration;
    const fetchOnce = readOnly ? _fetchReadOnce : (backgroundMutation ? _fetchOnce : _fetchForegroundWriteOnce);
    const mutationId = (readOnly || backgroundMutation) ? '' : beginMutation(action === 'rpc' ? ('rpc:' + String(payload.fn || '')) : action);
    let mutationUncertain = false;
    if (!silent) _load.show(payload.__msg);
    try {
      let json;
      try {
        json = await fetchOnce(body, timeoutMs);
      } catch (e1) {
        if(e1&&e1.__abandonedWrite)throw e1;
        if (!canRetry) { if (!silent) _errBar.show(); throw e1; }
        await new Promise(function (r) { setTimeout(r, _RETRY_DELAY_MS); });
        if (retryGeneration !== _readLifecycleGeneration) throw staleReadLifecycleError();
        try {
          json = await fetchOnce(body, timeoutMs);
        } catch (e2) {
          if (!silent) _errBar.show();
          throw e2;
        }
      }
      for (let retry = 0; canRetryBackpressure && json &&
           json.ok === false && json.error === 'common_gateway_busy' && retry < 4; retry++) {
        await new Promise(function(resolve){ setTimeout(resolve, _backpressureDelay(retry)); });
        if (retryGeneration !== _readLifecycleGeneration) throw staleReadLifecycleError();
        json = await fetchOnce(body, timeoutMs);
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
          try { setStoredToken(json.newToken); } catch (e) {}
        }
      }
      return json;
    } catch (error) {
      if (mutationId && !error.__abandonedWrite && mutationOutcomeUncertain(error)) mutationUncertain = true;
      throw error;
    } finally {
      if (mutationId) endMutation(mutationId, mutationUncertain);
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
      const r = indexedDB.open(CFG.OFFLINE_DB_NAME, 2);
      r.onupgradeneeded = function () {
        const db = r.result;
        if (!db.objectStoreNames.contains('outbox')) {
          db.createObjectStore('outbox', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cashSettlements')) db.createObjectStore('cashSettlements', { keyPath:'id' });
        if (!db.objectStoreNames.contains('checkoutSnapshots')) db.createObjectStore('checkoutSnapshots', { keyPath:'id' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('offline_storage_upgrade_blocked'));
    });
  }
  function tx(store, mode, fn) {
    return openDB().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(store, mode);
      const s = t.objectStore(store);
      const out = fn(s);
      t.oncomplete = () => { db.close(); resolve(out && out.result !== undefined ? out.result : out); };
      t.onerror = () => { db.close(); reject(t.error); };
      t.onabort = () => { db.close(); reject(t.error || new Error('offline_storage_transaction_aborted')); };
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
  API.isOrderOfflineError = function (err) {
    if (!err || err.__server) return false;
    var name = String(err.name || '');
    var raw = String(err.message || err || '');
    var signal = name + ' ' + raw;
    if (name === 'AbortError' || /(?:timeout|timed out|\baborted\b)/i.test(signal)) return false;
    if (/^http_\d+$/i.test(raw) || /^(?:environment_mismatch|invalid_server_response|stale_session_response|unauthorized)$/i.test(raw)) return false;
    return /failed to fetch|networkerror|network request failed|load failed|internet disconnected|network connection was lost|could not connect/i.test(signal);
  };
  API.orderSubmitErrorCode = function (err) {
    var name = String(err && err.name || '');
    var raw = String(err && err.message || err || '').trim();
    if (name === 'AbortError' || /(?:timeout|timed out|\baborted\b)/i.test(name + ' ' + raw)) return 'request_timeout';
    return raw || 'request_failed';
  };
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
      if (d === 'Locked, please retry') return 'rejected:Locked, please retry';
      // GAS互換経路は成功を文字列'OK'で返す一方、Native/Direct経路は
      // {ok:true, orderId:...}をdataとして返す。後者を拒否扱いすると、
      // 保存済み注文までrejected:[object Object]となるため両契約を明示的に受理する。
      if (d && typeof d === 'object' && d.ok === true) {
        if (d.printWarning) return 'sent_with_warning:' + d.printWarning;
        return 'sent';
      }
      if (d && d !== 'OK') {
        var rejectReason = (typeof d === 'object' && d.error) ? d.error : d;
        return 'rejected:' + rejectReason;
      }   // サーバが拒否（例: Invalid table / coupon_unavailable）。キューせず即エラー通知
      return 'sent';
      } catch (err) {
        if (!API.isOrderOfflineError(err)) return 'rejected:' + API.orderSubmitErrorCode(err);
        await API.queuePut({ id: order.clientId, storeId: queueStoreId, sessionId: queueSessionId, userId: queueUserId, order: order, token: authToken || '', ts: Date.now(), attempts: 0 });
        API.resolveMutationUncertainty('submitOrder');
        return 'queued';
      }
  };

  // ---- 送信待ちの再送（online復帰・定期・起動時に呼ぶ） ----
  // ネットワーク不通なら中断して次の機会に。サーバ到達済みの業務エラーは
  // 再送しても無駄なので試行上限で破棄し、キューの目詰まりを防ぐ。
  var _flushPending = null;
  API.isQueuedOrderOwnedByCurrentSession = function (rec, currentStoreId) {
    // Legacy records without an immutable originating store are quarantined;
    // never fill their empty storeId using the currently logged-in session.
    if (!(rec && typeof rec.storeId === 'string' && rec.storeId &&
      currentStoreId && rec.storeId === currentStoreId)) return false;
    var currentInfo = tokenInfo(storedToken(), true);
    if (rec.userId || rec.sessionId) {
      if (!currentInfo || currentInfo.store !== rec.storeId) return false;
      if (rec.userId && currentInfo.uid !== rec.userId) return false;
      if (rec.sessionId && currentInfo.sessionId !== rec.sessionId) return false;
    } else if (currentInfo && !rec.token) {
      return false;
    }
    if (rec.token) {
      var info = tokenInfo(rec.token, true);
      if (!info || info.store !== rec.storeId) return false;
      if (!currentInfo || currentInfo.store !== rec.storeId || currentInfo.uid !== info.uid) return false;
      var originatingSessionId = rec.sessionId || info.sessionId || '';
      if (originatingSessionId && currentInfo.sessionId !== originatingSessionId) return false;
      if (!originatingSessionId && info.version === 'v2' && rec.token !== storedToken()) return false;
    }
    return true;
  };
  API.canFlushQueuedOrder = function (rec, currentStoreId) {
    return API.isQueuedOrderOwnedByCurrentSession(rec, currentStoreId) && !rec.blocked;
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
          const payload = { order: rec.order, __silent: true, __timeoutMs: TIMEOUT_MS.write, __backgroundMutation:true };
        if (rec.storeId) payload.storeId = rec.storeId;
        if (rec.token) payload.token = rec.token;
        const res = await API.post('submitOrder', payload);
        const d = res && res.data;
        if (d === 'Locked, please retry') {
          rec.attempts = (rec.attempts || 0) + 1;
          rec.blocked = true;
          rec.lastError = 'Locked, please retry';
            await API.queuePut(rec);
            continue;
          }
          if(d&&typeof d==='object'&&d.ok===true){await API.queueDel(rec.id);API.resolveMutationUncertainty('submitOrder');sent++;continue;}
          if (d && d !== 'OK') {
          rec.attempts = (rec.attempts || 0) + 1;
          rec.blocked = true;
          rec.lastError = String((typeof d === 'object' && d.error) ? d.error : d);
          await API.queuePut(rec);
          continue;
          }
          await API.queueDel(rec.id);
          API.resolveMutationUncertainty('submitOrder');
          sent++;
      } catch (err) {
        if (API.isOrderOfflineError(err)) break; // ネットワーク不通。次の機会に。
        rec.attempts = (rec.attempts || 0) + 1;
        rec.blocked = true;
        rec.lastError = API.orderSubmitErrorCode(err);
        await API.queuePut(rec);
        continue; // timeout/5xx/auth/permission等は原因を保持して要確認にする
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
    var sendable=0, attention=0, attentionReasons=[];
    all.forEach(function(rec){
      if (!(rec && rec.storeId && currentStoreId && rec.storeId===currentStoreId)) return;
      if (!API.isQueuedOrderOwnedByCurrentSession(rec,currentStoreId)) return;
      if (rec.blocked) {
        attention++;
        if (rec.lastError && attentionReasons.indexOf(String(rec.lastError))<0) attentionReasons.push(String(rec.lastError));
        return;
      }
      if (API.canFlushQueuedOrder(rec,currentStoreId)) sendable++;
    });
    return { sendable:sendable, attention:attention, attentionReasons:attentionReasons };
  };

  // Cash accepted while offline is a durable local acknowledgement, NEVER an
  // official checkout or receipt. The server owns the final settlement result.
  function cashActor() {
    if (!API.authReady() || CFG.PUBLIC_ORDER === true) return null;
    var token = storedToken(), info = tokenInfo(token, true);
    if (!info || !info.store || !info.uid || (CFG.STORE_ID && String(CFG.STORE_ID) !== info.store)) return null;
    // A v3 session survives access-token rotation. A legacy v2 session may not
    // replay after its token changes; this is preferable to cross-login replay.
    var session = info.sessionId || token.slice(-32);
    return { ownerKey:info.store + '|' + info.uid + '|' + session,
      storeId:info.store, userId:info.uid, sessionId:info.sessionId };
  }
  // Offline permission fallback is limited to a recently server-authorized
  // admin in this same signed session, before access-token expiry.
  var offlineAdminGrantKey = AUTH_PREFIX + 'offlineAdminPermissionV1';
  API.rememberOfflineAdminGrant = function () {
    var actor = cashActor(), current = tokenInfo(storedToken());
    if (!actor || !current) return;
    try { localStorage.setItem(offlineAdminGrantKey, JSON.stringify({
      ownerKey:actor.ownerKey, grantedAt:Date.now()
    })); } catch(e) {}
  };
  API.hasOfflineAdminGrant = function () {
    var actor = cashActor(), current = tokenInfo(storedToken());
    if (!actor || !current) return false;
    try {
      var grant = JSON.parse(localStorage.getItem(offlineAdminGrantKey)||'null');
      return !!grant && grant.ownerKey===actor.ownerKey &&
        Number(grant.grantedAt)>0 && Date.now()-Number(grant.grantedAt)<=43200000 &&
        Number(grant.grantedAt)<=Date.now();
    } catch(e){return false;}
  };
  API.saveOfflineCheckoutSnapshot = function (snapshot) {
    var actor = cashActor();
    if (!actor || !snapshot || !Array.isArray(snapshot.orders) || !snapshot.settings) return Promise.reject(new Error('offline_auth_required'));
    return tx('checkoutSnapshots','readwrite',function(s){
      return s.put({id:actor.ownerKey,storeId:actor.storeId,userId:actor.userId,
        savedAt:Date.now(),orders:snapshot.orders,settings:snapshot.settings,
        partySizes:snapshot.partySizes||{}});
    });
  };
  API.getOfflineCheckoutSnapshot = function () {
    var actor = cashActor();
    if (!actor) return Promise.resolve(null);
    return tx('checkoutSnapshots','readonly',function(s){return s.get(actor.ownerKey);})
      .then(function(rec){
        var latest=cashActor();
        return latest && latest.ownerKey===actor.ownerKey && rec && rec.id===actor.ownerKey ? rec : null;
      });
  };
  API.listOfflineCashSettlements = async function () {
    var actor = cashActor();
    if (!actor) return [];
    var all = await tx('cashSettlements','readonly',function(s){
      return new Promise(function(resolve,reject){
        var rows=[],request=s.openCursor();
        request.onsuccess=function(event){
          var cursor=event.target.result;
          if(!cursor){resolve(rows);return;}
          rows.push(cursor.value);cursor.continue();
        };
        request.onerror=function(){reject(request.error);};
      });
    });
    if(!cashActor() || cashActor().ownerKey!==actor.ownerKey)return [];
    return all.filter(function(rec){return rec.ownerKey===actor.ownerKey;})
      .sort(function(a,b){return b.createdAt-a.createdAt;});
  };
  // Fail closed even when a legacy cached Orders page invokes these APIs.
  // Historical local cash records remain in IndexedDB for manual reconciliation,
  // but no new offline payment or automatic replay is permitted.
  API.queueOfflineCashSettlement = function () {
    return Promise.reject(new Error('offline_checkout_disabled'));
  };
  API.flushOfflineCashSettlements = function () {
    return Promise.resolve({confirmed:0,pending:0,rejected:0,updated:[],disabled:true});
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
        if (!(CFG && CFG.NATIVE_DISABLE_SERVICE_WORKER === true) && ref.origin === location.origin && history.length > 1) { history.back(); return; }
      }
    } catch (e) {}
    location.replace('./manage.html?permission=denied');
  }
  var permissionGateEl = null;
  var permissionConfirmedThisDocument = false;
  var permissionTransientEl = null;
  function permissionCheckMessage(err) {
    var en = String(document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var raw = String(err && err.message || err || '');
    var code = raw.toLowerCase();
    if (/^http_5\d\d$/.test(code)) return en
      ? 'The server temporarily could not re-check your access. This screen is being kept open; try again in a moment.'
      : 'サーバー側の一時エラーでアクセス権限を再確認できませんでした。現在の画面を維持しています。少し待って再試行してください。';
    if (/aborterror|fetch is aborted|\baborted\b|timeout|timed out/.test(code)) return en
      ? 'Access re-check timed out. This screen is being kept open; check the connection and retry.'
      : 'アクセス権限の再確認がタイムアウトしました。現在の画面を維持しています。通信状態を確認して再試行してください。';
    return en
      ? 'Access could not be re-checked because the connection is unavailable. This screen is being kept open; retry when the connection is stable.'
      : '通信できないためアクセス権限を再確認できませんでした。現在の画面を維持しています。通信が安定してから再試行してください。';
  }
  function ensurePermissionTransientNotice() {
    if (permissionTransientEl || typeof document === 'undefined' || !document.body) return permissionTransientEl;
    var st = document.createElement('style');
    st.textContent = '#izPermissionRetryNotice{position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 72px);z-index:2147483645;display:none;align-items:center;gap:10px;max-width:560px;margin:0 auto;padding:11px 12px;border:1px solid #f59e0b;border-radius:12px;background:#fff7ed;color:#7c2d12;box-shadow:0 8px 24px rgba(15,23,42,.16);font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif}'
      + '#izPermissionRetryNoticeText{flex:1;line-height:1.45;text-align:left}'
      + '#izPermissionRetryNotice button{flex:none;border:0;border-radius:9px;padding:9px 12px;background:#0b48bd;color:#fff;font-weight:800;cursor:pointer}';
    document.head.appendChild(st);
    permissionTransientEl = document.createElement('div'); permissionTransientEl.id = 'izPermissionRetryNotice';
    permissionTransientEl.innerHTML = '<div id="izPermissionRetryNoticeText"></div><button type="button" id="izPermissionRetryNoticeBtn"></button>';
    document.body.appendChild(permissionTransientEl);
    return permissionTransientEl;
  }
  function hidePermissionTransientNotice() { if (permissionTransientEl) permissionTransientEl.style.display = 'none'; }
  function showPermissionTransientNotice(err, retry) {
    var box = ensurePermissionTransientNotice(); if (!box) return;
    var en = String(document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    box.querySelector('#izPermissionRetryNoticeText').textContent = permissionCheckMessage(err);
    var btn = box.querySelector('#izPermissionRetryNoticeBtn');
    btn.textContent = en ? 'Retry' : '再試行';
    btn.onclick = typeof retry === 'function' ? retry : null;
    box.style.display = 'flex';
  }
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
  function showPermissionGate(state, retry, error) {
    var gate = ensurePermissionGate(); if (!gate) return;
    var en = String(document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
    var checking = state !== 'network';
    gate.querySelector('#izPermissionGateText').textContent = checking ? (en ? 'Checking your access…' : 'アクセス権限を確認しています…') : permissionCheckMessage(error);
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
  var permissionGuardGeneration = 0;
  var permissionGuardPending = null;
  async function restoredPermissionToken() {
    var context = await API.pageReady({ auth:'optional' });
    return context.token || storedToken();
  }
  async function enforcePagePermissionGeneration(generation) {
    if (typeof location === 'undefined' || typeof document === 'undefined') return true;
    var page = localPageName();
    var key = PAGE_PERMISSION[page];
    var nativePrintOneShot = page === 'bridge.html' && /(?:^|[?&])oneshot=1(?:&|$)/.test(String(location.search || ''));
    var shouldInspectLinks = page === 'overview.html';
    var accountPage = page === 'account.html';
    if (!key && !accountPage && !shouldInspectLinks) return true;
    var token = await restoredPermissionToken();
    if (generation !== permissionGuardGeneration) return false;
    if (!token) { if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
    if (key==='admin' && typeof navigator!=='undefined' && navigator.onLine===false && API.hasOfflineAdminGrant()) {
      permissionConfirmedThisDocument=true;
      hidePermissionGate();
      return true;
    }
    try {
      var r = await API.post('checkToken', { token:token, __silent:true, __timeoutMs:6000 });
      if (generation !== permissionGuardGeneration) return false;
      if (!r || !r.valid || !r.me) { if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
      filterPermissionLinks(r.me);
      if (accountPage && r.me.accountOwner !== true) { hidePermissionGate(); denyPage(); return false; }
      var allowed = r.me.roleAllowed || r.me.allowed || {};
      if (nativePrintOneShot) {
        if (!(allowed.admin === true || allowed.receipts === true || allowed.printers === true || allowed.settings === true)) { hidePermissionGate(); denyPage(); return false; }
      } else if (key && allowed[key] !== true) { hidePermissionGate(); denyPage(); return false; }
      if (key==='admin' && allowed.admin===true) API.rememberOfflineAdminGrant();
      if (key || accountPage) hidePermissionGate();
      hidePermissionTransientNotice();
      permissionConfirmedThisDocument = true;
      rememberPermissionPage(page);
      return true;
    } catch (e) {
      if (generation !== permissionGuardGeneration) return false;
      var code = String(e && e.message || e || '');
      if (e && e.__server && /^(?:forbidden|forbidden_page:|forbidden_fn)/.test(code)) { permissionConfirmedThisDocument = false; if (key || accountPage) { hidePermissionGate(); denyPage(); } return false; }
      if (code === 'unauthorized' || code === 'stale_session_response') { permissionConfirmedThisDocument = false; hidePermissionTransientNotice(); if (key || accountPage) hidePermissionGate(); return false; }
      if ((key || accountPage) && permissionConfirmedThisDocument) {
        hidePermissionGate();
        showPermissionTransientNotice(e, function(){ API.enforcePagePermission({force:true}).catch(function(){}); });
      } else if (key || accountPage) {
        showPermissionGate('network', function(){ API.enforcePagePermission({force:true}).catch(function(){}); }, e);
      }
      return false;
    }
  }
  API.enforcePagePermission = function (options) {
    var force = !!(options && options.force === true);
    if (permissionGuardPending && !force) return permissionGuardPending;
    var generation = ++permissionGuardGeneration;
    var run = enforcePagePermissionGeneration(generation);
    var tracked = run.finally(function () { if (permissionGuardPending === tracked) permissionGuardPending = null; });
    permissionGuardPending = tracked;
    return tracked;
  };
  function runPagePermissionGuard(force) { API.enforcePagePermission(force ? {force:true} : null).catch(function () {}); }
  if (typeof document !== 'undefined') {
    bindOverviewPermissionNavigation();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ showPermissionNotice(); runPagePermissionGuard(); }, { once:true });
    else { showPermissionNotice(); runPagePermissionGuard(); }
    window.addEventListener('pageshow', function (event) { showPermissionNotice(); if (event.persisted) runPagePermissionGuard(true); });
    document.addEventListener('visibilitychange', function () {
      if (!document.visibilityState || document.visibilityState === 'visible') runPagePermissionGuard(true);
    });
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
