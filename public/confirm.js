// 確認ダイアログ・通知ダイアログの共通部品（2026-08-25新規作成）。
//
// ★背景: docs/yuwaku配下の各画面が、ブラウザ標準の confirm()/alert() をそれぞれ個別に
// 呼んでいた。これらはページのJS実行を止めてブラウザ本体が描く特殊なUIを出すため、
// 通常のDOM要素として画面に存在せず、GPT等の自動テストツールが要素として認識・操作できない
// （＝自動テストが途中で止まってしまう）という問題があった。この共通部品は、見た目だけ
// confirm()/alert()を模した「普通のHTML要素で作られたモーダル」をその場で組み立てて表示する
// ことで、この問題を解消する。DOM要素なので、どんな自動テストツールでも要素として見えて
// クリックできる。
//
// ★使い方（各画面はこのファイルを読み込んだ上で、以下のように書き換えるだけでよい）:
//   旧: if (!confirm('削除しますか？')) return; ...続きの処理...
//   新: UIConfirm('削除しますか？').then(function(ok){
//         if (!ok) return;
//         ...続きの処理...
//       });
//
//   旧: alert('保存しました');
//   新: UIAlert('保存しました');
//   （UIAlertは戻り値のPromiseを待たなくても、呼んだ時点でダイアログは表示される。
//     alert()と違い後続のJSをブロックしないため、alert()の直後に続きの処理がある
//     コードが元々無いことを確認した上で単純に置き換えればよい）
//
// ★このファイル自体は「共通部品」であることが目的のため、各画面側にモーダル用のHTML/CSSを
// 一切書かなくてよいように、必要なDOM・CSSはこのスクリプトが初回呼び出し時に自動で
// <body>末尾へ追加する（各画面の既存レイアウトに影響しない）。見た目は各画面が個別に
// 定義しているCSS変数（--navy等、画面ごとに名前や値が微妙に異なる）には依存せず、
// このファイル内で完結した固定スタイルを使う（どの画面から呼んでも同じ見た目になる）。
(function () {
  'use strict';

  function isEN() {
    try { if(window.I18n&&typeof window.I18n.lang==='function')return window.I18n.lang()==='en';var s=localStorage.getItem('lang'),src=localStorage.getItem('langSource');if(src==='manual'&&(s==='ja'||s==='en'))return s==='en';var def=localStorage.getItem('langDefaultCache');if(def==='ja'||def==='en')return def==='en';var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;return String(first||'').toLowerCase().indexOf('ja')!==0; } catch (e) { return true; }
  }
  var LABELS = {
    ja: { ok: 'OK', cancel: 'キャンセル' },
    en: { ok: 'OK', cancel: 'Cancel' }
  };

  var built = false;
  var ovEl, boxEl, msgEl, okBtn, cancelBtn;
  var pendingResolve = null;

  function build() {
    if (built) return;
    built = true;

    var style = document.createElement('style');
    style.textContent =
      '.uic-ov{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:99999;display:none;' +
      'align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,' +
      '"Segoe UI",Roboto,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;}' +
      '.uic-ov.on{display:flex;}' +
      '.uic-box{background:#fff;border-radius:16px;max-width:340px;width:100%;padding:22px 20px;' +
      'box-shadow:0 12px 32px rgba(0,0,0,.24);}' +
      '.uic-msg{white-space:pre-wrap;font-size:15px;line-height:1.6;color:#0f172a;margin-bottom:20px;' +
      'word-break:break-word;}' +
      '.uic-btns{display:flex;gap:10px;justify-content:flex-end;}' +
      '.uic-btn{border:0;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:800;cursor:pointer;' +
      'font-family:inherit;min-height:40px;}' +
      '.uic-btn.uic-cancel{background:#f1f5f9;color:#334155;}' +
      '.uic-btn.uic-ok{background:#0f172a;color:#fff;}' +
      '.uic-btn.uic-ok.uic-danger{background:#dc2626;}' +
      '.uic-btn:active{opacity:.85;}';
    document.head.appendChild(style);

    ovEl = document.createElement('div');
    ovEl.className = 'uic-ov';
    ovEl.setAttribute('role', 'alertdialog');
    ovEl.setAttribute('aria-modal', 'true');
    ovEl.innerHTML =
      '<div class="uic-box">' +
      '<div class="uic-msg" id="uicMsg"></div>' +
      '<div class="uic-btns">' +
      '<button type="button" class="uic-btn uic-cancel" id="uicCancel"></button>' +
      '<button type="button" class="uic-btn uic-ok" id="uicOk"></button>' +
      '</div></div>';
    document.body.appendChild(ovEl);

    boxEl = ovEl.querySelector('.uic-box');
    msgEl = ovEl.querySelector('#uicMsg');
    okBtn = ovEl.querySelector('#uicOk');
    cancelBtn = ovEl.querySelector('#uicCancel');

    okBtn.addEventListener('click', function () { close(true); });
    cancelBtn.addEventListener('click', function () { close(false); });
    ovEl.addEventListener('click', function (e) { if (e.target === ovEl) close(false); });
    document.addEventListener('keydown', function (e) {
      if (!ovEl.classList.contains('on')) return;
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    });
  }

  function close(result) {
    ovEl.classList.remove('on');
    var r = pendingResolve;
    pendingResolve = null;
    if (r) r(result);
  }

  // 確認ダイアログ（OK/キャンセルの2択）。Promise<boolean>を返す（OK=true, キャンセル/背景クリック/Esc=false）。
  // 直前の呼び出しがまだ開いたままの状態で連続で呼ばれることは無い前提（confirm()と同じ、1画面で
  // 同時に1つしか出さない想定）。
  window.UIConfirm = function (message, opts) {
    build();
    opts = opts || {};
    var lang = isEN() ? LABELS.en : LABELS.ja;
    msgEl.textContent = String(message == null ? '' : message);
    okBtn.textContent = opts.okLabel || lang.ok;
    cancelBtn.textContent = opts.cancelLabel || lang.cancel;
    cancelBtn.style.display = '';
    okBtn.className = 'uic-btn uic-ok' + (opts.danger ? ' uic-danger' : '');
    ovEl.classList.add('on');
    okBtn.focus();
    return new Promise(function (resolve) { pendingResolve = resolve; });
  };

  // 通知ダイアログ（OKのみ）。alert()の代替。Promise<void>を返すが、呼び出し側は待たなくてもよい
  // （alert()と違いJS実行をブロックしないため、後続処理が無いことを確認した上での単純置換で使える）。
  window.UIAlert = function (message, opts) {
    build();
    opts = opts || {};
    var lang = isEN() ? LABELS.en : LABELS.ja;
    msgEl.textContent = String(message == null ? '' : message);
    okBtn.textContent = opts.okLabel || lang.ok;
    okBtn.className = 'uic-btn uic-ok';
    cancelBtn.style.display = 'none';
    ovEl.classList.add('on');
    okBtn.focus();
    return new Promise(function (resolve) { pendingResolve = resolve; });
  };
})();
