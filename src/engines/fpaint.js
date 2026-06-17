/* ═══════════════════════════════════════════
   FLUID PAINTING ENGINE — Peinture fluide GPU
   Domain-warping noise multi-couches via WebGL2,
   composité sur le canvas 2D principal.
   Shader original : Matthias Hurrle (@atzedent)
═══════════════════════════════════════════ */
var Engine_FPaint=(function(){
  var canvas,ctx,glCanvas,gl,prog;
  var uLocs={};
  var mouse=window._mouse;
  var _active=false,_t=0,_paused=false,_timeBase=0;
  var frameCount=0,lastPulseTime=0,_needsReset=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    speed:1.0,
    rot_speed:0.05,
    zoom:2.0,
    grain:1.0,
    brightness:1.25,
    vignette:0.125,
    boost_r:1.0,boost_g:1.0,boost_b:1.0,
    pen_size:0.25,push_force:1.0,
    pointer_mode:'attract',
    pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1,
    time_mode:'bpm',bpm:120
  };

  /* ── Vertex shader — quad plein écran en clip space ── */
  var VERT=[
    '#version 300 es',
    'in vec2 aPos;',
    'void main(){gl_Position=vec4(aPos,0.,1.);}'
  ].join('\n');

  /* ── Fragment shader — domain-warping noise coloré ── */
  var FRAG=[
    '#version 300 es',
    'precision highp float;',
    'out vec4 O;',
    'uniform float time;',
    'uniform vec2  resolution;',
    'uniform float uSpeed;',
    'uniform float uRotSpeed;',
    'uniform float uZoom;',
    'uniform float uGrain;',
    'uniform float uBrightness;',
    'uniform float uVignette;',
    'uniform float uBoostR,uBoostG,uBoostB;',
    'uniform vec2  uMouse;',
    'uniform float uMouseActive;',
    'uniform float uPenSize;',
    'uniform float uPushForce;',
    'uniform float uPointerMode;',
    '#define FC gl_FragCoord.xy',
    '#define R  resolution',
    '#define T  (time*uSpeed)',
    '#define S  smoothstep',
    '#define MN min(R.x,R.y)',
    '#define rot(a) mat2(cos((a)-vec4(0,11,33,0)))',
    /* bruit blanc */
    'float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}',
    /* bruit de valeur */
    'float noise(vec2 p){vec2 i=floor(p),u=S(i,i+1.,p),k=vec2(1,0);float a=rnd(i),b=rnd(i+k),c=rnd(i+k.yx),d=rnd(i+k.xx);return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);}',
    /* animation de l'espace UV */
    'void anim(inout vec2 uv){',
    '  float t=T*uRotSpeed;',
    '  uv*=1.+S(.0,1.,clamp(1.2*dot(uv,uv),.0,1.));',
    '  uv*=rot(t);',
    '  uv.x-=12.*cos(t);',
    '  uv.y+=10.*sin(t);',
    '  uv*=uZoom;',
    '}',
    /* 4 couches de domain warping → couleurs */
    'vec3 pattern(vec2 uv){',
    '  const float k=4.;',
    '  float grain=mix(0.,noise(uv*100.),min(T*.3,1.)*uGrain);',
    '  vec3 col=vec3(0);',
    '  vec2',
    '    a=vec2(noise(uv-T+noise(uv*2.+grain)),noise(T*.1-uv+vec2(3,5))),',
    '    b=vec2(noise(T+uv+vec2(7,3)+a*k),noise(T*.3-uv+a*k)),',
    '    c=vec2(noise(T*.2-uv+vec2(1,4)+b*k),noise(T*.5-uv-vec2(4,1)+b*k)),',
    '    d=vec2(noise(T*.4-uv+vec2(2,3)+c*k),noise(T*.2-uv-vec2(7,2)+c*k));',
    '  col+=max(.3,noise(uv-d));',
    '  col=clamp(col,0.,.35);',
    '  float f=clamp(dot(a,b),-1.,1.);',
    '  col+=vec3(a.x/3.+a.y/2.+f*1.4,a.x+a.x/(2.4+f*f),b.x*b.y/1.5+f*.6+d.y*.4)/3.;',
    '  col+=pow(d.x*d.y,4.)*vec3(.2,.8,1.);',
    '  col+=.4*pow(a.x,5.);',
    '  return col;',
    '}',
    /* assemblage + color grading */
    'vec3 render(vec2 uv){',
    /* influence souris AVANT anim — espace UV initial */
    '  if(uMouseActive>.5){',
    '    vec2 diff=uMouse-uv;',
    '    float dist=length(diff)+.001;',
    '    float inf=uPushForce*exp(-dist/uPenSize);',
    '    uv+=diff*inf*uPointerMode;',
    '  }',
    '  anim(uv);',
    '  vec3 col=pattern(uv);',
    '  col=S(.1,1.,col);',
    '  col+=abs(col)*.25;',
    '  col=tanh(col*col*col);',
    '  col*=uBrightness*vec3(uBoostR,uBoostG,uBoostB);',
    '  return col;',
    '}',
    'void main(){',
    '  vec3 col=render((FC-.5*R)/MN);',
    '  vec2 c=FC/R;c*=1.-c.yx;',
    '  float v=c.x*c.y*25.;',
    '  col*=pow(v,uVignette);',
    '  O=vec4(col,1.);',
    '}'
  ].join('\n');

  /* ── WebGL helpers ── */
  function compileShader(type,src){
    var sh=gl.createShader(type);
    gl.shaderSource(sh,src);gl.compileShader(sh);
    if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
      console.error('[FPaint shader]',gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);return null;
    }
    return sh;
  }

  function initGL(){
    if(gl)return true;
    glCanvas=document.createElement('canvas');
    glCanvas.width=cfg.canvas_width;glCanvas.height=cfg.canvas_height;
    gl=glCanvas.getContext('webgl2');
    if(!gl){console.error('[FPaint] WebGL2 non disponible');return false;}
    var vs=compileShader(gl.VERTEX_SHADER,VERT);
    var fs=compileShader(gl.FRAGMENT_SHADER,FRAG);
    if(!vs||!fs)return false;
    prog=gl.createProgram();
    gl.attachShader(prog,vs);gl.attachShader(prog,fs);
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
      console.error('[FPaint link]',gl.getProgramInfoLog(prog));return false;
    }
    /* quad plein écran en clip space : 2 triangles via TRIANGLE_STRIP */
    var buf=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),gl.STATIC_DRAW);
    var loc=gl.getAttribLocation(prog,'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.useProgram(prog);
    /* cache uniform locations */
    ['time','resolution','uSpeed','uRotSpeed','uZoom','uGrain','uBrightness','uVignette',
     'uBoostR','uBoostG','uBoostB','uMouse','uMouseActive','uPenSize','uPushForce','uPointerMode'
    ].forEach(function(n){uLocs[n]=gl.getUniformLocation(prog,n);});
    return true;
  }

  function triggerPulse(){
    /* reset le temps → le champ de bruit repart d'un état frais */
    _timeBase=performance.now()/1000;
    _t=0;
    if(window.oscSend)window.oscSend('/fpaint/pulse_fired',[cfg.speed]);
  }

  function draw(){
    if(!_active||!gl)return;
    frameCount++;
    var now=performance.now()/1000;
    var W=cfg.canvas_width,H=cfg.canvas_height;

    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}

    if(!_paused)_t=now-_timeBase;

    /* Conversion coordonnées souris → espace UV du shader */
    var MN=Math.min(W,H);
    var mx=(mouse.x-W*0.5)/MN;
    var my=-(mouse.y-H*0.5)/MN; /* inversion Y : canvas top=0, GLSL bottom=0 */

    var pMode=cfg.pointer_mode==='repel'?-1.0:1.0;
    var mActive=(mouse.down&&cfg.pointer_mode!=='freeze')?1.0:0.0;

    /* Resize glCanvas si besoin */
    if(glCanvas.width!==W||glCanvas.height!==H){
      glCanvas.width=W;glCanvas.height=H;
      gl.viewport(0,0,W,H);
    }

    /* Envoi des uniforms */
    gl.useProgram(prog);
    gl.uniform1f(uLocs.time,_t);
    gl.uniform2f(uLocs.resolution,W,H);
    gl.uniform1f(uLocs.uSpeed,cfg.speed);
    gl.uniform1f(uLocs.uRotSpeed,cfg.rot_speed);
    gl.uniform1f(uLocs.uZoom,cfg.zoom);
    gl.uniform1f(uLocs.uGrain,cfg.grain);
    gl.uniform1f(uLocs.uBrightness,cfg.brightness);
    gl.uniform1f(uLocs.uVignette,cfg.vignette);
    gl.uniform1f(uLocs.uBoostR,cfg.boost_r);
    gl.uniform1f(uLocs.uBoostG,cfg.boost_g);
    gl.uniform1f(uLocs.uBoostB,cfg.boost_b);
    gl.uniform2f(uLocs.uMouse,mx,my);
    gl.uniform1f(uLocs.uMouseActive,mActive);
    gl.uniform1f(uLocs.uPenSize,cfg.pen_size);
    gl.uniform1f(uLocs.uPushForce,cfg.push_force);
    gl.uniform1f(uLocs.uPointerMode,pMode);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    /* Composite WebGL → Canvas2D principal */
    ctx.drawImage(glCanvas,0,0,W,H);

    mouse.px=mouse.x;mouse.py=mouse.y;
  }

  function _reset(){
    _t=0;_paused=false;
    _timeBase=performance.now()/1000;
    frameCount=0;lastPulseTime=0;
  }

  function init(){
    canvas=document.getElementById('c');
    ctx=canvas.getContext('2d');
    cfg.canvas_width=canvas.width||cfg.canvas_width;
    cfg.canvas_height=canvas.height||cfg.canvas_height;
    initGL();
    if(gl)gl.viewport(0,0,cfg.canvas_width,cfg.canvas_height);
    _reset();
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');
    canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;
    cfg.canvas_height=cv.height||cfg.canvas_height;
    if(!gl){initGL();}
    if(glCanvas&&gl){
      glCanvas.width=cfg.canvas_width;glCanvas.height=cfg.canvas_height;
      gl.viewport(0,0,cfg.canvas_width,cfg.canvas_height);
    }
    if(_needsReset){_needsReset=false;_reset();}
  }

  function deactivate(){_active=false;}

  return{
    cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,
    reset:_reset,triggerPulse:triggerPulse,
    togglePause:function(){
      _paused=!_paused;
      if(!_paused)_timeBase=performance.now()/1000-_t;
    },
    markReset:function(){_needsReset=true;}
  };
})();
