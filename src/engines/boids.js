/* ═══════════════════════════════════════════
   BOIDS ENGINE
═══════════════════════════════════════════ */
var Engine_Boids=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var boids=[],frameCount=0,lastPulseTime=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    boid_count:300,perception_radius:80,
    separation_weight:1.5,alignment_weight:1.0,cohesion_weight:1.0,separation_dist:25,
    max_speed:3.0,max_force:0.1,
    render_mode:'trail',boid_size:4,trail_length_boids:8,
    color_mode:'solid',color:'#ffdd00',bg_color:'#050505',
    ramp_stops:[{pos:0,color:'#111100'},{pos:0.5,color:'#ffaa00'},{pos:1,color:'#ffffff'}],
    opacity:1.0,trail:0.15,vel_max:4.0,
    pointer_mode:'scatter',pen_size:80,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'explode',
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };
  function Boid(x,y){this.x=x;this.y=y;this.vx=(Math.random()-.5)*2;this.vy=(Math.random()-.5)*2;this.ax=0;this.ay=0;this.history=[];}
  function steer(boid){
    var sep={x:0,y:0},ali={x:0,y:0},coh={x:0,y:0},nSep=0,nAli=0,nCoh=0;
    var R=cfg.perception_radius,D=cfg.separation_dist;
    for(var j=0;j<boids.length;j++){if(boids[j]===boid)continue;var dx=boid.x-boids[j].x,dy=boid.y-boids[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<D&&d>0){sep.x+=dx/d;sep.y+=dy/d;nSep++;}if(d<R){ali.x+=boids[j].vx;ali.y+=boids[j].vy;nAli++;coh.x+=boids[j].x;coh.y+=boids[j].y;nCoh++;}}
    var fx=0,fy=0;
    if(nSep>0){fx+=sep.x/nSep*cfg.separation_weight;fy+=sep.y/nSep*cfg.separation_weight;}
    if(nAli>0){var al=Math.sqrt(ali.x*ali.x+ali.y*ali.y)||1;fx+=(ali.x/nAli/al*cfg.max_speed-boid.vx)*cfg.alignment_weight;fy+=(ali.y/nAli/al*cfg.max_speed-boid.vy)*cfg.alignment_weight;}
    if(nCoh>0){var cx2=coh.x/nCoh-boid.x,cy2=coh.y/nCoh-boid.y,cd=Math.sqrt(cx2*cx2+cy2*cy2)||1;fx+=cx2/cd*cfg.cohesion_weight;fy+=cy2/cd*cfg.cohesion_weight;}
    var fl=Math.sqrt(fx*fx+fy*fy)||1;if(fl>cfg.max_force){fx=fx/fl*cfg.max_force;fy=fy/fl*cfg.max_force;}
    return{x:fx,y:fy};
  }
  function triggerPulse(){var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2;for(var i=0;i<boids.length;i++){var b=boids[i],dx=b.x-cx,dy=b.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1;b.vx+=dx/d*cfg.pulse_strength*3;b.vy+=dy/d*cfg.pulse_strength*3;}}
  function _reset(){var W=cfg.canvas_width,H=cfg.canvas_height;boids=[];for(var i=0;i<cfg.boid_count;i++)boids.push(new Boid(Math.random()*W,Math.random()*H));lastPulseTime=0;}
  var boidsLUT=[];
  function buildBoidsLUT(){boidsLUT=[];var stops=cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});for(var i=0;i<256;i++){var t=i/255,lo=stops[0],hi=stops[stops.length-1];for(var j=0;j<stops.length-1;j++){if(t>=stops[j].pos&&t<=stops[j+1].pos){lo=stops[j];hi=stops[j+1];break;}}var r=(hi.pos-lo.pos)<0.0001?0:(t-lo.pos)/(hi.pos-lo.pos);boidsLUT.push(lerpHex(lo.color,hi.color,r));}}
  function draw(){
    if(!_active)return;frameCount++;
    var W=cfg.canvas_width,H=cfg.canvas_height,now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    if(mouse.down){for(var i=0;i<boids.length;i++){var b=boids[i],dx=b.x-mouse.x,dy=b.y-mouse.y,d=Math.sqrt(dx*dx+dy*dy)||1;if(d<cfg.pen_size){var f=(cfg.pen_size-d)/cfg.pen_size*cfg.push_force*2;if(cfg.pointer_mode==='scatter'){b.vx+=dx/d*f;b.vy+=dy/d*f;}else if(cfg.pointer_mode==='attract'){b.vx-=dx/d*f*0.5;b.vy-=dy/d*f*0.5;}else if(cfg.pointer_mode==='wind'){b.vx+=(mouse.x-mouse.px)*0.1;b.vy+=(mouse.y-mouse.py)*0.1;}else if(cfg.pointer_mode==='obstacle'){var ux=dx/d,uy=dy/d,vAlong=b.vx*ux+b.vy*uy;if(vAlong<0){b.vx-=ux*vAlong;b.vy-=uy*vAlong;}b.vx+=ux*f;b.vy+=uy*f;}}}}
    for(var i=0;i<boids.length;i++){
      var b=boids[i],f=steer(b);b.vx+=f.x;b.vy+=f.y;
      var spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy)||1;if(spd>cfg.max_speed){b.vx=b.vx/spd*cfg.max_speed;b.vy=b.vy/spd*cfg.max_speed;}
      b.x+=b.vx;b.y+=b.vy;
      if(b.x<0)b.x+=W;if(b.x>W)b.x-=W;if(b.y<0)b.y+=H;if(b.y>H)b.y-=H;
      b.history.push({x:b.x,y:b.y});if(b.history.length>cfg.trail_length_boids)b.history.shift();
    }
    if(cfg.trail<=0.005){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}else{ctx.fillStyle=hexToRgba(cfg.bg_color,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    ctx.globalAlpha=cfg.opacity;
    for(var i=0;i<boids.length;i++){
      var b=boids[i],spd=Math.sqrt(b.vx*b.vx+b.vy*b.vy),t=Math.min(1,spd/cfg.vel_max);
      var col=cfg.color_mode==='ramp'?(boidsLUT[Math.round(t*255)]||cfg.color):cfg.color;
      ctx.strokeStyle=col;ctx.lineWidth=1.5;
      if(cfg.render_mode==='trail'&&b.history.length>1){ctx.beginPath();ctx.moveTo(b.history[0].x,b.history[0].y);for(var k=1;k<b.history.length;k++){/* skip segment if boid wrapped across boundary */var ddx=Math.abs(b.history[k].x-b.history[k-1].x),ddy=Math.abs(b.history[k].y-b.history[k-1].y);if(ddx>W*0.5||ddy>H*0.5){ctx.moveTo(b.history[k].x,b.history[k].y);}else{ctx.lineTo(b.history[k].x,b.history[k].y);}}ctx.stroke();}
      else if(cfg.render_mode==='arrow'){var a=Math.atan2(b.vy,b.vx),s=cfg.boid_size;ctx.beginPath();ctx.moveTo(b.x+Math.cos(a)*s*2,b.y+Math.sin(a)*s*2);ctx.lineTo(b.x+Math.cos(a+2.4)*s,b.y+Math.sin(a+2.4)*s);ctx.lineTo(b.x+Math.cos(a-2.4)*s,b.y+Math.sin(a-2.4)*s);ctx.closePath();ctx.stroke();}
      else{ctx.fillStyle=col;ctx.beginPath();ctx.arc(b.x,b.y,cfg.boid_size/2,0,Math.PI*2);ctx.fill();}
    }
    ctx.globalAlpha=1;
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;buildBoidsLUT();_reset();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(boids.length===0||_needsReset){_needsReset=false;_reset();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

