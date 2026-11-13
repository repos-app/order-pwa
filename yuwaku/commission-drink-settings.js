(function(){
    var commissionDrinkItems=[];
    function commissionDrinkHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function commissionDrinkMoney(v){return String(Number(v)||0);}
    function renderCommissionDrinkItems(){
      var list=$('commissionDrinkList'),en=I18n.lang()==='en';
      if(!commissionDrinkItems.length){list.textContent=en?'No menu products available':'対象商品がありません';return;}
      list.innerHTML=commissionDrinkItems.map(function(item,index){
        return '<div style="display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border)">'+
          '<label style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;font-size:13px">'+
            '<input type="checkbox" data-drink-on="'+index+'" '+(item.enabled?'checked':'')+' style="width:20px;height:20px;flex-shrink:0">'+
            '<span style="overflow-wrap:anywhere">'+commissionDrinkHtml(en?(item.nameEn||item.name):item.name)+
              ' <strong style="color:var(--text-3)">'+(item.enabled?(en?'Eligible':'対象'):(en?'Excluded':'対象外'))+'</strong> <span style="color:var(--text-3)">('+commissionDrinkHtml(item.price)+')</span></span></label>'+
          '<label style="display:flex;flex-direction:column;gap:2px;width:116px;flex-shrink:0;font-size:11px">'+
            (en?'Extra charge':'追加料金')+'<input aria-label="'+(en?'Extra charge':'追加料金')+'" class="fc" type="number" min="0" max="1000000000" step="0.01" data-drink-price="'+index+'" value="'+commissionDrinkHtml(commissionDrinkMoney(item.extraPrice))+'" style="width:100%;padding:8px"></label></div>';
      }).join('');
      list.querySelectorAll('[data-drink-on]').forEach(function(input){input.addEventListener('change',function(){commissionDrinkItems[Number(input.dataset.drinkOn)].enabled=input.checked;renderCommissionDrinkItems();});});
      list.querySelectorAll('[data-drink-price]').forEach(function(input){input.addEventListener('input',function(){commissionDrinkItems[Number(input.dataset.drinkPrice)].extraPrice=input.value;});});
    }
    function validCommissionDrinkPrice(raw){return /^\d+(?:\.\d{1,2})?$/.test(String(raw).trim())&&Number(raw)>=0&&Number(raw)<=1000000000;}
    window.setAllCommissionDrinks=function(on){commissionDrinkItems.forEach(function(x){x.enabled=on;});renderCommissionDrinkItems();};
    window.applyCommissionDrinkBulk=function(){
      var amount=$('commissionDrinkBulkPrice').value;
      if(!validCommissionDrinkPrice(amount)){st('st-commission-drinks',I18n.lang()==='en'?'Enter a non-negative extra charge.':'0以上の追加料金を入力してください。',false);return;}
      commissionDrinkItems.forEach(function(x){if(x.enabled)x.extraPrice=amount;});renderCommissionDrinkItems();
    };
    function loadCommissionDrinks(){
      return rpc('getCommissionDrinkItems',[]).then(function(rows){commissionDrinkItems=(Array.isArray(rows)?rows:[]).map(function(x){return {id:x.id,name:x.name,nameEn:x.nameEn,price:x.price,enabled:Number(x.enabled)===1,extraPrice:x.extraPrice};});renderCommissionDrinkItems();})
        .catch(function(e){st('st-commission-drinks',I18n.t('errPrefix')+API.userErrorText(e),false);});
    }
    window.saveCommissionDrinks=function(){
      if(!commissionDrinkItems.length)return;
      if(commissionDrinkItems.some(function(x){return !validCommissionDrinkPrice(x.extraPrice);})){st('st-commission-drinks',I18n.lang()==='en'?'Enter a non-negative valid extra charge.':'追加料金は0以上の有効な金額を設定してください。',false);return;}
      var btn=$('saveCommissionDrinksButton');btn.disabled=true;
      var rows=commissionDrinkItems.map(function(x){return {id:x.id,enabled:x.enabled,extraPrice:Number(x.extraPrice)};});
      rpc('saveCommissionDrinkItems',[rows]).then(function(r){requireRpcSuccess(r);st('st-commission-drinks',I18n.t('saved'),true);return loadCommissionDrinks();})
        .catch(function(e){st('st-commission-drinks',I18n.t('errPrefix')+API.userErrorText(e),false);})
        .finally(function(){btn.disabled=false;});
    };
    window.loadCommissionDrinks=loadCommissionDrinks;
})();
