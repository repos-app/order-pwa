/* Inventory base-unit conversion shared across Native, PROD and TEST views.
 * A unit change after recorded stock movement is NEVER a plain field edit.
 * The real server owns the ratio checks, optimistic version and atomic BOM
 * rewrite. This dialog previews the physical units before explicit consent.
 */
(function(){
  'use strict';
  var current=-1,requestId='',busy=false,ov=null;
  var known={'kg→g':1000,'g→kg':0.001,'L→mL':1000,'mL→L':0.001};
  function en(){return !!(window.I18n&&I18n.lang&&I18n.lang()==='en');}
  function tx(ja,english){return en()?english:ja;}
  function el(id){return document.getElementById(id);}
  function create(){
    if(ov)return ov;
    ov=document.createElement('div');
    ov.id='inventoryConversionOverlay';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    ov.style.cssText='display:none;position:fixed;inset:0;z-index:65;background:rgba(15,23,42,.55);align-items:center;justify-content:center;padding:12px;';
    ov.innerHTML='<div style="background:#fff;border-radius:14px;padding:18px;width:min(410px,100%);max-height:90vh;overflow:auto;">'
      +'<div id="inventoryConversionTitle" style="font-size:17px;font-weight:900;margin-bottom:9px;"></div>'
      +'<div id="inventoryConversionCurrent" style="font-size:14px;margin-bottom:12px;white-space:pre-wrap;"></div>'
      +'<label for="inventoryConversionNewUnit" id="inventoryConversionUnitLabel" style="font-size:13px;font-weight:700;"></label>'
      +'<input id="inventoryConversionNewUnit" class="fc" type="text" maxlength="24" autocomplete="off" oninput="IZInventoryConversion.preview()" style="width:100%;margin:5px 0 10px;">'
      +'<label for="inventoryConversionFactor" id="inventoryConversionFactorLabel" style="font-size:13px;font-weight:700;"></label>'
      +'<input id="inventoryConversionFactor" class="fc" type="number" inputmode="decimal" min="0.00000001" max="1000000" step="any" oninput="IZInventoryConversion.preview()" style="width:100%;margin:5px 0 10px;">'
      +'<div id="inventoryConversionPreview" role="status" aria-live="polite" style="font-size:13px;margin:8px 0;white-space:pre-wrap;"></div>'
      +'<div id="inventoryConversionHistory" style="font-size:12px;margin:8px 0;color:#475569;"></div>'
      +'<button type="button" class="btn btn-pri" id="inventoryConversionSubmit" onclick="IZInventoryConversion.submit()"></button>'
      +'<button type="button" class="btn btn-sec" id="inventoryConversionCancel" onclick="IZInventoryConversion.close()" style="margin-top:6px;"></button>'
      +'</div>';
    document.body.appendChild(ov);
    return ov;
  }
  function status(message,error){
    var node=el('inventoryConversionPreview');
    node.textContent=message;
    node.style.color=error?'#b91c1c':'#047857';
  }
  function read(){
    var item=window.rows&&window.rows[current];
    if(!item)return null;
    var unit=String(el('inventoryConversionNewUnit').value||'').trim();
    var raw=String(el('inventoryConversionFactor').value||'').trim();
    var ratio=Number(raw);
    var oldUnit=String(item.unit||'本');
    var prescribed=known[oldUnit+'→'+unit];
    if(!unit||unit.length>24||unit===oldUnit||!raw||
      !Number.isFinite(ratio)||ratio<=0||ratio>1000000)
      return null;
    if(prescribed!==undefined&&Math.abs(ratio-prescribed)>Math.max(1e-10,prescribed*1e-10))
      return {error:tx('この単位の換算係数は '+prescribed+' に固定されています。','Required factor for these units: '+prescribed)};
    var convertedStock=Number((Number(item.stock)*ratio).toFixed(8));
    var convertedMinimum=Number((Number(item.minimum)*ratio).toFixed(8));
    var convertedCost=Number((Number(item.cost)/ratio).toFixed(8));
    if(![convertedStock,convertedMinimum,convertedCost].every(Number.isFinite)||
      Math.abs(convertedStock*convertedCost-Number(item.stock)*Number(item.cost))>0.0001)
      return {error:tx('換算後の数値が大きすぎるか、原価の精度が不足しています。',
        'The converted values exceed supported precision.')};
    return {item,oldUnit,unit,ratio,convertedStock,convertedMinimum,convertedCost};
  }
  function preview(){
    if(!ov||ov.style.display==='none')return;
    var button=el('inventoryConversionSubmit');
    var value=read();
    button.disabled=busy||!value||!!value.error;
    if(!value){status(tx('新しい単位と換算係数を入力してください。',
      'Enter the new unit and conversion factor.'),true);return;}
    if(value.error){status(value.error,true);return;}
    status(
      tx('現在：','Current: ')+value.item.stock+' '+value.oldUnit
      +' → '+value.convertedStock+' '+value.unit+'\n'
      +tx('最低在庫：','Minimum: ')+value.convertedMinimum+' '+value.unit+'\n'
      +tx('単位原価：','Cost/unit: ')+value.convertedCost+'\n'
      +tx('レシピの材料数量も同じ係数で変換します。',
        'Linked recipe quantities will be multiplied by the same factor.'),
      false);
  }
  function open(index){
    var item=window.rows&&window.rows[index];
    if(!item||!item.id){
      if(typeof window.msg==='function')window.msg(
        tx('在庫を先に保存してください。','Save this inventory item first.'),false);
      return;
    }
    current=index;requestId='';busy=false;create();
    el('inventoryConversionTitle').textContent=tx('⚖️ 在庫の単位換算','⚖️ Convert stock unit');
    el('inventoryConversionCurrent').textContent=
      (item.nameJa||item.name||item.nameEn)+'\n'+
      tx('基準単位：','Current unit: ')+(item.unit||'本');
    el('inventoryConversionUnitLabel').textContent=tx('換算後の単位','New unit');
    el('inventoryConversionFactorLabel').textContent=
      tx('換算係数（旧1単位 = 新しい何単位？）',
        'Conversion factor (1 old unit = how many new units?)');
    el('inventoryConversionNewUnit').value='';
    el('inventoryConversionFactor').value='';
    el('inventoryConversionHistory').textContent=
      tx('過去の入出庫履歴は旧単位で保存され、現在在庫と全レシピを一括変更します。別端末の更新が先に行われた場合は保存せず拒否されます。',
        'Past movements retain original units. Current stock and every linked recipe change atomically. Concurrent edits reject this conversion.');
    el('inventoryConversionSubmit').textContent=tx('換算を確定','Confirm conversion');
    el('inventoryConversionCancel').textContent=tx('キャンセル','Cancel');
    ov.style.display='flex';
    preview();
    el('inventoryConversionNewUnit').focus();
  }
  function close(){
    if(busy)return;
    if(ov)ov.style.display='none';
    current=-1;requestId='';
  }
  async function submit(){
    if(busy||!ov||ov.style.display==='none')return;
    var value=read();
    if(!value||value.error){preview();return;}
    var id=value.item.id,version=value.item.stockVersion;
    if(!requestId)requestId=window.crypto&&crypto.randomUUID
      ?crypto.randomUUID():'unit-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);
    busy=true;el('inventoryConversionSubmit').disabled=true;
    el('inventoryConversionCancel').disabled=true;
    status(tx('サーバーで一括換算しています…','Converting atomically on the server…'),false);
    try{
      var result=await window.rpc('convertInventoryUnit',[{
        itemId:id,stockVersion:version,
        targetUnit:value.unit,conversionFactor:value.ratio,
        clientRequestId:requestId
      }]);
      if(!result||result.success!==true){
        var code=(result&&result.error)||'inventory_conversion_failed';
        if(code==='state_changed')code=tx(
          '他端末で在庫が更新されました。最新値を読み込み直してください。',
          'Another device updated the inventory. Reload latest values.');
        else if(code==='inventory_conversion_factor_mismatch')
          code=tx('換算係数が不正です。正しい係数を入力してください。',
            'This unit pair requires the correct factor.');
        throw new Error(code);
      }
      var rows=await window.rpc('getDrinkInventory',[]);
      window.rows=(rows||[]).slice();
      if(typeof window.render==='function')window.render();
      busy=false;close();
      if(typeof window.msg==='function')window.msg(
        tx('単位換算が完了しました。履歴とレシピに反映されています。',
          'Conversion completed. Inventory and recipes were updated.'),true);
    }catch(error){
      // Keep requestId after a transport error: retry uses the same identity.
      status(tx('換算エラー：','Conversion error: ')+
        (window.API?.userErrorText?API.userErrorText(error):String(error.message||error)),true);
      busy=false;el('inventoryConversionCancel').disabled=false;
      el('inventoryConversionSubmit').disabled=false;
    }
  }
  window.IZInventoryConversion={open,preview,submit,close};
})();
