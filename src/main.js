/* ═══════════════════════════════════════════
   ENGINE MANAGER
═══════════════════════════════════════════ */
var EngineManager=(function(){
  var ENGINES={
    fluid:window.FluidSim,vortex:window.VortexEngine,nbody:window.NBodyEngine,
    sph:window.Engine_SPH,boids:window.Engine_Boids,physarum:window.Engine_Physarum,
    lorenz:window.Engine_Lorenz,react:window.Engine_React,aco:window.Engine_ACO,
    rdiff:window.Engine_RDiff,
    voronoi:window.Engine_Voronoi,follow:window.Engine_Follow,
    ribbon:window.Engine_Ribbon,physiks:window.Engine_Physiks,neural:window.Engine_Neural,
    ink:window.Engine_Ink,slope:window.Engine_Slope,dune:window.Engine_Dune,cloth:window.Engine_Cloth
  };
  var ACCENT={fluid:'#00ffff',vortex:'#ff6600',nbody:'#aa44ff',sph:'#00ff88',boids:'#ffdd00',physarum:'#ff44aa',lorenz:'#44aaff',react:'#ff2266',aco:'#ff8800',rdiff:'#ff5500',voronoi:'#ffcc00',follow:'#6688ff',ribbon:'#ff66aa',physiks:'#c8a040',neural:'#44eeff',ink:'#a044ff',slope:'#ff3d6e',dune:'#e8772e',cloth:'#00aa88'};
  var NAMES={fluid:'FLUID SIM',vortex:'VORTEX',nbody:'N-BODY',sph:'SPH FLUID',boids:'BOIDS',physarum:'PHYSARUM',lorenz:'LORENZ',react:'REACT',aco:'ACO FOURMIS',rdiff:'REACTION-DIFFUSION',voronoi:'VORONOI VIVANT',follow:'FOLLOW — FLOW FIELD',ribbon:'RIBBON — RUBANS',physiks:'PHYSIKS — PHYSIQUE DES MATÉRIAUX',neural:'NEURAL — RÉSEAU',ink:'INK — ENCRE & PEINTURE',slope:'SLOPE — CHAMPS DE VECTEURS',dune:'DUNE — SABLE & BRUIT',cloth:'CLOTH — TISSU PHYSIQUE'};
  window.activeEngine='fluid';
  window.overlayEngine=null;window.overlayAlpha=0.3;

  window.switchEngine=function(name,isOverlay){
    if(!ENGINES[name])return;
    if(isOverlay){if(window.overlayEngine&&ENGINES[window.overlayEngine])ENGINES[window.overlayEngine].deactivate();window.overlayEngine=name;ENGINES[name].activate();return;}
    if(ENGINES[window.activeEngine])ENGINES[window.activeEngine].deactivate();
    window.activeEngine=name;
    document.documentElement.style.setProperty('--accent',ACCENT[name]);
    document.querySelectorAll('.eng-btn').forEach(function(b){b.classList.toggle('active',b.dataset.engine===name);});
    /* Show/hide engine panes */
    document.querySelectorAll('.engine-panes').forEach(function(p){p.style.display=(p.dataset.engine===name)?'block':'none';});
    var hdr=document.querySelector('#panel-header span:first-child');if(hdr)hdr.textContent=NAMES[name];
    ENGINES[name].activate();
  };

  /* ── Global cursor drawn every frame ── */
  var _cursorCtx=null;
  function drawGlobalCursor(){
    if(!_cursorCtx){var cc=document.getElementById('cursor-overlay');if(!cc)return;_cursorCtx=cc.getContext('2d');}
    var cc=document.getElementById('cursor-overlay');
    _cursorCtx.clearRect(0,0,cc.width,cc.height);
    if(window._cursorHidden||!window._cursorOnCanvas)return;
    var eng=ENGINES[window.activeEngine],penSize=(eng&&eng.cfg&&eng.cfg.pen_size)?eng.cfg.pen_size:40;
    if(eng&&eng.cfg&&eng.cfg.grid_res)penSize=penSize*eng.cfg.grid_res;
    var mx=window._mouse.x,my=window._mouse.y,r=10;
    var accent=ACCENT[window.activeEngine]||'#00ffff';
    _cursorCtx.save();
    /* pen radius ring */
    _cursorCtx.strokeStyle='rgba(255,255,255,.2)';_cursorCtx.lineWidth=1;_cursorCtx.setLineDash([3,6]);
    _cursorCtx.beginPath();_cursorCtx.arc(mx,my,penSize,0,Math.PI*2);_cursorCtx.stroke();
    _cursorCtx.setLineDash([]);
    /* center dot circle */
    _cursorCtx.strokeStyle=accent;_cursorCtx.lineWidth=1.5;
    _cursorCtx.beginPath();_cursorCtx.arc(mx,my,r,0,Math.PI*2);_cursorCtx.stroke();
    /* crosshair */
    _cursorCtx.strokeStyle='rgba(255,255,255,.5)';_cursorCtx.lineWidth=1;
    _cursorCtx.beginPath();
    _cursorCtx.moveTo(mx-r-4,my);_cursorCtx.lineTo(mx+r+4,my);
    _cursorCtx.moveTo(mx,my-r-4);_cursorCtx.lineTo(mx,my+r+4);
    _cursorCtx.stroke();
    _cursorCtx.restore();
  }

  function masterDraw(){
    if(window.FXEngine)FXEngine.apply('pre');
    if(ENGINES[window.activeEngine])ENGINES[window.activeEngine].draw();
    if(window.overlayEngine&&ENGINES[window.overlayEngine]){var cv=document.getElementById('c'),ctx2=cv.getContext('2d');ctx2.globalAlpha=window.overlayAlpha||0.3;ENGINES[window.overlayEngine].draw();ctx2.globalAlpha=1;}
    if(window.FXEngine)FXEngine.apply('post');
    else if(window.glRender)window.glRender(window._warpAmount||0);
    drawGlobalCursor();
    if(window._hudUpdate&&masterDraw._fc%20===0)window._hudUpdate();
    if(window._fadeTick)window._fadeTick();
    if(window._looperTick)window._looperTick();
    masterDraw._fc=(masterDraw._fc||0)+1;
    requestAnimationFrame(masterDraw);
  }
  masterDraw._fc=0;

  function init(){
    Object.values(ENGINES).forEach(function(eng){if(eng&&eng.init)eng.init();});
    /* Bind engine bar */
    document.querySelectorAll('.eng-btn').forEach(function(b){b.addEventListener('click',function(){window.switchEngine(b.dataset.engine);});});
    window.switchEngine('fluid');
    requestAnimationFrame(masterDraw);
  }
  return{init:init,engines:ENGINES,accent:ACCENT};
})();

/* ═══════════════════════════════════════════
   AUTO-RESIZE
═══════════════════════════════════════════ */
var _customResLocked=false;
function autoResize(){
  if(_customResLocked)return;
  if(!document.getElementById('c').getContext)return; /* canvas pas encore prêt */
  var panelEl=document.getElementById('panel');
  var panelW=(panelEl&&panelEl.style.display!=='none')?290:0;
  var PAD=panelW?16:0,availW=window.innerWidth-panelW-PAD,availH=window.innerHeight-PAD;
  var res=FluidSim.cfg.resolution;
  FluidSim.cfg.canvas_width=Math.max(res*10,Math.floor(availW/res)*res);
  FluidSim.cfg.canvas_height=Math.max(res*10,Math.floor(availH/res)*res);
  FluidSim.resize();updateResDisplay();
  /* sync canvas size to all engines and mark them for reset on next activate */
  var engineNames=['VortexEngine','NBodyEngine','Engine_SPH','Engine_Boids','Engine_Physarum','Engine_Lorenz','Engine_React','Engine_ACO','Engine_RDiff','Engine_LSystem','Engine_Voronoi','Engine_Follow','Engine_Ribbon','Engine_Physiks','Engine_Neural','Engine_Ink','Engine_Slope','Engine_Dune','Engine_Cloth'];
  engineNames.forEach(function(n){var e=window[n];if(e&&e.cfg){e.cfg.canvas_width=FluidSim.cfg.canvas_width;e.cfg.canvas_height=FluidSim.cfg.canvas_height;if(e.markReset)e.markReset();}});
}
function updateResDisplay(){
  var d=document.getElementById('cur-res-display');if(d)d.textContent=FluidSim.cfg.canvas_width+' × '+FluidSim.cfg.canvas_height+' px';
  var si=document.getElementById('screen-info');if(si)si.textContent='Écran : '+window.screen.width+' × '+window.screen.height+' px';
  var ow=document.getElementById('out-w'),oh=document.getElementById('out-h'),vow=document.getElementById('val-out-w'),voh=document.getElementById('val-out-h');
  if(ow){ow.value=FluidSim.cfg.canvas_width;if(vow)vow.textContent=FluidSim.cfg.canvas_width;}
  if(oh){oh.value=FluidSim.cfg.canvas_height;if(voh)voh.textContent=FluidSim.cfg.canvas_height;}
}
var _resizeTimer=null;
window.addEventListener('resize',function(){clearTimeout(_resizeTimer);_resizeTimer=setTimeout(autoResize,150);});

/* ═══════════════════════════════════════════
   RAMP EDITOR
═══════════════════════════════════════════ */
var selectedStop=-1,draggingStop=-1,rampBarRect=null;
function renderStops(){
  var bar=document.getElementById('ramp-bar');if(!bar)return;
  bar.innerHTML='';
  FluidSim.cfg.ramp_stops.forEach(function(s,i){
    var el=document.createElement('div');
    el.className='stop-h'+(i===selectedStop?' sel':'');
    el.style.cssText='position:absolute;left:'+(s.pos*100)+'%;width:11px;height:11px;border-radius:50%;background:'+s.color+';transform:translateX(-50%);top:3px;border:2px solid '+(i===selectedStop?'#fff':'rgba(255,255,255,.35)')+';cursor:ew-resize;box-sizing:border-box;';
    el.dataset.i=i;bar.appendChild(el);
  });
  var det=document.getElementById('stop-det');if(!det)return;
  if(selectedStop<0||selectedStop>=FluidSim.cfg.ramp_stops.length){det.style.display='none';return;}
  det.style.display='flex';
  var s=FluidSim.cfg.ramp_stops[selectedStop];
  document.getElementById('stop-color').value=s.color;
  document.getElementById('stop-pos-inp').value=Math.round(s.pos*100);
  document.getElementById('btn-del-stop').style.visibility=FluidSim.cfg.ramp_stops.length>2?'visible':'hidden';
}
function initRampEditor(){
  var rc=document.getElementById('ramp-canvas'),bar=document.getElementById('ramp-bar');
  if(!rc||!bar)return;
  rc.addEventListener('click',function(e){var rect=rc.getBoundingClientRect(),t=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));FluidSim.cfg.ramp_stops.push({pos:t,color:getRampColor(t)});selectedStop=FluidSim.cfg.ramp_stops.length-1;buildLUT();renderStops();});
  bar.addEventListener('mousedown',function(e){var h=e.target;if(!h.dataset||h.dataset.i===undefined)return;draggingStop=parseInt(h.dataset.i);selectedStop=draggingStop;rampBarRect=bar.getBoundingClientRect();e.preventDefault();e.stopPropagation();renderStops();});
  document.addEventListener('mousemove',function(e){if(draggingStop<0)return;FluidSim.cfg.ramp_stops[draggingStop].pos=Math.max(0,Math.min(1,(e.clientX-rampBarRect.left)/rampBarRect.width));buildLUT();renderStops();});
  document.addEventListener('mouseup',function(){draggingStop=-1;});
  var sc=document.getElementById('stop-color'),sp=document.getElementById('stop-pos-inp'),sd=document.getElementById('btn-del-stop');
  if(sc)sc.addEventListener('input',function(){if(selectedStop<0)return;FluidSim.cfg.ramp_stops[selectedStop].color=this.value;buildLUT();renderStops();});
  if(sp)sp.addEventListener('change',function(){if(selectedStop<0)return;FluidSim.cfg.ramp_stops[selectedStop].pos=Math.max(0,Math.min(1,parseInt(this.value)/100));buildLUT();renderStops();});
  if(sd)sd.addEventListener('click',function(){if(FluidSim.cfg.ramp_stops.length<=2)return;FluidSim.cfg.ramp_stops.splice(selectedStop,1);selectedStop=Math.min(selectedStop,FluidSim.cfg.ramp_stops.length-1);buildLUT();renderStops();});
  buildLUT();renderStops();
}

/* ═══════════════════════════════════════════
   WIRING UTILS
═══════════════════════════════════════════ */
function makeEditable(span,slider,dec,cb){
  var mn=parseFloat(slider.min),mx=parseFloat(slider.max);
  span.addEventListener('click',function(){
    if(span._ed)return;span._ed=true;
    var inp=document.createElement('input');inp.type='number';inp.className='val-input';inp.value=span.textContent;inp.min=mn;inp.max=mx;
    span.replaceWith(inp);inp.focus();inp.select();
    function commit(){var v=Math.min(mx,Math.max(mn,parseFloat(inp.value)||parseFloat(slider.value)));slider.value=v;span.textContent=v.toFixed(dec);span._ed=false;inp.replaceWith(span);cb(v);}
    inp.addEventListener('blur',commit);inp.addEventListener('keydown',function(e){if(e.key==='Enter')inp.blur();if(e.key==='Escape'){span._ed=false;inp.replaceWith(span);}});
  });
}
function wire(sid,key,spid,dec,extra){
  var sl=document.getElementById(sid),sp=document.getElementById(spid);if(!sl||!sp)return;dec=dec!==undefined?dec:2;
  function apply(v){FluidSim.cfg[key]=v;sp.textContent=v.toFixed(dec);if(extra)extra(v);}
  sl.addEventListener('input',function(){apply(parseFloat(this.value));});makeEditable(sp,sl,dec,apply);
}

/* ═══════════════════════════════════════════
   TABS
═══════════════════════════════════════════ */
var _activeTab='live';
document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    _activeTab=this.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('.tab-pane').forEach(function(p){p.classList.remove('active');});
    this.classList.add('active');
    var el=document.getElementById('tab-'+_activeTab);if(el)el.classList.add('active');
    ['vortex','nbody','sph','boids','physarum','lorenz','react','aco','rdiff','lsys','voronoi','follow','ribbon','physiks','neural','ink','slope','dune'].forEach(function(eng){
      var vel=document.getElementById('tab-'+eng+'-'+_activeTab);if(vel)vel.classList.add('active');
    });
  });
});

/* ═══════════════════════════════════════════
   FLUID SLIDERS
═══════════════════════════════════════════ */
wire('pen-size','pen_size','val-pen-size',0);
wire('push-force','push_force','val-push-force',1);
wire('inj-angle','injection_angle','val-inj-angle',0);
wire('lw','line_width','val-lw',1);
wire('ff','flow_force','val-ff',3);
wire('drag','particle_drag','val-drag',2);
wire('visc','viscosity','val-visc',3);
wire('turb','turbulence','val-turb',2);
wire('trail','trail','val-trail',2);
wire('opa','opacity','val-opa',2);
wire('gx','gravity_x','val-gx',2);
wire('gy','gravity_y','val-gy',2);
wire('vmax','vel_max','val-vmax',1,function(){buildLUT();});
wire('res','resolution','val-res',0,function(){autoResize();});
wire('pulse-str','pulse_strength','val-pulse-str',1);
wire('pulse-noise','pulse_noise','val-pulse-noise',2);
wire('pulse-int','pulse_interval','val-pulse-int',1);
wire('auto-pen-size','auto_pen_size','val-auto-pen-size',0);
wire('auto-int','auto_interval','val-auto-int',1);
wire('auto-count','auto_count','val-auto-count',0);
wire('auto-length','auto_length','val-auto-length',0);
wire('auto-speed','auto_speed','val-auto-speed',0);
wire('auto-force','auto_force','val-auto-force',1);
wire('bpm','bpm','val-bpm',0,function(v){var d=document.getElementById('tap-bpm-display');if(d)d.textContent=Math.round(v);updateBeatDisplays();});

(function(){var sl=document.getElementById('speck'),sp=document.getElementById('val-speck');if(!sl||!sp)return;function apply(v){FluidSim.cfg.speck_count=v;sp.textContent=v;FluidSim.setParticleCount(v);}sl.addEventListener('input',function(){apply(parseInt(this.value));});makeEditable(sp,sl,0,function(v){apply(Math.round(v));});})();

function setupBigToggle(btnId,cfgKey){var btn=document.getElementById(btnId);if(!btn)return;function update(){var on=FluidSim.cfg[cfgKey];btn.classList.toggle('on',on);btn.querySelector('.dot').style.background=on?'#00ffff':'#444';}btn.addEventListener('click',function(){FluidSim.cfg[cfgKey]=!FluidSim.cfg[cfgKey];update();});btn._update=update;update();}
setupBigToggle('btn-pulse-toggle','pulse_enabled');
setupBigToggle('btn-auto-toggle','auto_enabled');
(function(){var b=document.getElementById('btn-pulse-fire');if(b)b.addEventListener('click',function(){FluidSim.triggerPulseExt();});})();
(function(){var b=document.getElementById('btn-auto-fire');if(b)b.addEventListener('click',function(){FluidSim.triggerAutoStroke();});})();

document.querySelectorAll('[data-mode]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-mode]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.pointer_mode=this.dataset.mode;var si=document.getElementById('sec-injection');if(si)si.style.display=this.dataset.mode==='injection'?'block':'none';var sb=document.getElementById('sec-brush');if(sb)sb.style.display=this.dataset.mode==='color_brush'?'block':'none';});});
document.querySelectorAll('[data-pulse]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-pulse]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.pulse_type=this.dataset.pulse;});});
document.querySelectorAll('[data-cmode]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-cmode]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.color_mode=this.dataset.cmode;var ss=document.getElementById('sec-solid');if(ss)ss.style.display=this.dataset.cmode==='solid'?'block':'none';var sv=document.getElementById('sec-velocity');if(sv)sv.style.display=this.dataset.cmode==='velocity'?'block':'none';});});
document.querySelectorAll('[data-amode]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-amode]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.auto_mode=this.dataset.amode;});});
document.querySelectorAll('[data-aorigin]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-aorigin]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.auto_origin=this.dataset.aorigin;});});
document.querySelectorAll('[data-acol]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-acol]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.auto_color_mode=this.dataset.acol;var acp=document.getElementById('auto-color-pick');if(acp)acp.style.display=this.dataset.acol==='paint'?'block':'none';});});
(function(){var b=document.getElementById('bg-color');if(b)b.addEventListener('input',function(){FluidSim.cfg.bg_color=this.value;});})();
(function(){var b=document.getElementById('particle-color');if(b)b.addEventListener('input',function(){FluidSim.cfg.color=this.value;});})();
(function(){var b=document.getElementById('brush-color');if(b)b.addEventListener('input',function(){FluidSim.cfg.brush_color=this.value;});})();
(function(){var b=document.getElementById('auto-color');if(b)b.addEventListener('input',function(){FluidSim.cfg.auto_color=this.value;});})();
(function(){var b=document.getElementById('btn-reset-colors');if(b)b.addEventListener('click',function(){FluidSim.resetColors();});})();
(function(){var b=document.getElementById('vel-opacity');if(b)b.addEventListener('change',function(){FluidSim.cfg.vel_opacity_scale=this.checked;});})();
(function(){var b=document.getElementById('vel-width');if(b)b.addEventListener('change',function(){FluidSim.cfg.vel_width_scale=this.checked;});})();
(function(){var b=document.getElementById('btn-reinit');if(b)b.addEventListener('click',function(){FluidSim.resize();});})();

/* ═══════════════════════════════════════════
   TEMPO
═══════════════════════════════════════════ */
function updateBeatDisplays(){var bpm=FluidSim.cfg.bpm,pd=document.getElementById('pulse-ms-display'),ad=document.getElementById('auto-ms-display');if(pd)pd.textContent='= '+(60/bpm*FluidSim.cfg.pulse_beat_div).toFixed(3)+'s';if(ad)ad.textContent='= '+(60/bpm*FluidSim.cfg.auto_beat_div).toFixed(3)+'s';}
function setTimeMode(mode){[FluidSim,VortexEngine,NBodyEngine,Engine_SPH,Engine_Boids,Engine_Physarum,Engine_Lorenz,Engine_React,Engine_ACO].forEach(function(e){if(e&&e.cfg)e.cfg.time_mode=mode;});var isBpm=mode==='bpm';var sbpc=document.getElementById('sec-bpm-ctrl'),pis=document.getElementById('pulse-int-sec'),pib=document.getElementById('pulse-int-bpm'),ais=document.getElementById('auto-int-sec'),aib=document.getElementById('auto-int-bpm');if(sbpc)sbpc.style.display=isBpm?'block':'none';if(pis)pis.style.display=isBpm?'none':'block';if(pib)pib.style.display=isBpm?'block':'none';if(ais)ais.style.display=isBpm?'none':'block';if(aib)aib.style.display=isBpm?'block':'none';document.querySelectorAll('[data-tmode]').forEach(function(b){b.classList.toggle('active',b.dataset.tmode===mode);});if(isBpm)updateBeatDisplays();}
document.querySelectorAll('[data-tmode]').forEach(function(btn){btn.addEventListener('click',function(){setTimeMode(this.dataset.tmode);});});
setTimeMode('bpm');
document.querySelectorAll('[data-pdiv]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-pdiv]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.pulse_beat_div=parseFloat(this.dataset.pdiv);updateBeatDisplays();});});
document.querySelectorAll('[data-adiv]').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('[data-adiv]').forEach(function(b){b.classList.remove('active');});this.classList.add('active');FluidSim.cfg.auto_beat_div=parseFloat(this.dataset.adiv);updateBeatDisplays();});});
(function(){var taps=[];var b=document.getElementById('btn-tap');if(!b)return;b.addEventListener('click',function(){var now=performance.now();if(taps.length&&now-taps[taps.length-1]>3000)taps=[];taps.push(now);if(taps.length>8)taps.shift();if(taps.length>=2){var avg=(taps[taps.length-1]-taps[0])/(taps.length-1),bpm=Math.max(40,Math.min(300,Math.round(60000/avg)));/* propagate BPM to ALL engines */FluidSim.cfg.bpm=bpm;[VortexEngine,NBodyEngine,Engine_SPH,Engine_Boids,Engine_Physarum,Engine_Lorenz,Engine_React,Engine_ACO].forEach(function(e){if(e&&e.cfg)e.cfg.bpm=bpm;});var sl=document.getElementById('bpm'),sp=document.getElementById('val-bpm'),td=document.getElementById('tap-bpm-display');if(sl)sl.value=bpm;if(sp)sp.textContent=bpm;if(td)td.textContent=bpm;updateBeatDisplays();}var d=document.getElementById('beat-dot');if(d){d.style.width='100%';setTimeout(function(){d.style.width='0%';},120);}});})();

/* ═══════════════════════════════════════════
   MIDI / OSC
═══════════════════════════════════════════ */
var MAPPABLE=[
  {key:'pen_size',label:'Rayon',min:5,max:150},{key:'push_force',label:'Force',min:0.1,max:8},
  {key:'flow_force',label:'Flow force',min:0.005,max:0.3},{key:'particle_drag',label:'Drag',min:0.1,max:0.99},
  {key:'viscosity',label:'Viscosité',min:0.8,max:0.999},{key:'turbulence',label:'Turbulence',min:0,max:2},
  {key:'trail',label:'Trail',min:0,max:1},{key:'opacity',label:'Opacité',min:0.05,max:1},
  {key:'line_width',label:'Épaisseur',min:0.2,max:5},{key:'gravity_x',label:'Gravité X',min:-0.5,max:0.5},
  {key:'gravity_y',label:'Gravité Y',min:-0.5,max:0.5},{key:'pulse_strength',label:'Pulse force',min:0.1,max:5},
  {key:'pulse_interval',label:'Pulse intervalle',min:0.2,max:20},{key:'vel_max',label:'Vitesse max',min:0.5,max:20},
  {key:'bpm',label:'BPM',min:40,max:300},{key:'hue_shift',label:'Hue shift',min:0,max:359},
  {key:'chroma_amount',label:'Chromatic abr.',min:0,max:10},{key:'bloom_strength',label:'Bloom strength',min:0,max:8},
  {key:'feedback_alpha',label:'Feedback alpha',min:0,max:0.98}
];
var SLIDER_ID={pen_size:'pen-size',push_force:'push-force',flow_force:'ff',particle_drag:'drag',viscosity:'visc',turbulence:'turb',trail:'trail',opacity:'opa',line_width:'lw',gravity_x:'gx',gravity_y:'gy',pulse_strength:'pulse-str',pulse_interval:'pulse-int',vel_max:'vmax',bpm:'bpm',auto_pen_size:'auto-pen-size',auto_count:'auto-count',auto_length:'auto-length',auto_speed:'auto-speed',auto_force:'auto-force',pulse_noise:'pulse-noise',kaleid_segments:'kaleid-seg',kaleid_angle:'kaleid-angle',hue_shift:'hue-shift',hue_speed:'hue-speed',bloom_threshold:'bloom-thr',bloom_strength:'bloom-str',chroma_amount:'chroma',feedback_zoom:'fb-zoom',feedback_alpha:'fb-alpha',warp_strength:'warp-str',warp_decay:'warp-dec',clock_smooth:'clock-smooth',scene_fade_dur:'fade-dur',loop_length:'loop-len'};
var SPAN_ID={'pen-size':'val-pen-size','push-force':'val-push-force','ff':'val-ff','drag':'val-drag','visc':'val-visc','turb':'val-turb','trail':'val-trail','opa':'val-opa','lw':'val-lw','gx':'val-gx','gy':'val-gy','pulse-str':'val-pulse-str','pulse-int':'val-pulse-int','vmax':'val-vmax','bpm':'val-bpm'};
var midiAccess=null,midiCC={},midiLearnMode=false,midiLearnTarget=null;
function applyParamValue(key,v){var m=MAPPABLE.find(function(p){return p.key===key;});if(!m)return;v=Math.min(m.max,Math.max(m.min,v));FluidSim.cfg[key]=v;var sid=SLIDER_ID[key];if(!sid)return;var sl=document.getElementById(sid);if(sl)sl.value=v;var sp=document.getElementById(SPAN_ID[sid]);if(sp)sp.textContent=v.toFixed(2);}
function midiNorm(v,min,max){return min+(max-min)*(v/127);}
var onMidiMsg=function(e){
  var cmd=e.data[0]&0xF0,ch=(e.data[0]&0x0F)+1;
  var chf=parseInt(document.getElementById('midi-ch').value||'0');
  if(chf>0&&ch!==chf)return;
  if(cmd===0x90&&e.data[2]>0){var npb=document.getElementById('midi-note-pulse'),npa=document.getElementById('midi-note-auto');if(npb&&npb.checked)FluidSim.triggerPulseExt((e.data[2]/127)*FluidSim.cfg.pulse_strength*2);if(npa&&npa.checked)FluidSim.triggerAutoStroke();}
  if(cmd===0xB0){var cc=e.data[1],val=e.data[2];if(midiLearnMode&&midiLearnTarget){midiCC[cc]=midiLearnTarget;exitLearn();renderCCList();return;}if(midiCC[cc]){var pm=MAPPABLE.find(function(p){return p.key===midiCC[cc];});if(pm)applyParamValue(pm.key,midiNorm(val,pm.min,pm.max));}}
};
function populateMidiDevices(){
  var sel=document.getElementById('midi-device-sel');if(!sel||!midiAccess)return;
  var cur=sel.value;
  sel.innerHTML='<option value="all">Tous</option>';
  midiAccess.inputs.forEach(function(inp){var o=document.createElement('option');o.value=inp.id;o.textContent=inp.name;sel.appendChild(o);});
  var opts=sel.querySelectorAll('option');for(var i=0;i<opts.length;i++){if(opts[i].value===cur){sel.value=cur;break;}}
}
function bindMidiInputs(){
  if(!midiAccess)return;
  var sel=document.getElementById('midi-device-sel');
  var devId=sel?sel.value:'all';
  midiAccess.inputs.forEach(function(inp){inp.onmidimessage=(devId==='all'||inp.id===devId)?onMidiMsg:null;});
  var n=devId==='all'?midiAccess.inputs.size:1;
  setMidiSt('ok',n+' input(s)');
}
function enableMIDI(){if(!navigator.requestMIDIAccess){setMidiSt('err','Non supporté');return;}setMidiSt('wait','Demande…');navigator.requestMIDIAccess({sysex:false}).then(function(a){midiAccess=a;populateMidiDevices();bindMidiInputs();a.onstatechange=function(){populateMidiDevices();bindMidiInputs();};},function(){setMidiSt('err','Accès refusé');});}
function setMidiSt(s,t){var e=document.getElementById('midi-status');if(e){e.className='status-dot '+s;e.title=t||'';}}
function exitLearn(){midiLearnMode=false;midiLearnTarget=null;var btn=document.getElementById('btn-midi-learn');if(btn){btn.classList.remove('learning');btn.textContent='🎛 MIDI Learn';}var lh=document.getElementById('learn-hint');if(lh)lh.style.display='none';}
function renderCCList(){var list=document.getElementById('midi-cc-list');if(!list)return;list.innerHTML='';var keys=Object.keys(midiCC);if(!keys.length){list.innerHTML='<div style="color:#2a2a2a;font-size:10px;padding:2px 0">Aucun mapping</div>';return;}keys.forEach(function(cc){var key=midiCC[cc],m=MAPPABLE.find(function(p){return p.key===key;});if(!m)return;var row=document.createElement('div');row.className='midi-map-row';row.innerHTML='<span style="color:#00ffff;min-width:32px">CC'+cc+'</span><span>→ '+m.label+'</span>';var rb=document.createElement('button');rb.className='preset-btn del';rb.textContent='✕';rb.addEventListener('click',function(){delete midiCC[cc];renderCCList();});row.appendChild(rb);list.appendChild(row);});}
(function(){var sel=document.getElementById('add-cc-param');if(!sel)return;MAPPABLE.forEach(function(p){var o=document.createElement('option');o.value=p.key;o.textContent=p.label;sel.appendChild(o);});})();
(function(){var b=document.getElementById('midi-ch');if(b)b.addEventListener('input',function(){var vd=document.getElementById('val-midi-ch');if(vd)vd.textContent=parseInt(this.value)===0?'Tous':this.value;});})();
(function(){var b=document.getElementById('btn-midi-enable');if(b)b.addEventListener('click',enableMIDI);})();
(function(){var s=document.getElementById('midi-device-sel');if(s)s.addEventListener('change',bindMidiInputs);})();
(function(){var b=document.getElementById('btn-midi-refresh');if(b)b.addEventListener('click',function(){populateMidiDevices();bindMidiInputs();});})();
(function(){var b=document.getElementById('btn-add-cc');if(b)b.addEventListener('click',function(){var cc=parseInt(document.getElementById('add-cc-num').value),key=document.getElementById('add-cc-param').value;if(isNaN(cc)||cc<0||cc>127||!key)return;midiCC[cc]=key;renderCCList();});})();
(function(){var b=document.getElementById('btn-midi-learn');if(b)b.addEventListener('click',function(){if(midiLearnMode){exitLearn();return;}if(!midiAccess){alert('Active d\'abord le MIDI.');return;}midiLearnMode=true;this.classList.add('learning');this.textContent='⏹ Annuler Learn';var lh=document.getElementById('learn-hint');if(lh){lh.style.display='block';lh.textContent='Clique un paramètre puis envoie un CC';}});})();
renderCCList();

/* OSC */
var oscSock=null;
function setOscSt(s,t){var e=document.getElementById('osc-status');if(e){e.className='status-dot '+s;e.title=t||'';}}
function onOscMsg(msg){var addr=msg.address,args=msg.args||[];if(addr==='/fluid/pulse'){FluidSim.triggerPulseExt(args[0]!==undefined?parseFloat(args[0]):undefined);return;}if(addr==='/fluid/auto_stroke'){FluidSim.triggerAutoStroke(args[0]?parseInt(args[0]):undefined);return;}var m=addr.match(/^\/fluid\/(.+)$/);if(m&&args[0]!==undefined)applyParamValue(m[1],parseFloat(args[0]));}
(function(){var b=document.getElementById('btn-osc-connect');if(b)b.addEventListener('click',function(){var url=document.getElementById('osc-url-inp').value.trim();if(!url)return;setOscSt('wait','Connexion…');try{if(oscSock)oscSock.close();oscSock=new WebSocket(url);oscSock.onopen=function(){setOscSt('ok','Connecté');b.style.display='none';var d=document.getElementById('btn-osc-disconnect');if(d)d.style.display='';};oscSock.onclose=function(){setOscSt('off','Déconnecté');b.style.display='';var d=document.getElementById('btn-osc-disconnect');if(d)d.style.display='none';};oscSock.onerror=function(){setOscSt('err','Erreur');};oscSock.onmessage=function(e){try{onOscMsg(JSON.parse(e.data));}catch(err){}};;}catch(err){setOscSt('err','URL invalide');}});})();
(function(){var b=document.getElementById('btn-osc-disconnect');if(b)b.addEventListener('click',function(){if(oscSock){oscSock.close();oscSock=null;}});})();
window.oscSend=function(addr,args){if(oscSock&&oscSock.readyState===1){try{oscSock.send(JSON.stringify({address:addr,args:args}));}catch(e){}}};

/* ═══════════════════════════════════════════
   PRESETS
═══════════════════════════════════════════ */
var PRESET_KEY='super_engine_presets',activePresetName=null;
var CFG_KEYS=['resolution','speck_count','pen_size','push_force','flow_force','time_mode','bpm','pulse_beat_div','auto_beat_div','particle_drag','viscosity','turbulence','trail','line_width','opacity','color','brush_color','bg_color','color_mode','ramp_stops','vel_max','vel_opacity_scale','vel_width_scale','gravity_x','gravity_y','injection_angle','pointer_mode','pulse_enabled','pulse_interval','pulse_strength','pulse_noise','pulse_type','auto_enabled','auto_interval','auto_count','auto_length','auto_speed','auto_force','auto_pen_size','auto_mode','auto_origin','auto_color_mode','auto_color','kaleid_enabled','kaleid_segments','kaleid_angle','mirror_mode','hue_shift_enabled','hue_shift','hue_speed','hue_beat_div','hue_tgt_particles','hue_tgt_bg','pixsort_enabled','pixsort_threshold','pixsort_direction','pixsort_coverage','bloom_enabled','bloom_threshold','bloom_strength','chroma_enabled','chroma_amount','feedback_enabled','feedback_zoom','feedback_alpha','warp_strength','warp_decay','midi_clock_active','clock_smooth','pc_transition','note_map','scene_transition','scene_fade_dur','loop_length','ws_send_rate','curl_noise_enabled','curl_scale','curl_speed','curl_strength'];
function loadPresets(){try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'{}');}catch(e){return{};}}
function savePresets(obj){localStorage.setItem(PRESET_KEY,JSON.stringify(obj));}
function cfgSnapshot(){var snap={engine:window.activeEngine,overlay:window.overlayEngine,overlayAlpha:window.overlayAlpha};Object.keys(EngineManager.engines).forEach(function(k){var eng=EngineManager.engines[k];if(eng&&eng.cfg)snap[k]=JSON.parse(JSON.stringify(eng.cfg));});return snap;}
function applySnapshot(snap){
  if(!snap)return;
  if(!snap.engine){CFG_KEYS.forEach(function(k){if(snap[k]!==undefined)FluidSim.cfg[k]=JSON.parse(JSON.stringify(snap[k]));});}
  else{Object.keys(EngineManager.engines).forEach(function(k){if(snap[k]&&EngineManager.engines[k])Object.assign(EngineManager.engines[k].cfg,snap[k]);});if(snap.engine)window.switchEngine(snap.engine);if(snap.overlay)window.switchEngine(snap.overlay,true);window.overlayAlpha=snap.overlayAlpha||0.3;}
  syncUIFromCfg();buildLUT();renderStops();autoResize();
}
function syncUIFromCfg(){
  var c=FluidSim.cfg;
  function ss(id,sid,v,dec){var sl=document.getElementById(id);if(sl)sl.value=v;var sp=document.getElementById(sid);if(sp)sp.textContent=parseFloat(v).toFixed(dec!==undefined?dec:2);}
  ss('pen-size','val-pen-size',c.pen_size,0);ss('push-force','val-push-force',c.push_force,1);ss('inj-angle','val-inj-angle',c.injection_angle,0);ss('lw','val-lw',c.line_width,1);ss('ff','val-ff',c.flow_force,3);ss('drag','val-drag',c.particle_drag,2);ss('visc','val-visc',c.viscosity,3);ss('turb','val-turb',c.turbulence,2);ss('trail','val-trail',c.trail,2);ss('opa','val-opa',c.opacity,2);ss('gx','val-gx',c.gravity_x,2);ss('gy','val-gy',c.gravity_y,2);ss('vmax','val-vmax',c.vel_max,1);ss('res','val-res',c.resolution,0);ss('speck','val-speck',Math.min(c.speck_count,30000),0);ss('bpm','val-bpm',c.bpm,0);ss('pulse-str','val-pulse-str',c.pulse_strength,1);ss('pulse-noise','val-pulse-noise',c.pulse_noise,2);ss('pulse-int','val-pulse-int',c.pulse_interval,1);ss('auto-int','val-auto-int',c.auto_interval,1);ss('auto-count','val-auto-count',c.auto_count,0);ss('auto-length','val-auto-length',c.auto_length,0);ss('auto-speed','val-auto-speed',c.auto_speed,0);ss('auto-force','val-auto-force',c.auto_force,1);ss('auto-pen-size','val-auto-pen-size',c.auto_pen_size,0);
  var bgEl=document.getElementById('bg-color');if(bgEl)bgEl.value=c.bg_color;var pcEl=document.getElementById('particle-color');if(pcEl)pcEl.value=c.color;
  document.getElementById('vel-opacity').checked=c.vel_opacity_scale;document.getElementById('vel-width').checked=c.vel_width_scale;
  document.querySelectorAll('[data-mode]').forEach(function(b){b.classList.toggle('active',b.dataset.mode===c.pointer_mode);});
  document.querySelectorAll('[data-pulse]').forEach(function(b){b.classList.toggle('active',b.dataset.pulse===c.pulse_type);});
  document.querySelectorAll('[data-cmode]').forEach(function(b){b.classList.toggle('active',b.dataset.cmode===c.color_mode);});
  document.querySelectorAll('[data-amode]').forEach(function(b){b.classList.toggle('active',b.dataset.amode===c.auto_mode);});
  if(c.time_mode)setTimeMode(c.time_mode);
  ['btn-pulse-toggle','btn-auto-toggle'].forEach(function(id){var b=document.getElementById(id);if(b&&b._update)b._update();});
}
function renderPresetList(){
  var list=document.getElementById('preset-list');if(!list)return;var presets=loadPresets(),names=Object.keys(presets);list.innerHTML='';
  if(!names.length){list.innerHTML='<div style="color:#2a2a2a;font-size:10px;padding:4px 0">Aucun preset</div>';return;}
  names.forEach(function(name){
    var row=document.createElement('div');row.className='preset-row';
    var nb=document.createElement('span');nb.className='preset-name-lbl'+(name===activePresetName?' cur':'');nb.textContent=name;
    var lb=document.createElement('button');lb.className='preset-btn';lb.textContent='▶';lb.title='Charger';lb.addEventListener('click',function(){var fresh=loadPresets();if(!fresh[name])return;activePresetName=name;var pni=document.getElementById('preset-name-inp');if(pni)pni.value=name;applySnapshot(fresh[name]);renderPresetList();lb.textContent='✔';setTimeout(function(){lb.textContent='▶';},1200);});
    var db=document.createElement('button');db.className='preset-btn del';db.textContent='✕';db.addEventListener('click',function(e){e.stopPropagation();if(!confirm('Supprimer "'+name+'" ?'))return;var fresh=loadPresets();delete fresh[name];savePresets(fresh);if(activePresetName===name)activePresetName=null;renderPresetList();});
    row.appendChild(nb);row.appendChild(lb);row.appendChild(db);list.appendChild(row);
  });
}
(function(){var i=document.getElementById('preset-name-inp');if(i)i.addEventListener('input',function(){renderPresetList();});})();
(function(){var b=document.getElementById('btn-save-preset');if(!b)return;b.addEventListener('click',function(){var name=document.getElementById('preset-name-inp').value.trim();if(!name)return;var presets=loadPresets();if(presets[name]&&!confirm('"'+name+'" existe. Écraser ?'))return;presets[name]=cfgSnapshot();savePresets(presets);activePresetName=name;renderPresetList();});})();
(function(){var b=document.getElementById('btn-overwrite-preset');if(!b)return;b.addEventListener('click',function(){var name=document.getElementById('preset-name-inp').value.trim();if(!name)return;var presets=loadPresets();presets[name]=cfgSnapshot();savePresets(presets);activePresetName=name;renderPresetList();});})();
(function(){var b=document.getElementById('btn-export');if(b)b.addEventListener('click',function(){var a=document.createElement('a');a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(loadPresets(),null,2));a.download='super-presets.json';a.click();});})();
(function(){var b=document.getElementById('btn-import');if(b)b.addEventListener('click',function(){document.getElementById('import-file').click();});var f=document.getElementById('import-file');if(f)f.addEventListener('change',function(){var file=this.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(e){try{var imp=JSON.parse(e.target.result);if(typeof imp!=='object')throw 0;var ex=loadPresets(),count=0;Object.keys(imp).forEach(function(k){ex[k]=imp[k];count++;});savePresets(ex);renderPresetList();alert(count+' preset(s) importé(s)');}catch(err){alert('JSON invalide');}};reader.readAsText(file);this.value='';});})();
renderPresetList();

/* ═══════════════════════════════════════════
   2D POST-PROCESS
═══════════════════════════════════════════ */
var _ppBuf=null;
function getPPBuf(w,h){if(!_ppBuf||_ppBuf.width!==w||_ppBuf.height!==h){_ppBuf=document.createElement('canvas');_ppBuf.width=w;_ppBuf.height=h;}return _ppBuf;}
function applyKaleidoscope(canvas,ctx){var W=canvas.width,H=canvas.height,cx=W/2,cy=H/2,N=Math.max(2,FluidSim.cfg.kaleid_segments),baseAngle=FluidSim.cfg.kaleid_angle*Math.PI/180,segAngle=Math.PI*2/N,maxR=Math.sqrt(W*W+H*H),buf=getPPBuf(W,H),bc=buf.getContext('2d');bc.clearRect(0,0,W,H);bc.drawImage(canvas,0,0);ctx.fillStyle=FluidSim.cfg.bg_color;ctx.fillRect(0,0,W,H);for(var i=0;i<N;i++){ctx.save();ctx.translate(cx,cy);ctx.rotate(baseAngle+i*segAngle);if(i%2===1)ctx.scale(1,-1);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,maxR,0,i%2===1?-segAngle:segAngle,i%2===1);ctx.closePath();ctx.clip();ctx.drawImage(buf,-cx,-cy);ctx.restore();}}
function applyMirror(canvas,ctx,mode){var W=canvas.width,H=canvas.height,buf=getPPBuf(W,H),bc=buf.getContext('2d');bc.clearRect(0,0,W,H);bc.drawImage(canvas,0,0);if(mode==='H'||mode==='quad'){ctx.save();ctx.beginPath();ctx.rect(W/2,0,W/2,H);ctx.clip();ctx.translate(W,0);ctx.scale(-1,1);ctx.drawImage(buf,0,0);ctx.restore();}if(mode==='V'||mode==='quad'){ctx.save();ctx.beginPath();ctx.rect(0,H/2,W,H/2);ctx.clip();ctx.translate(0,H);ctx.scale(1,-1);ctx.drawImage(buf,0,0);ctx.restore();}}
function applyPixelSort(canvas,ctx){var W=canvas.width,H=canvas.height,imageData=ctx.getImageData(0,0,W,H),data=imageData.data,thr=FluidSim.cfg.pixsort_threshold*255,cols=Math.max(1,Math.floor(W*FluidSim.cfg.pixsort_coverage/100)),dir=FluidSim.cfg.pixsort_direction;for(var ci=0;ci<cols;ci++){var col=Math.floor(Math.random()*W),start=-1,end=-1;for(var row=0;row<H;row++){var idx=(row*W+col)*4,lum=0.299*data[idx]+0.587*data[idx+1]+0.114*data[idx+2];if(lum>thr){if(start<0)start=row;end=row;}else if(start>=0){sortSegPx(data,W,col,start,end,dir);start=-1;end=-1;}}if(start>=0)sortSegPx(data,W,col,start,end,dir);}ctx.putImageData(imageData,0,0);}
function sortSegPx(data,W,col,start,end,dir){if(end<=start)return;var px=[];for(var r=start;r<=end;r++){var i=(r*W+col)*4;px.push([data[i],data[i+1],data[i+2],data[i+3]]);}px.sort(function(a,b){var la=0.299*a[0]+0.587*a[1]+0.114*a[2],lb=0.299*b[0]+0.587*b[1]+0.114*b[2];return dir==='up'?la-lb:lb-la;});for(var k=0;k<px.length;k++){var i=((start+k)*W+col)*4;data[i]=px[k][0];data[i+1]=px[k][1];data[i+2]=px[k][2];data[i+3]=px[k][3];}}
window.pp2d=function(){var c=FluidSim.cfg,canvas=document.getElementById('c'),ctx2=canvas.getContext('2d');if(c.pixsort_enabled)applyPixelSort(canvas,ctx2);if(c.mirror_mode!=='off')applyMirror(canvas,ctx2,c.mirror_mode);if(c.kaleid_enabled)applyKaleidoscope(canvas,ctx2);};

/* ═══════════════════════════════════════════
   FX CHAIN ENGINE
═══════════════════════════════════════════ */
var FX_TYPES={
  brightness:{name:'BRIGHTNESS',icon:'☀',params:{brightness:{default:0,min:-1,max:1,step:.01,label:'Lumière'},contrast:{default:1,min:.1,max:3,step:.05,label:'Contraste'}}},
  color:{name:'COULEUR HSV',icon:'◐',params:{hue:{default:0,min:0,max:1,step:.01,label:'Teinte'},sat:{default:1,min:0,max:3,step:.05,label:'Saturation'},val:{default:1,min:0,max:3,step:.05,label:'Valeur'}}},
  blur:{name:'FLOU',icon:'◌',params:{radius:{default:2,min:.5,max:20,step:.5,label:'Rayon'}}},
  bloom:{name:'BLOOM',icon:'✦',params:{threshold:{default:.25,min:0,max:1,step:.01,label:'Seuil'},strength:{default:2,min:0,max:8,step:.1,label:'Force'}}},
  chroma:{name:'CHROMA ABR.',icon:'⫠',params:{amount:{default:3,min:0,max:20,step:.1,label:'Force'}}},
  feedback:{name:'FEEDBACK',icon:'⟳',params:{alpha:{default:.85,min:0,max:.98,step:.01,label:'Alpha'},zoom:{default:1.003,min:.98,max:1.02,step:.001,label:'Zoom'}}},
  pixelate:{name:'PIXELATE',icon:'▦',params:{size:{default:64,min:4,max:320,step:4,label:'Taille'}}},
  invert:{name:'INVERT',icon:'◑',params:{amount:{default:1,min:0,max:1,step:.01,label:'Quantité'}}},
  vignette:{name:'VIGNETTE',icon:'◉',params:{radius:{default:.65,min:.1,max:1.2,step:.01,label:'Rayon'},softness:{default:.4,min:.01,max:.9,step:.01,label:'Douceur'}}},
  grain:{name:'GRAIN',icon:'⁚',params:{amount:{default:.07,min:0,max:.5,step:.005,label:'Intensité'}}},
  tint:{name:'TEINTURE',icon:'▣',params:{tint:{default:'#ff4400',type:'color',label:'Couleur'},amount:{default:.6,min:0,max:1,step:.01,label:'Quantité'}}},
  edge:{name:'CONTOURS',icon:'⌇',params:{strength:{default:3,min:.1,max:12,step:.1,label:'Force'}}},
  threshold:{name:'SEUIL',icon:'⬛',params:{level:{default:.45,min:0,max:1,step:.01,label:'Niveau'},softness:{default:.06,min:0,max:.4,step:.01,label:'Douceur'}}},
  warp:{name:'WARP',icon:'⌀',params:{amount:{default:.3,min:-2,max:2,step:.01,label:'Distorsion'}}},
  mirror:{name:'MIROIR',icon:'⇔',params:{horiz:{default:1,min:0,max:1,step:1,label:'Horizontal'},vert:{default:0,min:0,max:1,step:1,label:'Vertical'}}},
  eevee:{name:'BLOOM HALO',icon:'✧',params:{threshold:{default:.55,min:0,max:1,step:.01,label:'Seuil'},knee:{default:.3,min:.01,max:.8,step:.01,label:'Courbe'},strength:{default:4,min:0,max:15,step:.1,label:'Force'},radius:{default:1,min:0,max:2,step:.01,label:'Rayon'}}}
};
/* Add opacity to every effect */
Object.keys(FX_TYPES).forEach(function(k){FX_TYPES[k].params.opacity={default:1,min:0,max:1,step:.01,label:'Opacité'};});
window.FXCHAIN=[];
var _fxIdCtr=0;

/* ═══════════════════════════════════════════
   MIDI LEARN PER-PARAM
═══════════════════════════════════════════ */
window._mlActive=null;       // {btn, applyFn, id}
window._mlBindings={};       // cc# → {applyFn, btn, id}
var _ML_LS='vj_ml_bindings'; // localStorage key

function _mlSave(){
  var s={};
  Object.keys(window._mlBindings).forEach(function(cc){s[cc]=window._mlBindings[cc].id;});
  try{localStorage.setItem(_ML_LS,JSON.stringify(s));}catch(e){}
}

window.makeMidiBtn=function(applyFn,id){
  var btn=document.createElement('button');
  btn.className='midi-btn';btn.title='MIDI Learn';btn.textContent='MIDI';btn.dataset.midiId=id;
  // If already bound, show CC number in green
  Object.keys(window._mlBindings).forEach(function(cc){
    if(window._mlBindings[cc].id===id){btn.textContent='CC'+cc;btn.classList.add('bound');}
  });
  btn.addEventListener('click',function(e){
    e.stopPropagation();e.preventDefault();
    if(window._mlActive&&window._mlActive.btn===btn){
      btn.classList.remove('learning');btn.textContent='MIDI';window._mlActive=null;
    } else {
      if(window._mlActive){window._mlActive.btn.classList.remove('learning');window._mlActive.btn.textContent='MIDI';}
      window._mlActive={btn:btn,applyFn:applyFn,id:id};
      btn.textContent='LEARN';btn.classList.add('learning');
    }
  });
  return btn;
};

window.addMidiBtnToSlider=function(slider){
  if(slider.dataset.midiDone)return;
  slider.dataset.midiDone='1';
  if(!slider.id)slider.id='ml-'+(Math.random().toString(36).slice(2));
  var sid=slider.id;
  var applyFn=function(v){
    var mn=parseFloat(slider.min)||0,mx=parseFloat(slider.max)||1;
    var val=mn+(mx-mn)*v;
    var st=parseFloat(slider.step);if(st>0)val=Math.round(val/st)*st;
    slider.value=val;
    slider.dispatchEvent(new Event('input',{bubbles:true}));
  };
  var btn=window.makeMidiBtn(applyFn,sid);
  slider.style.cssText=(slider.style.cssText||'')+'flex:1;min-width:0;';
  var row=document.createElement('div');
  row.style.cssText='display:flex;align-items:center;gap:4px';
  slider.parentNode.insertBefore(row,slider);
  row.appendChild(slider);
  row.appendChild(btn);
  // Restore saved binding if any
  var saved=window._mlSavedIds||{};
  Object.keys(saved).forEach(function(cc){
    if(saved[cc]===sid){
      window._mlBindings[cc]={applyFn:applyFn,btn:btn,id:sid};
      btn.textContent='CC'+cc;btn.classList.add('bound');
    }
  });
};

window.addMidiBtnToTrigger=function(triggerBtn){
  if(triggerBtn.dataset.midiDone)return;
  triggerBtn.dataset.midiDone='1';
  if(!triggerBtn.id)triggerBtn.id='ml-trig-'+(Math.random().toString(36).slice(2));
  var tid=triggerBtn.id;
  var applyFn=function(v){if(v>0.5)triggerBtn.dispatchEvent(new Event('click',{bubbles:true}));};
  var btn=window.makeMidiBtn(applyFn,tid);
  btn.style.fontSize='8px';btn.style.padding='1px 3px';
  triggerBtn.parentNode.insertBefore(btn,triggerBtn.nextSibling);
  // Restore saved binding if any
  var saved=window._mlSavedIds||{};
  Object.keys(saved).forEach(function(cc){
    if(saved[cc]===tid){
      window._mlBindings[cc]={applyFn:applyFn,btn:btn,id:tid};
      btn.textContent='CC'+cc;btn.classList.add('bound');
    }
  });
};
function fxAdd(type,phase){
  var def=FX_TYPES[type];if(!def)return null;
  var p={};Object.keys(def.params).forEach(function(k){p[k]=def.params[k].default;});
  var e={id:_fxIdCtr++,type:type,enabled:true,phase:phase||'post',params:p};
  FXCHAIN.push(e);fxRenderUI();fxRenderChips();return e;
}
function fxRemove(id){FXCHAIN=FXCHAIN.filter(function(e){return e.id!==id;});fxRenderUI();fxRenderChips();}
function fxMove(id,dir){
  var i=FXCHAIN.findIndex(function(e){return e.id===id;});
  var j=i+dir;if(i<0||j<0||j>=FXCHAIN.length)return;
  var t=FXCHAIN[i];FXCHAIN[i]=FXCHAIN[j];FXCHAIN[j]=t;fxRenderUI();
}
function fxRenderChips(){
  var el=document.getElementById('fx-chain-slots');if(!el)return;
  el.innerHTML='';
  FXCHAIN.forEach(function(e){
    var b=document.createElement('button');
    b.className='fx-chip'+(e.enabled?' on':'');
    b.textContent=(FX_TYPES[e.type]&&FX_TYPES[e.type].icon||'')+(e.phase==='pre'?' PRE':' POST');
    b.title=(FX_TYPES[e.type]&&FX_TYPES[e.type].name||e.type);
    b.addEventListener('click',function(){e.enabled=!e.enabled;fxRenderUI();fxRenderChips();});
    el.appendChild(b);
  });
}
function fxRenderUI(){
  var list=document.getElementById('fx-chain-list');if(!list)return;
  list.innerHTML='';
  FXCHAIN.forEach(function(e){
    var def=FX_TYPES[e.type];if(!def)return;
    var slot=document.createElement('div');slot.className='fx-slot';
    // header
    var hdr=document.createElement('div');hdr.className='fx-slot-hdr';
    var onBtn=document.createElement('div');onBtn.className='fx-on'+(e.enabled?' on':'');
    onBtn.addEventListener('click',function(){e.enabled=!e.enabled;fxRenderUI();fxRenderChips();});
    var nameEl=document.createElement('span');nameEl.className='fx-slot-name';nameEl.textContent=(def.icon||'')+' '+def.name;
    // phase toggle
    var preBtn=document.createElement('button');preBtn.className='fx-pre'+(e.phase==='pre'?' sel':'');preBtn.textContent='PRE';
    var postBtn=document.createElement('button');postBtn.className='fx-post'+(e.phase==='post'?' sel':'');postBtn.textContent='POST';
    preBtn.addEventListener('click',function(){e.phase='pre';fxRenderUI();fxRenderChips();});
    postBtn.addEventListener('click',function(){e.phase='post';fxRenderUI();fxRenderChips();});
    // move/del/expand
    var upBtn=document.createElement('button');upBtn.className='fx-mv';upBtn.textContent='↑';upBtn.addEventListener('click',function(){fxMove(e.id,-1);});
    var dnBtn=document.createElement('button');dnBtn.className='fx-mv';dnBtn.textContent='↓';dnBtn.addEventListener('click',function(){fxMove(e.id,1);});
    var delBtn=document.createElement('button');delBtn.className='fx-del';delBtn.textContent='✕';delBtn.addEventListener('click',function(){fxRemove(e.id);});
    var params=document.createElement('div');params.className='fx-params';params.style.display='none';
    nameEl.style.cursor='pointer';
    nameEl.addEventListener('click',function(){var open=params.style.display==='block';params.style.display=open?'none':'block';nameEl.style.color=open?'':'var(--accent)';});
    // params
    Object.keys(def.params).forEach(function(k){
      var pd=def.params[k];
      var row=document.createElement('div');row.className='ctrl';
      if(pd.type==='color'){
        row.innerHTML='<label style="margin-bottom:3px">'+pd.label+'</label>';
        var cp=document.createElement('input');cp.type='color';cp.value=e.params[k];
        cp.style.cssText='width:100%;height:22px;border:1px solid #2a2a2a;border-radius:3px;background:none;cursor:pointer;padding:1px';
        cp.addEventListener('input',function(){e.params[k]=this.value;});
        row.appendChild(cp);
      } else {
        var valSpan='<span class="val" style="font-size:9px">'+parseFloat(e.params[k]).toFixed(pd.step<.01?3:pd.step<.1?2:1)+'</span>';
        row.innerHTML='<label>'+pd.label+' '+valSpan+'</label>';
        var sl=document.createElement('input');sl.type='range';sl.min=pd.min;sl.max=pd.max;sl.step=pd.step;sl.value=e.params[k];
        sl.addEventListener('input',function(){
          e.params[k]=parseFloat(this.value);
          var sp=row.querySelector('.val');if(sp)sp.textContent=parseFloat(this.value).toFixed(pd.step<.01?3:pd.step<.1?2:1);
        });
        // Wrap slider + MIDI button in a flex row
        var midiId='fx-'+e.id+'-'+k;
        var midiApply=(function(s,pd2,ek){return function(v){
          var val=pd2.min+(pd2.max-pd2.min)*v;
          var st=pd2.step;if(st>0)val=Math.round(val/st)*st;
          s.value=val;e.params[ek]=val;
          var sp=row.querySelector('.val');if(sp)sp.textContent=parseFloat(val).toFixed(st<.01?3:st<.1?2:1);
        };})(sl,pd,k);
        var slRow=document.createElement('div');
        slRow.style.cssText='display:flex;align-items:center;gap:4px';
        sl.style.cssText='flex:1;min-width:0';
        slRow.appendChild(sl);
        slRow.appendChild(window.makeMidiBtn(midiApply,midiId));
        row.appendChild(slRow);
      }
      params.appendChild(row);
    });
    hdr.appendChild(onBtn);hdr.appendChild(nameEl);hdr.appendChild(preBtn);hdr.appendChild(postBtn);
    hdr.appendChild(upBtn);hdr.appendChild(dnBtn);hdr.appendChild(delBtn);
    slot.appendChild(hdr);slot.appendChild(params);
    list.appendChild(slot);
  });
}
/* FX ENGINE — ping-pong WebGL */
var FXEngine=(function(){
  var gl,glCanvas,_vb,_vsShader,_progs={},_W=0,_H=0,_t=0;
  var _tex=[null,null,null],_fb=[null,null,null],_prevTex=null,_cur=0;
  var VS='attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0,1);}';
  var FS={
    brightness:'precision mediump float;uniform sampler2D u_tex;uniform float u_brightness,u_contrast;varying vec2 v_uv;void main(){vec4 c=texture2D(u_tex,v_uv);c.rgb=(c.rgb-.5)*u_contrast+.5+u_brightness;gl_FragColor=vec4(clamp(c.rgb,0.,1.),1.);}',
    color:'precision mediump float;uniform sampler2D u_tex;uniform float u_hue,u_sat,u_val;varying vec2 v_uv;vec3 r2h(vec3 c){float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),d=mx-mn,h=0.,s=mx<.001?0.:d/mx;if(d>.001){if(mx==c.r)h=mod((c.g-c.b)/d,6.);else if(mx==c.g)h=(c.b-c.r)/d+2.;else h=(c.r-c.g)/d+4.;h/=6.;}return vec3(h,s,mx);}vec3 h2r(vec3 c){float h=c.x*6.,i=floor(h),f=h-i,p=c.z*(1.-c.y),q=c.z*(1.-c.y*f),t=c.z*(1.-c.y*(1.-f));if(i<1.)return vec3(c.z,t,p);if(i<2.)return vec3(q,c.z,p);if(i<3.)return vec3(p,c.z,t);if(i<4.)return vec3(p,q,c.z);if(i<5.)return vec3(t,p,c.z);return vec3(c.z,p,q);}void main(){vec4 col=texture2D(u_tex,v_uv);vec3 h=r2h(col.rgb);h.x=fract(h.x+u_hue);h.y=clamp(h.y*u_sat,0.,1.);h.z=clamp(h.z*u_val,0.,1.);gl_FragColor=vec4(h2r(h),1.);}',
    blur:'precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_radius;varying vec2 v_uv;void main(){vec2 px=u_radius/u_res;vec4 c=vec4(0.);float w=0.;for(int i=-3;i<=3;i++)for(int j=-3;j<=3;j++){float g=exp(-float(i*i+j*j)/4.);c+=texture2D(u_tex,clamp(v_uv+vec2(float(i),float(j))*px,0.,1.))*g;w+=g;}gl_FragColor=c/w;}',
    bloom:'precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_threshold,u_strength;varying vec2 v_uv;void main(){vec4 col=texture2D(u_tex,v_uv);vec3 b=vec3(0.);float tw=0.;vec2 px=1./u_res;for(int i=-5;i<=5;i++){for(int j=-5;j<=5;j++){float g=exp(-float(i*i+j*j)/10.);vec2 off=vec2(float(i)*px.x*3.,float(j)*px.y*3.);vec3 s=texture2D(u_tex,clamp(v_uv+off,0.,1.)).rgb;float lum=dot(s,vec3(.299,.587,.114));float w2=smoothstep(u_threshold-.08,u_threshold+.08,lum)*g;b+=s*w2;tw+=w2+.0001;}};col.rgb=clamp(col.rgb+b/tw*u_strength,0.,1.);gl_FragColor=vec4(col.rgb,1.);}',
    chroma:'precision mediump float;uniform sampler2D u_tex;uniform float u_amount;varying vec2 v_uv;void main(){vec2 d=(v_uv-.5)*u_amount*.008;float r=texture2D(u_tex,clamp(v_uv+d,0.,1.)).r;float g=texture2D(u_tex,v_uv).g;float b=texture2D(u_tex,clamp(v_uv-d,0.,1.)).b;gl_FragColor=vec4(r,g,b,1.);}',
    feedback:'precision mediump float;uniform sampler2D u_tex,u_prev;uniform float u_alpha,u_zoom;varying vec2 v_uv;void main(){vec4 cur=texture2D(u_tex,v_uv);vec2 fuv=(v_uv-.5)/u_zoom+.5;vec4 prev=(fuv.x>=0.&&fuv.x<=1.&&fuv.y>=0.&&fuv.y<=1.)?texture2D(u_prev,fuv):vec4(0.);gl_FragColor=vec4(mix(cur.rgb,prev.rgb,u_alpha),1.);}',
    pixelate:'precision mediump float;uniform sampler2D u_tex;uniform float u_size;varying vec2 v_uv;void main(){vec2 uv=floor(v_uv*u_size)/u_size+.5/u_size;gl_FragColor=texture2D(u_tex,clamp(uv,0.,1.));}',
    invert:'precision mediump float;uniform sampler2D u_tex;uniform float u_amount;varying vec2 v_uv;void main(){vec4 c=texture2D(u_tex,v_uv);gl_FragColor=vec4(mix(c.rgb,1.-c.rgb,u_amount),1.);}',
    vignette:'precision mediump float;uniform sampler2D u_tex;uniform float u_radius,u_softness;varying vec2 v_uv;void main(){vec4 c=texture2D(u_tex,v_uv);float d=length(v_uv-.5)*1.42;float v=smoothstep(u_radius,u_radius-u_softness,d);gl_FragColor=vec4(c.rgb*v,1.);}',
    grain:'precision mediump float;uniform sampler2D u_tex;uniform float u_amount,u_time;varying vec2 v_uv;float rnd(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 c=texture2D(u_tex,v_uv);float n=rnd(v_uv+u_time)*2.-1.;gl_FragColor=vec4(clamp(c.rgb+n*u_amount,0.,1.),1.);}',
    tint:'precision mediump float;uniform sampler2D u_tex;uniform vec3 u_tint;uniform float u_amount;varying vec2 v_uv;void main(){vec4 c=texture2D(u_tex,v_uv);float lum=dot(c.rgb,vec3(.299,.587,.114));gl_FragColor=vec4(mix(c.rgb,lum*u_tint,u_amount),1.);}',
    edge:'precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_strength;varying vec2 v_uv;void main(){vec2 p=1./u_res;vec3 lm=vec3(.299,.587,.114);float tl=dot(texture2D(u_tex,v_uv+vec2(-p.x,p.y)).rgb,lm),t=dot(texture2D(u_tex,v_uv+vec2(0.,p.y)).rgb,lm),tr=dot(texture2D(u_tex,v_uv+vec2(p.x,p.y)).rgb,lm),l=dot(texture2D(u_tex,v_uv-p).rgb,lm),r=dot(texture2D(u_tex,v_uv+vec2(p.x,0.)).rgb,lm),bl=dot(texture2D(u_tex,v_uv+vec2(-p.x,-p.y)).rgb,lm),b=dot(texture2D(u_tex,v_uv+vec2(0.,-p.y)).rgb,lm),br=dot(texture2D(u_tex,v_uv+p).rgb,lm);float gx=-tl-2.*l-bl+tr+2.*r+br,gy=tl+2.*t+tr-bl-2.*b-br;gl_FragColor=vec4(vec3(clamp(sqrt(gx*gx+gy*gy)*u_strength,0.,1.)),1.);}',
    threshold:'precision mediump float;uniform sampler2D u_tex;uniform float u_level,u_softness;varying vec2 v_uv;void main(){vec4 c=texture2D(u_tex,v_uv);float lum=dot(c.rgb,vec3(.299,.587,.114));float t=smoothstep(u_level-u_softness,u_level+u_softness,lum);gl_FragColor=vec4(c.rgb*t,1.);}',
    warp:'precision mediump float;uniform sampler2D u_tex;uniform float u_amount;varying vec2 v_uv;void main(){vec2 uv=v_uv-.5;float d=length(uv);vec2 w=.5+uv*(1.+u_amount*d*d);if(w.x<0.||w.x>1.||w.y<0.||w.y>1.){gl_FragColor=vec4(0.,0.,0.,1.);return;}gl_FragColor=texture2D(u_tex,w);}',
    mirror:'precision mediump float;uniform sampler2D u_tex;uniform float u_horiz,u_vert;varying vec2 v_uv;void main(){vec2 uv=v_uv;if(u_horiz>.5&&uv.x>.5)uv.x=1.-uv.x;if(u_vert>.5&&uv.y>.5)uv.y=1.-uv.y;gl_FragColor=texture2D(u_tex,uv);}',
    eevee:'_multipass'
  };
  function mkS(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s;}
  function getProg(type){
    if(_progs[type])return _progs[type];
    var src=FS[type];if(!src)return null;
    var p=gl.createProgram();gl.attachShader(p,_vsShader);gl.attachShader(p,mkS(gl.FRAGMENT_SHADER,src));gl.linkProgram(p);
    gl.useProgram(p);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var loc=gl.getAttribLocation(p,'a_pos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    _progs[type]=p;return p;
  }
  function mkTex(W,H){var t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;}
  function mkFB(t){var fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return fb;}
  function ensureSize(W,H){
    if(_W===W&&_H===H)return;_W=W;_H=H;
    glCanvas.width=W;glCanvas.height=H;gl.viewport(0,0,W,H);
    if(_tex[0])gl.deleteTexture(_tex[0]);if(_tex[1])gl.deleteTexture(_tex[1]);if(_tex[2])gl.deleteTexture(_tex[2]);
    if(_fb[0])gl.deleteFramebuffer(_fb[0]);if(_fb[1])gl.deleteFramebuffer(_fb[1]);if(_fb[2])gl.deleteFramebuffer(_fb[2]);
    _tex[0]=mkTex(W,H);_tex[1]=mkTex(W,H);_tex[2]=mkTex(W,H);
    _fb[0]=mkFB(_tex[0]);_fb[1]=mkFB(_tex[1]);_fb[2]=mkFB(_tex[2]);
    if(_prevTex)gl.deleteTexture(_prevTex);_prevTex=mkTex(W,H);
  }
  function setTex(unit,t){gl.activeTexture(unit===0?gl.TEXTURE0:gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,t);}
  function u(p,name){return gl.getUniformLocation(p,name);}
  function hexRGB(hex){var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return[r,g,b];}
  function applyEffect(fx,W,H){
    var p=fx.params,t=_t;
    /* ── Bloom : separable 2-pass ── */
    if(fx.type==='bloom'){
      var origTex=_tex[_cur];
      // Pass 1 : extract bright + horizontal Gaussian blur
      var ph=getProg('_bloom_h');
      if(!ph){
        var fh='precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_thr;varying vec2 v_uv;void main(){vec3 b=vec3(0.);float tw=0.;float px=1./u_res.x;for(int i=-6;i<=6;i++){float g=exp(-float(i*i)/9.);vec3 s=texture2D(u_tex,clamp(v_uv+vec2(float(i)*px,0.),0.,1.)).rgb;float bright=smoothstep(u_thr-.06,u_thr+.06,dot(s,vec3(.299,.587,.114)));b+=s*bright*g;tw+=g;}gl_FragColor=vec4(b/tw,1.);}';
        var bp=gl.createProgram();gl.attachShader(bp,_vsShader);gl.attachShader(bp,mkS(gl.FRAGMENT_SHADER,fh));gl.linkProgram(bp);
        gl.useProgram(bp);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var la=gl.getAttribLocation(bp,'a_pos');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
        _progs['_bloom_h']=bp;ph=bp;
      }
      // Pass 1 → _fb[2] (dedicated bloom intermediate, no conflict)
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[2]);gl.viewport(0,0,W,H);
      gl.useProgram(ph);setTex(0,origTex);gl.uniform1i(u(ph,'u_tex'),0);
      gl.uniform2f(u(ph,'u_res'),W,H);gl.uniform1f(u(ph,'u_thr'),p.threshold);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      // Pass 2 : vertical blur + composite — reads origTex + _tex[2], writes _fb[1-_cur]
      var pv=getProg('_bloom_v');
      if(!pv){
        var fv='precision mediump float;uniform sampler2D u_orig,u_bh;uniform vec2 u_res;uniform float u_str;varying vec2 v_uv;void main(){vec3 b=vec3(0.);float tw=0.001;float py=1./u_res.y;for(int j=-6;j<=6;j++){float g=exp(-float(j*j)/9.);b+=texture2D(u_bh,clamp(v_uv+vec2(0.,float(j)*py),0.,1.)).rgb*g;tw+=g;}vec4 orig=texture2D(u_orig,v_uv);gl_FragColor=vec4(clamp(orig.rgb+b/tw*u_str,0.,1.),1.);}';
        var bp2=gl.createProgram();gl.attachShader(bp2,_vsShader);gl.attachShader(bp2,mkS(gl.FRAGMENT_SHADER,fv));gl.linkProgram(bp2);
        gl.useProgram(bp2);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var la2=gl.getAttribLocation(bp2,'a_pos');gl.enableVertexAttribArray(la2);gl.vertexAttribPointer(la2,2,gl.FLOAT,false,0,0);
        _progs['_bloom_v']=bp2;pv=bp2;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[1-_cur]);gl.viewport(0,0,W,H);
      gl.useProgram(pv);setTex(0,origTex);gl.uniform1i(u(pv,'u_orig'),0);
      setTex(1,_tex[2]);gl.uniform1i(u(pv,'u_bh'),1);
      gl.uniform2f(u(pv,'u_res'),W,H);gl.uniform1f(u(pv,'u_str'),p.strength);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      _cur=1-_cur;
      return;
    }
    /* ── EEVEE Bloom : dual-Kawase 3-pass + composite ── */
    if(fx.type==='eevee'){
      var origTex=_tex[_cur];
      // Build internal shaders once
      function eeveeShader(name,src){
        if(_progs[name])return _progs[name];
        var bp=gl.createProgram();gl.attachShader(bp,_vsShader);gl.attachShader(bp,mkS(gl.FRAGMENT_SHADER,src));gl.linkProgram(bp);
        gl.useProgram(bp);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var la=gl.getAttribLocation(bp,'a_pos');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
        _progs[name]=bp;return bp;
      }
      // Extract bright with EEVEE soft-knee
      var pe=eeveeShader('_ev_ext','precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_thr,u_knee,u_rad;varying vec2 v_uv;vec3 extr(vec2 uv){vec3 c=texture2D(u_tex,clamp(uv,0.,1.)).rgb;float l=dot(c,vec3(.299,.587,.114));float k=u_knee+.001;float rq=clamp(l-u_thr+k,0.,2.*k);return c*max(rq*rq/(4.*k),l-u_thr)/max(l,.001);}void main(){vec2 px=u_rad*.5/u_res;vec3 b=extr(v_uv)+extr(v_uv+vec2(px.x,px.y))+extr(v_uv+vec2(-px.x,px.y))+extr(v_uv+vec2(px.x,-px.y))+extr(v_uv+vec2(-px.x,-px.y));gl_FragColor=vec4(b/5.,1.);}');
      // Kawase blur pass (offset in pixels)
      var pk=eeveeShader('_ev_kaw','precision mediump float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_off;varying vec2 v_uv;void main(){vec2 px=(u_off+.5)/u_res;vec3 b=texture2D(u_tex,v_uv).rgb+texture2D(u_tex,clamp(v_uv+vec2(px.x,px.y),0.,1.)).rgb+texture2D(u_tex,clamp(v_uv+vec2(-px.x,px.y),0.,1.)).rgb+texture2D(u_tex,clamp(v_uv+vec2(px.x,-px.y),0.,1.)).rgb+texture2D(u_tex,clamp(v_uv+vec2(-px.x,-px.y),0.,1.)).rgb;gl_FragColor=vec4(b/5.,1.);}');
      // Composite: original + bloom
      var pc=eeveeShader('_ev_cmp','precision mediump float;uniform sampler2D u_orig,u_bloom;uniform float u_str;varying vec2 v_uv;void main(){vec3 col=texture2D(u_orig,v_uv).rgb;vec3 bl=texture2D(u_bloom,v_uv).rgb;gl_FragColor=vec4(clamp(col+bl*u_str,0.,1.),1.);}');
      var rad=p.radius;
      // Pass 1 (extract) : origTex → _fb[2]
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[2]);gl.viewport(0,0,W,H);
      gl.useProgram(pe);setTex(0,origTex);gl.uniform1i(u(pe,'u_tex'),0);
      gl.uniform2f(u(pe,'u_res'),W,H);gl.uniform1f(u(pe,'u_thr'),p.threshold);gl.uniform1f(u(pe,'u_knee'),p.knee);gl.uniform1f(u(pe,'u_rad'),rad);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      // Pass 2 (Kawase ×1) : _tex[2] → _fb[1-_cur]
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[1-_cur]);gl.viewport(0,0,W,H);
      gl.useProgram(pk);setTex(0,_tex[2]);gl.uniform1i(u(pk,'u_tex'),0);
      gl.uniform2f(u(pk,'u_res'),W,H);gl.uniform1f(u(pk,'u_off'),rad);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      _cur=1-_cur;
      // Pass 3 (Kawase ×2) : _tex[_cur] → _fb[2]
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[2]);gl.viewport(0,0,W,H);
      gl.useProgram(pk);setTex(0,_tex[_cur]);gl.uniform1i(u(pk,'u_tex'),0);
      gl.uniform2f(u(pk,'u_res'),W,H);gl.uniform1f(u(pk,'u_off'),rad*2.);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      // Pass 4 (Kawase ×3) : _tex[2] → _fb[1-_cur]
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[1-_cur]);gl.viewport(0,0,W,H);
      gl.useProgram(pk);setTex(0,_tex[2]);gl.uniform1i(u(pk,'u_tex'),0);
      gl.uniform2f(u(pk,'u_res'),W,H);gl.uniform1f(u(pk,'u_off'),rad*3.);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      _cur=1-_cur;
      // Pass 5 (composite) : origTex + _tex[_cur] → _fb[2]
      gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[2]);gl.viewport(0,0,W,H);
      gl.useProgram(pc);setTex(0,origTex);gl.uniform1i(u(pc,'u_orig'),0);
      setTex(1,_tex[_cur]);gl.uniform1i(u(pc,'u_bloom'),1);
      gl.uniform1f(u(pc,'u_str'),p.strength);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      // Move result from _tex[2] into ping-pong: copy _tex[2] → _fb[1-_cur]
      var pb=getProg('_blit')||_progs['_blit'];
      if(pb){
        gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[1-_cur]);gl.viewport(0,0,W,H);
        gl.useProgram(pb);setTex(0,_tex[2]);gl.uniform1i(u(pb,'u_tex'),0);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        _cur=1-_cur;
      }
      return;
    }
    var prog=getProg(fx.type);if(!prog)return;
    var src=_tex[_cur],dst=_fb[1-_cur];
    gl.bindFramebuffer(gl.FRAMEBUFFER,dst);gl.viewport(0,0,W,H);
    gl.useProgram(prog);
    setTex(0,src);gl.uniform1i(u(prog,'u_tex'),0);
    gl.uniform2f(u(prog,'u_res'),W,H);
    if(fx.type==='brightness'){gl.uniform1f(u(prog,'u_brightness'),p.brightness);gl.uniform1f(u(prog,'u_contrast'),p.contrast);}
    else if(fx.type==='color'){gl.uniform1f(u(prog,'u_hue'),p.hue);gl.uniform1f(u(prog,'u_sat'),p.sat);gl.uniform1f(u(prog,'u_val'),p.val);}
    else if(fx.type==='blur'){gl.uniform1f(u(prog,'u_radius'),p.radius);}
    else if(fx.type==='chroma'){gl.uniform1f(u(prog,'u_amount'),p.amount);}
    else if(fx.type==='feedback'){
      setTex(1,_prevTex);gl.uniform1i(u(prog,'u_prev'),1);
      gl.uniform1f(u(prog,'u_alpha'),p.alpha);gl.uniform1f(u(prog,'u_zoom'),p.zoom);
    }
    else if(fx.type==='pixelate'){gl.uniform1f(u(prog,'u_size'),p.size);}
    else if(fx.type==='invert'){gl.uniform1f(u(prog,'u_amount'),p.amount);}
    else if(fx.type==='vignette'){gl.uniform1f(u(prog,'u_radius'),p.radius);gl.uniform1f(u(prog,'u_softness'),p.softness);}
    else if(fx.type==='grain'){gl.uniform1f(u(prog,'u_amount'),p.amount);gl.uniform1f(u(prog,'u_time'),t*.01);}
    else if(fx.type==='tint'){var rgb=hexRGB(p.tint||'#ffffff');gl.uniform3f(u(prog,'u_tint'),rgb[0],rgb[1],rgb[2]);gl.uniform1f(u(prog,'u_amount'),p.amount);}
    else if(fx.type==='edge'){gl.uniform1f(u(prog,'u_strength'),p.strength);}
    else if(fx.type==='threshold'){gl.uniform1f(u(prog,'u_level'),p.level);gl.uniform1f(u(prog,'u_softness'),p.softness);}
    else if(fx.type==='warp'){gl.uniform1f(u(prog,'u_amount'),p.amount);}
    else if(fx.type==='mirror'){gl.uniform1f(u(prog,'u_horiz'),p.horiz);gl.uniform1f(u(prog,'u_vert'),p.vert);}
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    _cur=1-_cur;
  }
  function initGL(){
    glCanvas=document.getElementById('gl-canvas');
    gl=glCanvas.getContext('webgl')||glCanvas.getContext('experimental-webgl');
    if(!gl)return;
    _vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,_vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    _vsShader=mkS(gl.VERTEX_SHADER,VS);
  }
  function apply(phase){
    if(!gl)return;
    var effects=FXCHAIN.filter(function(e){return e.enabled&&e.phase===phase;});
    if(!effects.length){glCanvas.style.display='none';return;}
    var mainCanvas=document.getElementById('c'),W=mainCanvas.width,H=mainCanvas.height;
    ensureSize(W,H);
    _t++;
    // Load main canvas into current ping-pong texture
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.bindTexture(gl.TEXTURE_2D,_tex[_cur]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mainCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    // Ensure blit prog exists before forEach (needed for opacity blend)
    function getBlitP(){
      if(_progs['_blit'])return _progs['_blit'];
      var fp='precision mediump float;uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}';
      var bp=gl.createProgram();gl.attachShader(bp,_vsShader);gl.attachShader(bp,mkS(gl.FRAGMENT_SHADER,fp));gl.linkProgram(bp);
      gl.useProgram(bp);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var la=gl.getAttribLocation(bp,'a_pos');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
      _progs['_blit']=bp;return bp;
    }
    // Apply each effect with optional opacity blend
    effects.forEach(function(fx){
      var beforeTex=_tex[_cur];
      applyEffect(fx,W,H);
      var opa=(fx.params.opacity!==undefined)?fx.params.opacity:1;
      if(opa<0.99){
        // Draw original on top of effect result using GL constant-alpha blend
        // result = original*(1-opa) + effect*opa
        var bp=getBlitP();
        gl.bindFramebuffer(gl.FRAMEBUFFER,_fb[_cur]);gl.viewport(0,0,W,H);
        gl.enable(gl.BLEND);
        gl.blendColor(0,0,0,1.-opa);
        gl.blendFunc(gl.CONSTANT_ALPHA,gl.ONE_MINUS_CONSTANT_ALPHA);
        gl.useProgram(bp);setTex(0,beforeTex);gl.uniform1i(u(bp,'u_tex'),0);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.disable(gl.BLEND);
      }
    });
    // Render final result to screen via gl-canvas overlay
    glCanvas.style.display='block';
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
    var blitProg=getProg('_blit');
    if(!blitProg){
      var fp='precision mediump float;uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}';
      var bp=gl.createProgram();gl.attachShader(bp,_vsShader);gl.attachShader(bp,mkS(gl.FRAGMENT_SHADER,fp));gl.linkProgram(bp);
      gl.useProgram(bp);gl.bindBuffer(gl.ARRAY_BUFFER,_vb);var loc=gl.getAttribLocation(bp,'a_pos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      _progs['_blit']=bp;blitProg=bp;
    }
    gl.useProgram(blitProg);setTex(0,_tex[_cur]);gl.uniform1i(u(blitProg,'u_tex'),0);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    // Save final result to _prevTex for feedback on next frame
    var hasFB=effects.some(function(e){return e.type==='feedback';});
    if(hasFB){gl.bindTexture(gl.TEXTURE_2D,_prevTex);gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.RGBA,0,0,W,H,0);}
    // Copy gl-canvas result back to main canvas so PRE effects persist
    if(phase==='pre'){var ctx=mainCanvas.getContext('2d');ctx.clearRect(0,0,W,H);ctx.drawImage(glCanvas,0,0,W,H);}
  }
  /* Legacy warp support for fluid pulse */
  window.glRender=function(warp){
    if(!gl||!(warp>0.001))return;
    var mainCanvas=document.getElementById('c'),W=mainCanvas.width,H=mainCanvas.height;
    ensureSize(W,H);
    var prog=getProg('warp');if(!prog)return;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.bindTexture(gl.TEXTURE_2D,_tex[_cur]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mainCanvas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
    gl.useProgram(prog);setTex(0,_tex[_cur]);gl.uniform1i(u(prog,'u_tex'),0);gl.uniform1f(u(prog,'u_amount'),-warp);gl.uniform2f(u(prog,'u_res'),W,H);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    glCanvas.style.display='block';
  };
  initGL();
  return{apply:apply};
})();
/* FX CATALOG UI */
(function(){
  var catGrid=document.getElementById('fx-cat-grid');
  var catalog=document.getElementById('fx-catalog');
  var addBtn=document.getElementById('fx-add-btn');
  if(catGrid){
    Object.keys(FX_TYPES).forEach(function(type){
      var def=FX_TYPES[type];
      var btn=document.createElement('button');btn.className='fx-cat-btn';
      btn.textContent=(def.icon||'')+' '+def.name;
      btn.addEventListener('click',function(){fxAdd(type,'post');catalog.style.display='none';});
      catGrid.appendChild(btn);
    });
  }
  if(addBtn&&catalog)addBtn.addEventListener('click',function(){catalog.style.display=catalog.style.display==='block'?'none':'block';});
})();

/* ═══════════════════════════════════════════
   MIDI CLOCK + PC + NOTE MAP
═══════════════════════════════════════════ */
var midiClockLast=0,midiClockBpmEma=0;
function executeNoteAction(action,vel){var vf=vel/127;if(action==='pulse')FluidSim.triggerPulseExt(FluidSim.cfg.pulse_strength*vf*2);else if(action==='auto_stroke')FluidSim.triggerAutoStroke();else if(action.startsWith('scene_load_')){var si=parseInt(action.replace('scene_load_',''));loadScene(si);}}
function renderNoteMapList(){var list=document.getElementById('note-map-list');if(!list)return;list.innerHTML='';var nm=FluidSim.cfg.note_map;if(!nm.length){list.innerHTML='<div style="color:#2a2a2a;font-size:10px;padding:2px 0">Aucun mapping</div>';return;}nm.forEach(function(e,i){var row=document.createElement('div');row.className='midi-map-row';row.innerHTML='<span style="color:#00ffff;min-width:36px">N'+e.note+'</span><span>→ '+e.action+'</span>';var rb=document.createElement('button');rb.className='preset-btn del';rb.textContent='✕';rb.addEventListener('click',function(){FluidSim.cfg.note_map.splice(i,1);renderNoteMapList();});row.appendChild(rb);list.appendChild(row);});}
renderNoteMapList();
(function(){var b=document.getElementById('btn-add-note');if(b)b.addEventListener('click',function(){var n=parseInt(document.getElementById('add-note-num').value),a=document.getElementById('add-note-action').value;if(isNaN(n)||n<0||n>127||!a)return;FluidSim.cfg.note_map.push({note:n,action:a});renderNoteMapList();});})();
var _origOnMidiMsg=onMidiMsg;
onMidiMsg=function(e){
  var cmd0=e.data[0]&0xF0,cc0=e.data[1],val0=e.data[2];
  // Per-param MIDI learn: intercept CC while learning
  if(cmd0===0xB0&&window._mlActive){
    // Remove any old binding for this CC
    if(window._mlBindings[cc0]){window._mlBindings[cc0].btn.classList.remove('bound');window._mlBindings[cc0].btn.textContent='M';}
    // Remove old binding for same id
    Object.keys(window._mlBindings).forEach(function(c){if(window._mlBindings[c].id===window._mlActive.id){window._mlBindings[c].btn.classList.remove('bound');window._mlBindings[c].btn.textContent='MIDI';delete window._mlBindings[c];}});
    window._mlBindings[cc0]={applyFn:window._mlActive.applyFn,btn:window._mlActive.btn,id:window._mlActive.id};
    window._mlActive.btn.textContent='CC'+cc0;
    window._mlActive.btn.classList.remove('learning');
    window._mlActive.btn.classList.add('bound');
    window._mlActive=null;
    _mlSave();return;
  }
  // Apply per-param bindings on CC
  if(cmd0===0xB0&&window._mlBindings[cc0])window._mlBindings[cc0].applyFn(val0/127);
  if(e.data[0]===0xF8){var now=performance.now();if(midiClockLast>0){var intv=now-midiClockLast,bpm=60000/(intv*24),sm=FluidSim.cfg.clock_smooth;midiClockBpmEma=midiClockBpmEma?midiClockBpmEma*sm+bpm*(1-sm):bpm;if(FluidSim.cfg.midi_clock_active){var b=Math.max(40,Math.min(300,Math.round(midiClockBpmEma)));FluidSim.cfg.bpm=b;var sl=document.getElementById('bpm');if(sl)sl.value=b;var sp=document.getElementById('val-bpm');if(sp)sp.textContent=b;updateBeatDisplays();}}midiClockLast=now;return;}
  var cmd=e.data[0]&0xF0;
  if(cmd===0xC0){var prog2=e.data[1],presets2=loadPresets(),names2=Object.keys(presets2);if(names2.length){var idx2=prog2%names2.length;activePresetName=names2[idx2];applySnapshot(presets2[names2[idx2]]);renderPresetList();}return;}
  if(cmd===0x90&&e.data[2]>0){var note=e.data[1],vel=e.data[2];FluidSim.cfg.note_map.forEach(function(entry){if(entry.note===note)executeNoteAction(entry.action,vel);});}
  _origOnMidiMsg(e);
};

/* ═══════════════════════════════════════════
   SCENES
═══════════════════════════════════════════ */
var scenes=new Array(8).fill(null),currentScene=-1;
var fadeTransActive=false,fadeCfgFrom=null,fadeCfgTo=null,fadeStartT=0;
function saveScene(idx){scenes[idx]=cfgSnapshot();renderScenesGrid();}
function loadScene(idx){if(!scenes[idx])return;currentScene=idx;if(FluidSim.cfg.scene_transition==='fade')startFadeTransition(scenes[idx]);else applySnapshot(scenes[idx]);renderScenesGrid();}
function startFadeTransition(target){fadeCfgFrom=cfgSnapshot();fadeCfgTo=target;fadeStartT=performance.now();fadeTransActive=true;}
window._fadeTick=function(){
  if(!fadeTransActive)return;
  var t=Math.min(1,(performance.now()-fadeStartT)/Math.max(50,FluidSim.cfg.scene_fade_dur));
  CFG_KEYS.forEach(function(k){if(fadeCfgFrom[k]!==undefined&&fadeCfgTo[k]!==undefined){var a=fadeCfgFrom[k],b=fadeCfgTo[k];if(typeof a==='number'&&typeof b==='number')FluidSim.cfg[k]=a+(b-a)*t;}});
  if(t>=1){applySnapshot(fadeCfgTo);fadeTransActive=false;}
};
function renderScenesGrid(){var grid=document.getElementById('scenes-grid');if(!grid)return;grid.innerHTML='';for(var i=0;i<8;i++){(function(idx){var btn=document.createElement('button');btn.className='scene-slot'+(scenes[idx]?' has-data':'')+(idx===currentScene?' active-scene':'');btn.innerHTML='<span class="sn">'+(idx+1)+'</span><span class="sh">'+(scenes[idx]?'●':'—')+'</span>';btn.title='Clic=charger · Maj+clic=sauver';btn.addEventListener('click',function(e){if(e.shiftKey)saveScene(idx);else loadScene(idx);});grid.appendChild(btn);})(i);}};
renderScenesGrid();
document.querySelectorAll('[data-scene-tr]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-scene-tr]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');FluidSim.cfg.scene_transition=this.dataset.sceneTr;});});
wire('fade-dur','scene_fade_dur','val-fade-dur',0);

/* ═══════════════════════════════════════════
   FULLSCREEN + HUD
═══════════════════════════════════════════ */
var hudTimer=null;
function showHud(){var h=document.getElementById('hud');if(h)h.style.opacity='1';clearTimeout(hudTimer);hudTimer=setTimeout(function(){var h=document.getElementById('hud');if(h)h.style.opacity='0';},2000);}
window._hudUpdate=function(){var b=document.getElementById('hud-bpm'),m=document.getElementById('hud-mode'),s=document.getElementById('hud-scene');if(b)b.textContent=Math.round(FluidSim.cfg.bpm)+' BPM';if(m)m.textContent=(window.activeEngine||'fluid').toUpperCase();if(s)s.textContent='SCN '+(currentScene>=0?currentScene+1:'—');};
document.addEventListener('keydown',function(e){if(e.key==='h'||e.key==='H'){window._cursorHidden=!window._cursorHidden;showHud();return;}var tag=document.activeElement.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;if(e.key==='f'||e.key==='F'){toggleFullscreen();showHud();}else if(e.key>='1'&&e.key<='8'){var idx=parseInt(e.key)-1;if(e.shiftKey)saveScene(idx);else loadScene(idx);showHud();}else if(e.key==='r'||e.key==='R'){looperStartRec();}else if(e.key===' '){e.preventDefault();looperTogglePlay();}});
function toggleFullscreen(){if(!document.fullscreenElement){document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen();document.getElementById('panel').style.display='none';setTimeout(function(){_customResLocked=false;autoResize();},200);}else{document.exitFullscreen&&document.exitFullscreen();}}
(function(){var b=document.getElementById('btn-fullscreen');if(b)b.addEventListener('click',toggleFullscreen);var b2=document.getElementById('btn-fullscreen2');if(b2)b2.addEventListener('click',toggleFullscreen);})();
document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement){document.getElementById('panel').style.display='';setTimeout(function(){var arOn=document.getElementById('auto-resize-on');_customResLocked=arOn&&!arOn.checked;autoResize();},100);}});

/* ═══════════════════════════════════════════
   LOOPER
═══════════════════════════════════════════ */
var looperState='stopped',looperBuf=[],looperRecStart=0,looperLen=0,looperTimers=[];
function looperUpdateUI(){var s=document.getElementById('looper-status');if(!s)return;var states={stopped:'ARRÊTÉ',recording:'⏺ REC',playing:'▶ LECTURE'};s.textContent=(states[looperState]||'—')+' · '+looperBuf.length+' event(s)';var br=document.getElementById('btn-loop-rec'),bp=document.getElementById('btn-loop-play');if(br)br.classList.toggle('rec-on',looperState==='recording');if(bp)bp.classList.toggle('play-on',looperState==='playing');}
function looperStartRec(){looperStopAll();looperBuf=[];looperState='recording';looperRecStart=performance.now();looperUpdateUI();}
function looperStopAll(){if(looperState==='playing')looperTimers.forEach(function(t){clearTimeout(t);});looperTimers=[];looperState='stopped';looperUpdateUI();}
function looperTogglePlay(){if(looperState==='playing'){looperStopAll();return;}if(!looperBuf.length)return;looperState='playing';looperTimers=[];looperBuf.forEach(function(ev){looperTimers.push(setTimeout(function(){if(looperState!=='playing')return;if(ev.action==='pulse')FluidSim.triggerPulseExt(ev.data);},ev.t%Math.max(100,looperLen)));});if(looperLen>100)looperTimers.push(setTimeout(function(){if(looperState==='playing'){looperTimers=[];looperTogglePlay();}},looperLen));looperUpdateUI();}
window._looperRecord=function(action,data){if(looperState!=='recording')return;looperBuf.push({t:performance.now()-looperRecStart,action:action,data:data});looperUpdateUI();};
window._looperTick=function(){if(looperState==='recording'){var bps=FluidSim.cfg.time_mode==='bpm'?FluidSim.cfg.bpm/60:1;looperLen=(FluidSim.cfg.loop_length*4/bps)*1000;}};
(function(){var b=document.getElementById('btn-loop-rec');if(b)b.addEventListener('click',function(){if(looperState==='recording'){var bps=FluidSim.cfg.time_mode==='bpm'?FluidSim.cfg.bpm/60:1;looperLen=(FluidSim.cfg.loop_length*4/bps)*1000;looperState='stopped';looperUpdateUI();}else looperStartRec();});})();
(function(){var b=document.getElementById('btn-loop-play');if(b)b.addEventListener('click',looperTogglePlay);})();
(function(){var b=document.getElementById('btn-loop-stop');if(b)b.addEventListener('click',looperStopAll);})();
wire('loop-len','loop_length','val-loop-len',0);

/* ═══════════════════════════════════════════
   EXTENDED FLUID WIRING (color/post-fx/midi)
═══════════════════════════════════════════ */
(function(){
  var ke=document.getElementById('kaleid-enabled');if(ke)ke.addEventListener('change',function(){FluidSim.cfg.kaleid_enabled=this.checked;});
  wire('kaleid-seg','kaleid_segments','val-kaleid-seg',0);wire('kaleid-angle','kaleid_angle','val-kaleid-angle',0);
  document.querySelectorAll('[data-mirror]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-mirror]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');FluidSim.cfg.mirror_mode=this.dataset.mirror;});});
  var he=document.getElementById('hue-shift-enabled');if(he)he.addEventListener('change',function(){FluidSim.cfg.hue_shift_enabled=this.checked;});
  wire('hue-shift','hue_shift','val-hue-shift',0);wire('hue-speed','hue_speed','val-hue-speed',0);
  document.querySelectorAll('[data-hdiv]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-hdiv]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');FluidSim.cfg.hue_beat_div=parseFloat(this.dataset.hdiv);});});
  var hp=document.getElementById('hue-tgt-particles');if(hp)hp.addEventListener('change',function(){FluidSim.cfg.hue_tgt_particles=this.checked;});
  var hb=document.getElementById('hue-tgt-bg');if(hb)hb.addEventListener('change',function(){FluidSim.cfg.hue_tgt_bg=this.checked;});
  var pe=document.getElementById('pixsort-enabled');if(pe)pe.addEventListener('change',function(){FluidSim.cfg.pixsort_enabled=this.checked;});
  wire('pixsort-thr','pixsort_threshold','val-pixsort-thr',2);wire('pixsort-cov','pixsort_coverage','val-pixsort-cov',0);
  document.querySelectorAll('[data-psdir]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-psdir]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');FluidSim.cfg.pixsort_direction=this.dataset.psdir;});});
  var bl=document.getElementById('bloom-enabled');if(bl)bl.addEventListener('change',function(){FluidSim.cfg.bloom_enabled=this.checked;});
  wire('bloom-thr','bloom_threshold','val-bloom-thr',2);wire('bloom-str','bloom_strength','val-bloom-str',1);
  var ch=document.getElementById('chroma-enabled');if(ch)ch.addEventListener('change',function(){FluidSim.cfg.chroma_enabled=this.checked;});
  wire('chroma','chroma_amount','val-chroma',1);
  var fb=document.getElementById('feedback-enabled');if(fb)fb.addEventListener('change',function(){FluidSim.cfg.feedback_enabled=this.checked;});
  wire('fb-zoom','feedback_zoom','val-fb-zoom',3);wire('fb-alpha','feedback_alpha','val-fb-alpha',2);
  wire('warp-str','warp_strength','val-warp-str',1);wire('warp-dec','warp_decay','val-warp-dec',0);
  /* ── Global FX bar wiring ── */
  (function(){
    function gfxSlider(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);FluidSim.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec);/* sync legacy slider if exists */var leg=document.getElementById(id.replace('gfx-',''));if(leg)leg.value=v;});}
    function gfxToggle(btnId,cfgKey,legacyChkId){
      var btn=document.getElementById(btnId);if(!btn)return;
      btn.addEventListener('click',function(){
        FluidSim.cfg[cfgKey]=!FluidSim.cfg[cfgKey];
        this.classList.toggle('on',FluidSim.cfg[cfgKey]);
        var chk=document.getElementById(legacyChkId);if(chk)chk.checked=FluidSim.cfg[cfgKey];
      });
    }
    gfxToggle('fxq-bloom','bloom_enabled','bloom-enabled');
    gfxToggle('fxq-chroma','chroma_enabled','chroma-enabled');
    gfxToggle('fxq-feedback','feedback_enabled','feedback-enabled');
    gfxSlider('gfx-bloom-thr','bloom_threshold','gfx-val-bloom-thr',2);
    gfxSlider('gfx-bloom-str','bloom_strength','gfx-val-bloom-str',1);
    gfxSlider('gfx-chroma','chroma_amount','gfx-val-chroma',1);
    gfxSlider('gfx-fb-zoom','feedback_zoom','gfx-val-fb-zoom',3);
    gfxSlider('gfx-fb-alpha','feedback_alpha','gfx-val-fb-alpha',2);
    var exp=document.getElementById('fxq-expand');
    var panel=document.getElementById('fx-expanded');
    if(exp&&panel)exp.addEventListener('click',function(){
      var open=panel.style.display==='block';
      panel.style.display=open?'none':'block';
      this.textContent=open?'▾':'▴';
    });
  })();
  var ce=document.getElementById('curl-enabled');if(ce)ce.addEventListener('change',function(){FluidSim.cfg.curl_noise_enabled=this.checked;});
  wire('curl-scale','curl_scale','val-curl-scale',2);wire('curl-speed','curl_speed','val-curl-speed',2);wire('curl-strength','curl_strength','val-curl-strength',2);
  var mc=document.getElementById('midi-clock-active');if(mc)mc.addEventListener('change',function(){FluidSim.cfg.midi_clock_active=this.checked;});
  wire('clock-smooth','clock_smooth','val-clock-smooth',2);
  document.querySelectorAll('[data-pctr]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-pctr]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');FluidSim.cfg.pc_transition=this.dataset.pctr;});});
})();

/* ═══════════════════════════════════════════
   VORTEX WIRING
═══════════════════════════════════════════ */
(function(){
  function vwire(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);VortexEngine.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-vmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');VortexEngine.cfg.pointer_mode=this.dataset.vmode;});});
  vwire('vpen-size','pen_size','vval-pen',0);vwire('vpush-force','push_force','vval-force',1);vwire('vspawn-gamma','spawn_gamma','vval-gamma',1);vwire('vvortex-count','vortex_count','vval-count',0);vwire('vvortex-eps','vortex_epsilon','vval-eps',0);vwire('vspeck','speck_count','vval-speck',0);vwire('vlw','line_width','vval-lw',1);vwire('vff','flow_force','vval-ff',3);vwire('vdrag','particle_drag','vval-drag',3);vwire('vtrail','trail','vval-trail',2);vwire('vopacity','opacity','vval-opacity',2);vwire('vvel-max','vel_max','vval-velmax',1);vwire('vtpulse-int','pulse_interval','vval-pulse-int',1);vwire('vtauto-int','auto_interval','vval-auto-int',1);vwire('vtbpm','bpm','vval-bpm',0);vwire('vauto-count','auto_count','vval-autocount',0);
  var vchk={'vshow-markers':'show_vortex_markers','vshow-trails':'show_vortex_trails','vhue-enabled':'hue_shift_enabled'};Object.keys(vchk).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){VortexEngine.cfg[vchk[id]]=this.checked;});});
  var vcol={'vbg-color':'bg_color','vcolor-pos':'color_pos','vcolor-neg':'color_neg','vcolor-solid':'color'};Object.keys(vcol).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',function(){VortexEngine.cfg[vcol[id]]=this.value;});});
  document.querySelectorAll('[data-vbnd]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vbnd]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');VortexEngine.cfg.vortex_boundary=this.dataset.vbnd;});});
  document.querySelectorAll('[data-vptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');VortexEngine.cfg.pulse_type=this.dataset.vptype;});});
  document.querySelectorAll('[data-vamode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vamode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');VortexEngine.cfg.auto_mode=this.dataset.vamode;});});
  document.querySelectorAll('[data-vcmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-vcmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');VortexEngine.cfg.color_mode=this.dataset.vcmode;});});
  var vbp=document.getElementById('vbtn-pulse');if(vbp)vbp.addEventListener('click',function(){VortexEngine.cfg.pulse_enabled=!VortexEngine.cfg.pulse_enabled;this.classList.toggle('on',VortexEngine.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=VortexEngine.cfg.pulse_enabled?'var(--accent)':'#444';});
  var vbpf=document.getElementById('vbtn-pulse-fire');if(vbpf)vbpf.addEventListener('click',function(){VortexEngine.triggerPulse();});
  var vba=document.getElementById('vbtn-auto');if(vba)vba.addEventListener('click',function(){VortexEngine.cfg.auto_enabled=!VortexEngine.cfg.auto_enabled;this.classList.toggle('on',VortexEngine.cfg.auto_enabled);var d=this.querySelector('.dot');if(d)d.style.background=VortexEngine.cfg.auto_enabled?'var(--accent)':'#444';});
  var vbaf=document.getElementById('vbtn-auto-fire');if(vbaf)vbaf.addEventListener('click',function(){VortexEngine.triggerPulse();});
  var vra=document.getElementById('vbtn-reset-all');if(vra)vra.addEventListener('click',function(){VortexEngine.reset();});
})();

/* ═══════════════════════════════════════════
   NBODY WIRING
═══════════════════════════════════════════ */
(function(){
  function nbwire(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);NBodyEngine.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-nbmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-nbmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');NBodyEngine.cfg.pointer_mode=this.dataset.nbmode;});});
  nbwire('nbpen-size','pen_size','nbval-pen',0);nbwire('nbpush-force','push_force','nbval-force',1);nbwire('nbspawn-mass','spawn_mass','nbval-mass',0);nbwire('nbbody-count','body_count','nbval-count',0);(function(){var sl=document.getElementById('nbbody-count');if(sl)sl.addEventListener('change',function(){NBodyEngine.reset();});})();nbwire('nbG','G','nbval-G',2);nbwire('nbsoftening','softening','nbval-soft',0);nbwire('nbspeck','speck_count','nbval-speck',0);nbwire('nblw','line_width','nbval-lw',1);nbwire('nbff','flow_force','nbval-ff',3);nbwire('nbdrag','particle_drag','nbval-drag',3);nbwire('nbtrail','trail','nbval-trail',2);nbwire('nbopacity','opacity','nbval-opacity',2);nbwire('nbvel-max','vel_max','nbval-velmax',1);nbwire('nbtpulse-int','pulse_interval','nbval-pulse-int',1);nbwire('nbtauto-int','auto_interval','nbval-auto-int',1);nbwire('nbtbpm','bpm','nbval-bpm',0);nbwire('nbauto-count','auto_count','nbval-autocount',0);
  var nbchk={'nbshow-trails':'show_body_trails','nbrepulsion':'repulsion_enabled','nbhue-enabled':'hue_shift_enabled'};Object.keys(nbchk).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('change',function(){NBodyEngine.cfg[nbchk[id]]=this.checked;});});
  var nbcol={'nbbg-color':'bg_color','nbcolor-solid':'color'};Object.keys(nbcol).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',function(){NBodyEngine.cfg[nbcol[id]]=this.value;});});
  document.querySelectorAll('.nb-body-color').forEach(function(el){el.addEventListener('input',function(){var idx=parseInt(this.dataset.idx);NBodyEngine.cfg.body_colors[idx]=this.value;/* recolor existing bodies that used this slot */NBodyEngine.cfg.body_colors[idx]=this.value;var bodies=NBodyEngine._getBodies&&NBodyEngine._getBodies();if(bodies){for(var i=0;i<bodies.length;i++){if(i%NBodyEngine.cfg.body_colors.length===idx)bodies[i].baseColor=this.value;}}});});
  document.querySelectorAll('[data-nbbnd]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-nbbnd]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');NBodyEngine.cfg.boundary_mode=this.dataset.nbbnd;});});
  document.querySelectorAll('[data-nbptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-nbptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');NBodyEngine.cfg.pulse_type=this.dataset.nbptype;});});
  document.querySelectorAll('[data-nbamode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-nbamode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');NBodyEngine.cfg.auto_mode=this.dataset.nbamode;});});
  document.querySelectorAll('[data-nbcmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-nbcmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');NBodyEngine.cfg.color_mode=this.dataset.nbcmode;});});
  var nbbp=document.getElementById('nbbtn-pulse');if(nbbp)nbbp.addEventListener('click',function(){NBodyEngine.cfg.pulse_enabled=!NBodyEngine.cfg.pulse_enabled;this.classList.toggle('on',NBodyEngine.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=NBodyEngine.cfg.pulse_enabled?'var(--accent)':'#444';});
  var nbbpf=document.getElementById('nbbtn-pulse-fire');if(nbbpf)nbbpf.addEventListener('click',function(){NBodyEngine.triggerPulse();});
  var nbba=document.getElementById('nbbtn-auto');if(nbba)nbba.addEventListener('click',function(){NBodyEngine.cfg.auto_enabled=!NBodyEngine.cfg.auto_enabled;this.classList.toggle('on',NBodyEngine.cfg.auto_enabled);var d=this.querySelector('.dot');if(d)d.style.background=NBodyEngine.cfg.auto_enabled?'var(--accent)':'#444';});
  var nbra=document.getElementById('nbbtn-reset-all');if(nbra)nbra.addEventListener('click',function(){NBodyEngine.reset();});
})();

/* ═══════════════════════════════════════════
   OUTPUT TAB + RESOLUTION
═══════════════════════════════════════════ */
(function(){
  var owSl=document.getElementById('out-w'),ohSl=document.getElementById('out-h'),owV=document.getElementById('val-out-w'),ohV=document.getElementById('val-out-h');
  function syncOutSliders(){if(owSl){owSl.value=FluidSim.cfg.canvas_width;if(owV)owV.textContent=FluidSim.cfg.canvas_width;}if(ohSl){ohSl.value=FluidSim.cfg.canvas_height;if(ohV)ohV.textContent=FluidSim.cfg.canvas_height;}}
  if(owSl)owSl.addEventListener('input',function(){if(owV)owV.textContent=this.value;});
  if(ohSl)ohSl.addEventListener('input',function(){if(ohV)ohV.textContent=this.value;});
  var ba=document.getElementById('btn-apply-res');if(ba)ba.addEventListener('click',function(){var res=FluidSim.cfg.resolution;if(owSl){FluidSim.cfg.canvas_width=Math.max(res*10,Math.floor(parseInt(owSl.value)/res)*res);}if(ohSl){FluidSim.cfg.canvas_height=Math.max(res*10,Math.floor(parseInt(ohSl.value)/res)*res);}_customResLocked=true;FluidSim.resize();updateResDisplay();});
  document.querySelectorAll('[data-res]').forEach(function(btn){btn.addEventListener('click',function(){var parts=this.dataset.res.split(','),w=parseInt(parts[0]),h=parseInt(parts[1]),res=FluidSim.cfg.resolution;FluidSim.cfg.canvas_width=Math.max(res*10,Math.floor(w/res)*res);FluidSim.cfg.canvas_height=Math.max(res*10,Math.floor(h/res)*res);_customResLocked=true;FluidSim.resize();updateResDisplay();});});
  var arOn=document.getElementById('auto-resize-on');if(arOn)arOn.addEventListener('change',function(){_customResLocked=!this.checked;if(this.checked){_customResLocked=false;autoResize();}});
  syncOutSliders();
})();

/* ═══════════════════════════════════════════
   REACT PRESETS BUTTONS
═══════════════════════════════════════════ */
(function(){
  var grid=document.getElementById('react-presets-grid');if(!grid)return;
  Object.keys(Engine_React.PRESETS).forEach(function(name){var btn=document.createElement('button');btn.className='btn';btn.textContent=name;btn.addEventListener('click',function(){Engine_React.applyPreset(name);document.querySelectorAll('#react-presets-grid .btn').forEach(function(b){b.classList.remove('active');});this.classList.add('active');});grid.appendChild(btn);});
})();

/* ═══════════════════════════════════════════
   SPH WIRING
═══════════════════════════════════════════ */
(function(){
  function sphw(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_SPH.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-sphmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-sphmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_SPH.cfg.pointer_mode=this.dataset.sphmode;});});
  document.querySelectorAll('[data-sphptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-sphptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_SPH.cfg.pulse_type=this.dataset.sphptype;});});
  sphw('sphpen-size','pen_size','sphval-pen',0);
  sphw('sphpush-force','push_force','sphval-force',1);
  sphw('sphparticle-count','particle_count','sphval-count',0);
  (function(){var sl=document.getElementById('sphparticle-count');if(sl)sl.addEventListener('change',function(){Engine_SPH.reset();});})();
  sphw('sphsmoothing-h','smoothing_h','sphval-h',0);
  sphw('sphstiffness','stiffness','sphval-stiff',0);
  sphw('sphviscosity','viscosity','sphval-visc',2);
  sphw('sphgravity-y','gravity_y','sphval-gy',2);
  sphw('sphgravity-x','gravity_x','sphval-gx',2);
  sphw('sphparticle-radius','particle_radius','sphval-radius',0);
  sphw('sphopacity','opacity','sphval-opacity',2);
  sphw('sphtpulse-int','pulse_interval','sphval-pulse-int',1);
  (function(){var b=document.getElementById('sphbg-color');if(b)b.addEventListener('input',function(){Engine_SPH.cfg.bg_color=this.value;});})();
  (function(){var b=document.getElementById('sphparticle-color');if(b)b.addEventListener('input',function(){Engine_SPH.cfg.color=this.value;});})();
  var sphbp=document.getElementById('sphbtn-pulse');if(sphbp)sphbp.addEventListener('click',function(){Engine_SPH.cfg.pulse_enabled=!Engine_SPH.cfg.pulse_enabled;this.classList.toggle('on',Engine_SPH.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_SPH.cfg.pulse_enabled?'var(--accent)':'#444';});
  var sphbpf=document.getElementById('sphbtn-pulse-fire');if(sphbpf)sphbpf.addEventListener('click',function(){Engine_SPH.triggerPulse();});
  var sphrst=document.getElementById('sphbtn-reset');if(sphrst)sphrst.addEventListener('click',function(){Engine_SPH.reset();});
})();

/* ═══════════════════════════════════════════
   BOIDS WIRING
═══════════════════════════════════════════ */
(function(){
  function bw(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_Boids.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-bmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-bmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Boids.cfg.pointer_mode=this.dataset.bmode;});});
  document.querySelectorAll('[data-bptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-bptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Boids.cfg.pulse_type=this.dataset.bptype;});});
  bw('bpen-size','pen_size','bval-pen',0);
  bw('bpush-force','push_force','bval-force',1);
  bw('bboid-count','boid_count','bval-count',0);
  (function(){var sl=document.getElementById('bboid-count');if(sl)sl.addEventListener('change',function(){Engine_Boids.reset();});})();
  bw('bperception','perception_radius','bval-perc',0);
  bw('bseparation','separation','bval-sep',1);
  bw('balignment','alignment','bval-ali',1);
  bw('bcohesion','cohesion','bval-coh',1);
  bw('bmax-speed','max_speed','bval-speed',1);
  bw('bboid-size','boid_size','bval-size',0);
  bw('btrail','trail','bval-trail',2);
  bw('bopacity','opacity','bval-opacity',2);
  bw('btpulse-int','pulse_interval','bval-pulse-int',1);
  (function(){var b=document.getElementById('bbg-color');if(b)b.addEventListener('input',function(){Engine_Boids.cfg.bg_color=this.value;});})();
  (function(){var b=document.getElementById('bparticle-color');if(b)b.addEventListener('input',function(){Engine_Boids.cfg.color=this.value;});})();
  var bbp=document.getElementById('bbtn-pulse');if(bbp)bbp.addEventListener('click',function(){Engine_Boids.cfg.pulse_enabled=!Engine_Boids.cfg.pulse_enabled;this.classList.toggle('on',Engine_Boids.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_Boids.cfg.pulse_enabled?'var(--accent)':'#444';});
  var bbpf=document.getElementById('bbtn-pulse-fire');if(bbpf)bbpf.addEventListener('click',function(){Engine_Boids.triggerPulse();});
  var brst=document.getElementById('bbtn-reset');if(brst)brst.addEventListener('click',function(){Engine_Boids.reset();});
})();

/* ═══════════════════════════════════════════
   PHYSARUM WIRING
═══════════════════════════════════════════ */
(function(){
  function phw(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_Physarum.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-phmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-phmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Physarum.cfg.pointer_mode=this.dataset.phmode;});});
  document.querySelectorAll('[data-phptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-phptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Physarum.cfg.pulse_type=this.dataset.phptype;});});
  phw('phpen-size','pen_size','phval-pen',0);phw('phpush-force','push_force','phval-force',1);
  phw('phagent-count','agent_count','phval-agents',0);
  phw('phagent-speed','agent_speed','phval-speed',1);
  phw('phsensor-angle','sensor_angle','phval-sangle',0);
  phw('phsensor-dist','sensor_dist','phval-sdist',0);
  phw('phrotation-angle','rotation_angle','phval-rangle',0);
  phw('phdeposit-amount','deposit_amount','phval-deposit',1);
  phw('phdecay-rate','decay_rate','phval-decay',3);
  phw('phdiffuse-rate','diffuse_rate','phval-diffuse',2);
  phw('phtpulse-int','pulse_interval','phval-pulse-int',1);
  (function(){var b=document.getElementById('phcolor-low');if(b)b.addEventListener('input',function(){Engine_Physarum.cfg.color_low=this.value;});})();
  (function(){var b=document.getElementById('phcolor-high');if(b)b.addEventListener('input',function(){Engine_Physarum.cfg.color_high=this.value;});})();
  var phbp=document.getElementById('phbtn-pulse');if(phbp)phbp.addEventListener('click',function(){Engine_Physarum.cfg.pulse_enabled=!Engine_Physarum.cfg.pulse_enabled;this.classList.toggle('on',Engine_Physarum.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_Physarum.cfg.pulse_enabled?'var(--accent)':'#444';});
  var phbpf=document.getElementById('phbtn-pulse-fire');if(phbpf)phbpf.addEventListener('click',function(){Engine_Physarum.triggerPulse();});
  var phrst=document.getElementById('phbtn-reset');if(phrst)phrst.addEventListener('click',function(){Engine_Physarum.reset();});
})();

/* ═══════════════════════════════════════════
   LORENZ WIRING
═══════════════════════════════════════════ */
(function(){
  function lw(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_Lorenz.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  function lwReset(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_Lorenz.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);Engine_Lorenz.reset();});}
  function showAttractorParams(att){['lorenz','rossler','clifford','thomas'].forEach(function(a){var el=document.getElementById('lparams-'+a);if(el)el.style.display=a===att?'':'none';});}
  document.querySelectorAll('[data-lattractor]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-lattractor]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Lorenz.cfg.attractor=this.dataset.lattractor;showAttractorParams(this.dataset.lattractor);Engine_Lorenz.reset();});});
  document.querySelectorAll('[data-lptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-lptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_Lorenz.cfg.pulse_type=this.dataset.lptype;});});
  (function(){var el=document.getElementById('lauto-rotate');if(el)el.addEventListener('change',function(){Engine_Lorenz.cfg.auto_rotate=this.checked;});})();
  lw('lpen-size','pen_size','lval-pen',0);lw('lpush-force','push_force','lval-force',1);
  lw('lrotate-x','rotate_speed_x','lval-rotx',3);
  lw('lrotate-y','rotate_speed_y','lval-roty',3);
  lwReset('ltrajectory-count','trajectory_count','lval-tcount',0);
  lw('ltrail-length','trail_length','lval-tlen',0);
  lw('ldt','dt','lval-dt',3);
  lw('lproj-scale','proj_scale','lval-scale',0);
  /* Lorenz params */
  lw('llorenz-sigma','lorenz_sigma','lval-sigma',1);
  lw('llorenz-rho','lorenz_rho','lval-rho',1);
  lw('llorenz-beta','lorenz_beta','lval-beta',2);
  /* Rössler params */
  lw('lrossler-a','rossler_a','lval-ra',2);
  lw('lrossler-b','rossler_b','lval-rb',2);
  lw('lrossler-c','rossler_c','lval-rc',2);
  /* Clifford params */
  lw('lclifford-a','clifford_a','lval-ca',2);
  lw('lclifford-b','clifford_b','lval-cb',2);
  lw('lclifford-c','clifford_c','lval-cc',2);
  lw('lclifford-d','clifford_d','lval-cd',2);
  /* Thomas params */
  lw('lthomas-b','thomas_b','lval-tb',3);
  lw('ltrail','trail','lval-trail',2);
  lw('llw','line_width','lval-lw',1);
  lw('lopacity','opacity','lval-opacity',2);
  lw('ltpulse-int','pulse_interval','lval-pulse-int',1);
  /* color ramp pickers */
  function lRampPicker(id,stopIdx){var b=document.getElementById(id);if(!b)return;b.addEventListener('input',function(){Engine_Lorenz.cfg.ramp_stops[stopIdx].color=this.value;Engine_Lorenz.buildLUT();});}
  lRampPicker('lramp-low',0);lRampPicker('lramp-mid',1);lRampPicker('lramp-himid',2);lRampPicker('lramp-high',3);
  (function(){var b=document.getElementById('lbg-color');if(b)b.addEventListener('input',function(){Engine_Lorenz.cfg.bg_color=this.value;});})();
  var lbp=document.getElementById('lbtn-pulse');if(lbp)lbp.addEventListener('click',function(){Engine_Lorenz.cfg.pulse_enabled=!Engine_Lorenz.cfg.pulse_enabled;this.classList.toggle('on',Engine_Lorenz.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_Lorenz.cfg.pulse_enabled?'var(--accent)':'#444';});
  var lbpf=document.getElementById('lbtn-pulse-fire');if(lbpf)lbpf.addEventListener('click',function(){Engine_Lorenz.triggerPulse();});
  var lrst=document.getElementById('lbtn-reset');if(lrst)lrst.addEventListener('click',function(){Engine_Lorenz.reset();});
  showAttractorParams('lorenz');
})();

/* ═══════════════════════════════════════════
   REACT WIRING
═══════════════════════════════════════════ */
(function(){
  function rw(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_React.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  /* preset buttons (data-rpreset) — inline in HTML, wire them directly */
  document.querySelectorAll('[data-rpreset]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-rpreset]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_React.applyPreset(this.dataset.rpreset);});});
  document.querySelectorAll('[data-rmode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-rmode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_React.cfg.pointer_mode=this.dataset.rmode;});});
  document.querySelectorAll('[data-rptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-rptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_React.cfg.pulse_type=this.dataset.rptype;});});
  rw('rpen-size','pen_size','rval-pen',0);rw('rpush-force','push_force','rval-force',1);
  rw('rfeed','feed','rval-feed',3);
  rw('rkill','kill','rval-kill',3);
  rw('rDu','Du','rval-Du',3);
  rw('rDv','Dv','rval-Dv',3);
  rw('rsteps-per-frame','steps_per_frame','rval-steps',0);
  rw('ropacity','opacity','rval-opacity',2);
  rw('rtpulse-int','pulse_interval','rval-pulse-int',1);
  (function(){var b=document.getElementById('rcolor-low');if(b)b.addEventListener('input',function(){Engine_React.cfg.color_low=this.value;Engine_React.updateColorUniforms&&Engine_React.updateColorUniforms();});})();
  (function(){var b=document.getElementById('rcolor-high');if(b)b.addEventListener('input',function(){Engine_React.cfg.color_high=this.value;Engine_React.updateColorUniforms&&Engine_React.updateColorUniforms();});})();
  var rbp=document.getElementById('rbtn-pulse');if(rbp)rbp.addEventListener('click',function(){Engine_React.cfg.pulse_enabled=!Engine_React.cfg.pulse_enabled;this.classList.toggle('on',Engine_React.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_React.cfg.pulse_enabled?'var(--accent)':'#444';});
  var rbpf=document.getElementById('rbtn-pulse-fire');if(rbpf)rbpf.addEventListener('click',function(){Engine_React.triggerPulse();});
})();

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
window.requestAnimationFrame=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame;
var VERSION='v4.0.0.029';
/* EngineManager.init() appelle FluidSim.init() qui initialise canvas+ctx AVANT autoResize */
EngineManager.init();
/* ── VERSION DISPLAY ── */
(function(){
  var els=[document.getElementById('maj-local-ver'),document.getElementById('ver-display')];
  els.forEach(function(el){if(el)el.textContent=el.id==='ver-display'?VERSION+' — Standalone · No deps':VERSION;});
})();

/* ── MISE À JOUR ── */
(function(){
  var RAW_URL='https://raw.githubusercontent.com/ethilbalde/super-engine-vj/main/super-engine.html';
  var checkBtn=document.getElementById('maj-check-btn');
  var resultBox=document.getElementById('maj-result');
  var resultTitle=document.getElementById('maj-result-title');
  var resultMsg=document.getElementById('maj-result-msg');
  var dlBtn=document.getElementById('maj-dl-btn');
  var _remoteContent=null;

  function parseVersion(html){
    var m=html.match(/var VERSION='(v[\d.]+)'/);
    return m?m[1]:null;
  }
  function verNum(v){
    var parts=(v||'0').replace('v','').split('.');
    var mult=1000000;var n=0;
    for(var i=0;i<parts.length;i++){n+=parseInt(parts[i]||0)*mult;mult=Math.max(1,Math.floor(mult/1000));}
    return n;
  }

  if(checkBtn)checkBtn.addEventListener('click',function(){
    checkBtn.textContent='⟳ Vérification…';checkBtn.disabled=true;
    resultBox.style.display='none';dlBtn.style.display='none';_remoteContent=null;
    fetch(RAW_URL+'?t='+Date.now())
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.text();})
      .then(function(html){
        _remoteContent=html;
        var remVer=parseVersion(html)||'?';
        var localVer=VERSION;
        resultBox.style.display='block';
        if(verNum(remVer)>verNum(localVer)){
          resultTitle.textContent='Mise à jour disponible';
          resultTitle.style.color='#00ff88';
          resultMsg.innerHTML='Version distante : <span style="color:#00ff88;font-weight:700">'+remVer+'</span><br>Version locale : <span style="color:#888">'+localVer+'</span><br><br>Une nouvelle version est disponible sur GitHub.';
          dlBtn.style.display='block';
        } else {
          resultTitle.textContent='Déjà à jour';
          resultTitle.style.color='var(--accent)';
          resultMsg.innerHTML='Version locale : <span style="color:var(--accent);font-weight:700">'+localVer+'</span><br><br>Aucune mise à jour disponible.';
          dlBtn.style.display='none';
        }
      })
      .catch(function(err){
        resultBox.style.display='block';
        resultTitle.textContent='Erreur de connexion';
        resultTitle.style.color='#ff4466';
        resultMsg.innerHTML='Impossible de joindre GitHub.<br><span style="color:#556">Vérifier la connexion internet.<br>'+err.message+'</span>';
      })
      .finally(function(){checkBtn.textContent='⟳ Vérifier les mises à jour';checkBtn.disabled=false;});
  });

  if(dlBtn)dlBtn.addEventListener('click',function(){
    if(!_remoteContent)return;
    var blob=new Blob([_remoteContent],{type:'text/html'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='super-engine.html';
    a.click();
    URL.revokeObjectURL(a.href);
  });
})();

/* ── AUTO-CHECK ON STARTUP ── */
(function(){
  var RAW_URL='https://raw.githubusercontent.com/ethilbalde/super-engine-vj/main/super-engine.html';
  function verNum(v){
    var parts=(v||'0').replace('v','').split('.');
    var mult=1000000;var n=0;
    for(var i=0;i<parts.length;i++){n+=parseInt(parts[i]||0)*mult;mult=Math.max(1,Math.floor(mult/1000));}
    return n;
  }
  setTimeout(function(){
    fetch(RAW_URL+'?t='+Date.now())
      .then(function(r){return r.ok?r.text():null;})
      .then(function(html){
        if(!html)return;
        var m=html.match(/var VERSION='(v[\d.]+)'/);
        if(!m)return;
        if(verNum(m[1])>verNum(VERSION)){
          var badge=document.getElementById('maj-badge');
          if(badge){badge.style.display='inline-block';}
          var btn=document.getElementById('tab-maj-btn');
          if(btn)btn.style.color='#ff4466';
        }
      }).catch(function(){});
  },3000);
})();

/* ── EDITABLE VAL SPANS ── */
(function(){
  document.addEventListener('click',function(e){
    var span=e.target;
    if(!span.classList.contains('val'))return;
    var ctrl=span.closest('.ctrl');if(!ctrl)return;
    var slider=ctrl.querySelector('input[type="range"]');if(!slider)return;
    var prev=span.textContent;
    span.contentEditable='true';span.focus();
    var sel=window.getSelection(),rng=document.createRange();
    rng.selectNodeContents(span);sel.removeAllRanges();sel.addRange(rng);
    function apply(){
      span.contentEditable='false';
      var v=parseFloat(span.textContent.replace(',','.'));
      if(isNaN(v)){span.textContent=prev;return;}
      var mn=parseFloat(slider.min),mx=parseFloat(slider.max);
      if(!isNaN(mn))v=Math.max(mn,v);if(!isNaN(mx))v=Math.min(mx,v);
      slider.value=v;
      slider.dispatchEvent(new Event('input',{bubbles:true}));
    }
    span.addEventListener('blur',apply,{once:true});
    span.addEventListener('keydown',function kd(e2){
      if(e2.key==='Enter'){e2.preventDefault();span.removeEventListener('keydown',kd);apply();}
      if(e2.key==='Escape'){span.removeEventListener('keydown',kd);span.contentEditable='false';span.textContent=prev;}
    });
    e.stopPropagation();
  });
})();
autoResize();
initRampEditor();

/* ── THEME SYSTEM ── */
(function(){
  var btn=document.getElementById('btn-theme');
  var popup=document.getElementById('theme-popup');
  var customPanel=document.getElementById('theme-custom-panel');
  var customChip=document.getElementById('theme-custom-chip');

  // helpers
  function hexToHsl(hex){
    var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
    var max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,s=0,h=0;
    if(max!==min){s=l>.5?(max-min)/(2-max-min):(max-min)/(max+min);switch(max){case r:h=(g-b)/(max-min)+(g<b?6:0);break;case g:h=(b-r)/(max-min)+2;break;case b:h=(r-g)/(max-min)+4;break;}h/=6;}
    return[Math.round(h*360),Math.round(s*100),Math.round(l*100)];
  }
  function lighten(hex,amt){var h=hexToHsl(hex);return'hsl('+h[0]+','+h[1]+'%,'+(h[2]+amt)+'%)';}
  function darken(hex,amt){return lighten(hex,-amt);}

  function applyCustom(acc,panel,body,text){
    var hsl=hexToHsl(panel);
    var isDark=hsl[2]<50;
    var r=document.documentElement;
    r.style.setProperty('--accent',acc);
    r.style.setProperty('--bg-body',body);
    r.style.setProperty('--bg-panel',panel);
    r.style.setProperty('--bg-bar',isDark?darken(panel,3):lighten(panel,3));
    r.style.setProperty('--bg-well',isDark?darken(panel,2):lighten(panel,2));
    r.style.setProperty('--bg-ctrl',isDark?lighten(panel,5):darken(panel,5));
    r.style.setProperty('--bg-input',isDark?lighten(panel,3):darken(panel,3));
    r.style.setProperty('--border',isDark?lighten(panel,8):darken(panel,8));
    r.style.setProperty('--border-mid',isDark?lighten(panel,12):darken(panel,12));
    r.style.setProperty('--border-ctrl',isDark?lighten(panel,15):darken(panel,15));
    r.style.setProperty('--border-sec',isDark?lighten(panel,6):darken(panel,6));
    r.style.setProperty('--text-main',text);
    var th=hexToHsl(text);
    r.style.setProperty('--text-sub','hsl('+th[0]+','+th[1]+'%,'+(th[2]-10)+'%)');
    r.style.setProperty('--text-muted','hsl('+th[0]+','+th[1]+'%,'+(th[2]-25)+'%)');
    r.style.setProperty('--text-dim','hsl('+th[0]+','+th[1]+'%,'+(th[2]-40)+'%)');
    r.style.setProperty('--text-faint','hsl('+th[0]+','+th[1]+'%,'+(th[2]-55)+'%)');
    var ah=hexToHsl(acc);
    r.style.setProperty('--accent-tint','hsla('+ah[0]+','+ah[1]+'%,'+ah[2]+'%,.15)');
    r.style.setProperty('--accent-tint2','hsla('+ah[0]+','+ah[1]+'%,'+ah[2]+'%,.1)');
    customChip.style.background='linear-gradient(135deg,'+panel+' 50%,'+body+' 50%)';
  }

  function clearCustomProps(){
    ['--accent','--bg-body','--bg-panel','--bg-bar','--bg-well','--bg-ctrl','--bg-input',
     '--border','--border-mid','--border-ctrl','--border-sec',
     '--text-main','--text-sub','--text-muted','--text-dim','--text-faint',
     '--accent-tint','--accent-tint2'].forEach(function(p){
      document.documentElement.style.removeProperty(p);
    });
  }

  function setTheme(t){
    document.documentElement.classList.remove('theme-light');
    clearCustomProps();
    if(t==='light') document.documentElement.classList.add('theme-light');
    if(t==='custom'){
      applyCustom(
        document.getElementById('tc-accent').value,
        document.getElementById('tc-panel').value,
        document.getElementById('tc-body').value,
        document.getElementById('tc-text').value
      );
    }
    document.querySelectorAll('.theme-sel-btn,.theme-preview-chip').forEach(function(el){
      el.classList.toggle('active',el.dataset.theme===t);
    });
    customPanel.style.display=t==='custom'?'block':'none';
    try{localStorage.setItem('se-theme',t);}catch(e){}
  }

  // bind buttons
  document.querySelectorAll('.theme-sel-btn').forEach(function(b){
    b.addEventListener('click',function(){
      var saved={accent:document.getElementById('tc-accent').value,panel:document.getElementById('tc-panel').value,body:document.getElementById('tc-body').value,text:document.getElementById('tc-text').value};
      try{localStorage.setItem('se-theme-custom',JSON.stringify(saved));}catch(e){}
      setTheme(b.dataset.theme);
    });
  });
  document.querySelectorAll('.theme-preview-chip').forEach(function(chip){
    chip.addEventListener('click',function(){setTheme(chip.dataset.theme);});
  });

  // custom color pickers
  ['tc-accent','tc-panel','tc-body','tc-text'].forEach(function(id){
    document.getElementById(id).addEventListener('input',function(){
      setTheme('custom');
    });
  });

  // toggle popup
  btn.addEventListener('click',function(e){
    e.stopPropagation();
    var open=popup.classList.toggle('open');
    btn.classList.toggle('open',open);
  });
  document.addEventListener('click',function(e){
    if(!popup.contains(e.target)&&e.target!==btn){
      popup.classList.remove('open');btn.classList.remove('open');
    }
  });

  // restore saved theme
  try{
    var saved=localStorage.getItem('se-theme')||'dark';
    var savedCustom=JSON.parse(localStorage.getItem('se-theme-custom')||'null');
    if(savedCustom&&saved==='custom'){
      document.getElementById('tc-accent').value=savedCustom.accent||'#00ffff';
      document.getElementById('tc-panel').value=savedCustom.panel||'#111111';
      document.getElementById('tc-body').value=savedCustom.body||'#050505';
      document.getElementById('tc-text').value=savedCustom.text||'#cccccc';
    }
    setTheme(saved);
  }catch(e){setTheme('dark');}
})();
updateResDisplay();
/* ── ACO WIRING ── */
(function(){
  function acow(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);Engine_ACO.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  document.querySelectorAll('[data-acomode]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-acomode]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_ACO.cfg.pointer_mode=this.dataset.acomode;});});
  document.querySelectorAll('[data-acoptype]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-acoptype]').forEach(function(x){x.classList.remove('active');});this.classList.add('active');Engine_ACO.cfg.pulse_type=this.dataset.acoptype;});});
  acow('acopen-size','pen_size','acoval-pen',0);acow('acopush-force','push_force','acoval-force',1);
  acow('acoant-count','ant_count','acoval-ants',0);
  (function(){var sl=document.getElementById('acoant-count');if(sl)sl.addEventListener('change',function(){Engine_ACO.reset();});})();
  acow('aconest-count','nest_count','acoval-nests',0);
  (function(){var sl=document.getElementById('aconest-count');if(sl)sl.addEventListener('change',function(){Engine_ACO.reset();});})();
  acow('acofood-count','food_count','acoval-foods',0);
  (function(){var sl=document.getElementById('acofood-count');if(sl)sl.addEventListener('change',function(){Engine_ACO.reset();});})();
  acow('acospeed','ant_speed','acoval-speed',1);
  acow('acoevap','evaporation','acoval-evap',3);
  acow('acodep-food','deposit_food','acoval-df',0);
  acow('acodep-nest','deposit_nest','acoval-dn',0);
  acow('acosensor-angle','sensor_angle','acoval-sa',0);
  acow('acosensor-dist','sensor_distance','acoval-sd',0);
  acow('acowander','wander','acoval-wander',2);
  acow('acotpulse-int','pulse_interval','acoval-pulse-int',1);
  var acbp=document.getElementById('acobtn-pulse');if(acbp)acbp.addEventListener('click',function(){Engine_ACO.cfg.pulse_enabled=!Engine_ACO.cfg.pulse_enabled;this.classList.toggle('on',Engine_ACO.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=Engine_ACO.cfg.pulse_enabled?'var(--accent)':'#444';});
  var acbpf=document.getElementById('acobtn-pulse-fire');if(acbpf)acbpf.addEventListener('click',function(){Engine_ACO.triggerPulse();});
  var acrst=document.getElementById('acobtn-reset');if(acrst)acrst.addEventListener('click',function(){Engine_ACO.reset();});
  var acols={'acobg-color':'bg_color','acocolor-food':'color_food','acocolor-nest':'color_nest'};
  Object.keys(acols).forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',function(){Engine_ACO.cfg[acols[id]]=this.value;});});
})();
/* ── FOLLOW WIRING ── */
(function(){
  var E=Engine_Follow;
  function fw(id,key,valId,dec){
    var sl=document.getElementById(id);if(!sl)return;
    sl.addEventListener('input',function(){
      var v=parseFloat(this.value);E.cfg[key]=v;
      var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);
    });
  }
  /* pointer mode */
  document.querySelectorAll('[data-fwmode]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-fwmode]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.pointer_mode=this.dataset.fwmode;
    });
  });
  /* pulse type */
  document.querySelectorAll('[data-fwptype]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-fwptype]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.pulse_type=this.dataset.fwptype;
    });
  });
  /* pulse toggle */
  var pbtn=document.getElementById('fwbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){
    E.cfg.pulse_enabled=!E.cfg.pulse_enabled;
    this.classList.toggle('on',E.cfg.pulse_enabled);
    var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';
  });
  var pbtnf=document.getElementById('fwbtn-pulse-fire');
  if(pbtnf)pbtnf.addEventListener('click',function(){E.triggerPulse();});
  /* sim sliders */
  fw('fwcount','count','fwval-count',0);
  var csl=document.getElementById('fwcount');if(csl)csl.addEventListener('change',function(){E.reset();});
  fw('fwspeed','speed','fwval-speed',1);
  fw('fwtrail-len','trail_len','fwval-trail',0);
  fw('fwwave-amp','wave_amp','fwval-wave',0);
  fw('fwglow-size','attractor_size','fwval-glow',0);
  fw('fwfocus-x','focus_x','fwval-fx',2);
  fw('fwfocus-y','focus_y','fwval-fy',2);
  fw('fwpen-size','pen_size','fwval-pen',0);
  fw('fwpush-force','push_force','fwval-force',1);
  fw('fwfade','fade','fwval-fade',2);
  fw('fwopacity','opacity','fwval-opacity',2);
  fw('fwtpulse-int','pulse_interval','fwval-pulse-int',1);
  fw('fwbeat-div','pulse_beat_div','fwval-beat-div',0);
  /* toggles */
  var tgl=[['fwglow-enabled','glow_enabled'],['fwvignette','vignette'],['fwfloor','floor_enabled']];
  tgl.forEach(function(t){var el=document.getElementById(t[0]);if(el)el.addEventListener('change',function(){E.cfg[t[1]]=this.checked;});});
  /* colors */
  var bgc=document.getElementById('fwbg-color');if(bgc)bgc.addEventListener('input',function(){E.cfg.bg_color=this.value;});
  var pcc=document.getElementById('fwparticle-color');if(pcc)pcc.addEventListener('input',function(){E.cfg.color=this.value;});
  /* reset */
  var rst=document.getElementById('fwbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
})();

/* ── RIBBON WIRING ── */
(function(){
  var E=Engine_Ribbon;
  function rb(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  rb('rbcount','count','rbval-count',0);
  var csl=document.getElementById('rbcount');if(csl)csl.addEventListener('change',function(){E.reset();});
  rb('rbspeed','speed','rbval-speed',1);
  rb('rbtrail-len','trail_len','rbval-trail',0);
  rb('rbwidth','width','rbval-width',1);
  rb('rbconnect-dist','connect_dist','rbval-connect',0);
  rb('rbturb','turb','rbval-turb',1);
  rb('rbfade','fade','rbval-fade',2);
  rb('rbopacity','opacity','rbval-opacity',2);
  rb('rbtpulse-int','pulse_interval','rbval-pulse-int',1);
  rb('rbbeat-div','pulse_beat_div','rbval-beat-div',0);
  rb('rbpen-size','pen_size','rbval-pen',0);
  rb('rbpush-force','push_force','rbval-force',1);
  var pbtn=document.getElementById('rbbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('rbbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  var rst=document.getElementById('rbbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
  ['rbbg-color','rbcolor-head','rbcolor-tail','rbcolor-thread'].forEach(function(id){
    var map={rbbg:'bg_color','rbcolor-head':'color_head','rbcolor-tail':'color_tail','rbcolor-thread':'color_thread'};
    var el=document.getElementById(id);if(!el)return;
    var key=id==='rbbg-color'?'bg_color':id.replace('rb','color_').replace('-','_').replace('rbcolor_','color_');
    if(id==='rbbg-color')key='bg_color';
    else if(id==='rbcolor-head')key='color_head';
    else if(id==='rbcolor-tail')key='color_tail';
    else if(id==='rbcolor-thread')key='color_thread';
    el.addEventListener('input',function(){E.cfg[key]=this.value;});
  });
})();

/* ── PHYSIKS WIRING ── */
(function(){
  var E=Engine_Physiks;
  function phx(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  phx('phxgrid-res','grid_res','phxval-res',0);
  var gsl=document.getElementById('phxgrid-res');if(gsl)gsl.addEventListener('change',function(){E.reset();});
  phx('phxupdate-rate','update_rate','phxval-urate',0);
  phx('phxwater-spread','water_spread','phxval-spread',0);
  phx('phxfire-speed','fire_speed','phxval-fspeed',2);
  phx('phxpen-size','pen_size','phxval-pen',0);
  phx('phxwind','wind','phxval-wind',1);
  phx('phxsoot-cap','soot_cap','phxval-sootcap',0);
  phx('phxambient','ambient_temp','phxval-amb',0);
  phx('phxfire-temp','fire_temp','phxval-firet',0);
  phx('phxignite-temp','ignite_temp','phxval-ignite',0);
  phx('phxmelt-temp','melt_temp','phxval-melt',0);
  phx('phxsolidify-temp','solidify_temp','phxval-solid',0);
  phx('phxevap-temp','evap_temp','phxval-evap',0);
  phx('phxcondense-temp','condense_temp','phxval-cond',0);
  phx('phxfreeze-temp','freeze_temp','phxval-freeze',0);
  phx('phxthaw-temp','thaw_temp','phxval-thaw',0);
  phx('phxheat-diff','heat_diffusion','phxval-heatd',2);
  phx('phxcooling','cooling','phxval-cool',3);
  phx('phxenv','env_intensity','phxval-env',1);
  /* material buttons */
  document.querySelectorAll('[data-phxmat]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-phxmat]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.activeMat=parseInt(this.dataset.phxmat);
    });
  });
  var rst=document.getElementById('phxbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
  var colorMap={
    'phxbg-color':'bg_color','phxcolor-sand':'color_sand','phxcolor-water':'color_water',
    'phxcolor-oil':'color_oil','phxcolor-lava':'color_lava','phxcolor-ice':'color_ice',
    'phxcolor-wall':'color_wall','phxcolor-glass':'color_glass','phxcolor-smoke':'color_smoke',
    'phxcolor-steam':'color_steam','phxcolor-soot':'color_soot','phxcolor-ash':'color_ash'
  };
  Object.keys(colorMap).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var key=colorMap[id];
    el.addEventListener('input',function(){E.cfg[key]=this.value;});
  });
})();

/* ── NEURAL WIRING ── */
(function(){
  var E=Engine_Neural;
  function nr(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  nr('nrcount','count','nrval-count',0);
  var csl=document.getElementById('nrcount');if(csl)csl.addEventListener('change',function(){E.reset();});
  nr('nrdensity','density','nrval-density',2);
  var dsl=document.getElementById('nrdensity');if(dsl)dsl.addEventListener('change',function(){E.reset();});
  nr('nrfanout','fanout','nrval-fanout',0);
  nr('nrthreshold','threshold','nrval-thresh',2);
  nr('nrrefractory','refractory','nrval-refrac',0);
  nr('nrpulse-speed','pulse_speed','nrval-pspeed',1);
  nr('nrfade','fade','nrval-fade',2);
  nr('nrtpulse-int','pulse_interval','nrval-pulse-int',1);
  nr('nrbeat-div','pulse_beat_div','nrval-beat-div',0);
  nr('nrpen-size','pen_size','nrval-pen',0);
  var pbtn=document.getElementById('nrbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('nrbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  var rst=document.getElementById('nrbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
  ['nrbg-color','nrcolor-node','nrcolor-active','nrcolor-edge','nrcolor-pulse'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var key;
    if(id==='nrbg-color')key='bg_color';
    else if(id==='nrcolor-node')key='color_node';
    else if(id==='nrcolor-active')key='color_active';
    else if(id==='nrcolor-edge')key='color_edge';
    else if(id==='nrcolor-pulse')key='color_pulse';
    el.addEventListener('input',function(){E.cfg[key]=this.value;});
  });
})();

/* ── INK WIRING ── */
(function(){
  var E=Engine_Ink;
  function ink(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  ink('inkpen-size','pen_size','inkval-pen',0);
  ink('inkpen-force','pen_force','inkval-force',1);
  ink('inknoise','noise','inkval-noise',1);
  ink('inkgrid-res','grid_res','inkval-res',0);
  var gsl=document.getElementById('inkgrid-res');if(gsl)gsl.addEventListener('change',function(){E.reset();});
  ink('inkdamping','damping','inkval-damp',3);
  ink('inktpulse-int','pulse_interval','inkval-pulse-int',1);
  ink('inkbeat-div','pulse_beat_div','inkval-beat-div',0);
  /* hue step */
  var hsl=document.getElementById('inkhue-step');
  if(hsl)hsl.addEventListener('input',function(){E.cfg.hueStep=parseFloat(this.value);var sp=document.getElementById('inkval-hstep');if(sp)sp.textContent=this.value;});
  /* auto-color toggle */
  var acb=document.getElementById('inkautocol');
  if(acb)acb.addEventListener('change',function(){E.cfg.autoColor=this.checked;});
  /* next color button */
  var ncb=document.getElementById('inkbtn-nextcolor');
  if(ncb)ncb.addEventListener('click',function(){E.advanceColor();});
  /* mode buttons */
  document.querySelectorAll('[data-inkmode]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-inkmode]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.mode=this.dataset.inkmode;
    });
  });
  /* pulse */
  var pbtn=document.getElementById('inkbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('inkbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  /* colors */
  var bgc=document.getElementById('inkbg-color');
  if(bgc)bgc.addEventListener('input',function(){E.cfg.bg_color=this.value;});
  var pc=document.getElementById('inkpaint-color');
  if(pc)pc.addEventListener('input',function(){
    E.cfg.autoColor=false;
    var acb2=document.getElementById('inkautocol');if(acb2)acb2.checked=false;
    E.cfg.paint_color=this.value;
    var sw=document.getElementById('inkcolor-swatch');if(sw)sw.style.background=this.value;
  });
  /* reset */
  var rst=document.getElementById('inkbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
})();

/* ── SLOPE WIRING ── */
(function(){
  var E=Engine_Slope;
  function slp(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  slp('slpscale','scale','slpval-scale',0);
  slp('slpspeed','speed','slpval-speed',1);
  slp('slpwidth-min','width_min','slpval-wmin',1);
  slp('slpwidth-max','width_max','slpval-wmax',1);
  slp('slpcycle-int','cycle_interval','slpval-cycleint',1);
  slp('slppen-size','pen_size','slpval-pen',0);
  slp('slppush-force','push_force','slpval-force',1);
  slp('slpfade','fade','slpval-fade',2);
  slp('slptpulse-int','pulse_interval','slpval-pulse-int',1);
  slp('slpbeat-div','pulse_beat_div','slpval-beat-div',0);
  /* champ vectoriel */
  document.querySelectorAll('[data-slpfield]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-slpfield]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.field=parseInt(this.dataset.slpfield);
    });
  });
  /* rotation auto */
  var acb=document.getElementById('slpauto-cycle');
  if(acb)acb.addEventListener('change',function(){E.cfg.auto_cycle=this.checked;});
  /* pulse = saut de champ */
  var pbtn=document.getElementById('slpbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('slpbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  /* couleurs */
  var colorMap={'slpbg-color':'bg_color','slpcolor1':'color1','slpcolor2':'color2','slpcolor3':'color3','slpcolor4':'color4','slpcolor5':'color5'};
  Object.keys(colorMap).forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    var key=colorMap[id];
    el.addEventListener('input',function(){E.cfg[key]=this.value;});
  });
  /* reset */
  var rst=document.getElementById('slpbtn-reset');if(rst)rst.addEventListener('click',function(){E.reset();});
})();

/* ── DUNE WIRING ── */
(function(){
  var E=Engine_Dune;
  function dun(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  dun('duncount','count','dunval-count',0);
  var ctsl=document.getElementById('duncount');if(ctsl)ctsl.addEventListener('change',function(){E.reset();});
  dun('dunseed','seed','dunval-seed',0);
  dun('dunscale','scale','dunval-scale',0);
  dun('dunsteps','steps','dunval-steps',0);
  dun('dunspeed','speed','dunval-speed',1);
  dun('dundecay','decay','dunval-decay',3);
  dun('dunevol-dur','evolve_duration','dunval-evoldur',0);
  dun('dunpen-size','pen_size','dunval-pen',0);
  dun('dunpush-force','push_force','dunval-force',1);
  dun('dunsize-min','size_min','dunval-szmin',1);
  dun('dunsize-max','size_max','dunval-szmax',1);
  dun('duntpulse-int','pulse_interval','dunval-pulse-int',1);
  dun('dunbeat-div','pulse_beat_div','dunval-beat-div',0);
  /* palette */
  document.querySelectorAll('[data-dunpal]').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('[data-dunpal]').forEach(function(x){x.classList.remove('active');});
      this.classList.add('active');E.cfg.palette=parseInt(this.dataset.dunpal);
    });
  });
  /* évolution */
  var evb=document.getElementById('dunevolve');
  if(evb)evb.addEventListener('change',function(){E.cfg.evolve_enabled=this.checked;});
  /* pulse = nouvelle graine */
  var pbtn=document.getElementById('dunbtn-pulse');
  if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('dunbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  /* couleur fond */
  var bgc=document.getElementById('dunbg-color');if(bgc)bgc.addEventListener('input',function(){E.cfg.bg_color=this.value;});
  /* reset */
  var rst2=document.getElementById('dunbtn-reset');if(rst2)rst2.addEventListener('click',function(){E.reset();});
})();

/* ── CLOTH WIRING ── */
(function(){
  var E=Engine_Cloth;
  function clth(id,key,valId,dec){var sl=document.getElementById(id);if(!sl)return;sl.addEventListener('input',function(){var v=parseFloat(this.value);E.cfg[key]=v;var sp=document.getElementById(valId);if(sp)sp.textContent=v.toFixed(dec!==undefined?dec:2);});}
  clth('clthgrid-count','grid_count','clthval-grid',0);
  var gslider=document.getElementById('clthgrid-count');if(gslider)gslider.addEventListener('change',function(){E.reset();});
  clth('clthfriction','friction','clthval-friction',3);
  clth('clthforce-mult','force_multiplier','clthval-force',2);
  clth('clthspeed-limit','speed_limit','clthval-speed',1);
  clth('clthgrav-x','gravity_x','clthval-gx',2);
  clth('clthgrav-y','gravity_y','clthval-gy',2);
  clth('clthknife-range','knife_range','clthval-knife',0);
  clth('clthopacity','opacity','clthval-opacity',2);
  clth('clthline-width','line_width','clthval-width',1);
  clth('clthnode-size','node_size','clthval-nsize',1);
  clth('clthtrail','trail','clthval-trail',3);
  clth('clothpulse-int','pulse_interval','clthval-pulse-int',1);
  clth('clthbeat-div','pulse_beat_div','clthval-beat-div',0);
  clth('clothhue-speed','hue_speed','clthval-hue-speed',0);
  /* colors */
  var bgc=document.getElementById('clthbg-color');if(bgc)bgc.addEventListener('input',function(){E.cfg.bg_color=this.value;});
  var linec=document.getElementById('clthline-color');if(linec)linec.addEventListener('input',function(){E.cfg.line_color=this.value;});
  var nodec=document.getElementById('clthnode-color');if(nodec)nodec.addEventListener('input',function(){E.cfg.node_color=this.value;});
  var knifec=document.getElementById('clthknife-color');if(knifec)knifec.addEventListener('input',function(){E.cfg.knife_color=this.value;});
  /* toggles */
  var knifeBtn=document.getElementById('clthknife-enabled');if(knifeBtn)knifeBtn.addEventListener('change',function(){E.cfg.knife_enabled=this.checked;});
  var hueBtn=document.getElementById('clothhue-shift-enabled');if(hueBtn)hueBtn.addEventListener('change',function(){E.cfg.hue_shift_enabled=this.checked;});
  /* pulse */
  var pbtn=document.getElementById('clthbtn-pulse');if(pbtn)pbtn.addEventListener('click',function(){E.cfg.pulse_enabled=!E.cfg.pulse_enabled;this.classList.toggle('on',E.cfg.pulse_enabled);var d=this.querySelector('.dot');if(d)d.style.background=E.cfg.pulse_enabled?'var(--accent)':'var(--text-faint)';});
  var pbf=document.getElementById('clthbtn-pulse-fire');if(pbf)pbf.addEventListener('click',function(){E.triggerPulse();});
  /* undo */
  var undoBtn=document.getElementById('clthbtn-undo');if(undoBtn)undoBtn.addEventListener('click',function(){E.undo();});
  /* reset */
  var rstBtn=document.getElementById('clthbtn-reset');if(rstBtn)rstBtn.addEventListener('click',function(){E.reset();});
})();


/* ═══════════════════════════════════════════
   CURSOR X/Y + CLICK — câblage global MIDI
═══════════════════════════════════════════ */
(function(){
  /* préfixe HTML → clé activeEngine */
  var ENG_PFX={fluid:'',vortex:'v',nbody:'nb',sph:'sph',boids:'b',physarum:'ph',lorenz:'l',react:'r',aco:'aco',rdiff:'rd',lsys:'ls',voronoi:'vo',follow:'fw',ribbon:'rb',physiks:'phx',neural:'nr',ink:'ink',slope:'slp',dune:'dun',cloth:'clth'};
  var ALL_PFX=['','v','nb','sph','b','ph','l','r','aco','rd','ls','vo','fw','rb','phx','nr','ink','slp','dun','clth'];

  function getCanvas(){return document.getElementById('c');}

  /* slider curseur-x/y → _mouse.x/y */
  ALL_PFX.forEach(function(p){
    var cx=document.getElementById(p+'cursor-x');
    var cy=document.getElementById(p+'cursor-y');
    var scx=document.getElementById(p+'val-cx');
    var scy=document.getElementById(p+'val-cy');
    if(cx){cx.addEventListener('input',function(){
      var c=getCanvas(),W=c?c.width:1280;
      window._mouse.x=parseFloat(this.value)*W;
      if(scx)scx.textContent=parseFloat(this.value).toFixed(2);
    });}
    if(cy){cy.addEventListener('input',function(){
      var c=getCanvas(),H=c?c.height:720;
      window._mouse.y=parseFloat(this.value)*H;
      if(scy)scy.textContent=parseFloat(this.value).toFixed(2);
    });}

    /* CLICK toggle — maintient mouse.down */
    var bt=document.getElementById(p+'btn-click');
    if(bt){bt.addEventListener('click',function(){
      window._mouse.down=!window._mouse.down;
      bt.classList.toggle('on',window._mouse.down);
      var d=bt.querySelector('.dot');if(d)d.style.background=window._mouse.down?'var(--accent)':'#444';
    });}

    /* CLICK fire — impulsion courte */
    var bf=document.getElementById(p+'btn-click-fire');
    if(bf){bf.addEventListener('click',function(){
      window._mouse.down=true;
      /* relâche après 200ms sauf si le toggle CLICK est on */
      setTimeout(function(){
        var bt2=document.getElementById(p+'btn-click');
        if(!bt2||!bt2.classList.contains('on'))window._mouse.down=false;
      },200);
    });}
  });

  /* sync retour : quand la souris bouge sur le canvas → mise à jour des sliders du moteur actif */
  var _syncRaf=0;
  document.addEventListener('mousemove',function(){
    if(_syncRaf)return;
    _syncRaf=requestAnimationFrame(function(){
      _syncRaf=0;
      var c=getCanvas();if(!c)return;
      var W=c.width||1280,H=c.height||720;
      var nx=(window._mouse.x/W).toFixed(3);
      var ny=(window._mouse.y/H).toFixed(3);
      var ae=window.activeEngine||'fluid';
      var p=ENG_PFX[ae];if(p===undefined)p='';
      var ex=document.getElementById(p+'cursor-x');if(ex)ex.value=nx;
      var ey=document.getElementById(p+'cursor-y');if(ey)ey.value=ny;
      var esx=document.getElementById(p+'val-cx');if(esx)esx.textContent=parseFloat(nx).toFixed(2);
      var esy=document.getElementById(p+'val-cy');if(esy)esy.textContent=parseFloat(ny).toFixed(2);
    });
  });

  /* quand mouseup global → libère le toggle CLICK si non verrouillé */
  document.addEventListener('mouseup',function(){
    var ae=window.activeEngine||'fluid';
    var p=ENG_PFX[ae];if(p===undefined)p='';
    var bt=document.getElementById(p+'btn-click');
    if(bt&&!bt.classList.contains('on'))window._mouse.down=false;
  });
})();

/* ── INFO MODAL ── */
(function(){
  /* btn-info est dans le panel HTML (avant ce script) → OK */
  var bi=document.getElementById('btn-info');
  if(bi)bi.addEventListener('click',function(){document.getElementById('info-modal').classList.add('open');});
  /* info-close et info-modal sont APRÈS ce script → utiliser délégation sur document */
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.getElementById('info-modal').classList.remove('open');});
  /* les onclick inline sur info-modal et info-close gèrent la fermeture */
})();

/* ═══════════════════════════════════════════
   MIDI LEARN — scan post-init + restore
═══════════════════════════════════════════ */
(function(){
  // Load saved bindings (slider IDs only — functions rebuilt on scan)
  try{window._mlSavedIds=JSON.parse(localStorage.getItem(_ML_LS)||'{}');}catch(e){window._mlSavedIds={};}
  // Scan all .ctrl sliders and quick-fire buttons in the panel and add MIDI buttons
  setTimeout(function(){
    document.querySelectorAll('#panel .ctrl input[type="range"]').forEach(function(sl){
      window.addMidiBtnToSlider(sl);
    });
    document.querySelectorAll('#panel .quick-fire').forEach(function(btn){
      window.addMidiBtnToTrigger(btn);
    });
  },300);

  // Bug report tab
  (function(){
    var selSev='mineur';
    document.querySelectorAll('.bug-sev').forEach(function(b){
      b.addEventListener('click',function(){
        document.querySelectorAll('.bug-sev').forEach(function(x){x.classList.remove('active');});
        b.classList.add('active');selSev=b.dataset.sev;
      });
    });
    document.querySelector('.bug-sev[data-sev="mineur"]').classList.add('active');

    function getSysInfo(){
      var eng=window.activeEngine||'?';
      var fxList=[];
      try{if(window.FXEngine&&window.FXEngine._effects){window.FXEngine._effects.forEach(function(e){if(e.enabled)fxList.push(e.type);});}}catch(e){}
      var lines=[
        'Moteur actif : '+eng,
        'FX actifs    : '+(fxList.length?fxList.join(', '):'aucun'),
        'Navigateur   : '+navigator.userAgent.replace(/\s*\(.+?\)\s*/g,' ').trim().slice(0,80),
        'Résolution   : '+window.screen.width+'×'+window.screen.height+' (dpr '+window.devicePixelRatio+')',
        'Canvas       : '+(function(){var c=document.getElementById('c');return c?c.width+'×'+c.height:'?';})(),
        'WebGL        : '+(function(){try{var c=document.createElement('canvas');var g=c.getContext('webgl')||c.getContext('experimental-webgl');if(!g)return 'non dispo';var ext=g.getExtension('WEBGL_debug_renderer_info');return ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER);}catch(e){return 'erreur';}})(),
        'Date         : '+new Date().toLocaleString('fr-FR'),
      ];
      return lines.join('\n');
    }

    function refreshSysInfo(){
      var el=document.getElementById('bug-sysinfo');
      if(el)el.innerHTML=getSysInfo().replace(/\n/g,'<br>');
    }

    document.querySelector('[data-tab="bug"]').addEventListener('click',refreshSysInfo);

    document.getElementById('btn-send-bug').addEventListener('click',function(){
      var desc=document.getElementById('bug-desc').value.trim();
      var steps=document.getElementById('bug-steps').value.trim();
      if(!desc){document.getElementById('bug-desc').focus();document.getElementById('bug-desc').style.borderColor='#ff2244';return;}
      document.getElementById('bug-desc').style.borderColor='';
      var sys=getSysInfo();
      var body=[
        '=== RAPPORT DE BUG — Super Engine VJ ===',
        '',
        'Sévérité : '+selSev.toUpperCase(),
        '',
        '--- Description ---',
        desc,
        '',
        steps?('--- Étapes pour reproduire ---\n'+steps+'\n'):'',
        '--- Infos système ---',
        sys,
        '',
        '===================',
      ].join('\n');
      var title='[Bug]['+selSev+'] '+desc.slice(0,80).replace(/[\r\n]+/g,' ');
      var url='https://github.com/ethilbalde/super-engine-vj/issues/new'
        +'?title='+encodeURIComponent(title)
        +'&body='+encodeURIComponent(body)
        +'&labels='+encodeURIComponent('bug,'+selSev);
      window.open(url,'_blank');
      var msg=document.getElementById('bug-sent-msg');
      if(msg){msg.style.display='block';setTimeout(function(){msg.style.display='none';},5000);}
    });
  })();

  // Panel resize handle
  (function(){
    var handle=document.getElementById('panel-resize-handle');
    var panel=document.getElementById('panel');
    if(!handle||!panel)return;
    var startX,startW;
    handle.addEventListener('mousedown',function(e){
      startX=e.clientX;startW=panel.offsetWidth;
      handle.classList.add('dragging');
      document.body.style.cursor='col-resize';
      document.body.style.userSelect='none';
      e.preventDefault();
    });
    document.addEventListener('mousemove',function(e){
      if(!handle.classList.contains('dragging'))return;
      var w=Math.max(220,Math.min(600,startW+(e.clientX-startX)));
      panel.style.width=w+'px';
    });
    document.addEventListener('mouseup',function(){
      if(!handle.classList.contains('dragging'))return;
      handle.classList.remove('dragging');
      document.body.style.cursor='';
      document.body.style.userSelect='';
    });
  })();
})();
