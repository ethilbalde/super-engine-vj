/* ═══════════════════════════════════════════
   DUNE ENGINE — Champ de particules guidé par bruit, direction quantifiée
   Stries façon dunes de sable, deux teintes alternées par palier, palette évolutive.
═══════════════════════════════════════════ */
var Engine_Dune=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var grains=[],_t=0,frameStep=0,lastPulseTime=0,evolveT=0,_needsReset=false,_wasDown=false;

  var PALETTES=[
    ['#ff4d2e','#ffd23f'],
    ['#101010','#e8e8e8'],
    ['#003459','#7fdbff'],
    ['#1b4332','#95d5b2'],
    ['#3d0e0e','#ff9f1c']
  ];

  var cfg={
    canvas_width:800,canvas_height:600,
    count:3000,seed:200,scale:120,steps:24,speed:1.2,decay:0.010,
    palette:0,evolve_enabled:true,evolve_duration:60,
    size_min:0.2,size_max:1.6,
    pen_size:70,push_force:1.0,
    bg_color:'#030303',
    pulse_enabled:false,pulse_interval:8.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

  /* bruit-valeur 2D maison (hash + interpolation lissée) — graine réglable */
  function hash2(i,j){var s=Math.sin(i*127.1+j*311.7+cfg.seed*0.0173)*43758.5453;return s-Math.floor(s);}
  function fieldNoise(x,y){
    var xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
    var a=hash2(xi,yi),b=hash2(xi+1,yi),c=hash2(xi,yi+1),d=hash2(xi+1,yi+1);
    var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
    return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
  }

  function Grain(x,y){
    this.x=x;this.y=y;
    this.life=0.15+Math.random()*0.85;
  }
  Grain.prototype.step=function(){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var ang=fieldNoise(this.x/cfg.scale,this.y/cfg.scale)*Math.PI*2;
    var steps=cfg.steps;
    var qi=Math.round(ang/(Math.PI*2)*steps);
    var qa=qi/steps*Math.PI*2;
    var even=(qi%2)===0;
    var amp=even?1.3:0.55;
    this.x+=Math.cos(qa)*cfg.speed*amp;
    this.y+=Math.sin(qa)*cfg.speed*amp;
    this.bucketEven=even;
    if(this.x<6)this.x=6;if(this.x>W-6)this.x=W-6;
    if(this.y<6)this.y=6;if(this.y>H-6)this.y=H-6;
    this.life-=cfg.decay;
  };

  function spawnGrain(x,y){grains.push(new Grain(x,y));}

  function _reset(){
    grains=[];
    var W=cfg.canvas_width,H=cfg.canvas_height;
    for(var i=0;i<cfg.count;i++)spawnGrain(Math.random()*W,Math.random()*H);
    evolveT=0;frameStep=0;
  }
  function init(){_reset();}

  function triggerPulse(){
    cfg.seed=Math.floor(Math.random()*5000);
    _reset();
    lastPulseTime=_t;
    var bar=document.getElementById('dunpulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    _t+=0.016;frameStep++;

    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();

    /* la palette évolue lentement vers une teinte plus sombre, puis se renouvelle */
    var pal=PALETTES[cfg.palette]||PALETTES[0];
    var c0=hexToRgb(pal[0]),c1=hexToRgb(pal[1]);
    if(cfg.evolve_enabled){
      evolveT+=0.016;
      var phase=(evolveT%cfg.evolve_duration)/cfg.evolve_duration;
      var dim=phase>0.6?1-((phase-0.6)/0.4)*0.85:1;
      c0=[c0[0]*dim,c0[1]*dim,c0[2]*dim];c1=[c1[0]*dim,c1[1]*dim,c1[2]*dim];
    }

    if(mouse.down&&!_wasDown){
      var n=Math.max(1,Math.round(cfg.push_force*30));
      for(var k=0;k<n;k++)spawnGrain(mouse.x+(Math.random()*2-1)*cfg.pen_size,mouse.y+(Math.random()*2-1)*cfg.pen_size);
    }
    _wasDown=mouse.down;

    ctx.fillStyle='rgba('+0+','+0+','+0+',0)';
    for(var i=grains.length-1;i>=0;i--){
      var g=grains[i];g.step();
      var rgb=g.bucketEven?c0:c1;
      var sz=cfg.size_min+Math.random()*(cfg.size_max-cfg.size_min);
      var alpha=0.45+Math.random()*0.5;
      ctx.fillStyle='rgba('+Math.round(rgb[0])+','+Math.round(rgb[1])+','+Math.round(rgb[2])+','+alpha+')';
      ctx.fillRect(g.x,g.y,sz,sz);
      if(g.life<=0){grains.splice(i,1);spawnGrain(Math.random()*cfg.canvas_width,Math.random()*cfg.canvas_height);}
    }
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(grains.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

