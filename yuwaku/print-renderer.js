(function(){
  'use strict';
  if(window.IzEscPosRenderer) return;
  var PRINT_WIDTH=384;
  function ascii(s){return /^[\x20-\x7E]*$/.test(String(s==null?'':s));}
  function canvas(opts){var cv=opts.createCanvas();cv.width=PRINT_WIDTH;cv.height=40;return cv;}
  function wrap(str,maxHalf){
    var out=[],cur='',w=0,s=String(str==null?'':str);
    for(var i=0;i<s.length;i++){var ch=s[i],cw=s.charCodeAt(i)>255?2:1;if(w+cw>maxHalf&&cur){out.push(cur);cur=ch;w=cw;}else{cur+=ch;w+=cw;}}
    if(cur)out.push(cur);return out.length?out:[''];
  }
  async function rasterLine(opts,text,align,big){
    var cv=canvas(opts),ctx=cv.getContext('2d'),fs=big?34:24,h=fs+12,w=PRINT_WIDTH,bpr=w/8;
    cv.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#000';ctx.textBaseline='top';
    ctx.font=(big?'bold ':'')+fs+"px 'Noto Sans JP',sans-serif";
    var tw=ctx.measureText(text).width,x=align===1?Math.max(0,(w-tw)/2):6;
    ctx.fillText(text,x,6);
    var img=ctx.getImageData(0,0,w,h).data,job=[0x1D,0x76,0x30,0x00,bpr&255,0,h&255,(h>>8)&255];
    for(var y=0;y<h;y++){for(var bx=0;bx<bpr;bx++){var b=0;for(var bit=0;bit<8;bit++){var px=bx*8+bit,idx=(y*w+px)*4;if(img[idx+3]>32&&(img[idx]*0.299+img[idx+1]*0.587+img[idx+2]*0.114)<128)b|=(0x80>>bit);}job.push(b);}}
    await opts.send(new Uint8Array(job));
  }
  async function rasterTwoCol(opts,label,value){
    var cv=canvas(opts),ctx=cv.getContext('2d'),fs=24,h=fs+12,w=PRINT_WIDTH,bpr=w/8,pad=6;
    cv.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#000';ctx.textBaseline='top';ctx.font=fs+"px 'Noto Sans JP',sans-serif";
    var vw=ctx.measureText(value).width;ctx.fillText(label,pad,6);ctx.fillText(value,Math.max(0,w-pad-vw),6);
    var img=ctx.getImageData(0,0,w,h).data,job=[0x1D,0x76,0x30,0x00,bpr&255,0,h&255,(h>>8)&255];
    for(var y=0;y<h;y++){for(var bx=0;bx<bpr;bx++){var b=0;for(var bit=0;bit<8;bit++){var px=bx*8+bit,idx=(y*w+px)*4;if(img[idx+3]>32&&(img[idx]*0.299+img[idx+1]*0.587+img[idx+2]*0.114)<128)b|=(0x80>>bit);}job.push(b);}}
    await opts.send(new Uint8Array(job));
  }
  async function printImage(opts,img,maxW,maxH,dither){
    var sc=Math.min(maxW/img.width,maxH/img.height,1),w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc)),W=PRINT_WIDTH,bpr=W/8,cv=canvas(opts),ctx=cv.getContext('2d');
    cv.height=h;ctx.fillStyle='#fff';ctx.fillRect(0,0,W,h);ctx.drawImage(img,Math.floor((W-w)/2),0,w,h);
    var d=ctx.getImageData(0,0,W,h).data,g=new Float32Array(W*h);
    for(var i=0;i<W*h;i++){var a=d[i*4+3];g[i]=a>32?(d[i*4]*0.299+d[i*4+1]*0.587+d[i*4+2]*0.114):255;}
    if(dither){for(var yy=0;yy<h;yy++){for(var xx=0;xx<W;xx++){var idx=yy*W+xx,old=g[idx],nw=old<128?0:255,e=old-nw;g[idx]=nw;if(xx+1<W)g[idx+1]+=e*7/16;if(yy+1<h){if(xx>0)g[idx+W-1]+=e*3/16;g[idx+W]+=e*5/16;if(xx+1<W)g[idx+W+1]+=e/16;}}}}
    else{for(var k=0;k<W*h;k++)g[k]=g[k]<128?0:255;}
    for(var y0=0;y0<h;y0+=48){var rows=Math.min(48,h-y0),job=[0x1D,0x76,0x30,0x00,bpr&255,0,rows&255,(rows>>8)&255];for(var y=0;y<rows;y++){for(var bx=0;bx<bpr;bx++){var b=0;for(var bit=0;bit<8;bit++){var px=bx*8+bit;if(g[(y0+y)*W+px]<128)b|=(0x80>>bit);}job.push(b);}}await opts.send(new Uint8Array(job));}
    await opts.send(new Uint8Array([0x0A]));
  }
  async function print(opts){
    if(!opts||typeof opts.send!=='function'||typeof opts.createCanvas!=='function')throw new Error('print_renderer_invalid');
    var text=String(opts.text||'').replace(/₱/g,'P').replace(/\r/g,'');
    await opts.send(new Uint8Array([0x1B,0x40]));
    if(opts.logo&&opts.logo.img&&text.indexOf('[[B]]')>=0){
      try{await printImage(opts,opts.logo.img,Math.max(48,Math.round(PRINT_WIDTH*(Math.max(20,Math.min(100,Number(opts.logo.scale)||100))/100))),150,true);}catch(e){if(opts.log)opts.log('logo_failed',e);}
    }
    var lines=text.split('\n'),buf=[];
    async function flush(){if(buf.length){await opts.send(new Uint8Array(buf));buf=[];}}
    async function emit(seg,align,big){
      seg=String(seg==null?'':seg);if(seg===''){buf.push(0x0A);return;}
      var tab=seg.indexOf('\t');
      if(tab>=0){
        var label=seg.slice(0,tab),value=seg.slice(tab+1);
        if(ascii(label)&&ascii(value)){var pad=20-label.length-value.length;if(pad<1)pad=1;seg=label+Array(pad+1).join(' ')+value;}
        else{await flush();await rasterTwoCol(opts,label,value);return;}
      }
      if(ascii(seg)){
        buf.push(0x1B,0x61,align);
        if(big)buf.push(0x1D,0x21,0x11,0x1B,0x45,0x01);
        for(var c=0;c<seg.length;c++)buf.push(seg.charCodeAt(c)&0x7F);
        buf.push(0x0A);
        if(big)buf.push(0x1D,0x21,0x00,0x1B,0x45,0x00);
        buf.push(0x1B,0x61,0x00);
      }else{await flush();await rasterLine(opts,seg,align,big);}
    }
    for(var i=0;i<lines.length;i++){
      var ln=lines[i],align=0,big=false;
      if(ln.slice(0,7)==='[[IMG]]'){await flush();try{await printImage(opts,await opts.loadImage(ln.slice(7)),300,320,false);}catch(e2){if(opts.log)opts.log('image_failed',e2);}continue;}
      if(ln.slice(0,5)==='[[B]]'){align=1;big=true;ln=ln.slice(5);}else if(ln.slice(0,5)==='[[C]]'){align=1;ln=ln.slice(5);}
      var segs=big?wrap(ln,20):[ln];for(var s=0;s<segs.length;s++)await emit(segs[s],align,big);
    }
    await flush();await opts.send(new Uint8Array([0x0A,0x0A,0x0A]));
  }
  window.IzEscPosRenderer={PRINT_WIDTH:PRINT_WIDTH,print:print,wrap:wrap};
})();
