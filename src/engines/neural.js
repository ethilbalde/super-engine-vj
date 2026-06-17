/* ═══════════════════════════════════════════
   NEURAL ENGINE — Neural Network Pulses
═══════════════════════════════════════════ */
var Engine_Neural=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var nodes=[],edges=[],pulses=[],_t=0,frameCount=0,lastPulseTime=0,_needsReset=false;
  var _fade=0.18;

  var cfg={
    canvas_width:800,canvas_height:600,
    count:120,density:0.05,threshold:0.5,refractory:90,pulse_speed:2.5,fanout:3,
    pen_size:60,
    bg_color:'#03080f',color_node:'#1a3a6a',color_active:'#44eeff',
    color_edge:'#0a2040',color_pulse:'#ffffff',
    pulse_enabled:false,pulse_interval:4.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

  function buildNetwork(){
    nodes=[];edges=[];pulses=[];
    var W=cfg.canvas_width,H=cfg.canvas_height;
    for(var i=0;i<cfg.count;i++){
      nodes.push({x:Math.random()*W,y:Math.random()*H,charge:0,refrac:0,glow:0});
    }
    /* build edges by proximity */
    var maxEdgeDist=Math.sqrt(W*W+H*H)*0.25;
    for(var a=0;a<nodes.length;a++){
      for(var b=a+1;b<nodes.length;b++){
        if(Math.random()>cfg.density)continue;
        var dx=nodes[a].x-nodes[b].x,dy=nodes[a].y-nodes[b].y;
        var d=Math.sqrt(dx*dx+dy*dy);
        if(d<maxEdgeDist)edges.push({a:a,b:b,len:d});
      }
    }
  }

  function _reset(){buildNetwork();_t=0;frameCount=0;}
  function init(){_reset();}

  /* Active uniquement le nœud LE PLUS PROCHE du point cliqué */
  function activateClosest(mx,my,radius){
    var best=-1,bestD=Infinity;
    nodes.forEach(function(n,i){
      if(n.refrac>0)return;
      var dx=n.x-mx,dy=n.y-my,d=dx*dx+dy*dy;
      if(d<radius*radius&&d<bestD){bestD=d;best=i;}
    });
    if(best>=0){nodes[best].charge=1;nodes[best].glow=1;}
  }

  var _wasDown=false;
  function triggerPulse(){
    /* Active 1-3 nœuds aléatoires comme graines de la cascade */
    var seeds=Math.floor(1+Math.random()*2);
    for(var s=0;s<seeds;s++){
      var idx2=Math.floor(Math.random()*nodes.length);
      if(nodes[idx2].refrac<=0){nodes[idx2].charge=1;nodes[idx2].glow=1;}
    }
    lastPulseTime=_t;
    var bar=document.getElementById('nrpulse-bar');if(bar){bar.style.width='100%';setTimeout(function(){bar.style.width='0%';},300);}
  }

  function draw(){
    if(!_active)return;
    _t+=0.016;frameCount++;

    if(cfg.pulse_enabled&&_t-lastPulseTime>cfg.pulse_interval)triggerPulse();

    /* cursor : active seulement au moment où le clic commence */
    if(mouse.down&&!_wasDown)activateClosest(mouse.x,mouse.y,cfg.pen_size);
    _wasDown=mouse.down;

    /* fade background */
    var bgRgb=hexToRgb(cfg.bg_color);
    ctx.fillStyle='rgba('+bgRgb[0]+','+bgRgb[1]+','+bgRgb[2]+','+_fade+')';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    /* fire : détecte les nœuds au seuil */
    var fireList=[];
    nodes.forEach(function(n,i){
      if(n.refrac>0){n.refrac--;return;}
      if(n.charge>=cfg.threshold){fireList.push(i);n.glow=1;n.refrac=cfg.refractory;n.charge=0;}
    });
    /* spawne les pulses — limité à cfg.fanout connexions par nœud qui s'active (sinon un seul
       clic peut enflammer tout le réseau d'un coup) ; PAS d'accumulation immédiate, la charge
       est ajoutée à l'ARRIVÉE */
    fireList.forEach(function(ni){
      var targets=[];
      edges.forEach(function(e){
        var target=-1;
        if(e.a===ni)target=e.b;else if(e.b===ni)target=e.a;
        if(target>=0)targets.push(target);
      });
      /* mélange puis garde au plus cfg.fanout cibles */
      for(var s=targets.length-1;s>0;s--){var j=Math.floor(Math.random()*(s+1));var tmp=targets[s];targets[s]=targets[j];targets[j]=tmp;}
      targets=targets.slice(0,Math.max(1,Math.round(cfg.fanout)));
      targets.forEach(function(target){
        /* évite de doubler un pulse déjà en route vers la même cible */
        for(var k=0;k<pulses.length;k++){if(pulses[k].target===target&&pulses[k].t<0.3)return;}
        pulses.push({ax:nodes[ni].x,ay:nodes[ni].y,bx:nodes[target].x,by:nodes[target].y,t:0,target:target});
      });
    });

    /* draw edges — colore ceux qui ont un pulse actif */
    var edgeRgb=hexToRgb(cfg.color_edge);
    var activeEdges={};
    pulses.forEach(function(p){activeEdges[p.target]=true;});
    ctx.lineWidth=0.6;
    edges.forEach(function(e){
      ctx.beginPath();ctx.moveTo(nodes[e.a].x,nodes[e.a].y);ctx.lineTo(nodes[e.b].x,nodes[e.b].y);
      ctx.strokeStyle='rgba('+edgeRgb[0]+','+edgeRgb[1]+','+edgeRgb[2]+',0.45)';ctx.stroke();
    });

    /* update & draw pulses — charge ajoutée UNIQUEMENT à l'arrivée */
    var pRgb=hexToRgb(cfg.color_pulse);
    var speed=cfg.pulse_speed/60;
    pulses=pulses.filter(function(p){
      p.t+=speed;
      if(p.t>=1){
        /* assez de charge pour déclencher le feu si pas en période réfractaire */
        nodes[p.target].charge+=cfg.threshold+0.1;
        return false;
      }
      var px=p.ax+(p.bx-p.ax)*p.t,py=p.ay+(p.by-p.ay)*p.t;
      /* pulse avec traîne */
      var trail=Math.max(0,p.t-speed*3);
      var tx=p.ax+(p.bx-p.ax)*trail,ty=p.ay+(p.by-p.ay)*trail;
      ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(px,py);
      ctx.strokeStyle='rgba('+pRgb[0]+','+pRgb[1]+','+pRgb[2]+',0.85)';
      ctx.lineWidth=2;ctx.stroke();
      ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);
      ctx.fillStyle='rgba('+pRgb[0]+','+pRgb[1]+','+pRgb[2]+',1)';ctx.fill();
      return true;
    });

    /* draw nodes */
    var nodeRgb=hexToRgb(cfg.color_node),activeRgb=hexToRgb(cfg.color_active);
    nodes.forEach(function(n){
      var g=n.glow;
      n.glow*=0.92;
      var ri=Math.round(nodeRgb[0]+(activeRgb[0]-nodeRgb[0])*g);
      var gi2=Math.round(nodeRgb[1]+(activeRgb[1]-nodeRgb[1])*g);
      var bi=Math.round(nodeRgb[2]+(activeRgb[2]-nodeRgb[2])*g);
      var r=3+g*5;
      if(g>0.1){ctx.beginPath();ctx.arc(n.x,n.y,r*2.5,0,Math.PI*2);ctx.fillStyle='rgba('+ri+','+gi2+','+bi+','+g*0.15+')';ctx.fill();}
      ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);
      ctx.fillStyle='rgba('+ri+','+gi2+','+bi+',0.9)';ctx.fill();
    });
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(nodes.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  Object.defineProperty(cfg,'fade',{get:function(){return _fade;},set:function(v){_fade=v;}});
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

