(function(){
  function requested(){ try{var v=new URLSearchParams(location.search).get('lang');return (v==='en'||v==='ja')?v:null;}catch(e){return null;} }
  function current(){ var q=requested(); if(q)return q; try{var s=localStorage.getItem('lang')||localStorage.getItem('izlang');if(s==='ja'||s==='en')return s;var first=(navigator.languages&&navigator.languages.length)?navigator.languages[0]:navigator.language;return String(first||'').toLowerCase().indexOf('ja')===0?'ja':'en';}catch(e){return 'en';} }
  function syncLinks(lang){ document.querySelectorAll('a[href="./terms.html"],a[href^="./terms.html?"],a[href="./privacy.html"],a[href^="./privacy.html?"]').forEach(function(a){var page=a.getAttribute('href').indexOf('privacy')>=0?'privacy':'terms';a.href='./'+page+'.html?lang='+lang;}); }
  function apply(lang){ document.documentElement.dataset.lang=lang; document.documentElement.lang=lang; var b=document.getElementById('langBtn'); if(b)b.textContent=lang==='ja'?'EN':'日本語'; syncLinks(lang); try{localStorage.setItem('lang',lang);}catch(e){} }
  document.addEventListener('DOMContentLoaded',function(){ apply(current()); var b=document.getElementById('langBtn'); if(b)b.addEventListener('click',function(){apply(document.documentElement.dataset.lang==='ja'?'en':'ja');}); });
})();
