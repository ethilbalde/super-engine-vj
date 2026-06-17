/* ═══════════════════════════════════════════
   ENGINE: REACTION-DIFFUSION (Gray-Scott)
═══════════════════════════════════════════ */
window.Engine_RDiff=(function(){
  var C,ctx,W,H,glc,gl,cur=0,SIM=512;
  var tex=[null,null],fb=[null,null],qbuf,pSim,pRend;
  var _active=false,_pulseT=0,_autoT=0,_md=false,_mx=0,_my=0,_mh=null;
  var VS='attribute vec2 a;varying vec2 v;void main(){v=a*.5+.5;gl_Position=vec4(a,0,1);}';
  var FS_S='precision highp float;uniform sampler2D u_s;uniform vec2 u_px;uniform float u_f,u_k,u_du,u_dv,u_dt;varying vec2 v;void main(){vec2 s=texture2D(u_s,v).rg;float A=s.r,B=s.g;vec2 L=texture2D(u_s,v+vec2(u_px.x,0.)).rg+texture2D(u_s,v-vec2(u_px.x,0.)).rg+texture2D(u_s,v+vec2(0.,u_px.y)).rg+texture2D(u_s,v-vec2(0.,u_px.y)).rg-4.*s;float q=A*B*B;gl_FragColor=vec4(clamp(A+u_dt*(u_du*L.r-q+u_f*(1.-A)),0.,1.),clamp(B+u_dt*(u_dv*L.g+q-(u_f+u_k)*B),0.,1.),0.,1.);}';
  var FS_R='precision mediump float;uniform sampler2D u_s;uniform vec3 u_ca,u_cm,u_cb;uniform float u_con;varying vec2 v;void main(){float b=clamp(texture2D(u_s,v).g*u_con,0.,1.);vec3 c=b<.5?mix(u_ca,u_cm,b*2.):mix(u_cm,u_cb,(b-.5)*2.);gl_FragColor=vec4(c,1.);}';
  var PRESETS={coral:{f:.055,k:.062,du:.4,dv:.13,dt:.5,steps:8},zebre:{f:.026,k:.051,du:.16,dv:.08,dt:1.,steps:4},labyrinth:{f:.039,k:.058,du:.16,dv:.08,dt:1.,steps:4},spots:{f:.035,k:.065,du:.16,dv:.08,dt:1.,steps:4},worms:{f:.078,k:.061,du:.45,dv:.075,dt:.4,steps:4},mitosis:{f:.028,k:.053,du:.16,dv:.08,dt:1.,steps:4}};
  var cfg={f:.055,k:.062,du:.4,dv:.13,dt:.5,steps:8,brush:20,push_force:1.,brush_mode:'inject',contrast:2.,pulse_enabled:false,auto_enabled:false,pulse_int:2.,auto_int:8.};
  function h3(h){return[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];}
  function sh(t,s){var x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);return x;}
  function mkP(v,f){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);return p;}
  function mkT(d){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SIM,SIM,0,gl.RGBA,gl.UNSIGNED_BYTE,d);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);return t;}
  function mkF(t){var f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return f;}
  function quad(p){var a=gl.getAttribLocation(p,'a');gl.bindBuffer(gl.ARRAY_BUFFER,qbuf);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}
  function ul(p,n){return gl.getUniformLocation(p,n);}
  function initGL(){
    glc=document.createElement('canvas');glc.width=SIM;glc.height=SIM;
    gl=glc.getContext('webgl',{preserveDrawingBuffer:true})||glc.getContext('experimental-webgl',{preserveDrawingBuffer:true});
    if(!gl)return false;
    pSim=mkP(VS,FS_S);pRend=mkP(VS,FS_R);
    qbuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qbuf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    resetSim(false);return true;
  }
  function resetSim(seedOnly){
    var d=new Uint8Array(SIM*SIM*4);
    for(var i=0;i<SIM*SIM;i++){d[i*4]=255;d[i*4+3]=255;} // A=1, B=0
    var cnt=seedOnly?12:120,r=seedOnly?25:4;
    for(var s=0;s<cnt;s++){var sx=r+Math.floor(Math.random()*(SIM-2*r)),sy=r+Math.floor(Math.random()*(SIM-2*r));for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;var idx=((sy+dy)*SIM+(sx+dx))*4;d[idx]=128;d[idx+1]=64;d[idx+3]=255;}} // A=0.5,B=0.25
    if(tex[0]){gl.deleteTexture(tex[0]);gl.deleteFramebuffer(fb[0]);gl.deleteTexture(tex[1]);gl.deleteFramebuffer(fb[1]);}
    tex[0]=mkT(d);tex[1]=mkT(d);fb[0]=mkF(tex[0]);fb[1]=mkF(tex[1]);cur=0;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  function step(){
    var p=pSim;gl.useProgram(p);
    gl.uniform2f(ul(p,'u_px'),1/SIM,1/SIM);gl.uniform1f(ul(p,'u_f'),cfg.f);gl.uniform1f(ul(p,'u_k'),cfg.k);
    gl.uniform1f(ul(p,'u_du'),cfg.du);gl.uniform1f(ul(p,'u_dv'),cfg.dv);gl.uniform1f(ul(p,'u_dt'),cfg.dt);
    var n=1-cur;gl.bindFramebuffer(gl.FRAMEBUFFER,fb[n]);gl.viewport(0,0,SIM,SIM);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[cur]);gl.uniform1i(ul(p,'u_s'),0);quad(p);cur=n;
  }
  function renderGL(){
    var p=pRend;gl.useProgram(p);
    var ea=document.getElementById('rdcol-a'),em=document.getElementById('rdcol-m'),eb=document.getElementById('rdcol-b');
    gl.uniform3fv(ul(p,'u_ca'),ea?h3(ea.value):[0,0,.2]);
    gl.uniform3fv(ul(p,'u_cm'),em?h3(em.value):[.27,0,.33]);
    gl.uniform3fv(ul(p,'u_cb'),eb?h3(eb.value):[1,.4,0]);
    gl.uniform1f(ul(p,'u_con'),cfg.contrast);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,SIM,SIM);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex[cur]);gl.uniform1i(ul(p,'u_s'),0);quad(p);
    ctx.drawImage(glc,0,0,SIM,SIM,0,0,W,H);
  }
  function doBrush(){
    if(!_md)return;
    var sx=Math.round(_mx/W*SIM),sy=SIM-1-Math.round(_my/H*SIM);
    var r=Math.max(3,Math.round(cfg.brush*SIM/W)),d2=r*2+1;
    sx=Math.max(r,Math.min(SIM-1-r,sx));sy=Math.max(r,Math.min(SIM-1-r,sy));
    var px=new Uint8Array(d2*d2*4);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb[cur]);gl.readPixels(sx-r,sy-r,d2,d2,gl.RGBA,gl.UNSIGNED_BYTE,px);
    for(var dy=0;dy<d2;dy++)for(var dx=0;dx<d2;dx++){var cx=dx-r,cy=dy-r;if(cx*cx+cy*cy>r*r)continue;var i=(dy*d2+dx)*4;if(cfg.brush_mode==='inject'){px[i]=128;px[i+1]=64;}else{px[i]=255;px[i+1]=0;}px[i+2]=0;px[i+3]=255;}
    gl.bindTexture(gl.TEXTURE_2D,tex[cur]);gl.texSubImage2D(gl.TEXTURE_2D,0,sx-r,sy-r,d2,d2,gl.RGBA,gl.UNSIGNED_BYTE,px);
  }
  function pulse(){
    for(var s=0;s<5;s++){var r=15,d2=r*2+1,sx=r+Math.floor(Math.random()*(SIM-2*r)),sy=r+Math.floor(Math.random()*(SIM-2*r));var d=new Uint8Array(d2*d2*4);for(var i=0;i<d2*d2;i++){var dx=i%d2-r,dy=Math.floor(i/d2)-r;if(dx*dx+dy*dy<=r*r){d[i*4]=128;d[i*4+1]=64;d[i*4+3]=255;}else{d[i*4]=255;d[i*4+3]=255;}}gl.bindTexture(gl.TEXTURE_2D,tex[cur]);gl.texSubImage2D(gl.TEXTURE_2D,0,sx-r,sy-r,d2,d2,gl.RGBA,gl.UNSIGNED_BYTE,d);}
  }
  // UI wiring
  function wireRD(){
    function slw(id,key,sp,dec){var el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){cfg[key]=parseFloat(this.value);var s=document.getElementById(sp);if(s)s.textContent=parseFloat(this.value).toFixed(dec);});}
    slw('rdf','f','rdval-f',3);slw('rdk','k','rdval-k',3);slw('rddu','du','rdval-du',2);slw('rddv','dv','rdval-dv',2);slw('rddt','dt','rdval-dt',1);
    slw('rdtpulse-int','pulse_int','rdval-pulse-int',1);slw('rdtauto-int','auto_int','rdval-auto-int',1);
    slw('rdcontrast','contrast','rdval-contrast',1);slw('rdpush-force','push_force','rdval-force',1);
    var brs=document.getElementById('rdbr-size');if(brs)brs.addEventListener('input',function(){cfg.brush=parseInt(this.value);var s=document.getElementById('rdval-brush');if(s)s.textContent=this.value;});
    var stps=document.getElementById('rdsteps');if(stps)stps.addEventListener('input',function(){cfg.steps=parseInt(this.value);var s=document.getElementById('rdval-steps');if(s)s.textContent=this.value;});
    document.querySelectorAll('[data-rdp]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-rdp]').forEach(function(x){x.classList.remove('active');});b.classList.add('active');var p=PRESETS[b.dataset.rdp];Object.assign(cfg,p);['rdf','rdk','rddu','rddv'].forEach(function(id){var el=document.getElementById(id);if(el){el.value=cfg[{rdf:'f',rdk:'k',rddu:'du',rddv:'dv'}[id]];var sp=document.getElementById('rdval-'+id.slice(2));if(sp)sp.textContent=el.value;}});var dtEl=document.getElementById('rddt');if(dtEl){dtEl.value=cfg.dt;var dtSp=document.getElementById('rdval-dt');if(dtSp)dtSp.textContent=cfg.dt.toFixed(1);}var stEl=document.getElementById('rdsteps');if(stEl){stEl.value=cfg.steps;var stSp=document.getElementById('rdval-steps');if(stSp)stSp.textContent=cfg.steps;}resetSim(false);});});
    document.querySelectorAll('[data-rdbrush]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-rdbrush]').forEach(function(x){x.classList.remove('active');});b.classList.add('active');cfg.brush_mode=b.dataset.rdbrush;});});
    var btn=document.getElementById('rdbtn-reset');if(btn)btn.addEventListener('click',function(){resetSim(false);});
    var btn2=document.getElementById('rdbtn-seed');if(btn2)btn2.addEventListener('click',function(){resetSim(true);});
    function setupBT(btnId,fireId,key,pulseFn){var bt=document.getElementById(btnId);if(bt){bt.addEventListener('click',function(){cfg[key]=!cfg[key];bt.classList.toggle('on',cfg[key]);bt.querySelector('.dot').style.background=cfg[key]?'#ff5500':'#444';});bt._update=function(){bt.classList.toggle('on',cfg[key]);bt.querySelector('.dot').style.background=cfg[key]?'#ff5500':'#444';};bt._update();}var bf=document.getElementById(fireId);if(bf)bf.addEventListener('click',pulseFn);}
    setupBT('rdbtn-pulse','rdbtn-pulse-fire','pulse_enabled',pulse);
    setupBT('rdbtn-auto','rdbtn-auto-fire','auto_enabled',function(){resetSim(true);});
  }
  return{cfg:cfg,
    activate:function(){
      C=document.getElementById('c');if(!C)return;ctx=C.getContext('2d');W=C.width;H=C.height;
      if(!gl&&!initGL())return;
      _active=true;
      if(!_mh){_mh=true;C.addEventListener('mousemove',function(e){var r=C.getBoundingClientRect();_mx=e.clientX-r.left;_my=e.clientY-r.top;});C.addEventListener('mousedown',function(){_md=true;});document.addEventListener('mouseup',function(){_md=false;});}
      wireRD();
    },
    deactivate:function(){_active=false;_md=false;},
    draw:function(){
      if(!gl||!_active)return;W=C.width;H=C.height;doBrush();
      for(var i=0;i<cfg.steps;i++)step();renderGL();
      _pulseT+=1/60;_autoT+=1/60;
      if(cfg.pulse_enabled&&_pulseT>=cfg.pulse_int){_pulseT=0;pulse();}
      if(cfg.auto_enabled&&_autoT>=cfg.auto_int){_autoT=0;resetSim(true);}
      var pb=document.getElementById('rdpulse-bar');if(pb)pb.style.width=Math.min(100,_pulseT/cfg.pulse_int*100)+'%';
      var ab=document.getElementById('rdauto-bar');if(ab)ab.style.width=Math.min(100,_autoT/cfg.auto_int*100)+'%';
    }
  };
})();

