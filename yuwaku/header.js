// 全画面共通ヘッダー。各HTMLに個別実装せず、config.jsから一度だけ読み込む。
(function () {
  'use strict';
  if (window.IZHeader) return;

  var CFG = window.APP_CONFIG || {};
  var PREFIX = CFG.AUTH_STORAGE_PREFIX || '';
  var state = { timezone: '', timer: null, clock: null, user: null, lang: null };

  function pageName(pathname) {
    var p = String(pathname || '').split(/[?#]/)[0].replace(/\\/g, '/');
    var last = p.slice(p.lastIndexOf('/') + 1).toLowerCase();
    return last || 'index.html';
  }

  // 署名の真正性はサーバーで検証する。ここでは期限・環境を含む構造だけを確認し、
  // 期限切れトークンでログイン者名を表示し続けないために使用する。
  function validSession(token, now) {
    if (typeof token !== 'string') return false;
    var dot = token.lastIndexOf('.'), parts = token.slice(0, dot).split('~');
    var audience = CFG.TEST_ENV ? 'test' : 'production';
    return dot > 0 && /^[a-f0-9]{64}$/.test(token.slice(dot + 1)) && parts.length === 6 &&
      parts[0] === 'v2' && Number(parts[1]) > Number(now == null ? Date.now() : now) &&
      !!parts[2] && !!parts[3] && !!parts[4] && parts[5] === audience;
  }

  function pagePolicy(pathname, loggedIn, search) {
    var page = pageName(pathname);
    var customerOrder = page === 'index.html' || page === 'takeout.html' || page === 'reserve.html';
    var fromOverview = /(?:^|[?&])from=overview(?:&|$)/i.test(String(search || ''));
    var explicitBack = resolveBackTarget(search);
    var contextualBack = explicitBack || (fromOverview ? './overview.html' : '');
    var loginPage = page === 'manage.html' && !loggedIn;
    return {
      page: page,
      customerOrder: customerOrder,
      showBack: customerOrder ? (!!loggedIn && !!contextualBack) : !loginPage,
      showManage: !!loggedIn && page !== 'manage.html',
      fromOverview: fromOverview,
      backTarget: contextualBack,
      showUser: !!loggedIn,
      showClock: !loginPage,
      showRefresh: !loginPage,
    };
  }

  function readSession() {
    try {
      var token = localStorage.getItem(PREFIX + 'mgmtToken') || '';
      return {
        loggedIn: validSession(token),
        token: token,
        name: localStorage.getItem(PREFIX + 'mgmtName') || '',
        role: localStorage.getItem(PREFIX + 'mgmtRole') || '',
      };
    } catch (e) { return { loggedIn: false, token: '', name: '', role: '' }; }
  }

  function currentLang() {
    try {
      if (window.I18n && typeof window.I18n.lang === 'function') return window.I18n.lang();
      var saved=localStorage.getItem('lang');
      if(saved==='ja'||saved==='en') return saved;
      var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;
      return String(first||'').toLowerCase().indexOf('ja')===0?'ja':'en';
    } catch (e) { return 'en'; }
  }

  function displayRole(role) {
    var raw = String(role || '');
    if (currentLang() !== 'en') return raw;
    return ({ '管理者':'Admin', 'システム':'System', 'マネージャー':'Manager', 'スタッフ':'Staff', '一般':'General' })[raw] || raw;
  }

  function validTimezone(value) {
    var tz = String(value || '').trim();
    if (!tz) return '';
    try { return new Intl.DateTimeFormat('en-US', { timeZone: tz }).resolvedOptions().timeZone; }
    catch (e) { return ''; }
  }

  function cachedTimezone() {
    try { return validTimezone(localStorage.getItem(PREFIX + 'storeTimezone')); }
    catch (e) { return ''; }
  }

  function saveTimezone(value) {
    var tz = validTimezone(value);
    if (!tz) return;
    state.timezone = tz;
    try { localStorage.setItem(PREFIX + 'storeTimezone', tz); } catch (e) {}
    renderClock();
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function wallClockParts(date, timezone) {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    var out = {};
    parts.forEach(function (p) { if (p.type !== 'literal') out[p.type] = p.value; });
    return out.year + '-' + pad(out.month) + '-' + pad(out.day) + ' ' + pad(out.hour) + ':' + pad(out.minute) + ':' + pad(out.second);
  }

  function renderClock() {
    if (!state.clock) return;
    var tz = state.timezone || cachedTimezone() || validTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
    try { state.clock.textContent = wallClockParts(new Date(), tz); }
    catch (e) { state.clock.textContent = ''; }
    state.clock.title = tz;
  }

  function text(isJa, ja, en) { return isJa ? ja : en; }
  function resolveBackTarget(search) {
    var m = /(?:^|[?&])back=([a-z0-9_-]+\.html)(?:&|$)/i.exec(String(search || ''));
    return m ? './' + m[1] : '';
  }
  function withBackHref(href, pathname) {
    var raw = String(href || '');
    if (!/^\.\/[a-z0-9_-]+\.html(?:[?#].*)?$/i.test(raw)) return raw;
    if (/(?:[?&])(?:back=|from=(?:overview|manage)(?:[&#]|$))/i.test(raw)) return raw;
    var current = pageName(pathname || '');
    if (!/^[a-z0-9_-]+\.html$/i.test(current) || current === 'drink_inv.html' || current === 'backup.html') return raw;
    var target = pageName(raw.split(/[?#]/)[0]);
    if (!target || target === current || target === 'manage.html') return raw;
    var hash = '';
    var hashPos = raw.indexOf('#');
    if (hashPos >= 0) { hash = raw.slice(hashPos); raw = raw.slice(0, hashPos); }
    return raw + (raw.indexOf('?') >= 0 ? '&' : '?') + 'back=' + current + hash;
  }
  function installBackPropagation(loggedIn) {
    if (!loggedIn || !document || !document.addEventListener) return;
    document.addEventListener('click', function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest('a[href],#izProBtn') : null;
      if (!el) return;
      if (el.id === 'izProBtn') {
        ev.preventDefault(); ev.stopImmediatePropagation();
        location.href = withBackHref('./subscription.html', location.pathname); return;
      }
      if (el.hasAttribute('download')) return;
      var href = el.getAttribute('href') || '';
      var marked = withBackHref(href, location.pathname);
      if (marked !== href) el.setAttribute('href', marked);
    }, true);
  }
  function scrollGuideHashTarget() {
    if (typeof document === 'undefined' || typeof location === 'undefined') return;
    var hash = String(location.hash || '');
    if (hash.length < 2) return;
    var id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (e) {}
    var el = document.getElementById(id);
    if (!el || !el.hasAttribute('data-guide-anchor')) return;
    try { el.scrollIntoView({ block: 'start', inline: 'nearest' }); }
    catch (e) { try { el.scrollIntoView(true); } catch (_) {} }
  }
  function renderLanguage() {
    var isJa = currentLang() === 'ja';
    var compact = typeof matchMedia === 'function' && matchMedia('(max-width:720px)').matches;
    if (state.lang) {
      state.lang.textContent = isJa ? 'EN' : '日本語';
      state.lang.setAttribute('aria-label', text(isJa, '英語へ切替', 'Switch to Japanese'));
      state.lang.title = state.lang.getAttribute('aria-label');
    }
    if (state.user) {
      var userName = state.user.getAttribute('data-iz-user-name') || '';
      var userRole = state.user.getAttribute('data-iz-user-role') || '';
      state.user.textContent = '👤 ' + userName + (userRole ? ' (' + displayRole(userRole) + ')' : '');
    }
    var refresh = document.getElementById('izHeaderRefresh');
    var manage = document.getElementById('izHeaderManage');
    var back = document.getElementById('izHeaderBack');
    if (refresh) { refresh.textContent = compact ? '↻' : text(isJa, '↻ 更新', '↻ Refresh'); refresh.title = text(isJa, '画面を更新', 'Refresh page'); refresh.setAttribute('aria-label', refresh.title); }
    if (manage) { manage.textContent = compact ? '⌂' : text(isJa, '⌂ 管理', '⌂ Manage'); manage.title = text(isJa, '管理メニューに戻る', 'Return to management menu'); manage.setAttribute('aria-label', manage.title); }
    if (back) { var target = resolveBackTarget(location.search) || (/(?:^|[?&])from=overview(?:&|$)/i.test(String(location.search || '')) ? './overview.html' : ''); back.textContent = compact ? '←' : text(isJa, '← 戻る', '← Back'); back.title = target ? text(isJa, '前の画面へ戻る', 'Back to previous screen') : text(isJa, '前の画面に戻る', 'Go back'); back.setAttribute('aria-label', back.title); }
  }

  function switchLanguage() {
    if (window.I18n && typeof window.I18n.toggle === 'function') window.I18n.toggle();
    else if (typeof window.toggleLang === 'function') window.toggleLang();
    else {
      try { localStorage.setItem('lang', currentLang() === 'ja' ? 'en' : 'ja'); } catch (e) {}
      location.reload();
    }
    setTimeout(renderLanguage, 0);
  }

  function goToBackTarget(target) {
    try {
      if (document.referrer) {
        var ref = new URL(document.referrer);
        if (ref.origin === location.origin && pageName(ref.pathname) === pageName(target)) {
          history.back(); return;
        }
      }
    } catch (e) {}
    location.replace(target);
  }

  function goBack(policy) {
    if (policy && policy.backTarget) { goToBackTarget(policy.backTarget); return; }
    if (policy && policy.fromOverview) { goToBackTarget('./overview.html'); return; }
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin) { history.back(); return; }
    } catch (e) {}
    location.href = policy.showManage ? './manage.html' : './';
  }

  function button(id, label, onClick) {
    var b = document.createElement('button');
    b.type = 'button'; b.id = id; b.className = 'iz-header-btn'; b.textContent = label; b.onclick = onClick;
    return b;
  }

  function findLegacyHeader(page) {
    var selectors = ['body > .head', 'body > .kds-head', 'body > .header', 'body > .appbar', 'body > .bar'];
    for (var i = 0; i < selectors.length; i++) {
      var found = document.querySelector(selectors[i]); if (found) return found;
    }
    if (page === 'reserve.html') return document.querySelector('.rhead');
    if (page === 'takeout.html') return document.querySelector('.to-head');
    if (page === 'bridge.html') {
      var h = document.querySelector('body h1'); return h && h.parentElement;
    }
    return null;
  }

  function isOldCommon(el) {
    if (!el || el.nodeType !== 1) return true;
    var id = el.id || '', href = el.getAttribute && (el.getAttribute('href') || '');
    var click = el.getAttribute && (el.getAttribute('onclick') || '');
    return el.hasAttribute('data-tlang') || /(?:langBtn|langToggle|headClock|appbarClock|mgmtBack)/i.test(id) ||
      /manage\.html/i.test(href) || /(?:I18n\.toggle|toggleLang|reloadAll|location\.reload|^reload\(\))/i.test(click);
  }

  function takeLegacyExtras(legacy, extra) {
    if (!legacy) return;
    var title = legacy.querySelector('h1,.title,.kds-title,.to-shop');
    var titleSlot = document.getElementById('izHeaderTitle');
    if (title && titleSlot) { titleSlot.textContent = ''; titleSlot.appendChild(title); }
    var candidates = Array.prototype.slice.call(legacy.querySelectorAll('button,a'));
    ['cnt', 'kcount', 'tableChip', 'tagTakeout'].forEach(function (id) {
      var el = legacy.querySelector('#' + id); if (el) candidates.push(el);
    });
    candidates.forEach(function (el) {
      if (isOldCommon(el) || extra.contains(el)) return;
      extra.appendChild(el);
    });
    legacy.style.display = 'none';
    if (extra.children.length) extra.hidden = false;
    ['mgmtBackBtn', 'mgmtBack', 'langBtn', 'langToggle'].forEach(function (id) {
      var el = document.getElementById(id); if (el && !el.closest('#izCommonHeader')) el.style.display = 'none';
    });
  }

  function addStyles() {
    if (document.getElementById('izHeaderStyle')) return;
    var s = document.createElement('style'); s.id = 'izHeaderStyle';
    s.textContent =
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif!important}' +
      '#izCommonHeader{position:sticky;top:0;z-index:2147483000;background:#0f172a;color:#fff;font-family:inherit;box-shadow:0 1px 0 rgba(255,255,255,.1)}' +
      '#izCommonHeader .iz-header-main{display:flex;align-items:center;gap:8px;padding:8px 12px;min-height:50px;flex-wrap:nowrap}' +
      '#izHeaderTitle{font-size:16px;font-weight:900;line-height:1.2;flex:1 1 140px;min-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#izHeaderTitle>*{font:inherit!important;margin:0!important;color:inherit!important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '#izHeaderMeta,#izHeaderActions{display:flex;align-items:center;gap:6px;flex:0 0 auto;flex-wrap:nowrap}' +
      '.iz-header-clock,.iz-header-user{font-size:12px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.1);padding:7px 9px;border-radius:8px}' +
      '.iz-header-user{max-width:180px;overflow:hidden;text-overflow:ellipsis}' +
      '.iz-header-btn{border:0;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;padding:8px 10px;min-height:34px;font:800 12px/1.2 inherit;cursor:pointer;white-space:nowrap}' +
      '.iz-header-btn:hover{background:rgba(255,255,255,.25)}' +
      'input[type="month"],input[type="time"]{display:block!important;inline-size:100%!important;width:100%!important;min-inline-size:0!important;min-width:0!important;max-inline-size:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow:visible!important}input[type="month"]::-webkit-date-and-time-value,input[type="time"]::-webkit-date-and-time-value{min-width:0!important;text-align:left!important}[data-guide-anchor]{scroll-margin-top:64px}' +
      '#izHeaderExtra{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex:0 1 auto;min-width:0;flex-wrap:nowrap;padding:0;background:transparent;border:0}' +
      '#izHeaderExtra[hidden]{display:none}' +
      '#izHeaderExtra a,#izHeaderExtra button{margin:0!important}' +
      '@media(max-width:720px){#izCommonHeader .iz-header-main{gap:5px;padding:6px 8px;min-height:44px}#izHeaderTitle{flex:1 1 55px;min-width:0;font-size:14px}#izHeaderExtra{gap:4px}.iz-header-clock{font-size:12px;padding:6px}.iz-header-user{max-width:88px;padding:6px}.iz-header-btn{width:32px;min-height:32px;padding:6px;font-size:13px}#izHeaderLang{width:auto;min-width:38px}}' +
      '@media(max-width:480px){.iz-header-clock{display:none}#tagTakeout{display:none!important}}' +
      '@media(max-width:430px){#izHeaderActions{gap:4px}}';
    document.head.appendChild(s);
  }

  function fetchTimezone(session, policy) {
    var payload = { __silent: true, __noInternalRetry: true, __timeoutMs: 4500 };
    var action = session.loggedIn ? 'getSettings' : 'bootstrap';
    if (session.loggedIn) payload.token = session.token;
    var request;
    if (window.API && typeof window.API.post === 'function') {
      request = window.API.post(action, payload);
    } else if (CFG.API_URL && typeof fetch === 'function') {
      // clock/bridge/overview等、api.jsを使わない画面も同じ店舗標準時間を表示する。
      // 読取1回・4.5秒上限・自動再試行なしとし、失敗時はキャッシュまたは端末時刻を維持する。
      var ctrl = new AbortController();
      var timeout = setTimeout(function () { ctrl.abort(); }, 4500);
      var body = { action: action };
      if (session.loggedIn) body.token = session.token;
      if (CFG.STORE_ID) body.storeId = CFG.STORE_ID;
      request = fetch(CFG.API_URL + '?api=1', {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body), redirect: 'follow', signal: ctrl.signal,
      }).then(function (res) { if (!res.ok) throw new Error('http_' + res.status); return res.json(); })
        .finally(function () { clearTimeout(timeout); });
    } else return;
    request.then(function (r) {
      // GAS互換bootstrap/getSettingsはフラット、ネイティブ経路はdata配下で返るため両方を扱う。
      var d = (r && r.data) || r || {};
      var settings = d.settings || d;
      saveTimezone(settings.timezone);
    }).catch(function () {});
  }

  function init() {
    if (!document.body || document.getElementById('izCommonHeader')) return;
    addStyles();
    var session = readSession(), policy = pagePolicy(location.pathname, session.loggedIn, location.search);
    installBackPropagation(session.loggedIn);
    var legacy = findLegacyHeader(policy.page);
    var header = document.createElement('header'); header.id = 'izCommonHeader';
    var main = document.createElement('div'); main.className = 'iz-header-main';
    var title = document.createElement('div'); title.id = 'izHeaderTitle'; title.textContent = document.title || '';
    var meta = document.createElement('div'); meta.id = 'izHeaderMeta';
    if (policy.showClock) { var clock = document.createElement('span'); clock.id = 'izHeaderClock'; clock.className = 'iz-header-clock'; meta.appendChild(clock); state.clock = clock; }
    if (policy.showUser && session.name) {
      var user = document.createElement('span'); user.id = 'izHeaderUser'; user.className = 'iz-header-user';
      user.setAttribute('data-iz-user-name', session.name); user.setAttribute('data-iz-user-role', session.role || '');
      user.textContent = '👤 ' + session.name + (session.role ? ' (' + displayRole(session.role) + ')' : ''); meta.appendChild(user); state.user = user;
    }
    var actions = document.createElement('div'); actions.id = 'izHeaderActions';
    var lang = button('izHeaderLang', '', switchLanguage); lang.setAttribute('data-tlang', ''); actions.appendChild(lang); state.lang = lang;
    if (policy.showRefresh) actions.appendChild(button('izHeaderRefresh', '↻', function () { location.reload(); }));
    if (policy.showManage) actions.appendChild(button('izHeaderManage', '⌂', function () { location.href = './manage.html'; }));
    if (policy.showBack) actions.appendChild(button('izHeaderBack', '←', function () { goBack(policy); }));
    var extra = document.createElement('div'); extra.id = 'izHeaderExtra'; extra.hidden = true;
    main.appendChild(title); main.appendChild(extra); main.appendChild(meta); main.appendChild(actions); header.appendChild(main);
    document.body.insertBefore(header, document.body.firstChild);
    takeLegacyExtras(legacy, extra);
    requestAnimationFrame(scrollGuideHashTarget);
    setTimeout(scrollGuideHashTarget, 80);
    setTimeout(scrollGuideHashTarget, 250);
    setTimeout(scrollGuideHashTarget, 600);
    window.addEventListener('hashchange', scrollGuideHashTarget);
    window.addEventListener('pageshow', scrollGuideHashTarget);
    state.timezone = cachedTimezone(); renderClock(); renderLanguage();
    state.timer = setInterval(renderClock, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) renderClock(); });
    window.addEventListener('storage', function () { renderLanguage(); renderClock(); });
    window.addEventListener('resize', renderLanguage);
    try { new MutationObserver(renderLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) {}
    fetchTimezone(session, policy);
  }

  window.IZHeader = { init: init, validSession: validSession, pagePolicy: pagePolicy, wallClockParts: wallClockParts, saveTimezone: saveTimezone, withBackHref: withBackHref, resolveBackTarget: resolveBackTarget, scrollGuideHashTarget: scrollGuideHashTarget };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
