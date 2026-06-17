/* ═══════════════════════════════════════════
   FOLLOW ENGINE — Flow Field Particles
═══════════════════════════════════════════ */
var Engine_Follow=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var particles=[],_t=0,frameCount=0,lastPulseTime=0,_needsReset=false;
  var _opacity=0.85,_wasMouseDown=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    count:350,speed:6,trail_len:12,wave_amp:8,
    focus_x:0.5,focus_y:0.48,
    fade:0.22,attractor_size:60,
    glow_enabled:true,vignette:true,floor_enabled:true,
    color:'#4488ff',bg_color:'#040408',
    pointer_mode:'attract',pen_size:80,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_type:'burst',pulse_strength:1.0,
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };

  function Particle(){this.x=0;this.y=0;this.vx=0;this.vy=0;this.life=0;this.maxLife=0;this.size=0;this.spd=0;this.history=[];this.reset();}
  Particle.prototype.reset=function(){
    var W=cfg.canvas_width,H=cfg.canvas_height,r=Math.random();
    if(r<0.5){this.x=Math.random()*W;this.y=-4;}
    else if(r<0.75){this.x=-4;this.y=Math.random()*H;}
    else{this.x=W+4;this.y=Math.random()*H;}
    this.life=0;this.maxLife=120+Math.random()*180;
    this.size=0.7+Math.random()*1.5;
    this.spd=cfg.speed*(0.45+Math.random()*0.9);
    this.vx=0;this.vy=0;this.history=[];
  };

  function flowAngle(x,y,cx,cy){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var nx=x/W-0.5,ny=y/H-0.5,r=Math.sqrt(nx*nx+ny*ny);
    var toFocus=Math.atan2(cy-y,cx-x);
    var wave=Math.sin(r*6-_t*0.8)*(cfg.wave_amp*0.01);
    return toFocus+wave+0.4*Math.sin(_t*0.3+nx*4);
  }

  function drawAttractor(cx,cy){
    if(!cfg.glow_enabled)return;
    var pulse=1+Math.sin(_t*2)*0.15,r=cfg.attractor_size*pulse;
    var c=hexToRgb(cfg.color);
    var grad=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    grad.addColorStop(0,'rgba('+c.r+','+c.g+','+c.b+',0.35)');
    grad.addColorStop(0.45,'rgba('+c.r+','+c.g+','+c.b+',0.08)');
    grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba('+c.r+','+c.g+','+c.b+',0.75)';
    ctx.beginPath();ctx.arc(cx,cy,3*pulse,0,Math.PI*2);ctx.fill();
  }

  function drawVignette(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;
    var grad=ctx.createRadialGradient(cx,cy,Math.min(W,H)*0.18,cx,cy,Math.max(W,H)*0.78);
    grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,0.52)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  }

  function drawFloor(){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var grad=ctx.createLinearGradient(0,H*0.72,0,H);
    grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,0.32)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
  }

  function triggerPulse(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W*cfg.focus_x,cy=H*cfg.focus_y;
    if(cfg.pulse_type==='burst'){
      for(var i=0;i<particles.length;i++){
        var p=particles[i],dx=p.x-cx,dy=p.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1;
        if(d<W*0.6){p.vx+=dx/d*cfg.pulse_strength*5;p.vy+=dy/d*cfg.pulse_strength*5;}
      }
    } else if(cfg.pulse_type==='reset'){
      for(var i=0;i<particles.length;i++)particles[i].reset();
    } else {
      for(var i=0;i<particles.length;i++){particles[i].vx+=(Math.random()-0.5)*cfg.pulse_strength*9;particles[i].vy+=(Math.random()-0.5)*cfg.pulse_strength*9;}
    }
  }

  function draw(){
    if(!_active)return;
    frameCount++;_t+=0.016;
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}

    /* attractor position */
    var cx,cy;
    if(cfg.pointer_mode==='attract'&&window._cursorOnCanvas){
      cx=mouse.x;cy=mouse.y;
      cfg.focus_x=cx/W;cfg.focus_y=cy/H;
      /* sync sliders live */
      var sx=document.getElementById('fwfocus-x'),sy=document.getElementById('fwfocus-y');
      if(sx){sx.value=cfg.focus_x.toFixed(2);var v=document.getElementById('fwval-fx');if(v)v.textContent=cfg.focus_x.toFixed(2);}
      if(sy){sy.value=cfg.focus_y.toFixed(2);var v=document.getElementById('fwval-fy');if(v)v.textContent=cfg.focus_y.toFixed(2);}
    } else {cx=W*cfg.focus_x;cy=H*cfg.focus_y;}

    /* scatter brush */
    if(mouse.down&&cfg.pointer_mode==='scatter'){
      for(var i=0;i<particles.length;i++){
        var p=particles[i],dx=p.x-mouse.x,dy=p.y-mouse.y,d=Math.sqrt(dx*dx+dy*dy)||1;
        if(d<cfg.pen_size){var f=(cfg.pen_size-d)/cfg.pen_size*cfg.push_force*3;p.vx+=dx/d*f;p.vy+=dy/d*f;}
      }
    }

    /* click expulsion — explosion ponctuelle au clic, indépendante du mode pointeur */
    if(mouse.down&&!_wasMouseDown){
      var expR=cfg.pen_size*3;
      for(var ei=0;ei<particles.length;ei++){
        var pe=particles[ei],dxe=pe.x-mouse.x,dye=pe.y-mouse.y,de=Math.sqrt(dxe*dxe+dye*dye)||1;
        if(de<expR){
          var fe=(1-de/expR)*cfg.push_force*9;
          pe.vx+=dxe/de*fe;pe.vy+=dye/de*fe;
        }
      }
    }
    _wasMouseDown=mouse.down;

    /* LAYER 1 — fade trail */
    var bg=hexToRgb(cfg.bg_color);
    ctx.fillStyle='rgba('+bg.r+','+bg.g+','+bg.b+','+cfg.fade+')';
    ctx.fillRect(0,0,W,H);

    /* LAYER 2 — attractor glow */
    drawAttractor(cx,cy);

    /* LAYER 3 — particles */
    var c=hexToRgb(cfg.color);
    ctx.lineWidth=1;
    for(var i=0;i<particles.length;i++){
      var p=particles[i];
      /* update */
      p.life++;
      var ang=flowAngle(p.x,p.y,cx,cy);
      p.vx=p.vx*0.82+Math.cos(ang)*p.spd*0.18;
      p.vy=p.vy*0.82+Math.sin(ang)*p.spd*0.18;
      p.history.push({x:p.x,y:p.y});
      if(p.history.length>cfg.trail_len)p.history.shift();
      p.x+=p.vx;p.y+=p.vy;
      if(p.life>=p.maxLife||p.x<-30||p.x>W+30||p.y<-30||p.y>H+30){p.reset();continue;}
      /* draw trail */
      var lifeFrac=p.life/p.maxLife,baseAlpha=Math.sin(lifeFrac*Math.PI)*_opacity;
      if(baseAlpha<0.01||p.history.length<2)continue;
      var tlen=p.history.length;
      for(var k=1;k<tlen;k++){
        var ta=baseAlpha*(k/tlen)*0.55;
        ctx.strokeStyle='rgba('+c.r+','+c.g+','+c.b+','+ta.toFixed(3)+')';
        ctx.lineWidth=p.size*0.55;
        ctx.beginPath();ctx.moveTo(p.history[k-1].x,p.history[k-1].y);ctx.lineTo(p.history[k].x,p.history[k].y);ctx.stroke();
      }
      /* head */
      ctx.fillStyle='rgba('+c.r+','+c.g+','+c.b+','+Math.min(1,baseAlpha*1.5).toFixed(3)+')';
      ctx.beginPath();ctx.arc(p.x,p.y,p.size*1.3,0,Math.PI*2);ctx.fill();
    }

    /* LAYER 4 — floor + vignette */
    if(cfg.floor_enabled)drawFloor();
    if(cfg.vignette)drawVignette();
  }

  function _reset(){
    particles=[];
    for(var i=0;i<cfg.count;i++)particles.push(new Particle());
    _t=0;frameCount=0;lastPulseTime=0;
  }

  function init(){
    canvas=document.getElementById('c');ctx=canvas.getContext('2d');
    cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;
    _reset();
  }
  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(particles.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  /* expose _opacity for wiring */
  Object.defineProperty(cfg,'opacity',{get:function(){return _opacity;},set:function(v){_opacity=v;}});

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

