/* ═══════════════════════════════════════════
   MENGER ENGINE — Raymarching fractal IFS
   Shader original : Syntopia (Shadertoy.com/view/Mdf3z7)
   Adapté en WebGL2 offscreen pour Super Engine VJ.
═══════════════════════════════════════════ */
var Engine_Menger = (function () {
  var canvas, ctx;
  var mouse = window._mouse;
  var _active = false, _needsReset = false;
  var gl, prog, glCanvas;
  var uLocs = {};
  var _t0 = 0, _lastPulse = 0;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    time_speed: 1.0,
    mouse_enabled: true,
    pulse_enabled: false, pulse_interval: 4.0, pulse_beat_div: 1,
    time_mode: 'bpm', bpm: 120
  };

  var VERT = [
    '#version 300 es',
    'in vec2 aPos;',
    'void main(){gl_Position=vec4(aPos,0.,1.);}'
  ].join('\n');

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform vec2  iResolution;',
    'uniform vec2  iMouse;',
    'uniform float iTime;',
    'out vec4 fragColor;',

    '#define MaxSteps 30',
    '#define MinDist  0.0009',
    '#define NormDist 0.0002',
    '#define Iter     7',
    '#define Scale    3.0',
    '#define FOV      1.0',
    '#define Jitter   0.05',
    '#define Fudge    0.7',
    '#define NLP      2.0',
    '#define Ambient  0.32184',
    '#define Diffuse  0.5',
    '#define LDir  vec3(1.0)',
    '#define LCol  vec3(1.0,1.0,0.858824)',
    '#define LDir2 vec3(1.0,-1.0,1.0)',
    '#define LCol2 vec3(0.0,0.333333,1.0)',
    '#define Offs  vec3(0.92858,0.92858,0.32858)',

    'vec2 rot(vec2 v,float a){return vec2(cos(a)*v.x+sin(a)*v.y,-sin(a)*v.x+cos(a)*v.y);}',

    'vec3 getLight(vec3 col,vec3 n,vec3 d){',
    '  float d1=max(0.,dot(-n,normalize(LDir)));',
    '  float d2=max(0.,dot(-n,normalize(LDir2)));',
    '  return d1*Diffuse*LCol*col + d2*Diffuse*LCol2*col;',
    '}',

    'float DE(vec3 z){',
    '  z=abs(1.0-mod(z,2.0));',
    '  float d=1000.0;',
    '  for(int n=0;n<Iter;n++){',
    '    z.xy=rot(z.xy,4.0+2.0*cos(iTime/15.0));',
    '    z=abs(z);',
    '    if(z.x<z.y)z.xy=z.yx;',
    '    if(z.x<z.z)z.xz=z.zx;',
    '    if(z.y<z.z)z.yz=z.zy;',
    '    z=Scale*z-Offs*(Scale-1.0);',
    '    if(z.z<-0.5*Offs.z*(Scale-1.0))z.z+=Offs.z*(Scale-1.0);',
    '    d=min(d,length(z)*pow(Scale,float(-n)-1.0));',
    '  }',
    '  return d-0.001;',
    '}',

    'vec3 getNorm(vec3 p){',
    '  vec3 e=vec3(0.,NormDist,0.);',
    '  return normalize(vec3(DE(p+e.yxx)-DE(p-e.yxx),DE(p+e.xyx)-DE(p-e.xyx),DE(p+e.xxy)-DE(p-e.xxy)));',
    '}',

    'float rand2(vec2 c){return fract(cos(dot(c,vec2(4.898,7.23)))*23421.631);}',

    'vec4 march(vec3 from,vec3 dir,vec2 fc){',
    '  float td=Jitter*rand2(fc+vec2(iTime*0.2));',
    '  vec3 d2=dir; float dist=0.; int steps=0; vec3 pos;',
    '  for(int i=0;i<MaxSteps;i++){',
    '    dir.zy=rot(d2.zy,td*cos(iTime/12.0)*NLP);',
    '    pos=from+td*dir;',
    '    dist=DE(pos)*Fudge;',
    '    td+=dist;',
    '    if(dist<MinDist)break;',
    '    steps=i;',
    '  }',
    '  float ss=float(steps)+dist/MinDist;',
    '  float ao=1.1-ss/float(MaxSteps);',
    '  vec3 n=getNorm(pos-dir*NormDist*3.0);',
    '  vec3 col=vec3(1.0);',
    '  col=(col*Ambient+getLight(col,n,dir))*ao;',
    '  return vec4(col,1.0);',
    '}',

    'void main(){',
    '  vec2 fc=gl_FragCoord.xy;',
    '  float u=(fc.x/iResolution.x)*2.0-1.0;',
    '  float v=(fc.y/iResolution.y)*2.0-1.0;',
    '  u=u*2.0*(iResolution.x/iResolution.y);',
    '  v=v*2.0;',
    '  vec2 p=vec2(u,v)+iMouse*0.1;',
    '  vec3 camPos=0.03*iTime*vec3(1.,0.,0.);',
    '  vec3 target=camPos+vec3(1.,0.,0.);',
    '  vec3 up=vec3(0.,1.,0.);',
    '  vec3 cd=normalize(target-camPos);',
    '  up=normalize(up-dot(cd,up)*cd);',
    '  vec3 cr=normalize(cross(cd,up));',
    '  vec3 rd=normalize(cd+(p.x*cr+p.y*up)*FOV);',
    '  fragColor=march(camPos,rd,p);',
    '}'
  ].join('\n');

  function compileShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[Menger shader]', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh); return null;
    }
    return sh;
  }

  function initGL() {
    if (gl) return true;
    glCanvas = document.createElement('canvas');
    glCanvas.width = cfg.canvas_width; glCanvas.height = cfg.canvas_height;
    gl = glCanvas.getContext('webgl2');
    if (!gl) { console.error('[Menger] WebGL2 unavailable'); return false; }
    var vs = compileShader(gl.VERTEX_SHADER, VERT);
    var fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[Menger link]', gl.getProgramInfoLog(prog)); return false;
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(prog);
    ['iResolution','iMouse','iTime'].forEach(function(n){
      uLocs[n] = gl.getUniformLocation(prog, n);
    });
    return true;
  }

  function draw() {
    if (!_active || !gl) return;
    if (_needsReset) { _needsReset = false; }

    var W = cfg.canvas_width, H = cfg.canvas_height;
    var now = performance.now() / 1000;

    var pulseEff = cfg.time_mode === 'bpm'
      ? (60 / cfg.bpm) * cfg.pulse_beat_div
      : cfg.pulse_interval;
    if (cfg.pulse_enabled && now - _lastPulse >= pulseEff) {
      _t0 = now; _lastPulse = now;
    }

    var t = (now - _t0) * cfg.time_speed;

    if (glCanvas.width !== W || glCanvas.height !== H) {
      glCanvas.width = W; glCanvas.height = H;
      gl.viewport(0, 0, W, H);
    }

    /* mouse → normalized space */
    var mx = cfg.mouse_enabled ? (mouse.x / W * 2 - 1) * (W / H) : 0;
    var my = cfg.mouse_enabled ? -(mouse.y / H * 2 - 1) : 0;

    gl.useProgram(prog);
    gl.uniform2f(uLocs.iResolution, W, H);
    gl.uniform2f(uLocs.iMouse, mx, my);
    gl.uniform1f(uLocs.iTime, t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.drawImage(glCanvas, 0, 0);
  }

  function triggerPulse() { _t0 = performance.now() / 1000; }

  function _reset() {
    _t0 = performance.now() / 1000;
    if (ctx) { ctx.clearRect(0, 0, cfg.canvas_width, cfg.canvas_height); }
  }

  function activate() {
    _active = true;
    canvas = document.getElementById('c');
    ctx    = canvas.getContext('2d');
    cfg.canvas_width  = canvas.width  || cfg.canvas_width;
    cfg.canvas_height = canvas.height || cfg.canvas_height;
    initGL();
    if (gl) gl.viewport(0, 0, cfg.canvas_width, cfg.canvas_height);
    if (!_t0) _t0 = performance.now() / 1000;
    if (_needsReset) { _needsReset = false; _reset(); }
  }

  function deactivate() { _active = false; }

  function init() {
    canvas = document.getElementById('c');
    if (canvas) ctx = canvas.getContext('2d');
  }

  return {
    cfg: cfg, init: init, draw: draw,
    activate: activate, deactivate: deactivate,
    reset: _reset, triggerPulse: triggerPulse,
    markReset: function () { _needsReset = true; }
  };
})();
