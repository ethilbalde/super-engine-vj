/* ═══════════════════════════════════════════
   SPHERE ENGINE — Rotating Particle Cloud
═══════════════════════════════════════════ */
var Engine_Sphere=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var points=[],_t=0,frameCount=0,_needsReset=false;
  var angle=0;

  var cfg={
    canvas_width:800,canvas_height:600,
    particle_count:5000,
    radius:180,repel_radius:100,
    attraction:0.01,damping:0.9,repel_strength:28,
    color:'#ffffff',bg_color:'#000000',
    point_size:1.5,
    pulse_enabled:false,pulse_interval:2.0,
    bpm:120,time_mode:'bpm',pulse_beat_div:1
  };

  function Point(index){
    this.index=index;
    this.pos={x:0,y:0};
    this.vel={x:0,y:0};
    this.targetx=0;
    this.targety=0;
  }

  function initPoints(){
    points=[];
    for(var i=0;i<cfg.particle_count;i++){
      points.push(new Point(i));
    }
    updateTargets();
    for(var i=0;i<points.length;i++){
      points[i].vel.x=0;
      points[i].vel.y=0;
    }
  }

  function updateTargets(){
    for(var i=0;i<points.length;i++){
      var p=points[i];
      var idx=p.index;
      var sinIdxSq=Math.sin(idx*idx);
      var cosIdxSq=Math.cos(idx*idx);
      p.targetx=Math.sin(idx+angle)*sinIdxSq*cfg.radius;
      p.targety=cosIdxSq*cfg.radius;
    }
  }

  function sin(x){return Math.sin(x);}
  function cos(x){return Math.cos(x);}
  function sqrt(x){return Math.sqrt(x);}

  var ENG={
    cfg:cfg,
    init:function(){
      canvas=document.getElementById('c');
      if(!canvas||!canvas.getContext)return;
      ctx=canvas.getContext('2d');
      initPoints();
    },
    draw:function(){
      if(!ctx)return;
      ctx.fillStyle=cfg.bg_color;
      ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);

      var cx=cfg.canvas_width/2;
      var cy=cfg.canvas_height/2;
      var mx=mouse.x-cx;
      var my=mouse.y-cy;

      ctx.fillStyle=cfg.color;
      ctx.strokeStyle=cfg.color;
      ctx.lineWidth=0.5;

      for(var i=0;i<points.length;i++){
        var p=points[i];
        var idx=p.index;

        // compute rotating home position
        var sinIdxSq=sin(idx*idx);
        var cosIdxSq=cos(idx*idx);
        var homeX=sin(idx+angle)*sinIdxSq*cfg.radius;
        var homeY=cosIdxSq*cfg.radius;

        // spring force toward home
        var toHomeX=homeX-p.pos.x;
        var toHomeY=homeY-p.pos.y;
        p.vel.x+=toHomeX*cfg.attraction;
        p.vel.y+=toHomeY*cfg.attraction;

        // mouse repulsion
        var awayX=p.pos.x-mx;
        var awayY=p.pos.y-my;
        var distSq=awayX*awayX+awayY*awayY;
        if(distSq>0.1&&distSq<cfg.repel_radius*cfg.repel_radius){
          var dist=sqrt(distSq);
          var len=Math.max(0.001,dist);
          var normX=awayX/len;
          var normY=awayY/len;
          var repel=cfg.repel_strength*(1-dist/cfg.repel_radius);
          p.vel.x+=normX*repel;
          p.vel.y+=normY*repel;
        }

        // damping and move
        p.vel.x*=cfg.damping;
        p.vel.y*=cfg.damping;
        p.pos.x+=p.vel.x;
        p.pos.y+=p.vel.y;

        // draw point
        ctx.beginPath();
        ctx.arc(cx+p.pos.x,cy+p.pos.y,cfg.point_size,0,Math.PI*2);
        ctx.fill();
      }

      angle+=0.01;
      _t+=0.016;
    },
    activate:function(){
      _active=true;
      if(_needsReset){initPoints();_needsReset=false;}
    },
    deactivate:function(){
      _active=false;
    },
    reset:function(){
      initPoints();
    },
    triggerPulse:function(){
      if(cfg.pulse_type==='burst'){
        // scatter particles
        for(var i=0;i<points.length;i++){
          points[i].vel.x+=(Math.random()-0.5)*cfg.pulse_strength*2;
          points[i].vel.y+=(Math.random()-0.5)*cfg.pulse_strength*2;
        }
      } else if(cfg.pulse_type==='reset'){
        initPoints();
      }
    },
    markReset:function(){
      _needsReset=true;
    }
  };

  return ENG;
})();
window.Engine_Sphere=Engine_Sphere;
