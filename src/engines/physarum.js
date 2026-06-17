/* ═══════════════════════════════════════════
   PHYSARUM ENGINE
═══════════════════════════════════════════ */
var Engine_Physarum=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var phero,agentX,agentY,agentAngle;
  var GW,GH;/* grid dimensions (downscaled) */
  var SCALE=2;/* render at 1/SCALE resolution for performance */
  var lastPulseTime=0;
  var cfg={
    canvas_width:800,canvas_height:600,
    agent_count:100000,agent_speed:1.8,
    sensor_angle:15,sensor_distance:10,rotation_angle:30,
    deposit_amount:4.0,decay_rate:0.723,diffuse_rate:0.75,
    color_mode:'pheromone',color_low:'#000000',color_high:'#ffffff',bg_color:'#050505',
    opacity:1.0,
    pointer_mode:'attract',pen_size:60,push_force:1.0,
    pulse_enabled:false,pulse_interval:2.0,pulse_strength:1.0,pulse_type:'ring',
    bpm:120,time_mode:'bpm',pulse_beat_div:1,
    hue_shift_enabled:false,hue_shift:0,hue_speed:30,hue_beat_div:1
  };
  function initArrays(){
    GW=Math.floor(cfg.canvas_width/SCALE);GH=Math.floor(cfg.canvas_height/SCALE);
    phero=new Float32Array(GW*GH);
    agentX=new Float32Array(cfg.agent_count);agentY=new Float32Array(cfg.agent_count);agentAngle=new Float32Array(cfg.agent_count);
    for(var i=0;i<cfg.agent_count;i++){var a=Math.random()*Math.PI*2,r=Math.random()*Math.min(GW,GH)*0.2;agentX[i]=GW/2+Math.cos(a)*r;agentY[i]=GH/2+Math.sin(a)*r;agentAngle[i]=a+Math.PI;}
  }
  function senseAt(x,y){var xi=Math.round(x)|0,yi=Math.round(y)|0;if(xi<0||xi>=GW||yi<0||yi>=GH)return 0;return phero[yi*GW+xi];}
  function stepAgents(){
    var sa=cfg.sensor_angle*Math.PI/180,sd=cfg.sensor_distance,ra=cfg.rotation_angle*Math.PI/180,spd=cfg.agent_speed;
    for(var i=0;i<cfg.agent_count;i++){
      var x=agentX[i],y=agentY[i],a=agentAngle[i];
      var fwd=senseAt(x+Math.cos(a)*sd,y+Math.sin(a)*sd),lft=senseAt(x+Math.cos(a-sa)*sd,y+Math.sin(a-sa)*sd),rgt=senseAt(x+Math.cos(a+sa)*sd,y+Math.sin(a+sa)*sd);
      if(fwd>lft&&fwd>rgt){}else if(fwd<lft&&fwd<rgt)a+=(Math.random()>.5?1:-1)*ra;else if(lft>rgt)a-=ra;else if(rgt>lft)a+=ra;
      x+=Math.cos(a)*spd;y+=Math.sin(a)*spd;
      if(x<0)x+=GW;if(x>=GW)x-=GW;if(y<0)y+=GH;if(y>=GH)y-=GH;
      agentX[i]=x;agentY[i]=y;agentAngle[i]=a;
      var xi=Math.round(x)|0,yi=Math.round(y)|0;
      if(xi>=0&&xi<GW&&yi>=0&&yi<GH)phero[yi*GW+xi]+=cfg.deposit_amount;
    }
  }
  function diffuseDecay(){
    var next=new Float32Array(GW*GH),d=cfg.diffuse_rate,dc=cfg.decay_rate;
    for(var y=1;y<GH-1;y++)for(var x=1;x<GW-1;x++){var i=y*GW+x,avg=(phero[i]+phero[i-1]+phero[i+1]+phero[i-GW]+phero[i+GW])/5;next[i]=(phero[i]*(1-d)+avg*d)*dc;}
    phero=next;
  }
  var _offCanvas=null,_offCtx=null;
  function renderPhero(){
    if(!_offCanvas||_offCanvas.width!==GW||_offCanvas.height!==GH){_offCanvas=document.createElement('canvas');_offCanvas.width=GW;_offCanvas.height=GH;_offCtx=_offCanvas.getContext('2d');}
    var img=_offCtx.createImageData(GW,GH);
    var ch=hexToRgb(cfg.color_high),cl=hexToRgb(cfg.color_low);
    /* gamma curve: sqrt makes low-pheromone regions more visible, reducing grain */
    for(var i=0;i<GW*GH;i++){var t=Math.sqrt(Math.min(1,phero[i]/8)),idx=i*4;img.data[idx]=cl.r+(ch.r-cl.r)*t;img.data[idx+1]=cl.g+(ch.g-cl.g)*t;img.data[idx+2]=cl.b+(ch.b-cl.b)*t;img.data[idx+3]=255;}
    _offCtx.putImageData(img,0,0);
    /* bilinear upscale → smooth, no pixel grain */
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(_offCanvas,0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function triggerPulse(){var W=GW,H=GH,cx=W/2,cy=H/2;if(cfg.pulse_type==='ring'){var r=Math.min(W,H)*0.3;for(var a=0;a<Math.PI*2;a+=0.05){var x=Math.round(cx+Math.cos(a)*r)|0,y=Math.round(cy+Math.sin(a)*r)|0;if(x>=0&&x<W&&y>=0&&y<H)phero[y*W+x]+=500;}}else if(cfg.pulse_type==='clear'){phero=new Float32Array(W*H);}else{var ri=Math.round(r=Math.min(W,H)*0.1);for(var i=-ri;i<=ri;i++)for(var j=-ri;j<=ri;j++){var x=Math.round(cx+i)|0,y=Math.round(cy+j)|0;if(x>=0&&x<W&&y>=0&&y<H)phero[y*W+x]+=300;}}}
  function draw(){
    if(!_active)return;
    if(mouse.down){
      var mx=mouse.x/SCALE,my=mouse.y/SCALE,pr=cfg.pen_size/SCALE,pr2=pr*pr,pm=cfg.pointer_mode;
      /* bounding box → no need to scan all GW*GH cells */
      var x0=Math.max(0,Math.floor(mx-pr)),x1=Math.min(GW-1,Math.ceil(mx+pr));
      var y0=Math.max(0,Math.floor(my-pr)),y1=Math.min(GH-1,Math.ceil(my+pr));
      for(var py=y0;py<=y1;py++){for(var px=x0;px<=x1;px++){
        var dx=px-mx,dy=py-my,d2=dx*dx+dy*dy;
        if(d2>=pr2)continue;
        var idx=py*GW+px;
        var fall=1-d2/pr2;/* radial falloff: 1 at centre, 0 at edge */
        if(pm==='attract'&&!window._cursorHidden)phero[idx]+=fall*cfg.push_force*1.5;
        else if(pm==='deposit'&&!window._cursorHidden)phero[idx]+=fall*cfg.push_force*6;
        else if(pm==='repulse')phero[idx]=Math.max(0,phero[idx]-fall*cfg.push_force*4);
        else if(pm==='erase')phero[idx]=0;
      }}
      /* "repulse" doit aussi déplacer les agents eux-mêmes — sinon ceux déjà entrés dans
         la zone n'ont plus aucun gradient de phéromone pour en ressortir et s'y figent */
      if(pm==='repulse'){
        var pf=cfg.push_force;
        for(var ai=0;ai<cfg.agent_count;ai++){
          var adx=agentX[ai]-mx,ady=agentY[ai]-my,ad2=adx*adx+ady*ady;
          if(ad2<pr2&&ad2>0.0001){
            var ad=Math.sqrt(ad2),afall=1-ad2/pr2,push=afall*pf*1.6;
            agentX[ai]+=adx/ad*push;agentY[ai]+=ady/ad*push;
            agentAngle[ai]=Math.atan2(ady,adx)+(Math.random()-0.5)*0.3;
            if(agentX[ai]<0)agentX[ai]+=GW;if(agentX[ai]>=GW)agentX[ai]-=GW;
            if(agentY[ai]<0)agentY[ai]+=GH;if(agentY[ai]>=GH)agentY[ai]-=GH;
          }
        }
      }
    }
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}
    stepAgents();diffuseDecay();renderPhero();
  }
  var _needsReset=false;
  function init(){canvas=document.getElementById('c');ctx=canvas.getContext('2d');cfg.canvas_width=FluidSim.cfg.canvas_width;cfg.canvas_height=FluidSim.cfg.canvas_height;initArrays();}
  function activate(){_active=true;var cv=document.getElementById('c');cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;if(!phero||GW!==Math.floor(cfg.canvas_width/SCALE)||_needsReset){_needsReset=false;initArrays();}}
  function deactivate(){_active=false;}
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:initArrays,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

