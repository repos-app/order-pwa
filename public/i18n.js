// 共通 i18n 部品：全ページ共通のEN/JP切替。
// 使い方:
//   <script src="./i18n.js"></script> を読み込み、
//   ヘッダに <button data-tlang onclick="I18n.toggle()">EN</button> を置く。
//   翻訳したい要素に data-t="key"（テキスト）/ data-tph="key"（placeholder）を付ける。
//   注意書きなど、辞書の値に<br>や<a>を含めてHTMLとして描画したい要素だけは、data-t="key"の
//   代わりに data-t-html="key" を使う（textContentではなくinnerHTMLで描画される。値は各画面の
//   <script>内に直書きした固定文言のみを想定しており、ユーザー入力や外部データを流し込まない
//   こと＝XSS対策としてdata-tがtextContentである原則は崩さない）。
//   I18n.init({ ja:{key:'日本語'}, en:{key:'English'} }, function(lang){ /* 動的部分を再描画 */ });
//   動的文字列は I18n.t('key') で取得（t().key スタイルで多用する画面は I18n.d() で辞書全体を取得してもよい）。
// Language precedence: explicit user selection > store default cache > device language.
// Only a user-triggered language switch writes localStorage.lang; automatic detection stays transient.
// langSource='manual' distinguishes an explicit choice from legacy auto-seeded lang values.
(function () {
  var DICT = {}, cb = null;
  function explicitLang() { try { if (localStorage.getItem('langSource') !== 'manual') return null; var v = localStorage.getItem('lang'); return (v === 'en' || v === 'ja') ? v : null; } catch (e) { return null; } }
  function cachedDefault() { try { var v = localStorage.getItem('langDefaultCache'); return (v === 'en' || v === 'ja') ? v : null; } catch (e) { return null; } }
  function deviceLang() { try { var a=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language; return String(a||'').toLowerCase().indexOf('ja')===0?'ja':'en'; } catch (e) { return 'en'; } }

  function lang() { return explicitLang() || cachedDefault() || deviceLang(); }
  function apply() {
    var l = lang(), d = DICT[l] || {};
    document.querySelectorAll('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); if (d[k] != null) el.textContent = d[k]; });
    // ★2026-08-23: data-t-html（固定文言の<br>/<a>等をHTMLとして描画する用途のみ）を追加。
    document.querySelectorAll('[data-t-html]').forEach(function (el) { var k = el.getAttribute('data-t-html'); if (d[k] != null) el.innerHTML = d[k]; });
    document.querySelectorAll('[data-tph]').forEach(function (el) { var k = el.getAttribute('data-tph'); if (d[k] != null) el.setAttribute('placeholder', d[k]); });
    document.querySelectorAll('[data-tlang]').forEach(function (el) { el.textContent = (l === 'ja' ? 'EN' : '日本語'); });
    document.documentElement.lang = l;
    if (cb) try { cb(l); } catch (e) {}
  }
  function cacheDefaultLang(value) {
    var def = value === 'ja' ? 'ja' : 'en', cur = cachedDefault();
    try { localStorage.setItem('langDefaultCache', def); } catch (e) {}
    if (!explicitLang() && def !== cur) apply();
  }
  window.I18n = {
    init: function (dict, onChange) { DICT = dict || {}; cb = onChange || null; apply(); fetchDefaultLang(); },
    toggle: function () { try { localStorage.setItem('lang', lang() === 'ja' ? 'en' : 'ja'); localStorage.setItem('langSource', 'manual'); } catch (e) {} apply(); },
    setDefaultLang: cacheDefaultLang,
    lang: lang,
    t: function (k) { var d = DICT[lang()] || {}; return d[k] != null ? d[k] : k; },
    // 現在言語の辞書オブジェクト全体を返す（t(key)ではなく t().key スタイルで多数参照する画面向け）。
    d: function () { return DICT[lang()] || {}; }
  };

  // 店舗設定の「既定言語」をバックグラウンドで取得し、ユーザーが手動切替していない場合のみ反映する。
  // 取得完了まではキャッシュ値（無ければ英語）で表示し、完了後に差分があれば再描画する。
  function fetchDefaultLang() {
    try {
      if (typeof window === 'undefined' || !window.APP_CONFIG || !window.APP_CONFIG.API_URL) return;
      var storeId = String(window.APP_CONFIG.STORE_ID || '').trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{2,31}$/.test(storeId)) return;
      fetch(window.APP_CONFIG.API_URL + '?api=1', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getSettings', storeId: storeId }),
        redirect: 'follow'
      }).then(function (res) { return res.json(); }).then(function (json) {
        var d = (json && json.ok && json.data) || {};
        cacheDefaultLang(d.defaultLang);
      }).catch(function () {});
    } catch (e) {}
  }

  // 入力欄でEnter→そのブロックの主ボタンを実行（フォーム未使用のため共通で補う）。
  // api.js と i18n.js の両方に同じ処理を置くが、フラグで二重バインドを防止。
  bindEnter();
  function bindEnter() {
    if (typeof window === 'undefined' || window.__izEnterBound) return;
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
