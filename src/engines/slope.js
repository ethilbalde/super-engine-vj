/* ═══════════════════════════════════════════
   SLOPE ENGINE — Champs de vecteurs commutables
   Particules émises au clic, intégrées pas à pas dans un champ
   de direction analytique choisi parmi plusieurs variantes.
═══════════════════════════════════════════ */
var Engine_Slope=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var pts=[],_t=0,lastPulseTime=0,lastCycleTime=0,_needsReset=false,_wasDown=false;
  var centerX=400,centerY=300;

  var cfg={
    canvas_width:800,canvas_height:600,
    field:0,auto_cycle:true,cycle_interval:6.0,
    scale:18,speed:1.0,width_min:1,width_max:5,
    pen_size:90,push_force:1.0,fade:0.10,
    bg_color:'#0f0420',
    color1:'#2b0a3d',color2:'#7a1750',color3:'#c92b4f',color4:'#ef6a3c',color5:'#ffd166',
    pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function palette(){return[cfg.color1,cfg.color2,cfg.color3,cfg.color4,cfg.color5];}

  /* dix variantes de champ de direction — chacune renvoie une vitesse (dx,dy)
     en coordonnées réduites pour un point (x,y) donné */
  function fieldDX(x,y,f){
    switch(f){
      case 0:return Math.sin(y*0.8);
      case 1:return Math.sin(x*0.3)*Math.cos(y*0.6);
      case 2:return y*0.4;
      case 3:return 1.2;
      case 4:return x*0.05-y*0.4;
      case 5:return Math.sin((y-6)*0.25)+Math.sin((y+6)*0.25);
      case 6:return Math.sin(x*0.4)+Math.cos(y*0.25);
      case 7:return -y*0.6;
      case 8:return x/(1+x*x*0.05);
      default:return Math.sin(x*0.5)*Math.sin(y*0.5)*2;
    }
  }
  function fieldDY(x,y,f){
    switch(f){
      case 0:return Math.cos(x*0.8);
      case 1:return Math.cos(x*0.6)*Math.sin(y*0.3);
      case 2:return x*0.4-(x*x*x)*0.02;
      case 3:return Math.sin(x*0.5+y*0.2);
      case 4:return y*0.05+x*0.4;
      case 5:return -Math.cos((x-6)*0.25)-Math.cos((x+6)*0.25);
      case 6:return Math.cos(x*0.25)-Math.sin(y*0.4);
      case 7:return x*0.6;
      case 8:return -y/(1+y*y*0.05);
      default:return Math.cos(x*0.5)*Math.cos(y*0.5)*2;
    }
  }

  function toField(px,py){return[(px-centerX)/cfg.scale,(py-centerY)/cfg.scale];}
  function toScreen(fx,fy){return[fx*cfg.scale+centerX,fy*cfg.scale+centerY];}

  function spawnAt(px,py,count){
    var pal=palette();
    for(var i=0;i<count;i++){
      var jx=px+(Math.random()*2-1)*cfg.pen_size*0.5;
      var jy=py+(Math.random()*2-1)*cfg.pen_size*0.5;
      var fp=toField(jx,jy);
      pts.push({
        x:fp[0],y:fp[1],lastX:jx,lastY:jy,
        size:cfg.width_min+Math.random()*(cfg.width_max-cfg.width_min),
        color:pal[Math.floor(Math.random()*pal.length)],
        dir:(0.1+Math.random()*0.9)*(Math.random()<0.5?1:-1)
      });
    }
  }

  function _reset(){pts=[];_t=0;lastCycleTime=0;}
  function init(){_reset();}

  function triggerPulse(){
    cfg.field=(cfg.field+1+Math.floor(Math.random()*8))%10;
    document.querySelectorAll('[data-slpfield]').forEach(function(b){b.classList.toggle('active',parseInt(b.dataset.slpfield)===cfg.field);});
    spawnAt(centerX,centerY,40);
    lastPulseTime=_t;
    var bar=document.getElementById('slppulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    _t+=0.016;
    centerX=cfg.canvas_width/2;centerY=cfg.canvas_height/2;

    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();

    if(cfg.auto_cycle){
      if(_t-lastCycleTime>cfg.cycle_interval){
        lastCycleTime=_t;
        cfg.field=(cfg.field+1)%10;
        document.querySelectorAll('[data-slpfield]').forEach(function(b){b.classList.toggle('active',parseInt(b.dataset.slpfield)===cfg.field);});
      }
    }

    if(mouse.down){
      var rate=Math.max(1,Math.round(cfg.push_force*16));
      spawnAt(mouse.x,mouse.y,rate);
    }
    _wasDown=mouse.down;

    if(pts.length===0){
      var bg=hexToRgb(cfg.bg_color);
      ctx.fillStyle='rgb('+bg[0]+','+bg[1]+','+bg[2]+')';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      return;
    }

    var bgRgb=hexToRgb(cfg.bg_color);
    ctx.fillStyle='rgba('+bgRgb[0]+','+bgRgb[1]+','+bgRgb[2]+','+cfg.fade+')';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    var step=cfg.speed*0.045,f=cfg.field,border=160,W=canvas.width,H=canvas.height;
    for(var i=pts.length-1;i>=0;i--){
      var p=pts[i];
      var dx=fieldDX(p.x,p.y,f),dy=fieldDY(p.x,p.y,f);
      p.x+=p.dir*dx*step;p.y+=p.dir*dy*step;
      var sp=toScreen(p.x,p.y),sx=sp[0],sy=sp[1];
      ctx.strokeStyle=p.color;ctx.lineWidth=p.size;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(p.lastX,p.lastY);ctx.lineTo(sx,sy);ctx.stroke();
      p.lastX=sx;p.lastY=sy;
      if(sx<-border||sy<-border||sx>W+border||sy>H+border)pts.splice(i,1);
    }
    if(pts.length>6000)pts.splice(0,pts.length-6000);
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

