/* ═══════════════════════════════════════════
   MANDALA ENGINE — Symétrie radiale fractale
   Croissance organique de pétales, branches & motifs géométriques
═══════════════════════════════════════════ */
var Engine_Mandala=(function(){
  var canvas,ctx;
  var mouse=window._mouse;
  var branches=[],_active=false,frameCount=0,lastPulseTime=0,lastAutoTime=0;
  var _t=0,_needsReset=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    branch_count:8,symmetry_order:6,
    growth_speed:0.8,branch_length:120,branch_angle_spread:25,
    branch_thickness_min:0.5,branch_thickness_max:3.0,
    seed_radius:30,attraction_strength:0.15,damping:0.92,
    color_mode:'hue',color:'#ff44aa',color2:'#44ffaa',bg_color:'#0a0a0a',
    ramp_stops:[{pos:0,color:'#330066'},{pos:0.3,color:'#aa00ff'},{pos:0.65,color:'#ff00ff'},{pos:1,color:'#ffff00'}],
    pen_size:60,push_force:1.5,
    spiral_enabled:false,spiral_tightness:0.05,
    pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
    time_mode:'bpm',bpm:120,
    auto_enabled:false,auto_interval:4.0,auto_beat_div:4,
    hue_shift_enabled:false,hue_shift:0,hue_speed:20,hue_beat_div:1,
    hue_tgt_particles:true,hue_tgt_bg:false,
    rotation_speed:5.0,twist_enabled:false,
    opacity:0.95,line_width:1.2,trail:0.02
  };

  var rampLUT=[];
  function buildRamp(){
    rampLUT=[];
    var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});
    for(var i=0;i<256;i++){
      var t=i/255,lo=stops[0],hi=stops[stops.length-1];
      for(var j=0;j<stops.length-1;j++){
        if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}
      }
      var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);
      rampLUT.push(lerpHex(lo.color,hi.color,r));
    }
  }

  function Branch(x,y,angle,life){
    this.x=x;this.y=y;this.px=x;this.py=y;
    this.vx=Math.cos(angle)*cfg.growth_speed;
    this.vy=Math.sin(angle)*cfg.growth_speed;
    this.angle=angle;this.life=life;this.maxLife=life;
    this.thickness=cfg.branch_thickness_min+Math.random()*(cfg.branch_thickness_max-cfg.branch_thickness_min);
    this.color=Math.random();this.parent=null;
  }
  Branch.prototype.step=function(){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var cx=W/2,cy=H/2;
    var dx=cx-this.x,dy=cy-this.y,d=Math.sqrt(dx*dx+dy*dy)||1;
    this.vx+=(dx/d)*cfg.attraction_strength;
    this.vy+=(dy/d)*cfg.attraction_strength;
    this.vx*=cfg.damping;this.vy*=cfg.damping;
    this.px=this.x;this.py=this.y;
    this.x+=this.vx;this.y+=this.vy;
    if(cfg.spiral_enabled){
      var a=Math.atan2(this.y-cy,this.x-cx);
      this.angle+=cfg.spiral_tightness;
    }
    this.life-=1;
  };

  function spawnBranch(x,y,angle,life){
    branches.push(new Branch(x,y,angle,life));
  }

  function triggerPulse(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;
    var n=Math.max(3,Math.round(cfg.symmetry_order*1.5));
    for(var i=0;i<n;i++){
      var baseAngle=i/n*Math.PI*2;
      for(var j=0;j<cfg.branch_count;j++){
        var angle=baseAngle+(Math.random()-0.5)*cfg.branch_angle_spread*Math.PI/180;
        spawnBranch(cx,cy,angle,120);
      }
    }
    if(window.oscSend)window.oscSend('/mandala/pulse_fired',[cfg.branch_count]);
  }

  function triggerAuto(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;
    var angle=Math.random()*Math.PI*2;
    for(var i=0;i<cfg.symmetry_order;i++){
      var a=angle+i/cfg.symmetry_order*Math.PI*2;
      spawnBranch(cx,cy,a,100);
    }
  }

  function draw(){
    if(!_active)return;
    frameCount++;_t+=0.016;
    var now=performance.now()/1000,W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;

    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    var autoEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.auto_beat_div:cfg.auto_interval;
    if(cfg.auto_enabled&&now-lastAutoTime>=autoEff){triggerAuto();lastAutoTime=now;}

    var mxv=mouse.x-mouse.px,myv=mouse.y-mouse.py;
    if(mouse.down){
      var d=Math.sqrt(mxv*mxv+myv*myv)||1;
      var angle=Math.atan2(myv,mxv);
      for(var i=0;i<cfg.symmetry_order;i++){
        var a=angle+i/cfg.symmetry_order*Math.PI*2;
        if(frameCount%4===0)spawnBranch(mouse.x,mouse.y,a,80+Math.random()*40);
      }
    }

    /* Update branches */
    for(var i=branches.length-1;i>=0;i--){
      var b=branches[i];
      b.step();
      if(b.life<=0){branches.splice(i,1);}
    }

    /* Rotation globale */
    var globalRotation=cfg.rotation_speed*_t*Math.PI/180;

    /* Render */
    var hOff=cfg.hue_shift_enabled?cfg.hue_shift:0;
    if(cfg.hue_shift_enabled&&cfg.hue_speed!==0)
      cfg.hue_shift=((cfg.hue_shift+cfg.hue_speed*(cfg.bpm/60)/cfg.hue_beat_div/60)%360+360)%360;

    if(cfg.trail<=0.005){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}
    else{ctx.fillStyle=hexToRgba(cfg.bg_color,1-cfg.trail);ctx.fillRect(0,0,W,H);}

    ctx.globalAlpha=cfg.opacity;
    ctx.lineWidth=cfg.line_width;
    ctx.lineCap='round';ctx.lineJoin='round';

    /* Draw mandala center */
    ctx.fillStyle=cfg.hue_shift_enabled&&cfg.hue_tgt_particles?shiftHexHue(cfg.color,hOff):cfg.color;
    ctx.beginPath();ctx.arc(cx,cy,8,0,Math.PI*2);ctx.fill();

    /* Draw branches with rotational symmetry */
    for(var i=0;i<branches.length;i++){
      var b=branches[i];
      var life_t=1-(b.maxLife-b.life)/b.maxLife;
      var thick=cfg.branch_thickness_min+(cfg.branch_thickness_max-cfg.branch_thickness_min)*life_t;
      var alpha=(b.life/b.maxLife)*cfg.opacity;

      var col;
      if(cfg.color_mode==='ramp')col=rampLUT[Math.round(b.color*255)]||cfg.color;
      else if(cfg.color_mode==='hue')col=shiftHexHue(cfg.color,hOff+b.color*60);
      else col=cfg.hue_shift_enabled&&cfg.hue_tgt_particles?shiftHexHue(cfg.color,hOff):cfg.color;

      ctx.strokeStyle=hexToRgba(col,alpha);
      ctx.lineWidth=thick;

      /* Draw for each symmetry */
      for(var s=0;s<cfg.symmetry_order;s++){
        var angle=globalRotation+s/cfg.symmetry_order*Math.PI*2;
        var cos_a=Math.cos(angle),sin_a=Math.sin(angle);

        var x1=cx+(b.px-cx)*cos_a-(b.py-cy)*sin_a;
        var y1=cy+(b.px-cx)*sin_a+(b.py-cy)*cos_a;
        var x2=cx+(b.x-cx)*cos_a-(b.y-cy)*sin_a;
        var y2=cy+(b.x-cx)*sin_a+(b.y-cy)*cos_a;

        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      }
    }

    ctx.globalAlpha=1;
    mouse.px=mouse.x;mouse.py=mouse.y;
  }

  function _reset(){
    branches=[];
    var W=cfg.canvas_width,H=cfg.canvas_height;
    if(ctx){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}
    _t=0;frameCount=0;lastPulseTime=0;lastAutoTime=0;
  }

  function init(){
    canvas=document.getElementById('c');ctx=canvas.getContext('2d');
    cfg.canvas_width=canvas.width||cfg.canvas_width;
    cfg.canvas_height=canvas.height||cfg.canvas_height;
    _reset();
    buildRamp();
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');
    cfg.canvas_width=cv.width||cfg.canvas_width;
    cfg.canvas_height=cv.height||cfg.canvas_height;
    if(branches.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }

  function deactivate(){_active=false;}

  return{
    cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,
    reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}
  };
})();
