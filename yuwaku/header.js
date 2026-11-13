// 全画面共通ヘッダー。各HTMLに個別実装せず、config.jsから一度だけ読み込む。
(function () {
  'use strict';
  if (window.IZHeader) return;

  var CFG = window.APP_CONFIG || {};
  var PREFIX = CFG.AUTH_STORAGE_PREFIX || '';
  // IZK-UT-089: consistent theme for authenticated management pages.
  function applyAccent(value) {
    var hex = String(value || '');
    document.documentElement.style.setProperty('--accent', /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : '#0f172a');
  }
  function refreshAccent() {
    var session = readSession();
    if (!session.loggedIn) { applyAccent(''); return Promise.resolve(); }
    if (!window.API || typeof window.API.post !== 'function') return Promise.resolve();
    var token = session.token, identity = sessionIdentity(token);
    return window.API.post('getSettings', { token:token, __silent:true, __noInternalRetry:true }).then(function (result) {
      var current = readSession();
      if (!current.loggedIn || sessionIdentity(current.token) !== identity) return;
      var data = result && (result.data || result) || {};
      applyAccent((data.settings || data).accentColor);
    }).catch(function () {});
  }
  var state = { timezone: '', timer: null, clock: null, user: null, lang: null, titleSource: null };
  var currentHeaderIdentity = '';
  function sessionIdentity(token) {
    var raw = String(token || ''), dot = raw.lastIndexOf('.');
    if (dot < 0) return '';
    var parts = raw.slice(0, dot).split('~');
    if (!((parts.length === 6 && parts[0] === 'v2') ||
          (parts.length === 7 && parts[0] === 'v3' && parts[6]))) return '';
    return [parts[0],parts[2],parts[3],parts[4],parts[5],parts[6] || ''].join('~');
  }

  // Three ASCII dots count towards the byte ceiling. Avoid cutting UTF-8
  // Japanese characters or four-byte emoji between code points.
  function utf8Bytes(value) {
    try { return new TextEncoder().encode(value).length; }
    catch (_) { try { return unescape(encodeURIComponent(value)).length; } catch (e) { return value.length * 3; } }
  }
  function abbreviateUtf8(value, limit) {
    var raw = String(value == null ? '' : value);
    if (utf8Bytes(raw) <= limit) return raw;
    var prefix = '', available = limit - 3;
    var glyphs = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
      ? Array.from(new Intl.Segmenter(undefined, { granularity:'grapheme' }).segment(raw), function (g) { return g.segment; })
      : Array.from(raw);
    glyphs.some(function (character) {
      var len = utf8Bytes(character);
      if (len > available) return true;
      prefix += character; available -= len; return false;
    });
    return prefix + '...';
  }
  // A legacy heading can contain both JA and EN spans. The original heading
  // is hidden after the shared header mounts, so innerText alone is not
  // reliable: on a display:none ancestor it may return every hidden span.
  // Inspect descendants' own computed display and ignore the hidden language.
  function visibleHeadingText(source) {
    if (!source || !source.childNodes || !window.getComputedStyle)
      return source && source.textContent || '';
    function visit(node) {
      if (node.nodeType === 3) return node.nodeValue || '';
      if (node.nodeType !== 1) return '';
      if (node !== source) {
        if (node.hidden || node.getAttribute('aria-hidden') === 'true') return '';
        try { if (window.getComputedStyle(node).display === 'none') return ''; }
        catch (e) {}
      }
      var result = '';
      Array.prototype.forEach.call(node.childNodes, function (child) { result += visit(child); });
      return result;
    }
    return visit(source);
  }
  function renderTitle() {
    var slot = document.getElementById('izHeaderTitle');
    if (!slot) return;
    var raw = state.titleSource ? visibleHeadingText(state.titleSource) : document.title;
    raw = String(raw || '').trim() || String(document.title || '').trim();
    slot.textContent = raw;
    slot.title = raw;
    slot.setAttribute('aria-label', raw);
  }

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
    var versionOk = (parts.length === 6 && parts[0] === 'v2') ||
      (parts.length === 7 && parts[0] === 'v3' && !!parts[6]);
    return dot > 0 && /^[a-f0-9]{64}$/.test(token.slice(dot + 1)) && versionOk &&
      Number(parts[1]) > Number(now == null ? Date.now() : now) &&
      !!parts[2] && !!parts[3] && !!parts[4] && parts[5] === audience;
  }

  function pagePolicy(pathname, loggedIn, search) {
    var page = pageName(pathname);
    var customerOrder = page === 'index.html' || page === 'takeout.html' || page === 'reserve.html';
    var publicPage = ['privacy.html','terms.html','requests.html','register.html',
      'account.html','overview.html'].includes(page);
    var fromOverview = /(?:^|[?&])from=overview(?:&|$)/i.test(String(search || ''));
    var explicitBack = resolveBackTarget(search);
    var contextualBack = explicitBack || (fromOverview ? './overview.html' : '');
    var loginPage = page === 'manage.html' && !loggedIn;
    return {
      page: page,
      customerOrder: customerOrder,
      showAiCredit: !!loggedIn && !customerOrder && !publicPage,
      showBack: customerOrder ? (!!loggedIn && !!contextualBack) : !loginPage,
      showManage: !!loggedIn && page !== 'manage.html',
      fromOverview: fromOverview,
      backTarget: contextualBack,
      showUser: !!loggedIn,
      showClock: !loginPage,
      // Keep the existing common refresh available before and after login.
      showRefresh: true,
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
  function navigationAllowed() {
    try { return !(window.API && typeof window.API.guardNavigation === 'function') || window.API.guardNavigation(); }
    catch (e) { return true; }
  }
  // Pages inject header.js through config.js before their own scripts. The
  // shared confirm UI may therefore not exist on a very early Refresh tap.
  // Load it once on demand and fail closed if the local asset cannot load.
  var confirmLoader = null, refreshConfirmPending = false;
  function requestConfirmation(message) {
    if (typeof window.UIConfirm === 'function') {
      return Promise.resolve().then(function(){ return window.UIConfirm(message); }).then(Boolean).catch(function(){return false;});
    }
    if (!confirmLoader) {
      confirmLoader = new Promise(function (resolve) {
        if (!document.head || !document.body) { resolve(false); return; }
        var script = document.createElement('script');
        script.src = './confirm.js?v=auth2';
        script.setAttribute('data-iz-header-confirm', '');
        script.onload = function () { resolve(typeof window.UIConfirm === 'function'); };
        script.onerror = function () { resolve(false); };
        document.head.appendChild(script);
      });
    }
    return confirmLoader.then(function (loaded) {
      return loaded && typeof window.UIConfirm === 'function' ? window.UIConfirm(message) : false;
    }).then(Boolean).catch(function(){return false;});
  }
  function refreshPage() {
    if (!navigationAllowed() || refreshConfirmPending) return;
    var login = document.getElementById('loginView');
    if (login && !login.classList.contains('hidden')) {
      // Workspace hints are not user edits; password or other typed fields are.
      var edited = Array.prototype.some.call(login.querySelectorAll('input:not([type="checkbox"])'), function (input) {
        return input.id !== 'workspaceId' && input.id !== 'cpWorkspace' && !!input.value;
      });
      if (edited) {
        refreshConfirmPending = true;
        return requestConfirmation(currentLang() === 'ja'
          ? '入力中の内容が消える可能性があります。画面を更新しますか？'
          : 'Refreshing may clear entered information. Refresh this page?')
          .then(function (approved) {
            if (approved && navigationAllowed()) location.reload();
          }).finally(function(){ refreshConfirmPending = false; });
      }
    }
    location.reload();
  }
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
      if (!navigationAllowed()) { ev.preventDefault(); ev.stopImmediatePropagation(); return; }
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
      state.user.textContent = '👤 ' + abbreviateUtf8(userName, 16);
      state.user.title = userName + (userRole ? ' (' + displayRole(userRole) + ')' : '');
      state.user.setAttribute('aria-label', state.user.title);
    }
    var refresh = document.getElementById('izHeaderRefresh');
    var manage = document.getElementById('izHeaderManage');
    var back = document.getElementById('izHeaderBack');
    if (refresh) { refresh.textContent = compact ? '↻' : text(isJa, '↻ 更新', '↻ Refresh'); refresh.title = text(isJa, '画面を更新', 'Refresh page'); refresh.setAttribute('aria-label', refresh.title); }
    if (manage) { manage.textContent = compact ? '⌂' : text(isJa, '⌂ 管理', '⌂ Manage'); manage.title = text(isJa, '管理メニューに戻る', 'Return to management menu'); manage.setAttribute('aria-label', manage.title); }
    if (back) { var target = resolveBackTarget(location.search) || (/(?:^|[?&])from=overview(?:&|$)/i.test(String(location.search || '')) ? './overview.html' : ''); back.textContent = compact ? '←' : text(isJa, '← 戻る', '← Back'); back.title = target ? text(isJa, '前の画面へ戻る', 'Back to previous screen') : text(isJa, '前の画面に戻る', 'Go back'); back.setAttribute('aria-label', back.title); }
    renderTitle();
    if (window.IZAICreditHub) window.IZAICreditHub.translate();
    if (window.IZAnnouncements) window.IZAnnouncements.translate();
  }

  // The header stays mounted while manage.html signs out in this Document.
  // Remove the previous account chip immediately instead of waiting for reload.
  function syncAuthDisplay() {
    if (!readSession().loggedIn) applyAccent('');
    var meta=document.getElementById('izHeaderMeta');
    if(!meta)return;
    var session=readSession(),policy=pagePolicy(location.pathname,session.loggedIn,location.search);
    if(state.user && (!policy.showUser || !session.name ||
        state.user.getAttribute('data-iz-user-name') !== session.name ||
        state.user.getAttribute('data-iz-user-role') !== (session.role || ''))){
      state.user.remove();state.user=null;
    }
    if(!state.user && policy.showUser&&session.name){
      var user=document.createElement('span');user.id='izHeaderUser';user.className='iz-header-user';
      user.setAttribute('data-iz-user-name',session.name);
      user.setAttribute('data-iz-user-role',session.role||'');
      meta.appendChild(user);state.user=user;
    }
    [['izHeaderClock',policy.showClock],['izHeaderRefresh',policy.showRefresh],
      ['izHeaderManage',policy.showManage],['izHeaderBack',policy.showBack]].forEach(function(item){
      var el=document.getElementById(item[0]);if(el){el.style.visibility=item[1]?'visible':'hidden';if(el.tagName==='BUTTON')el.disabled=!item[1];}
    });
    renderLanguage();
    ensureAiCreditHub(policy);
    ensureAnnouncements(policy);
  }

  function switchLanguage() {
    if (!navigationAllowed()) return;
    if (window.I18n && typeof window.I18n.toggle === 'function') window.I18n.toggle();
    else if (typeof window.toggleLang === 'function') window.toggleLang();
    else {
      try { localStorage.setItem('lang', currentLang() === 'ja' ? 'en' : 'ja'); } catch (e) {}
      location.reload();
    }
    setTimeout(renderLanguage, 0);
  }

  function goToBackTarget(target) {
    // Explicit app Back must always create a fresh document. Browser history
    // may restore a bfcache snapshot whose auth/read lifecycle belongs to the
    // previous visit.
    location.replace(target);
  }

  function goBack(policy) {
    if (!navigationAllowed()) return;
    if (policy && policy.backTarget) { goToBackTarget(policy.backTarget); return; }
    if (policy && policy.fromOverview) { goToBackTarget('./overview.html'); return; }
    if (policy && policy.showManage) { location.replace('./manage.html'); return; }
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin) { history.back(); return; }
    } catch (e) {}
    location.href = './';
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
    if (title && titleSlot) {
      state.titleSource = title;
      renderTitle();
      if (typeof MutationObserver !== 'undefined') {
        try { new MutationObserver(renderTitle).observe(title, { childList:true, subtree:true, characterData:true }); } catch (e) {}
      }
    }
    var candidates = Array.prototype.slice.call(legacy.querySelectorAll('button,a'));
    ['cnt', 'kcount', 'tableChip'].forEach(function (id) {
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


  // On Android/iOS, rotation and the native IME can leave an already focused
  // editable field outside the visual viewport. Only scroll when it is clipped.
  function installFocusedFieldVisibility() {
    if (window.__izFocusedFieldVisibilityInstalled) return;
    window.__izFocusedFieldVisibilityInstalled = true;
    var timer = 0;
    // On iPhone/iPad, WebKit already scrolls editable controls into view when
    // its keyboard opens. Repeated viewport-scroll/resize correction fights
    // that native motion and makes the whole form jump ("kata kata").
    // Retain the stronger Android floating-IME recovery unchanged.
    var agent = typeof navigator === 'undefined' ? '' : String(navigator.userAgent || '');
    var iosWebKit = /iPad|iPhone|iPod/.test(agent) ||
      (/Macintosh/.test(agent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
    function recover() {
      var el = document.activeElement;
      if (!el || !/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || '') ||
          /^(hidden|checkbox|radio|file|button|submit|reset|date|month|time|color)$/.test(el.type || '') ||
          !el.getBoundingClientRect || !el.scrollIntoView) return;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      var vv = window.visualViewport;
      var visibleTop = vv ? vv.offsetTop : 0;
      var visibleBottom = visibleTop + (vv ? vv.height : window.innerHeight);
      var header = document.getElementById('izCommonHeader');
      var headerBottom = header ? header.getBoundingClientRect().bottom : 0;
      var topLimit = Math.max(visibleTop, headerBottom) + 10;
      var bottomLimit = visibleBottom - 12;
      if (bottomLimit <= topLimit || (rect.top >= topLimit && rect.bottom <= bottomLimit)) return;
      if (iosWebKit) {
        // After native keyboard settling, perform at most one minimal nearest
        // correction for a truly obscured field. Never center nor manually
        // scroll the window again; WebKit owns the keyboard offset.
        try { el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' }); }
        catch (_) { try { el.scrollIntoView(false); } catch (ignored) {} }
        return;
      }
      try { el.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' }); }
      catch (_) { try { el.scrollIntoView(true); } catch (ignore) {} }
      // After rotation, some Android WebViews perform scrollIntoView before
      // the floating IME settles. Recheck the viewport and apply the needed
      // delta only when the same focused input is still obscured.
      if (typeof window.scrollBy === 'function') {
        var after = el.getBoundingClientRect();
        if (after.top < topLimit || after.bottom > bottomLimit) {
          var desiredTop = topLimit + Math.max(0, (bottomLimit - topLimit - after.height) / 2);
          var delta = after.top - desiredTop;
          var parent = el.parentElement;
          while (parent && parent !== document.body && parent !== document.documentElement) {
            if (parent.scrollHeight > parent.clientHeight + 1 &&
                typeof parent.scrollTop === 'number') {
              var overflow = typeof window.getComputedStyle === 'function'
                ? window.getComputedStyle(parent).overflowY : 'auto';
              if (/^(auto|scroll|overlay)$/.test(overflow)) {
                parent.scrollTop += delta;
                after = el.getBoundingClientRect();
                delta = after.top - desiredTop;
                break;
              }
            }
            parent = parent.parentElement;
          }
          if (Math.abs(delta) > 2) try { window.scrollBy(0, delta); } catch (ignored) {}
        }
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(recover, iosWebKit ? 500 : 90);
    }
    document.addEventListener('focusin', schedule);
    window.addEventListener('orientationchange', function () {
      if (iosWebKit) {
        // Rotation is one stable end state, not three competing animations.
        clearTimeout(timer);
        timer = setTimeout(recover, 850);
        return;
      }
      schedule();
      setTimeout(recover, 350);
      setTimeout(recover, 850);
      setTimeout(recover, 1400);
    });
    if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
      window.screen.orientation.addEventListener('change', schedule);
    }
    if (!iosWebKit) {
      // Android IME visibility recovery relies on these events; on iOS
      // WebKit they fire *during* the keyboard animation and must not drive
      // repeated manual scroll.
      window.addEventListener('resize', schedule);
      if (window.visualViewport && window.visualViewport.addEventListener) {
        window.visualViewport.addEventListener('resize', schedule);
        window.visualViewport.addEventListener('scroll', schedule);
      }
    }
  }

  function addStyles() {
    if (document.getElementById('izHeaderStyle')) return;
    var s = document.createElement('style'); s.id = 'izHeaderStyle';
    s.textContent =
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif!important}' +
      '#izCommonHeader{position:sticky;top:0;z-index:2147483000;background:var(--accent, #0f172a);color:#fff;font-family:inherit;box-shadow:0 1px 0 rgba(255,255,255,.1)}' +
      // All native / hosted POS entrypoints share one fullscreen dialog layer.
      'body > :is(.ov,.modal,.modal-bg,.receipt-modal,.kp-ov,.menu-landscape-time-overlay,.landscape-time-dialog,.setup-overlay,.overlay,#restoreOv,#moveOv,#camOv,#aiOv,#linkOv,#poPickOv,#qrModal){z-index:2147483001!important}' +
      'body > .uic-ov{z-index:2147483002!important}' +
      'body > #moveOv{z-index:2147483010!important}' +
      'body > #aiOv{z-index:2147483015!important}' +
      'body > #linkOv{z-index:2147483020!important}' +
      'body > #camOv{z-index:2147483025!important}' +
      'body > .overlay.opt-modal{z-index:2147483011!important}' +
      'body > #errOverlay{z-index:2147483020!important}' +
      'body > #doneOverlay{z-index:2147483030!important}' +
      '#izCommonHeader .iz-header-main{display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:8px 12px;min-height:50px}' +
      '#izCommonHeader .iz-header-top{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;min-height:20px}' +
      // Screen-specific controls are left/scrollable; common buttons stay at
      // the right edge even on narrow mobile viewports.
      '#izCommonHeader .iz-header-toolbar{display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;flex-wrap:nowrap;overflow:hidden}' +
      // IZK-UT-073: never let unbroken user text widen Flex/Grid/table.
      // IZK-UT-073: allow natural phrase boundaries; no mid-word global wrap.
      'body{overflow-wrap:normal;word-break:normal}' +
      'body input,body textarea,body select{max-width:100%;box-sizing:border-box}' +
      'body img,body video{max-width:100%}' +
      '#izHeaderTitle{font-size:12px;font-weight:800;line-height:1.2;flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}' +
      '#izHeaderMeta{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex:0 0 auto;min-width:max-content;flex-wrap:nowrap;overflow:visible;margin-left:auto}' +
      '#izHeaderActions{display:flex;align-items:center;gap:6px;flex:0 0 auto;flex-wrap:nowrap;margin-left:auto}' +
      '.iz-header-clock,.iz-header-user{font-size:12px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;background:rgba(255,255,255,.1);padding:7px 9px;border-radius:8px}' +
      '.iz-header-user{max-width:none;width:max-content;min-width:max-content;flex:0 0 auto;white-space:nowrap;overflow:visible;box-sizing:border-box;text-align:right;padding:3px 7px}' +
      '#izHeaderClock{margin-left:auto;flex:0 0 auto}' +
      '.iz-header-btn{border:0;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;padding:8px 10px;min-height:34px;font:800 12px/1.2 inherit;cursor:pointer;white-space:nowrap}' +
      '.iz-header-btn:hover{background:rgba(255,255,255,.25)}' +
      'input[type="month"],input[type="time"]{display:block!important;inline-size:100%!important;width:100%!important;min-inline-size:0!important;min-width:0!important;max-inline-size:100%!important;max-width:100%!important;box-sizing:border-box!important;overflow:visible!important}input[type="month"]::-webkit-date-and-time-value,input[type="time"]::-webkit-date-and-time-value{min-width:0!important;text-align:left!important}[data-guide-anchor]{scroll-margin-top:64px}' +
      '#izHeaderExtra{display:flex;align-items:center;justify-content:flex-start;gap:6px;flex:1 1 auto;min-width:0;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;flex-wrap:nowrap;padding:0;background:transparent;border:0}' +
      '#izHeaderExtra::-webkit-scrollbar{display:none}' +
      '#izHeaderExtra>*{flex:0 0 auto;white-space:nowrap}' +
      '#izHeaderExtra[hidden]{display:none}' +
      '#izHeaderExtra a,#izHeaderExtra button{margin:0!important}' +
      '@media(max-width:720px){#izCommonHeader .iz-header-main{gap:4px;padding:6px 8px;min-height:44px}#izHeaderTitle{min-width:0;font-size:12px}#izHeaderExtra{gap:4px}.iz-header-clock{font-size:12px;padding:6px}.iz-header-user{max-width:none;min-width:max-content;padding:3px 6px}.iz-header-btn{width:32px;min-height:32px;padding:6px;font-size:13px}#izHeaderLang{width:auto;min-width:38px}}' +
      '@media(max-width:720px){#izCommonHeader #izHeaderActions>.iz-header-btn:not(#izAiCreditBadge){width:40px!important;min-width:40px!important;max-width:40px!important;padding-left:3px!important;padding-right:3px!important;box-sizing:border-box!important}}' +
      '@media(max-width:430px){#izHeaderMeta{gap:4px}}' +
      '@media(max-width:480px){.iz-header-clock{display:none}}' +
      '@media(max-width:430px){#izHeaderActions{gap:3px}}' +
      '@media(max-width:430px){#izCommonHeader .iz-header-main{flex-wrap:nowrap}#izHeaderTitle{line-height:1.2;min-width:0}#izHeaderMeta{flex-wrap:nowrap;overflow:visible}#izHeaderActions{gap:3px}#izHeaderExtra{flex-wrap:nowrap}#izHeaderExtra[hidden],#izHeaderMeta:empty{display:none}}' +
      // WKWebView zooms the viewport when focused text is below 16px; scope
      // this rule to touch iPhone/iPad without changing Android or date pickers.
      '@supports (-webkit-touch-callout:none){@media (max-width:920px) and (pointer:coarse){' +
      'input:not([type]),input[type="text"],input[type="password"],input[type="email"],input[type="tel"],input[type="url"],input[type="search"],input[type="number"],textarea,select{font-size:16px!important;scroll-margin-top:64px}' +
      '}}' +
      // Coarse-touch Android/iOS controls use accessible hit rectangles.
      '@media (pointer:coarse){' +
      'button,input[type="button"],input[type="submit"],input[type="reset"],a[role="button"],[role="button"]{min-width:44px!important;min-height:44px!important;box-sizing:border-box}' +
      '#izCommonHeader .iz-header-btn,#izHeaderExtra button,#izHeaderExtra a{min-width:44px!important;min-height:44px!important}' +
      '#soundBtn,#kprintBtn{min-width:44px!important;min-height:44px!important}' +
      '}' +
      '@media (pointer:coarse) and (max-width:720px){#izCommonHeader #izHeaderActions>.iz-header-btn:not(#izAiCreditBadge){min-width:40px!important;min-height:44px!important}}' +
      // On compact landscape Android, a floating IME covers the right side
      // without shrinking visualViewport. Keep the active input on the left.
      '@media (orientation:landscape) and (max-height:480px) and (pointer:coarse){' +
      'input:not([type]):focus,input[type="text"]:focus,input[type="number"]:focus,input[type="tel"]:focus,input[type="email"]:focus,input[type="search"]:focus,input[type="password"]:focus,textarea:focus{max-width:min(46vw,370px)!important;box-sizing:border-box!important}' +
      '}';
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
      // An old tenant response must never replace the current store clock.
      var current = readSession();
      if ((session.loggedIn ? sessionIdentity(session.token) : '') !==
          (current.loggedIn ? sessionIdentity(current.token) : '')) return;
      // GAS互換bootstrap/getSettingsはフラット、ネイティブ経路はdata配下で返るため両方を扱う。
      var d = (r && r.data) || r || {};
      var settings = d.settings || d;
      saveTimezone(settings.timezone);
    }).catch(function () {});
  }

  function init() {
    if (!document.body || document.getElementById('izCommonHeader')) return;
    addStyles();
    installFocusedFieldVisibility();
    var session = readSession(), policy = pagePolicy(location.pathname, session.loggedIn, location.search);
    currentHeaderIdentity = session.loggedIn ? sessionIdentity(session.token) : '';
    installBackPropagation(session.loggedIn);
    var legacy = findLegacyHeader(policy.page);
    var header = document.createElement('header'); header.id = 'izCommonHeader';
    var main = document.createElement('div'); main.className = 'iz-header-main';
    var top = document.createElement('div'); top.className = 'iz-header-top';
    var toolbar = document.createElement('div'); toolbar.className = 'iz-header-toolbar';
    var title = document.createElement('div'); title.id = 'izHeaderTitle'; title.textContent = document.title || '';
    var meta = document.createElement('div'); meta.id = 'izHeaderMeta';
    if (policy.showClock) { var clock = document.createElement('span'); clock.id = 'izHeaderClock'; clock.className = 'iz-header-clock'; meta.appendChild(clock); state.clock = clock; }
    if (policy.showUser && session.name) {
      var user = document.createElement('span'); user.id = 'izHeaderUser'; user.className = 'iz-header-user';
      user.setAttribute('data-iz-user-name', session.name); user.setAttribute('data-iz-user-role', session.role || '');
      user.textContent = '👤 ' + abbreviateUtf8(session.name, 16); meta.appendChild(user); state.user = user;
    }
    var actions = document.createElement('div'); actions.id = 'izHeaderActions';
    var help = button('izHeaderHelp', '❓', null);
    help.style.visibility = 'hidden'; help.disabled = true; help.setAttribute('aria-hidden', 'true');
    help.style.width = '46px'; help.style.minHeight = '46px'; actions.appendChild(help);
    var lang = button('izHeaderLang', '', switchLanguage); lang.setAttribute('data-tlang', ''); actions.appendChild(lang); state.lang = lang;
    var refreshButton = button('izHeaderRefresh', '↻', refreshPage);
    refreshButton.style.visibility=policy.showRefresh?'visible':'hidden'; refreshButton.disabled=!policy.showRefresh; actions.appendChild(refreshButton);
    var manageButton = button('izHeaderManage', '⌂', function () { if (navigationAllowed()) location.href = './manage.html'; });
    manageButton.style.visibility=policy.showManage?'visible':'hidden'; manageButton.disabled=!policy.showManage; actions.appendChild(manageButton);
    var backButton = button('izHeaderBack', '←', function () { goBack(pagePolicy(location.pathname, readSession().loggedIn, location.search)); });
    backButton.style.visibility=policy.showBack?'visible':'hidden'; backButton.disabled=!policy.showBack; actions.appendChild(backButton);
    var extra = document.createElement('div'); extra.id = 'izHeaderExtra'; extra.hidden = true;
    top.appendChild(title); top.appendChild(meta);
    toolbar.appendChild(extra); toolbar.appendChild(actions);
    main.appendChild(top); main.appendChild(toolbar); header.appendChild(main);
    document.body.insertBefore(header, document.body.firstChild);
    ensureAiCreditHub(policy);
    ensureAnnouncements(policy);
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
    refreshAccent();
    window.addEventListener('pageshow', refreshAccent);
    installAiCreditSessionRecovery();
  }

  // Auth may become usable after the header's first render (native secure
  // storage restore, background resume, or a late API initialization). Pages
  // such as menu_editor.html do not issue an explicit header auth notification.
  // Use lifecycle events plus two bounded bootstrap checks, not a polling loop.
  function installAiCreditSessionRecovery() {
    function resync() {
      if (!document.getElementById('izCommonHeader')) return;
      var session = readSession();
      var identity = session.loggedIn ? sessionIdentity(session.token) : '';
      var identityChanged = currentHeaderIdentity !== identity;
      currentHeaderIdentity = identity;
      syncAuthDisplay();
      if (identityChanged) {
        refreshAccent();
        // The authenticated store may also have changed its clock timezone.
        state.timezone = validTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
        renderClock();
        fetchTimezone(session, pagePolicy(location.pathname, session.loggedIn, location.search));
      }
    }
    // The storage event does not fire in the same tab that rotates its v3
    // token. The Web API explicitly notifies this document after a change.
    window.addEventListener('iz-auth-session-changed', resync);
    window.addEventListener('pageshow', resync);
    window.addEventListener('focus', resync);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) resync(); });
    window.addEventListener('storage', resync);
    setTimeout(resync, 1000);
    setTimeout(resync, 4500);
  }

  var aiHubLoadRetried = false;
  function ensureAiCreditHub(policy) {
    if (window.IZAICreditHub) { window.IZAICreditHub.sync(); return; }
    if (!policy || !policy.showAiCredit || document.querySelector('[data-iz-ai-hub]')) return;
    var creditScript = document.createElement('script');
    creditScript.src = './ai-credit-hub.js?v=auth7';
    creditScript.setAttribute('data-iz-ai-hub','');
    // A failed network fetch must not leave a permanent script marker that
    // prevents every later attempt to display the AI balance.
    function failed() {
      creditScript.remove();
      if (aiHubLoadRetried) return;
      aiHubLoadRetried = true;
      setTimeout(function () {
        ensureAiCreditHub(pagePolicy(location.pathname, readSession().loggedIn, location.search));
      }, 1200);
    }
    creditScript.onerror = failed;
    creditScript.onload = function () {
      if (!window.IZAICreditHub) { failed(); return; }
      window.IZAICreditHub.sync();
    };
    document.head.appendChild(creditScript);
  }

  // Shared announcement center is lazy-loaded on authenticated management pages.
  var announcementLoadRetried = false;
  function ensureAnnouncements(policy) {
    if (window.IZAnnouncements) { window.IZAnnouncements.sync(); return; }
    if (!policy || !policy.showAiCredit || document.querySelector('[data-iz-announcements]')) return;
    var script = document.createElement('script');
    script.src = './announcement-center.js?v=7';
    script.setAttribute('data-iz-announcements', '');
    script.onload = function () { if (window.IZAnnouncements) window.IZAnnouncements.sync(); };
    script.onerror = function () {
      script.remove();
      if (announcementLoadRetried) return;
      announcementLoadRetried = true;
      setTimeout(function () {
        ensureAnnouncements(pagePolicy(location.pathname, readSession().loggedIn, location.search));
      }, 1200);
    };
    document.head.appendChild(script);
  }

  window.IZHeader = { init: init, refreshAccent: refreshAccent, syncAuthDisplay: syncAuthDisplay, confirm: requestConfirmation, validSession: validSession, pagePolicy: pagePolicy, wallClockParts: wallClockParts, saveTimezone: saveTimezone, withBackHref: withBackHref, resolveBackTarget: resolveBackTarget, scrollGuideHashTarget: scrollGuideHashTarget };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
  }
})();
