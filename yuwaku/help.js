/* help.js — 画面ヘルプ（使い方説明）共通コンポーネント
 * 2026-08-25追加。各画面から以下のように呼び出すだけで、右下に「？」ボタンと
 * 使い方モーダルが自動的に表示される。マニュアルが無いユーザー向けに、各画面で
 * 「何ができるか」を一目で確認できるようにするためのもの。
 *
 * 使い方（各HTMLのbody末尾、他のscriptの後に追加）:
 *   <script src="./help.js"></script>
 *   <script>
 *     HelpUI.register({
 *       title: '画面名',
 *       titleEn: 'Screen name',
 *       items: [
 *         { ja: '① ◯◯の説明', en: '① Description of...' },
 *         ...
 *       ]
 *     });
 *   </script>
 *
 * 言語切替: window.I18n（i18n.js）が読み込まれていれば I18n.lang() を見てja/enを
 * 自動選択する。無ければ navigator.language から判定。ボタン自体は言語に依らず
 * 「？」固定表示（アイコンなので翻訳不要）。
 */
(function () {
  'use strict';

  function currentLang() {
    try {
      if (window.I18n && typeof window.I18n.lang === 'function') return window.I18n.lang();
      if (window.I18n && window.I18n.current) return window.I18n.current;
    } catch (e) {}
    try {
      var saved = localStorage.getItem('lang') || localStorage.getItem('izlang');
      if (saved) return saved;
    } catch (e) {}
    var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;
    return String(first||'').toLowerCase().indexOf('ja') === 0 ? 'ja' : 'en';
  }

  function injectStyles() {
    if (document.getElementById('helpUiStyles')) return;
    var css = ''
      + '.helpFab{position:fixed;right:max(16px,env(safe-area-inset-right));'
      + 'bottom:max(var(--help-fab-bottom,16px),env(safe-area-inset-bottom));z-index:9999;width:46px;height:46px;border-radius:50%;'
      + 'background:#0f172a;color:#fff;border:0;font-size:20px;font-weight:900;cursor:pointer;'
      + 'box-shadow:0 6px 18px rgba(15,23,42,.35);display:flex;align-items:center;justify-content:center;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}'
      + '.helpFab:active{transform:scale(.94);}'
      + '.helpOverlay{position:fixed;inset:0;z-index:2147483050;background:rgba(15,23,42,.5);'
      + 'display:none;align-items:flex-end;justify-content:center;}'
      + '.helpOverlay.on{display:flex;}'
      + '@media(min-width:640px){.helpOverlay{align-items:center;}}'
      + '.helpSheet{background:#fff;color:#0f172a;width:100%;max-width:480px;max-height:82vh;overflow-y:auto;'
      + 'border-radius:18px 18px 0 0;padding:20px 20px 26px;box-shadow:0 -8px 30px rgba(0,0,0,.2);'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans JP",sans-serif;}'
      + '@media(min-width:640px){.helpSheet{border-radius:18px;max-height:78vh;}}'
      + '.helpSheet h3{margin:0 0 4px;font-size:18px;font-weight:900;display:flex;align-items:center;gap:8px;}'
      + '.helpSheet .helpSub{color:#667085;font-size:12.5px;margin:0 0 16px;}'
      + '.helpSheet .helpItem{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #eef1f5;font-size:14px;line-height:1.6;}'
      + '.helpSheet .helpItem:last-child{border-bottom:0;}'
      + '.helpClose{position:absolute;top:14px;right:16px;background:#f1f5f9;border:0;border-radius:50%;'
      + 'width:30px;height:30px;font-size:15px;font-weight:900;color:#64748b;cursor:pointer;}'
      + '.helpSheetWrap{position:relative;}';
    var st = document.createElement('style');
    st.id = 'helpUiStyles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildOverlay(cfg) {
    var overlay = document.createElement('div');
    overlay.className = 'helpOverlay';
    overlay.id = 'helpOverlay';

    var wrap = document.createElement('div');
    wrap.className = 'helpSheetWrap';

    var sheet = document.createElement('div');
    sheet.className = 'helpSheet';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'helpClose';
    closeBtn.textContent = '×';
    closeBtn.onclick = function () { overlay.classList.remove('on'); };

    var h3 = document.createElement('h3');

    var sub = document.createElement('p');
    sub.className = 'helpSub';

    sheet.appendChild(closeBtn);
    sheet.appendChild(h3);
    sheet.appendChild(sub);

    function renderLanguage() {
      var isEn = currentLang() === 'en';
      closeBtn.setAttribute('aria-label', isEn ? 'Close' : '閉じる');
      h3.textContent = '❓ ' + (isEn && cfg.titleEn ? cfg.titleEn : cfg.title);
      sub.textContent = isEn ? 'What you can do on this screen' : 'この画面でできること';
      Array.prototype.forEach.call(sheet.querySelectorAll('.helpItem'), function (row) { row.remove(); });
      (cfg.items || []).forEach(function (it) {
        var row = document.createElement('div');
        row.className = 'helpItem';
        row.textContent = (isEn && it.en) ? it.en : it.ja;
        sheet.appendChild(row);
      });
    }

    renderLanguage();
    overlay._helpRefreshLanguage = renderLanguage;

    wrap.appendChild(sheet);
    overlay.appendChild(wrap);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.classList.remove('on');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') overlay.classList.remove('on');
    });
    return overlay;
  }

  // 下部固定バー（注文・カート等）が右下を占有する画面では、その直上へ退避する。
  // 全画面モーダルは対象外とし、高さが画面の40%以下の「操作バー」だけを判定する。
  function positionFab(fab) {
    var baseBottom = 16;
    var gap = 12;
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    var viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    var fabRect = fab.getBoundingClientRect();
    var fabLeft = fabRect.left || (viewportWidth - 16 - 46);
    var maxBarHeight = Math.min(220, viewportHeight * 0.4);
    var bottom = baseBottom;

    Array.prototype.forEach.call(document.querySelectorAll('body *'), function (el) {
      if (el === fab || el.getAttribute('data-help-fab-ignore') === 'true' || el.closest('.helpOverlay')) return;
      var style = window.getComputedStyle(el);
      if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return;

      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.height > maxBarHeight) return;
      var touchesBottom = rect.bottom >= viewportHeight - 2;
      var overlapsFabColumn = rect.right > fabLeft && rect.left < viewportWidth - 16;
      if (touchesBottom && overlapsFabColumn) {
        bottom = Math.max(bottom, Math.ceil(viewportHeight - rect.top + gap));
      }
    });

    fab.style.setProperty('--help-fab-bottom', bottom + 'px');
  }

  function keepFabClear(fab) {
    var frame = 0;
    function schedule() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        positionFab(fab);
      });
    }
    schedule();
    window.addEventListener('load', schedule, { once: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
  }

  window.HelpUI = {
    register: function (cfg) {
      if (!cfg || !cfg.title) return;
      injectStyles();
      var overlay = buildOverlay(cfg);
      document.body.appendChild(overlay);

      function openHelp() {
        overlay._helpRefreshLanguage();
        overlay.classList.add('on');
      }
      function attachHeaderHelp() {
        var btn = document.getElementById('izHeaderHelp');
        if (!btn) return false;
        btn.className = 'iz-header-btn';
        btn.textContent = '❓';
        btn.title = currentLang() === 'en' ? 'Help' : 'ヘルプ';
        btn.setAttribute('aria-label', btn.title);
        btn.removeAttribute('aria-hidden'); btn.style.visibility = 'visible';
        btn.disabled = false; btn.onclick = openHelp;
        return true;
      }
      if (!attachHeaderHelp()) {
        var tries = 0;
        var timer = setInterval(function () {
          tries++;
          if (attachHeaderHelp() || tries >= 40) clearInterval(timer);
        }, 50);
      }
    }
  };
})();
