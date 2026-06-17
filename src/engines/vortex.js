/* ═══════════════════════════════════════════
   VORTEX ENGINE
═══════════════════════════════════════════ */
var VortexEngine=(function(){
  var canvas,ctx;
  var mouse=window._mouse;
  var vortices=[],particles=[];
  var frameCount=0,lastPulseTime=0,lastAutoTime=0;
  var _active=false;
  var cfg={
    canvas_width:800,canvas_height:600,
    vortex_count:12,vortex_gamma_min:-3.0,vortex_gamma_max:3.0,
    vortex_epsilon:15,vortex_drag:0.9999,vortex_boundary:'reflect',
    show_vortex_markers:true,show_vortex_trails:false,trail_length:60,
    speck_count:8000,particle_drag:0.95,flow_force:0.08,
    line_width:1.0,opacity:1.0,trail:0.05,vel_max:8.0,
    vel_opacity_scale:false,vel_width_scale:false,
    color_mode:'gamma',color_pos:'#ff6600',color_neg:'#0066ff',
    color:'#ff6600',bg_color:'#050505',
    ramp_stops:[{pos:0,color:'#000000'},{pos:0.3,color:'#ff2200'},{pos:0.65,color:'#ff9900'},{pos:1,color:'#ffffff'}],
    pointer_mode:'spawn_pair',pen_size:40,push_force:1.0,spawn_gamma:2.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_type:'ring',pulse_strength:1.0,
    time_mode:'bpm',bpm:120,pulse_beat_div:1,
    auto_enabled:false,auto_interval:3.0,auto_beat_div:2,
    auto_mode:'random_pair',auto_count:2,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1,
    hue_tgt_particles:true,hue_tgt_bg:false
  };
  var vRampLUT=[];
  function buildVRamp(){
    vRampLUT=[];var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});
    for(var i=0;i<256;i++){var t=i/255,lo=stops[0],hi=stops[stops.length-1];for(var j=0;j<stops.length-1;j++){if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}}var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);vRampLUT.push(lerpHex(lo.color,hi.color,r));}
  }
  function VParticle(x,y){this.x=x;this.y=y;this.px=x;this.py=y;this.xv=0;this.yv=0;}
  function fieldAt(px,py){var ux=0,uy=0,eps2=cfg.vortex_epsilon*cfg.vortex_epsilon;for(var j=0;j<vortices.length;j++){var vj=vortices[j],dx=px-vj.x,dy=py-vj.y,r2=dx*dx+dy*dy+eps2,fac=vj.gamma/(2*Math.PI*r2);ux+=fac*dy;uy-=fac*dx;}return{x:ux,y:uy};}
  function applyBoundary(obj){var W=cfg.canvas_width,H=cfg.canvas_height;if(cfg.vortex_boundary==='reflect'){if(obj.x<0){obj.x=-obj.x;obj.vx=-obj.vx;}if(obj.x>W){obj.x=2*W-obj.x;obj.vx=-obj.vx;}if(obj.y<0){obj.y=-obj.y;obj.vy=-obj.vy;}if(obj.y>H){obj.y=2*H-obj.y;obj.vy=-obj.vy;}}else if(cfg.vortex_boundary==='wrap'){if(obj.x<0)obj.x+=W;if(obj.x>W)obj.x-=W;if(obj.y<0)obj.y+=H;if(obj.y>H)obj.y-=H;}obj.x=Math.max(-50,Math.min(W+50,obj.x));obj.y=Math.max(-50,Math.min(H+50,obj.y));}
  function spawnVortex(x,y,gamma){var v={x:x,y:y,vx:0,vy:0,gamma:gamma,history:[]};vortices.push(v);return v;}
  function spawnPair(cx,cy,dx,dy,g){g=g||cfg.spawn_gamma;var nx=-dy,ny=dx,nl=Math.sqrt(nx*nx+ny*ny)||1;nx/=nl;ny/=nl;spawnVortex(cx+nx*20,cy+ny*20,g);spawnVortex(cx-nx*20,cy-ny*20,-g);}
  function triggerPulse(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2,n=Math.max(2,Math.round(cfg.pulse_strength*4));
    if(cfg.pulse_type==='ring'){for(var i=0;i<n;i++){var a=i/n*Math.PI*2,r=Math.min(W,H)*0.3;spawnPair(cx+Math.cos(a)*r,cy+Math.sin(a)*r,-Math.sin(a),Math.cos(a),cfg.pulse_strength*2);}}
    else if(cfg.pulse_type==='burst'){for(var i=0;i<n;i++){var a=i/n*Math.PI*2,r=30+Math.random()*Math.min(W,H)*0.25,g=cfg.pulse_strength*(Math.random()>0.5?1:-1)*3;spawnVortex(cx+Math.cos(a)*r,cy+Math.sin(a)*r,g);}}
    else{for(var i=0;i<n;i++)spawnVortex(Math.random()*W,Math.random()*H,(Math.random()-.5)*cfg.pulse_strength*6);}
    if(window.oscSend)window.oscSend('/fluid/pulse_fired',[cfg.pulse_strength]);
  }
  function triggerAuto(){
    var W=cfg.canvas_width,H=cfg.canvas_height,n=cfg.auto_count;
    for(var i=0;i<n;i++){
      if(cfg.auto_mode==='dipole_burst'){var a=Math.random()*Math.PI*2;spawnPair(Math.random()*W,Math.random()*H,Math.cos(a),Math.sin(a),cfg.spawn_gamma);}
      else if(cfg.auto_mode==='vortex_ring'){var cx=W/2+(Math.random()-.5)*W*.4,cy=H/2+(Math.random()-.5)*H*.4,r=40+Math.random()*60,nn=4;for(var j=0;j<nn;j++){var aa=j/nn*Math.PI*2;spawnVortex(cx+Math.cos(aa)*r,cy+Math.sin(aa)*r,cfg.spawn_gamma*(j%2?1:-1));}}
      else spawnVortex(Math.random()*W,Math.random()*H,(Math.random()-.5)*cfg.spawn_gamma*2);
    }
  }
  function draw(){
    if(!_active)return;
    frameCount++;
    var now=performance.now()/1000,W=cfg.canvas_width,H=cfg.canvas_height;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    var autoEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.auto_beat_div:cfg.auto_interval;
    if(cfg.auto_enabled&&now-lastAutoTime>=autoEff){triggerAuto();lastAutoTime=now;}
    var mxv=mouse.x-mouse.px,myv=mouse.y-mouse.py;
    if(mouse.down){
      var mode=cfg.pointer_mode;
      if(mode==='spawn_pair'&&(Math.abs(mxv)+Math.abs(myv)>2)){if(frameCount%8===0)spawnPair(mouse.x,mouse.y,mxv,myv,cfg.spawn_gamma);}
      else if(mode==='spawn_pos'&&frameCount%12===0)spawnVortex(mouse.x,mouse.y,cfg.spawn_gamma);
      else if(mode==='spawn_neg'&&frameCount%12===0)spawnVortex(mouse.x,mouse.y,-cfg.spawn_gamma);
      else if(mode==='kill_nearest'&&frameCount%10===0){var best=-1,bd=Infinity;for(var i=0;i<vortices.length;i++){var dx=vortices[i].x-mouse.x,dy=vortices[i].y-mouse.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=i;}}if(best>=0&&bd<cfg.pen_size*cfg.pen_size)vortices.splice(best,1);}
      else if((mode==='attract'||mode==='scatter')&&mouse.down){for(var i=0;i<vortices.length;i++){var v=vortices[i],dx=mouse.x-v.x,dy=mouse.y-v.y,d=Math.sqrt(dx*dx+dy*dy)||1;if(d>cfg.pen_size)continue;var f=(cfg.pen_size-d)/cfg.pen_size*cfg.push_force*0.5;if(mode==='attract'){v.vx+=dx/d*f;v.vy+=dy/d*f;}else{var a=Math.random()*Math.PI*2;v.vx+=Math.cos(a)*f;v.vy+=Math.sin(a)*f;}}}
    }
    if(vortices.length>100)vortices.splice(0,vortices.length-100);
    var eps2=cfg.vortex_epsilon*cfg.vortex_epsilon;
    for(var i=0;i<vortices.length;i++){var vi=vortices[i];vi.vx=0;vi.vy=0;for(var j=0;j<vortices.length;j++){if(i===j)continue;var vj=vortices[j],dx=vi.x-vj.x,dy=vi.y-vj.y,r2=dx*dx+dy*dy+eps2,fac=vj.gamma/(2*Math.PI*r2);vi.vx+=fac*dy;vi.vy-=fac*dx;}}
    for(var i=0;i<vortices.length;i++){var v=vortices[i];v.x+=v.vx;v.y+=v.vy;v.vx*=cfg.vortex_drag;v.vy*=cfg.vortex_drag;applyBoundary(v);if(cfg.show_vortex_trails){v.history.push({x:v.x,y:v.y});if(v.history.length>cfg.trail_length)v.history.shift();}}
    var hOff=cfg.hue_shift_enabled?cfg.hue_shift:0;
    if(cfg.hue_shift_enabled&&cfg.hue_speed!==0)cfg.hue_shift=((cfg.hue_shift+cfg.hue_speed*(cfg.bpm/60)/cfg.hue_beat_div/60)%360+360)%360;
    for(var i=0;i<particles.length;i++){var p=particles[i],f=fieldAt(p.x,p.y);p.xv+=f.x*cfg.flow_force*80;p.yv+=f.y*cfg.flow_force*80;p.xv*=cfg.particle_drag;p.yv*=cfg.particle_drag;p.x+=p.xv;p.y+=p.yv;if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.px=p.x;p.py=p.y;p.xv=p.yv=0;}}
    var bgEff=cfg.hue_shift_enabled&&cfg.hue_tgt_bg?shiftHexHue(cfg.bg_color,hOff):cfg.bg_color;
    if(cfg.trail<=0.005){ctx.fillStyle=bgEff;ctx.fillRect(0,0,W,H);}else{ctx.fillStyle=hexToRgba(bgEff,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    if(cfg.show_vortex_trails){for(var i=0;i<vortices.length;i++){var v=vortices[i],hist=v.history;if(hist.length<2)continue;var c=v.gamma>0?cfg.color_pos:cfg.color_neg;ctx.strokeStyle=hexToRgba(c,0.3);ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(hist[0].x,hist[0].y);for(var k=1;k<hist.length;k++)ctx.lineTo(hist[k].x,hist[k].y);ctx.stroke();}}
    ctx.globalAlpha=cfg.opacity;ctx.lineWidth=cfg.line_width;
    for(var i=0;i<particles.length;i++){
      var p=particles[i],spd=Math.sqrt(p.xv*p.xv+p.yv*p.yv),t=Math.min(1,spd/cfg.vel_max),col;
      if(cfg.color_mode==='velocity'||cfg.color_mode==='ramp')col=vRampLUT[Math.round(t*255)]||cfg.color;
      else if(cfg.color_mode==='solid')col=cfg.hue_shift_enabled&&cfg.hue_tgt_particles?shiftHexHue(cfg.color,hOff):cfg.color;
      else{var bestD=Infinity,bestG=1;for(var j=0;j<vortices.length;j++){var dx=p.x-vortices[j].x,dy=p.y-vortices[j].y,d=dx*dx+dy*dy;if(d<bestD){bestD=d;bestG=vortices[j].gamma;}}col=bestG>0?cfg.color_pos:cfg.color_neg;if(cfg.hue_shift_enabled&&cfg.hue_tgt_particles)col=shiftHexHue(col,hOff);}
      ctx.globalAlpha=cfg.opacity*(cfg.vel_opacity_scale?Math.max(0.05,t):1);
      ctx.strokeStyle=col;ctx.lineWidth=cfg.vel_width_scale?Math.max(0.3,cfg.line_width*t*2):cfg.line_width;
      ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();p.px=p.x;p.py=p.y;
    }
    ctx.globalAlpha=1;
    if(cfg.show_vortex_markers&&!window._cursorHidden){for(var i=0;i<vortices.length;i++){var v=vortices[i],r=Math.max(4,Math.min(14,Math.abs(v.gamma)*3)),c=v.gamma>0?cfg.color_pos:cfg.color_neg;ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(v.x,v.y,r,0,Math.PI*2);ctx.stroke();var a=frameCount*0.03*(v.gamma>0?1:-1);ctx.beginPath();ctx.moveTo(v.x+Math.cos(a)*r,v.y+Math.sin(a)*r);ctx.lineTo(v.x+Math.cos(a+0.6)*(r-4),v.y+Math.sin(a+0.6)*(r-4));ctx.stroke();}}
    mouse.px=mouse.x;mouse.py=mouse.y;
  }
  function _reset(){
    var W=cfg.canvas_width,H=cfg.canvas_height;vortices=[];
    for(var i=0;i<Math.floor(cfg.vortex_count/2);i++){spawnVortex(Math.random()*W,Math.random()*H,cfg.spawn_gamma*(0.5+Math.random()));spawnVortex(Math.random()*W,Math.random()*H,-cfg.spawn_gamma*(0.5+Math.random()));}
    particles=[];for(var i=0;i<cfg.speck_count;i++)particles.push(new VParticle(Math.random()*W,Math.random()*H));
    lastPulseTime=0;lastAutoTime=0;buildVRamp();
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;_reset();}
  function activate(){
    _active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(particles.length===0||_needsReset){_needsReset=false;_reset();}
  }
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

