// The authenticated management screens' shared-header AI balance chip.
// Read-only, tenant-bound RPC. Never cache a balance across login identities.
(function () {
  'use strict';
  if (window.IZAICreditHub) return;
  var badge = null, overlay = null, dialog = null;
  var activeToken = '', balance = null, lastLoaded = 0, generation = 0, inFlight = 0;
  var balanceError = false;
  var previousFocus = null;

  function lang() {
    try { if (window.I18n && typeof I18n.lang === 'function') return I18n.lang() === 'en' ? 'en' : 'ja'; }
    catch (e) {}
    return document.documentElement.lang === 'en' ? 'en' : 'ja';
  }
  function t(ja, en) { return lang() === 'en' ? en : ja; }
  function token() {
    try {
      if (window.API && typeof API.currentToken === 'function') return API.currentToken() || '';
      return localStorage.getItem((window.APP_CONFIG && APP_CONFIG.AUTH_STORAGE_PREFIX || '') + 'mgmtToken') || '';
    } catch (e) { return ''; }
  }
  function isWorkspaceScreen() {
    // A saved token must never expose the store balance on QR/order, public
    // legal/signup pages or the management login form. Reuse the common
    // header's session and page policy rather than maintaining per-screen UI.
    var current = token();
    if (!current || !window.IZHeader || !IZHeader.validSession(current) ||
        !document.getElementById('izCommonHeader')) return false;
    var policy = IZHeader.pagePolicy(location.pathname, true, location.search);
    if (!policy.showAiCredit) return false;
    var hub = document.getElementById('hubView');
    if (hub && (policy.page === 'manage.html' || policy.page === 'index.html') &&
        hub.classList.contains('hidden')) return false;
    return !!(document.getElementById('izHeaderActions') &&
      document.getElementById('izHeaderHelp'));
  }
  function decorate() {
    if (document.getElementById('izAiCreditStyle')) return;
    var css = document.createElement('style');
    css.id = 'izAiCreditStyle';
    css.textContent =
      '#izAiCreditBadge{appearance:none;border:1px solid rgba(216,180,254,.65)!important;border-radius:7px!important;' +
      'background:#6d28d9!important;color:#fff!important;padding:1px 5px!important;' +
      'font-family:inherit;font-size:11px!important;font-weight:800!important;line-height:18px!important;' +
      'cursor:pointer;flex:0 0 44px!important;white-space:nowrap;min-width:44px!important;' +
      'width:44px!important;' +
      'max-width:44px;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}' +
      '#izAiCreditBadge:focus-visible{outline:3px solid #f5d0fe;outline-offset:2px}' +
      '#izAiCreditOverlay{position:fixed;inset:0;z-index:2147483050;background:rgba(15,23,42,.68);' +
      'display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}' +
      '#izAiCreditDialog{background:#fff;color:#0f172a;border-radius:15px;padding:20px;' +
      'width:min(100%,430px);max-height:86dvh;overflow-y:auto;box-sizing:border-box;' +
      'box-shadow:0 16px 48px rgba(0,0,0,.24);font-family:inherit;font-size:14px;line-height:1.6}' +
      '#izAiCreditDialog h2{font-size:19px;margin:0 0 12px}' +
      '#izAiCreditDialog p{margin:8px 0}' +
      '#izAiCreditDialog ul{padding-left:22px;margin:8px 0}' +
      '#izAiCreditClose{width:100%;min-height:44px;margin-top:12px;padding:10px 12px;' +
      'border:0;border-radius:9px;background:#6d28d9;color:#fff;font-size:15px;font-weight:800;cursor:pointer}' +
      '@media(max-width:430px){#izAiCreditBadge{max-width:44px}}';
    document.head.appendChild(css);
  }
  function balanceText() {
    return Number.isSafeInteger(balance) && balance >= 0
      ? balance.toLocaleString(lang() === 'en' ? 'en-US' : 'ja-JP') : (balanceError ? '!' : '…');
  }
  function redrawBadge() {
    if (!badge) return;
    badge.textContent = '🤖' + balanceText();
    var label = balanceError
      ? t('AIポイント残高を取得できません。', 'AI credit balance is unavailable. ')
      : t('AIポイント残高：', 'AI credit balance: ') + balanceText();
    badge.setAttribute('aria-label', label + t('。利用案内を表示', '. Show usage guide'));
    badge.title = badge.getAttribute('aria-label');
  }
  function row(parent, tag, text) {
    var el = document.createElement(tag);
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }
  function redrawDialog() {
    if (!dialog) return;
    var wasFocused = dialog.contains(document.activeElement);
    dialog.replaceChildren();
    row(dialog, 'h2', t('🤖 AIポイントについて', '🤖 About AI credits')).id = 'izAiCreditTitle';
    row(dialog, 'p', t('AI解析に使う、店舗共通のポイントです。', 'AI credits are shared by everyone in this store for AI analysis.'));
    row(dialog, 'p', balanceError
      ? t('残高を取得できませんでした。通信・認証・サーバー設定を確認してください。開き直すと再試行します。',
          'The balance could not be loaded. Check the connection, account and server. Reopen this guide to retry.')
      : t('現在の残高：', 'Current balance: ') + balanceText() + t(' ポイント', ' credits'));
    row(dialog, 'p', t('どこで使える？', 'Where can I use them?'));
    var uses = row(dialog, 'ul', '');
    var nativeMenu = !!(window.APP_CONFIG && APP_CONFIG.NATIVE_DISABLE_SERVICE_WORKER === true);
    if (nativeMenu) row(uses, 'li', t('メニュー登録：PDFは1ページ、写真は1画像につき1ポイント。1画像に複数ページが写っても1画像扱いです。',
      'Menu editor: 1 credit per PDF page or photo. Multiple pages in one photo count as one image.'));
    else row(uses, 'li', t('メニュー登録のAI取込：アプリ版で利用できます',
      'AI menu import: available in the mobile app'));
    row(uses, 'li', t('在庫管理：棚の写真をAIで解析（ポイント課金の有効時は1枚1ポイント）',
      'Inventory: analyze a shelf photo (1 credit per image when credit billing is enabled)'));
    row(dialog, 'p', t('解析前に固定単価・最大消費ポイント・現在の残高を表示します。解析に成功した分のみポイントを消費します。',
      'The fixed unit price, maximum charge, and current balance appear before analysis. Only successful analyses consume credits.'));
    row(dialog, 'p', t('※利用できる機能はアプリの提供状況・設定・アカウント権限によって異なります。',
      'Availability depends on the app version, feature settings, and account permissions.'));
    var close = row(dialog, 'button', t('閉じる', 'Close'));
    close.id = 'izAiCreditClose'; close.type = 'button'; close.addEventListener('click', closeDialog);
    if (wasFocused) close.focus();
  }
  function closeDialog() {
    if (!overlay) return;
    overlay.remove(); overlay = null; dialog = null;
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  }
  function showDialog() {
    if (!isWorkspaceScreen()) return;
    if (overlay) { closeDialog(); return; }
    previousFocus = document.activeElement;
    overlay = document.createElement('div');
    overlay.id = 'izAiCreditOverlay';
    dialog = document.createElement('div');
    dialog.id = 'izAiCreditDialog';
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-labelledby','izAiCreditTitle');
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (event) { if (event.target === overlay) closeDialog(); });
    document.body.appendChild(overlay);
    redrawDialog();
    document.getElementById('izAiCreditClose').focus();
    refresh(true);
  }
  function refresh(force) {
    if (!badge || !isWorkspaceScreen() || !activeToken || !window.API || typeof API.post !== 'function') return;
    if (!force && Date.now() - lastLoaded < 60000) return;
    if (!force && inFlight) return;
    var thisToken = activeToken, request = ++generation;
    inFlight = request;
    return API.post('rpc', {
      fn:'getAiCreditBalanceSummary', args:[],token:thisToken,__silent:true,__noInternalRetry:true
    }).then(function (response) {
      if (response && response.ok === true) return response;
      throw new Error(String(response && response.error || 'ai_credit_balance_unavailable'));
    }).catch(function (error) {
      // The compact summary endpoint was added after some physical Tenant
      // Workers were deployed. An authorized owner can read the pre-existing
      // wallet RPC during their gradual rollout; the server still enforces
      // the original account/store/settings-page permission. Do not retry
      // authentication failures or ever invent a credit balance.
      if (request !== generation || thisToken !== activeToken || thisToken !== token() || !isWorkspaceScreen())
        throw error;
      if (/unauthorized|tenant_store_mismatch|http_40[13]|forbidden_page/.test(
        String(error && error.message || error))) throw error;
      return API.post('rpc', {
        fn:'getAiCreditWallet', args:[],token:thisToken,__silent:true,__noInternalRetry:true
      });
    }).then(function (response) {
      if (request !== generation || thisToken !== activeToken || thisToken !== token() || !isWorkspaceScreen()) return;
      inFlight = 0;
      var total = response && response.data && response.data.balances && response.data.balances.total;
      if (!response || response.ok !== true || !Number.isSafeInteger(total) || total < 0)
        throw new Error('ai_credit_balance_unavailable');
      balance = total; balanceError = false; lastLoaded = Date.now();
      redrawBadge(); redrawDialog();
    }).catch(function () {
      if (request !== generation || thisToken !== activeToken || thisToken !== token() || !isWorkspaceScreen()) return;
      inFlight = 0;
      balance = null; balanceError = true; lastLoaded = 0;
      redrawBadge(); redrawDialog();
    });
  }
  function sync() {
    var actions = document.getElementById('izHeaderActions');
    var help = document.getElementById('izHeaderHelp');
    var nextToken = token();
    if (!actions || !help || !isWorkspaceScreen() || !nextToken) {
      ++generation; activeToken = ''; balance = null; balanceError = false; lastLoaded = 0;
      inFlight = 0;
      if (badge) badge.remove();
      badge = null; closeDialog(); return;
    }
    if (nextToken !== activeToken) {
      ++generation; activeToken = nextToken; balance = null; balanceError = false; lastLoaded = 0;
      inFlight = 0;
      closeDialog();
    }
    if (!badge) {
      decorate();
      badge = document.createElement('button');
      badge.id = 'izAiCreditBadge'; badge.type = 'button';
      badge.className = 'iz-header-btn';
      badge.addEventListener('click', showDialog);
    }
    // Keep Help as an independent action. AI credits must never replace or
    // hide existing navigation/help controls on authenticated screens.
    if (badge.parentNode !== actions || badge.nextSibling !== help)
      actions.insertBefore(badge,help);
    redrawBadge();
    refresh(false);
  }
  function translate() { redrawBadge(); redrawDialog(); }
  window.IZAICreditHub = {sync:sync,translate:translate,refresh:refresh};
  document.addEventListener('keydown', function (event) {
    if (!overlay) return;
    if (event.key === 'Escape') { event.preventDefault(); closeDialog(); }
    if (event.key === 'Tab') {
      event.preventDefault();
      var close = document.getElementById('izAiCreditClose');
      if (close) close.focus();
    }
  });
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) sync();
  });
  sync();
})();
