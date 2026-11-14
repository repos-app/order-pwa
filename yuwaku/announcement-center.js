// One shared, authenticated announcement center for Web/PWA/Native management pages.
// Read and first-auto-display state are authoritative on the tenant API, not localStorage.
(function () {
  'use strict';
  if (window.IZAnnouncements) return;
  var activeToken = '', generation = 0, loadedAt = 0, loading = null;
  var items = [], unreadCount = 0, failed = false, badge = null, overlay = null;
  var mode = 'list', selectedId = '', filter = 'all', forced = false, previousFocus = null;
  var autoAttempted = Object.create(null);
  var diagnosticReport = null;

  function language() {
    try { if (window.I18n && typeof I18n.lang === 'function') return I18n.lang() === 'en' ? 'en' : 'ja'; }
    catch (_) {}
    try {
      var saved = localStorage.getItem('lang');
      if (saved === 'ja' || saved === 'en') return saved;
    } catch (_) {}
    return String(document.documentElement.lang || navigator.language || 'en').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  }
  function t(ja, en) { return language() === 'ja' ? ja : en; }
  function token() {
    try { return window.API && typeof API.currentToken === 'function' ? API.currentToken() || '' : ''; }
    catch (_) { return ''; }
  }
  function sameSessionIdentity(previous, current) {
    function fields(value) {
      var raw = String(value || ''), dot = raw.lastIndexOf('.');
      if (dot < 0) return null;
      var parts = raw.slice(0, dot).split('~');
      if (!((parts.length === 7 && parts[0] === 'v3' && parts[6]) ||
            (parts.length === 6 && parts[0] === 'v2'))) return null;
      return [parts[0], parts[2], parts[3], parts[4], parts[5], parts[6] || ''].join('~');
    }
    var a = fields(previous), b = fields(current);
    return !!a && a === b;
  }
  function eligible() {
    var current = token();
    if (!current || !window.IZHeader || !IZHeader.validSession(current) ||
        !document.getElementById('izHeaderActions')) return false;
    var p = IZHeader.pagePolicy(location.pathname, true, location.search);
    if (!p.showAiCredit) return false; // Exclude guest ordering, legal and login pages.
    var hub = document.getElementById('hubView');
    if (hub && (p.page === 'manage.html' || p.page === 'index.html') &&
        hub.classList.contains('hidden')) return false;
    return true;
  }
  function rpc(fn, args, session) {
    if (!window.API || typeof API.post !== 'function') return Promise.reject(new Error('api_unavailable'));
    return API.post('rpc', { fn: fn, args: args || [], token: session, __silent: true, __noInternalRetry: true })
      .then(function (r) {
        if (!r || r.ok !== true) throw new Error(String(r && r.error || 'announcement_request_failed'));
        return r.data || {};
      });
  }
  function style() {
    if (document.getElementById('izAnnouncementStyle')) return;
    var el = document.createElement('style');
    el.id = 'izAnnouncementStyle';
    el.textContent =
      '#izCommonHeader #izAnnouncementBadge{position:relative;display:flex!important;flex-direction:column!important;align-items:center;justify-content:center;gap:0;' +
      'width:44px!important;min-width:44px!important;max-width:44px!important;' +
      'padding:3px!important;font-size:14px!important;line-height:16px!important;box-sizing:border-box!important}' +
      '@media(max-width:720px){#izCommonHeader #izHeaderActions>#izAnnouncementBadge{' +
      'width:40px!important;min-width:40px!important;max-width:40px!important}}' +
      '#izCommonHeader #izAnnouncementBadge.iz-ann-normal{background:#facc15!important;color:#111827!important}' +
      '#izCommonHeader #izAnnouncementBadge.iz-ann-important{background:#dc2626!important;color:#fff!important}' +
      '#izAnnouncementBadge .iz-ann-glyph{display:block;flex:0 0 auto;font-size:16px;line-height:17px}' +
      '#izAnnouncementCount{display:block;position:static;flex:0 0 auto;min-width:7px;' +
      'font:800 11px/12px system-ui,sans-serif;letter-spacing:-.35px;text-align:center;' +
      'font-variant-numeric:tabular-nums;white-space:nowrap;color:inherit}' +
      '#izAnnouncementOverlay{position:fixed;inset:0;z-index:2147483070;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(15,23,42,.7);padding:12px;box-sizing:border-box}' +
      '#izAnnouncementDialog{background:#fff;color:#0f172a;border-radius:14px;width:min(100%,490px);' +
      'max-height:min(88dvh,750px);overflow-y:auto;box-shadow:0 18px 45px rgba(0,0,0,.25);' +
      'padding:18px;box-sizing:border-box;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}' +
      '#izAnnouncementDialog h2{font-size:19px;line-height:1.3;margin:0}' +
      '#izAnnouncementDialog .iz-ann-top{display:flex;justify-content:space-between;gap:12px;align-items:start}' +
      '#izAnnouncementDialog .iz-ann-muted{font-size:12px;color:#64748b;margin:4px 0 12px}' +
      '#izAnnouncementDialog .iz-ann-list{display:flex;flex-direction:column;gap:8px;margin:12px 0}' +
      '#izAnnouncementDialog .iz-ann-row{display:flex;flex-direction:column;align-items:start;gap:3px;text-align:left;' +
      'width:100%;min-height:56px;border:1px solid #cbd5e1;border-radius:9px;padding:10px;background:white;' +
      'color:#0f172a;white-space:normal;cursor:pointer;font:inherit}' +
      '#izAnnouncementDialog .iz-ann-row[aria-label*=Unread]{border-color:#b45309;background:#fffaf0}' +
      '#izAnnouncementDialog .iz-ann-type{font-weight:800;color:#a16207;font-size:12px}' +
      '#izAnnouncementDialog .iz-ann-normal{color:#475569}' +
      '#izAnnouncementDialog .iz-ann-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;margin:16px 0}' +
      '#izAnnouncementDialog .iz-ann-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}' +
      '#izAnnouncementDialog .iz-ann-diagnostic{margin-top:14px;padding:12px;border:1px solid #cbd5e1;border-radius:9px}' +
      '#izAnnouncementDialog .iz-ann-diagnostic .iz-ann-muted{margin:6px 0 0;overflow-wrap:anywhere}' +
      '#izAnnouncementDialog button.iz-ann-action{border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;' +
      'color:#0f172a;min-height:44px;padding:8px 12px;cursor:pointer;font:700 14px/1.2 inherit}' +
      '#izAnnouncementDialog button.iz-ann-primary{background:#0f172a;color:#fff;border-color:#0f172a}' +
      '#izAnnouncementDialog button[aria-pressed=true]{background:#334155;color:#fff}' +
      '#izAnnouncementDialog button:focus-visible,#izAnnouncementBadge:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}';
    document.head.appendChild(el);
  }
  function add(parent, tag, value, className) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value != null) el.textContent = value;
    parent.appendChild(el);
    return el;
  }
  function localized(item, key) {
    return String(item[key + (language() === 'ja' ? 'Ja' : 'En')] ||
      item[key + (language() === 'ja' ? 'En' : 'Ja')] || '');
  }
  function dateLabel(value) {
    if (!value) return '';
    // Published timestamps originate from Control D1 in UTC. The device's
    // timezone may differ from the store's timezone at the date boundary.
    // Never show an incorrect calendar date when regional settings are missing.
    if (!window.DateDisplay || typeof DateDisplay.formatUtcDateTime !== 'function' ||
        !DateDisplay.getTimeZone || !DateDisplay.getTimeZone()) return '';
    return DateDisplay.formatUtcDateTime(value).split(' ')[0];
  }
  // Native release versions must come from the installed app, not a copied
  // frontend config constant (which remains the same across TestFlight builds).
  var nativeVersion = '', nativeVersionStarted = false;
  function isNativeApp() {
    try {
      var cap = window.Capacitor;
      return !!((cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) ||
        (cap && typeof cap.getPlatform === 'function' && cap.getPlatform() !== 'web') ||
        (window.APP_CONFIG && APP_CONFIG.NATIVE_DISABLE_SERVICE_WORKER));
    } catch (_) { return false; }
  }
  function version() {
    if (!isNativeApp()) return t('Web版', 'Web');
    if (!nativeVersionStarted) {
      nativeVersionStarted = true;
      Promise.resolve().then(function () {
        var cap = window.Capacitor;
        var app = cap && cap.Plugins && cap.Plugins.App;
        if (!app && cap && typeof cap.registerPlugin === 'function') app = cap.registerPlugin('App');
        if (!app || typeof app.getInfo !== 'function') throw new Error('native_app_info_unavailable');
        return app.getInfo();
      }).then(function (info) {
        var release = String(info && info.version || '').trim();
        var build = String(info && info.build || '').trim();
        nativeVersion = release ? (release.charAt(0) === 'v' ? '' : 'v') + release +
          (build ? ' (' + build + ')' : '') : '—';
        if (overlay) paint();
      }).catch(function () {
        // Never invent a release number when native metadata is unavailable.
        nativeVersion = '—';
        if (overlay) paint();
      });
    }
    return nativeVersion || t('取得中', 'Loading');
  }
  function badgeUpdate() {
    if (!badge) return;
    var hasImportant = unreadCount > 0 && items.some(function (item) {
      return item && item.severity === 'important' && !item.readAt;
    });
    badge.classList.toggle('iz-ann-unread', unreadCount > 0);
    badge.classList.toggle('iz-ann-important', hasImportant);
    badge.classList.toggle('iz-ann-normal', unreadCount > 0 && !hasImportant);
    badge.replaceChildren();
    var glyph = add(badge, 'span', 'ℹ️', 'iz-ann-glyph');
    glyph.setAttribute('aria-hidden', 'true');
    // Two-line badge uses a compact 0-99 count without increasing header height.
    var count = add(badge, 'span', String(Math.min(99, unreadCount)));
    count.id = 'izAnnouncementCount';
    count.setAttribute('aria-hidden', 'true');
    var label = t('お知らせ', 'Announcements') + (unreadCount ? ' · ' + t('未読 ', 'Unread ') + unreadCount : '');
    if (hasImportant) label += ' · ' + t('重要な未読あり', 'Important unread notice');
    badge.title = label;
    badge.setAttribute('aria-label', label);
  }
  function button(parent, label, onClick, primary) {
    var b = add(parent, 'button', label, 'iz-ann-action' + (primary ? ' iz-ann-primary' : ''));
    b.type = 'button'; b.onclick = onClick;
    return b;
  }
  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    forced = false;
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    previousFocus = null;
  }
  function setRead(item) {
    if (!item || item.readAt || !activeToken) return Promise.resolve();
    if (item.__readPending) return item.__readPending;
    var session = activeToken, seq = generation;
    item.__readPending = rpc('markAnnouncementRead', [item.id], session).then(function () {
      if (seq !== generation || session !== activeToken) return;
      if (item.readAt) return;
      item.readAt = new Date().toISOString();
      unreadCount = Math.max(0, unreadCount - 1);
      badgeUpdate();
      if (overlay) paint();
    }).catch(function () {
      var dialog = document.getElementById('izAnnouncementDialog');
      if (dialog) add(dialog, 'p', t('既読の保存に失敗しました。通信状況をご確認ください。', 'Could not save read status. Check your connection.'), 'iz-ann-muted');
    }).finally(function () { delete item.__readPending; });
    return item.__readPending;
  }
  function autoNext() {
    if (overlay || !eligible() || failed) return;
    var notice = items.find(function (x) {
      return x.severity === 'important' && !x.autoShownAt && !autoAttempted[x.id];
    });
    if (!notice) return;
    autoAttempted[notice.id] = true;
    openDetail(notice.id, true);
    // Only report the automatic display after the dialog really exists.
    if (overlay) {
      var session = activeToken, seq = generation;
      rpc('markAnnouncementAutoShown', [notice.id], session).then(function () {
        if (session === activeToken && seq === generation) notice.autoShownAt = new Date().toISOString();
      }).catch(function () { /* The next authenticated visit retries via authoritative server state. */ });
    }
  }
  function finishDetail() {
    var item = items.find(function (x) { return String(x.id) === String(selectedId); });
    var wasForced = forced;
    // Acknowledging an automatically displayed important notice also marks it read.
    Promise.resolve(setRead(item)).finally(function () {
      if (wasForced) { close(); autoNext(); }
      else { mode = 'list'; selectedId = ''; paint(); }
    });
  }
  function sendDiagnostics() {
    if (diagnosticReport && diagnosticReport.state === 'sending') return;
    var session = activeToken;
    var store = window.API && typeof API.currentStoreId === 'function' ? API.currentStoreId() : '';
    diagnosticReport = {state:'sending'};
    paint();
    Promise.resolve().then(function () {
      if (!window.API || typeof API.sendDiagnosticsNow !== 'function')
        throw new Error('diagnostic_unavailable');
      return API.sendDiagnosticsNow();
    }).then(function (receipt) {
      if ((session !== activeToken && !sameSessionIdentity(session, activeToken)) ||
          !window.API || API.currentStoreId() !== store) return;
      if (!receipt || receipt.ok !== true || !/^[a-zA-Z0-9_-]{8,64}$/.test(String(receipt.eventId)))
        throw new Error('diagnostic_send_unconfirmed');
      diagnosticReport = {state:'confirmed',id:receipt.eventId,
        pending:Number.isInteger(receipt.pendingCount) ? receipt.pendingCount : null,
        total:Number.isInteger(receipt.totalCount) ? receipt.totalCount : null,
        resent:Number.isInteger(receipt.resentCount) ? receipt.resentCount : null,
        partial:Number(receipt.failedCount)>0 || receipt.incomplete===true};
      if (overlay) paint();
    }).catch(function (error) {
      if ((session !== activeToken && !sameSessionIdentity(session, activeToken)) ||
          !window.API || API.currentStoreId() !== store) return;
      var code = String(error && error.message || '');
      diagnosticReport = {state:'failed',code:
        code === 'diagnostic_login_required' ? 'auth' :
        code === 'diagnostic_queue_unavailable' ? 'storage' : 'unconfirmed'};
      if (overlay) paint();
    });
  }
  function paint() {
    if (!overlay) return;
    var dialog = document.getElementById('izAnnouncementDialog');
    if (!dialog) return;
    dialog.replaceChildren();
    var top = add(dialog, 'div', null, 'iz-ann-top');
    add(top, 'h2', mode === 'detail' ? t('お知らせ詳細', 'Announcement') : t('お知らせ', 'Announcements')).id = 'izAnnouncementTitle';
    // First-show important notices require explicit acknowledgement. Never
    // expose an X, backdrop click or Escape as an accidental bypass.
    if (!forced) button(top, '×', close).setAttribute('aria-label', t('閉じる', 'Close'));
    add(dialog, 'p', t('アプリバージョン: ', 'App version: ') + version() + ' · ' +
      t('未読 ', 'Unread ') + unreadCount, 'iz-ann-muted');
    if (mode === 'detail') {
      var item = items.find(function (x) { return String(x.id) === String(selectedId); });
      if (item) {
        add(dialog, 'p', item.severity === 'important' ? t('重要なお知らせ', 'Important notice') : t('通常のお知らせ', 'General notice'),
          'iz-ann-type' + (item.severity !== 'important' ? ' iz-ann-normal' : ''));
        add(dialog, 'h3', localized(item, 'title'));
        add(dialog, 'p', dateLabel(item.publishedAt), 'iz-ann-muted');
        add(dialog, 'div', localized(item, 'body'), 'iz-ann-body');
      }
      var actions = add(dialog, 'div', null, 'iz-ann-actions');
      button(actions, forced ? t('確認しました', 'Acknowledge') : t('一覧へ戻る', 'Back to list'), finishDetail, true);
      return;
    }
    var tabs = add(dialog, 'div', null, 'iz-ann-actions');
    [['all',t('すべて', 'All')],['important',t('重要', 'Important')],['normal',t('通常', 'General')]].forEach(function (entry) {
      var tab = button(tabs, entry[1], function () { filter = entry[0]; paint(); });
      tab.setAttribute('aria-pressed', String(filter === entry[0]));
    });
    if (failed) add(dialog, 'p', t('お知らせを取得できません。接続を確認して再試行してください。', 'Unable to load announcements. Check your connection and retry.'), 'iz-ann-muted');
    var list = add(dialog, 'div', null, 'iz-ann-list');
    var visible = items.filter(function (x) { return filter === 'all' || filter === x.severity; });
    if (!visible.length && !failed) add(list, 'p', t('お知らせはありません。', 'There are no announcements.'), 'iz-ann-muted');
    visible.forEach(function (item) {
      var row = button(list, '', function () { openDetail(item.id, false); });
      row.className = 'iz-ann-row';
      row.textContent = '';
      row.setAttribute('aria-label', (item.readAt ? 'Read' : 'Unread') + ' ' + localized(item, 'title'));
      add(row, 'span', item.severity === 'important' ? t('重要', 'Important') : t('通常', 'General'),
        'iz-ann-type' + (item.severity !== 'important' ? ' iz-ann-normal' : ''));
      add(row, 'strong', (item.readAt ? '' : '● ') + localized(item, 'title'));
      add(row, 'span', dateLabel(item.publishedAt), 'iz-ann-muted');
    });
    var diagnostics = add(dialog, 'div', null, 'iz-ann-diagnostic');
    add(diagnostics, 'strong', t('クライアント診断', 'Client diagnostics'));
    add(diagnostics, 'p', t('端末に保持しているログを送信・再送します。送信済みのログも削除されず、もう一度送れます。',
      'Send or resend retained device logs. Already sent logs stay on this device and can be sent again.'), 'iz-ann-muted');
    var sendButton = button(diagnostics, diagnosticReport && diagnosticReport.state === 'sending'
      ? t('送信中…', 'Sending…') : t('診断ログを送信', 'Send diagnostic logs'), sendDiagnostics);
    sendButton.id = 'izAnnouncementSendDiagnostics';
    sendButton.disabled = !!diagnosticReport && diagnosticReport.state === 'sending';
    var status = add(diagnostics, 'p', '', 'iz-ann-muted');
    status.id = 'izAnnouncementDiagnosticStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (diagnosticReport && diagnosticReport.state === 'sending') {
      status.textContent = t('サーバーからの保存確認を待っています…', 'Waiting for the server save acknowledgement…');
    } else if (diagnosticReport && diagnosticReport.state === 'confirmed') {
      status.textContent = t('サーバー保存確認済み。確認ID: ', 'Server save confirmed. Event ID: ') +
        diagnosticReport.id + (diagnosticReport.total == null ? '' :
          ' · ' + t('ログ再送確認: ', 'Logs re-upload confirmed: ') +
          diagnosticReport.resent + '/' + diagnosticReport.total) +
        (diagnosticReport.partial && diagnosticReport.pending
          ? ' · ' + t('一部未確認（再送可能）: ', 'Unconfirmed (can retry): ') + diagnosticReport.pending
          : '');
    } else if (diagnosticReport && diagnosticReport.state === 'failed') {
      status.textContent = diagnosticReport.code === 'auth'
        ? t('ログインを確認して再試行してください。', 'Sign in and try again.')
        : diagnosticReport.code === 'storage'
        ? t('端末内のログ保存に失敗しました。保存・送信は確認できていません。',
          'Local log storage failed. No save or delivery is confirmed.')
        : t('サーバー保存を確認できませんでした。記録は端末に保持し、自動再送します。',
          'Server save not confirmed. The queued event is retained for automatic retry.');
    }
    var actions = add(dialog, 'div', null, 'iz-ann-actions');
    button(actions, t('最新情報を取得', 'Refresh'), function () { load(true); });
    button(actions, t('閉じる', 'Close'), close, true);
  }
  function openDetail(id, isForced) {
    mode = 'detail'; selectedId = id; forced = !!isForced;
    if (!overlay) openOverlay();
    paint();
    // An intentionally opened item is read immediately, independent of Back/Close.
    // Automatically presented important notices require explicit acknowledgement.
    if (!isForced) setRead(items.find(function (x) { return String(x.id) === String(id); }));
  }
  function openOverlay() {
    if (overlay) return;
    style();
    previousFocus = document.activeElement;
    overlay = add(document.body, 'div', null);
    overlay.id = 'izAnnouncementOverlay';
    overlay.setAttribute('role', 'presentation');
    var dialog = add(overlay, 'section', null);
    dialog.id = 'izAnnouncementDialog'; dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'izAnnouncementTitle');
    overlay.onclick = function (e) { if (e.target === overlay && !forced) close(); };
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !forced) { e.preventDefault(); close(); }
      if (e.key !== 'Tab') return;
      var candidates = dialog.querySelectorAll('button:not(:disabled)');
      if (!candidates.length) return;
      var first = candidates[0], last = candidates[candidates.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    setTimeout(function () { if (overlay && dialog.querySelector('button')) dialog.querySelector('button').focus(); }, 0);
  }
  function open() {
    if (!eligible()) return;
    mode = 'list'; filter = 'all'; selectedId = ''; forced = false;
    openOverlay(); paint(); load(true);
  }
  function load(force) {
    if (!eligible() || !activeToken) return Promise.resolve();
    if (loading) return loading;
    if (!force && loadedAt && Date.now() - loadedAt < 60000) return Promise.resolve();
    var session = activeToken, seq = generation;
    loading = rpc('listAnnouncements', [], session).then(function (payload) {
      if (session !== activeToken || seq !== generation || !eligible()) return;
      if (!Array.isArray(payload.announcements) || !Number.isSafeInteger(payload.unreadCount) || payload.unreadCount < 0)
        throw new Error('announcement_response_invalid');
      items = payload.announcements; unreadCount = payload.unreadCount;
      loadedAt = Date.now(); failed = false; badgeUpdate();
      if (overlay) paint();
      autoNext();
    }).catch(function () {
      if (session !== activeToken || seq !== generation) return;
      failed = true; loadedAt = 0;
      if (overlay) paint();
    }).finally(function () { if (seq === generation) loading = null; });
    return loading;
  }
  function sync() {
    var next = token(), actions = document.getElementById('izHeaderActions');
    if (!eligible() || !actions) {
      ++generation; activeToken = ''; items = []; unreadCount = 0; loadedAt = 0;
      loading = null; failed = false; diagnosticReport = null;
      autoAttempted = Object.create(null);
      if (badge) badge.remove();
      badge = null; close();
      return;
    }
    if (next !== activeToken) {
      var continuing = sameSessionIdentity(activeToken, next);
      ++generation; activeToken = next; loading = null;
      if (!continuing) {
        items = []; unreadCount = 0; loadedAt = 0;
        failed = false; diagnosticReport = null; autoAttempted = Object.create(null); close();
      }
      // A short-lived v3 access-token rotation must not close an important
      // acknowledgment dialog or clear its unread count. Old RPC responses
      // remain rejected by generation, and unfinished reads retry safely.
      else if (failed || !loadedAt) loadedAt = 0;
    }
    if (!badge || !badge.isConnected) {
      style();
      badge = document.createElement('button');
      badge.type = 'button'; badge.id = 'izAnnouncementBadge'; badge.className = 'iz-header-btn';
      badge.onclick = open;
    }
    // AI credits stay before Help. Announcements belong immediately after
    // Help and immediately before the language toggle on the second row.
    var help = document.getElementById('izHeaderHelp');
    var lang = document.getElementById('izHeaderLang');
    if (help && lang && help.parentNode === actions && lang.parentNode === actions &&
        (badge.parentNode !== actions || badge.previousElementSibling !== help || badge.nextElementSibling !== lang)) {
      actions.insertBefore(badge, lang);
    }
    badgeUpdate();
    load(false);
  }
  function translate() { badgeUpdate(); if (overlay) paint(); }
  window.IZAnnouncements = { sync: sync, open: open, refresh: function () { return load(true); }, translate: translate };
  // Regional settings may arrive after the announcement dialog first opens.
  // Repaint dates once the authoritative store timezone is available.
  window.addEventListener('iz:regional-settings', function () { if (overlay) paint(); });
  sync();
})();
