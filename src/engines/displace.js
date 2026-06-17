/* ═══════════════════════════════════════════
   DISPLACE ENGINE — Grille de points déformée par un champ de bruit
   Chaque point d'une grille régulière est décalé par un bruit qui évolue
   dans le temps, créant un maillage organique en perpétuel mouvement.
═══════════════════════════════════════════ */
var Engine_Displace=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var pts=[],_t=0,lastPulseTime=0,_needsReset=false,_shock=0;

  var cfg={
    canvas_width:800,canvas_height:600,
    density:90,freq:1.0,speed:0.6,amount:60,pt_size:2.0,trail:0.12,
    pen_size:120,push_force:1.0,
    bg_color:'#04050a',color_low:'#1a3a6a',color_high:'#5dd9ff',
    pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

  /* bruit valeur 3D maison (x,y,t) — hash + interpolation lissée sur 2 tranches temporelles */
  function hash3(i,j,k){var s=Math.sin(i*127.1+j*311.7+k*74.7)*43758.5453;return s-Math.floor(s);}
  function noise3(x,y,z){
    var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z);
    var xf=x-xi,yf=y-yi,zf=z-zi;
    function corner(dz){
      var a=hash3(xi,yi,zi+dz),b=hash3(xi+1,yi,zi+dz),c=hash3(xi,yi+1,zi+dz),d=hash3(xi+1,yi+1,zi+dz);
      var u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
      return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
    }
    var z0=corner(0),z1=corner(1),wz=zf*zf*(3-2*zf);
    return z0+(z1-z0)*wz;
  }

  function _reset(){
    pts=[];
    var W=cfg.canvas_width,H=cfg.canvas_height,n=Math.max(4,Math.round(cfg.density));
    for(var gy=0;gy<n;gy++){
      for(var gx=0;gx<n;gx++){
        pts.push({bx:(gx+0.5)/n*W,by:(gy+0.5)/n*H});
      }
    }
    _t=0;_shock=0;
  }
  function init(){_reset();}

  function triggerPulse(){
    _shock=1.0;
    lastPulseTime=_t;
    var bar=document.getElementById('dsppulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    _t+=0.016*cfg.speed;
    var W=cfg.canvas_width,H=cfg.canvas_height;

    if(cfg.pulse_enabled&&_t/cfg.speed-lastPulseTime>cfg.pulse_interval)triggerPulse();
    _shock*=0.93;

    var bg=hexToRgb(cfg.bg_color);
    ctx.fillStyle='rgba('+bg[0]+','+bg[1]+','+bg[2]+','+cfg.trail+')';
    ctx.fillRect(0,0,W,H);

    var lo=hexToRgb(cfg.color_low),hi=hexToRgb(cfg.color_high);
    var freq=cfg.freq*0.01,amt=cfg.amount*(1+_shock*1.8);
    for(var i=0;i<pts.length;i++){
      var p=pts[i];
      var nx=noise3(p.bx*freq,p.by*freq,_t)-0.5;
      var ny=noise3(p.bx*freq+37.2,p.by*freq+11.5,_t)-0.5;
      var sx=p.bx+nx*amt*2,sy=p.by+ny*amt*2;
      if(mouse.down){
        var dx=sx-mouse.x,dy=sy-mouse.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        if(d<cfg.pen_size){var f=(cfg.pen_size-d)/cfg.pen_size*cfg.push_force*30;sx+=dx/d*f;sy+=dy/d*f;}
      }
      var mag=Math.min(1,Math.sqrt(nx*nx+ny*ny)*2.5);
      var r=lo[0]+(hi[0]-lo[0])*mag,g=lo[1]+(hi[1]-lo[1])*mag,bl=lo[2]+(hi[2]-lo[2])*mag;
      ctx.fillStyle='rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(bl)+')';
      ctx.fillRect(sx,sy,cfg.pt_size,cfg.pt_size);
    }
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(pts.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

