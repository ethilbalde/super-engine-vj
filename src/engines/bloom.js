/* ═══════════════════════════════════════════
   BLOOM ENGINE — Croissance de branches organiques
   Les graines tombent, deviennent des arbres qui poussent par embranchements,
   et chaque pousse finale devient une feuille colorée en échantillonnant une
   image au choix (ou un dégradé de secours si aucune image n'est fournie).
═══════════════════════════════════════════ */
var Engine_Bloom=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var seeds=[],sprouts=[],leaves=[],_t=0,lastPulseTime=0,_needsReset=false,_wasDown=false;
  var imgCanvas=null,imgCtx=null,imgData=null,imgW=0,imgH=0,imgName='';

  var cfg={
    canvas_width:800,canvas_height:600,
    fall_speed:3.0,radius_min:10,radius_max:30,shrink:0.998,
    wobble:0.33,bias:0.09,
    leaf_szmin:3,leaf_szmax:10,leaf_jitter:50,
    bg_color:'#000000',fallback_low:'#0a3d1a',fallback_high:'#ffd23f',
    pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

  function setImage(img,name){
    imgCanvas=document.createElement('canvas');
    imgW=imgCanvas.width=img.naturalWidth||img.width;
    imgH=imgCanvas.height=img.naturalHeight||img.height;
    imgCtx=imgCanvas.getContext('2d');
    imgCtx.drawImage(img,0,0);
    imgData=imgCtx.getImageData(0,0,imgW,imgH).data;
    imgName=name||'';
    var nameEl=document.getElementById('blmimg-name');if(nameEl)nameEl.textContent=imgName;
  }
  function clearImage(){
    imgCanvas=null;imgData=null;imgW=0;imgH=0;imgName='';
    var nameEl=document.getElementById('blmimg-name');if(nameEl)nameEl.textContent='Aucune image — dégradé par défaut';
  }

  function sampleColor(px,py,W,H){
    if(imgData&&imgW>0&&imgH>0){
      var u=((px/W)%1+1)%1,v=((py/H)%1+1)%1;
      var ix=Math.min(imgW-1,Math.floor(u*imgW)),iy=Math.min(imgH-1,Math.floor(v*imgH));
      var o=(iy*imgW+ix)*4;
      return[imgData[o],imgData[o+1],imgData[o+2]];
    }
    var lo=hexToRgb(cfg.fallback_low),hi=hexToRgb(cfg.fallback_high);
    var t=Math.max(0,Math.min(1,1-py/H));
    return[lo[0]+(hi[0]-lo[0])*t,lo[1]+(hi[1]-lo[1])*t,lo[2]+(hi[2]-lo[2])*t];
  }

  function spawnSeed(x,y){seeds.push({x:x,y:y});}

  function makeSprout(x,y,root){
    if(!root){
      root={x:x,y:y,dir:Math.PI,radius:cfg.radius_min+Math.random()*(cfg.radius_max-cfg.radius_min),gen:0};
    }
    return{
      x:root.x,y:root.y,phase:Math.random()*1000,driftVel:0,
      dir:root.dir,radius:root.radius,
      life:(30+Math.random()*90)/(root.gen/10+1),
      gen:root.gen+1
    };
  }

  function _reset(){seeds=[];sprouts=[];leaves=[];_t=0;}
  function init(){_reset();}

  function triggerPulse(){
    var W=cfg.canvas_width;
    for(var i=0;i<8;i++)spawnSeed(Math.random()*W,-10-Math.random()*60);
    lastPulseTime=_t;
    var bar=document.getElementById('blmpulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    _t+=0.016;
    var W=cfg.canvas_width,H=cfg.canvas_height,ground=H-30;

    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();

    if(mouse.down&&!_wasDown)spawnSeed(mouse.x,mouse.y);
    else if(mouse.down&&Math.random()<0.4)spawnSeed(mouse.x,mouse.y);
    _wasDown=mouse.down;

    /* graines qui tombent */
    for(var i=seeds.length-1;i>=0;i--){
      var s=seeds[i];s.y+=cfg.fall_speed;
      ctx.fillStyle='#fff';ctx.strokeStyle='#000';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(s.y>ground){seeds.splice(i,1);sprouts.push(makeSprout(s.x,ground));}
    }

    /* embranchements qui poussent */
    for(var j=sprouts.length-1;j>=0;j--){
      var b=sprouts[j];
      b.driftVel+=(Math.random()-0.5)*0.05;b.driftVel*=0.94;
      b.dir+=b.driftVel*cfg.wobble;
      b.dir+=(Math.PI-b.dir)*cfg.bias/(b.gen+1);
      b.x+=Math.sin(b.dir)*2;b.y+=Math.cos(b.dir)*2;
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#000';
      for(var a=0;a<Math.PI;a+=Math.PI/10){
        var sx=Math.cos(a)*b.radius,sy=Math.sin(a)*b.radius;
        ctx.beginPath();ctx.arc(b.x+sx,b.y+sy,a*0.5,0,Math.PI*2);ctx.fill();
      }
      b.radius*=cfg.shrink/(b.gen/300+1);
      b.life--;
      if(b.life<0){
        sprouts.splice(j,1);
        if(b.radius>3){
          var rootInfo={x:b.x,y:b.y,dir:b.dir,radius:b.radius,gen:b.gen};
          sprouts.push(makeSprout(b.x,b.y,rootInfo));
          sprouts.push(makeSprout(b.x,b.y,rootInfo));
        }else{
          leaves.push({x:b.x,y:b.y,life:20+Math.random()*40});
        }
      }
    }

    /* feuilles colorées par échantillonnage d'image */
    for(var k=leaves.length-1;k>=0;k--){
      var lf=leaves[k];
      var lx=lf.x+(Math.random()*2-1)*cfg.leaf_jitter;
      var ly=lf.y+(Math.random()*2-1)*cfg.leaf_jitter;
      var c=sampleColor(lx,ly,W,H);
      ctx.fillStyle='rgb('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+')';
      var sz=cfg.leaf_szmin+Math.random()*(cfg.leaf_szmax-cfg.leaf_szmin);
      ctx.save();ctx.translate(lx,ly);ctx.rotate(Math.random()*Math.PI*2);
      ctx.fillRect(-sz/2,-sz/2,sz,sz);
      ctx.restore();
      lf.life--;
      if(lf.life<0)leaves.splice(k,1);
    }
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,setImage:setImage,clearImage:clearImage,markReset:function(){_needsReset=true;}};
})();

