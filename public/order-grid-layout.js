/* Store-wide order menu layout: one choice for phones, another for tablets. */
(function(root){
  'use strict';
  function validColumns(value, min, max){
    var n=Number(value);
    return Number.isInteger(n)&&n>=min&&n<=max?n:2;
  }
  function resolve(settings, screenSize, viewport){
    settings=settings||{};
    screenSize=screenSize||{};
    viewport=viewport||{};
    // The physical short side remains stable on rotation and when the soft
    // keyboard changes the WebView height. Fall back to viewport for browsers
    // that do not expose usable screen dimensions.
    var w=Number(screenSize.width),h=Number(screenSize.height);
    if(!(w>0&&h>0)){
      w=Number(viewport.width)||0;
      h=Number(viewport.height)||0;
    }
    var tablet=Math.min(w,h)>=600;
    var key=tablet?'orderGridColumnsTablet':'orderGridColumnsPhone';
    return {device:tablet?'tablet':'phone',columns:validColumns(settings[key],tablet?2:1,tablet?6:3)};
  }
  root.OrderGridLayout=Object.freeze({resolve:resolve,validColumns:validColumns});
})(typeof window!=='undefined'?window:globalThis);
