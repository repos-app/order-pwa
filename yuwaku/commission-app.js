(function(){
  'use strict';
  var prefix=(window.APP_CONFIG&&window.APP_CONFIG.AUTH_STORAGE_PREFIX)||'';
  var token=API.currentToken();
  var authReady=API.pageReady({auth:'optional'}).then(function(ctx){token=ctx.token||API.currentToken()||'';return !!token;});
  var state={rules:[],employees:[],menu:[],orders:[],receipts:[],settings:{},report:{staff:[],entries:[]}};
  var $=function(id){return document.getElementById(id);};
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function rpc(fn,args){return API.post('rpc',{fn:fn,args:args||[],token:token}).then(function(r){return r.data;});}
  function money(n){
    var settings=state.settings||{},code=String(settings.currencyCode||'').toUpperCase();
    var digits=code==='PHP'?2:code==='JPY'?0:Math.max(0,Math.min(3,Number(settings.currencyDecimalDigits)||0));
    var amount=Number(n)||0,locale=settings.locale||(code==='PHP'?'en-PH':code==='JPY'?'ja-JP':I18n.lang()==='ja'?'ja-JP':'en-US');
    var symbol=String(settings.currencySymbol||'');
    if(symbol){
      var abs=Math.abs(amount),formatted;
      try{formatted=new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(abs);}
      catch(e){formatted=abs.toFixed(digits);}
      return (amount<0?'-':'')+symbol+formatted;
    }
    if(code)try{return new Intl.NumberFormat(locale,{
      style:'currency',currency:code,currencyDisplay:'narrowSymbol',
      minimumFractionDigits:digits,maximumFractionDigits:digits
    }).format(amount);}catch(e){/* Unknown currency: keep its code visible. */}
    var formatted;
    try{formatted=new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.abs(amount));}
    catch(e){formatted=Math.abs(amount).toFixed(digits);}
    return (amount<0?'-':'')+(code?code+' ':'')+formatted;
  }
  function loc(ja,en,legacy){ja=String(ja||'').trim();en=String(en||'').trim();legacy=String(legacy||'').trim();return I18n.lang()==='en'?(en||ja||legacy):(ja||en||legacy);}
  function menuName(i){
    var ja=String(i&&i.nameJa||''), en=String(i&&i.nameEn||'');
    // Preserve the saved translation, except for the verified legacy AI mistranslation
    // of the Japanese size suffix 大 as "greatly" in menu names.
    if(I18n.lang()==='en'&&/[（(]大(?:盛(?:り)?)?[）)]/.test(ja)&&/\(greatly\)/i.test(en))return en.replace(/\(greatly\)/ig,'(large)');
    return loc(i&&i.nameJa,i&&i.nameEn,i&&i.name);
  }
  function menuCategory(i){return loc(i&&i.categoryJa,i&&i.categoryEn,i&&i.category);}
  function msg(text,ok){var el=$('cmMsg');el.textContent=text;el.className='cm-msg '+(ok?'ok':'err');window.scrollTo({top:0,behavior:'smooth'});}
  function clearMsg(){$('cmMsg').className='cm-msg';}
  function drinkMsg(text,ok){
    var el=$('cmDrinkMsg');el.textContent=text;el.className='cm-msg '+(ok?'ok':'err');
    el.setAttribute('role',ok?'status':'alert');
    if(!ok&&typeof el.scrollIntoView==='function')el.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function clearDrinkMsg(){var el=$('cmDrinkMsg');el.textContent='';el.className='cm-msg';el.setAttribute('role','status');}
  function fail(e,section){var m=String(e&&e.message||e);if(m.indexOf('unauthorized')>=0){location.href='./manage.html';return;}if(m==='plan_limit_commission_rules')m=I18n.t('planRuleLimit');else if(m==='plan_feature_sc_distribution')m=I18n.t('planScLimit');else m=I18n.t('error')+API.userErrorText(e);(section==='drinks'?drinkMsg:msg)(m,false);}
  function currentMonth(){var d=new Date(),m=String(d.getMonth()+1).padStart(2,'0');return d.getFullYear()+'-'+m;}
  function commissionDecimal(raw,max){
    var text=String(raw==null?'':raw).trim();
    if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null;
    var parts=text.split('.'),units=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
    return Number.isSafeInteger(units)&&(max==null||units<=max*100)?units/100:null;
  }

  function switchPane(name){
    document.querySelectorAll('.cm-tabs button').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-pane')===name);});
    document.querySelectorAll('.cm-pane').forEach(function(p){p.classList.toggle('on',p.id==='pane-'+name);});
  }
  document.querySelectorAll('.cm-tabs button').forEach(function(b){b.addEventListener('click',function(){switchPane(b.getAttribute('data-pane'));});});


  function selectedStaff(index){return Array.from(document.querySelectorAll('[data-receipt-index="'+index+'"]:checked')).map(function(x){return x.value;});}
  function renderOrders(){
    var el=$('cmOrders'),filter=$('cmAssignmentFilter').value;
    var rows=(state.receipts||[]).map(function(r,i){return {receipt:r,index:i};}).filter(function(x){
      var hasUnassigned=!x.receipt.assigned;
      return filter==='all'||(filter==='unassigned'?hasUnassigned:!hasUnassigned);
    });
    if(!rows.length){el.innerHTML='<div class="cm-empty">'+esc(I18n.t('noOrders'))+'</div>';return;}
    el.innerHTML=rows.map(function(x){
      var r=x.receipt,index=x.index, assigned={};
      (r.employeeIds||[]).forEach(function(id){assigned[id]=true;});
      // Same layout as checkout: one item per row; labels stay on one line.
      var items='<div class="cm-receipt-items">'+(r.items||[]).map(function(item){
        return '<div class="cm-receipt-item"><span class="cm-receipt-item-name" data-iz-ellipsis="item" title="'+esc(menuName(item))+'">'+esc(menuName(item))+'</span><span class="cm-receipt-item-qty">×'+Number(item.qty)+'</span></div>';
      }).join('')+'</div>';
      // Settled commission-drink / legacy option payouts are historical evidence,
      // never a second editable commission assignment mechanism.
      var options=(r.optionSnapshots||[]).map(function(option){
        var title=esc(option.itemName||'')+' · '+esc(option.label||'')+' ×'+Number(option.qty||1);
        var current=String(option.employeeId||'');
        var owner=state.employees.find(function(emp){return emp.id===current;});
        return '<div class="cm-row" style="margin-top:10px"><div class="cm-meta" data-iz-ellipsis="item" title="'+title+' · '+money(option.commissionAmount)+'">'+title+' · '+money(option.commissionAmount)+'</div><div class="cm-actions">'+
          '<span class="cm-meta">'+esc(I18n.lang()==='en'?'Recorded recipient':'記録済み対象スタッフ')+': '+
          esc(owner?owner.name:(current||I18n.t('unassigned')))+'</span></div></div>';
      }).join('');
      var itemAssignment=(state.features&&state.features.commissionOrderEnabled || Number(r.commissionPreview)>0 || r.assigned)?
        '<div class="cm-staff">'+state.employees.map(function(emp){return '<label class="cm-check"><input type="checkbox" data-receipt-index="'+index+'" value="'+esc(emp.id)+'"'+(assigned[emp.id]?' checked':'')+'><span data-iz-ellipsis="staff" title="'+esc(emp.name)+'">'+esc(emp.name)+'</span></label>';}).join('')+'</div><div class="cm-actions"><button class="cm-btn" data-save-receipt="'+index+'">'+I18n.t('saveAssignment')+'</button></div>':'';
      var currentRate=state.features&&state.features.commissionOrderEnabled?Number(state.features.commissionOrderDefaultPercent)||0:0;
      var estimated=Number(r.subtotal||0)*currentRate/100;
      var zeroText=estimated>0?ct('receiptPendingCommission').replace('{rate}',String(currentRate)).replace('{amount}',money(estimated)):ct('receiptZeroCommission');
      var zeroCommission=state.features&&state.features.commissionOrderEnabled&&Number(r.commissionPreview)<=0?
        '<div class="cm-warn" role="status" style="margin-top:10px">'+esc(zeroText)+'</div>':'';
      return '<div class="cm-row"><div class="cm-rowtop"><div><div class="cm-name" data-iz-ellipsis="receipt" title="'+esc(I18n.t('table')+' '+I18n.systemText(r.table)+' · '+r.receiptNo)+'">'+I18n.t('table')+' '+esc(I18n.systemText(r.table))+' · '+esc(r.receiptNo)+'</div><div class="cm-meta">'+esc(window.DateDisplay?DateDisplay.formatDateTime(r.createdAt):'')+'</div>'+items+'<div class="cm-meta">'+I18n.t('total')+' '+money(r.total)+' · '+I18n.t('orderCommission')+' '+money(r.commissionPreview)+'</div></div><span class="cm-badge">'+(r.assigned?esc((r.employeeIds||[]).length+' '+I18n.t('people')):I18n.t('unassigned'))+'</span></div>'+itemAssignment+zeroCommission+options+'</div>';
    }).join('');
    el.querySelectorAll('[data-save-receipt]').forEach(function(btn){btn.onclick=function(){
      var index=Number(btn.getAttribute('data-save-receipt')),r=(state.receipts||[])[index];if(!r)return;
      var selected=selectedStaff(index);
      btn.disabled=true;rpc('saveReceiptStaffAssignment',[r.receiptNo,selected]).then(function(result){
        btn.disabled=false;if(!result||!result.success)throw new Error(result&&result.error||'save_failed');
        msg(selected.length?(Number(result.totalCommission)>0?
          ct('assignmentSavedCommission').replace('{amount}',money(result.totalCommission)):
          ct('assignmentSavedZeroCommission')):I18n.t('assignmentSaved'),true);return reload(true);
      }).catch(function(e){btn.disabled=false;fail(e);});
    };});
  }

  function renderReport(){
    var el=$('cmReport'),staff=state.report&&state.report.staff||[],entries=state.report&&state.report.entries||[];
    var unallocated=Number(state.report&&state.report.unallocatedTotal)||0;
    var warning=unallocated>0?'<div class="cm-warn">'+esc(I18n.t('unallocatedReport'))+' '+money(unallocated)+'</div>':'';
    if(!staff.length){el.innerHTML=warning+'<div class="cm-empty">'+esc(I18n.t('noReport'))+'</div>';return;}
    function entryKind(entry){
      var snapshot={},effectiveType=entry.entryType;
      try{snapshot=JSON.parse(entry.snapshotJson||'{}');}catch(e){}
      if(entry.entryType==='reversal'){
        effectiveType=snapshot.sourceEntryType||effectiveType;
        try{snapshot=JSON.parse(snapshot.originalSnapshot||'{}');}catch(e){snapshot={};}
      }
      if(effectiveType==='service_charge'||snapshot.recipientSource==='employee_master')return 'serviceShare';
      if(snapshot.kind==='receipt_order_commission')return 'orderCommission';
      if(snapshot.kind==='order_option')return 'drinkCommission';
      return 'legacyItemCommission';
    }
    function detailHtml(s){
      var rows=entries.filter(function(e){return e.employeeId===s.employeeId;});
      var receiptMap=Object.create(null),receipts=[];
      rows.forEach(function(e){
        var no=String(e.receiptNo||''),group=receiptMap[no];
        if(!group){
          group={receiptNo:no,receiptTotal:e.receiptTotal,receiptCreatedAt:e.receiptCreatedAt,amount:0,lines:[]};
          receiptMap[no]=group;receipts.push(group);
        }
        if(!group.receiptCreatedAt&&e.receiptCreatedAt)group.receiptCreatedAt=e.receiptCreatedAt;
        group.amount+=Number(e.amount)||0;
        group.lines.push(e);
      });
      var out=receipts.map(function(r){
        var receiptAmount=r.receiptTotal==null?'<span class="cm-muted">'+esc(ct('receiptUnavailable'))+'</span>':money(r.receiptTotal);
        // Never display a raw UTC timestamp if the shared localized formatter
        // is unavailable: its wall clock would be wrong for the store timezone.
        var receiptDate=(r.receiptCreatedAt&&typeof DateDisplay!=='undefined'&&DateDisplay.formatUtcDateTime)
          ?DateDisplay.formatUtcDateTime(r.receiptCreatedAt):'';
        return '<div class="cm-report-receipt"><div class="cm-report-receipt-summary">'+
          '<div class="cm-report-receipt-identity"><span class="cm-report-or" title="'+esc(r.receiptNo)+'">'+esc(ct('orNumber'))+': '+esc(r.receiptNo||'—')+'</span>'+
          (receiptDate?'<time class="cm-report-date">'+esc(receiptDate)+'</time>':'')+'</div>'+
          '<span class="cm-report-receipt-total"><span>'+esc(ct('checkoutAmount'))+':</span><strong>'+receiptAmount+'</strong></span></div>'+
          '<div class="cm-report-receipt-head"><span>'+esc(ct('commissionAmount'))+'</span><strong>'+money(r.amount)+'</strong></div>'+
          '<div class="cm-report-components">'+r.lines.map(function(e){
            var kind=entryKind(e),status=e.entryType==='reversal'?'refundAdjustment':e.status==='paid'?'paidStatus':'unpaidStatus';
            return '<div class="cm-report-component"><span>'+esc(I18n.t(kind))+' · '+esc(ct(status))+'</span><strong>'+money(e.amount)+'</strong></div>';
          }).join('')+'</div></div>';
      }).join('');
      var entryTotal=rows.reduce(function(sum,e){return sum+(Number(e.amount)||0);},0);
      return out+'<div class="cm-report-reconcile"><span>'+esc(ct('detailTotal'))+'</span><strong>'+money(entryTotal)+'</strong></div>';
    }
    el.innerHTML=warning+staff.map(function(s,i){
      var pendingIds=entries.filter(function(e){return e.employeeId===s.employeeId&&e.status!=='paid'&&e.status!=='reversed'&&e.entryType!=='reversal'&&Number(e.amount)>0;}).map(function(e){return e.id;});
      return '<div class="cm-row"><div class="cm-rowtop cm-report-staff-head"><div class="cm-name" data-iz-ellipsis="staff" title="'+esc(s.employeeName)+'">'+esc(s.employeeName)+'</div><span class="cm-badge">'+I18n.t('total')+' '+money(s.total)+'</span></div>'+
        '<div class="cm-summary" style="margin-top:10px"><div class="cm-kpi"><span>'+I18n.t('orderCommission')+'</span><strong>'+money(s.orderCommission)+'</strong></div><div class="cm-kpi"><span>'+I18n.t('serviceShare')+'</span><strong>'+money(s.serviceCharge)+'</strong></div><div class="cm-kpi"><span>'+I18n.t('unpaid')+'</span><strong>'+money(s.pending)+'</strong></div></div>'+
        '<div class="cm-actions"><button class="cm-btn sec" type="button" data-details="'+i+'" aria-expanded="false" aria-controls="cm-report-detail-'+i+'">'+esc(ct('details'))+'</button>'+
        (pendingIds.length?'<button class="cm-btn" data-paid="'+esc(s.employeeId)+'">'+I18n.t('markPaid')+'</button>':'')+'</div>'+
        '<div id="cm-report-detail-'+i+'" class="cm-report-details" hidden>'+detailHtml(s)+'</div></div>';
    }).join('');
    // Old item-rule entries and per-menu extra-price payouts remain visible
    // and payable, but they are NOT the new order-subtotal percentage.
    el.querySelectorAll('.cm-row').forEach(function(row,index){
      var summary=row.querySelector('.cm-summary'),staffRow=staff[index];
      if(!summary||!staffRow)return;
      [['drinkCommission','drinkCommission'],['itemCommission','legacyItemCommission']].forEach(function(pair){
        if(!Number(staffRow[pair[0]]))return;
        var cell=document.createElement('div');cell.className='cm-kpi';
        var title=document.createElement('span');title.textContent=I18n.t(pair[1]);
        var value=document.createElement('strong');value.textContent=money(staffRow[pair[0]]);
        cell.appendChild(title);cell.appendChild(value);summary.appendChild(cell);
      });
    });
    el.querySelectorAll('[data-paid]').forEach(function(btn){btn.onclick=function(){var id=btn.getAttribute('data-paid'),ids=entries.filter(function(e){return e.employeeId===id&&e.status!=='paid'&&e.status!=='reversed'&&e.entryType!=='reversal'&&Number(e.amount)>0;}).map(function(e){return e.id;});var ask=UIConfirm(I18n.t('paidConfirm'));ask.then(function(ok){if(!ok)return;btn.disabled=true;return rpc('markCommissionPaid',[ids]).then(function(r){btn.disabled=false;if(!r||!r.success)throw new Error(r&&r.error||'save_failed');msg(I18n.t('paidSaved'),true);return reload(true);});}).catch(function(e){btn.disabled=false;fail(e);});};});
    el.querySelectorAll('[data-details]').forEach(function(btn){btn.onclick=function(){
      var panel=$('cm-report-detail-'+btn.getAttribute('data-details'));
      if(!panel)return;
      panel.hidden=!panel.hidden;
      btn.setAttribute('aria-expanded',String(!panel.hidden));
      btn.textContent=ct(panel.hidden?'details':'closeDetails');
    };});
  }

  // The settings and order screens use the same tenant-scoped feature keys.
  // Commission-eligible products annotate menu_items; they are not a second menu master.
  var configText={
    ja:{tabConfig:'コミッション設定',configTitle:'コミッション機能の有効・無効',configNote:'使う機能だけ有効にします。すべてOFFでも過去の報酬・未払履歴は確認できます。',
      receiptZeroCommission:'この伝票のオーダーコミッションは0です。現在の設定率を確認してください。',
      receiptPendingCommission:'コミッション未計算：担当者を保存すると、現在の設定率{rate}%で{amount}を確定します。',
      assignmentSavedZeroCommission:'担当者を保存しました。オーダーコミッションは0です。設定率を確認してください。',
      assignmentSavedCommission:'担当者を保存しました。オーダーコミッション: {amount}',
      featureSc:'SC分配',featureOrder:'オーダー別コミッション',
      featureScRate:'SCスタッフ分配率（%）',featureOrderRate:'VAT・サービス料控除後の売上に対するコミッション率（%）',
      saveFeatures:'設定を保存',drinkTitle:'コミッション対象メニュー',
      commissionStaffTitle:'コミッション対象従業員',commissionStaffHint:'チェックした在籍従業員だけが注文時のコミッション対象者と会計伝票の担当割当に表示されます。SC分配は別設定です。',
      commissionStaffCount:'選択中: {count}人',commissionStaffEligible:'対象',saveCommissionStaff:'対象従業員を保存',
      drinkNote:'商品画像の左のチェックは一括操作の選択です。コミッションON/OFFは別に設定します。追加料金は固定額または商品価格に対する割合（%）を選べます。変更後は保存してください。',
      drinkEligible:'コミッション',
      drinkSearch:'商品名で絞り込み',drinkCategoryFilter:'カテゴリで絞り込み',drinkAllCategories:'すべて',
      drinkNoCategory:'カテゴリ未設定',drinkBulk:'選択商品に設定する追加料金・割合',
      drinkBulkMode:'一括設定方式',drinkModeFixed:'固定額（₱）',drinkModePercent:'商品価格の割合（%）',
      drinkModeFixedShort:'固定額 ₱',drinkModePercentShort:'割合 %',
      drinkSelectShown:'表示中を全選択',drinkClearShown:'表示中の選択解除',
      drinkEnableSelected:'選択商品をコミッションON',drinkDisableSelected:'選択商品をコミッションOFF',
      drinkApply:'選択商品に金額・割合を適用',drinkSave:'対象商品と追加料金を保存',
      drinkExtra:'追加料金・割合',drinkItemPrice:'商品価格',drinkEmpty:'表示できる商品がありません。',drinkCount:'対象商品',drinkSelected:'一括選択',
      drinkSelect:'一括操作の対象に選択',drinkNoneSelected:'一括操作する商品を左側のチェックで選択してください。',
      invalidAmount:'固定額は0以上、割合は0～100%で小数2桁以内にしてください。',
      invalidRate:'コミッション率は0〜100の小数2桁以内で入力してください。',
      nothingChanged:'変更はありません。',drinkLoadError:'対象メニューを読み込めませんでした。店舗設定権限とDB更新状況をご確認ください。',
      scStaffTitle:'SC分配対象ユーザー',scStaffHint:'ユーザー一覧から対象者を選択します。退職者は分配されません。変更内容は保存ボタンで確定します。',
      details:'詳細',closeDetails:'閉じる',orNumber:'OR番号',checkoutAmount:'会計金額',commissionAmount:'コミッション金額',
      detailTotal:'明細合計',receiptUnavailable:'会計金額を取得できません',paidStatus:'支払済み',unpaidStatus:'未払い',refundAdjustment:'返金調整',
      scNote:'この画面でSC分配対象にした在籍スタッフ全員で均等分配します。注文担当や出勤状況は問いません。対象者が0人でも会計は継続し、未分配額を記録します。',
      saveScStaff:'対象者を保存',scEligibleLabel:'分配対象',scInactive:'退職・対象外',scNoUsers:'ユーザーが登録されていません。',
      scReallocTitle:'過去の未分配SCを再配分',scReallocHint:'伝票別の未分配記録から選び、対象スタッフへ均等に割り当てます。元の伝票と監査履歴は残り、二重配分はできません。',
      scReallocMonth:'対象月',scReallocReceiptsTitle:'再配分する伝票',scReallocStaffTitle:'配分先スタッフ',scReallocExecute:'選択したSCを再配分',
      scReallocEmpty:'この月の未分配SCはありません。',scReallocNoStaff:'SC分配対象スタッフが0人です。上の「SC分配対象ユーザー」で対象者を設定・保存してください。',
      scReallocPrevent:'SC分配が有効ですが対象スタッフが0人です。今後の会計でもSCが未分配になります。',
      scReallocTotal:'未分配合計',scReallocSelected:'選択した伝票',scReallocPreview:'再配分予定',scReallocApprox:'（伝票ごとの端数を調整済み）',
      scReallocConfirm:'以下の未分配SCを選択したスタッフへ均等配分しますか？',scReallocDone:'再配分完了',scReallocPartial:'再配分できなかった伝票',scReallocFailed:'再配分できませんでした。最新の伝票状態をご確認ください。',
      scReallocHistoryTitle:'再配分履歴',scReallocHistoryEmpty:'この月の再配分履歴はありません。',scReallocHistoryBy:'実行者'},
    en:{tabConfig:'Commission settings',configTitle:'Enable commission features',
      configNote:'Enable only what your store needs. Historical unpaid and paid rewards remain available when all features are OFF.',
      receiptZeroCommission:'Order commission is zero for this receipt. Check the currently configured rate.',
      receiptPendingCommission:'Commission pending: saving staff will apply the current {rate}% rate and record {amount}.',
      assignmentSavedZeroCommission:'Staff assignment saved. Order commission is zero; check the configured rate.',
      assignmentSavedCommission:'Staff assignment saved. Order commission: {amount}',
      featureSc:'SC sharing',featureOrder:'Order commission',
      featureScRate:'SC share paid to staff (%)',featureOrderRate:'Commission rate on sales excluding VAT and service charge (%)',
      saveFeatures:'Save settings',drinkTitle:'Commission-eligible menu items',
      commissionStaffTitle:'Commission-eligible staff',commissionStaffHint:'Only checked active employees appear as order commission recipients and in receipt assignments. SC sharing is configured separately.',
      commissionStaffCount:'Selected: {count}',commissionStaffEligible:'Eligible',saveCommissionStaff:'Save eligible staff',
      drinkNote:'Checkboxes left of images only select items for bulk actions; commission ON/OFF is separate. Set extra charges as a fixed amount or percentage of the item price, then save.',
      drinkEligible:'Commission',
      drinkSearch:'Filter by item name',drinkCategoryFilter:'Filter by category',drinkAllCategories:'All',
      drinkNoCategory:'Uncategorized',drinkBulk:'Bulk extra charge or percentage',
      drinkBulkMode:'Bulk calculation',drinkModeFixed:'Fixed amount (₱)',drinkModePercent:'Percent of item price (%)',
      drinkModeFixedShort:'Fixed ₱',drinkModePercentShort:'Rate %',
      drinkSelectShown:'Select all visible',drinkClearShown:'Deselect visible',
      drinkEnableSelected:'Commission ON for selected',drinkDisableSelected:'Commission OFF for selected',
      drinkApply:'Apply amount or percentage',drinkSave:'Save items and extra charges',
      drinkExtra:'Extra charge / rate',drinkItemPrice:'Item price',drinkEmpty:'No menu items match.',drinkCount:'Eligible items',drinkSelected:'Bulk selected',
      drinkSelect:'Select for bulk action',drinkNoneSelected:'Select items with the checkboxes to the left of their images.',
      invalidAmount:'Use a non-negative fixed amount or a percentage from 0 to 100, with at most 2 decimals.',
      invalidRate:'Enter rates from 0 to 100 with at most 2 decimals.',
      nothingChanged:'No changes to save.',drinkLoadError:'Could not load menu items. Check settings permission and database migration.',
      scStaffTitle:'SC eligible users',scStaffHint:'Select the eligible users from this list. Former employees do not receive SC. Save to apply changes.',
      details:'Details',closeDetails:'Close',orNumber:'OR number',checkoutAmount:'Receipt total',commissionAmount:'Commission amount',
      detailTotal:'Entry total',receiptUnavailable:'Receipt total unavailable',paidStatus:'Paid',unpaidStatus:'Unpaid',refundAdjustment:'Refund adjustment',
      scNote:'SC is split equally among all active users enabled on this screen, regardless of order assignment or attendance. Checkout continues even if nobody is eligible.',
      saveScStaff:'Save eligible users',scEligibleLabel:'Eligible',scInactive:'Former / ineligible',scNoUsers:'No users are registered.',
      scReallocTitle:'Allocate previously unassigned SC',scReallocHint:'Select the original receipts and split their unallocated SC equally among eligible staff. The original receipts and audit history remain intact; each pool can be allocated once.',
      scReallocMonth:'Month',scReallocReceiptsTitle:'Receipts to allocate',scReallocStaffTitle:'Recipients',scReallocExecute:'Allocate selected SC',
      scReallocEmpty:'No unallocated SC in this month.',scReallocNoStaff:'No eligible SC staff. Enable and save recipients in the SC eligible users section above.',
      scReallocPrevent:'SC sharing is enabled, but no eligible staff are selected. New checkouts will leave SC unallocated.',
      scReallocTotal:'Unallocated total',scReallocSelected:'Selected receipts',scReallocPreview:'Allocation preview',scReallocApprox:'(rounded per receipt)',
      scReallocConfirm:'Distribute this unallocated SC equally among selected staff?',scReallocDone:'Allocated',scReallocPartial:'Receipts not allocated',scReallocFailed:'Could not allocate SC. Refresh the receipt state and retry.',
      scReallocHistoryTitle:'Allocation history',scReallocHistoryEmpty:'No allocations in this month.',scReallocHistoryBy:'Performed by'}
  };
  function ct(key){return configText[I18n.lang()==='en'?'en':'ja'][key];}
  function localizeConfig(){
    document.querySelectorAll('#pane-config [data-t],#pane-sc [data-t],.cm-tabs [data-t="tabConfig"]').forEach(function(el){
      var key=el.getAttribute('data-t'),value=ct(key);if(value)el.textContent=value;
    });
    if(drinksLoaded){renderDrinkCategories();renderDrinkList();}
    renderCommissionStaff();
  }
  function renderFeatureControls(){
    var f=state.features||{};
    $('cmFeatureSc').checked=!!f.commissionScEnabled;
    $('cmFeatureOrder').checked=!!f.commissionOrderEnabled;
    $('cmFeatureOrderRate').value=String(f.commissionOrderDefaultPercent==null?0:f.commissionOrderDefaultPercent);
    toggleFeatureDetails();
    if(drinksLoaded)renderDrinkList();
  }
  function toggleFeatureDetails(){
    $('cmOrderRateWrap').style.display=$('cmFeatureOrder').checked?'':'none';
  }
  ['cmFeatureSc','cmFeatureOrder'].forEach(function(id){$(id).addEventListener('change',toggleFeatureDetails);});
  $('cmSaveFeatures').onclick=function(){
    var order=commissionDecimal($('cmFeatureOrderRate').value,100);
    if(order===null){msg(ct('invalidRate'),false);return;}
    var patch={
      commissionScEnabled:$('cmFeatureSc').checked?'on':'off',
      commissionOrderEnabled:$('cmFeatureOrder').checked?'on':'off',
      commissionOrderDefaultPercent:String(order)
    };
    var button=this;button.disabled=true;
    rpc('saveCommissionFeatureSettings',[patch]).then(function(result){
      if(!result||!result.success)throw new Error(result&&result.error||'save_failed');
      msg(I18n.t('saved'),true);return reload(true);
    }).catch(fail).finally(function(){button.disabled=false;});
  };

  function selectedCommissionStaff(){
    return Array.from($('cmCommissionStaffList').querySelectorAll('[data-commission-employee]:checked'))
      .map(function(input){return input.getAttribute('data-commission-employee');}).sort();
  }
  function updateCommissionStaffSave(){
    var saved=(state.scEmployees||[]).filter(function(u){return u.commissionEligible;}).map(function(u){return String(u.id);}).sort();
    var selected=selectedCommissionStaff();
    $('cmSaveCommissionStaff').disabled=JSON.stringify(saved)===JSON.stringify(selected);
    $('cmCommissionStaffCount').textContent=ct('commissionStaffCount').replace('{count}',String(selected.length));
  }
  function renderCommissionStaff(){
    var rows=state.scEmployees||[];
    $('cmCommissionStaffList').innerHTML=rows.length?rows.map(function(u){
      var active=u.status==='在籍';
      return '<div class="cm-sc-user"><div style="min-width:0"><div class="cm-name" data-iz-ellipsis="staff" title="'+esc(u.name)+'">'+esc(u.name)+'</div>'+
        '<div class="cm-meta">'+esc(I18n.systemText(u.role)||u.role)+(active?'':' · '+esc(ct('scInactive')))+'</div></div>'+
        '<label class="cm-check"><input type="checkbox" data-commission-employee="'+esc(u.id)+'"'+
        (u.commissionEligible?' checked':'')+(active?'':' disabled')+' aria-label="'+esc(u.name+' '+ct('commissionStaffEligible'))+'">'+
        esc(ct('commissionStaffEligible'))+'</label></div>';
    }).join(''):'<p class="cm-empty">'+esc(ct('scNoUsers'))+'</p>';
    $('cmCommissionStaffList').querySelectorAll('[data-commission-employee]').forEach(function(input){
      input.addEventListener('change',updateCommissionStaffSave);
    });
    updateCommissionStaffSave();
  }
  $('cmSaveCommissionStaff').onclick=function(){
    var ids=selectedCommissionStaff(),button=this;
    button.disabled=true;
    var notice=$('cmCommissionStaffMsg');notice.className='cm-msg';notice.textContent='';
    rpc('saveCommissionEligibleStaff',[ids]).then(function(result){
      if(!result||!result.success)throw new Error(result&&result.error||'save_failed');
      return reload(true).then(function(){
        notice.textContent=I18n.t('saved');notice.className='cm-msg ok';
      });
    }).catch(function(e){
      notice.textContent=I18n.t('error')+API.userErrorText(e);notice.className='cm-msg err';
    }).finally(updateCommissionStaffSave);
  };

  var drinks=[],savedDrinks={},drinksLoaded=false,drinkCategory='';
  function drinkCopy(row){return {id:String(row.id),name:String(row.name||''),nameJa:String(row.nameJa||''),nameEn:String(row.nameEn||''),
    category:String(row.category||''),categoryJa:String(row.categoryJa||''),categoryEn:String(row.categoryEn||''),
    imageUrl:String(row.imageUrl||''),price:Number(row.price)||0,enabled:row.enabled===true||Number(row.enabled)===1,
    extraPrice:String(row.extraPrice==null?0:row.extraPrice),
    extraPriceMode:row.extraPriceMode==='percent'?'percent':'fixed',selected:false};}
  function drinkCategoryName(row){return loc(row.categoryJa,row.categoryEn,row.category)||ct('drinkNoCategory');}
  function renderDrinkCategories(){
    var categories=[],seen=new Set();
    drinks.forEach(function(row){if(row.category&&!seen.has(row.category)){seen.add(row.category);categories.push(row);}});
    if(drinkCategory&&!seen.has(drinkCategory))drinkCategory='';
    var el=$('cmDrinkCategories');
    el.setAttribute('aria-label',ct('drinkCategoryFilter'));
    el.innerHTML='<button type="button" class="cm-drink-cat-tab'+(drinkCategory===''?' on':'')+'" data-drink-category="" aria-pressed="'+(drinkCategory===''?'true':'false')+'">'+
      esc(ct('drinkAllCategories'))+'</button>'+categories.map(function(row){
        var selected=drinkCategory===row.category;
        return '<button type="button" class="cm-drink-cat-tab'+(selected?' on':'')+'" data-drink-category="'+esc(row.category)+
          '" aria-pressed="'+(selected?'true':'false')+'">'+esc(drinkCategoryName(row))+'</button>';
      }).join('');
  }
  $('cmDrinkCategories').addEventListener('click',function(event){
    var button=event.target.closest&&event.target.closest('[data-drink-category]');
    if(!button)return;
    drinkCategory=button.getAttribute('data-drink-category')||'';
    renderDrinkCategories();renderDrinkList();
  });
  function drinkChanged(row){
    var prior=savedDrinks[row.id];return prior&&
      (row.enabled!==prior.enabled||Number(row.extraPrice)!==Number(prior.extraPrice)||row.extraPriceMode!==prior.extraPriceMode);
  }
  function visibleDrinks(){
    var query=String($('cmDrinkSearch').value||'').trim().toLocaleLowerCase();
    return drinks.filter(function(row){return (!drinkCategory||row.category===drinkCategory)&&
      (!query||[row.name,row.nameJa,row.nameEn,row.category,row.categoryJa,row.categoryEn].some(function(v){
      return v.toLocaleLowerCase().indexOf(query)!==-1;
    }));});
  }
  function drinkPriceValid(raw,mode){return /^\d+(?:\.\d{1,2})?$/.test(String(raw).trim())&&Number(raw)<=(mode==='percent'?100:1000000000);}
  function selectedDrinks(){return drinks.filter(function(d){return d.selected;});}
  function drinkModeSelect(row){
    return '<select data-drink-mode="'+esc(row.id)+'" aria-label="'+esc(ct('drinkBulkMode')+' '+loc(row.nameJa,row.nameEn,row.name))+'">'+
      '<option value="fixed"'+(row.extraPriceMode==='fixed'?' selected':'')+'>'+esc(ct('drinkModeFixedShort'))+'</option>'+
      '<option value="percent"'+(row.extraPriceMode==='percent'?' selected':'')+'>'+esc(ct('drinkModePercentShort'))+'</option></select>';
  }
  function renderDrinkSummary(){
    $('cmDrinkSummary').textContent=ct('drinkCount')+': '+drinks.filter(function(d){return d.enabled;}).length+' / '+drinks.length+
      ' · '+visibleDrinks().length+' '+(I18n.lang()==='en'?'shown':'件表示')+' · '+ct('drinkSelected')+': '+selectedDrinks().length;
  }
  function renderDrinkList(){
    var rows=visibleDrinks(),el=$('cmDrinkList');
    if(!rows.length){el.innerHTML='';el.textContent=ct('drinkEmpty');renderDrinkSummary();return;}
    el.innerHTML=rows.map(function(row){
      var name=loc(row.nameJa,row.nameEn,row.name);
      var image=API.imageUrl?API.imageUrl(row.imageUrl):(/^https:\/\//i.test(row.imageUrl)?row.imageUrl:'');
      var thumb=image?'<img class="cm-drink-thumb" src="'+esc(image)+'" loading="lazy" decoding="async" alt="">':
        '<span class="cm-drink-thumb cm-drink-thumb-empty" aria-hidden="true">🍽️</span>';
      return '<div class="cm-drink-row"><div class="cm-drink-name">'+
        '<label class="cm-drink-pick"><input type="checkbox" data-drink-select="'+esc(row.id)+'" aria-label="'+esc(ct('drinkSelect')+' '+name)+'"'+(row.selected?' checked':'')+'></label>'+thumb+
        '<div class="cm-drink-info"><strong data-iz-ellipsis="item" title="'+esc(name)+'">'+esc(name)+'</strong>'+
        '<div class="cm-drink-meta"><span class="cm-drink-category-label" data-iz-ellipsis="category" title="'+esc(drinkCategoryName(row))+'">'+
        esc(drinkCategoryName(row))+'</span><strong class="cm-drink-price" aria-label="'+esc(ct('drinkItemPrice')+' '+money(row.price))+'">'+esc(money(row.price))+'</strong></div>'+
        '<label class="cm-switch"><input type="checkbox" aria-label="'+esc(ct('drinkEligible')+' '+name)+
        '" data-drink-id="'+esc(row.id)+'"'+(row.enabled?' checked':'')+'>'+esc(ct('drinkEligible'))+'</label></div></div>'+
        '<div class="cm-field"><label>'+esc(ct('drinkExtra'))+'</label>'+drinkModeSelect(row)+
        '<input aria-label="'+esc(ct('drinkExtra')+' '+name)+
        '" type="number" min="0" max="'+(row.extraPriceMode==='percent'?'100':'1000000000')+'" step="0.01" inputmode="decimal" data-drink-extra="'+esc(row.id)+'" value="'+
        esc(row.extraPrice)+'"></div></div>';
    }).join('');
    renderDrinkSummary();
  }
  function handleDrinkChange(event){
    var input=event.target,id=input.getAttribute('data-drink-id')||input.getAttribute('data-drink-extra')||
      input.getAttribute('data-drink-select')||input.getAttribute('data-drink-mode');
    if(!id)return;
    var row=drinks.find(function(d){return d.id===id;});if(!row)return;
    if(input.hasAttribute('data-drink-id')){row.enabled=input.checked;renderDrinkList();}
    else if(input.hasAttribute('data-drink-select')){row.selected=input.checked;}
    else if(input.hasAttribute('data-drink-mode')){row.extraPriceMode=input.value==='percent'?'percent':'fixed';renderDrinkList();}
    else row.extraPrice=input.value;
    clearDrinkMsg();
    renderDrinkSummary();
  }
  $('cmDrinkList').addEventListener('change',handleDrinkChange);
  $('cmDrinkList').addEventListener('input',handleDrinkChange);
  $('cmDrinkSearch').addEventListener('input',renderDrinkList);
  $('cmDrinkBulkPrice').addEventListener('input',clearDrinkMsg);
  $('cmDrinkBulkMode').onchange=function(){
    var percent=this.value==='percent',field=$('cmDrinkBulkPrice');
    field.max=percent?'100':'1000000000';
    field.placeholder=percent?'10':'200';
    clearDrinkMsg();
  };
  $('cmDrinkSelectShown').onclick=function(){visibleDrinks().forEach(function(d){d.selected=true;});clearDrinkMsg();renderDrinkList();};
  $('cmDrinkClearShown').onclick=function(){visibleDrinks().forEach(function(d){d.selected=false;});clearDrinkMsg();renderDrinkList();};
  function bulkDrinkToggle(enabled){
    var selected=selectedDrinks();
    if(!selected.length){drinkMsg(ct('drinkNoneSelected'),false);return;}
    selected.forEach(function(d){d.enabled=enabled;});clearDrinkMsg();renderDrinkList();
  }
  $('cmDrinkEnableSelected').onclick=function(){bulkDrinkToggle(true);};
  $('cmDrinkDisableSelected').onclick=function(){bulkDrinkToggle(false);};
  $('cmDrinkApplyBulk').onclick=function(){
    var selected=selectedDrinks(),value=$('cmDrinkBulkPrice').value,
      mode=$('cmDrinkBulkMode').value==='percent'?'percent':'fixed';
    if(!selected.length){drinkMsg(ct('drinkNoneSelected'),false);return;}
    if(!drinkPriceValid(value,mode)){drinkMsg(ct('invalidAmount'),false);return;}
    clearDrinkMsg();
    selected.forEach(function(d){d.extraPrice=value;d.extraPriceMode=mode;});renderDrinkList();
  };
  function loadDrinks(){
    return rpc('getCommissionDrinkItems',[]).then(function(rows){
      if(!Array.isArray(rows))throw new Error('invalid_commission_drink_response');
      var selectedIds=new Set(selectedDrinks().map(function(d){return d.id;}));
      drinks=rows.map(drinkCopy);
      drinks.forEach(function(d){d.selected=selectedIds.has(d.id);});
      savedDrinks=Object.fromEntries(drinks.map(function(d){return [d.id,{enabled:d.enabled,extraPrice:d.extraPrice,extraPriceMode:d.extraPriceMode}];}));
      drinksLoaded=true;renderDrinkCategories();renderDrinkList();
    }).catch(function(error){
      $('cmDrinkList').textContent=ct('drinkLoadError');
      $('cmDrinkSummary').textContent='';
      drinkMsg(ct('drinkLoadError'),false);
      throw error;
    });
  }
  $('cmSaveDrinks').onclick=function(){
    if(!drinksLoaded){drinkMsg(ct('drinkLoadError'),false);return;}
    var changed=drinks.filter(drinkChanged);
    if(!changed.length){drinkMsg(ct('nothingChanged'),true);return;}
    if(changed.some(function(d){return !drinkPriceValid(d.extraPrice,d.extraPriceMode);})){
      drinkMsg(ct('invalidAmount'),false);return;
    }
    clearDrinkMsg();
    var button=this;button.disabled=true;
    // Save only edited items, not the entire menu, to reduce overwrite races.
    var payload=changed.map(function(d){
      var before=savedDrinks[d.id],patch={id:d.id};
      if(d.enabled!==before.enabled||Number(d.extraPrice)!==Number(before.extraPrice)||d.extraPriceMode!==before.extraPriceMode){
        patch.enabled=d.enabled;patch.extraPrice=Number(d.extraPrice);patch.extraPriceMode=d.extraPriceMode;
      }
      return patch;
    });
    rpc('saveCommissionDrinkItems',[payload]).then(function(result){
      if(!result||!result.success)throw new Error(result&&result.error||'save_failed');
      return loadDrinks().then(function(){drinkMsg(I18n.t('saved'),true);});
    }).catch(function(e){fail(e,'drinks');}).finally(function(){button.disabled=false;});
  };

  function scStaffChanges(){
    var current=state.scEmployees||[];
    return Array.from($('cmScStaffList').querySelectorAll('[data-sc-employee]')).flatMap(function(input){
      var row=current.find(function(u){return String(u.id)===input.getAttribute('data-sc-employee');});
      return row && input.checked!==!!row.scDistributionEligible ? [{id:String(row.id),eligible:input.checked}] : [];
    });
  }
  function updateScStaffSave(){ $('cmSaveScStaff').disabled=scStaffChanges().length===0; }
  function renderScStaff(){
    var rows=state.scEmployees||[];
    $('cmScStaffList').innerHTML=rows.length?rows.map(function(u){
      var active=u.status==='在籍';
      return '<div class="cm-sc-user"><div style="min-width:0"><div class="cm-name" data-iz-ellipsis="staff" title="'+esc(u.name)+'">'+esc(u.name)+'</div>'+
        '<div class="cm-meta">'+esc(I18n.systemText(u.role)||u.role)+(active?'':' · '+esc(ct('scInactive')))+'</div></div>'+
        '<label class="cm-check"><input type="checkbox" data-sc-employee="'+esc(u.id)+'"'+
          (u.scDistributionEligible?' checked':'')+(active?'':' disabled')+' aria-label="'+esc(u.name+' '+ct('scEligibleLabel'))+'">'+esc(ct('scEligibleLabel'))+'</label></div>';
    }).join(''):'<p class="cm-empty">'+esc(ct('scNoUsers'))+'</p>';
    $('cmScStaffList').querySelectorAll('[data-sc-employee]').forEach(function(input){input.addEventListener('change',updateScStaffSave);});
    var eligible=rows.filter(function(u){return u.status==='在籍'&&!!u.scDistributionEligible;});
    $('cmScEligibleCount').textContent=I18n.t('eligibleStaffCount').replace('{count}',String(eligible.length))+(eligible.length?'':I18n.t('noEligibleStaff'));
    updateScStaffSave();
  }
  $('cmSaveScStaff').onclick=function(){
    var changes=scStaffChanges();if(!changes.length)return;
    var button=this;button.disabled=true;
    rpc('saveCommissionScEligibleStaff',[changes]).then(function(result){
      if(!result||!result.success)throw new Error(result&&result.error||'save_failed');
      msg(I18n.t('saved'),true);return reload(true);
    }).catch(fail).finally(function(){updateScStaffSave();});
  };
  var scReallocReceiptSelection=null,scReallocStaffSelection=null,scReallocBusy=false;
  function selectedScReallocReceipts(){
    return Array.from($('cmScReallocReceipts').querySelectorAll('[data-sc-realloc-receipt]:checked'))
      .map(function(input){return input.getAttribute('data-sc-realloc-receipt');});
  }
  function selectedScReallocStaff(){
    return Array.from($('cmScReallocStaff').querySelectorAll('[data-sc-realloc-employee]:checked'))
      .map(function(input){return input.getAttribute('data-sc-realloc-employee');});
  }
  function updateScReallocPreview(){
    var rows=(state.report&&state.report.unallocatedReceipts||[]).filter(function(row){
      return selectedScReallocReceipts().indexOf(String(row.receiptNo))>=0;
    });
    var ids=selectedScReallocStaff().sort(),total=rows.reduce(function(n,r){return n+(Number(r.amount)||0);},0);
    var code=String(state.settings&&state.settings.currencyCode||'').toUpperCase();
    var digits=code==='PHP'?2:code==='JPY'?0:Math.max(0,Math.min(3,Number(state.settings&&state.settings.currencyDecimalDigits)||0));
    var factor=Math.pow(10,digits),byStaff={};
    ids.forEach(function(id){byStaff[id]=0;});
    if(ids.length)rows.forEach(function(row){
      var units=Math.round((Number(row.amount)||0)*factor),base=Math.floor(units/ids.length),rest=units-base*ids.length;
      ids.forEach(function(id,i){byStaff[id]+=(base+(i<rest?1:0))/factor;});
    });
    var names=Object.fromEntries((state.scEmployees||[]).map(function(s){return [String(s.id),s.name];}));
    $('cmScReallocPreview').innerHTML='<strong>'+esc(ct('scReallocSelected'))+': '+rows.length+' / '+money(total)+'</strong>'+
      (ids.length?'<span class="cm-meta">'+esc(ct('scReallocPreview'))+' '+esc(ct('scReallocApprox'))+'</span>'+ids.map(function(id){
        return '<div class="cm-rowtop"><span>'+esc(names[id]||id)+'</span><strong>'+money(byStaff[id])+'</strong></div>';
      }).join(''):'');
    $('cmScReallocate').disabled=scReallocBusy||!rows.length||!ids.length;
    scReallocReceiptSelection=selectedScReallocReceipts();scReallocStaffSelection=selectedScReallocStaff();
    return {receiptNos:rows.map(function(r){return String(r.receiptNo);}),employeeIds:ids,total:total};
  }
  function renderScReallocation(){
    var rows=state.report&&state.report.unallocatedReceipts||[],staff=(state.scEmployees||[]).filter(function(u){
      return u.status==='在籍'&&!!u.scDistributionEligible;
    });
    var month=state.report&&state.report.month||$('cmMonth').value;
    $('cmScReallocMonth').value=month;
    // Keep the shared regional month overlay in sync after an RPC refresh.
    if(window.DateDisplay&&typeof DateDisplay.refresh==='function')DateDisplay.refresh();
    var receiptSet=new Set(rows.map(function(r){return String(r.receiptNo);}));
    var staffSet=new Set(staff.map(function(s){return String(s.id);}));
    // Never preselect money movements. The manager must explicitly pick both
    // the original receipts and beneficiaries before confirming a distribution.
    if(scReallocReceiptSelection===null)scReallocReceiptSelection=[];
    else scReallocReceiptSelection=scReallocReceiptSelection.filter(function(id){return receiptSet.has(id);});
    if(scReallocStaffSelection===null)scReallocStaffSelection=[];
    else scReallocStaffSelection=scReallocStaffSelection.filter(function(id){return staffSet.has(id);});
    $('cmScReallocTotal').textContent=ct('scReallocTotal')+': '+money(state.report&&state.report.unallocatedTotal||0);
    var noStaffWarn=$('cmScNoEligibleWarn');
    var warnNoStaff=!staff.length,scEnabled=!!(state.features&&state.features.commissionScEnabled);
    noStaffWarn.hidden=!warnNoStaff;
    noStaffWarn.textContent=warnNoStaff?(scEnabled&&Number(state.settings&&state.settings.staffSharePercent)>0?
      ct('scReallocPrevent')+' '+ct('scReallocNoStaff'):ct('scReallocNoStaff')):'';
    $('cmScReallocReceipts').innerHTML=rows.length?rows.map(function(r){
      var id=String(r.receiptNo),date=window.DateDisplay?DateDisplay.formatDateTime(r.createdAt):'';
      return '<label class="cm-row"><input type="checkbox" data-sc-realloc-receipt="'+esc(id)+'"'+
        (scReallocReceiptSelection.indexOf(id)>=0?' checked':'')+'><span class="cm-name cm-sc-realloc-id" title="'+esc(id)+'">'+esc(id)+'</span>'+
        '<strong class="cm-sc-realloc-amount">'+money(r.amount)+'</strong><span class="cm-meta cm-sc-realloc-date">'+esc(date)+'</span></label>';
    }).join(''):'<p class="cm-empty">'+esc(ct('scReallocEmpty'))+'</p>';
    $('cmScReallocStaff').innerHTML=staff.map(function(s){
      var id=String(s.id);
      return '<label class="cm-check"><input type="checkbox" data-sc-realloc-employee="'+esc(id)+'"'+
        (scReallocStaffSelection.indexOf(id)>=0?' checked':'')+'><span>'+esc(s.name)+'</span></label>';
    }).join('');
    var history=state.report&&state.report.scReallocationHistory||[];
    $('cmScReallocHistory').innerHTML=history.length?history.map(function(r){
      var ids=[],names=[];
      try{ids=JSON.parse(r.employeeIdsJson||'[]');names=JSON.parse(r.employeeNamesJson||'[]');}catch(e){}
      var recipients=ids.map(function(id,i){return names[i]||id;}).join(', ');
      var date=window.DateDisplay?DateDisplay.formatUtcDateTime(r.allocatedAt):'';
      return '<div class="cm-row"><div class="cm-rowtop"><div class="cm-name" title="'+esc(r.receiptNo)+'">'+esc(r.receiptNo)+'</div><strong>'+money(r.amount)+'</strong></div>'+
        '<div class="cm-meta">'+esc(date)+' · '+esc(ct('scReallocHistoryBy'))+': '+esc(r.actorName||r.actorEmployeeId)+'</div>'+
        '<div class="cm-meta" style="white-space:normal">'+esc(recipients)+'</div></div>';
    }).join(''):'<p class="cm-empty">'+esc(ct('scReallocHistoryEmpty'))+'</p>';
    ['cmScReallocReceipts','cmScReallocStaff'].forEach(function(id){
      $(id).querySelectorAll('input[type=checkbox]').forEach(function(input){input.addEventListener('change',updateScReallocPreview);});
    });
    updateScReallocPreview();
  }
  $('cmScReallocMonth').onchange=function(){
    scReallocReceiptSelection=null;scReallocStaffSelection=null;
    $('cmMonth').value=this.value;
    if(window.DateDisplay&&typeof DateDisplay.refresh==='function')DateDisplay.refresh();
    reload();
  };
  $('cmScReallocate').onclick=async function(){
    var selection=updateScReallocPreview();
    if(scReallocBusy||!selection.receiptNos.length||!selection.employeeIds.length)return;
    var summary=selection.receiptNos.length+' / '+money(selection.total)+' / '+selection.employeeIds.length+' '+I18n.t('people');
    if(!await UIConfirm(ct('scReallocConfirm')+'\n'+summary))return;
    scReallocBusy=true;updateScReallocPreview();
    var resultNode=$('cmScReallocResult');resultNode.className='cm-msg';resultNode.textContent='';
    var successful=0,failed=[];
    try{
      for(var i=0;i<selection.receiptNos.length;i+=20){
        var part=selection.receiptNos.slice(i,i+20),response;
        try{
          response=await rpc('reallocateUnallocatedSc',[{month:$('cmScReallocMonth').value,
            receiptNos:part,employeeIds:selection.employeeIds}]);
          if(!response||!response.success)throw new Error(response&&response.error||'sc_reallocation_failed');
          successful+=Number(response.processed)||0;
          (response.results||[]).forEach(function(r){if(!r.success)failed.push(String(r.receiptNo));});
        }catch(error){failed.push.apply(failed,part);}
      }
      scReallocReceiptSelection=null;scReallocStaffSelection=null;
      await reload(true);
      resultNode.className='cm-msg '+(failed.length?'err':'ok');
      resultNode.textContent=ct('scReallocDone')+': '+successful+' / '+selection.receiptNos.length+
        (failed.length?' · '+ct('scReallocPartial')+': '+failed.join(', '):'');
    }catch(error){
      resultNode.className='cm-msg err';resultNode.textContent=ct('scReallocFailed');
    }finally{scReallocBusy=false;updateScReallocPreview();}
  };
  document.querySelector('[data-pane="config"]').addEventListener('click',function(){
    if(!drinksLoaded)loadDrinks().catch(function(){/* clear error is shown in the editor */});
  });

  function render(){
    var features=state.features||{};
    var historicalOptionAssignment=(state.receipts||[]).some(function(r){return (r.optionSnapshots||[]).length>0;});
    var historicalItemAssignment=(state.receipts||[]).some(function(r){return Number(r.commissionPreview)>0;});
    document.querySelectorAll('.cm-tabs button').forEach(function(button){
      var pane=button.getAttribute('data-pane');
      button.style.display=(pane==='assign'&&!features.commissionOrderEnabled&&!historicalOptionAssignment&&!historicalItemAssignment)?'none':'';
    });
    if(!features.commissionOrderEnabled&&!historicalOptionAssignment&&!historicalItemAssignment && $('pane-assign').classList.contains('on')) switchPane('report');
    renderOrders();renderReport();
    renderFeatureControls();
    renderCommissionStaff();
    $('cmScRate').value=Number(state.settings.staffSharePercent)||0;$('cmScMethod').value='equal';
    renderScStaff();renderScReallocation();
  }
  function reload(keepMessage){
    return rpc('getCommissionWorkspace',[$('cmMonth').value||currentMonth()]).then(function(data){state=data||state;render();}).catch(function(e){if(!keepMessage)fail(e);});
  }
  $('cmSaveSc').onclick=function(){
    var field=$('cmScRate'),rate=commissionDecimal(field.value,100);
    if(rate===null||field.validity.badInput){msg(I18n.lang()==='en'?'Enter a valid staff share (0–100, at most 2 decimals).':'分配率は0～100の小数2桁以内で入力してください。',false);field.focus();return;}
    var btn=this;btn.disabled=true;
    rpc('saveCommissionSettings',[{staffSharePercent:rate,allocationMethod:$('cmScMethod').value}]).then(function(r){btn.disabled=false;if(!r||!r.success)throw new Error(r&&r.error||'save_failed');msg(I18n.t('saved'),true);return reload(true);}).catch(function(e){btn.disabled=false;fail(e);});
  };
  $('cmMonth').value=currentMonth();
  // DateDisplay overlays do not observe changes to input.value. Keep the
  // visible month synchronized when initializing the actual business month.
  if(window.DateDisplay && typeof DateDisplay.refresh==='function')DateDisplay.refresh();
  $('cmMonth').onchange=reload;
  $('cmAssignmentFilter').onchange=renderOrders;

  I18n.init({
    ja:{title:'💰 歩合・スタッフ報酬',lead:'会計伝票の担当割当、歩合・サービス料分配・支払状況を管理します。',tabAssign:'オーダー\n割当',tabSc:'SC分配',tabReport:'報酬レポート',assignWarn:'会計後に伝票単位で担当者を選ぶと、会計時のVAT・サービス料・割引・入場／延長料金を除いた売上×設定率でオーダー別コミッションを配分します。SC分配は別設定です。',openOrders:'会計済み伝票の担当割当',scTitle:'Service Chargeのスタッフ分配',staffShare:'徴収したSCのうちスタッフへ分配する割合（%）',allocationMethod:'分配方法',equal:'対象の在籍スタッフ全員で均等',salesWeight:'担当売上比率',scNote:'従業員マスタでSC分配対象ON、かつ在籍中のスタッフ全員で均等分配します。注文担当や出勤状況は問いません。対象者が0人でも会計は継続し、未分配額を記録します。',eligibleStaffCount:'現在のSC分配対象: {count}人',noEligibleStaff:'。対象者がいないためSCは未分配で記録されます。',unallocatedReport:'SC未分配額（対象スタッフなし）：',reportTitle:'月別スタッフ報酬',noRules:'ルールはまだありません。',noOrders:'対象の会計伝票はありません。',noReport:'この月の報酬はありません。',perItem:'個',enabled:'有効',disabled:'停止',edit:'編集',delete:'削除',deleteConfirm:'この歩合ルールを削除しますか？',deleted:'削除しました。',saved:'保存しました。',needRuleName:'ルール名を入力してください。',needScopeValue:'対象を選択してください。',invalidRuleValue:'金額 / %を正しい数値で入力してください（%は0〜100）。',invalidPeriod:'終了日は開始日以降にしてください。',error:'エラー: ',planRuleLimit:'Freeプランでは有効な歩合ルールは1件までです。',planScLimit:'Service Chargeの自動分配はProプランの機能です。',table:'卓',people:'名',unassigned:'未割当',saveAssignment:'担当を保存',assignmentSaved:'担当者を保存しました。',total:'合計',orderCommission:'オーダー別コミッション',drinkCommission:'コミッション対象メニュー手当',legacyItemCommission:'旧会計歩合（履歴）',itemCommission:'会計歩合',serviceShare:'SC分配',unpaid:'未払い',markPaid:'支払済みにする',paidConfirm:'このスタッフの表示月の未払い報酬を支払済みにしますか？',paidSaved:'支払済みに更新しました。',assignmentFilter:'表示対象',onlyUnassigned:'未割当のみ',allAssignments:'すべて',onlyAssigned:'割当済みのみ'},
    en:{title:'💰 Staff Commission',lead:'Assign staff to completed receipts and manage commissions, service-charge sharing and payouts.',tabAssign:'Order\nassignment',tabSc:'SC sharing',tabReport:'Payout report',assignWarn:'After checkout, assign staff to each receipt to share order commission calculated using the discounted receipt total less VAT, service charge and entry/extension fees, at the checkout-time rate. SC sharing is separate.',openOrders:'Receipt assignments',scTitle:'Staff share of Service Charge',staffShare:'Staff share of collected Service Charge (%)',allocationMethod:'Allocation method',equal:'Equal among all eligible active staff',salesWeight:'Assigned sales ratio',scNote:'All active employees with SC eligibility enabled share equally, regardless of assignments or attendance. When no staff are eligible, checkout continues and the undistributed amount is recorded.',eligibleStaffCount:'Currently eligible SC staff: {count}',noEligibleStaff:'. No eligible staff: SC will be recorded as unallocated.',unallocatedReport:'Unallocated SC (no eligible staff):',reportTitle:'Monthly staff payouts',noRules:'No rules yet.',noOrders:'No matching receipts.',noReport:'No commission for this month.',perItem:'item',enabled:'Active',disabled:'Inactive',edit:'Edit',delete:'Delete',deleteConfirm:'Delete this commission rule?',deleted:'Deleted.',saved:'Saved.',needRuleName:'Enter a rule name.',needScopeValue:'Select a target.',invalidRuleValue:'Enter a valid amount / percentage (percentage must be 0–100).',invalidPeriod:'End date must be on or after the start date.',error:'Error: ',planRuleLimit:'The Free plan supports one active commission rule.',planScLimit:'Automatic Service Charge distribution is a Pro feature.',table:'Table',people:'staff',unassigned:'Unassigned',saveAssignment:'Save assignment',assignmentSaved:'Assignment saved.',total:'Total',orderCommission:'Order commission',drinkCommission:'Commission-menu extra payout',legacyItemCommission:'Legacy receipt commission',itemCommission:'Receipt commission',serviceShare:'SC share',unpaid:'Unpaid',markPaid:'Mark paid',paidConfirm:'Mark this staff member’s unpaid entries for the displayed month as paid?',paidSaved:'Marked as paid.',assignmentFilter:'Show',onlyUnassigned:'Unassigned only',allAssignments:'All',onlyAssigned:'Assigned only'}
  },function(){document.title=I18n.lang()==='en'?'Staff Commission':'歩合・スタッフ報酬';render();localizeConfig();});
  if(window.HelpUI)HelpUI.register({title:'歩合・スタッフ報酬',titleEn:'Staff Commission',items:[
    {ja:'① 会計は担当未割当でも完了します。後から会計伝票単位で担当を設定できます。',en:'① Checkout is not blocked by missing staff. Assign staff to a receipt after payment.'},
    {ja:'② 「コミッション設定」でVAT・サービス料控除後の売上に対するオーダー別コミッション率を設定します。商品ごとのルールは不要です。',en:'② Set the commission percentage on sales excluding VAT and service charge under Commission settings. No per-product rules are required.'},
    {ja:'③ 「SC分配」タブでユーザーごとの分配対象をチェックし保存します。在籍スタッフだけに均等分配されます。',en:'③ On the SC sharing tab, choose eligible users and save. Only active employees share equally.'},
    {ja:'④ 会計時の率で確定した報酬は維持します。会計時にコミッション0だった伝票は、担当者保存時に現在の率で初回計算します。',en:'④ Existing checkout commission is frozen. When the receipt originally had zero commission, saving a staff assignment applies the current rate once.'},
    {ja:'⑤ 「SC分配」の「過去の未分配SCを再配分」では対象月・伝票・スタッフを選び、未分配額を均等に再配分します。実行後は履歴を確認でき、同じ金額の二重配分はできません。',en:'⑤ Under SC sharing, open Reallocate previously unallocated SC. Choose a month, receipts and eligible staff to split the outstanding amounts equally. Review the history afterward; amounts cannot be allocated twice.'},
    {ja:'⑥ 「コミッション対象メニュー」では商品画像左のチェックで一括操作する商品を選びます。「表示中を全選択／選択解除」は選択だけを変更し、コミッションON/OFFは別ボタンで切り替えます。固定額か商品価格の%を設定したら必ず保存してください。',en:'⑥ Under Commission-eligible menu items, the checkbox left of each image selects items for bulk actions only. Use the separate Commission ON/OFF buttons, choose a fixed amount or percent of the item price, then save.'}
  ]});
  function restoreCommissionAfterPageShow(){
    return API.pageReady({auth:'optional'}).then(function(ctx){
      token=ctx.token||API.currentToken()||'';
      if(token)return reload(true);
    });
  }
  authReady.then(function(ok){if(ok)reload();});
  window.addEventListener('pageshow',function(event){if(event&&event.persisted)restoreCommissionAfterPageShow().catch(fail);});
})();
