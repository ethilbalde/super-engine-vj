/* ═══════════════════════════════════════════
   LORENZ ENGINE
═══════════════════════════════════════════ */
var Engine_Lorenz=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var trajectories=[],frameCount=0,lastPulseTime=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    trajectory_count:2000,attractor:'lorenz',
    lorenz_sigma:10,lorenz_rho:28,lorenz_beta:2.667,
    rossler_a:0.2,rossler_b:0.2,rossler_c:5.7,
    clifford_a:-1.4,clifford_b:1.6,clifford_c:1.0,clifford_d:0.7,
    thomas_b:0.19,
    dt:0.005,proj_angle_x:0.5,proj_angle_y:0.3,proj_scale:15,
    auto_rotate:true,rotate_speed_x:0.003,rotate_speed_y:0.005,
    trail_length:50,color_mode:'velocity',color:'#44aaff',bg_color:'#010508',
    trail:0.05,opacity:1.0,line_width:0.7,vel_max:3.0,
    ramp_stops:[{pos:0,color:'#000033'},{pos:0.4,color:'#0044ff'},{pos:0.8,color:'#44aaff'},{pos:1,color:'#ffffff'}],
    pointer_mode:'perturb',pen_size:80,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'perturb',
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };
  function stepLorenz(p,dt){var dx=cfg.lorenz_sigma*(p.y-p.x),dy=p.x*(cfg.lorenz_rho-p.z)-p.y,dz=p.x*p.y-cfg.lorenz_beta*p.z;p.x+=dx*dt;p.y+=dy*dt;p.z+=dz*dt;}
  function stepRossler(p,dt){var dx=-(p.y+p.z),dy=p.x+cfg.rossler_a*p.y,dz=cfg.rossler_b+p.z*(p.x-cfg.rossler_c);p.x+=dx*dt;p.y+=dy*dt;p.z+=dz*dt;}
  function stepClifford(p){var nx=Math.sin(cfg.clifford_a*p.y)+cfg.clifford_c*Math.cos(cfg.clifford_a*p.x),ny=Math.sin(cfg.clifford_b*p.x)+cfg.clifford_d*Math.cos(cfg.clifford_b*p.y);p.x=nx;p.y=ny;p.z=0;}
  function stepThomas(p,dt){var dx=Math.sin(p.y)-cfg.thomas_b*p.x,dy=Math.sin(p.z)-cfg.thomas_b*p.y,dz=Math.sin(p.x)-cfg.thomas_b*p.z;p.x+=dx*dt;p.y+=dy*dt;p.z+=dz*dt;}
  function project(p,W,H,ax,ay,scale){var cosY=Math.cos(ay),sinY=Math.sin(ay);var x1=p.x*cosY-p.z*sinY;var cosX=Math.cos(ax),sinX=Math.sin(ax);var y2=p.y*cosX-(p.x*sinY+p.z*cosY)*sinX;return{x:W/2+x1*scale,y:H/2+y2*scale};}
  function triggerPulse(){for(var i=0;i<trajectories.length;i++){var p=trajectories[i];p.x+=(Math.random()-.5)*cfg.pulse_strength*2;p.y+=(Math.random()-.5)*cfg.pulse_strength*2;p.z+=(Math.random()-.5)*cfg.pulse_strength*2;}}
  /* scale defaults per attractor — each has different amplitude */
  var ATTRACTOR_SCALE={lorenz:12,rossler:18,clifford:null/*auto*/,thomas:55};
  function _reset(){
    /* clear canvas immediately so no ghost from previous attractor */
    if(canvas&&ctx){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);}
    trajectories=[];
    var att=cfg.attractor;
    /* auto scale: clifford lives in [-2,2] so fill ~40% of smaller dim */
    if(att==='clifford'){cfg.proj_scale=Math.floor(Math.min(cfg.canvas_width,cfg.canvas_height)*0.35);}
    else if(ATTRACTOR_SCALE[att]){cfg.proj_scale=ATTRACTOR_SCALE[att];}
    /* update UI slider if present */
    var sl=document.getElementById('lproj-scale'),vl=document.getElementById('lval-scale');
    if(sl){sl.value=cfg.proj_scale;}if(vl){vl.textContent=cfg.proj_scale;}
    /* reset rotation so new attractor starts facing front */
    cfg.proj_angle_x=0.5;cfg.proj_angle_y=0.3;
    for(var i=0;i<cfg.trajectory_count;i++){
      var p={x:(Math.random()-.5)*2,y:(Math.random()-.5)*2,z:(Math.random()-.5)*2,history:[]};
      /* warm up with faster dt so particles reach the attractor quickly */
      var warmup,wdt;
      if(att==='rossler'){warmup=1000;wdt=cfg.dt*6;}
      else if(att==='thomas'){warmup=2000;wdt=cfg.dt*5;}
      else{warmup=80;wdt=cfg.dt;}
      for(var w=0;w<warmup;w++){if(att==='lorenz')stepLorenz(p,wdt);else if(att==='rossler')stepRossler(p,wdt);else if(att==='clifford')stepClifford(p);else if(att==='thomas')stepThomas(p,wdt);}
      trajectories.push(p);
    }
    lastPulseTime=0;
  }
  var lorzLUT=[];
  function buildLorzLUT(){lorzLUT=[];var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});for(var i=0;i<256;i++){var t=i/255,lo=stops[0],hi=stops[stops.length-1];for(var j=0;j<stops.length-1;j++){if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}}var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);lorzLUT.push(lerpHex(lo.color,hi.color,r));}}
  function draw(){
    if(!_active)return;frameCount++;
    var W=cfg.canvas_width,H=cfg.canvas_height,now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    if(cfg.auto_rotate){cfg.proj_angle_x+=cfg.rotate_speed_x;cfg.proj_angle_y+=cfg.rotate_speed_y;}
    if(mouse.down&&cfg.pointer_mode==='perturb'){for(var i=0;i<trajectories.length;i++){trajectories[i].x+=(Math.random()-.5)*0.1;trajectories[i].y+=(Math.random()-.5)*0.1;}}
    if(cfg.trail<=0.005){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}else{ctx.fillStyle=hexToRgba(cfg.bg_color,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    ctx.globalAlpha=cfg.opacity;ctx.lineWidth=cfg.line_width;
    var att=cfg.attractor,ax=cfg.proj_angle_x,ay=cfg.proj_angle_y,sc=cfg.proj_scale;
    for(var i=0;i<trajectories.length;i++){
      var p=trajectories[i],px=p.x,py=p.y,pz=p.z;
      if(att==='lorenz')stepLorenz(p,cfg.dt);else if(att==='rossler')stepRossler(p,cfg.dt);else if(att==='clifford')stepClifford(p);else stepThomas(p,cfg.dt);
      if(att==='clifford'){
        /* Clifford is a discrete 2D map — render as dots, no trails */
        var t2=Math.min(1,(p.x+2)/4);
        var col2=lorzLUT[Math.round(t2*255)]||cfg.color;
        var sp2=project(p,W,H,ax,ay,sc);
        ctx.fillStyle=col2;ctx.fillRect(sp2.x,sp2.y,1,1);
      } else {
        var speed=Math.sqrt((p.x-px)*(p.x-px)+(p.y-py)*(p.y-py)+(p.z-pz)*(p.z-pz)),t=Math.min(1,speed/cfg.vel_max);
        var col=lorzLUT[Math.round(t*255)]||cfg.color;
        p.history.push({x:p.x,y:p.y,z:p.z});if(p.history.length>cfg.trail_length)p.history.shift();
        if(p.history.length<2)continue;
        ctx.strokeStyle=col;ctx.beginPath();
        var sp=project(p.history[0],W,H,ax,ay,sc);ctx.moveTo(sp.x,sp.y);
        for(var k=1;k<p.history.length;k++){var ep=project(p.history[k],W,H,ax,ay,sc);ctx.lineTo(ep.x,ep.y);}
        ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;buildLorzLUT();_reset();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(trajectories.length===0||_needsReset){_needsReset=false;_reset();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,buildLUT:buildLorzLUT,markReset:function(){_needsReset=true;}};
})();

