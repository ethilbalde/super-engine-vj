/* ═══════════════════════════════════════════
   REACT (GRAY-SCOTT) ENGINE
═══════════════════════════════════════════ */
var Engine_React=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var gl,progSim,progRender,texA,texB,fbA,fbB,quadBuf;
  var lastPulseTime=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    feed:0.055,kill:0.062,Du:0.2097,Dv:0.105,
    preset:'coral',color_mode:'v',color_low:'#000000',color_high:'#ff2266',
    opacity:1.0,
    pointer_mode:'deposit_v',pen_size:30,push_force:1.0,
    steps_per_frame:8,
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'deposit_ring',
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };
  var REACT_PRESETS={coral:{feed:0.0545,kill:0.062},maze:{feed:0.029,kill:0.057},spots:{feed:0.035,kill:0.065},stripes:{feed:0.026,kill:0.051},worms:{feed:0.058,kill:0.065},bubbles:{feed:0.012,kill:0.050},mitosis:{feed:0.028,kill:0.062}};
  var VERT_SRC='attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=(a_pos+1.0)*0.5;gl_Position=vec4(a_pos,0,1);}';
  var FRAG_SIM='precision highp float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_feed,u_kill,u_Du,u_Dv;varying vec2 v_uv;void main(){vec2 px=1.0/u_res;vec4 c=texture2D(u_tex,v_uv);float u=c.r,v=c.g;vec4 lap=texture2D(u_tex,v_uv+vec2(px.x,0.0))+texture2D(u_tex,v_uv+vec2(-px.x,0.0))+texture2D(u_tex,v_uv+vec2(0.0,px.y))+texture2D(u_tex,v_uv+vec2(0.0,-px.y))-4.0*c;float uvv=u*v*v;float du=u_Du*lap.r-uvv+u_feed*(1.0-u);float dv=u_Dv*lap.g+uvv-(u_feed+u_kill)*v;gl_FragColor=vec4(clamp(u+du,0.0,1.0),clamp(v+dv,0.0,1.0),0.0,1.0);}';
  var FRAG_RENDER='precision mediump float;uniform sampler2D u_tex;uniform vec3 u_clow,u_chigh;varying vec2 v_uv;void main(){float v=texture2D(u_tex,v_uv).g;gl_FragColor=vec4(mix(u_clow,u_chigh,v),1.0);}';
  function mkShader(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  function mkProg(vs,fs){var p=gl.createProgram();gl.attachShader(p,mkShader(gl.VERTEX_SHADER,vs));gl.attachShader(p,mkShader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);return p;}
  function mkTex(W,H,data){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  function mkFB(tex){var fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);return fb;}
  var reactCanvas=null,RW,RH;
  function initGL(){
    reactCanvas=document.getElementById('react-gl-canvas');
    if(!reactCanvas)return false;
    RW=Math.min(512,Math.floor(cfg.canvas_width/2));RH=Math.min(512,Math.floor(cfg.canvas_height/2));
    reactCanvas.width=RW;reactCanvas.height=RH;
    gl=reactCanvas.getContext('webgl',{preserveDrawingBuffer:true});
    if(!gl)return false;
    progSim=mkProg(VERT_SRC,FRAG_SIM);progRender=mkProg(VERT_SRC,FRAG_RENDER);
    quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    var initData=new Uint8Array(RW*RH*4);for(var i=0;i<RW*RH;i++){initData[i*4]=255;initData[i*4+3]=255;}
    /* Seed center */
    var cx=Math.floor(RW/2),cy=Math.floor(RH/2),sr=10;for(var dy2=-sr;dy2<=sr;dy2++)for(var dx2=-sr;dx2<=sr;dx2++){var idx=((cy+dy2)*RW+(cx+dx2))*4;if(idx>=0&&idx<initData.length){initData[idx+1]=200;}}
    texA=mkTex(RW,RH,initData);texB=mkTex(RW,RH,null);
    fbA=mkFB(texA);fbB=mkFB(texB);
    return true;
  }
  function bindQuad(prog){gl.useProgram(prog);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);var loc=gl.getAttribLocation(prog,'a_pos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);}
  function stepSim(){
    if(!gl)return;
    bindQuad(progSim);
    gl.uniform2f(gl.getUniformLocation(progSim,'u_res'),RW,RH);
    gl.uniform1f(gl.getUniformLocation(progSim,'u_feed'),cfg.feed);
    gl.uniform1f(gl.getUniformLocation(progSim,'u_kill'),cfg.kill);
    gl.uniform1f(gl.getUniformLocation(progSim,'u_Du'),cfg.Du);
    gl.uniform1f(gl.getUniformLocation(progSim,'u_Dv'),cfg.Dv);
    for(var i=0;i<cfg.steps_per_frame;i++){
      gl.bindFramebuffer(gl.FRAMEBUFFER,fbB);gl.viewport(0,0,RW,RH);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texA);
      gl.uniform1i(gl.getUniformLocation(progSim,'u_tex'),0);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      var tmp=texA;texA=texB;texB=tmp;tmp=fbA;fbA=fbB;fbB=tmp;
    }
  }
  function renderToCanvas2D(){
    if(!gl)return;
    bindQuad(progRender);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,RW,RH);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texA);
    gl.uniform1i(gl.getUniformLocation(progRender,'u_tex'),0);
    var cl=hexToRgb(cfg.color_low),ch=hexToRgb(cfg.color_high);
    gl.uniform3f(gl.getUniformLocation(progRender,'u_clow'),cl.r/255,cl.g/255,cl.b/255);
    gl.uniform3f(gl.getUniformLocation(progRender,'u_chigh'),ch.r/255,ch.g/255,ch.b/255);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    ctx.drawImage(reactCanvas,0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function triggerPulse(){if(!gl)return;/* deposit V ring */var cx=Math.floor(RW/2),cy=Math.floor(RH/2),r=Math.min(RW,RH)*0.3;var patch=new Uint8Array(4);for(var a=0;a<Math.PI*2;a+=0.05){var x=Math.round(cx+Math.cos(a)*r)|0,y=Math.round(cy+Math.sin(a)*r)|0;if(x>=0&&x<RW&&y>=0&&y<RH){patch[0]=255;patch[1]=200;patch[2]=0;patch[3]=255;gl.bindTexture(gl.TEXTURE_2D,texA);gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,patch);}}}
  function applyPreset(name){var p=REACT_PRESETS[name];if(p){cfg.feed=p.feed;cfg.kill=p.kill;cfg.preset=name;}}
  function draw(){
    if(!_active)return;
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    if(mouse.down&&gl){var mx=Math.round(mouse.x/cfg.canvas_width*RW)|0,my=(RH-1-Math.round(mouse.y/cfg.canvas_height*RH))|0,pr=Math.round(cfg.pen_size/cfg.canvas_width*RW)|0||2;var patch=new Uint8Array(1*1*4);patch[0]=255;patch[1]=mouse.down&&cfg.pointer_mode==='deposit_v'?200:0;patch[2]=0;patch[3]=255;for(var dy2=-pr;dy2<=pr;dy2+=2)for(var dx2=-pr;dx2<=pr;dx2+=2){var x=mx+dx2,y=my+dy2;if(x>=0&&x<RW&&y>=0&&y<RH){gl.bindTexture(gl.TEXTURE_2D,texA);gl.texSubImage2D(gl.TEXTURE_2D,0,x,y,1,1,gl.RGBA,gl.UNSIGNED_BYTE,patch);}}}
    stepSim();renderToCanvas2D();
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;initGL();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(!gl||_needsReset){_needsReset=false;initGL();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:initGL,triggerPulse:triggerPulse,applyPreset:applyPreset,PRESETS:REACT_PRESETS,markReset:function(){_needsReset=true;}};
})();

