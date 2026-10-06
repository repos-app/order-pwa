// 注文アプリ本体（PWA・オフライン耐性つき）
(function () {
  'use strict';

  var i18n = {
    en: { order:'Order', total:'Total', all:'All', send:'Order', empty:'Please select items',
      confirm:'Send this order?', okTitle:'Order sent', okMsg:'Your order was received.',
      queuedTitle:'Saved (offline)', queuedMsg:'No connection now. It will be sent automatically when back online.',
      errTitle:'Error', ok:'OK', table:'Table', counter:'Counter', noTable:'Please scan the signed QR code at your location.',
      offline:'Offline — orders will be sent automatically when back online', attention:'A queued order needs attention. It was kept on this device because the server did not accept it.', invalidTableSession:'This table session is invalid. Staff should reselect the table; guests should rescan the table QR code.', lang:'JP',
      svc:'Service', tax:'Tax', ranking:'🏆 Ranking',
      tblTitle:'Select a location', tblMsg:'Staff may select a location here. Guests must scan the signed QR code at their location.', tblGo:'Start',
      partyTitle:'How many guests?', partyLabel:'Guests', partyChoose:'Select party size', partyMsg:'Used for entry and extension fee billing.', partyMsgEntry:'Used for entry fee billing.', partyMsgExtension:'Used for extension fee billing.', partyGo:'OK',
      memberTitle:'Member (points)', memberSub:'Enter your phone to earn points. For privacy, balance checks and point use are handled by staff.', check:'Register', usePoints:'Use points', points:'pts', discountLbl:'Points', earned:'pts earned',
      couponTitle:'Coupon / Voucher', couponSub:'Enter a code to get a discount.', apply:'Apply', remove:'Remove coupon', close:'Close', couponLbl:'Coupon',
      cpApplied:'Applied', cpEmpty:'Enter a code', cpNotfound:'Code not found', cpInactive:'Not available', cpExpired:'Expired', cpLimit:'Usage limit reached', cpMin:'Minimum order not met', cpInvalid:'Invalid code',
      optChoose:'Choose options', optAdd:'Add to order', optQty:'Qty', optRequired:'required', optPick:'Please choose the required options.', optInCart:'In your order', optClose:'Close',
      soldOut:'Sold out', notNow:'Not available now', allergen:'Allergens',
      callTitle:'Staff called', callMsg:'A staff member will be with you shortly.', billTitle:'Bill requested', billMsg:'A staff member will bring your bill shortly.',
      callConfirm:'Call a staff member to your table?', billConfirm:'Request your bill?',
      fbTitle:'How was it?', fbSub:'Your rating helps us improve.', fbComment:'Comment', fbSend:'Send', fbPick:'Please tap the stars to rate.', fbCommentRequired:'Please enter a comment.', fbThanks:'Thank you!', fbThanksMsg:'Thanks for your feedback.',
      bdayLbl:'🎂 Register your birthday for a treat', bdaySave:'Save', bdaySaved:'Request received. Ask staff to change an existing account.', bdayBad:'Enter as MM-DD (e.g. 08-15)',
      stTitle:'My orders', stSubLbl:'Subtotal', stSvcInclLbl:'Service charge (included)', stSvcExclLbl:'Service charge', stTaxInclLbl:'{tax} (included)', stTaxExclLbl:'{tax}', stTotalLbl:'Unpaid total', stRefresh:'Refresh', stEmpty:'No orders yet for this table.', stPending:'Preparing', stServed:'Served',
      taxInclText:'Prices include {tax} {v}%.', taxExclText:'{tax} {v}% will be added at checkout.',
      svcInclText:'Prices include a {v}% service charge.', svcExclText:'A {v}% service charge applies separately.',
      btnMember:'Rewards', btnCoupon:'Coupon', btnCall:'Call', btnBill:'Bill', btnStatus:'Orders', btnFeedback:'Rate',
      doneTitle:'Thank you!', doneMsg:'Your bill has been settled. To order again, please scan the location QR code once more.',
      mgmtBack:'← Manage' },
    ja: { order:'ご注文', total:'合計', all:'すべて', send:'注文する', empty:'商品を選んでください',
      confirm:'この内容で注文しますか？', okTitle:'注文を送信しました', okMsg:'ご注文を承りました。',
      queuedTitle:'保留しました（オフライン）', queuedMsg:'今は接続がありません。オンライン復帰時に自動送信します。',
      errTitle:'エラー', ok:'OK', table:'卓', counter:'カウンター', noTable:'席に設置された署名付きQRコードを読み取ってください。',
      offline:'オフライン — 復帰時に自動送信します', attention:'未同期注文の確認が必要です。サーバーで受け付けられなかった注文を端末に保持しています。', invalidTableSession:'席のセッションが無効です。スタッフは席を選び直し、お客様は席のQRコードを再読み取りしてください。', lang:'EN',
      svc:'サービス料', tax:'税', ranking:'🏆 ランキング',
      tblTitle:'席を選択', tblMsg:'スタッフはここで席を選べます。お客様は席の署名付きQRコードを読み取ってください。', tblGo:'開始',
      partyTitle:'ご来店人数は？', partyLabel:'人数', partyChoose:'人数を選択', partyMsg:'入場料・延長料の請求に使用します。', partyMsgEntry:'入場料の請求に使用します。', partyMsgExtension:'延長料の請求に使用します。', partyGo:'OK',
      memberTitle:'会員（ポイント）', memberSub:'電話番号を入力するとポイントが貯まります。残高確認・利用は個人情報保護のためスタッフへお申し付けください。', check:'登録', usePoints:'ポイントを使う', points:'pt', discountLbl:'ポイント割引', earned:'pt 獲得',
      couponTitle:'クーポン／バウチャー', couponSub:'コードを入力すると割引されます。', apply:'適用', remove:'クーポンを外す', close:'閉じる', couponLbl:'クーポン',
      cpApplied:'適用しました', cpEmpty:'コードを入力してください', cpNotfound:'コードが見つかりません', cpInactive:'利用できません', cpExpired:'期限切れ', cpLimit:'利用上限に達しています', cpMin:'最低注文額に達していません', cpInvalid:'無効なコード',
      optChoose:'オプションを選ぶ', optAdd:'注文に追加', optQty:'数量', optRequired:'必須', optPick:'必須オプションを選択してください。', optInCart:'注文内', optClose:'閉じる',
      soldOut:'本日売切', notNow:'提供時間外', allergen:'アレルゲン',
      callTitle:'スタッフを呼びました', callMsg:'まもなくスタッフが伺います。', billTitle:'お会計を依頼しました', billMsg:'まもなくスタッフがお会計に伺います。',
      callConfirm:'スタッフを呼びますか？', billConfirm:'お会計を依頼しますか？',
      fbTitle:'ご感想は？', fbSub:'評価は今後の改善に役立ちます。', fbComment:'コメント', fbSend:'送信', fbPick:'星をタップして評価してください。', fbCommentRequired:'コメントを入力してください。', fbThanks:'ありがとうございます！', fbThanksMsg:'ご意見ありがとうございました。',
      bdayLbl:'🎂 お誕生日を登録すると特典があります', bdaySave:'登録', bdaySaved:'受付しました。既存会員の変更はスタッフへお申し付けください。', bdayBad:'MM-DD 形式で入力（例: 08-15）',
      stTitle:'注文状況', stSubLbl:'小計', stSvcInclLbl:'うちサービス料（内税）', stSvcExclLbl:'サービス料', stTaxInclLbl:'うち{tax}（内税）', stTaxExclLbl:'{tax}', stTotalLbl:'未会計 合計', stRefresh:'更新', stEmpty:'この卓の注文はまだありません。', stPending:'準備中', stServed:'提供済み',
      taxInclText:'表示価格は{tax}{v}%込みです。', taxExclText:'お会計時に別途{tax}{v}%を頂戴いたします。',
      svcInclText:'表示価格はサービス料{v}%込みです。', svcExclText:'別途サービス料{v}%を頂戴いたします。',
      btnMember:'特典', btnCoupon:'クーポン', btnCall:'呼出', btnBill:'会計', btnStatus:'状況', btnFeedback:'評価',
      doneTitle:'ご利用ありがとうございました', doneMsg:'お会計が完了しました。追加でご注文の際は、席のQRコードを再度読み取ってください。',
      mgmtBack:'← 管理' }
  };

  var state = {
    lang: 'en', settings: {}, menu: [], cats: [], currentCat: 'all', ranking: [],
    cart: {}, optLines: [], table: '', member: null, usePoints: false, coupon: null,
    tableLocked: false,      // true = 卓番号はURLのQRで固定済み（客はタップで変更不可）
    checkoutStamp: 0,        // このセッション開始時点の「最終会計時刻」基準値
    sessionEnded: false,     // 基準値より新しい会計を検知＝このセッションは終了
    partySize: 0             // 入場料/延長料の請求に使う人数（卓/カウンター選択時に入力）
  };

  function $(id) { return document.getElementById(id); }
  // 言語の切替・優先順位・永続化は共通部品 i18n.js（I18n）に統一（他画面と同じ仕組み）。
  // state.lang は現在言語のミラーで、I18n.init()のonChangeコールバック経由で更新される。
  function t() { return I18n.d(); }

  function qs(name) {
    var m = new RegExp('[?&]' + name + '=([^&]*)').exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function money(v) {
    var sym = state.settings.currencySymbol || '';
    var locale = state.settings.locale || undefined;
    var digits = Object.prototype.hasOwnProperty.call(state.settings,'currencyDecimalDigits') ? Math.max(0,Math.min(3,Number(state.settings.currencyDecimalDigits)||0)) : 0;
    return sym + (Number(v) || 0).toLocaleString(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});
  }
  function tablePayload(payload) {
    return Object.assign({}, payload || {});
  }
  function apiErrorText(err) {
    var msg = String(err && err.message || err || '');
    return msg === 'invalid_table_session' ? t().invalidTableSession : API.userErrorText(err);
  }
  function taxName(){ return String(state.settings.taxDisplayName || 'VAT'); }
  function roundCharge(v){ var d=Object.prototype.hasOwnProperty.call(state.settings,'currencyDecimalDigits')?Math.max(0,Math.min(3,Number(state.settings.currencyDecimalDigits)||0)):0,f=Math.pow(10,d),n=(Number(v)||0)*f,m=state.settings.taxRoundingMode||'nearest'; return (m==='floor'?Math.floor(n+Number.EPSILON):m==='ceil'?Math.ceil(n-Number.EPSILON):Math.round(n+Number.EPSILON))/f; }

  // ---- オプション ----
  // メニュー行の「オプション」JSONを配列で返す（[{name,type,required,choices:[{label,price}]}]）
  function itemOpts(it) {
    try { var a = JSON.parse(it['オプション'] || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function menuItem(name) {
    for (var i = 0; i < state.menu.length; i++) { if (state.menu[i]['商品名'] === name) return state.menu[i]; }
    return null;
  }
  function optionLoc(ja,en,legacy){ja=String(ja||'').trim();en=String(en||'').trim();legacy=String(legacy||'').trim();return state.lang==='en'?(en||ja||legacy):(ja||en||legacy);}
  function optionLineLabel(line){var it=menuItem(line.base),groups=itemOpts(it),out=[];if(Array.isArray(line.optionSelections))line.optionSelections.forEach(function(sel){var g=groups[Number(sel.groupIndex)]||{};(sel.choiceIndexes||[]).forEach(function(ci){var c=(g.choices||[])[Number(ci)]||{},s=optionLoc(c.labelJa,c.labelEn,c.label);if(s)out.push(s);});});return out.length?out.join(', '):(line.label||'');}
  function localizedOrderName(raw){var s=String(raw||''),exact=menuItem(s);if(exact)return optionLoc(exact['商品名_JA'],exact['商品名_EN'],s);var m=s.match(/^(.+?)\s*[（(]([^（）()]*)[)）]\s*$/),base=(m?m[1]:s).trim(),it=menuItem(base);if(!it)return s;var baseDisp=optionLoc(it['商品名_JA'],it['商品名_EN'],base);if(!m||!m[2].trim())return baseDisp;var groups=itemOpts(it),map=Object.create(null);groups.forEach(function(g){(g.choices||[]).forEach(function(c){[c.label,c.labelJa,c.labelEn].forEach(function(alias){var k=String(alias||'').trim();if(k&&!map[k])map[k]=c;});});});var labels=m[2].split(',').map(function(x){var k=x.trim(),c=map[k];return c?optionLoc(c.labelJa,c.labelEn,c.label):k;});return baseDisp+' ('+labels.join(', ')+')';}
  // ある基本商品のオプション明細合計数量（カード上のバッジ用）
  function optQty(base) {
    var n = 0; state.optLines.forEach(function (l) { if (l.base === base) n += l.qty; }); return n;
  }

  function breakdown() {
    var sub = 0;
    state.menu.forEach(function (it) {
      var q = state.cart[it['商品名']] || 0;
      if (q > 0) sub += (Number(it['価格']) || 0) * q;
    });
    state.optLines.forEach(function (l) { sub += (Number(l.unit) || 0) * (Number(l.qty) || 0); });
    var svcRate = Number(state.settings.serviceRate) || 0;
    var taxRate = Number(state.settings.taxRate) || 0;
    var svcIncl = String(state.settings.serviceInclusive) === 'true';
    var taxIncl = String(state.settings.taxInclusive) === 'true';
    // 内税/外税：内税＝表示価格に含まれる（追加課金なし）／外税＝表示価格の上に加算
    // サービス料は最終会計（レジ）でまとめて加算するため、注文画面の合計・送信額には加算しない（二重加算防止）。
    // 内税の場合は表示価格に含まれる分の参考値として算出（合計への影響なし＝従来通り）。
    var service, afterService, tax, base;
    service = svcIncl ? roundCharge(sub - sub / (1 + svcRate / 100)) : 0;
    afterService = sub;
    if (taxIncl) { tax = roundCharge(sub - sub / (1 + taxRate / 100)); base = afterService; }
    else { tax = roundCharge(afterService * (taxRate / 100)); base = afterService + tax; }
    // クーポン割引（先に適用）
    var couponDiscount = 0;
    if (state.coupon && state.coupon.discount > 0) {
      couponDiscount = state.coupon.type === 'percent'
        ? Math.round(base * (Number(state.coupon.value) || 0) / 100)  // 率は現在の会計額で再計算
        : Math.min(Number(state.coupon.value) || 0, base);
      couponDiscount = Math.max(0, Math.min(couponDiscount, base));
    }
    var afterCoupon = base - couponDiscount;
    // ポイント割引（クーポン後の残額に対して）
    var discount = 0, pointsUsed = 0;
    if (state.usePoints && state.member && state.member.points > 0) {
      var rv = Number(state.settings.loyaltyRedeemValue) || 1;
      discount = Math.min(state.member.points * rv, afterCoupon);
      pointsUsed = Math.round(discount / rv);
    }
    return { sub: sub, service: service, tax: tax, couponDiscount: couponDiscount, discount: discount, pointsUsed: pointsUsed, total: afterCoupon - discount };
  }

  // 会計時の内訳を概算表示するためのヘルパー（admin.html の breakdown() と同じロジック）。
  // 「注文状況」画面はまだ会計前なので、ここでの結果はあくまで見込み額（クーポン・ポイント・割引は未反映）。
  function payBreakdown(sub) {
    var svcRate = Number(state.settings.serviceRate) || 0;
    var taxRate = Number(state.settings.taxRate) || 0;
    var svcIncl = String(state.settings.serviceInclusive) === 'true';
    var taxIncl = String(state.settings.taxInclusive) === 'true';
    var digits=Object.prototype.hasOwnProperty.call(state.settings,'currencyDecimalDigits')?Math.max(0,Math.min(3,Number(state.settings.currencyDecimalDigits)||0)):0, factor=Math.pow(10,digits), mode=state.settings.taxRoundingMode||'nearest';
    function rounded(v){var n=v*factor;return (mode==='floor'?Math.floor(n+Number.EPSILON):mode==='ceil'?Math.ceil(n-Number.EPSILON):Math.round(n+Number.EPSILON))/factor;}
    var svc, afterSvc, tax, total;
    if (svcIncl) { svc = rounded(sub - sub / (1 + svcRate / 100)); afterSvc = sub; }
    else { svc = rounded(sub * (svcRate / 100)); afterSvc = rounded(sub + svc); }
    if (taxIncl) { tax = rounded(sub - sub / (1 + taxRate / 100)); total = rounded(afterSvc); }
    else { tax = rounded(afterSvc * (taxRate / 100)); total = rounded(afterSvc + tax); }
    return { sub: sub, service: svc, tax: tax, total: total };
  }

  // ---- 描画 ----
  function applyAccent() {
    var hex = state.settings.accentColor || '';
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      document.documentElement.style.setProperty('--accent', hex);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', hex);
    }
  }

  function renderTexts() {
    var x = t();
    $('shopName').textContent = state.settings.shopName || x.order;
    // 卓番号：QR経由（URLに?table=あり）で確定した客のセッションでは変更不可にする。
    // QR無し（店員が口頭注文を入力する運用）のときだけ従来通りタップで選び直せる。
    if (state.tableLocked) {
      $('tableChip').textContent = state.table ? seatLabel(state.table) : (seatGroupLabel() + ' —');
      $('tableChip').style.cursor = 'default';
      $('tableChip').title = '';
    } else {
      $('tableChip').textContent = (state.table ? seatLabel(state.table) : (seatGroupLabel() + ' —')) + ' ▾';
      $('tableChip').style.cursor = 'pointer';
      $('tableChip').title = (state.lang === 'en') ? 'Tap to change location' : '席を選び直す';
    }
    // langBtnの表示テキストは共通部品I18n（data-tlang）が管理するため、ここでは触らない（他画面と統一）。
    if ($('mgmtBackBtn')) $('mgmtBackBtn').textContent = x.mgmtBack;
    $('totalLbl').textContent = x.total;
    $('sendLbl').textContent = x.send;
    $('offlineText').textContent = x.offline;
    if ($('memberLbl')) $('memberLbl').textContent = x.btnMember;
    if ($('couponLbl')) $('couponLbl').textContent = x.btnCoupon;
    if ($('callLbl')) $('callLbl').textContent = x.btnCall;
    if ($('billLbl')) $('billLbl').textContent = x.btnBill;
    if ($('statusLbl')) $('statusLbl').textContent = x.btnStatus;
    if ($('fbLbl')) $('fbLbl').textContent = x.btnFeedback;
    if ($('doneTitle')) $('doneTitle').textContent = x.doneTitle;
    if ($('doneMsg')) $('doneMsg').textContent = x.doneMsg;
    renderVatNotice();
    updateStickyOffsets();
  }

  // ヘッダの現在日時表示（1分ごとに更新）
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function updateClock() {
    var el = $('appbarClock'); if (!el) return;
    var d = new Date();
    var ymd = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    var hm = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    el.textContent = ymd + ' ' + hm;
  }
  function startClock() {
    updateClock();
    setInterval(updateClock, 15000);
  }

  // appbar／quickbarの実高さをCSS変数に反映し、.catsのsticky位置がズレないようにする。
  function updateStickyOffsets() {
    try {
      var ab = document.querySelector('.appbar'), qb = document.querySelector('.quickbar');
      var abH = ab ? ab.offsetHeight : 52;
      var qbH = qb ? qb.offsetHeight : 0;
      document.documentElement.style.setProperty('--appbar-h', abH + 'px');
      document.documentElement.style.setProperty('--stack-h', (abH + qbH) + 'px');
    } catch (e) {}
  }

  // 税・サービス料の案内（設定のtaxRate/serviceRateが未設定/0のときはその部分を省く）
  function renderVatNotice() {
    var el = $('vatNotice'); if (!el) return;
    var x = t();
    var vat = Number(state.settings.taxRate) || 0;
    var svc = Number(state.settings.serviceRate) || 0;
    var vatIncl = String(state.settings.taxInclusive) === 'true';
    var svcIncl = String(state.settings.serviceInclusive) === 'true';
    if (vat <= 0 && svc <= 0) { el.style.display = 'none'; el.textContent = ''; return; }
    var parts = [];
    if (vat > 0) parts.push((vatIncl ? x.taxInclText : x.taxExclText).replace('{tax}',taxName()).replace('{v}', vat));
    if (svc > 0) parts.push((svcIncl ? x.svcInclText : x.svcExclText).replace('{v}', svc));
    el.textContent = parts.join(' ');
    el.style.display = 'block';
  }

  function renderCats() {
    var x = t();
    var lab = function (c) { var pair=state.catLabels&&state.catLabels[c]||{};return state.lang==='en'?(pair.en||pair.ja||c):(pair.ja||pair.en||c); };
    var html = '<div class="cat' + (state.currentCat === 'all' ? ' active' : '') + '" data-cat="all">' + x.all + '</div>';
    if (state.ranking && state.ranking.length) {
      html += '<div class="cat' + (state.currentCat === 'ranking' ? ' active' : '') + '" data-cat="ranking">' + x.ranking + '</div>';
    }
    state.cats.forEach(function (c) {
      html += '<div class="cat' + (state.currentCat === c ? ' active' : '') + '" data-cat="' + escAttr(c) + '">' + escHtml(lab(c)) + '</div>';
    });
    $('cats').innerHTML = html;
    Array.prototype.forEach.call($('cats').querySelectorAll('.cat'), function (el) {
      el.addEventListener('click', function () { state.currentCat = el.getAttribute('data-cat'); renderCats(); renderMenu(); });
    });
  }

  function renderMenu() {
    var rankOf = null; // key(商品名) -> 順位(1始まり)。ランキングタブの時だけ設定。
    var items;
    if (state.currentCat === 'ranking') {
      rankOf = {};
      var byName = {};
      state.menu.forEach(function (it) { byName[it['商品名']] = it; });
      items = [];
      (state.ranking || []).forEach(function (r, i) {
        var it = byName[r.name];
        if (it) { rankOf[it['商品名']] = i + 1; items.push(it); }
      });
    } else {
      items = state.currentCat === 'all'
        ? state.menu
        : state.menu.filter(function (it) { return it['カテゴリ'] === state.currentCat; });
    }
    if (!items.length) { $('menuArea').innerHTML = '<div class="loading">—</div>'; return; }
    var html = '<div class="grid">';
    items.forEach(function (it) {
      var key = it['商品名'];
      var name = optionLoc(it['商品名_JA'],it['商品名_EN'],key);
      var thumb = it.displayUrl
        ? '<img class="thumb" src="' + escAttr(it.displayUrl) + '" loading="lazy" alt="">'
        : '<div class="no-thumb"></div>';
      // タグ（辛さ・アレルゲン）
      var tags = '';
      var sp = Number(it['辛さ']) || 0;
      if (sp > 0) { var pep = ''; for (var s = 0; s < sp; s++) pep += '🌶'; tags += '<span class="tag-spicy">' + pep + '</span>'; }
      if (it['アレルゲン']) tags += '<span class="tag-allg">⚠ ' + escHtml(String(it['アレルゲン'])) + '</span>';
      var tagsHtml = tags ? '<div class="tags">' + tags + '</div>' : '';
      // 可用性（本日売切／提供時間外）
      var unavail = it.soldOut === true || it.available === false;
      var ctrl;
      if (unavail) {
        var badge = it.soldOut ? t().soldOut : t().notNow;
        ctrl = '<div class="qty"><span class="unavail-tag">' + escHtml(badge) + '</span></div>';
      } else if (itemOpts(it).length) {
        // オプション付き：選択ボタン＋合計数量バッジ
        var oq = optQty(key);
        ctrl = '<div class="qty">' +
            '<button class="opt-btn" data-opt="' + escAttr(key) + '">' + escHtml(t().optChoose) +
              (oq > 0 ? ' <span class="opt-badge">' + oq + '</span>' : '') + '</button>' +
          '</div>';
      } else {
        var q = state.cart[key] || 0;
        ctrl = '<div class="qty">' +
            '<button class="minus" data-n="' + escAttr(key) + '" data-d="-1">−</button>' +
            '<span class="n' + (q > 0 ? ' has' : '') + '" id="n-' + cssId(key) + '">' + q + '</span>' +
            '<button class="plus" data-n="' + escAttr(key) + '" data-d="1">＋</button>' +
          '</div>';
      }
      var rankBadge = (rankOf && rankOf[key]) ? '<div class="rank-badge">No.' + rankOf[key] + '</div>' : '';
      html += '<div class="card' + (unavail ? ' unavail' : '') + '">' + rankBadge + thumb +
        '<div class="body">' +
          '<div class="name">' + escHtml(name) + '</div>' +
          tagsHtml +
          '<div class="price">' + money(it['価格']) + '</div>' +
          ctrl +
        '</div>' +
      '</div>';
    });
    html += '</div>';
    $('menuArea').innerHTML = html;
    Array.prototype.forEach.call($('menuArea').querySelectorAll('button[data-n]'), function (btn) {
      btn.addEventListener('click', function () {
        changeQty(btn.getAttribute('data-n'), Number(btn.getAttribute('data-d')));
      });
    });
    Array.prototype.forEach.call($('menuArea').querySelectorAll('button[data-opt]'), function (btn) {
      btn.addEventListener('click', function () { openOpt(btn.getAttribute('data-opt')); });
    });
  }

  // ---- オプション選択モーダル ----
  var optCtx = null; // { base }
  function openOpt(base) {
    var it = menuItem(base); if (!it) return;
    optCtx = { base: base };
    var x = t();
    var dispName = localizedOrderName(base);
    $('optName').textContent = dispName;
    var groups = itemOpts(it);
    var html = '';
    // 既にカートに入っている当商品の明細（削除可）
    var lines = state.optLines.filter(function (l) { return l.base === base; });
    if (lines.length) {
      html += '<div class="opt-incart"><div class="opt-incart-h">' + escHtml(x.optInCart) + '</div>';
      state.optLines.forEach(function (l, idx) {
        if (l.base !== base) return;
        html += '<div class="opt-line"><span>' + escHtml(optionLineLabel(l) || '—') + ' × ' + l.qty + '　' + money(l.unit) + '</span>' +
          '<button class="opt-rm" data-rm="' + idx + '">×</button></div>';
      });
      html += '</div>';
    }
    // グループ
    groups.forEach(function (g, gi) {
      var multi = g.type === 'multi';
      var req = g.required ? ' <span class="opt-req">(' + escHtml(x.optRequired) + ')</span>' : '';
      html += '<div class="opt-group" data-gi="' + gi + '" data-type="' + (multi ? 'multi' : 'single') + '" data-req="' + (g.required ? 1 : 0) + '">' +
        '<div class="opt-gname">' + escHtml(optionLoc(g.nameJa,g.nameEn,g.name)) + req + '</div>';
      (g.choices || []).forEach(function (c, ci) {
        var add = (Number(c.price) || 0);
        var addTxt = add ? '　+' + money(add) : '';
        html += '<label class="opt-choice">' +
          '<input type="' + (multi ? 'checkbox' : 'radio') + '" name="og' + gi + '" value="' + ci + '" data-price="' + add + '">' +
          '<span>' + escHtml(optionLoc(c.labelJa,c.labelEn,c.label)) + addTxt + '</span></label>';
      });
      html += '</div>';
    });
    // 数量
    html += '<div class="opt-qtybar"><span>' + escHtml(x.optQty) + '</span>' +
      '<button id="optMinus">−</button><span id="optQtyN">1</span><button id="optPlus">＋</button></div>';
    $('optBody').innerHTML = html;
    $('optAdd').textContent = x.optAdd;
    $('optClose').textContent = x.optClose;
    optCtx.qty = 1;
    // イベント
    Array.prototype.forEach.call($('optBody').querySelectorAll('button[data-rm]'), function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-rm')); state.optLines.splice(i, 1);
        renderMenu(); updateTotal(); openOpt(base); // 再描画
      });
    });
    $('optMinus').addEventListener('click', function () { optCtx.qty = Math.max(1, optCtx.qty - 1); $('optQtyN').textContent = optCtx.qty; });
    $('optPlus').addEventListener('click', function () { optCtx.qty = Math.min(99, optCtx.qty + 1); $('optQtyN').textContent = optCtx.qty; });
    $('optModal').classList.add('show');
  }
  function closeOpt() { $('optModal').classList.remove('show'); optCtx = null; }

  function addOptLine() {
    if (!optCtx) return;
    var it = menuItem(optCtx.base); if (!it) return;
    var x = t();
    var groups = itemOpts(it);
    var chosen = [], selections = [], extra = 0, ok = true;
    Array.prototype.forEach.call($('optBody').querySelectorAll('.opt-group'), function (gd) {
      var req = gd.getAttribute('data-req') === '1';
      var sels = gd.querySelectorAll('input:checked');
      if (req && !sels.length) ok = false;
      var gi = Number(gd.getAttribute('data-gi')), selectedIdxs=[];
      Array.prototype.forEach.call(sels, function (inp) {
        var ci = Number(inp.value);
        var c = (groups[gi].choices || [])[ci] || {};
        chosen.push(c.label || c.labelJa || c.labelEn || ''); selectedIdxs.push(ci);
        extra += Number(inp.getAttribute('data-price')) || 0;
      });
      if(selectedIdxs.length) selections.push({groupIndex:gi,choiceIndexes:selectedIdxs});
    });
    if (!ok) { UIAlert(x.optPick); return; }
    var label = chosen.filter(function (s) { return s; }).join(', ');
    var basePrice = Number(it['価格']) || 0;
    var unit = basePrice + extra;
    var sig = optCtx.base + '||' + label;
    var qty = optCtx.qty || 1;
    // 同一構成があれば数量加算
    var merged = false;
    state.optLines.forEach(function (l) { if (l.sig === sig) { l.qty += qty; merged = true; } });
    if (!merged) state.optLines.push({ base: optCtx.base, sig: sig, label: label, optionSelections:selections, unit: unit, qty: qty });
    closeOpt(); renderMenu(); updateTotal();
  }

  function changeQty(name, delta) {
    state.cart[name] = Math.max(0, (state.cart[name] || 0) + delta);
    var el = $('n-' + cssId(name));
    if (el) { el.textContent = state.cart[name]; el.className = 'n' + (state.cart[name] > 0 ? ' has' : ''); }
    updateTotal();
  }

  function updateTotal() {
    var b = breakdown();
    $('totalVal').textContent = money(b.total);
    var x = t();
    var sub = '';
    if (b.service > 0) sub += x.svc + ' ' + money(b.service) + '　';
    if (b.tax > 0) sub += x.tax + ' ' + money(b.tax);
    if (b.couponDiscount > 0) sub += (sub ? '　' : '') + '🎟️ -' + money(b.couponDiscount);
    if (b.discount > 0) sub += (sub ? '　' : '') + '🎁 -' + money(b.discount);
    $('totalSub').textContent = sub;
    $('sendBtn').disabled = b.sub <= 0;
  }

  // ---- 注文状況（自分の卓の注文・提供状況・未会計合計） ----
  // 旧形式の明細も登録済みの日本語・英語名と選択肢へ変換する。
  function transOrderDetails(details) {
    return String(details || '').split(/,\s*(?![^（）()]*[)）])/).map(function (tok) {
      var m = tok.trim().match(/^(.+?)x(\d+)$/); if (!m) return tok;
      return localizedOrderName(m[1].trim()) + 'x' + m[2];
    }).join(', ');
  }
  function orderDetailsText(order){if(Array.isArray(order&&order.items)&&order.items.length){return order.items.map(function(i){var n=state.lang==='en'?(i.nameEn||i.nameJa):(i.nameJa||i.nameEn),raw=String(i.item_name||i.name||'');return (/[（(][^（）()]*[)）]\s*$/.test(raw)?localizedOrderName(raw):(n||localizedOrderName(raw)))+'x'+i.qty;}).join(', ');}return transOrderDetails(order&&order.details||'');}
  function openStatus() {
    var x = t();
    $('stTitle').textContent = x.stTitle;
    $('stSubLbl').textContent = x.stSubLbl;
    $('stSvcLbl').textContent = String(state.settings.serviceInclusive) === 'true' ? x.stSvcInclLbl : x.stSvcExclLbl;
    $('stTaxLbl').textContent = (String(state.settings.taxInclusive) === 'true' ? x.stTaxInclLbl : x.stTaxExclLbl).replace('{tax}',taxName());
    $('stTotalLbl').textContent = x.stTotalLbl;
    $('stRefresh').textContent = x.stRefresh;
    $('stClose').textContent = x.close;
    $('statusModal').classList.add('show');
    loadStatus();
  }
  function loadStatus() {
    var x = t();
    $('stBody').innerHTML = '<div style="text-align:center;color:var(--text-2);padding:14px;">…</div>';
    $('stSubVal').textContent = '—';
    $('stSvcRow').style.display = 'none';
    $('stTaxRow').style.display = 'none';
    $('stTotalVal').textContent = '—';
    if (!state.table) { $('stBody').innerHTML = '<div style="text-align:center;color:var(--text-2);padding:14px;">' + escHtml(x.noTable) + '</div>'; return; }
    // 注文状況は集計画面ではないため、画面操作開始から5秒以内で必ず完了させる。
    // 共通APIの既定25秒・内部再送は使わず、4.5秒で成功または明確な通信エラーへ遷移する。
    API.post('getOrdersByTable', tablePayload({ table: state.table, __timeoutMs: 4500, __noInternalRetry: true, __silent: true })).then(function (r) {
      var list = (r && r.data) || [];
      if (!list.length) {
        $('stBody').innerHTML = '<div style="text-align:center;color:var(--text-2);padding:14px;">' + escHtml(x.stEmpty) + '</div>';
        $('stSubVal').textContent = money(0); $('stTotalVal').textContent = money(0);
        return;
      }
      var total = 0, html = '';
      list.forEach(function (o) {
        total += Number(o.price) || 0;
        var served = o.status === '提供済';
        var badge = served ? ('<span style="background:#dcfce7;color:#15803d;border-radius:8px;padding:2px 8px;font-size:12px;font-weight:800;">✓ ' + escHtml(x.stServed) + '</span>')
                           : ('<span style="background:#fef3c7;color:#92400e;border-radius:8px;padding:2px 8px;font-size:12px;font-weight:800;">🍳 ' + escHtml(x.stPending) + '</span>');
        html += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">' +
          '<div style="flex:1;"><div style="font-size:11px;color:var(--text-2);">🕐 ' + escHtml(o.time || '') + '</div><div>' + escHtml(orderDetailsText(o)) + '</div></div>' +
          '<div style="text-align:right;white-space:nowrap;"><div>' + money(o.price || 0) + '</div>' + badge + '</div></div>';
      });
      $('stBody').innerHTML = html;
      // 各注文の金額（=商品価格の小計）はサービス料を含まない。会計時に加算されるサービス料はここでは
      // 商品価格に混ぜず、別項目として概算表示する（実際の金額は会計時に確定）。
      var b = payBreakdown(total);
      $('stSubVal').textContent = money(b.sub);
      if (b.service > 0) { $('stSvcRow').style.display = 'flex'; $('stSvcVal').textContent = money(b.service); }
      else { $('stSvcRow').style.display = 'none'; }
      if (b.tax > 0) { $('stTaxRow').style.display = 'flex'; $('stTaxVal').textContent = money(b.tax); }
      else { $('stTaxRow').style.display = 'none'; }
      $('stTotalVal').textContent = money(b.total);
    }).catch(function (e) { $('stBody').innerHTML = '<div style="text-align:center;color:var(--red);padding:14px;">' + escHtml(apiErrorText(e)) + '</div>'; });
  }

  // ---- 接客（スタッフ呼び出し / お会計） ----
  function requestStaff(type) {
    var x = t();
    if (!state.table) { showErr(x.noTable); return; }
    UIConfirm(type === 'bill' ? x.billConfirm : x.callConfirm).then(function (ok) {
      if (!ok) return;
      API.post('callStaff', tablePayload({ table: state.table, type: type })).then(function () {
        showOk(type === 'bill' ? x.billTitle : x.callTitle, type === 'bill' ? x.billMsg : x.callMsg, type === 'bill' ? '🧾' : '🔔');
      }).catch(function (e) { showErr(apiErrorText(e)); });
    });
  }

  // ---- フィードバック（評価） ----
  var fbRating = 0;
  function openFeedback() {
    var x = t();
    fbRating = 0;
    $('fbTitle').textContent = x.fbTitle;
    $('fbSub').textContent = x.fbSub;
    $('fbComment').value = '';
    $('fbComment').placeholder = x.fbComment;
    $('fbSend').textContent = x.fbSend;
    $('fbClose').textContent = x.close;
    paintStars(0);
    $('fbModal').classList.add('show');
  }
  function paintStars(n) {
    Array.prototype.forEach.call($('fbStars').querySelectorAll('span'), function (s) {
      s.textContent = (Number(s.getAttribute('data-v')) <= n) ? '★' : '☆';
      s.style.color = (Number(s.getAttribute('data-v')) <= n) ? '#f59e0b' : '#cbd5e1';
    });
  }
  var feedbackRequestId = '', feedbackRequestSig = '';
  function nextFeedbackRequestId() {
    try { if (crypto && typeof crypto.randomUUID === 'function') return 'feedback-' + crypto.randomUUID(); } catch (e) {}
    return 'feedback-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
  function sendFeedback() {
    var x = t();
    if (fbRating < 1) { showErr(x.fbPick); return; }
    var _comment = $('fbComment').value.trim();
    if (!_comment) { showErr(x.fbCommentRequired); return; }
    var sig = JSON.stringify([state.table, fbRating, _comment]);
    if (!feedbackRequestId || feedbackRequestSig !== sig) { feedbackRequestSig = sig; feedbackRequestId = nextFeedbackRequestId(); }
    var btn = $('fbSend'); btn.disabled = true;
    API.post('submitFeedback', tablePayload({ table: state.table, rating: fbRating, comment: _comment, clientRequestId: feedbackRequestId })).then(function (r) {
      var d = (r && r.data) || {};
      if (d && d.error) { feedbackRequestId = ''; feedbackRequestSig = ''; showErr(d.error === 'comment_required' ? x.fbCommentRequired : apiErrorText(d.error)); return; }
      feedbackRequestId = ''; feedbackRequestSig = '';
      $('fbModal').classList.remove('show');
      showOk(x.fbThanks, x.fbThanksMsg, '⭐');
    }).catch(function (e) { showErr(apiErrorText(e)); })
      .then(function () { btn.disabled = false; });
  }

  // ---- 送信 ----
  // 2026-08-25削除: PayMongoによるセルフ決済（openPayChoice/startPay/checkPay等）は
  // state.paymongoが常にfalseで一度も実行されない死んだコードだったため、あつしさんの
  // 明示許可を得て削除した（対応するpayChoice/payModalのHTML・app.jsのイベント登録も
  // 合わせて削除済み）。現状は常に「後会計」のみとなる。

  function send() {
    var x = t();
    if (state.sessionEnded) { $('doneOverlay').classList.add('show'); return; }
    if (!state.table) { showErr(x.noTable); return; }
    var items = [];
    Object.keys(state.cart).forEach(function (n) { if (state.cart[n] > 0) items.push({ name: n, count: state.cart[n] }); });
    state.optLines.forEach(function (l) {
      if (l.qty > 0) items.push({ name: l.base + (l.label ? ' (' + l.label + ')' : ''), count: l.qty, optionSelections:l.optionSelections||[] });
    });
    if (!items.length) { showErr(x.empty); return; }
    var b = breakdown();
    var order = { tableNumber: state.table, items: items, totalPrice: b.total, phone: (state.member ? state.member.phone : ''), pointsUsed: (state.usePoints ? b.pointsUsed : 0),
      coupon: (state.coupon ? state.coupon.code : ''), couponDiscount: (b.couponDiscount || 0) };
    var confirmLines = [x.confirm, ''];
    items.forEach(function (it) { confirmLines.push('• ' + localizedOrderName(it.name) + ' ×' + it.count); });
    confirmLines.push('');
    confirmLines.push(x.stSubLbl + ': ' + money(b.sub));
    if (b.service > 0) confirmLines.push((String(state.settings.serviceInclusive) === 'true' ? x.stSvcInclLbl : x.stSvcExclLbl) + ': ' + money(b.service));
    if (b.tax > 0) confirmLines.push((String(state.settings.taxInclusive) === 'true' ? x.stTaxInclLbl : x.stTaxExclLbl).replace('{tax}', taxName()) + ': ' + money(b.tax));
    if (b.couponDiscount > 0) confirmLines.push(x.couponLbl + ': -' + money(b.couponDiscount));
    if (b.discount > 0) confirmLines.push(x.discountLbl + ': -' + money(b.discount));
    confirmLines.push(x.total + ': ' + money(b.total));
    UIConfirm(confirmLines.join('\n')).then(function (ok) {
      if (!ok) return;
      doSubmit(order, false);
    });
  }

  function doSubmit(order, paid) {
    if (!order) return;
    var x = t();
    order.paid = !!paid;
    var btn = $('sendBtn'); btn.disabled = true;
    API.submitOrder(order).then(function (result) {
      // サーバ拒否（例: テーブル未選択/不正）はカートを消さずにエラー表示
      if (typeof result === 'string' && result.indexOf('rejected:') === 0) {
        var reason = result.slice(9);
        showErr(x.errTitle + ': ' + (reason === 'Invalid table' ? x.noTable : API.userErrorText(reason)));
        return;
      }
      var earnedTxt = '';
      if (order.phone) {
        var rate = Number(state.settings.loyaltyEarnRate) || 20;
        var earned = Math.floor((Number(order.totalPrice) || 0) / rate);
        if (state.member) state.member.points = Math.max(0, state.member.points - (order.pointsUsed || 0) + earned);
        state.usePoints = false;
        if (earned > 0) earnedTxt = '　🎁+' + earned + x.points;
      }
      state.cart = {}; state.optLines = []; state.coupon = null; updateCouponBtn(); renderMenu(); updateTotal();
      var title = result === 'queued' ? x.queuedTitle : (paid ? x.paidTitle : x.okTitle);
      var msg   = (result === 'queued' ? x.queuedMsg   : (paid ? x.paidMsg   : x.okMsg)) + earnedTxt;
      showOk(title, msg, result === 'queued' ? '📥' : (paid ? '💳' : '✅'));
      refreshPending();
    }).catch(function (err) { showErr(API.userErrorText(err)); })
      .then(function () { btn.disabled = false; });
  }

  function showOk(title, msg, emoji) { $('okEmoji').textContent = emoji || '✅'; $('okTitle').textContent = title; $('okMsg').textContent = msg; $('okOverlay').classList.add('show'); }
  function showErr(msg) { $('errTitle').textContent = t().errTitle; $('errMsg').textContent = msg; $('errOverlay').classList.add('show'); }

  // ---- 会計後の追加注文ブロック ----
  // 会計（finalizeBill・卓全体）のたびにサーバ側で卓ごとの「最終会計時刻」が更新される。
  // このセッションが開始した時点の値を基準に保持し、それより新しい値を検知したら
  // 「この卓は会計済み＝このタブでの注文は終了」と判断して画面をロックする。
  var _sessionWatchStarted = false;
  function startSessionWatch() {
    if (!state.table || state.staffMode) return;   // 店員のオーダー入力モードは会計後ロックの対象外
    API.post('getTableCheckoutStamp', tablePayload({ table: state.table })).then(function (r) {
      state.checkoutStamp = Number(r.data) || 0;
    }).catch(function () {});
    if (!_sessionWatchStarted) { _sessionWatchStarted = true; setInterval(checkSessionLock, 15000); }
  }
  function checkSessionLock() {
    if (!state.table || state.staffMode || state.sessionEnded) return;
    API.post('getTableCheckoutStamp', tablePayload({ table: state.table })).then(function (r) {
      var v = Number(r.data) || 0;
      if (v > state.checkoutStamp) lockSession();
    }).catch(function () {});
  }
  function lockSession() {
    if (state.sessionEnded) return;
    state.sessionEnded = true;
    stopPoll();
    $('sendBtn').disabled = true;
    $('doneOverlay').classList.add('show');
  }

  function refreshPending() {
    API.pendingStatus().then(function (status) {
      var n=(status.sendable||0)+(status.attention||0);
      var pill = $('pendingPill');
      if (n > 0) { pill.textContent = n; pill.classList.add('show'); } else { pill.classList.remove('show'); }
      if (status.attention > 0 && navigator.onLine) {
        $('offlineText').textContent=t().attention;
        $('offlineBanner').style.display='flex';
      } else if (navigator.onLine) $('offlineBanner').style.display='';
    }).catch(function () {});
  }

  // テーブル未指定（QR無しアクセス）時に手動選択を促す
  // 席ラベルを言語に合わせて表示（値自体は「テーブルN/カウンターM」のまま保存）
  function seatLabel(v) {
    var x = t(), s = String(v), cfg = state.settings || {}, en = state.lang === 'en';
    var tableTerm = (en ? (cfg.tableLabelEn||cfg.tableLabelJa) : (cfg.tableLabelJa||cfg.tableLabelEn)) || x.table || (en ? 'Table' : 'テーブル');
    var counterTerm = (en ? (cfg.counterLabelEn||cfg.counterLabelJa) : (cfg.counterLabelJa||cfg.counterLabelEn)) || x.counter || (en ? 'Counter' : 'カウンター');
    var m = s.match(/^テーブル(\d+)$/) || s.match(/^(\d+)$/); if (m) return tableTerm + ' ' + m[1];
    var c = s.match(/^カウンター(\d+)$/); if (c) return counterTerm + ' ' + c[1];
    return s;
  }
  function seatSortKey(v) {
    var s = String(v == null ? '' : v);
    var c = s.match(/^カウンター(\d+)$/);
    if (c) return { group:0, num:Number(c[1]) || 0, text:s };
    var t1 = s.match(/^テーブル(\d+)$/), t2 = s.match(/^(\d+)$/), t = t1 || t2;
    if (t) return { group:1, num:Number(t[1]) || 0, text:s };
    return { group:2, num:0, text:s };
  }
  function sortSeats(list) {
    return (list || []).slice().sort(function (a, b) {
      var ka = seatSortKey(a), kb = seatSortKey(b);
      if (ka.group !== kb.group) return ka.group - kb.group;
      if (ka.num !== kb.num) return ka.num - kb.num;
      return ka.text.localeCompare(kb.text, state.lang === 'ja' ? 'ja' : 'en', { numeric:true });
    });
  }
  function partySizeMax() {
    var n = parseInt((state.settings || {}).partySizeMax, 10);
    return Number.isFinite(n) && n >= 1 ? Math.min(100, n) : 20;
  }
  function seatGroupLabel(){ var cfg=state.settings||{},en=state.lang==='en'; return (en?(cfg.seatGroupLabelEn||cfg.seatGroupLabelJa):(cfg.seatGroupLabelJa||cfg.seatGroupLabelEn))||(en?'Seating':'席'); }
  function _feeSettingEnabled(enabledKey, amountKey) {
    var s = state.settings || {};
    if (Object.prototype.hasOwnProperty.call(s, enabledKey)) return s[enabledKey] === true || s[enabledKey] === 1 || s[enabledKey] === '1' || s[enabledKey] === 'on' || s[enabledKey] === 'true';
    return Number(s[amountKey]) >= 1;
  }
  // 明示フラグを優先し、旧設定は単価から推定する。単価0の不整合設定では人数を尋ねない。
  function _partyFeeUsage() {
    var s = state.settings || {};
    return {
      entry: _feeSettingEnabled('entryFeeEnabled', 'entryFeeAmount') && Number(s.entryFeeAmount) >= 1,
      extension: _feeSettingEnabled('extensionFeeEnabled', 'extensionFeeAmount') && Number(s.extensionFeeAmount) >= 1
    };
  }
  // [応答速度対応] 以前は「卓選択」（店員操作）→ maybeAskPartySize()がサーバへ既存人数の
  // 有無を確認 → 未記録なら別画面で人数入力 → サーバへ保存、という2画面・最大2回の逐次サーバ
  // 往復だった。卓選択と人数入力を1つの画面にまとめ、既存人数の事前確認は行わず（多少の
  // 再入力の手間より速さを優先）、送信は1回（人数機能を使わない店舗では0回）にする。
  // tables を渡すと卓選択欄を表示（店員のオーダー入力＝?table=なし）。省略時は卓は確定済み
  // （QR固定客）として人数入力欄のみを表示する。
  function showTableAndPartyPicker(tables) {
    var x = t();
    var needTable = !!tables;
    var feeUsage = _partyFeeUsage();
    var needParty = feeUsage.entry || feeUsage.extension;
    if (!needTable && !needParty) return; // どちらも不要なら画面自体を出さない
    $('tableSelectWrap').style.display = needTable ? '' : 'none';
    $('partySection').style.display = needParty ? '' : 'none';
    if (needTable) {
      var sel = $('tableSelect');
      sel.innerHTML = '';
      sortSeats(tables).forEach(function (n) { var o = document.createElement('option'); o.value = n; o.textContent = seatLabel(n); sel.appendChild(o); });
    }
    var partyFeeMsg = feeUsage.entry && feeUsage.extension ? x.partyMsg : (feeUsage.entry ? x.partyMsgEntry : x.partyMsgExtension);
    $('tblTitle').textContent = needTable ? x.tblTitle : x.partyTitle;
    $('tblMsg').textContent = needTable ? x.tblMsg : partyFeeMsg;
    $('partyLabel').textContent = x.partyLabel;
    $('partyMsg').textContent = needTable && needParty ? partyFeeMsg : '';
    var partySel = $('partyCount');
    partySel.innerHTML = '';
    if (needParty) {
      var ph = document.createElement('option');
      ph.value = ''; ph.disabled = true; ph.selected = true; ph.textContent = x.partyChoose;
      partySel.appendChild(ph);
      var maxParty = partySizeMax();
      for (var i = 1; i <= maxParty; i++) {
        var po = document.createElement('option');
        po.value = String(i);
        po.textContent = state.lang === 'ja' ? (i + '人') : (i + (i === 1 ? ' guest' : ' guests'));
        partySel.appendChild(po);
      }
    }
    $('tblGo').textContent = x.tblGo;
    $('tableOverlay').classList.add('show');
    $('tblGo').onclick = function () {
      var v = needTable ? $('tableSelect').value : state.table;
      if (needTable && !v) return;
      var n = 0;
      if (needParty) { n = Number($('partyCount').value); if (!n || n < 1) return; }
      var prev = state.table;
      if (needTable) {
        state.table = String(v);
        // 卓を切り替えたらカートをリセット（店員の口頭注文で別卓に入れ間違えない）
        if (prev && prev !== state.table) {
          state.cart = {}; state.optLines = []; state.coupon = null;
          updateCouponBtn(); renderMenu(); updateTotal();
        }
        // 別卓に切り替えた場合、その卓の会計済み状態を基準に取り直す（ロック状態をリセット）
        state.sessionEnded = false;
        $('doneOverlay').classList.remove('show');
        $('sendBtn').disabled = false;
        startSessionWatch();
      }
      if (needParty) {
        state.partySize = n;
        API.post('setTablePartySize', tablePayload({ table: state.table, count: n })).catch(function () {});
      }
      $('tableOverlay').classList.remove('show');
      renderTexts();
    };
  }

  // ---- 会員（ロイヤリティ） ----
  function openMember() {
    var x = t();
    $('memTitle').textContent = x.memberTitle;
    $('memSub').textContent = x.memberSub;
    $('memLookup').textContent = x.check;
    $('memUseLabel').textContent = x.usePoints;
    $('memClose').textContent = (state.lang === 'ja' ? '閉じる' : 'Close');
    if (state.member) { $('memPhone').value = state.member.phone; showMemberInfo(); } else { $('memInfo').style.display = 'none'; }
    $('memberModal').classList.add('show');
  }
  function showMemberInfo() {
    if (!state.member) { $('memInfo').style.display = 'none'; return; }
    var x = t();
    state.usePoints = false;
    $('memName').textContent = state.lang === 'ja' ? '電話番号を登録しました' : 'Phone number registered';
    $('memPoints').textContent = '';
    $('memUse').checked = false;
    $('memUse').parentElement.style.display = 'none';
    $('memBdayLbl').parentElement.style.display = 'none';
    $('memInfo').style.display = 'block';
  }
  function saveMemberBirthday() {
    var x = t();
    if (!state.member || !state.member.phone) return;
    var bd = $('memBday').value.trim();
    if (!/^\d{2}-\d{2}$/.test(bd)) { var m = $('memBdayMsg'); m.style.color = '#b91c1c'; m.textContent = x.bdayBad; return; }
    $('memBdaySave').disabled = true;
    API.post('setMemberBirthday', { phone: state.member.phone, birthday: bd, name: state.member.name }).then(function (r) {
      var d = r.data || {};
      var msg = $('memBdayMsg');
      if (d.error) { msg.style.color = '#b91c1c'; msg.textContent = x.bdayBad; return; }
      // A public phone submission cannot prove ownership or confirm an existing update.
      msg.style.color = '#15803d'; msg.textContent = x.bdaySaved;
    }).catch(function () {}).then(function () { $('memBdaySave').disabled = false; });
  }
  function lookupMember() {
    var phone = $('memPhone').value.trim();
    if (!phone) return;
    $('memLookup').disabled = true;
    API.post('loyaltyLookup', { phone: phone }).then(function (r) {
      var m = r.data;
      state.member = m || { phone: phone.replace(/[^0-9]/g, ''), name: '', points: 0, visits: 0 };
      showMemberInfo();
    }).catch(function () {}).then(function () { $('memLookup').disabled = false; });
  }

  // ---- クーポン / バウチャー ----
  function updateCouponBtn() {
    var el = $('couponBtn');
    if (!el) return;
    // ico/lbl の子要素構造（renderTexts()がlblに言語ラベルを描画する）を壊さないよう、
    // ボタン全体のtextContentは書き換えず、lblだけを差し替える。
    var lbl = $('couponLbl') || el.querySelector('.lbl');
    if (state.coupon) {
      if (lbl) lbl.textContent = state.coupon.code;
      el.classList.add('active');
    } else {
      if (lbl) lbl.textContent = t().btnCoupon;
      el.classList.remove('active');
    }
  }
  function openCoupon() {
    var x = t();
    $('cpTitle').textContent = x.couponTitle;
    $('cpSub').textContent = x.couponSub;
    $('cpApply').textContent = x.apply;
    $('cpRemove').textContent = x.remove;
    $('cpClose').textContent = x.close;
    var msg = $('cpMsg'); msg.textContent = '';
    if (state.coupon) {
      $('cpCode').value = state.coupon.code;
      $('cpRemove').style.display = 'block';
      msg.style.color = 'var(--green)';
      msg.textContent = '✅ ' + x.cpApplied + '（-' + money(breakdown().couponDiscount) + '）';
    } else {
      $('cpRemove').style.display = 'none';
    }
    $('couponModal').classList.add('show');
  }
  function applyCoupon() {
    var x = t();
    var code = ($('cpCode').value || '').trim().toUpperCase();
    var msg = $('cpMsg');
    if (!code) { msg.style.color = 'var(--red)'; msg.textContent = x.cpEmpty; return; }
    var b = breakdown();
    var amount = b.sub + b.service + b.tax; // クーポン適用前の会計額
    $('cpApply').disabled = true;
    API.post('validateCoupon', { code: code, amount: amount }).then(function (r) {
      var d = r.data || {};
      if (!d.ok) {
        state.coupon = null; updateCouponBtn(); updateTotal();
        $('cpRemove').style.display = 'none';
        msg.style.color = 'var(--red)';
        msg.textContent = '⚠️ ' + (x['cp' + (d.reason ? d.reason.charAt(0).toUpperCase() + d.reason.slice(1) : 'Invalid')] || x.cpInvalid) + (d.reason === 'min' && d.min ? '（' + money(d.min) + '）' : '');
        return;
      }
      state.coupon = { code: d.code, type: d.type, value: d.value, discount: d.discount };
      updateCouponBtn(); updateTotal();
      $('cpRemove').style.display = 'block';
      msg.style.color = 'var(--green)';
      msg.textContent = '✅ ' + x.cpApplied + '（-' + money(breakdown().couponDiscount) + '）';
    }).catch(function () {
      msg.style.color = 'var(--red)'; msg.textContent = x.cpInvalid;
    }).then(function () { $('cpApply').disabled = false; });
  }
  function removeCoupon() {
    state.coupon = null; updateCouponBtn(); updateTotal();
    $('cpRemove').style.display = 'none';
    $('cpCode').value = '';
    $('cpMsg').textContent = '';
  }

  // ---- utils ----
  function escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function escAttr(s) { return escHtml(s); }
  function cssId(s) { return String(s).replace(/[^a-zA-Z0-9]/g, function (c) { return '_' + c.charCodeAt(0); }); }

  // I18n.init()のonChangeコールバック（手動切替・店舗既定言語の反映の両方で呼ばれる）
  function onLangChange(l) {
    state.lang = l;
    renderTexts(); renderCats(); renderMenu(); updateTotal();
  }

  // ブートストラップ結果（サーバ or キャッシュ）を画面に反映
  function applyBootstrap(r, fromCache) {
    state.settings = r.settings || {};
    state.menu = (r.menu || []);
    if (state.settings.loyaltyEnabled === 'on' || state.settings.loyaltyEnabled === true || state.settings.loyaltyEnabled === 'true') $('memberBtn').style.display = '';
    var cats = [], catLabels = {};
    state.menu.forEach(function (it) { var c = it['カテゴリ']; if (c && cats.indexOf(c) === -1) cats.push(c); if(c){ var pair=catLabels[c]||(catLabels[c]={ja:'',en:''});if(!pair.ja)pair.ja=String(it['カテゴリ_JA']||'').trim();if(!pair.en)pair.en=String(it['カテゴリ_EN']||'').trim();} });
    state.cats = cats; state.catLabels = catLabels;
    applyAccent();
    var _bid = state.settings.menuTopImageId;
    if (_bid) { var _b = $('shopBanner'); _b.src = API.imageUrl(_bid); _b.style.display = 'block'; }
    state.tables = r.tables || [];   // 卓一覧を保持（卓チップから選び直せるように）
    renderTexts(); renderCats(); renderMenu(); updateTotal();
    if (!state.table && state.staffMode) showTableAndPartyPicker(state.tables); // 認証済みスタッフだけが卓を手動選択できる
    else if (!state.table) showErr(t().noTable);
    else showTableAndPartyPicker(); // QR固定客：卓は確定済みなので、必要なら人数入力のみ表示
    loadRanking();
  }

  // ---- 人気ランキング（直近30日・注文数量合計）----
  function loadRanking() {
    API.post('getMenuRanking', {}).then(function (r) {
      state.ranking = (r && r.data) || [];
      if (state.ranking.length) { renderCats(); if (state.currentCat === 'ranking') renderMenu(); }
    }).catch(function () {});
  }

  // ---- 起動 ----
  function boot() {
    state.table = qs('table');
    var tableToken = qs('t');
    // 共通公開ページは顧客専用。店舗・卓・環境へ署名されたQR tokenがある場合だけ卓を固定する。
    state.tableLocked = !!(state.table && tableToken);
    state.staffMode = false;
    if (!state.tableLocked) state.table = '';
    // 言語の初期化・切替・永続化は共通部品I18nに一本化（他画面と同じ仕組み）。
    I18n.init(i18n, onLangChange);
    if ($('mgmtBackBtn')) $('mgmtBackBtn').style.display = 'none';

    $('langBtn').addEventListener('click', function () { I18n.toggle(); });
    $('sendBtn').addEventListener('click', send);
    $('okBtn').addEventListener('click', function () { $('okOverlay').classList.remove('show'); });
    $('errBtn').addEventListener('click', function () { $('errOverlay').classList.remove('show'); });
    $('memberBtn').addEventListener('click', openMember);
    $('memLookup').addEventListener('click', lookupMember);
    $('couponBtn').addEventListener('click', openCoupon);
    $('cpApply').addEventListener('click', applyCoupon);
    $('cpRemove').addEventListener('click', removeCoupon);
    $('cpClose').addEventListener('click', function () { $('couponModal').classList.remove('show'); });
    $('memUse').addEventListener('change', function () { state.usePoints = this.checked; updateTotal(); });
    $('memClose').addEventListener('click', function () { $('memberModal').classList.remove('show'); });
    $('memBdaySave').addEventListener('click', saveMemberBirthday);
    $('optAdd').addEventListener('click', addOptLine);
    $('optClose').addEventListener('click', closeOpt);
    $('callBtn').addEventListener('click', function () { requestStaff('call'); });
    $('billBtn').addEventListener('click', function () { requestStaff('bill'); });
    $('statusBtn').addEventListener('click', openStatus);
    $('stRefresh').addEventListener('click', loadStatus);
    $('stClose').addEventListener('click', function () { $('statusModal').classList.remove('show'); });
    $('fbBtn').addEventListener('click', openFeedback);
    // 卓チップをタップで卓を選び直す（店員が口頭注文を別卓に入力する用・QR経由の客セッションでは無効）
    $('tableChip').addEventListener('click', function () { if (state.staffMode && !state.tableLocked && state.tables && state.tables.length) showTableAndPartyPicker(state.tables); });
    $('fbSend').addEventListener('click', sendFeedback);
    $('fbClose').addEventListener('click', function () { $('fbModal').classList.remove('show'); });
    Array.prototype.forEach.call($('fbStars').querySelectorAll('span'), function (s) {
      s.addEventListener('click', function () { fbRating = Number(s.getAttribute('data-v')); paintStars(fbRating); });
    });

    window.addEventListener('online', function () { document.body.classList.remove('offline'); API.flush().then(refreshPending); });
    window.addEventListener('offline', function () { document.body.classList.add('offline'); });
    if (!navigator.onLine) document.body.classList.add('offline');
    // 定期再送＋タブ復帰時の再送（online イベントが発火しない環境の保険）
    setInterval(function () { if (navigator.onLine) API.flush().then(refreshPending); }, 20000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && navigator.onLine) { API.flush().then(refreshPending); checkSessionLock(); }
    });
    var _resizeT = null;
    window.addEventListener('resize', function () { clearTimeout(_resizeT); _resizeT = setTimeout(updateStickyOffsets, 150); });
    updateStickyOffsets();

    // 会計後の追加注文ブロック：起動時に基準スタンプを取得し、以後定期的に最新値と比較する。
    startSessionWatch();

    // ヘッダの現在日時表示
    startClock();

    API.post('bootstrap', {}).then(function (r) {
      try { localStorage.setItem((window.APP_CONFIG.STORAGE_PREFIX || '') + 'bootCache', JSON.stringify({ settings: r.settings, menu: r.menu, tables: r.tables })); } catch (e) {}
      applyBootstrap(r, false);
      API.flush().then(refreshPending); // オンライン起動時に保留分を流す
    }).catch(function (err) {
      var cached = null;
      try { cached = JSON.parse(localStorage.getItem((window.APP_CONFIG.STORAGE_PREFIX || '') + 'bootCache') || 'null'); } catch (e) {}
      if (cached && cached.menu) {
        document.body.classList.add('offline'); // キャッシュ表示中＝実質オフライン
        applyBootstrap(cached, true);            // 保存済みメニューで注文可能（送信はキューへ）
      } else {
        renderTexts();
        $('menuArea').innerHTML = '<div class="loading" style="color:var(--red)">' + escHtml(t().errTitle + ': ' + API.userErrorText(err)) + '</div>';
      }
      refreshPending();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
