/* ═══════════════════════════════════════════
   CLOTH ENGINE — Simulation de tissu avec physique de contrainte
   Grille de nœuds liés, interaction couteau pour découper
═══════════════════════════════════════════ */
var Engine_Cloth=(function(){
  var canvas,ctx;
  var mouse=window._mouse;
  var nodeArray=[],linkArray=[];
  var cutHistory=[];
  var _active=false,frameCount=0;

  var cfg={
    canvas_width:800,canvas_height:600,
    grid_count:50,friction:0.99,force_multiplier:0.25,
    knife_range:15,speed_limit:8,
    gravity_x:0,gravity_y:0.1,
    line_color:'#00aa88',node_color:'#ff4400',bg_color:'#050505',
    line_width:1.0,node_size:2.0,opacity:0.9,trail:0.02,
    knife_enabled:true,knife_color:'#ffff00',
    pulse_enabled:false,pulse_interval:2.0,pulse_beat_div:1,
    time_mode:'bpm',bpm:120,
    hue_shift_enabled:false,hue_shift:0,hue_speed:20,hue_beat_div:1
  };

  var _needsReset=false;
  var lastPulseTime=0;

  function Node(x,y,pinned){
    this.pos={x:x,y:y};
    this.vel={x:0,y:0};
    this.force={x:0,y:0};
    this.pinned=pinned;
  }

  function Link(node1,node2){
    this.node1=node1;
    this.node2=node2;
  }
  Link.prototype.getMiddlePoint=function(){
    return{x:(this.node1.pos.x+this.node2.pos.x)/2,y:(this.node1.pos.y+this.node2.pos.y)/2};
  };
  Link.prototype.update=function(){
    var dx=this.node2.pos.x-this.node1.pos.x;
    var dy=this.node2.pos.y-this.node1.pos.y;
    if(!this.node1.pinned){this.node1.force.x+=dx;this.node1.force.y+=dy;}
    if(!this.node2.pinned){this.node2.force.x-=dx;this.node2.force.y-=dy;}
  };

  function createNodes(){
    var nodes=[];
    var W=cfg.canvas_width,H=cfg.canvas_height,g=cfg.grid_count;
    for(var j=0;j<=g;j++){
      for(var i=0;i<=g;i++){
        var pinned=(i===0||j===0||i===g||j===g);
        var x=i*(W/g);
        var y=j*(H/g);
        nodes.push(new Node(x,y,pinned));
      }
    }
    return nodes;
  }

  function createLinks(nodes){
    var links=[],W=cfg.canvas_width,g=cfg.grid_count,linkDist=W/g;
    for(var i=0;i<nodes.length;i++){
      for(var j=i+1;j<nodes.length;j++){
        var n1=nodes[i],n2=nodes[j];
        var dx=n2.pos.x-n1.pos.x,dy=n2.pos.y-n1.pos.y;
        var d=Math.sqrt(dx*dx+dy*dy);
        if(d<=linkDist*1.5){
          if(!(n1.pinned&&n2.pinned)){links.push(new Link(n1,n2));}
        }
      }
    }
    return links;
  }

  function triggerPulse(){
    var W=cfg.canvas_width,H=cfg.canvas_height;
    for(var i=0;i<nodeArray.length;i++){
      var n=nodeArray[i];
      if(!n.pinned){
        var dx=n.pos.x-W/2,dy=n.pos.y-H/2;
        var d=Math.sqrt(dx*dx+dy*dy)||1;
        var strength=2.0;
        n.vel.x+=(-dx/d)*strength;
        n.vel.y+=(-dy/d)*strength;
      }
    }
    if(window.oscSend)window.oscSend('/cloth/pulse_fired',[1]);
  }

  function cutClothAtMouse(){
    if(!cfg.knife_enabled||!mouse.down)return;
    var cutCount=0;
    for(var i=linkArray.length-1;i>=0;i--){
      var link=linkArray[i];
      var middle=link.getMiddlePoint();
      var dx=middle.x-mouse.x,dy=middle.y-mouse.y;
      var dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<cfg.knife_range){
        cutHistory.push(link);
        linkArray.splice(i,1);
        cutCount++;
      }
    }
  }

  function undo(){
    if(cutHistory.length){linkArray.push(cutHistory.pop());}
  }

  function draw(){
    if(!_active)return;
    frameCount++;
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}

    var W=cfg.canvas_width,H=cfg.canvas_height;

    /* update physics */
    for(var i=0;i<linkArray.length;i++){linkArray[i].update();}

    for(var i=0;i<nodeArray.length;i++){
      var n=nodeArray[i];
      if(n.pinned)continue;

      n.force.x+=cfg.gravity_x;
      n.force.y+=cfg.gravity_y;

      var ax=n.force.x*cfg.force_multiplier;
      var ay=n.force.y*cfg.force_multiplier;
      n.vel.x+=ax;n.vel.y+=ay;

      var v=Math.sqrt(n.vel.x*n.vel.x+n.vel.y*n.vel.y);
      if(v>cfg.speed_limit){
        var scale=cfg.speed_limit/v;
        n.vel.x*=scale;n.vel.y*=scale;
      }

      n.pos.x+=n.vel.x;n.pos.y+=n.vel.y;
      n.force.x=0;n.force.y=0;
      n.vel.x*=cfg.friction;n.vel.y*=cfg.friction;

      /* keep within bounds */
      if(n.pos.x<0)n.pos.x=0;if(n.pos.x>W)n.pos.x=W;
      if(n.pos.y<0)n.pos.y=0;if(n.pos.y>H)n.pos.y=H;
    }

    cutClothAtMouse();

    /* render */
    var hOff=cfg.hue_shift_enabled?cfg.hue_shift:0;
    if(cfg.hue_shift_enabled&&cfg.hue_speed!==0)
      cfg.hue_shift=((cfg.hue_shift+cfg.hue_speed*(cfg.bpm/60)/cfg.hue_beat_div/60)%360+360)%360;

    if(cfg.trail<=0.005){ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,W,H);}
    else{ctx.fillStyle=hexToRgba(cfg.bg_color,1-cfg.trail);ctx.fillRect(0,0,W,H);}

    ctx.globalAlpha=cfg.opacity;
    ctx.lineWidth=cfg.line_width;
    ctx.lineCap='round';ctx.lineJoin='round';

    /* draw links */
    var linkCol=cfg.hue_shift_enabled?shiftHexHue(cfg.line_color,hOff):cfg.line_color;
    ctx.strokeStyle=linkCol;
    for(var i=0;i<linkArray.length;i++){
      var link=linkArray[i];
      ctx.beginPath();
      ctx.moveTo(link.node1.pos.x,link.node1.pos.y);
      ctx.lineTo(link.node2.pos.x,link.node2.pos.y);
      ctx.stroke();
    }

    /* draw nodes */
    var nodeCol=cfg.hue_shift_enabled?shiftHexHue(cfg.node_color,hOff):cfg.node_color;
    ctx.fillStyle=nodeCol;
    for(var i=0;i<nodeArray.length;i++){
      var n=nodeArray[i];
      ctx.beginPath();ctx.arc(n.pos.x,n.pos.y,cfg.node_size,0,Math.PI*2);ctx.fill();
    }

    /* draw knife cursor if enabled */
    if(cfg.knife_enabled&&mouse.down){
      ctx.globalAlpha=0.6;
      ctx.strokeStyle=cfg.knife_color;
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(mouse.x,mouse.y,cfg.knife_range,0,Math.PI*2);ctx.stroke();
    }

    ctx.globalAlpha=1;
    mouse.px=mouse.x;mouse.py=mouse.y;
  }

  function _reset(){
    nodeArray=createNodes();
    linkArray=createLinks(nodeArray);
    cutHistory=[];
    frameCount=0;
    lastPulseTime=0;
  }

  function init(){
    canvas=document.getElementById('c');ctx=canvas.getContext('2d');
    cfg.canvas_width=canvas.width||cfg.canvas_width;
    cfg.canvas_height=canvas.height||cfg.canvas_height;
    _reset();
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');
    cfg.canvas_width=cv.width||cfg.canvas_width;
    cfg.canvas_height=cv.height||cfg.canvas_height;
    if(nodeArray.length===0||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }

  function deactivate(){_active=false;}

  return{
    cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,
    reset:_reset,triggerPulse:triggerPulse,undo:undo,markReset:function(){_needsReset=true;}
  };
})();
