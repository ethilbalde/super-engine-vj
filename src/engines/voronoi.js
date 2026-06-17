/* ═══════════════════════════════════════════
   ENGINE: VORONOI VIVANT (WebGL)
═══════════════════════════════════════════ */
window.Engine_Voronoi=(function(){
  var C,ctx,W,H,glc,gl,_active=false,_pulseT=0,_autoT=0;
  var qbuf,prog,_N=40;
  var _seeds=[],_mh=null;
  var VS='attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0,1);}';
  var FS='precision mediump float;varying vec2 v;uniform int u_n;uniform vec2 u_seeds[120];uniform float u_bw,u_sat,u_bright,u_warp,u_warpFreq,u_time,u_metric;\
float distM(vec2 d){\
  if(u_metric>1.5){return abs(d.x)+abs(d.y);}\
  if(u_metric>0.5){vec2 ad=abs(d);return pow(pow(ad.x,3.)+pow(ad.y,3.),1./3.);}\
  return length(d);\
}\
void main(){\
  vec2 p=v;\
  p.x+=sin(p.y*u_warpFreq*6.2831+u_time)*u_warp*.06+sin(p.y*u_warpFreq*2.1+u_time*1.7)*u_warp*.03;\
  p.y+=cos(p.x*u_warpFreq*6.2831+u_time*.8)*u_warp*.06+cos(p.x*u_warpFreq*1.7+u_time*1.3)*u_warp*.03;\
  float md=1e9,sd=1e9,near=0.;\
  for(int i=0;i<120;i++){\
    if(i<u_n){\
      vec2 d=p-u_seeds[i];float dd=distM(d);\
      if(dd<md){sd=md;md=dd;near=float(i);}else if(dd<sd)sd=dd;\
    }\
  }\
  float h=near/float(u_n);\
  vec3 col=clamp(abs(fract(h+vec3(0.,.667,.333))*6.-3.)-1.,0.,1.)*u_sat+u_bright;\
  float b=u_bw>0.?smoothstep(0.,u_bw*.005,sd-md):1.;\
  gl_FragColor=vec4(col*b,1.);\
}';
  var cfg={seeds:40,speed:.5,border_rep:60,repulse:40,color_mode:'hue',bw:1.5,pen_size:80,push_force:1.,
    warp:0,warp_freq:2.5,warp_speed:0.3,metric:0,
    pulse_enabled:false,auto_enabled:false,pulse_int:3.,auto_int:8.};
  var _warpT=0;
  function hsl(h,s,l){s/=100;l/=100;var a=s*Math.min(l,1-l),f=function(n){var k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return c;};return[f(0),f(8),f(4)];}
  function seedCol(i,spd){var cm=cfg.color_mode;if(cm==='hue')return hsl(i*360/_N,65,50);if(cm==='velocity')return hsl(180+Math.min(spd*60,160),80,50);if(cm==='dark')return hsl(i*360/_N,35,18);return[.5,.5,.5];}
  function initSeeds(){
    var vw=glc.width,vh=glc.height;_N=cfg.seeds;_seeds=[];
    for(var i=0;i<_N;i++){var vx=(Math.random()-.5)*cfg.speed,vy=(Math.random()-.5)*cfg.speed;_seeds.push({x:Math.random()*vw,y:Math.random()*vh,vx:vx,vy:vy});}
  }
  function updateSeeds(){
    var vw=glc.width,vh=glc.height,br=cfg.border_rep,rp=cfg.repulse;
    var mDown=window._mouse.down,mx2=window._mouse.x,my2=window._mouse.y,pen=cfg.pen_size,pf=cfg.push_force;
    for(var i=0;i<_seeds.length;i++){
      var s=_seeds[i];
      if(s.x<br)s.vx+=.3*(br-s.x)/Math.max(1,br);if(s.x>vw-br)s.vx-=.3*(s.x-(vw-br))/Math.max(1,br);
      if(s.y<br)s.vy+=.3*(br-s.y)/Math.max(1,br);if(s.y>vh-br)s.vy-=.3*(s.y-(vh-br))/Math.max(1,br);
      if(rp>0){for(var j=i+1;j<_seeds.length;j++){var dx=s.x-_seeds[j].x,dy=s.y-_seeds[j].y,d2=dx*dx+dy*dy;if(d2<rp*rp&&d2>.01){var d=Math.sqrt(d2),f=.15*(rp-d)/rp;s.vx+=dx/d*f;s.vy+=dy/d*f;_seeds[j].vx-=dx/d*f;_seeds[j].vy-=dy/d*f;}}}
      /* curseur — repousse les graines proches au clic, attire en survol */
      var dxm=s.x-mx2,dym=s.y-my2,dm=Math.sqrt(dxm*dxm+dym*dym);
      if(dm<pen&&dm>0.01){
        var fm=(pen-dm)/pen*pf*(mDown?0.55:-0.12);
        s.vx+=dxm/dm*fm;s.vy+=dym/dm*fm;
      }
      s.vx*=.96;s.vy*=.96;var sp=Math.sqrt(s.vx*s.vx+s.vy*s.vy),mx=cfg.speed*2;if(sp>mx){s.vx=s.vx/sp*mx;s.vy=s.vy/sp*mx;}
      s.x+=s.vx;s.y+=s.vy;
    }
  }
  function vsh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS)){console.error('VOR shader:',gl.getShaderInfoLog(x));}return x;}
  function initGL(){
    glc=document.createElement('canvas');glc.width=W;glc.height=H;
    gl=glc.getContext('webgl')||glc.getContext('experimental-webgl');
    if(!gl)return false;
    var vs=vsh(gl.VERTEX_SHADER,VS),fs=vsh(gl.FRAGMENT_SHADER,FS);
    prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){console.error('VOR link:',gl.getProgramInfoLog(prog));return false;}
    qbuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qbuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    return true;
  }
  function renderV(){
    var gw=glc.width,gh=glc.height;
    gl.viewport(0,0,gw,gh);gl.useProgram(prog);
    var a=gl.getAttribLocation(prog,'a');gl.bindBuffer(gl.ARRAY_BUFFER,qbuf);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    var n=Math.min(_seeds.length,120);
    gl.uniform1i(gl.getUniformLocation(prog,'u_n'),n);
    gl.uniform1f(gl.getUniformLocation(prog,'u_bw'),cfg.bw);
    var cm=cfg.color_mode,sat=cm==='dark'?.35:cm==='mono'?0.:.7,br=cm==='dark'?.05:cm==='mono'?.3:.15;
    gl.uniform1f(gl.getUniformLocation(prog,'u_sat'),sat);
    gl.uniform1f(gl.getUniformLocation(prog,'u_bright'),br);
    gl.uniform1f(gl.getUniformLocation(prog,'u_warp'),cfg.warp);
    gl.uniform1f(gl.getUniformLocation(prog,'u_warpFreq'),cfg.warp_freq);
    gl.uniform1f(gl.getUniformLocation(prog,'u_time'),_warpT);
    gl.uniform1f(gl.getUniformLocation(prog,'u_metric'),cfg.metric);
    _warpT+=cfg.warp_speed*0.016;
    var sp=new Float32Array(n*2);
    for(var i=0;i<n;i++){sp[i*2]=_seeds[i].x/gw;sp[i*2+1]=_seeds[i].y/gh;}
    gl.uniform2fv(gl.getUniformLocation(prog,'u_seeds'),sp);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    ctx.drawImage(glc,0,0,gw,gh,0,0,W,H);
  }
  function divide(){for(var i=0;i<3&&_seeds.length<120;i++){var p=_seeds[Math.floor(Math.random()*_seeds.length)];_seeds.push({x:p.x+(Math.random()-.5)*20,y:p.y+(Math.random()-.5)*20,vx:(Math.random()-.5),vy:(Math.random()-.5)});}_N=_seeds.length;}
  var VO_PRESETS={
    classic:{warp:0,warp_freq:2.5,warp_speed:0.3,metric:0,bw:1.5,speed:0.5,repulse:40,border_rep:60},
    organic:{warp:1.2,warp_freq:1.5,warp_speed:0.25,metric:0,bw:2.5,speed:0.4,repulse:50,border_rep:60},
    waves:{warp:2.2,warp_freq:4,warp_speed:0.6,metric:0,bw:1.0,speed:0.6,repulse:30,border_rep:50},
    marble:{warp:0.9,warp_freq:1.0,warp_speed:0.1,metric:0,bw:4,speed:0.1,repulse:20,border_rep:40},
    crystal:{warp:0.3,warp_freq:3,warp_speed:0.2,metric:1,bw:2,speed:0.3,repulse:60,border_rep:60},
    cells:{warp:1.5,warp_freq:2,warp_speed:0.4,metric:2,bw:3,speed:1.2,repulse:80,border_rep:50}
  };
  function applyPreset(name){
    var p=VO_PRESETS[name];if(!p)return;
    Object.keys(p).forEach(function(k){cfg[k]=p[k];});
    var map={warp:['vowarp','voval-warp',2],warp_freq:['vowarp-freq','voval-warpfreq',1],warp_speed:['vowarp-speed','voval-warpspeed',2],bw:['vobw','voval-bw',1],speed:['vospeed','voval-speed',2],repulse:['vorepulse','voval-repulse',0],border_rep:['voborder-rep','voval-border',0]};
    Object.keys(map).forEach(function(k){
      var sl=document.getElementById(map[k][0]),sp=document.getElementById(map[k][1]);
      if(sl)sl.value=cfg[k];if(sp)sp.textContent=cfg[k].toFixed(map[k][2]);
    });
    document.querySelectorAll('[data-vometric]').forEach(function(b){b.classList.toggle('active',parseInt(b.dataset.vometric)===cfg.metric);});
    document.querySelectorAll('[data-vopreset]').forEach(function(b){b.classList.toggle('active',b.dataset.vopreset===name);});
  }
  function wireV(){
    function slw(id,key,sp,dec){var el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){cfg[key]=parseFloat(this.value);var s=document.getElementById(sp);if(s)s.textContent=parseFloat(this.value).toFixed(dec);});}
    slw('voseeds','seeds','voval-seeds',0);slw('vospeed','speed','voval-speed',2);slw('voborder-rep','border_rep','voval-border',0);slw('vorepulse','repulse','voval-repulse',0);slw('vobw','bw','voval-bw',1);slw('votpulse-int','pulse_int','voval-pulse-int',1);slw('votauto-int','auto_int','voval-auto-int',1);slw('vopen-size','pen_size','voval-pen',0);slw('vopush-force','push_force','voval-force',1);
    slw('vowarp','warp','voval-warp',2);slw('vowarp-freq','warp_freq','voval-warpfreq',1);slw('vowarp-speed','warp_speed','voval-warpspeed',2);
    document.querySelectorAll('[data-voc]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-voc]').forEach(function(x){x.classList.remove('active');});b.classList.add('active');cfg.color_mode=b.dataset.voc;});});
    document.querySelectorAll('[data-vometric]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vometric]').forEach(function(x){x.classList.remove('active');});b.classList.add('active');cfg.metric=parseInt(b.dataset.vometric);});});
    document.querySelectorAll('[data-vopreset]').forEach(function(b){b.addEventListener('click',function(){applyPreset(b.dataset.vopreset);});});
    function setupBT(btnId,fireId,key,fn){var bt=document.getElementById(btnId);if(bt){bt.addEventListener('click',function(){cfg[key]=!cfg[key];bt.classList.toggle('on',cfg[key]);bt.querySelector('.dot').style.background=cfg[key]?'#ffcc00':'#444';});bt._update=function(){bt.classList.toggle('on',cfg[key]);bt.querySelector('.dot').style.background=cfg[key]?'#ffcc00':'#444';};}var bf=document.getElementById(fireId);if(bf)bf.addEventListener('click',fn);}
    setupBT('vobtn-pulse','vobtn-pulse-fire','pulse_enabled',divide);
    setupBT('vobtn-auto','vobtn-auto-fire','auto_enabled',function(){initSeeds();});
    var br=document.getElementById('vobtn-reset');if(br)br.addEventListener('click',function(){initSeeds();});
  }
  return{cfg:cfg,
    activate:function(){
      C=document.getElementById('c');if(!C)return;ctx=C.getContext('2d');W=C.width;H=C.height;
      gl=null;if(!initGL())return;
      initSeeds();
      _active=true;wireV();
    },
    deactivate:function(){_active=false;},
    draw:function(){
      if(!gl||!_active)return;W=C.width;H=C.height;
      updateSeeds();renderV();
      _pulseT+=1/60;_autoT+=1/60;
      if(cfg.pulse_enabled&&_pulseT>=cfg.pulse_int){_pulseT=0;divide();}
      if(cfg.auto_enabled&&_autoT>=cfg.auto_int){_autoT=0;initSeeds();}
      var pb=document.getElementById('vopulse-bar');if(pb)pb.style.width=Math.min(100,_pulseT/cfg.pulse_int*100)+'%';
      var ab=document.getElementById('voauto-bar');if(ab)ab.style.width=Math.min(100,_autoT/cfg.auto_int*100)+'%';
    }
  };
})();

