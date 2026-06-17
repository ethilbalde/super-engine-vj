/* ═══════════════════════════════════════════
   ACO ENGINE  (Ant Colony Optimization)
═══════════════════════════════════════════ */
var Engine_ACO=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false,_needsReset=false;
  var frameCount=0,lastPulseTime=0;
  var SCALE=2,GW,GH;
  var pheroFood,pheroNest;       /* two pheromone grids */
  var antX,antY,antAngle,antState; /* state: 0=searching 1=returning */
  var nests=[],foods=[];
  var _placeCooldown=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    ant_count:3000,nest_count:2,food_count:5,
    ant_speed:1.5,
    sensor_angle:45,sensor_distance:8,rotation_angle:40,
    deposit_food:8.0,   /* deposited while returning (marks path to food) */
    deposit_nest:3.0,   /* deposited while searching (marks path to nest) */
    evaporation:0.97,diffuse_rate:0.3,
    wander:0.25,        /* probability of random turn per step */
    food_radius:18,nest_radius:22, /* screen pixels */
    bg_color:'#050505',color_food:'#00ff88',color_nest:'#ff8800',
    pointer_mode:'food',pen_size:30,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_type:'scatter',pulse_strength:1.0,
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };

  function senseAt(grid,x,y,angle,dist){
    var sx=Math.round(x+Math.cos(angle)*dist)|0,sy=Math.round(y+Math.sin(angle)*dist)|0;
    if(sx<0||sx>=GW||sy<0||sy>=GH)return 0;
    return grid[sy*GW+sx];
  }

  function stepAnts(){
    var sa=cfg.sensor_angle*Math.PI/180,ra=cfg.rotation_angle*Math.PI/180;
    var sd=cfg.sensor_distance,spd=cfg.ant_speed,wr=cfg.wander;
    var fr=cfg.food_radius/SCALE,nr=cfg.nest_radius/SCALE;
    var fr2=fr*fr,nr2=nr*nr;
    for(var i=0;i<cfg.ant_count;i++){
      var x=antX[i],y=antY[i],a=antAngle[i],st=antState[i];
      /* searching ants follow pheroFood; returning ants follow pheroNest */
      var grid=st===0?pheroFood:pheroNest;
      var fwd=senseAt(grid,x,y,a,sd);
      var lft=senseAt(grid,x,y,a-sa,sd);
      var rgt=senseAt(grid,x,y,a+sa,sd);
      if(Math.random()<wr){a+=(Math.random()-.5)*ra*3;}
      else if(fwd>=lft&&fwd>=rgt){}
      else if(fwd<lft&&fwd<rgt){a+=(Math.random()>.5?1:-1)*ra;}
      else if(lft>rgt){a-=ra;}
      else{a+=ra;}
      x+=Math.cos(a)*spd;y+=Math.sin(a)*spd;
      if(x<0)x+=GW;if(x>=GW)x-=GW;if(y<0)y+=GH;if(y>=GH)y-=GH;
      /* deposit pheromone */
      var xi=Math.round(x)|0,yi=Math.round(y)|0;
      if(xi>=0&&xi<GW&&yi>=0&&yi<GH){
        if(st===0)pheroNest[yi*GW+xi]+=cfg.deposit_nest;
        else pheroFood[yi*GW+xi]+=cfg.deposit_food;
      }
      /* state transitions */
      if(st===0){
        for(var f=0;f<foods.length;f++){var dx=x-foods[f].x,dy=y-foods[f].y;if(dx*dx+dy*dy<fr2){antState[i]=1;a+=Math.PI+(Math.random()-.5)*.5;break;}}
      } else {
        for(var n=0;n<nests.length;n++){var dx=x-nests[n].x,dy=y-nests[n].y;if(dx*dx+dy*dy<nr2){antState[i]=0;a+=Math.PI+(Math.random()-.5)*.5;break;}}
      }
      antX[i]=x;antY[i]=y;antAngle[i]=a;
    }
  }

  function diffuseDecay(){
    var d=cfg.diffuse_rate,dc=cfg.evaporation;
    var nF=new Float32Array(GW*GH),nN=new Float32Array(GW*GH);
    for(var y=1;y<GH-1;y++)for(var x=1;x<GW-1;x++){
      var i=y*GW+x;
      var aF=(pheroFood[i]+pheroFood[i-1]+pheroFood[i+1]+pheroFood[i-GW]+pheroFood[i+GW])/5;
      var aN=(pheroNest[i]+pheroNest[i-1]+pheroNest[i+1]+pheroNest[i-GW]+pheroNest[i+GW])/5;
      nF[i]=(pheroFood[i]*(1-d)+aF*d)*dc;
      nN[i]=(pheroNest[i]*(1-d)+aN*d)*dc;
    }
    pheroFood=nF;pheroNest=nN;
  }

  var _offC=null,_offX=null;
  function render(){
    if(!_offC||_offC.width!==GW||_offC.height!==GH){_offC=document.createElement('canvas');_offC.width=GW;_offC.height=GH;_offX=_offC.getContext('2d');}
    var img=_offX.createImageData(GW,GH);
    var cf=hexToRgb(cfg.color_food),cn=hexToRgb(cfg.color_nest),cb=hexToRgb(cfg.bg_color);
    for(var i=0;i<GW*GH;i++){
      var tf=Math.sqrt(Math.min(1,pheroFood[i]/20)),tn=Math.sqrt(Math.min(1,pheroNest[i]/20));
      var idx=i*4;
      img.data[idx  ]=Math.min(255,cb.r+(cf.r-cb.r)*tf+(cn.r-cb.r)*tn);
      img.data[idx+1]=Math.min(255,cb.g+(cf.g-cb.g)*tf+(cn.g-cb.g)*tn);
      img.data[idx+2]=Math.min(255,cb.b+(cf.b-cb.b)*tf+(cn.b-cb.b)*tn);
      img.data[idx+3]=255;
    }
    _offX.putImageData(img,0,0);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(_offC,0,0,cfg.canvas_width,cfg.canvas_height);
    /* draw nests and food icons */
    var sx=cfg.canvas_width/GW,sy=cfg.canvas_height/GH;
    ctx.save();
    if(!window._cursorHidden){
      for(var n=0;n<nests.length;n++){
        var nx=nests[n].x*sx,ny=nests[n].y*sy,nr=cfg.nest_radius;
        ctx.beginPath();ctx.arc(nx,ny,nr,0,Math.PI*2);
        ctx.strokeStyle='rgba(255,136,0,0.6)';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='rgba(255,136,0,0.12)';ctx.fill();
        ctx.fillStyle='rgba(255,136,0,0.8)';ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('N',nx,ny);
      }
      for(var f=0;f<foods.length;f++){
        var fx=foods[f].x*sx,fy=foods[f].y*sy,fr=cfg.food_radius*.7;
        ctx.beginPath();ctx.arc(fx,fy,fr,0,Math.PI*2);
        ctx.fillStyle='rgba(0,255,136,0.9)';ctx.fill();
        ctx.fillStyle='#000';ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('F',fx,fy);
      }
    }
    ctx.restore();
  }

  function _reset(){
    GW=Math.floor(cfg.canvas_width/SCALE);GH=Math.floor(cfg.canvas_height/SCALE);
    pheroFood=new Float32Array(GW*GH);pheroNest=new Float32Array(GW*GH);
    /* place nests symmetrically */
    nests=[];
    var nc=Math.max(1,cfg.nest_count);
    for(var n=0;n<nc;n++){
      nests.push({x:Math.floor(GW*(0.2+n*(0.6/(nc-1||1)))),y:Math.floor(GH*0.5)});
    }
    /* place food randomly, avoiding nests */
    foods=[];
    for(var f=0;f<cfg.food_count;f++){
      foods.push({x:Math.floor(GW*0.1+Math.random()*GW*0.8),y:Math.floor(GH*0.1+Math.random()*GH*0.8)});
    }
    /* spawn ants at nests */
    antX=new Float32Array(cfg.ant_count);antY=new Float32Array(cfg.ant_count);
    antAngle=new Float32Array(cfg.ant_count);antState=new Uint8Array(cfg.ant_count);
    for(var i=0;i<cfg.ant_count;i++){
      var nest=nests[i%nests.length];
      antX[i]=nest.x+(Math.random()-.5)*8;antY[i]=nest.y+(Math.random()-.5)*8;
      antAngle[i]=Math.random()*Math.PI*2;antState[i]=0;
    }
    lastPulseTime=0;_placeCooldown=0;
  }

  function triggerPulse(){
    if(cfg.pulse_type==='scatter'){
      for(var i=0;i<cfg.ant_count;i++){var nest=nests[i%nests.length];antX[i]=nest.x+(Math.random()-.5)*20;antY[i]=nest.y+(Math.random()-.5)*20;antAngle[i]=Math.random()*Math.PI*2;antState[i]=0;}
    } else if(cfg.pulse_type==='add_food'){
      foods.push({x:Math.floor(GW*0.1+Math.random()*GW*0.8),y:Math.floor(GH*0.1+Math.random()*GH*0.8)});
    } else if(cfg.pulse_type==='clear_phero'){
      pheroFood=new Float32Array(GW*GH);pheroNest=new Float32Array(GW*GH);
    }
  }

  function draw(){
    if(!_active)return;frameCount++;
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    if(_placeCooldown>0)_placeCooldown--;
    if(mouse.down){
      var mx=mouse.x/SCALE,my=mouse.y/SCALE,pr=cfg.pen_size/SCALE,pr2=pr*pr;
      if(cfg.pointer_mode==='erase'){
        /* erase runs every frame — no throttle */
        foods=foods.filter(function(fd){var dx=fd.x-mx,dy=fd.y-my;return dx*dx+dy*dy>pr2;});
        nests=nests.filter(function(n){var dx=n.x-mx,dy=n.y-my;return dx*dx+dy*dy>pr2;});
      } else if(cfg.pointer_mode==='scatter'){
        for(var i=0;i<cfg.ant_count;i++){var dx=antX[i]-mx,dy=antY[i]-my;if(dx*dx+dy*dy<pr2)antAngle[i]=Math.random()*Math.PI*2;}
      } else if(_placeCooldown===0){
        /* food/nest placement throttled to avoid spam */
        if(cfg.pointer_mode==='food'){foods.push({x:Math.floor(mx),y:Math.floor(my)});_placeCooldown=15;}
        else if(cfg.pointer_mode==='nest'){nests.push({x:Math.floor(mx),y:Math.floor(my)});_placeCooldown=20;}
      }
    }
    stepAnts();diffuseDecay();render();
  }

  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;_reset();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(!antX||antX.length===0||_needsReset){_needsReset=false;_reset();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

