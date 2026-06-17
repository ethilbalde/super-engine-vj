/* ═══════════════════════════════════════════
   TREES ENGINE — Procedural Branch Growth
═══════════════════════════════════════════ */
var Engine_Trees=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var trees=[],_t=0,frameCount=0,_needsReset=false;
  var maxlife=15;

  var cfg={
    canvas_width:800,canvas_height:600,
    num_trees_h:8,num_trees_v:3,
    max_life:15,max_generations:4,
    base_hue:40,hue_variation:30,
    bg_color:'#281a33',
    shadow_opacity:0.15,light_opacity:0.8,dark_opacity:0.6,
    pen_size:80,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,
    bpm:120,time_mode:'bpm',pulse_beat_div:1
  };

  function Vec2(x,y){this.x=x||0;this.y=y||0;}
  Vec2.prototype.copy=function(){return new Vec2(this.x,this.y);};
  Vec2.prototype.add=function(v){this.x+=v.x;this.y+=v.y;return this;};

  function Branch(start,stw,angle,gen,treeIndex){
    this.position=start.copy();
    this.stw=stw;
    this.gen=gen;
    this.alive=true;
    this.age=0;
    this.angle=angle;
    this.speed=new Vec2(0,-3);
    this.treeIndex=treeIndex;
    this.maxlife=cfg.max_life*(0.3+Math.random()*0.5);
    this.proba1=trees[treeIndex].proba1;
    this.proba2=trees[treeIndex].proba2;
    this.proba3=trees[treeIndex].proba3;
    this.proba4=trees[treeIndex].proba4;
    this.deviation=0.2+Math.random()*0.5;
  }

  Branch.prototype.grow=function(){
    if(this.age>=this.maxlife/this.gen||Math.random()<0.05*this.gen){
      this.alive=false;
      if(this.stw>0.2){
        var brs=trees[this.treeIndex].branches;
        if(Math.random()<this.proba1/this.gen)
          brs.push(new Branch(this.position.copy(),this.stw*(0.2+Math.random()*0.8),
            this.angle+(0.7+Math.random()*0.4)*this.deviation,this.gen+0.1,this.treeIndex));
        if(Math.random()<this.proba2/this.gen)
          brs.push(new Branch(this.position.copy(),this.stw*(0.2+Math.random()*0.8),
            this.angle-(0.7+Math.random()*0.4)*this.deviation,this.gen+0.1,this.treeIndex));
        if(Math.random()<this.proba3/this.gen)
          brs.push(new Branch(this.position.copy(),this.stw*(0.5+Math.random()*0.3),
            this.angle+(0.2+Math.random()*0.8)*this.deviation,this.gen+0.1,this.treeIndex));
        if(Math.random()<this.proba4/this.gen)
          brs.push(new Branch(this.position.copy(),this.stw*(0.5+Math.random()*0.3),
            this.angle-(0.2+Math.random()*0.8)*this.deviation,this.gen+0.1,this.treeIndex));
      }
    } else {
      this.speed.x+=(-0.5+Math.random());
      this.age++;
    }
  };

  Branch.prototype.display=function(){
    var st=trees[this.treeIndex].start;
    var x0=this.position.x;
    var y0=this.position.y;
    var c=cfg.max_life/this.maxlife;

    var cos_a=Math.cos(this.angle);
    var sin_a=Math.sin(this.angle);
    this.position.x+=-this.speed.x*cos_a+this.speed.y*sin_a;
    this.position.y+=this.speed.x*sin_a+this.speed.y*cos_a;

    var dis=0.005*Math.pow(Math.max(0,st.y-y0),1.8);
    var stw_shadow=map(this.age,0,this.maxlife,this.stw*1.3,this.stw*0.9);
    var stw_main=map(this.age,0,this.maxlife,this.stw,this.stw*0.6);

    var t=trees[this.treeIndex];
    var hue=(t.teinte+this.age+10*this.gen)%360;

    ctx.strokeStyle=hslToRgba(hue,0,0,cfg.shadow_opacity);
    ctx.lineWidth=stw_shadow;
    ctx.beginPath();
    ctx.moveTo(x0+dis*0.8,2*st.y-y0+dis*0.8);
    ctx.lineTo(this.position.x+dis*0.8,2*st.y-this.position.y+dis*0.8);
    ctx.stroke();

    var hue2=(t.teinte+this.age+20*this.gen)%360;
    ctx.strokeStyle=hslToRgba(hue2,150*c,200+20*this.gen,cfg.light_opacity);
    ctx.lineWidth=stw_main;
    ctx.beginPath();
    ctx.moveTo(x0+0.1*this.stw,y0);
    ctx.lineTo(this.position.x+0.1*this.stw,this.position.y);
    ctx.stroke();

    ctx.strokeStyle=hslToRgba(hue2,100*c,50+20*this.gen,cfg.dark_opacity);
    ctx.lineWidth=stw_main;
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(this.position.x,this.position.y);
    ctx.stroke();
  };

  function Tree(start,coeff,index){
    this.branches=[];
    this.start=start;
    this.coeff=coeff;
    this.teinte=Math.random()*cfg.hue_variation;
    this.index=index;
    this.proba1=0.8+Math.random()*0.2;
    this.proba2=0.8+Math.random()*0.2;
    this.proba3=0.4+Math.random()*0.1;
    this.proba4=0.4+Math.random()*0.1;
  }

  Tree.prototype.grow=function(){
    for(var i=0;i<this.branches.length;i++){
      var b=this.branches[i];
      if(b.alive){
        b.grow();
        b.display();
      }
    }
  };

  function createTree(i,j){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var nh=cfg.num_trees_h,nv=cfg.num_trees_v;
    var x=0.1*W+i*Math.floor(0.9*W/nh);
    var y=Math.floor(0.2*H+j*Math.floor(0.8*H/nv));
    var start=new Vec2(x,y);
    var tree=new Tree(start,start.y/(H-130),i+j*nh);
    tree.branches[0]=new Branch(start,15*Math.sqrt(start.y/H),0,1,i+j*nh);
    trees[i+j*nh]=tree;
  };

  function map(val,a,b,c,d){
    return c+(d-c)*(val-a)/(b-a);
  }

  function hslToRgba(h,s,l,a){
    h=h%360;
    s=Math.min(100,Math.max(0,s));
    l=Math.min(100,Math.max(0,l));
    var c=(1-Math.abs(2*l/100-1))*s/100;
    var x=c*(1-Math.abs((h/60)%2-1));
    var m=l/100-c/2;
    var r,g,b;
    if(h<60){r=c;g=x;b=0;}
    else if(h<120){r=x;g=c;b=0;}
    else if(h<180){r=0;g=c;b=x;}
    else if(h<240){r=0;g=x;b=c;}
    else if(h<300){r=x;g=0;b=c;}
    else{r=c;g=0;b=x;}
    r=Math.round((r+m)*255);g=Math.round((g+m)*255);b=Math.round((b+m)*255);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  var ENG={
    cfg:cfg,
    init:function(){
      canvas=document.getElementById('c');
      if(!canvas||!canvas.getContext)return;
      ctx=canvas.getContext('2d');
      reset();
    },
    draw:function(){
      if(!ctx)return;
      ctx.fillStyle=cfg.bg_color;
      ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
      for(var i=0;i<cfg.num_trees_h*cfg.num_trees_v;i++){
        if(trees[i])trees[i].grow();
      }
      _t+=0.016;
    },
    activate:function(){
      _active=true;
      if(_needsReset){reset();_needsReset=false;}
    },
    deactivate:function(){
      _active=false;
    },
    reset:function(){
      reset();
    },
    triggerPulse:function(){
      if(cfg.pulse_type==='reset'){
        reset();
      }
    },
    markReset:function(){
      _needsReset=true;
    }
  };

  function reset(){
    trees=[];
    for(var i=0;i<cfg.num_trees_h;i++){
      for(var j=0;j<cfg.num_trees_v;j++){
        createTree(i,j);
      }
    }
    if(ctx){
      ctx.fillStyle=cfg.bg_color;
      ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
    }
  }

  return ENG;
})();
window.Engine_Trees=Engine_Trees;
