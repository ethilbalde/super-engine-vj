/* ═══════════════════════════════════════════
   FLUID SIM ENGINE
═══════════════════════════════════════════ */
(function(w){
  var canvas,ctx,cursorCanvas,cursorCtx;
  var mouse=window._mouse;
  var cursorVisible=false;
  var frameCount=0,fpsCount=0,fpsLast=0;
  var lastPulseTime=0,lastAutoTime=0;
  var activeStrokes=[];
  var _active=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    resolution:10,speck_count:5000,
    pen_size:40,push_force:1.0,
    flow_force:0.05,particle_drag:0.50,
    viscosity:0.99,turbulence:0.0,
    trail:0.0,line_width:1.0,opacity:1.0,
    color:'#00ffff',brush_color:'#ff00ff',
    bg_color:'#000000',
    color_mode:'solid',
    ramp_stops:[{pos:0,color:'#000033'},{pos:0.3,color:'#0088ff'},{pos:0.65,color:'#00ffff'},{pos:1,color:'#ffffff'}],
    vel_max:4.0,vel_opacity_scale:false,vel_width_scale:false,
    gravity_x:0,gravity_y:0,
    injection_angle:0,pointer_mode:'push',
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_noise:0.3,pulse_type:'explode',
    time_mode:'bpm',bpm:120,pulse_beat_div:1,auto_beat_div:1,
    auto_enabled:false,auto_interval:2.0,auto_count:3,
    auto_length:60,auto_speed:4,auto_force:1.5,
    auto_mode:'push',auto_origin:'random',
    auto_color_mode:'none',auto_color:'#ff4400',auto_pen_size:60,
    kaleid_enabled:false,kaleid_segments:6,kaleid_angle:0,
    mirror_mode:'off',
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1,
    hue_tgt_particles:true,hue_tgt_bg:false,
    pixsort_enabled:false,pixsort_threshold:0.5,pixsort_direction:'up',pixsort_coverage:30,
    bloom_enabled:false,bloom_threshold:0.4,bloom_strength:1.5,
    chroma_enabled:false,chroma_amount:1.0,
    feedback_enabled:false,feedback_zoom:1.005,feedback_alpha:0.3,
    warp_strength:0.5,warp_decay:300,
    midi_clock_active:false,clock_smooth:0.9,pc_transition:'instant',
    note_map:[],
    scene_transition:'cut',scene_fade_dur:500,loop_length:2,
    ws_send_rate:0,
    curl_noise_enabled:false,curl_scale:1.5,curl_speed:0.5,curl_strength:1.0,_curl_t:0
  };

  var num_cols,num_rows,vec_cells=[],particles=[];
  var warpAmount=0,warpStartTime=0,lastFrameTime=0;

  function drawCursor(){
    cursorCtx.clearRect(0,0,cfg.canvas_width,cfg.canvas_height);
    if(!cursorVisible)return;
    var x=mouse.x,y=mouse.y,r=12;
    cursorCtx.save();
    cursorCtx.strokeStyle='rgba(255,255,255,.25)';cursorCtx.lineWidth=1;cursorCtx.setLineDash([3,5]);
    cursorCtx.beginPath();cursorCtx.arc(x,y,cfg.pen_size,0,Math.PI*2);cursorCtx.stroke();
    cursorCtx.setLineDash([]);
    cursorCtx.strokeStyle='rgba(255,255,255,.8)';cursorCtx.lineWidth=1.5;
    cursorCtx.beginPath();cursorCtx.arc(x,y,r,0,Math.PI*2);cursorCtx.stroke();
    cursorCtx.strokeStyle='rgba(255,255,255,.45)';cursorCtx.lineWidth=1;
    cursorCtx.beginPath();cursorCtx.moveTo(x-r-5,y);cursorCtx.lineTo(x+r+5,y);
    cursorCtx.moveTo(x,y-r-5);cursorCtx.lineTo(x,y+r+5);cursorCtx.stroke();
    if(cfg.pointer_mode==='injection'){
      var a=cfg.injection_angle*Math.PI/180;
      cursorCtx.strokeStyle='#ffaa00';cursorCtx.lineWidth=1.5;
      cursorCtx.beginPath();cursorCtx.moveTo(x,y);cursorCtx.lineTo(x+Math.cos(a)*cfg.pen_size*.85,y+Math.sin(a)*cfg.pen_size*.85);cursorCtx.stroke();
    }
    cursorCtx.restore();
  }

  function init(){
    canvas=document.getElementById('c');ctx=canvas.getContext('2d');
    cursorCanvas=document.getElementById('cursor-overlay');cursorCtx=cursorCanvas.getContext('2d');
    resize();
    canvas.addEventListener('mouseenter',function(){cursorVisible=true;window._cursorOnCanvas=true;});
    canvas.addEventListener('mouseleave',function(){cursorVisible=false;window._cursorOnCanvas=false;cursorCtx.clearRect(0,0,cfg.canvas_width,cfg.canvas_height);});
    canvas.addEventListener('mousemove',mouseMoveH);
    canvas.addEventListener('mousedown',mouseDownH);
    canvas.addEventListener('touchmove',touchMoveH,{passive:false});
    canvas.addEventListener('touchstart',touchStartH,{passive:false});
    canvas.addEventListener('touchend',function(e){if(!e.touches.length)mouse.down=false;});
    w.addEventListener('mouseup',function(){mouse.down=false;});
  }

  function resize(){
    var W=cfg.canvas_width,H=cfg.canvas_height,res=cfg.resolution;
    canvas.width=cursorCanvas.width=W;canvas.height=cursorCanvas.height=H;
    var wr=document.getElementById('canvas-wrapper');
    wr.style.width=W+'px';wr.style.height=H+'px';
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);
    num_cols=Math.floor(W/res);num_rows=Math.floor(H/res);
    vec_cells=[];particles=[];
    for(var i=0;i<cfg.speck_count;i++)particles.push(new Particle(Math.random()*W,Math.random()*H));
    for(var col=0;col<num_cols;col++){
      vec_cells[col]=[];
      for(var row=0;row<num_rows;row++){var cd=new Cell(col*res,row*res,res);cd.col=col;cd.row=row;vec_cells[col][row]=cd;}
    }
    for(var col=0;col<num_cols;col++){
      for(var row=0;row<num_rows;row++){
        var cd=vec_cells[col][row];
        var ru=Math.max(row-1,0),cl=Math.max(col-1,0),cr=Math.min(col+1,num_cols-1),rd=Math.min(row+1,num_rows-1);
        cd.up=vec_cells[col][ru];cd.left=vec_cells[cl][row];cd.up_left=vec_cells[cl][ru];cd.up_right=vec_cells[cr][ru];
        cd.down=vec_cells[col][rd];cd.right=vec_cells[cr][row];cd.down_left=vec_cells[cl][rd];cd.down_right=vec_cells[cr][rd];
      }
    }
  }

  function setParticleCount(n){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    while(particles.length<n)particles.push(new Particle(Math.random()*W,Math.random()*H));
    if(particles.length>n)particles.length=n;
  }

  function draw(){
    if(!_active)return;
    frameCount++;fpsCount++;
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    var autoEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.auto_beat_div:cfg.auto_interval;
    var dt=lastFrameTime>0?Math.min(now-lastFrameTime,0.1):0.016;lastFrameTime=now;
    if(cfg.curl_noise_enabled)cfg._curl_t+=dt*cfg.curl_speed*0.3;
    if(cfg.hue_shift_enabled&&cfg.hue_speed!==0){var hDegsPerSec=cfg.hue_speed*(cfg.bpm/60)/cfg.hue_beat_div;cfg.hue_shift=((cfg.hue_shift+hDegsPerSec*dt)%360+360)%360;}
    var hOff=cfg.hue_shift_enabled?cfg.hue_shift:0;
    if(warpAmount>0.001){warpAmount=cfg.warp_strength*Math.exp(-(now*1000-warpStartTime)/Math.max(1,cfg.warp_decay));if(warpAmount<0.001)warpAmount=0;}
    if(now-fpsLast>=1){document.getElementById('fps-display').textContent=fpsCount+' FPS';fpsCount=0;fpsLast=now;}
    if(cfg.pulse_enabled){
      var pe=now-lastPulseTime;
      var pb=document.getElementById('pulse-bar');if(pb)pb.style.width=(Math.min(1,pe/pulseEff)*100)+'%';
      if(pe>=pulseEff){triggerPulse();lastPulseTime=now;var bd=document.getElementById('beat-dot');if(bd){bd.style.width='100%';setTimeout(function(){bd.style.width='0%';},100);}}
    }
    if(cfg.auto_enabled){
      var ae=now-lastAutoTime;
      var ab=document.getElementById('auto-bar');if(ab)ab.style.width=(Math.min(1,ae/autoEff)*100)+'%';
      if(ae>=autoEff){triggerAutoStroke();lastAutoTime=now;}
    }
    var mxv=mouse.x-mouse.px,myv=mouse.y-mouse.py;
    var W=cfg.canvas_width,H=cfg.canvas_height;
    for(var si=activeStrokes.length-1;si>=0;si--){
      var s=activeStrokes[si];
      for(var ci=0;ci<num_cols;ci++)for(var cj=0;cj<num_rows;cj++)applyStrokeCell(vec_cells[ci][cj],s);
      s.x+=s.vx;s.y+=s.vy;s.steps--;
      if(s.steps<=0||s.x<-80||s.x>W+80||s.y<-80||s.y>H+80)activeStrokes.splice(si,1);
    }
    for(var i=0;i<num_cols;i++)for(var j=0;j<num_rows;j++){
      var cd=vec_cells[i][j];
      if(mouse.down)applyCellMode(cd,mxv,myv);
      if(cfg.turbulence>0){cd.xv+=(Math.random()-.5)*cfg.turbulence*.1;cd.yv+=(Math.random()-.5)*cfg.turbulence*.1;}
      if(cfg.curl_noise_enabled&&window.perlin3){var nx=i/num_cols*cfg.curl_scale,ny=j/num_rows*cfg.curl_scale,nt=cfg._curl_t,eps=0.01;var curlX=(perlin3(nx,ny+eps,nt)-perlin3(nx,ny-eps,nt))/(2*eps),curlY=-(perlin3(nx+eps,ny,nt)-perlin3(nx-eps,ny,nt))/(2*eps);cd.xv+=curlX*cfg.curl_strength*0.05;cd.yv+=curlY*cfg.curl_strength*0.05;}
      updatePressure(cd);
    }
    ctx.globalAlpha=1;
    var bgEff=cfg.hue_shift_enabled&&cfg.hue_tgt_bg?shiftHexHue(cfg.bg_color,hOff):cfg.bg_color;
    if(cfg.trail<=.005){ctx.fillStyle=bgEff;ctx.fillRect(0,0,W,H);}
    else{ctx.fillStyle=hexToRgba(bgEff,1-cfg.trail);ctx.fillRect(0,0,W,H);}
    for(var i=0;i<particles.length;i++)updatePhysics(particles[i]);
    ctx.globalAlpha=cfg.opacity;
    if(cfg.color_mode==='velocity')drawVelocity(hOff);else drawSolid(hOff);
    ctx.globalAlpha=1;
    for(var i=0;i<num_cols;i++)for(var j=0;j<num_rows;j++)updateVelocity(vec_cells[i][j]);
    if(mouse.down&&cfg.pointer_mode==='spawn'){
      var rate=Math.max(1,Math.round(cfg.push_force*3));
      for(var s2=0;s2<rate;s2++){
        if(particles.length<60000){var a=Math.random()*Math.PI*2,sp=Math.random()*cfg.push_force;var np=new Particle(mouse.x+(Math.random()-.5)*cfg.pen_size*2,mouse.y+(Math.random()-.5)*cfg.pen_size*2);np.xv=Math.cos(a)*sp;np.yv=Math.sin(a)*sp;particles.push(np);}
      }
      if(frameCount%30===0)syncCount();
    }
    if(frameCount%20===0&&cfg.pointer_mode==='erase'){for(var i=particles.length-1;i>=0;i--)if(particles[i]._dead){particles[i]=particles[particles.length-1];particles.length--;}syncCount();}
    if(w.pp2d)w.pp2d();
    window._warpAmount=warpAmount;
    mouse.px=mouse.x;mouse.py=mouse.y;
  }

  function syncCount(){var el=document.getElementById('val-speck');if(el)el.textContent=particles.length;var sl=document.getElementById('speck');if(sl)sl.value=Math.min(particles.length,30000);cfg.speck_count=particles.length;}

  function triggerPulse(){
    var W=cfg.canvas_width,H=cfg.canvas_height,cx=W/2,cy=H/2,dir=cfg.pulse_type==='implode'?-1:1;
    /* Apply DIRECTLY to particles to avoid fluid pressure correction artefact
       (pushing the velocity grid outward causes an inward pressure gradient
        that first attracts before repulsing — bypass it entirely) */
    for(var i=0;i<particles.length;i++){
      var p=particles[i];
      if(cfg.pulse_type!=='noise'){
        var pdx=p.x-cx,pdy=p.y-cy,pd=Math.sqrt(pdx*pdx+pdy*pdy)||1;
        p.xv+=(pdx/pd)*cfg.pulse_strength*dir*6;
        p.yv+=(pdy/pd)*cfg.pulse_strength*dir*6;
      }
      p.xv+=(Math.random()-.5)*cfg.pulse_noise*3;
      p.yv+=(Math.random()-.5)*cfg.pulse_noise*3;
    }
    /* Also push the velocity grid but at reduced strength to avoid pressure oscillation */
    if(cfg.pulse_type!=='noise'){
      for(var i=0;i<num_cols;i++)for(var j=0;j<num_rows;j++){
        var cd=vec_cells[i][j];
        var dx=cd.x-cx,dy=cd.y-cy,d=Math.sqrt(dx*dx+dy*dy)||1;
        cd.xv+=(dx/d)*cfg.pulse_strength*dir*3;
        cd.yv+=(dy/d)*cfg.pulse_strength*dir*3;
        cd.xv+=(Math.random()-.5)*cfg.pulse_noise*2;cd.yv+=(Math.random()-.5)*cfg.pulse_noise*2;
      }
    }
    warpAmount=cfg.warp_strength;warpStartTime=performance.now();
    if(w.oscSend)w.oscSend('/fluid/pulse_fired',[cfg.pulse_strength]);
    if(w._looperRecord)w._looperRecord('pulse',cfg.pulse_strength);
  }

  function triggerAutoStroke(countOverride){
    var W=cfg.canvas_width,H=cfg.canvas_height,n=countOverride||cfg.auto_count;
    for(var i=0;i<n;i++){
      var sx,sy;
      if(cfg.auto_origin==='center'){sx=W/2+(Math.random()-.5)*W*.3;sy=H/2+(Math.random()-.5)*H*.3;}
      else if(cfg.auto_origin==='edges'){var e=Math.floor(Math.random()*4);if(e===0){sx=Math.random()*W;sy=0;}else if(e===1){sx=W;sy=Math.random()*H;}else if(e===2){sx=Math.random()*W;sy=H;}else{sx=0;sy=Math.random()*H;}}
      else{sx=Math.random()*W;sy=Math.random()*H;}
      var angle=Math.random()*Math.PI*2;
      var sc=cfg.auto_color_mode==='paint'?cfg.auto_color:cfg.auto_color_mode==='random'?'#'+('00000'+Math.floor(Math.random()*0xFFFFFF).toString(16)).slice(-6):null;
      activeStrokes.push({x:sx,y:sy,vx:Math.cos(angle)*cfg.auto_speed,vy:Math.sin(angle)*cfg.auto_speed,steps:cfg.auto_length,mode:cfg.auto_mode,color:sc});
    }
  }

  function applyStrokeCell(cd,s){
    var dx=cd.x-s.x,dy=cd.y-s.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist>=cfg.auto_pen_size)return;
    var power=(cfg.auto_pen_size/Math.max(dist,4))*cfg.auto_force;
    switch(s.mode){
      case'push':var spd=Math.sqrt(s.vx*s.vx+s.vy*s.vy)||1;cd.xv+=(s.vx/spd)*power*cfg.auto_speed*.4;cd.yv+=(s.vy/spd)*power*cfg.auto_speed*.4;break;
      case'sink':cd.xv*=Math.max(0,1-.08*power);cd.yv*=Math.max(0,1-.08*power);break;
      case'turb_local':cd.xv+=(Math.random()-.5)*power*3;cd.yv+=(Math.random()-.5)*power*3;break;
    }
  }
  function applyStrokeParticle(p,s){
    var pdx=p.x-s.x,pdy=p.y-s.y,pd=Math.sqrt(pdx*pdx+pdy*pdy);if(pd<=0||pd>=cfg.auto_pen_size)return;
    var pn=1/pd,pp=(cfg.auto_pen_size/Math.max(pd,4))*cfg.auto_force;
    switch(s.mode){
      case'attract':p.xv-=pdx*pn*pp*.3;p.yv-=pdy*pn*pp*.3;break;
      case'vortex':p.xv+=-pdy*pn*pp*.3;p.yv+=pdx*pn*pp*.3;break;
      case'repulse':p.xv+=pdx*pn*pp*.3;p.yv+=pdy*pn*pp*.3;break;
    }
    if(s.color)p.color=s.color;
  }
  function applyCellMode(cd,mxv,myv){
    var dx=cd.x-mouse.x,dy=cd.y-mouse.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist>=cfg.pen_size)return;
    var power=(cfg.pen_size/Math.max(dist,4))*cfg.push_force;
    switch(cfg.pointer_mode){
      case'push':cd.xv+=mxv*power;cd.yv+=myv*power;break;
      case'injection':var a=cfg.injection_angle*Math.PI/180;cd.xv+=Math.cos(a)*power*1.5;cd.yv+=Math.sin(a)*power*1.5;break;
      case'sink':cd.xv*=Math.max(0,1-(cfg.pen_size-dist)/cfg.pen_size*.15*cfg.push_force);cd.yv*=Math.max(0,1-(cfg.pen_size-dist)/cfg.pen_size*.15*cfg.push_force);break;
      case'turb_local':cd.xv+=(Math.random()-.5)*power*3;cd.yv+=(Math.random()-.5)*power*3;break;
    }
  }
  function updatePhysics(p){
    if(p._dead)return;
    var W=cfg.canvas_width,H=cfg.canvas_height;
    if(p.x>=0&&p.x<W&&p.y>=0&&p.y<H){
      var col=Math.min(Math.floor(p.x/cfg.resolution),num_cols-1),row=Math.min(Math.floor(p.y/cfg.resolution),num_rows-1);
      var cd=vec_cells[col][row];
      var ax=(p.x%cfg.resolution)/cfg.resolution,ay=(p.y%cfg.resolution)/cfg.resolution;
      var w00=(1-ax)*(1-ay),w10=ax*(1-ay),w01=(1-ax)*ay,w11=ax*ay;
      var ff=cfg.flow_force;
      p.xv+=(w00*cd.xv+w10*cd.right.xv+w01*cd.down.xv+w11*cd.down_right.xv)*ff;
      p.yv+=(w00*cd.yv+w10*cd.right.yv+w01*cd.down.yv+w11*cd.down_right.yv)*ff;
      p.xv+=cfg.gravity_x;p.yv+=cfg.gravity_y;
      applyParticleMode(p);
      for(var si=0;si<activeStrokes.length;si++){var as=activeStrokes[si];applyStrokeParticle(p,as);}
      p.x+=p.xv;p.y+=p.yv;
    }else{p.x=p.px=Math.random()*W;p.y=p.py=Math.random()*H;p.xv=p.yv=0;}
    p.xv*=cfg.particle_drag;p.yv*=cfg.particle_drag;
  }
  function applyParticleMode(p){
    var mode=cfg.pointer_mode;
    if(!mouse.down||mode==='push'||mode==='injection'||mode==='sink'||mode==='turb_local'||mode==='spawn')return;
    var pdx=p.x-mouse.x,pdy=p.y-mouse.y,pd=Math.sqrt(pdx*pdx+pdy*pdy);
    if(pd<=0||pd>=cfg.pen_size)return;
    var pn=1/pd,pp=(cfg.pen_size/Math.max(pd,4))*cfg.push_force,fl=1-pd/cfg.pen_size;
    switch(mode){
      case'attract':p.xv-=pdx*pn*pp*.35;p.yv-=pdy*pn*pp*.35;break;
      case'vortex':p.xv+=-pdy*pn*pp*.35;p.yv+=pdx*pn*pp*.35;break;
      case'repulse':p.xv+=pdx*pn*pp*.35;p.yv+=pdy*pn*pp*.35;break;
      case'scatter':var sa=Math.random()*Math.PI*2;p.xv+=Math.cos(sa)*pp*.4;p.yv+=Math.sin(sa)*pp*.4;break;
      case'freeze':p.xv*=Math.max(0,1-fl*.25*cfg.push_force);p.yv*=Math.max(0,1-fl*.25*cfg.push_force);break;
      case'gravity_well':var gf=fl*fl*pp*.5;p.xv-=pdx*pn*gf;p.yv-=pdy*pn*gf;break;
      case'speed_boost':var b=1+fl*cfg.push_force*.15;p.xv*=b;p.yv*=b;break;
      case'color_brush':p.color=cfg.brush_color;break;
      case'erase':p._dead=true;break;
    }
  }
  function getLine(p){var dx=p.px-p.x,dy=p.py-p.y,dist=Math.sqrt(dx*dx+dy*dy),lim=Math.random()*.5;return dist>lim?[p.px,p.py]:[p.x+lim,p.y+lim];}
  function drawSolid(hOff){
    ctx.lineWidth=cfg.line_width;var dc=hOff?shiftHexHue(cfg.color,hOff):cfg.color;var cur=dc;ctx.strokeStyle=cur;ctx.beginPath();
    for(var i=0;i<particles.length;i++){
      var p=particles[i];if(p._dead||p.x<0||p.x>=cfg.canvas_width||p.y<0||p.y>=cfg.canvas_height)continue;
      var pc=p.color?(hOff&&cfg.hue_tgt_particles?shiftHexHue(p.color,hOff):p.color):dc;
      if(pc!==cur){ctx.stroke();ctx.beginPath();ctx.strokeStyle=pc;cur=pc;}
      var to=getLine(p);ctx.moveTo(p.x,p.y);ctx.lineTo(to[0],to[1]);p.px=p.x;p.py=p.y;
    }
    ctx.stroke();
  }
  function drawVelocity(hOff){
    var NB=64,buckets=new Array(NB);
    for(var i=0;i<particles.length;i++){
      var p=particles[i];if(p._dead||p.x<0||p.x>=cfg.canvas_width||p.y<0||p.y>=cfg.canvas_height)continue;
      var speed=Math.sqrt(p.xv*p.xv+p.yv*p.yv),bi=Math.min(NB-1,Math.floor(speed/cfg.vel_max*NB));
      if(!buckets[bi])buckets[bi]=[];buckets[bi].push(i);
    }
    for(var bi=0;bi<NB;bi++){
      if(!buckets[bi])continue;var t=bi/(NB-1);var lutC=rampLUT[Math.min(255,Math.round(t*255))];
      ctx.strokeStyle=(hOff&&cfg.hue_tgt_particles)?shiftHexHue(lutC,hOff):lutC;
      if(cfg.vel_opacity_scale)ctx.globalAlpha=cfg.opacity*(.05+.95*t);
      if(cfg.vel_width_scale)ctx.lineWidth=cfg.line_width*(.2+2.8*t);else ctx.lineWidth=cfg.line_width;
      ctx.beginPath();
      for(var pi=0;pi<buckets[bi].length;pi++){var p=particles[buckets[bi][pi]];var to=getLine(p);ctx.moveTo(p.x,p.y);ctx.lineTo(to[0],to[1]);p.px=p.x;p.py=p.y;}
      ctx.stroke();
    }
    if(cfg.vel_opacity_scale)ctx.globalAlpha=cfg.opacity;ctx.lineWidth=cfg.line_width;
  }
  function updatePressure(cd){
    var px=cd.up_left.xv*.5+cd.left.xv+cd.down_left.xv*.5-cd.up_right.xv*.5-cd.right.xv-cd.down_right.xv*.5;
    var py=cd.up_left.yv*.5+cd.up.yv+cd.up_right.yv*.5-cd.down_left.yv*.5-cd.down.yv-cd.down_right.yv*.5;
    cd.pressure=(px+py)*.25;
  }
  function updateVelocity(cd){
    cd.xv+=(cd.up_left.pressure*.5+cd.left.pressure+cd.down_left.pressure*.5-cd.up_right.pressure*.5-cd.right.pressure-cd.down_right.pressure*.5)*.25;
    cd.yv+=(cd.up_left.pressure*.5+cd.up.pressure+cd.up_right.pressure*.5-cd.down_left.pressure*.5-cd.down.pressure-cd.down_right.pressure*.5)*.25;
    cd.xv*=cfg.viscosity;cd.yv*=cfg.viscosity;
  }
  function Cell(x,y,res){this.x=x;this.y=y;this.r=res;this.col=0;this.row=0;this.xv=0;this.yv=0;this.pressure=0;}
  function Particle(x,y){this.x=this.px=x;this.y=this.py=y;this.xv=this.yv=0;this.color=null;this._dead=false;}
  function mouseDownH(e){e.preventDefault();mouse.down=true;}
  function mouseMoveH(e){e.preventDefault();mouse.px=mouse.x;mouse.py=mouse.y;mouse.x=e.offsetX||e.layerX;mouse.y=e.offsetY||e.layerY;}
  function touchStartH(e){e.preventDefault();var r=canvas.getBoundingClientRect();mouse.x=mouse.px=e.touches[0].pageX-r.left;mouse.y=mouse.py=e.touches[0].pageY-r.top;mouse.down=true;}
  function touchMoveH(e){e.preventDefault();mouse.px=mouse.x;mouse.py=mouse.y;var r=canvas.getBoundingClientRect();mouse.x=e.touches[0].pageX-r.left;mouse.y=e.touches[0].pageY-r.top;}

  w.FluidSim={
    initialize:init,init:init,cfg:cfg,resize:resize,setParticleCount:setParticleCount,
    resetColors:function(){for(var i=0;i<particles.length;i++)particles[i].color=null;},
    triggerAutoStroke:triggerAutoStroke,
    triggerPulseExt:function(str){var s=cfg.pulse_strength;cfg.pulse_strength=str!==undefined?str:s;triggerPulse();cfg.pulse_strength=s;},
    triggerPulse:triggerPulse,
    getWarp:function(){return warpAmount;},
    getVelocityAt:function(px,py){if(!vec_cells.length)return{x:0,y:0};var col=Math.max(0,Math.min(num_cols-1,Math.floor(px/cfg.resolution)));var row=Math.max(0,Math.min(num_rows-1,Math.floor(py/cfg.resolution)));return{x:vec_cells[col][row].xv,y:vec_cells[col][row].yv};},
    draw:draw,
    reset:resize,
    activate:function(){_active=true;},
    deactivate:function(){_active=false;}
  };
}(window));

