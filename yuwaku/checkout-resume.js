/* Durable checkout readback hints. Never persist credentials or payment data.
 * A hint permits ONLY getCheckoutOutcome; it must never replay finalizeBill.
 * Shared by Native, Web PROD and Web TEST admin screens.
 */
(function(global){
  'use strict';
  var PREFIX='izakanpai:checkout-resume:v1:';
  var PENDING_MS=7*86400000, CONFIRMED_MS=86400000, MAX=20;
  var busy=false;
  function store(){
    var id=String(global.API&&global.API.currentStoreId&&
      global.API.currentStoreId()||'');
    return /^[a-z0-9][a-z0-9-]{2,31}$/.test(id)?id:'';
  }
  function valid(rec,id,now){
    return !!rec&&rec.store===id&&typeof rec.table==='string'&&
      rec.table.length>0&&rec.table.length<=40&&
      Array.isArray(rec.orderIds)&&rec.orderIds.length>0&&
      rec.orderIds.length<=200&&rec.orderIds.every(function(v){
        return typeof v==='string'&&v.trim()!==''&&v.length<=120;
      })&&new Set(rec.orderIds).size===rec.orderIds.length&&
      Number.isSafeInteger(rec.at)&&rec.at>0&&rec.at<=now&&
      now-rec.at<=(rec.confirmed?CONFIRMED_MS:PENDING_MS);
  }
  function read(){
    var id=store();if(!id)return null;
    try{
      var raw=JSON.parse(localStorage.getItem(PREFIX+id)||'[]');
      if(!Array.isArray(raw))return null;
      var now=Date.now();
      return raw.filter(function(x){return valid(x,id,now);}).slice(-MAX);
    }catch(_){return null;}
  }
  function write(rows){
    var id=store();if(!id||!Array.isArray(rows)||rows.length>MAX)return false;
    try{localStorage.setItem(PREFIX+id,JSON.stringify(rows));return true;}
    catch(_){return false;}
  }
  function same(a,table,ids){
    return a.table===table&&JSON.stringify(a.orderIds)===JSON.stringify(ids);
  }
  function selected(table,ids){
    table=String(table||'');
    if(!Array.isArray(ids))return null;
    ids=ids.map(function(x){return String(x);}).sort();
    var id=store(),rec={store:id,table:table,orderIds:ids,at:Date.now(),confirmed:false};
    return id&&valid(rec,id,rec.at)?rec:null;
  }
  function begin(table,ids){
    var rec=selected(table,ids),rows=read();
    if(!rec||!rows)return false;
    var found=rows.find(function(x){return same(x,rec.table,rec.orderIds);});
    // If a previous send is uncertain, never authorize a second POST.
    if(found)return false;
    if(rows.length>=MAX)return false;
    rows.push(rec);
    return write(rows);
  }
  function mark(table,ids){
    var rec=selected(table,ids),rows=read();if(!rec||!rows)return false;
    var found=rows.find(function(x){return same(x,rec.table,rec.orderIds);});
    if(!found)return false;
    found.confirmed=true;found.at=Date.now();
    return write(rows);
  }
  function discard(table,ids){
    var rec=selected(table,ids),rows=read();if(!rec||!rows)return false;
    return write(rows.filter(function(x){return !same(x,rec.table,rec.orderIds);}));
  }
  function list(){return read()||[];}
  function language(){
    return global.I18n&&global.I18n.lang&&global.I18n.lang()==='en'?'en':'ja';
  }
  function message(container,message,warning){
    var row=document.createElement('div');
    row.textContent=message;
    row.style.cssText='padding:8px 0;line-height:1.55;font-size:13px;'+
      (warning?'color:#92400e;':'color:#065f46;');
    container.appendChild(row);
  }
  function panel(){return document.getElementById('checkoutResumeStatus');}
  function render(results){
    var el=panel();if(!el)return;
    el.textContent='';
    // A confirmed checkout is normal history, not a persistent status card.
    // Show recovery controls only when the result is genuinely unresolved.
    var unresolved=results.filter(function(x){
      var r=x.record,a=x.answer||{};
      return !(r.confirmed===true||(a.status==='settled'&&a.recovered===true&&a.table===r.table&&
        typeof a.orNo==='string'&&a.orNo.length>0&&
        Number.isFinite(Number(a.total))));
    });
    if(!unresolved.length){el.style.display='none';return;}
    el.style.cssText='display:block;margin-top:8px;margin-bottom:8px;'+
      'padding:12px;border:1px solid #e2e8f0;border-radius:11px;'+
      'background:#fff;';
    var en=language()==='en';
    var title=document.createElement('strong');
    title.textContent=en?'Checkout result needs attention':'会計結果の確認が必要です';
    el.appendChild(title);
    unresolved.forEach(function(x){
      var r=x.record,answer=x.answer||{},verified=answer.status==='settled'&&
        answer.recovered===true&&answer.table===r.table&&
        typeof answer.orNo==='string'&&answer.orNo.length>0&&
        Number.isFinite(Number(answer.total));
      message(el,verified?
        ((en?'Settled':'会計済')+' / '+r.table+' / '+answer.orNo+' / '+answer.total):
        ((en?'Not verified — do not charge again. Recheck or inspect receipt history.':
          '未確認：再会計せず、再照会または領収書履歴を確認してください。')+' / '+r.table),!verified);
      if(!verified&&answer.status==='not_settled'&&
         answer.reason==='checkout_receipt_not_persisted'){
        // The server positively confirmed all selected orders are served but
        // no receipt exists. A new checkout is possible only after a second
        // authoritative read AND a deliberate operator click, never on boot.
        var resolve=document.createElement('button');
        resolve.type='button';resolve.className='int-btn';
        resolve.dataset.checkoutResolve='true';
        resolve.textContent=en?'Verify again and allow a new checkout':
          '再照会して未決済を確認し、新規会計を許可';
        resolve.addEventListener('click',async function(){
          if(busy)return;
          busy=true;resolve.disabled=true;
          try{
            var token=global.API&&global.API.currentToken&&global.API.currentToken();
            if(!token||store()!==r.store)return;
            var check=await global.API.post('getCheckoutOutcome',{
              token:token,table:r.table,orderIds:r.orderIds,
              __silent:true,__noInternalRetry:true,
              __timeoutMs:global.API.TIMEOUT_MS.read,
            });
            var result=check&&check.ok!==false&&check.data||{};
            if(result.status==='not_settled'&&
               result.reason==='checkout_receipt_not_persisted'){
              if(discard(r.table,r.orderIds))
                render(results.filter(function(x){return x.record!==r;}));
              else message(el,en?'Local recovery record could not be cleared.':
                '端末内の会計復旧記録を解除できません。',true);
            }else{
              message(el,en?'Recheck did not confirm an unpaid checkout. Do not charge again.':
                '再照会では未決済を確認できません。再決済せず確認してください。',true);
            }
          }catch(_){
            message(el,en?'Server recheck failed. Do not charge again.':
              '再照会に失敗しました。再決済しないでください。',true);
          }finally{busy=false;resolve.disabled=false;}
        });
        el.appendChild(resolve);
      }
    });
  }
  async function refresh(){
    if(busy)return;
    var rows=read(),el=panel();if(!el)return;
    if(!rows||!rows.length){render([]);return;}
    if(typeof navigator!=='undefined'&&navigator.onLine===false){
      render(rows.map(function(record){return {record,answer:null};}));return;
    }
    var token=global.API&&global.API.currentToken&&global.API.currentToken();
    if(!token){render(rows.map(function(record){return {record,answer:null};}));return;}
    var id=store();busy=true;
    try{
      var results=await Promise.all(rows.map(async function(record){
        try{
          var response=await global.API.post('getCheckoutOutcome',{
            token:token,table:record.table,orderIds:record.orderIds,
            __silent:true,__noInternalRetry:true,
            __timeoutMs:global.API.TIMEOUT_MS.read,
          });
          var data=response&&response.ok!==false&&response.data||null;
          if(data&&data.status==='settled'&&data.recovered===true&&
             data.table===record.table&&data.orNo&&Number.isFinite(Number(data.total)))
            mark(record.table,record.orderIds);
          return {record,answer:data};
        }catch(_){return {record,answer:null};}
      }));
      if(store()===id)render(results);
    }finally{busy=false;}
  }
  global.CheckoutResume=Object.freeze({begin,mark,discard,list,refresh});
})(window);
