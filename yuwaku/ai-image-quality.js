// Conservative local-only image legibility preflight. This is NOT an OCR score:
// a warning asks a human to reshoot, but never asserts guaranteed readability.
(function(root){
  'use strict';
  if(root.AIImageQuality)return;
  function inspectCanvas(source,opts){
    opts=opts||{};
    var width=Number(opts.sourceWidth||source.width||source.naturalWidth||0);
    var height=Number(opts.sourceHeight||source.height||source.naturalHeight||0);
    if(!width||!height)return {problem:true,reasons:['decode_failed']};
    var factor=Math.min(1,400/Math.max(width,height));
    var canvas=root.document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*factor));
    canvas.height=Math.max(1,Math.round(height*factor));
    var ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)return {problem:true,reasons:['inspection_unavailable']};
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    var data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    var w=canvas.width,h=canvas.height;
    var gray=new Uint8Array(w*h);
    var min=255,max=0,lightCount=0,darkCount=0;
    for(var i=0;i<gray.length;i++){
      var at=i*4,lum=Math.round(data[at]*.299+data[at+1]*.587+data[at+2]*.114);
      gray[i]=lum;min=Math.min(min,lum);max=Math.max(max,lum);
      if(lum>245)lightCount++;
      if(lum<100)darkCount++;
    }
    var sharp=0,moderate=0;
    for(var y=1;y<h;y++)for(var x=1;x<w;x++){
      var k=y*w+x,edge=Math.max(Math.abs(gray[k]-gray[k-1]),Math.abs(gray[k]-gray[k-w]));
      if(edge>=30)sharp++;
      if(edge>=12)moderate++;
    }
    var pixels=Math.max(1,(w-1)*(h-1)),reasons=[];
    if(opts.photo&&Math.min(width,height)<550)reasons.push('low_resolution');
    if(max-min<28)reasons.push('low_contrast');
    if(sharp/pixels<.0007 && moderate/pixels<.005)reasons.push('blurry_or_blank');
    // Mostly blank source may be a page without a menu, not just defocus.
    if(lightCount/gray.length>.998 && darkCount<8)reasons.push('page_appears_blank');
    return {problem:reasons.length>0,reasons:reasons,sourceWidth:width,sourceHeight:height,
      strongEdgeRatio:sharp/pixels,contrast:max-min};
  }
  function warning(result,english){
    if(!result||!result.problem)return '';
    var reasons=result.reasons||[];
    var lowRes=reasons.includes('low_resolution');
    var blank=reasons.includes('page_appears_blank');
    return english
      ?'⚠️ This '+(blank?'page may be blank':lowRes?'image has low resolution':'image/PDF page may be unclear')+
        '. Text and prices may not be read correctly. Please retake in good light, hold the camera steady, '+
        'fill the frame with the subject, or select a clearer PDF/image.'
      :'⚠️ '+(blank?'ページが空白に近い状態です':lowRes?'画像の解像度が低くなっています':'画像／PDFの文字が不鮮明な可能性があります')+
        '。商品名や価格を正確に読み取れないおそれがあります。明るい場所で手ぶれを防ぎ、' +
        '対象が鮮明に写るよう再撮影するか、鮮明なPDF・画像を選び直してください。';
  }
  root.AIImageQuality=Object.freeze({inspectCanvas:inspectCanvas,warning:warning});
})(typeof window==='undefined'?globalThis:window);
