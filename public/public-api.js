(function () {
  'use strict';

  var CFG = window.APP_CONFIG || {};
  var API = {};
  var TABLE_SESSION_ACTIONS = {
    submitOrder:1, getOrdersByTable:1, getTableCheckoutStamp:1,
    setTablePartySize:1, getTablePartySize:1, callStaff:1, submitFeedback:1
  };
  var TIMEOUT_MS = { fast:4500, read:8000, default:30000, write:30000 };
  API.TIMEOUT_MS = TIMEOUT_MS;
  function isReadOnly(action) { return /^(?:get|check|list|count|fetch|bootstrap|validate)/i.test(String(action || '')); }

  function validStoreId(value) {
    return /^[a-z0-9][a-z0-9-]{2,31}$/.test(String(value || ''));
  }
  function tableTokenFromUrl() {
    try { return new URLSearchParams(location.search).get('t') || ''; }
    catch (_) { return ''; }
  }
  function configReady() {
    return CFG.AUTH_SCHEMA_VERSION === 2 &&
      validStoreId(CFG.STORE_ID) &&
      /^https:\/\//i.test(String(CFG.API_URL || '')) &&
      !!CFG.STORAGE_PREFIX &&
      !!CFG.OFFLINE_DB_NAME;
  }
  API.publicStoreId = function () { return validStoreId(CFG.STORE_ID) ? CFG.STORE_ID : ''; };
  API.imageUrl = function (value) {
    var v = String(value || '');
    return /^https:\/\//i.test(v) ? v : '';
  };
  API.userErrorText = function (error, fallback) {
    var raw = String(error && error.message || error || '').trim();
    var en = true;
    try { en = !(window.I18n && typeof window.I18n.lang === 'function') || window.I18n.lang() === 'en'; } catch (_) {}
    var generic = fallback || (en ? 'The operation could not be completed. Please try again.' : '処理を完了できませんでした。もう一度お試しください。');
    var network = en ? 'Could not connect to the server. Please check your connection and try again.' : 'サーバーに接続できませんでした。通信状況を確認して、もう一度お試しください。';
    var code = raw.toLowerCase();
    if (!raw) return generic;
    if (code === 'invalid_table_session') return en ? 'This table link is no longer valid. Please scan the QR code again.' : 'この席のリンクは無効になっています。QRコードをもう一度読み取ってください。';
    if (code === 'invalid_store_link' || code === 'store_not_found') return en ? 'This store link is not valid.' : 'この店舗リンクは無効です。';
    if (code === 'rate_limited') return en ? 'Too many attempts were made. Please wait a while and try again.' : '操作回数が多すぎます。しばらく待ってからもう一度お試しください。';
    if (code === 'coupon_unavailable') return en
      ? 'This coupon is no longer available. Please remove it or choose another coupon, then submit the order again.'
      : 'このクーポンは現在ご利用いただけません。クーポンを外すか別のクーポンを選び、もう一度注文してください。';
    if (/^(?:http_\d+|api_error|internal_error|save_failed|request_failed)$/.test(code)) return generic;
    if (/failed to fetch|networkerror|aborterror|fetch is aborted|\baborted\b|timeout/i.test(raw)) return network;
    if (/d1_error|sqlite|constraint|primary\s*key|foreign\s*key|sql\b|typeerror|referenceerror|syntaxerror|stack|\bat\s+[^\s]+\s*\(/i.test(raw)) return generic;
    if (/[ぁ-んァ-ヶ一-龠]/.test(raw)) return raw;
    if (/\s/.test(raw) && !/^[A-Za-z]+(?:Error|Exception)\b/.test(raw)) return raw;
    return generic;
  };

  async function fetchOnce(body, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || TIMEOUT_MS.default) : null;
    try {
      var res = await fetch(String(CFG.API_URL || '') + '?api=1', {
        method:'POST',
        headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body:body,
        signal:ctrl ? ctrl.signal : undefined
      });
      var json;
      try { json = await res.json(); }
      catch (_) { throw new Error('invalid_server_response'); }
      if (!res.ok && (!json || json.ok !== false)) throw new Error('http_' + res.status);
      return json;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  API.post = async function (action, payload) {
    if (!configReady()) throw new Error('invalid_store_link');
    payload = payload || {};
    var timeoutMs = typeof payload.__timeoutMs === 'number' ? payload.__timeoutMs : (isReadOnly(action) ? TIMEOUT_MS.read : TIMEOUT_MS.default);
    var send = Object.assign({}, payload);
    delete send.__silent; delete send.__msg; delete send.__timeoutMs; delete send.__noInternalRetry;
    send.storeId = CFG.STORE_ID;
    if (TABLE_SESSION_ACTIONS[action] && !send.tableToken) send.tableToken = tableTokenFromUrl();
    var json = await fetchOnce(JSON.stringify(Object.assign({ action:action }, send)), timeoutMs);
    if (!json || json.ok === false) {
      var err = new Error(json && json.error || 'api_error');
      err.__server = true;
      throw err;
    }
    return json;
  };

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!configReady()) { reject(new Error('invalid_store_link')); return; }
      var r = indexedDB.open(CFG.OFFLINE_DB_NAME, 1);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath:'id' });
      };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }
  function tx(store, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode), s = t.objectStore(store), out = fn(s);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }
  API.queuePut = function (rec) { return tx('outbox', 'readwrite', function (s) { return s.put(rec); }); };
  API.queueDel = function (id) { return tx('outbox', 'readwrite', function (s) { return s.delete(id); }); };
  API.queueAll = function () {
    return tx('outbox', 'readonly', function (s) {
      return new Promise(function (resolve) {
        var items = [];
        s.openCursor().onsuccess = function (e) {
          var cur = e.target.result;
          if (cur) { items.push(cur.value); cur.continue(); }
          else resolve(items);
        };
      });
    });
  };

  function queueRecord(order) {
    return {
      id:order.clientId,
      storeId:CFG.STORE_ID,
      tableToken:tableTokenFromUrl(),
      order:order,
      ts:Date.now(),
      attempts:0
    };
  }

  API.submitOrder = async function (order) {
    if (!order.clientId) order.clientId = 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    var rec = queueRecord(order);
    if (!rec.tableToken) return 'rejected:invalid_table_session';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      await API.queuePut(rec);
      return 'queued';
    }
    try {
      var res = await API.post('submitOrder', {
        order:order, tableToken:rec.tableToken, __timeoutMs:TIMEOUT_MS.write
      });
      var d = res && res.data;
      if (d === 'Locked, please retry') { await API.queuePut(rec); return 'queued'; }
      if (d && d !== 'OK') return 'rejected:' + ((typeof d === 'object' && d.error) ? d.error : d);
      return 'sent';
    } catch (err) {
      if (err && err.__server) return 'rejected:' + (err.message || 'api_error');
      await API.queuePut(rec);
      return 'queued';
    }
  };

  API.flush = async function () {
    var pending = await API.queueAll(), sent = 0, dropped = 0, quarantined = 0;
    for (var i = 0; i < pending.length; i++) {
      var rec = pending[i];
      if (rec.blocked) { quarantined++; continue; }
      if (rec.storeId !== CFG.STORE_ID || !rec.tableToken) {
        rec.blocked = true; rec.lastError = 'invalid_queue_context'; await API.queuePut(rec); quarantined++; continue;
      }
      try {
        var res = await API.post('submitOrder', {
          order:rec.order, tableToken:rec.tableToken, __timeoutMs:TIMEOUT_MS.write
        });
        var d = res && res.data;
        if (d === 'Locked, please retry') { rec.attempts=(rec.attempts||0)+1; await API.queuePut(rec); continue; }
        if (d && d !== 'OK') { rec.attempts=(rec.attempts||0)+1; rec.blocked=true; rec.lastError=String((typeof d === 'object' && d.error) ? d.error : d); await API.queuePut(rec); quarantined++; continue; }
        await API.queueDel(rec.id); sent++;
      } catch (err) {
        if (err && err.__server) {
          rec.attempts = (rec.attempts || 0) + 1;
          rec.blocked = true;
          rec.lastError = String(err.message || err || 'server_error');
          await API.queuePut(rec); quarantined++;
          continue;
        }
        break;
      }
    }
    var status = await API.pendingStatus();
    return { sent:sent, dropped:dropped, remaining:status.sendable, quarantined:quarantined, attention:status.attention };
  };
  API.pendingCount = async function () { return (await API.pendingStatus()).sendable; };
  API.pendingStatus = async function () {
    var all=await API.queueAll(), sendable=0, attention=0;
    all.forEach(function(rec){
      if (!rec || rec.storeId !== CFG.STORE_ID) return;
      if (rec.blocked || !rec.tableToken) attention++;
      else sendable++;
    });
    return { sendable:sendable, attention:attention };
  };

  window.API = API;
})();
