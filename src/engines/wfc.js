/* ═══════════════════════════════════════════
   WFC ENGINE — Wave Function Collapse procédural
   Grille de tuiles procedurales (lignes, coins, croix) générée par WFC,
   révélée progressivement frame par frame.
═══════════════════════════════════════════ */
var Engine_WFC=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var _needsReset=false,lastPulseTime=0;
  var COLS,ROWS,grid,collapseQueue,_collapseIdx;
  var _offCanvas=null,_offCtx=null;

  var cfg={
    canvas_width:800,canvas_height:600,
    tile_size:24,
    line_width:2.8,
    bg_color:'#05050f',
    fg_color:'#00ffcc',
    collapse_speed:6,
    blank_weight:0.12,
    use_curves:true,
    pen_size:60,push_force:1.0,
    pulse_enabled:false,pulse_interval:6.0,pulse_beat_div:1,
    bpm:120,time_mode:'bpm'
  };

  /* Tile definitions: [N, E, S, W] — 1=connected, 0=open */
  var TILES=[
    [0,0,0,0], /* 0  blank      */
    [0,1,0,1], /* 1  H-line     */
    [1,0,1,0], /* 2  V-line     */
    [1,1,0,0], /* 3  corner NE  */
    [1,0,0,1], /* 4  corner NW  */
    [0,1,1,0], /* 5  corner SE  */
    [0,0,1,1], /* 6  corner SW  */
    [1,1,0,1], /* 7  T no-S     */
    [0,1,1,1], /* 8  T no-N     */
    [1,1,1,0], /* 9  T no-W     */
    [1,0,1,1], /* 10 T no-E     */
    [1,1,1,1]  /* 11 cross      */
  ];
  var WEIGHTS=[0.6,2.2,2.2,1.5,1.5,1.5,1.5,0.65,0.65,0.65,0.65,0.35];

  /* ── WFC algorithm (pre-computed offline, played back in draw) ── */

  function allIndices(){
    var a=[];for(var i=0;i<TILES.length;i++)a.push(i);return a;
  }

  function weightedChoice(indices){
    var total=0;
    for(var i=0;i<indices.length;i++){
      var w=WEIGHTS[indices[i]];
      if(indices[i]===0)w=cfg.blank_weight*5;
      total+=w;
    }
    var r=Math.random()*total,acc=0;
    for(var i=0;i<indices.length;i++){
      var w=WEIGHTS[indices[i]];
      if(indices[i]===0)w=cfg.blank_weight*5;
      acc+=w;
      if(r<=acc)return indices[i];
    }
    return indices[indices.length-1];
  }

  function computeWFC(){
    var N=ROWS*COLS;
    var g=new Int8Array(N).fill(-1);
    var poss=[];
    for(var i=0;i<N;i++)poss.push(allIndices());
    var order=[],uncollapsed=N,maxIter=N*5,iter=0;

    while(uncollapsed>0&&iter++<maxIter){
      var minE=9999,best=-1;
      for(var i=0;i<N;i++){
        if(g[i]>=0)continue;
        var e=poss[i].length;
        if(e===0){g[i]=0;order.push((i<<8)|0);uncollapsed--;continue;}
        /* add jitter to break ties randomly */
        var ej=e+Math.random()*0.9;
        if(ej<minE){minE=ej;best=i;}
      }
      if(best<0)break;
      var chosen=weightedChoice(poss[best]);
      g[best]=chosen;
      order.push((best<<8)|chosen);
      uncollapsed--;
      propagate(g,poss,best);
    }
    /* fill stragglers */
    for(var i=0;i<N;i++){if(g[i]<0)order.push((i<<8)|0);}
    return order;
  }

  function propagate(g,poss,startIdx){
    var stack=[startIdx];
    var inStack=new Uint8Array(ROWS*COLS);
    inStack[startIdx]=1;
    while(stack.length>0){
      var idx=stack.pop();
      inStack[idx]=0;
      if(g[idx]<0)continue;
      var t=TILES[g[idx]];
      var r=Math.floor(idx/COLS),c=idx%COLS;
      /* [nidx, myEdgeIdx, theirEdgeIdx] — N=0,E=1,S=2,W=3 */
      var nbrs=[];
      if(r>0)      nbrs.push([idx-COLS,0,2]);
      if(r<ROWS-1) nbrs.push([idx+COLS,2,0]);
      if(c<COLS-1) nbrs.push([idx+1,   1,3]);
      if(c>0)      nbrs.push([idx-1,   3,1]);
      for(var ni=0;ni<nbrs.length;ni++){
        var nidx=nbrs[ni][0],me=nbrs[ni][1],them=nbrs[ni][2];
        if(g[nidx]>=0)continue;
        var req=t[me];
        var filtered=[],before=poss[nidx].length;
        for(var j=0;j<poss[nidx].length;j++){
          if(TILES[poss[nidx][j]][them]===req)filtered.push(poss[nidx][j]);
        }
        if(filtered.length===0)filtered=[0];
        if(filtered.length<before){
          poss[nidx]=filtered;
          if(!inStack[nidx]){stack.push(nidx);inStack[nidx]=1;}
        }
      }
    }
  }

  /* ── Grid lifecycle ── */

  function initGrid(){
    COLS=Math.max(2,Math.floor(cfg.canvas_width/cfg.tile_size));
    ROWS=Math.max(2,Math.floor(cfg.canvas_height/cfg.tile_size));
    grid=new Int8Array(ROWS*COLS).fill(-1);
    collapseQueue=computeWFC();
    _collapseIdx=0;
    if(_offCtx){
      _offCtx.fillStyle=cfg.bg_color;
      _offCtx.fillRect(0,0,_offCanvas.width,_offCanvas.height);
    }
  }

  /* ── Tile rendering ── */

  function drawTileAt(ctx2,cellIdx,tileType){
    var r=Math.floor(cellIdx/COLS),c=cellIdx%COLS;
    var ts=cfg.tile_size,lw=cfg.line_width;
    var x=c*ts,y=r*ts;
    var cx=x+ts*0.5,cy=y+ts*0.5;
    var t=TILES[tileType];

    /* clear cell */
    ctx2.fillStyle=cfg.bg_color;
    ctx2.fillRect(x,y,ts,ts);
    if(tileType===0)return;

    ctx2.strokeStyle=cfg.fg_color;
    ctx2.lineWidth=lw;
    ctx2.lineCap='round';
    ctx2.lineJoin='round';

    var conns=t[0]+t[1]+t[2]+t[3];

    ctx2.beginPath();
    if(cfg.use_curves&&conns===2&&!(t[0]&&t[2])&&!(t[1]&&t[3])){
      /* corner: quadratic curve from one edge midpoint to another */
      var dirs=[];
      for(var d=0;d<4;d++)if(t[d])dirs.push(d);
      var p1=edgeMid(x,y,ts,dirs[0]);
      var p2=edgeMid(x,y,ts,dirs[1]);
      var cp=cornerCtrl(x,y,ts,dirs[0],dirs[1]);
      ctx2.moveTo(p1[0],p1[1]);
      ctx2.quadraticCurveTo(cp[0],cp[1],p2[0],p2[1]);
    }else{
      /* straight lines from edge midpoints to center */
      if(t[0]){ctx2.moveTo(cx,y);ctx2.lineTo(cx,cy);}
      if(t[2]){ctx2.moveTo(cx,cy);ctx2.lineTo(cx,y+ts);}
      if(t[1]){ctx2.moveTo(cx,cy);ctx2.lineTo(x+ts,cy);}
      if(t[3]){ctx2.moveTo(x,cy);ctx2.lineTo(cx,cy);}
    }
    ctx2.stroke();
  }

  function edgeMid(x,y,ts,dir){
    var h=ts*0.5;
    if(dir===0)return[x+h,y];
    if(dir===1)return[x+ts,y+h];
    if(dir===2)return[x+h,y+ts];
    return[x,y+h];
  }

  function cornerCtrl(x,y,ts,d1,d2){
    var top=(d1===0||d2===0),right=(d1===1||d2===1);
    var bot=(d1===2||d2===2),left=(d1===3||d2===3);
    if(top&&right) return[x+ts,y];
    if(top&&left)  return[x,y];
    if(bot&&right) return[x+ts,y+ts];
    return[x,y+ts];
  }

  /* ── Draw loop ── */

  function draw(){
    if(!_active)return;

    /* setup offscreen buffer */
    if(!_offCanvas||_offCanvas.width!==cfg.canvas_width||_offCanvas.height!==cfg.canvas_height){
      _offCanvas=document.createElement('canvas');
      _offCanvas.width=cfg.canvas_width;_offCanvas.height=cfg.canvas_height;
      _offCtx=_offCanvas.getContext('2d');
      _offCtx.fillStyle=cfg.bg_color;
      _offCtx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
      initGrid();
    }

    /* reveal collapse_speed cells per frame */
    var speed=Math.max(1,cfg.collapse_speed|0);
    for(var i=0;i<speed&&_collapseIdx<collapseQueue.length;i++,_collapseIdx++){
      var packed=collapseQueue[_collapseIdx];
      var cellIdx=packed>>8,tileType=packed&0xFF;
      grid[cellIdx]=tileType;
      drawTileAt(_offCtx,cellIdx,tileType);
    }

    /* pulse timer */
    var now=performance.now()/1000;
    var pulseEff=cfg.time_mode==='bpm'?(60/cfg.bpm)*cfg.pulse_beat_div:cfg.pulse_interval;
    if(cfg.pulse_enabled&&now-lastPulseTime>=pulseEff){triggerPulse();lastPulseTime=now;}

    /* mouse click: reset grid */
    if(mouse.down&&!window._cursorHidden){
      if(!draw._wasDown){initGrid();}
    }
    draw._wasDown=!!mouse.down;

    ctx.drawImage(_offCanvas,0,0);
  }
  draw._wasDown=false;

  function triggerPulse(){initGrid();}

  function _reset(){initGrid();}

  function activate(){
    _active=true;
    var cv=document.getElementById('c');
    cfg.canvas_width=cv.width||cfg.canvas_width;
    cfg.canvas_height=cv.height||cfg.canvas_height;
    if(!collapseQueue||_needsReset){_needsReset=false;initGrid();}
  }

  function deactivate(){_active=false;}

  function init(){
    canvas=document.getElementById('c');
    ctx=canvas.getContext('2d');
    cfg.canvas_width=FluidSim.cfg.canvas_width;
    cfg.canvas_height=FluidSim.cfg.canvas_height;
    initGrid();
  }

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,
    reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();
