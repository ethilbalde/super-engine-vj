/* ═══════════════════════════════════════════
   ENGINE: L-SYSTEMS
═══════════════════════════════════════════ */
window.Engine_LSystem=(function(){
  var C,ctx,W,H,_active=false;
  var _str='',_animPos=0,_pulseT=0,_phase='draw',_fadeAlpha=0;
  var _ax,_ay,_adir,_afi,_astk=[],_atotalF=0,_needBuild=true;
  var PRESETS={
    fern:{axiom:'X',rules:{X:'F+[[X]-X]-F[-FX]+X',F:'FF'},angle:25,iter:5,sx:.5,sy:.9},
    tree:{axiom:'F',rules:{F:'FF+[+F-F-F]-[-F+F+F]'},angle:22.5,iter:4,sx:.5,sy:.92},
    snowflake:{axiom:'F++F++F',rules:{F:'F-F++F-F'},angle:60,iter:4,sx:.15,sy:.6},
    dragon:{axiom:'FX',rules:{X:'X+YF+',Y:'-FX-Y'},angle:90,iter:11,sx:.5,sy:.5},
    sierpinski:{axiom:'F-G-G',rules:{F:'F-G+F+G-F',G:'GG'},angle:120,iter:5,sx:.1,sy:.9},
    bush:{axiom:'Y',rules:{X:'X[-FFF][+FFF]FX',Y:'YFX[+Y][-Y]'},angle:25.7,iter:5,sx:.5,sy:.92}
  };
  var cfg={preset:'fern',iter:5,angle:25,len:5,lw:1.5,bg:'#060810',col_base:'#44ff88',col_tip:'#ffffff',speed:300,pen_size:60,push_force:1.,pulse_enabled:false,pulse_int:4.};
  function rewrite(axiom,rules,n){var s=axiom;for(var i=0;i<n;i++){var ns='';for(var j=0;j<s.length;j++)ns+=rules[s[j]]||s[j];s=ns;}return s;}
  function lerpHex(a,b,t){var f=function(h,o){return parseInt(h.slice(o,o+2),16);};var r=f(a,1)+(f(b,1)-f(a,1))*t,g=f(a,3)+(f(b,3)-f(a,3))*t,bl=f(a,5)+(f(b,5)-f(a,5))*t;return'#'+(Math.round(r).toString(16).padStart(2,'0'))+(Math.round(g).toString(16).padStart(2,'0'))+(Math.round(bl).toString(16).padStart(2,'0'));}
  var _rndAngle=0,_rndLen=1,_rndSx=0,_rndSy=0;
  function build(){var pr=PRESETS[cfg.preset];_str=rewrite(pr.axiom,pr.rules,cfg.iter);_needBuild=false;
    _rndAngle=(Math.random()-.5)*cfg.angle*.35;
    _rndLen=0.75+Math.random()*.5;
    _rndSx=(Math.random()-.5)*.15;
    _rndSy=(Math.random()-.5)*.08;
    startAnim();}
  function startAnim(){
    var pr=PRESETS[cfg.preset];ctx.fillStyle=cfg.bg;ctx.fillRect(0,0,W,H);
    _ax=W*(pr.sx+_rndSx);_ay=H*(pr.sy+_rndSy);_adir=-Math.PI/2+(Math.random()-.5)*.18;_afi=0;_astk=[];_animPos=0;_phase='draw';_fadeAlpha=0;
    _atotalF=0;for(var i=0;i<_str.length;i++){var c=_str[i];if(c==='F'||c==='G')_atotalF++;}
  }
  function animStep(){
    if(_phase==='fade'){
      _fadeAlpha+=0.008;
      var bg=cfg.bg,br=parseInt(bg.slice(1,3),16),bg2=parseInt(bg.slice(3,5),16),bb=parseInt(bg.slice(5,7),16);
      ctx.fillStyle='rgba('+br+','+bg2+','+bb+',0.025)';
      ctx.fillRect(0,0,W,H);
      if(_fadeAlpha>=1){_phase='draw';_needBuild=true;_fadeAlpha=0;_pulseT=0;}
      return;
    }
    if(_animPos>=_str.length){_phase='fade';return;}
    var ang=(cfg.angle+_rndAngle)*(Math.PI/180),n=Math.min(_animPos+cfg.speed,_str.length);
    for(var i=_animPos;i<n;i++){
      var c=_str[i];
      if(c==='F'||c==='G'){
        var nx=_ax+Math.cos(_adir)*cfg.len*_rndLen,ny=_ay+Math.sin(_adir)*cfg.len*_rndLen;
        var t=_atotalF>0?_afi/_atotalF:0,depth=_astk.length;
        var lw=cfg.lw*Math.max(0.25,1-depth*0.12);
        ctx.lineWidth=lw;
        ctx.strokeStyle=lerpHex(cfg.col_base,cfg.col_tip,t);
        /* glow pass */
        ctx.globalAlpha=0.18;ctx.lineWidth=lw+2.5;ctx.beginPath();ctx.moveTo(_ax,_ay);ctx.lineTo(nx,ny);ctx.stroke();
        /* main pass */
        ctx.globalAlpha=1;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(_ax,_ay);ctx.lineTo(nx,ny);ctx.stroke();
        _ax=nx;_ay=ny;_afi++;
      }
      else if(c==='+')_adir+=ang;else if(c==='-')_adir-=ang;
      else if(c==='[')_astk.push({x:_ax,y:_ay,d:_adir});
      else if(c===']'){var s=_astk.pop();if(s){_ax=s.x;_ay=s.y;_adir=s.d;}}
    }
    _animPos=n;
  }
  function wireLS(){
    document.querySelectorAll('[data-lsp]').forEach(function(b){b.addEventListener('click',function(){document.querySelectorAll('[data-lsp]').forEach(function(x){x.classList.remove('active');});b.classList.add('active');cfg.preset=b.dataset.lsp;var pr=PRESETS[cfg.preset];cfg.angle=pr.angle;cfg.iter=pr.iter||5;var al=document.getElementById('lsangle');if(al){al.value=cfg.angle;var sv=document.getElementById('lsval-angle');if(sv)sv.textContent=cfg.angle+'°';}var il=document.getElementById('lsiter');if(il){il.value=cfg.iter;var sv=document.getElementById('lsval-iter');if(sv)sv.textContent=cfg.iter;}_needBuild=true;});});
    function slw(id,key,sp,dec,suffix){var el=document.getElementById(id);if(!el)return;el.addEventListener('input',function(){cfg[key]=parseFloat(this.value);var s=document.getElementById(sp);if(s)s.textContent=parseFloat(this.value).toFixed(dec)+(suffix||'');if(key==='iter'||key==='angle')_needBuild=true;else startAnim();});}
    slw('lsiter','iter','lsval-iter',0);slw('lsangle','angle','lsval-angle',0,'°');slw('lslen','len','lsval-len',1);slw('lsanim-speed','speed','lsval-speed',0);slw('lslw','lw','lsval-lw',1);slw('lstpulse-int','pulse_int','lsval-pulse-int',1);slw('lspen-size','pen_size','lsval-pen',0);slw('lspush-force','push_force','lsval-force',1);
    var bt=document.getElementById('lsbtn-pulse');if(bt){bt.addEventListener('click',function(){cfg.pulse_enabled=!cfg.pulse_enabled;bt.classList.toggle('on',cfg.pulse_enabled);bt.querySelector('.dot').style.background=cfg.pulse_enabled?'#44ff88':'#444';});bt._update=function(){bt.classList.toggle('on',cfg.pulse_enabled);bt.querySelector('.dot').style.background=cfg.pulse_enabled?'#44ff88':'#444';};}
    var bf=document.getElementById('lsbtn-pulse-fire');if(bf)bf.addEventListener('click',function(){_needBuild=true;});
  }
  return{cfg:cfg,
    activate:function(){C=document.getElementById('c');if(!C)return;ctx=C.getContext('2d');W=C.width;H=C.height;if(!_str)_needBuild=true;_active=true;wireLS();},
    deactivate:function(){_active=false;},
    draw:function(){
      if(!_active)return;W=C.width;H=C.height;
      if(_needBuild)build();
      animStep();
      _pulseT+=1/60;if(cfg.pulse_enabled&&_pulseT>=cfg.pulse_int){_pulseT=0;_needBuild=true;}
      var pb=document.getElementById('lspulse-bar');if(pb)pb.style.width=Math.min(100,_pulseT/cfg.pulse_int*100)+'%';
    }
  };
})();

