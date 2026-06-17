/* ═══════════════════════════════════════════
   INK ENGINE — Paint & Fluid Advection
═══════════════════════════════════════════ */
var Engine_Ink=(function(){
  var canvas,ctx,_active=false,mouse=window._mouse;
  var _needsReset=false;
  var gW=0,gH=0;
  var vx0,vy0,vx1,vy1,r0,g0,b0,r1,g1,b1;
  var imgData=null,offscreen=null,offCtx=null;
  var prevMX=0,prevMY=0;
  var _t=0,lastPulseTime=0;
  var _mode='water';
  var _damp=0.908;

  var _hue=0,_hueStep=30,_autoColor=true,_wasDown=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    grid_res:22,pen_size:5,pen_force:1.5,noise:0.4,
    bg_color:'#000000',paint_color:'#ff2200',
    pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function clamp01(v){return v<0?0:v>1?1:v;}
  function idx(x,y){return y*gW+x;}

  /* HSL→RGB for color ramp */
  function hslToHex(h,s,l){
    var c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
    var r=0,g=0,b=0;
    if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}
    else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}
    function h2(v){return ('0'+Math.round((v+m)*255).toString(16)).slice(-2);}
    return '#'+h2(r)+h2(g)+h2(b);
  }

  function advanceColor(){
    _hue=(_hue+_hueStep)%360;
    cfg.paint_color=hslToHex(_hue,1,0.55);
    var el=document.getElementById('inkpaint-color');if(el)el.value=cfg.paint_color;
    var sw=document.getElementById('inkcolor-swatch');if(sw)sw.style.background=cfg.paint_color;
  }

  /* flow noise — adds organic turbulence to the velocity field */
  /* somme d'ondes planes orientées dans des directions variées — évite les hachures
     alignées sur les axes que produirait un produit sin(x)*cos(y) ou des termes purs x/y */
  function flowNoise(x,y,t){
    return Math.sin(x*0.045+y*0.085+t*0.9)*0.5
          +Math.sin(x*0.09-y*0.04+t*0.5)*0.35
          +Math.sin(-x*0.03+y*0.11+t*1.4)*0.3
          +Math.sin(x*0.13+y*0.02-t*0.7)*0.25;
  }

  function _reset(){
    gW=Math.max(1,Math.floor(cfg.canvas_width/cfg.grid_res));
    gH=Math.max(1,Math.floor(cfg.canvas_height/cfg.grid_res));
    var n=gW*gH;
    vx0=new Float32Array(n);vy0=new Float32Array(n);
    vx1=new Float32Array(n);vy1=new Float32Array(n);
    r0=new Float32Array(n);g0=new Float32Array(n);b0=new Float32Array(n);
    r1=new Float32Array(n);g1=new Float32Array(n);b1=new Float32Array(n);
    var bg=hexToRgb(cfg.bg_color);
    var br=bg[0]/255,bgv=bg[1]/255,bb=bg[2]/255;
    for(var i=0;i<n;i++){r0[i]=br;g0[i]=bgv;b0[i]=bb;}
    imgData=null;
    if(offscreen){offscreen.width=gW;offscreen.height=gH;}
    _t=0;
  }

  function bilinear(f,px,py){
    var x0=Math.floor(px),y0=Math.floor(py);
    var x1=x0+1,y1=y0+1;
    if(x0<0)x0=0;if(x1>=gW)x1=gW-1;
    if(y0<0)y0=0;if(y1>=gH)y1=gH-1;
    var sx=px-Math.floor(px),sy=py-Math.floor(py);
    return(1-sy)*((1-sx)*f[idx(x0,y0)]+sx*f[idx(x1,y0)])+sy*((1-sx)*f[idx(x0,y1)]+sx*f[idx(x1,y1)]);
  }

  function advect(src,dst,vxa,vya){
    for(var y=0;y<gH;y++){for(var x=0;x<gW;x++){
      var px=x-vxa[idx(x,y)],py=y-vya[idx(x,y)];
      if(px<0)px=0;if(px>gW-1)px=gW-1;
      if(py<0)py=0;if(py>gH-1)py=gH-1;
      dst[idx(x,y)]=bilinear(src,px,py);
    }}
  }

  /* diffusion isotrope — inclut les 4 voisins diagonaux en plus des orthogonaux
     pour éviter le motif en croix aligné sur les axes (hachures/angles droits) */
  function diffuse(src,dst,a){
    for(var y=0;y<gH;y++){for(var x=0;x<gW;x++){
      var c=src[idx(x,y)];
      var xm=x>0?x-1:x,xp=x<gW-1?x+1:x;
      var ym=y>0?y-1:y,yp=y<gH-1?y+1:y;
      var l=src[idx(xm,y)],ri=src[idx(xp,y)],u=src[idx(x,ym)],d2=src[idx(x,yp)];
      var nw=src[idx(xm,ym)],ne=src[idx(xp,ym)],sw=src[idx(xm,yp)],se=src[idx(xp,yp)];
      dst[idx(x,y)]=c*(1-4*a)+a*0.8*(l+ri+u+d2)+a*0.2*(nw+ne+sw+se);
    }}
  }

  function applyMouse(){
    /* detect new click → advance color ramp */
    if(mouse.down&&!_wasDown&&_autoColor)advanceColor();
    _wasDown=mouse.down;
    if(!mouse.down)return;
    var gx=Math.round(mouse.x/cfg.grid_res);
    var gy=Math.round(mouse.y/cfg.grid_res);
    var dvx=(mouse.x-prevMX)/cfg.grid_res;
    var dvy=(mouse.y-prevMY)/cfg.grid_res;
    var pr=cfg.pen_size,pf=cfg.pen_force;
    var pRgb=hexToRgb(cfg.paint_color);
    var pr_=pRgb[0]/255,pg_=pRgb[1]/255,pb_=pRgb[2]/255;
    for(var dy=-pr;dy<=pr;dy++){for(var dx=-pr;dx<=pr;dx++){
      var d=Math.sqrt(dx*dx+dy*dy);if(d>pr)continue;
      var f=1-d/pr;
      var cx=gx+dx,cy=gy+dy;
      if(cx<0||cx>=gW||cy<0||cy>=gH)continue;
      var i=idx(cx,cy);
      vx0[i]+=dvx*pf*f;vy0[i]+=dvy*pf*f;
      var blend=f*0.35;
      r0[i]=r0[i]*(1-blend)+pr_*blend;
      g0[i]=g0[i]*(1-blend)+pg_*blend;
      b0[i]=b0[i]*(1-blend)+pb_*blend;
    }}
  }

  function triggerPulse(){
    var cx=Math.floor(gW*(0.2+Math.random()*0.6));
    if(_autoColor)advanceColor();
    var pRgb=hexToRgb(cfg.paint_color);
    var pr=Math.max(2,Math.floor(cfg.pen_size*0.7));
    for(var dy=-pr;dy<=pr;dy++){for(var dx=-pr;dx<=pr;dx++){
      var d=Math.sqrt(dx*dx+dy*dy);if(d>pr)continue;
      var f=1-d/pr;
      var cx2=cx+dx,cy2=2+dy;
      if(cx2<0||cx2>=gW||cy2<0||cy2>=gH)continue;
      var i=idx(cx2,cy2);
      vy0[i]+=6*f;
      r0[i]=pRgb[0]/255;g0[i]=pRgb[1]/255;b0[i]=pRgb[2]/255;
    }}
    lastPulseTime=_t;
    var bar=document.getElementById('inkpulse-bar');
    if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function step(){
    var isWater=_mode==='water';
    var damp=_damp;
    var visc=isWater?0.02:0.18;
    var dyeDiff=isWater?0.07:0.008;
    var t;

    applyMouse();
    prevMX=mouse.x;prevMY=mouse.y;

    /* flow noise → organic turbulence (contrôlé par le slider) */
    if(cfg.noise>0){
      var nScale=cfg.noise*0.04;
      for(var y=0;y<gH;y++){for(var x=0;x<gW;x++){
        var angle=flowNoise(x,y,_t)*Math.PI*2;
        var ii=idx(x,y);
        vx0[ii]+=Math.cos(angle)*nScale;
        vy0[ii]+=Math.sin(angle)*nScale;
      }}
    }

    /* courant ambiant — l'eau bouge toujours doucement, même sans interaction ni noise */
    if(isWater){
      var aScale=0.012;
      for(var ya=0;ya<gH;ya++){for(var xa=0;xa<gW;xa++){
        var angA=flowNoise(xa*0.6,ya*0.6,_t*0.4)*Math.PI*2;
        var iia=idx(xa,ya);
        vx0[iia]+=Math.cos(angA)*aScale;
        vy0[iia]+=Math.sin(angA)*aScale;
      }}
    }

    /* damp velocity */
    var n=gW*gH;
    for(var i=0;i<n;i++){vx0[i]*=damp;vy0[i]*=damp;}

    /* diffuse velocity */
    diffuse(vx0,vx1,visc);diffuse(vy0,vy1,visc);
    t=vx0;vx0=vx1;vx1=t;t=vy0;vy0=vy1;vy1=t;

    /* advect velocity */
    advect(vx0,vx1,vx0,vy0);advect(vy0,vy1,vx0,vy0);
    t=vx0;vx0=vx1;vx1=t;t=vy0;vy0=vy1;vy1=t;

    /* advect color */
    advect(r0,r1,vx0,vy0);advect(g0,g1,vx0,vy0);advect(b0,b1,vx0,vy0);
    t=r0;r0=r1;r1=t;t=g0;g0=g1;g1=t;t=b0;b0=b1;b1=t;

    /* diffuse color */
    if(dyeDiff>0){
      diffuse(r0,r1,dyeDiff);diffuse(g0,g1,dyeDiff);diffuse(b0,b1,dyeDiff);
      t=r0;r0=r1;r1=t;t=g0;g0=g1;g1=t;t=b0;b0=b1;b1=t;
    }
  }

  function render(){
    if(!offscreen){offscreen=document.createElement('canvas');offCtx=offscreen.getContext('2d');}
    if(offscreen.width!==gW||offscreen.height!==gH){offscreen.width=gW;offscreen.height=gH;imgData=null;}
    if(!imgData||imgData.width!==gW||imgData.height!==gH)imgData=offCtx.createImageData(gW,gH);
    var pd=imgData.data,n=gW*gH;
    for(var i=0;i<n;i++){
      pd[i*4]=clamp01(r0[i])*255|0;
      pd[i*4+1]=clamp01(g0[i])*255|0;
      pd[i*4+2]=clamp01(b0[i])*255|0;
      pd[i*4+3]=255;
    }
    offCtx.putImageData(imgData,0,0);
    ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(offscreen,0,0,gW,gH,0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  function draw(){
    if(!_active)return;
    if(canvas.width!==cfg.canvas_width||canvas.height!==cfg.canvas_height){
      cfg.canvas_width=canvas.width;cfg.canvas_height=canvas.height;_reset();
    }
    _t+=0.016;
    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();
    step();render();
  }

  function init(){_reset();}
  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    var expectedGW=Math.max(1,Math.floor(cfg.canvas_width/cfg.grid_res));
    var expectedGH=Math.max(1,Math.floor(cfg.canvas_height/cfg.grid_res));
    if(!vx0||gW!==expectedGW||gH!==expectedGH||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  Object.defineProperty(cfg,'mode',{get:function(){return _mode;},set:function(v){_mode=v;}});
  Object.defineProperty(cfg,'damping',{get:function(){return _damp;},set:function(v){_damp=v;}});
  Object.defineProperty(cfg,'autoColor',{get:function(){return _autoColor;},set:function(v){_autoColor=v;}});
  Object.defineProperty(cfg,'hueStep',{get:function(){return _hueStep;},set:function(v){_hueStep=v;}});
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,advanceColor:advanceColor,markReset:function(){_needsReset=true;}};
})();

