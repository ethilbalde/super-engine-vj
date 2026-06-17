/* ═══════════════════════════════════════════
   N-BODY ENGINE
═══════════════════════════════════════════ */
var NBodyEngine=(function(){
  var canvas,ctx;
  var mouse=window._mouse;
  var bodies=[],particles=[];
  var frameCount=0,lastPulseTime=0,lastAutoTime=0;
  var _active=false;
  var cfg={
    canvas_width:800,canvas_height:600,
    body_count:6,mass_min:80,mass_max:400,G:0.4,softening:20,
    body_drag:0.9998,repulsion_enabled:true,repulsion_strength:1.5,
    boundary_mode:'reflect',show_body_trails:true,trail_length:150,
    speck_count:10000,particle_drag:0.97,flow_force:0.1,
    line_width:1.0,opacity:1.0,trail:0.08,vel_max:6.0,
    vel_opacity_scale:false,vel_width_scale:false,
    color_mode:'mass',color:'#aa44ff',bg_color:'#020208',
    body_colors:['#aa44ff','#ff4422','#22ffaa','#ffaa00','#44aaff','#ff44aa','#aaff44','#ff8800'],
    ramp_stops:[{pos:0,color:'#000033'},{pos:0.3,color:'#4400ff'},{pos:0.65,color:'#ff4400'},{pos:1,color:'#ffffff'}],
    pointer_mode:'spawn_body',pen_size:60,push_force:1.0,spawn_mass:200,
    pulse_enabled:false,pulse_interval:2.0,pulse_type:'scatter',pulse_strength:1.0,
    time_mode:'bpm',bpm:120,pulse_beat_div:1,
    auto_enabled:false,auto_interval:4.0,auto_beat_div:4,
    auto_mode:'random',auto_count:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1,
    hue_tgt_particles:true,hue_tgt_bg:false
  };
  var nbRampLUT=[];
  function buildNBRamp(){nbRampLUT=[];var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});for(var i=0;i<256;i++){var t=i/255,lo=stops[0],hi=stops[stops.length-1];for(var j=0;j<stops.length-1;j++){if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}}var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);nbRampLUT.push(lerpHex(lo.color,hi.color,r));}}
  function NParticle(x,y){this.x=x;this.y=y;this.px=x;this.py=y;this.xv=0;this.yv=0;}
  function spawnBody(x,y,mass,vx,vy){var b={x:x,y:y,vx:vx||0,vy:vy||0,ax:0,ay:0,mass:mass||cfg.spawn_mass,pinned:false,history:[]};b.baseColor=cfg.body_colors[bodies.length%cfg.body_colors.length]||cfg.color;bodies.push(b);return b;}
  function applyBoundary(b){var W=cfg.canvas_width,H=cfg.canvas_height,mode=cfg.boundary_mode;if(mode==='reflect'){if(b.x<0){b.x=-b.x;b.vx=-b.vx;}if(b.x>W){b.x=2*W-b.x;b.vx=-b.vx;}if(b.y<0){b.y=-b.y;b.vy=-b.vy;}if(b.y>H){b.y=2*H-b.y;b.vy=-b.vy;}}else if(mode==='wrap'){if(b.x<0)b.x+=W;if(b.x>W)b.x-=W;if(b.y<0)b.y+=H;if(b.y>H)b.y-=H;}else if(mode==='absorb'){if(b.x<0||b.x>W||b.y<0||b.y>H){bodies.splice(bodies.indexOf(b),1);return;}}b.x=Math.max(-100,Math.min(W+100,b.x));b.y=Math.max(-100,Math.min(H+100,b.y));}
  function triggerPulse(){var cx=cfg.canvas_width/2,cy=cfg.canvas_height/2;if(cfg.pulse_type==='scatter'){for(var i=0;i<bodies.length;i++){if(bodies[i].pinned)continue;var dx=bodies[i].x-cx,dy=bodies[i].y-cy,d=Math.sqrt(dx*dx+dy*dy)||1;bodies[i].vx+=dx/d*cfg.pulse_strength*8;bodies[i].vy+=dy/d*cfg.pulse_strength*8;}}else if(cfg.pulse_type==='implode'){for(var i=0;i<bodies.length;i++){if(bodies[i].pinned)continue;var dx=cx-bodies[i].x,dy=cy-bodies[i].y,d=Math.sqrt(dx*dx+dy*dy)||1;bodies[i].vx+=dx/d*cfg.pulse_strength*8;bodies[i].vy+=dy/d*cfg.pulse_strength*8;}}else{for(var i=0;i<bodies.length;i++){var b=bodies[i];if(b.pinned)continue;var dx=b.x-cx,dy=b.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1,v=Math.sqrt(cfg.G*cfg.mass_max/(d||1))*0.5;b.vx=-dy/d*v;b.vy=dx/d*v;}}if(window.oscSend)window.oscSend('/fluid/pulse_fired',[cfg.pulse_strength]);}
  function triggerAuto(){var W=cfg.canvas_width,H=cfg.canvas_height;if(cfg.auto_mode==='binary_star'){var cx=W/2+(Math.random()-.5)*W*.4,cy=H/2+(Math.random()-.5)*H*.4,m=cfg.mass_min+(cfg.mass_max-cfg.mass_min)*Math.random(),r=60+Math.random()*80,v=Math.sqrt(cfg.G*m/r)*0.5;spawnBody(cx-r,cy,m,0,-v);spawnBody(cx+r,cy,m,0,v);}else if(cfg.auto_mode==='ring'){var cx=W/2,cy=H/2,n=Math.max(3,cfg.auto_count),r=120;for(var i=0;i<n;i++){var a=i/n*Math.PI*2,v=Math.sqrt(cfg.G*cfg.mass_min*n/r)*0.6;spawnBody(cx+Math.cos(a)*r,cy+Math.sin(a)*r,cfg.mass_min,-Math.sin(a)*v,Math.cos(a)*v);}}else{for(var i=0;i<cfg.auto_count;i++)spawnBody(Math.random()*W,Math.random()*H,cfg.mass_min+(cfg.mass_max-cfg.mass_min)*Math.random());}}
  function draw(){
    if(!_active)return;frameCount++;
    var now=performance.now()/1000,W=cfg.canvas_width,H=cfg.canvas_height;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    var autoEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.auto_beat_div:cfg.auto_interval;
    if(cfg.auto_enabled&&now-lastAutoTime>=autoEff){triggerAuto();lastAutoTime=now;}
    var mxv=mouse.x-mouse.px,myv=mouse.y-mouse.py;
    if(mouse.down){
      if(cfg.pointer_mode==='spawn_body'&&frameCount%20===0)spawnBody(mouse.x,mouse.y,cfg.spawn_mass,mxv*0.5,myv*0.5);
      else if(cfg.pointer_mode==='attract_bodies'){for(var i=0;i<bodies.length;i++){var b=bodies[i];if(b.pinned)continue;var dx=mouse.x-b.x,dy=mouse.y-b.y,d=Math.sqrt(dx*dx+dy*dy)||1;if(d>cfg.pen_size)continue;b.vx+=dx/d*cfg.push_force*0.3;b.vy+=dy/d*cfg.push_force*0.3;}}
      else if(cfg.pointer_mode==='repulse_bodies'){for(var i=0;i<bodies.length;i++){var b=bodies[i];if(b.pinned)continue;var dx=b.x-mouse.x,dy=b.y-mouse.y,d=Math.sqrt(dx*dx+dy*dy)||1;if(d>cfg.pen_size)continue;b.vx+=dx/d*cfg.push_force*0.5;b.vy+=dy/d*cfg.push_force*0.5;}}
      else if(cfg.pointer_mode==='kill_nearest'&&frameCount%15===0){var best=-1,bd=Infinity;for(var i=0;i<bodies.length;i++){var dx=bodies[i].x-mouse.x,dy=bodies[i].y-mouse.y,d=dx*dx+dy*dy;if(d<bd){bd=d;best=i;}}if(best>=0&&bd<cfg.pen_size*cfg.pen_size)bodies.splice(best,1);}
    }
    if(bodies.length>30)bodies.splice(0,bodies.length-30);
    var s2=cfg.softening*cfg.softening;
    for(var i=0;i<bodies.length;i++){bodies[i].ax=0;bodies[i].ay=0;}
    for(var i=0;i<bodies.length;i++){for(var j=i+1;j<bodies.length;j++){var bi=bodies[i],bj=bodies[j],dx=bj.x-bi.x,dy=bj.y-bi.y,r2=dx*dx+dy*dy+s2,r=Math.sqrt(r2);var fi=cfg.G*bj.mass/r2,fj=cfg.G*bi.mass/r2;bi.ax+=fi*dx/r;bi.ay+=fi*dy/r;bj.ax-=fj*dx/r;bj.ay-=fj*dy/r;if(cfg.repulsion_enabled&&r<cfg.softening*3){var rf=cfg.repulsion_strength*(cfg.softening*3-r)/r2;bi.ax-=rf*dx;bi.ay-=rf*dy;bj.ax+=rf*dx;bj.ay+=rf*dy;}}}
    for(var i=0;i<bodies.length;i++){var b=bodies[i];if(b.pinned)continue;b.vx+=b.ax;b.vy+=b.ay;b.vx*=cfg.body_drag;b.vy*=cfg.body_drag;b.x+=b.vx;b.y+=b.vy;applyBoundary(b);if(cfg.show_body_trails&&b.x>-100&&b.x<W+100){b.history.push({x:b.x,y:b.y});if(b.history.length>cfg.trail_length)b.history.shift();}}
    var hOff=cfg.hue_shift_enabled?cfg.hue_shift:0;
    if(cfg.hue_shift_enabled&&cfg.hue_speed!==0)cfg.hue_shift=((cfg.hue_shift+cfg.hue_speed*(cfg.bpm/60)/cfg.hue_beat_div/60)%360+360)%360;
    for(var i=0;i<particles.length;i++){var p=particles[i];for(var j=0;j<bodies.length;j++){var b=bodies[j],dx=b.x-p.x,dy=b.y-p.y,r2=dx*dx+dy*dy+s2,r=Math.sqrt(r2),f=cfg.G*b.mass/r2*cfg.flow_force;p.xv+=f*dx/r*80;p.yv+=f*dy/r*80;}p.xv*=cfg.particle_drag;p.yv*=cfg.particle_drag;p.x+=p.xv;p.y+=p.yv;if(p.x<0||p.x>W||p.y<0||p.y>H){p.x=Math.random()*W;p.y=Math.random()*H;p.px=p.x;p.py=p.y;p.xv=p.yv=0;}}
    var bgEff=cfg.hue_shift_enabled&&cfg.hue_tgt_bg?shiftHexHue(cfg.bg_color,hOff):cfg.bg_color;
    if(cfg.trail<=0.005){ctx.fillStyle=bgEff;ctx.fillRect(0,0,W,H);}else{ctx.fillStyle=hexToRgba(bgEff,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    if(cfg.show_body_trails){for(var i=0;i<bodies.length;i++){var b=bodies[i],h=b.history;if(h.length<2)continue;ctx.strokeStyle=hexToRgba(b.baseColor||cfg.color,0.25);ctx.lineWidth=0.5;ctx.beginPath();ctx.moveTo(h[0].x,h[0].y);for(var k=1;k<h.length;k++)ctx.lineTo(h[k].x,h[k].y);ctx.stroke();}}
    ctx.globalAlpha=cfg.opacity;ctx.lineWidth=cfg.line_width;
    for(var i=0;i<particles.length;i++){var p=particles[i],spd=Math.sqrt(p.xv*p.xv+p.yv*p.yv),t=Math.min(1,spd/cfg.vel_max),col;if(cfg.color_mode==='velocity'||cfg.color_mode==='ramp')col=nbRampLUT[Math.round(t*255)]||cfg.color;else if(cfg.color_mode==='mass'){var d1=Infinity,d2=Infinity,c1=cfg.color,c2=cfg.color;for(var j=0;j<bodies.length;j++){var dx=p.x-bodies[j].x,dy=p.y-bodies[j].y,d=dx*dx+dy*dy;if(d<d1){d2=d1;c2=c1;d1=d;c1=bodies[j].baseColor||cfg.color;}else if(d<d2){d2=d;c2=bodies[j].baseColor||cfg.color;}}if(bodies.length>1){var r1=Math.sqrt(d1)+1,r2=Math.sqrt(d2)+1;col=lerpHex(c1,c2,r1/(r1+r2));}else col=c1;}else col=cfg.hue_shift_enabled&&cfg.hue_tgt_particles?shiftHexHue(cfg.color,hOff):cfg.color;ctx.strokeStyle=col;ctx.beginPath();ctx.moveTo(p.px,p.py);ctx.lineTo(p.x,p.y);ctx.stroke();p.px=p.x;p.py=p.y;}
    ctx.globalAlpha=1;
    for(var i=0;i<bodies.length;i++){var b=bodies[i],r=Math.max(4,Math.sqrt(b.mass)*0.5);ctx.strokeStyle=b.baseColor||cfg.color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(b.x,b.y,r,0,Math.PI*2);ctx.stroke();}
    mouse.px=mouse.x;mouse.py=mouse.y;
  }
  function _reset(){var W=cfg.canvas_width,H=cfg.canvas_height;bodies=[];for(var i=0;i<cfg.body_count;i++)spawnBody(50+Math.random()*(W-100),50+Math.random()*(H-100),cfg.mass_min+(cfg.mass_max-cfg.mass_min)*Math.random(),(Math.random()-.5)*2,(Math.random()-.5)*2);particles=[];for(var i=0;i<cfg.speck_count;i++)particles.push(new NParticle(Math.random()*W,Math.random()*H));lastPulseTime=0;lastAutoTime=0;buildNBRamp();}
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;_reset();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(particles.length===0||_needsReset){_needsReset=false;_reset();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,_getBodies:function(){return bodies;},markReset:function(){_needsReset=true;}};
})();

