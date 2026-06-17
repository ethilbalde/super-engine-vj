/* ═══════════════════════════════════════════
   SPH ENGINE
═══════════════════════════════════════════ */
var Engine_SPH=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var frameCount=0,lastPulseTime=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    particle_count:2000,rest_density:1.0,stiffness:200.0,viscosity_mu:0.3,
    smoothing_h:25,gravity_x:0,gravity_y:0.15,
    render_mode:'particles',particle_radius:2,color_mode:'velocity',
    color:'#00ff88',bg_color:'#050505',
    ramp_stops:[{pos:0,color:'#001133'},{pos:0.4,color:'#00aa44'},{pos:1,color:'#aaffcc'}],
    opacity:1.0,trail:0.0,vel_max:5.0,
    pointer_mode:'push',pen_size:50,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'splash',
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };
  var sphParticles=[];
  var grid={},cellSize;
  function hashCell(cx,cy){return cx+'|'+cy;}
  function buildGrid(ps,h){grid={};cellSize=h;for(var i=0;i<ps.length;i++){var p=ps[i],cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize),k=hashCell(cx,cy);if(!grid[k])grid[k]=[];grid[k].push(i);}}
  function getNeighbors(p,ps,h){var nb=[],cx=Math.floor(p.x/cellSize),cy=Math.floor(p.y/cellSize);for(var dx=-1;dx<=1;dx++)for(var dy=-1;dy<=1;dy++){var cell=grid[hashCell(cx+dx,cy+dy)];if(cell)for(var k=0;k<cell.length;k++)nb.push(cell[k]);}return nb;}
  function poly6(r,h){if(r>h)return 0;var t=h*h-r*r;return 315/(64*Math.PI*Math.pow(h,9))*t*t*t;}
  function spikyGrad(r,h){if(r<=0||r>h)return 0;var t=h-r;return-45/(Math.PI*Math.pow(h,6))*t*t;}
  function viscLaplacian(r,h){if(r>h)return 0;return 45/(Math.PI*Math.pow(h,6))*(h-r);}
  /* Natural density for poly6 kernel with h=30 is ~8e-5.
     cfg.rest_density slider (0-2, default 1.0) is a multiplier around that value. */
  var NATURAL_DENSITY=8e-5;
  function computeDensityPressure(){var h=cfg.smoothing_h,restD=cfg.rest_density*NATURAL_DENSITY;for(var i=0;i<sphParticles.length;i++){var pi=sphParticles[i];pi.density=0;var nb=getNeighbors(pi,sphParticles,h);for(var k=0;k<nb.length;k++){var pj=sphParticles[nb[k]],dx=pi.x-pj.x,dy=pi.y-pj.y,r=Math.sqrt(dx*dx+dy*dy);pi.density+=poly6(r,h);}pi.density=Math.max(pi.density,1e-8);pi.pressure=cfg.stiffness*(pi.density-restD);}}
  function computeForces(){var h=cfg.smoothing_h;for(var i=0;i<sphParticles.length;i++){var pi=sphParticles[i];pi.fx=0;pi.fy=0;var nb=getNeighbors(pi,sphParticles,h);for(var k=0;k<nb.length;k++){if(nb[k]===i)continue;var pj=sphParticles[nb[k]],dx=pi.x-pj.x,dy=pi.y-pj.y,r=Math.sqrt(dx*dx+dy*dy)||0.001,nx=dx/r,ny=dy/r;var fp=-(pi.pressure+pj.pressure)/(2*pj.density)*spikyGrad(r,h);pi.fx+=fp*nx;pi.fy+=fp*ny;var fv=cfg.viscosity_mu/pj.density*viscLaplacian(r,h);pi.fx+=fv*(pj.vx-pi.vx);pi.fy+=fv*(pj.vy-pi.vy);}pi.fx+=cfg.gravity_x*pi.density;pi.fy+=cfg.gravity_y*pi.density;}}
  function integrate(W,H){var dt=0.016,VEL_MAX=12;for(var i=0;i<sphParticles.length;i++){var p=sphParticles[i];p.vx+=p.fx/Math.max(p.density,1e-8)*dt;p.vy+=p.fy/Math.max(p.density,1e-8)*dt;p.vx*=0.99;p.vy*=0.99;/* cap velocity to prevent explosion */var spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy);if(spd>VEL_MAX){p.vx=p.vx/spd*VEL_MAX;p.vy=p.vy/spd*VEL_MAX;}p.x+=p.vx;p.y+=p.vy;var r=cfg.particle_radius;if(p.x<r){p.x=r;p.vx*=-0.5;}if(p.x>W-r){p.x=W-r;p.vx*=-0.5;}if(p.y<r){p.y=r;p.vy*=-0.5;}if(p.y>H-r){p.y=H-r;p.vy*=-0.5;}}}
  function spawnParticle(x,y){return{x:x,y:y,vx:(Math.random()-.5)*0.5,vy:(Math.random()-.5)*0.5,density:1,pressure:0,fx:0,fy:0,r:cfg.particle_radius};}
  function _reset(){var W=cfg.canvas_width,H=cfg.canvas_height;sphParticles=[];for(var i=0;i<cfg.particle_count;i++){var x=W*0.2+Math.random()*W*0.6,y=H*0.1+Math.random()*H*0.5;sphParticles.push(spawnParticle(x,y));}lastPulseTime=0;}
  function triggerPulse(){var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;for(var i=0;i<sphParticles.length;i++){var p=sphParticles[i],dx=p.x-cx,dy=p.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1;p.vx+=dx/d*cfg.pulse_strength*5;p.vy+=dy/d*cfg.pulse_strength*5;}}
  var sphLUT=[];
  function buildSphLUT(){sphLUT=[];var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});for(var i=0;i<256;i++){var t=i/255,lo=stops[0],hi=stops[stops.length-1];for(var j=0;j<stops.length-1;j++){if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}}var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);sphLUT.push(lerpHex(lo.color,hi.color,r));}}
  function draw(){
    if(!_active)return;frameCount++;
    var W=cfg.canvas_width,H=cfg.canvas_height,now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    if(mouse.down){var mx=mouse.x,my=mouse.y,pm=cfg.pointer_mode,ps=cfg.pen_size,pf=cfg.push_force;
      if(pm==='inject'){/* spawn particles near cursor */
        for(var s=0;s<3;s++){var ax=mx+(Math.random()-.5)*ps*0.6,ay=my+(Math.random()-.5)*ps*0.6;sphParticles.push(spawnParticle(ax,ay));}
      } else {
        for(var i=0;i<sphParticles.length;i++){var p=sphParticles[i],dx=mx-p.x,dy=my-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;
          if(d<ps){var f=(ps-d)/ps*pf;
            if(pm==='push'){p.vx-=dx/d*f*5;p.vy-=dy/d*f*5;}/* repulse from cursor */
            else if(pm==='drain'&&d<ps*0.5){sphParticles.splice(i,1);i--;}
            else if(pm==='heat'){p.vx+=(Math.random()-.5)*f*8;p.vy+=(Math.random()-.5)*f*8;}
          }
        }
      }
    }
    buildGrid(sphParticles,cfg.smoothing_h);
    computeDensityPressure();computeForces();integrate(W,H);
    if(cfg.trail<=0.005){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}else{ctx.fillStyle=hexToRgba(cfg.bg_color,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    ctx.globalAlpha=cfg.opacity;
    for(var i=0;i<sphParticles.length;i++){
      var p=sphParticles[i],spd=Math.sqrt(p.vx*p.vx+p.vy*p.vy),t=Math.min(1,spd/cfg.vel_max);
      var col=cfg.color_mode==='velocity'?(sphLUT[Math.round(t*255)]||cfg.color):cfg.color;
      ctx.fillStyle=col;ctx.beginPath();ctx.arc(p.x,p.y,cfg.particle_radius,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;buildSphLUT();_reset();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(sphParticles.length===0||_needsReset){_needsReset=false;_reset();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

