(function(){
  'use strict';
  if(window.DateDisplay) return;
  var KEY='izakanpai:date-display-settings';
  var state={countryCode:'',locale:'',dateFormat:'',timezone:'',currencyCode:''};
  function safeParse(raw){try{return JSON.parse(raw)||{};}catch(e){return {};}}
  function validFormat(v){v=String(v||'').toUpperCase();return ['YYYY/MM/DD','MM/DD/YYYY','DD/MM/YYYY'].indexOf(v)>=0?v:'';}
  function inferFormat(s){
    var f=validFormat(s&&s.dateFormat); if(f)return f;
    var c=String(s&&s.countryCode||'').toUpperCase();
    if(c==='JP')return 'YYYY/MM/DD';
    if(c==='GB'||c==='AU'||c==='SG')return 'DD/MM/YYYY';
    if(c==='PH'||c==='US')return 'MM/DD/YYYY';
    var l=String(s&&s.locale||'').toLowerCase();
    if(l.indexOf('ja')===0)return 'YYYY/MM/DD';
    if(/^(en-gb|en-au|en-sg)/.test(l))return 'DD/MM/YYYY';
    var cur=String(s&&s.currencyCode||'').toUpperCase();
    if(cur==='JPY')return 'YYYY/MM/DD';
    if(cur==='GBP'||cur==='AUD'||cur==='SGD')return 'DD/MM/YYYY';
    return 'MM/DD/YYYY';
  }
  function load(){
    try{var c=safeParse(localStorage.getItem(KEY));state.countryCode=String(c.countryCode||'');state.locale=String(c.locale||'');state.currencyCode=String(c.currencyCode||'');state.dateFormat=validFormat(c.dateFormat)||inferFormat(c);state.timezone=String(c.timezone||'');}catch(e){}
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify({countryCode:state.countryCode,locale:state.locale,currencyCode:state.currencyCode,dateFormat:state.dateFormat,timezone:state.timezone}));}catch(e){}
  }
  function parts(v){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||'')); return m?{y:m[1],m:m[2],d:m[3]}:null;
  }
  function monthParts(v){
    var m=/^(\d{4})-(\d{2})$/.exec(String(v||'')); return m?{y:m[1],m:m[2]}:null;
  }
  function format(v,fmt){
    var p=parts(v); if(!p)return String(v||'');
    fmt=validFormat(fmt)||inferFormat(state);
    if(fmt==='YYYY/MM/DD')return p.y+'/'+p.m+'/'+p.d;
    if(fmt==='DD/MM/YYYY')return p.d+'/'+p.m+'/'+p.y;
    return p.m+'/'+p.d+'/'+p.y;
  }
  function formatMonth(v,fmt){
    var p=monthParts(v); if(!p)return String(v||'');
    fmt=validFormat(fmt)||inferFormat(state);
    return fmt==='YYYY/MM/DD' ? p.y+'/'+p.m : p.m+'/'+p.y;
  }
  function formatDateTime(v,opts){
    var raw=String(v||'').trim(); if(!raw)return raw;
    if(parts(raw))return format(raw,(opts&&opts.dateFormat)||state.dateFormat);
    var local=/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(?::(\d{2}))?$/.exec(raw);
    if(local)return format(local[1],(opts&&opts.dateFormat)||state.dateFormat)+' '+local[2]+(local[3]?':'+local[3]:'');
    var d=new Date(raw); if(!isFinite(d.getTime()))return raw;
    try{
      var formatOpts={year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'};
      var tz=String((opts&&opts.timezone)||state.timezone||'').trim(); if(tz)formatOpts.timeZone=tz;
      var ps=new Intl.DateTimeFormat('en-CA',formatOpts).formatToParts(d), map={};
      ps.forEach(function(x){if(x.type!=='literal')map[x.type]=x.value;});
      var day=(map.year||'')+'-'+(map.month||'')+'-'+(map.day||'');
      var time=[map.hour,map.minute,map.second].filter(Boolean).join(':');
      return format(day,(opts&&opts.dateFormat)||state.dateFormat)+(time?' '+time:'');
    }catch(e){return raw;}
  }
  function sync(input){
    if(!input||(input.type!=='date'&&input.type!=='month'))return;
    var wrap=input.parentElement;
    if(!wrap||!wrap.classList.contains('iz-date-display-wrap')){
      wrap=document.createElement('span'); wrap.className='iz-date-display-wrap';
      input.parentNode.insertBefore(wrap,input); wrap.appendChild(input);
      var out=document.createElement('span'); out.className='iz-date-display-overlay'; out.setAttribute('aria-hidden','true'); wrap.appendChild(out);
      input.classList.add('iz-date-display-native');
      ['input','change','focus','click'].forEach(function(ev){input.addEventListener(ev,function(){sync(input);});});
    }
    var overlay=wrap.querySelector('.iz-date-display-overlay');
    if(overlay){
      var fmt=state.dateFormat||inferFormat(state);
      var shown=input.type==='month' ? formatMonth(input.value,fmt) : format(input.value,fmt);
      var hint=input.type==='month' ? (fmt==='YYYY/MM/DD'?'YYYY/MM':'MM/YYYY') : fmt;
      overlay.textContent=input.value?shown:hint; overlay.classList.toggle('is-placeholder',!input.value);
    }
    input.setAttribute('data-date-format',state.dateFormat||inferFormat(state));
  }
  function refresh(root){
    var scope=root&&root.querySelectorAll?root:document;
    if(scope.matches&&scope.matches('input[type="date"],input[type="month"]'))sync(scope);
    scope.querySelectorAll&&scope.querySelectorAll('input[type="date"],input[type="month"]').forEach(sync);
  }
  function setSettings(s){
    s=s||{};
    if(s.countryCode!=null)state.countryCode=String(s.countryCode||'');
    if(s.locale!=null)state.locale=String(s.locale||'');
    if(s.currencyCode!=null)state.currencyCode=String(s.currencyCode||'');
    if(s.timezone!=null)state.timezone=String(s.timezone||'');
    var explicitFormat=validFormat(s.dateFormat);
    state.dateFormat=explicitFormat||inferFormat({countryCode:state.countryCode,locale:state.locale,currencyCode:state.currencyCode,dateFormat:''});
    save(); refresh(document);
  }
  load(); state.dateFormat=validFormat(state.dateFormat)||inferFormat(state);
  window.DateDisplay={format:format,formatMonth:formatMonth,formatDateTime:formatDateTime,refresh:function(){refresh(document);},setSettings:setSettings,getFormat:function(){return state.dateFormat;}};
  window.addEventListener('iz:regional-settings',function(e){setSettings(e&&e.detail||{});});
  function start(){
    refresh(document);
    if(window.MutationObserver){
      new MutationObserver(function(ms){ms.forEach(function(m){Array.prototype.forEach.call(m.addedNodes||[],function(n){if(n&&n.nodeType===1)refresh(n);});});}).observe(document.documentElement,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
