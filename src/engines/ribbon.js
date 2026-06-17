/* ═══════════════════════════════════════════
   RIBBON ENGINE — Ribbon Trail Particles
═══════════════════════════════════════════ */
var Engine_Ribbon=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var ribbons=[],_t=0,frameCount=0,lastPulseTime=0,_needsReset=false;
  var _opacity=0.90;

  var cfg={
    canvas_width:800,canvas_height:600,
    count:120,speed:3.0,trail_len:30,width:4.0,connect_dist:80,turb:1.0,
    fade:0.18,pen_size:60,push_force:1.0,
    bg_color:'#000000',color_head:'#ff66aa',color_tail:'#6622aa',color_thread:'#ff44aa',
    pulse_enabled:false,pulse_interval:3.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function noise(x,y,t){return Math.sin(x*0.012+t*0.7)*Math.cos(y*0.009+t*0.5)+Math.sin((x+y)*0.008+t*1.1)*0.5;}

  function Ribbon(){this.x=0;this.y=0;this.vx=0;this.vy=0;this.history=[];this.reset();}
  Ribbon.prototype.reset=function(){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    this.x=Math.random()*W;this.y=Math.random()*H;
    this.vx=(Math.random()-0.5)*2;this.vy=(Math.random()-0.5)*2;
    this.history=[];
  };
  Ribbon.prototype.update=function(t){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    var angle=noise(this.x,this.y,t)*Math.PI*2*cfg.turb;
    var spd=cfg.speed;
    this.vx=this.vx*0.85+Math.cos(angle)*spd*0.15;
    this.vy=this.vy*0.85+Math.sin(angle)*spd*0.15;
    /* cursor influence — répulsion + tourbillon autour du curseur */
    if(mouse.down){
      var dx=this.x-mouse.x,dy=this.y-mouse.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      if(d<cfg.pen_size){
        var f=(1-d/cfg.pen_size)*cfg.push_force;
        /* radiale — repousse loin du curseur */
        this.vx+=dx/d*f*1.4;this.vy+=dy/d*f*1.4;
        /* tangentielle — rotation autour du curseur */
        this.vx+=-dy/d*f*1.1;this.vy+=dx/d*f*1.1;
      }
    }
    var spdCap=spd*3;
    var spd2=Math.sqrt(this.vx*this.vx+this.vy*this.vy);if(spd2>spdCap){this.vx=this.vx/spd2*spdCap;this.vy=this.vy/spd2*spdCap;}
    this.history.push({x:this.x,y:this.y});
    if(this.history.length>cfg.trail_len)this.history.shift();
    this.x+=this.vx;this.y+=this.vy;
    if(this.x<-20)this.x=W+10;if(this.x>W+20)this.x=-10;
    if(this.y<-20)this.y=H+10;if(this.y>H+20)this.y=-10;
  };

  function hexToRgb(h){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return [r,g,b];}

  function _reset(){
    ribbons=[];for(var i=0;i<cfg.count;i++){var r=new Ribbon();ribbons.push(r);}
    _t=0;frameCount=0;
  }
  function init(){_reset();}

  function triggerPulse(){
    ribbons.forEach(function(r){r.vx+=(Math.random()-0.5)*8;r.vy+=(Math.random()-0.5)*8;});
    lastPulseTime=_t;
    var bar=document.getElementById('rbpulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    var W=cfg.canvas_width,H=cfg.canvas_height;
    _t+=0.016;frameCount++;

    /* pulse timing */
    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();

    /* resize check */
    if(canvas.width!==W){cfg.canvas_width=canvas.width;}
    if(canvas.height!==H){cfg.canvas_height=canvas.height;}

    /* fade bg */
    ctx.fillStyle='rgba('+hexToRgb(cfg.bg_color).join(',')+','+cfg.fade+')';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    /* update */
    ribbons.forEach(function(r){r.update(_t);});

    /* draw connection threads */
    if(cfg.connect_dist>0){
      var hRgb=hexToRgb(cfg.color_thread);
      for(var i=0;i<ribbons.length;i++){
        for(var j=i+1;j<ribbons.length;j++){
          var dx=ribbons[i].x-ribbons[j].x,dy=ribbons[i].y-ribbons[j].y;
          var d=Math.sqrt(dx*dx+dy*dy);
          if(d<cfg.connect_dist){
            var a=(1-d/cfg.connect_dist)*0.18*_opacity;
            ctx.beginPath();ctx.moveTo(ribbons[i].x,ribbons[i].y);ctx.lineTo(ribbons[j].x,ribbons[j].y);
            ctx.strokeStyle='rgba('+hRgb[0]+','+hRgb[1]+','+hRgb[2]+','+a+')';
            ctx.lineWidth=0.5;ctx.stroke();
          }
        }
      }
    }

    /* draw ribbon trails */
    var headRgb=hexToRgb(cfg.color_head),tailRgb=hexToRgb(cfg.color_tail);
    var wrapThX=cfg.canvas_width*0.4,wrapThY=cfg.canvas_height*0.4;
    ribbons.forEach(function(r){
      var h=r.history;if(h.length<2)return;
      for(var i=1;i<h.length;i++){
        /* skip segment si wrap-around (saut d'un bord à l'autre) */
        if(Math.abs(h[i].x-h[i-1].x)>wrapThX||Math.abs(h[i].y-h[i-1].y)>wrapThY)continue;
        var prog=i/h.length;
        var ri=Math.round(tailRgb[0]+(headRgb[0]-tailRgb[0])*prog);
        var gi=Math.round(tailRgb[1]+(headRgb[1]-tailRgb[1])*prog);
        var bi=Math.round(tailRgb[2]+(headRgb[2]-tailRgb[2])*prog);
        var al=prog*_opacity*0.85;
        var w=cfg.width*prog;
        ctx.beginPath();ctx.moveTo(h[i-1].x,h[i-1].y);ctx.lineTo(h[i].x,h[i].y);
        ctx.strokeStyle='rgba('+ri+','+gi+','+bi+','+al+')';
        ctx.lineWidth=w;ctx.lineCap='round';ctx.stroke();
      }
    });
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(ribbons.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}
  Object.defineProperty(cfg,'opacity',{get:function(){return _opacity;},set:function(v){_opacity=v;}});
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

