// One shared, authenticated announcement center for Web/PWA/Native management pages.
// Read and first-auto-display state are authoritative on the tenant API, not localStorage.
(function () {
  'use strict';
  if (window.IZAnnouncements) return;
  var activeToken = '', generation = 0, loadedAt = 0, loading = null;
  var items = [], unreadCount = 0, failed = false, badge = null, overlay = null;
  var confirmedReads = Object.create(null), readFailures = Object.create(null);
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
      '#izAnnouncementDialog .iz-ann-top{display:flex;justify-content:space-between;gap:8px;align-items:center;' +
      'position:sticky;top:0;z-index:1;background:#fff;padding:3px 0}' +
      '#izAnnouncementDialog .iz-ann-top h2{min-width:0}' +
      '#izAnnouncementDialog .iz-ann-top-controls{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex-shrink:0}' +
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
      '#izAnnouncementDialog #izAnnouncementDiagnosticStatus{margin:0 0 8px;overflow-wrap:anywhere}' +
      '#izAnnouncementDialog #izAnnouncementDiagnosticStatus:empty{display:none}' +
      '#izAnnouncementDialog button.iz-ann-action{border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;' +
      'color:#0f172a;min-height:44px;padding:8px 12px;cursor:pointer;font:700 14px/1.2 inherit}' +
      '#izAnnouncementDialog button.iz-ann-primary{background:#0f172a;color:#fff;border-color:#0f172a}' +
      '#izAnnouncementDialog button.iz-ann-send{background:#0369a1;color:#fff;border-color:#0369a1;' +
      'font-size:13px;font-weight:700;white-space:nowrap;padding:8px 10px}' +
      '#izAnnouncementDialog button.iz-ann-send:disabled{opacity:.65;cursor:wait}' +
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
  // The catalog intentionally preserves every pushed commit and its own read
  // receipt. Only its presentation is collapsed. An explicitly tagged release
  // is never merged with another version; legacy notes without version metadata
  // form a separately labelled, unversioned history group.
  function releaseGroupKey(item) {
    if (!item || item.severity !== 'normal') return '';
    var ja = String(item.titleJa || '').trim();
    var en = String(item.titleEn || '').trim();
    var match = /^izakanpai(?:\s+(v?\d+(?:\.\d+){1,3}))?\s+更新内容$/i.exec(ja);
    if (!match && !/^izakanpai(?:\s+v?\d+(?:\.\d+){1,3})?\s+update notes$/i.test(en)) return '';
    var titleVersion = match && match[1] ||
      /^izakanpai\s+(v?\d+(?:\.\d+){1,3})\s+update notes$/i.exec(en)?.[1];
    var explicitVersion = String(item.releaseVersion || titleVersion || '').trim();
    return 'izakanpai-release:' + (explicitVersion ? explicitVersion.replace(/^v/i, '') : 'unversioned');
  }
  function groupedItems() {
    var groups = Object.create(null), display = [];
    items.forEach(function (item) {
      var key = releaseGroupKey(item);
      if (!key) { display.push(item); return; }
      if (!groups[key]) {
        groups[key] = {id:item.id, severity:'normal', titleJa:item.titleJa,
          titleEn:item.titleEn, publishedAt:item.publishedAt,
          releaseVersion:key.endsWith(':unversioned') ? '' : key.slice('izakanpai-release:'.length),
          members:[]};
        display.push(groups[key]);
      }
      groups[key].members.push(item);
    });
    return display.map(function (entry) {
      if (!entry.members) return entry;
      if (entry.members.length === 1) return entry.members[0];
      entry.readAt = entry.members.some(function (item) { return !item.readAt; }) ? null : entry.members[0].readAt;
      return entry;
    });
  }
  function countUnreadGroups() {
    return groupedItems().filter(function (item) { return !item.readAt; }).length;
  }
  function displayTitle(item) {
    var title = localized(item, 'title');
    return item.members ? title + ' (' + item.members.length + t('件', ' updates') + ')' : title;
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
    // The upload still belongs to this WebView until the server ACK arrives.
    // Do not let Escape, backdrop or Close silently abandon its progress.
    if (diagnosticReport && diagnosticReport.state === 'sending') return;
    if (overlay) { overlay.remove(); overlay = null; }
    forced = false;
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    previousFocus = null;
  }
  function setRead(item) {
    if (item && item.members) return Promise.all(item.members.map(setRead));
    if (!item || item.readAt || !activeToken) return Promise.resolve();
    if (item.__readPending) return item.__readPending;
    var session = activeToken;
    item.__readPending = rpc('markAnnouncementRead', [item.id], session).then(function (receipt) {
      // The tenant write must actually be acknowledged. A rotated v3 access
      // token is the same employee/store session, not a reason to lose the ACK.
      if (!receipt || !receipt.readAt) throw new Error('announcement_read_unconfirmed');
      if (!activeToken || (session !== activeToken && !sameSessionIdentity(session, activeToken))) return;
      confirmedReads[item.id] = receipt.readAt;
      delete readFailures[item.id];
      item.readAt = receipt.readAt;
      items.forEach(function (current) {
        if (current.id === item.id) current.readAt = receipt.readAt;
      });
      unreadCount = countUnreadGroups();
      badgeUpdate();
      if (overlay) paint();
    }).catch(function () {
      if (!activeToken || (session !== activeToken && !sameSessionIdentity(session, activeToken))) return;
      readFailures[item.id] = true;
      if (overlay) paint();
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
    if (!forced) {
      // Opening a manual notice already starts its read receipt in the background.
      // Navigation must never depend on the tenant RPC responding (especially
      // when a grouped release contains several pending read receipts).
      mode = 'list'; selectedId = ''; paint();
      return;
    }
    var item = groupedItems().find(function (x) { return String(x.id) === String(selectedId); });
    // An automatically displayed important notice requires an acknowledged read
    // before closing; it is intentionally different from manual Back to list.
    Promise.resolve(setRead(item)).finally(function () { close(); autoNext(); });
  }
  function sendDiagnostics() {
    if (diagnosticReport && diagnosticReport.state === 'sending') return;
    var session = activeToken;
    var store = window.API && typeof API.currentStoreId === 'function' ? API.currentStoreId() : '';
    diagnosticReport = {state:'sending'};
    paint();
    Promise.resolve().then(function () {
      if (!window.API || typeof API.sendDiagnosticsNow !== 'function' ||
          typeof API.runForegroundTask !== 'function')
        throw new Error('diagnostic_unavailable');
      return API.runForegroundTask('diagnostic-upload', function (task) {
        return API.sendDiagnosticsNow({onProgress:function (progress) {
          task.progress(progress.completed,progress.total);
        }});
      },{message:t('診断ログを送信中…','Uploading diagnostic logs…')});
    }).then(function (receipt) {
      if ((session !== activeToken && !sameSessionIdentity(session, activeToken)) ||
          !window.API || API.currentStoreId() !== store) return;
      if (!receipt || receipt.ok !== true || !/^[a-zA-Z0-9_-]{8,64}$/.test(String(receipt.eventId)))
        throw new Error('diagnostic_send_unconfirmed');
      diagnosticReport = {state:'confirmed',id:receipt.eventId,
        pending:Number.isInteger(receipt.pendingCount) ? receipt.pendingCount : null,
        total:Number.isInteger(receipt.totalCount) ? receipt.totalCount : null,
        resent:Number.isInteger(receipt.resentCount) ? receipt.resentCount : null,
        partial:Number(receipt.failedCount)>0 || receipt.incomplete===true,
        reason:['http_401','http_403','http_429','session_changed'].includes(receipt.stopReason)
          ? receipt.stopReason : ''};
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
    var topControls = add(top, 'div', null, 'iz-ann-top-controls');
    var sendButton = button(topControls, diagnosticReport && diagnosticReport.state === 'sending'
      ? t('送信中…', 'Sending…') : t('ログ送信', 'Send logs'), sendDiagnostics);
    sendButton.classList.add('iz-ann-send');
    sendButton.id = 'izAnnouncementSendDiagnostics';
    sendButton.disabled = !!diagnosticReport && diagnosticReport.state === 'sending';
    sendButton.setAttribute('aria-label', t('診断ログを送信', 'Send diagnostic logs'));
    sendButton.title = t('端末のログを送信・再送（送信済みログも削除しません）',
      'Send or resend device logs (sent logs are not deleted)');
    // First-show important notices require explicit acknowledgement. Never
    // expose an X, backdrop click or Escape as an accidental bypass.
    if (!forced && !(diagnosticReport && diagnosticReport.state === 'sending'))
      button(topControls, '×', close).setAttribute('aria-label', t('閉じる', 'Close'));
    add(dialog, 'p', t('アプリバージョン: ', 'App version: ') + version() + ' · ' +
      t('未読 ', 'Unread ') + unreadCount, 'iz-ann-muted');
    var status = add(dialog, 'p', '', 'iz-ann-muted');
    status.id = 'izAnnouncementDiagnosticStatus';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (diagnosticReport && diagnosticReport.state === 'sending') {
      status.textContent = t('サーバーからの保存確認を待っています…', 'Waiting for the server save acknowledgement…');
    } else if (diagnosticReport && diagnosticReport.state === 'confirmed') {
      status.textContent = (diagnosticReport.partial && diagnosticReport.total > 0 && diagnosticReport.resent === 0
        ? t('診断接続は確認済みですが、対象ログの保存確認は0件です。確認ID: ',
          'Diagnostic connection confirmed, but no retained logs were acknowledged. Event ID: ')
        : diagnosticReport.partial
        ? t('一部のサーバー保存を確認済み。確認ID: ', 'Some logs saved on server. Event ID: ')
        : t('サーバー保存確認済み。確認ID: ', 'Server save confirmed. Event ID: ')) +
        diagnosticReport.id + (diagnosticReport.total == null ? '' :
          ' · ' + t('ログ再送確認: ', 'Logs re-upload confirmed: ') +
          diagnosticReport.resent + '/' + diagnosticReport.total) +
        (diagnosticReport.partial && diagnosticReport.pending
          ? ' · ' + t('一部未確認（再送可能）: ', 'Unconfirmed (can retry): ') + diagnosticReport.pending
          : '') +
        (diagnosticReport.reason === 'http_429'
          ? ' · ' + t('直近24時間のログ受信上限です。時間を置いて再送してください。',
            'The rolling 24-hour log limit was reached. Retry later.')
          : ['http_401','http_403','session_changed'].includes(diagnosticReport.reason)
          ? ' · ' + t('認証または店舗が切り替わりました。ログインを確認して再送してください。',
            'The session or store changed. Verify sign-in and resend.')
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
    // Show the observability pipeline's own durable health, not just the last
    // manual upload result. A locally recorded error is NOT a server ACK.
    try {
      var delivery = window.API && typeof API.getDiagnosticDeliveryStatus === 'function'
        ? API.getDiagnosticDeliveryStatus() : null;
      if (delivery && Number.isInteger(delivery.pendingCount)) {
        var pending = Math.max(0, delivery.pendingCount);
        var deliveryText = pending
          ? t('診断ログのサーバー保存待ち: ', 'Diagnostic logs awaiting server ACK: ') + pending
          : delivery.lastAckAt
          ? t('診断ログ送信: 最終保存確認あり', 'Diagnostic delivery: latest ACK confirmed')
          : t('診断ログ送信: まだ保存確認なし', 'Diagnostic delivery: no server ACK yet');
        if (pending && delivery.lastFailureCode && delivery.lastFailureCode !== 'none') {
          var deliveryCode = /^(?:http_[45][0-9]{2}|client_timeout|client_transport_failure|diagnostic_rate_limited|diagnostic_rejected|diagnostic_session_pending)$/
            .test(String(delivery.lastFailureCode)) ? delivery.lastFailureCode : 'unconfirmed';
          deliveryText += ' · ' + t('直近送信エラー: ', 'Last upload error: ') + deliveryCode;
        }
        add(dialog, 'p', deliveryText, 'iz-ann-muted').id = 'izAnnouncementDiagnosticDelivery';
      }
    } catch (_) { /* Observability must never prevent a user from reading notices. */ }
    if (mode === 'detail') {
      var item = groupedItems().find(function (x) { return String(x.id) === String(selectedId); });
      if (item) {
        add(dialog, 'p', item.severity === 'important' ? t('重要なお知らせ', 'Important notice') : t('通常のお知らせ', 'General notice'),
          'iz-ann-type' + (item.severity !== 'important' ? ' iz-ann-normal' : ''));
        add(dialog, 'h3', displayTitle(item));
        if (item.members) {
          add(dialog, 'p', item.releaseVersion ?
            t('リリース v', 'Release v') + item.releaseVersion :
            t('バージョン未記録の更新履歴', 'Update history without recorded version'), 'iz-ann-muted');
          var distinct = Object.create(null);
          item.members.forEach(function (member) {
            var content = localized(member, 'body');
            // Duplicate bodies do not become duplicate paragraphs in the rollup.
            if (distinct[content]) return;
            distinct[content] = true;
            add(dialog, 'p', dateLabel(member.publishedAt), 'iz-ann-muted');
            add(dialog, 'div', content, 'iz-ann-body');
          });
        } else {
          add(dialog, 'p', dateLabel(item.publishedAt), 'iz-ann-muted');
          add(dialog, 'div', localized(item, 'body'), 'iz-ann-body');
        }
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
    var visible = groupedItems().filter(function (x) { return filter === 'all' || filter === x.severity; });
    if (!visible.length && !failed) add(list, 'p', t('お知らせはありません。', 'There are no announcements.'), 'iz-ann-muted');
    visible.forEach(function (item) {
      var row = button(list, '', function () { openDetail(item.id, false); });
      row.className = 'iz-ann-row';
      row.textContent = '';
      row.setAttribute('aria-label', (item.readAt ? 'Read' : 'Unread') + ' ' + displayTitle(item));
      add(row, 'span', item.severity === 'important' ? t('重要', 'Important') : t('通常', 'General'),
        'iz-ann-type' + (item.severity !== 'important' ? ' iz-ann-normal' : ''));
      add(row, 'strong', (item.readAt ? '' : '● ') + displayTitle(item));
      if (readFailures[item.id] && !item.readAt)
        add(row, 'span', t('既読の保存に失敗。タップして再試行', 'Read status not saved. Tap to retry'), 'iz-ann-muted');
      add(row, 'span', dateLabel(item.publishedAt), 'iz-ann-muted');
    });
    var actions = add(dialog, 'div', null, 'iz-ann-actions');
    button(actions, t('最新情報を取得', 'Refresh'), function () { load(true); });
    if (!(diagnosticReport && diagnosticReport.state === 'sending'))
      button(actions, t('閉じる', 'Close'), close, true);
  }
  function openDetail(id, isForced) {
    mode = 'detail'; selectedId = id; forced = !!isForced;
    if (!overlay) openOverlay();
    paint();
    // An intentionally opened item is read immediately, independent of Back/Close.
    // Automatically presented important notices require explicit acknowledgement.
    if (!isForced) setRead(groupedItems().find(function (x) { return String(x.id) === String(id); }));
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
      items = payload.announcements;
      items.forEach(function (item) {
        if (confirmedReads[item.id]) item.readAt = confirmedReads[item.id];
      });
      unreadCount = countUnreadGroups();
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
      confirmedReads = Object.create(null); readFailures = Object.create(null);
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
        confirmedReads = Object.create(null); readFailures = Object.create(null);
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
