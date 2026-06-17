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
    shape:0,shape_list:['SPHERE','CUBE','TORUS','WAVE','SPIRAL'],
    pen_size:80,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_type:'burst',pulse_strength:1.0,
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
    var shape=cfg.shape_list[cfg.shape]||cfg.shape_list[0];
    for(var i=0;i<points.length;i++){
      var p=points[i];
      var idx=p.index;
      var t=idx/cfg.particle_count*Math.PI*2;
      var u=idx/cfg.particle_count;

      if(shape==='CUBE'){
        var side=Math.floor(idx/(cfg.particle_count/6));
        var local=idx%(cfg.particle_count/6);
        var x=Math.sin(local*Math.PI*2)*(0.5+0.5*Math.cos(angle*0.5));
        var y=Math.cos(local*Math.PI*2)*(0.5+0.5*sin(angle*0.5));
        p.targetx=x*cfg.radius;
        p.targety=y*cfg.radius;
      } else if(shape==='TORUS'){
        var theta=t+angle;
        var phi=u*Math.PI*2;
        p.targetx=(cfg.radius*0.6+cfg.radius*0.3*cos(phi))*sin(theta);
        p.targety=(cfg.radius*0.6+cfg.radius*0.3*cos(phi))*cos(theta);
      } else if(shape==='WAVE'){
        p.targetx=sin(t+angle)*sin(u*Math.PI*4)*cfg.radius;
        p.targety=cos(u*Math.PI*2+angle*0.3)*cfg.radius;
      } else if(shape==='SPIRAL'){
        var r=cfg.radius*(0.3+0.7*u);
        var theta=u*Math.PI*12+angle;
        p.targetx=sin(theta)*r;
        p.targety=cos(theta)*r;
      } else {
        // SPHERE par défaut
        var sinIdxSq=Math.sin(idx*idx);
        var cosIdxSq=Math.cos(idx*idx);
        p.targetx=Math.sin(idx+angle)*sinIdxSq*cfg.radius;
        p.targety=cosIdxSq*cfg.radius;
      }
    }
  }

  function sin(x){return Math.sin(x);}
  function cos(x){return Math.cos(x);}
  function sqrt(x){return Math.sqrt(x);}

  var lastPulseTime=0;
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
      var now=_t;
      var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
      if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){ENG.triggerPulse();lastPulseTime=now;}

      // mouse spawn interaction
      if(mouse.down){
        for(var k=0;k<Math.max(1,Math.round(cfg.push_force*10));k++){
          var dx=(Math.random()-0.5)*cfg.pen_size;
          var dy=(Math.random()-0.5)*cfg.pen_size;
          if(points.length<cfg.particle_count){
            var np=new Point(points.length);
            np.pos.x=mx+dx;
            np.pos.y=my+dy;
            points.push(np);
          }
        }
      }

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
    triggerPulse:function(){
      if(cfg.pulse_type==='burst'){
        for(var i=0;i<points.length;i++){
          var p=points[i];
          var dx=p.pos.x;
          var dy=p.pos.y;
          var d=Math.sqrt(dx*dx+dy*dy)||1;
          if(d>0){p.vel.x+=dx/d*cfg.pulse_strength*8;p.vel.y+=dy/d*cfg.pulse_strength*8;}
        }
      } else if(cfg.pulse_type==='reset'){
        initPoints();
      }
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
