// Shared, presentation-only credit quote. The authenticated server remains the
// sole authority for pricing, balance, reservation and settlement.
(function (root) {
  'use strict';
  var STYLE_ID = 'ai-credit-button-style';
  function decorate() {
    if (!root.document || root.document.getElementById(STYLE_ID)) return;
    var style = root.document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '.btn.ai-credit-action{background:#6d28d9!important;color:#fff!important;'+
      'border:1px solid #5b21b6!important;min-height:44px;box-sizing:border-box}'+
      '.btn.ai-credit-action:active{background:#5b21b6!important}'+
      '.btn.ai-credit-action:disabled{opacity:.55;cursor:not-allowed}';
    (root.document.head || root.document.documentElement).appendChild(style);
  }
  function quote(wallet, feature, count) {
    var balance = wallet && wallet.balances && wallet.balances.total;
    var cost = wallet && wallet.costs && wallet.costs[feature];
    if (!Number.isSafeInteger(balance) || balance < 0 ||
        !Number.isSafeInteger(cost) || cost <= 0 ||
        !Number.isSafeInteger(count) || count <= 0)
      throw new Error('ai_credit_quote_unavailable');
    var amount = cost * count;
    if (!Number.isSafeInteger(amount)) throw new Error('ai_credit_quote_unavailable');
    return {balance:balance, unitCost:cost, count:count, amount:amount,
      sufficient:balance >= amount, remaining:balance - amount};
  }
  function balanceLabel(wallet, lang) {
    var total = wallet && wallet.balances && wallet.balances.total;
    if (!Number.isSafeInteger(total) || total < 0)
      return lang === 'en' ? 'Unable to verify AI credit balance.' : 'AIポイント残高を確認できません。';
    return lang === 'en' ? 'Current AI credits: ' + total : '現在のAIポイント：' + total;
  }
  // Credit prices come from the authenticated wallet. "Maximum" describes
  // the number of successful pages/images allowed, not a usage prediction.
  function confirmation(wallet, feature, count, lang, maximum, sourceKind) {
    var q = quote(wallet, feature, count);
    var english = lang === 'en';
    var generating = feature === 'menu_photo';
    var kind = sourceKind === 'image' || sourceKind === 'page'
      ? sourceKind : feature === 'inventory_image' || generating ? 'image' : 'page';
    var unit = kind === 'image' ? (english ? 'image' : '画像') : (english ? 'page' : 'ページ');
    return (english ? '🤖 AI credit usage confirmation' : '🤖 AIポイント利用確認') + '\n\n' +
      (english ? 'Current balance: ' : '現在のポイント残高：') + q.balance +
      (english ? ' credits\n' : 'ポイント\n') +
      (english ? 'Unit price: ' : '単価：') + q.unitCost +
      (english ? ' credit' + (q.unitCost === 1 ? '' : 's') + ' / ' + unit + '\n' :
        'ポイント／' + unit + '\n') +
      (english ? (generating ? 'Images to generate: ' : 'Items to analyze: ') :
        (generating ? '生成対象：' : '解析対象：')) + q.count +
      (english ? ' ' + unit + (q.count === 1 ? '' : 's') + '\n' : unit + '\n') +
      (english ? 'Maximum charge: ' : '最大消費：') + q.amount +
      (english ? ' credits\n' : 'ポイント\n') +
      (english ? 'Balance if all succeed: ' : 'すべて成功した場合の残高：') + q.remaining +
      (english ? ' credits\n\n' : 'ポイント\n\n') +
      (english ? 'The unit price is fixed. Credits are charged only for successful ' +
        (kind === 'image' ? 'images' : 'pages') + '. Continue?' :
        '単価は固定です。' + (generating ? '生成' : '解析') + 'に成功した' + unit +
        'の分だけポイントを消費します。続行しますか？');
  }
  function noChargeConfirmation(wallet, lang) {
    return (lang === 'en' ? '🤖 AI analysis confirmation\n\n' :
      '🤖 AI解析の確認\n\n') +
      balanceLabel(wallet, lang) + '\n' +
      (lang === 'en'
        ? 'Unit price: 0 credits / image (credit billing is off)\n' +
          'Items to analyze: 1 image\nMaximum charge: 0 credits\n\nContinue?'
        : '単価：0ポイント／画像（現在ポイント課金は無効）\n' +
          '解析対象：1画像\n最大消費：0ポイント\n\n続行しますか？');
  }
  // Shared, bounded public error vocabulary for AI menu image generation.
  // Never expose provider exceptions or transport response bodies to users.
  function imageGenerationError(error, lang) {
    var code=String(error && (error.code || error.message) || error || '').trim();
    var en=lang==='en';
    var messages={
      ai_request_failed:en
        ? 'The AI service could not generate the image. Check your credit balance before trying again.'
        : 'AIサービスが画像を生成できませんでした。ポイント残高を確認してから再度お試しください。',
      ai_invalid_response:en
        ? 'The AI service returned an invalid image. No successful image was generated.'
        : 'AIサービスから正しい画像が返されませんでした。画像の生成は完了していません。',
      ai_provider_unavailable:en
        ? 'AI image generation is temporarily unavailable.'
        : 'AI画像生成サービスは一時的に利用できません。',
      ai_account_budget_unavailable:en
        ? 'AI service usage could not be verified. Please retry later.'
        : 'AIサービスの利用状況を確認できません。しばらくして再試行してください。',
      ai_account_budget_exhausted:en
        ? 'The AI service usage limit has been reached. Please retry later.'
        : 'AIサービスの利用上限に達しています。しばらくして再試行してください。',
      ai_request_in_progress:en
        ? 'The previous generation is still processing. Check its result again shortly.'
        : '前回の画像生成はまだ処理中です。少し経ってから結果を再確認してください。',
      ai_request_already_refunded:en
        ? 'The previous generation failed and its credit was returned. Please start a new generation.'
        : '前回の画像生成は失敗し、ポイントが返却されています。新しく生成してください。',
      ai_credits_feature_disabled:en
        ? 'AI image generation is not currently enabled.'
        : 'AI画像生成は現在有効になっていません。',
      ai_credit_insufficient:en
        ? 'Not enough AI credits. Refresh your balance and try again.'
        : 'AIポイントが不足しています。残高を更新してから再試行してください。',
    };
    return Object.prototype.hasOwnProperty.call(messages,code)
      ? messages[code]+' ('+code+')' : '';
  }
  var confirmLoader = null;
  async function confirm(message) {
    if (typeof root.UIConfirm === 'function') return !!(await root.UIConfirm(message));
    // Header owns the common lazy loader. If this module is used standalone,
    // load that same local modal rather than invoking a native browser dialog.
    if (root.IZHeader && typeof root.IZHeader.confirm === 'function')
      return !!(await root.IZHeader.confirm(message));
    if (!confirmLoader) {
      confirmLoader = new Promise(function (resolve) {
        if (!root.document || !root.document.head || !root.document.body) { resolve(false); return; }
        var script = root.document.createElement('script');
        script.src = './confirm.js?v=auth2';
        script.setAttribute('data-iz-credit-confirm', '');
        script.onload = function () { resolve(typeof root.UIConfirm === 'function'); };
        script.onerror = function () { resolve(false); };
        root.document.head.appendChild(script);
      });
    }
    try {
      return !!(await confirmLoader) && typeof root.UIConfirm === 'function'
        ? !!(await root.UIConfirm(message)) : false;
    } catch (e) { return false; }
  }
  root.AICreditUI = Object.freeze({decorate:decorate, quote:quote,
    balanceLabel:balanceLabel, confirmation:confirmation,
    noChargeConfirmation:noChargeConfirmation, imageGenerationError:imageGenerationError,
    confirm:confirm});
  decorate();
})(typeof window === 'undefined' ? globalThis : window);
