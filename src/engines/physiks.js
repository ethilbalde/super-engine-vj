/* ═══════════════════════════════════════════
   PHYSIKS ENGINE — Cellular Automaton physique cohérent
   (densité, chaleur, combustion par combustible, phases réversibles)
═══════════════════════════════════════════ */
var Engine_Physiks=(function(){
  var canvas,ctx,_active=false,mouse=window._mouse;
  var _needsReset=false;
  var MAT={EMPTY:0,SAND:1,WATER:2,FIRE:3,SMOKE:4,WALL:5,OIL:6,GLASS:7,STEAM:8,LAVA:9,ICE:10,SOOT:11,ASH:12};
  var grid,gW,gH,imgData,pixels,temp,tempNext;
  var _activeMat=1;
  var _windT=0,_envT=0;

  var cfg={
    canvas_width:800,canvas_height:600,
    grid_res:3,water_spread:4,fire_speed:0.3,update_rate:1,
    pen_size:6,wind:0,soot_cap:6,env_intensity:1,
    ambient_temp:20,fire_temp:850,ignite_temp:260,
    melt_temp:1200,solidify_temp:700,
    evap_temp:150,condense_temp:60,
    freeze_temp:0,thaw_temp:5,
    heat_diffusion:0.18,cooling:0.02,
    bg_color:'#0a0804',
    color_sand:'#c8a040',color_water:'#2060c0',color_oil:'#664422',
    color_lava:'#ff5500',color_ice:'#bfe8ff',color_wall:'#888888',
    color_glass:'#cdeaee',color_smoke:'#554444',color_steam:'#d6dee4',
    color_soot:'#221d18',color_ash:'#9a9286'
  };

  /* bruit turbulent — varie selon la position ET le temps pour simuler des rafales */
  function windNoise(x,t){
    return Math.sin(x*0.07+t*0.9)*0.5+Math.sin(x*0.13-t*1.3)*0.3+Math.sin(x*0.21+t*2.1)*0.2;
  }

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

  function getColor(mat){
    switch(mat){
      case MAT.SAND:return hexToRgb(cfg.color_sand);
      case MAT.WATER:return hexToRgb(cfg.color_water);
      case MAT.FIRE:return[255,Math.floor(Math.random()*120+60),0];
      case MAT.SMOKE:return[Math.floor(Math.random()*40+70),Math.floor(Math.random()*20+50),Math.floor(Math.random()*20+50)];
      case MAT.WALL:return hexToRgb(cfg.color_wall);
      case MAT.OIL:return hexToRgb(cfg.color_oil);
      case MAT.GLASS:return hexToRgb(cfg.color_glass);
      case MAT.STEAM:return hexToRgb(cfg.color_steam);
      case MAT.LAVA:{var lr=hexToRgb(cfg.color_lava);return[Math.min(255,lr[0]+Math.floor(Math.random()*30)),lr[1],lr[2]];}
      case MAT.ICE:return hexToRgb(cfg.color_ice);
      case MAT.SOOT:return hexToRgb(cfg.color_soot);
      case MAT.ASH:return hexToRgb(cfg.color_ash);
      default:return hexToRgb(cfg.bg_color);
    }
  }

  function idx(x,y){return y*gW+x;}
  function inBounds(x,y){return x>=0&&x<gW&&y>=0&&y<gH;}
  function get(x,y){return inBounds(x,y)?grid[idx(x,y)]:MAT.WALL;}
  function set(x,y,v){if(inBounds(x,y))grid[idx(x,y)]=v;}
  function swap(x1,y1,x2,y2){var t=grid[idx(x1,y1)];grid[idx(x1,y1)]=grid[idx(x2,y2)];grid[idx(x2,y2)]=t;}
  /* matériaux que le sable/la cendre peuvent traverser en tombant (plus lourds que tout) */
  function isPassableForFalling(m){return m===MAT.EMPTY||m===MAT.OIL||m===MAT.WATER||m===MAT.LAVA||m===MAT.SMOKE||m===MAT.STEAM;}
  function isLightGas(m){return m===MAT.EMPTY||m===MAT.SMOKE||m===MAT.STEAM;}

  function _reset(){
    gW=Math.max(1,Math.floor(cfg.canvas_width/cfg.grid_res));
    gH=Math.max(1,Math.floor(cfg.canvas_height/cfg.grid_res));
    grid=new Uint8Array(gW*gH);
    temp=new Float32Array(gW*gH);
    tempNext=new Float32Array(gW*gH);
    for(var i=0;i<gW*gH;i++)temp[i]=cfg.ambient_temp;
    imgData=null;_envT=0;
  }
  function init(){_reset();}

  function triggerPulse(){
    /* scatter sand from center */
    var cx=Math.floor(gW/2),cy=Math.floor(gH/3),r=Math.floor(gW*0.1);
    for(var y=cy-r;y<cy+r;y++)for(var x=cx-r;x<cx+r;x++){
      var d=Math.sqrt((x-cx)*(x-cx)+(y-cy)*(y-cy));
      if(d<r&&inBounds(x,y))grid[idx(x,y)]=MAT.SAND;
    }
  }

  /* variations environnementales — fait vivre la scène sans interaction :
     ambiante/vent oscillants, poches chaudes/froides aléatoires, ignition spontanée, micro-pluie */
  function envTick(){
    _envT+=0.016;
    var ei=cfg.env_intensity;
    if(ei<=0)return{amb:cfg.ambient_temp,wind:cfg.wind};
    var ambOsc=Math.sin(_envT*0.05)*8*ei+Math.sin(_envT*0.13+1.7)*4*ei;
    var windOsc=Math.sin(_envT*0.21+0.4)*0.6*ei+Math.sin(_envT*0.07)*0.3*ei;
    if(Math.random()<0.002*ei){
      var px=Math.floor(Math.random()*gW),py=Math.floor(Math.random()*gH);
      var amp=(Math.random()<0.5?1:-1)*(80+Math.random()*120)*ei*0.3;
      var r=Math.floor(3+Math.random()*8);
      for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){
        var d2=Math.sqrt(dx*dx+dy*dy);if(d2>r)continue;
        var cx2=px+dx,cy2=py+dy;if(inBounds(cx2,cy2))temp[idx(cx2,cy2)]+=amp*(1-d2/r);
      }
    }
    if(Math.random()<0.0006*ei){
      for(var tries=0;tries<5;tries++){
        var rx=Math.floor(Math.random()*gW),ry=Math.floor(Math.random()*gH);
        if(grid[idx(rx,ry)]===MAT.OIL){grid[idx(rx,ry)]=MAT.FIRE;temp[idx(rx,ry)]=cfg.fire_temp;break;}
      }
    }
    if(Math.random()<0.004*ei){
      var n=1+Math.floor(Math.random()*2);
      for(var k=0;k<n;k++){var rx2=Math.floor(Math.random()*gW);if(get(rx2,0)===MAT.EMPTY)set(rx2,0,MAT.WATER);}
    }
    return{amb:cfg.ambient_temp+ambOsc,wind:cfg.wind+windOsc};
  }

  /* conduction thermique entre cellules voisines + refroidissement vers l'ambiante (modulée par l'environnement).
     Le feu et la lave maintiennent leur propre case à haute température, propagée ensuite par diffusion. */
  function heatPass(amb){
    var d=cfg.heat_diffusion,cool=cfg.cooling;
    for(var y=0;y<gH;y++){
      for(var x=0;x<gW;x++){
        var i=idx(x,y);
        var t=temp[i],m=grid[i];
        if(m===MAT.FIRE)t=Math.max(t,cfg.fire_temp);
        else if(m===MAT.LAVA)t=Math.max(t,cfg.solidify_temp+50);
        var xm=x>0?x-1:x,xp=x<gW-1?x+1:x,ym=y>0?y-1:y,yp=y<gH-1?y+1:y;
        var navg=(temp[idx(xm,y)]+temp[idx(xp,y)]+temp[idx(x,ym)]+temp[idx(x,yp)])*0.25;
        var nt=t+(navg-t)*d;
        nt+=(amb-nt)*cool;
        tempNext[i]=nt;
      }
    }
    var tmp=temp;temp=tempNext;tempNext=tmp;
  }

  /* réactions thermiques par cellule — huile+chaleur+oxygène→feu, lave qui rencontre huile/eau,
     sable très chaud→lave, lave refroidie→verre, eau↔vapeur↔glace (cycles réversibles) */
  function reactionPass(){
    for(var y=0;y<gH;y++){
      for(var x=0;x<gW;x++){
        var i=idx(x,y);
        var m=grid[i],t=temp[i];
        if(m===MAT.OIL&&t>cfg.ignite_temp){
          if(get(x-1,y)===MAT.EMPTY||get(x+1,y)===MAT.EMPTY||get(x,y-1)===MAT.EMPTY||get(x,y+1)===MAT.EMPTY){
            grid[i]=MAT.FIRE;temp[i]=cfg.fire_temp;
          }
        }else if(m===MAT.SAND&&t>cfg.melt_temp){
          grid[i]=MAT.LAVA;
        }else if(m===MAT.LAVA){
          if(t<cfg.solidify_temp){grid[i]=MAT.GLASS;}
          else{
            /* contact direct : la lave enflamme l'huile et vaporise l'eau au contact, et se refroidit en retour */
            if(get(x-1,y)===MAT.OIL&&Math.random()<0.5){grid[idx(x-1,y)]=MAT.FIRE;temp[idx(x-1,y)]=cfg.fire_temp;}
            if(get(x+1,y)===MAT.OIL&&Math.random()<0.5){grid[idx(x+1,y)]=MAT.FIRE;temp[idx(x+1,y)]=cfg.fire_temp;}
            if(get(x,y-1)===MAT.OIL&&Math.random()<0.5){grid[idx(x,y-1)]=MAT.FIRE;temp[idx(x,y-1)]=cfg.fire_temp;}
            if(get(x,y+1)===MAT.OIL&&Math.random()<0.5){grid[idx(x,y+1)]=MAT.FIRE;temp[idx(x,y+1)]=cfg.fire_temp;}
            var quench=false;
            if(get(x-1,y)===MAT.WATER&&Math.random()<0.5){grid[idx(x-1,y)]=MAT.STEAM;quench=true;}
            if(get(x+1,y)===MAT.WATER&&Math.random()<0.5){grid[idx(x+1,y)]=MAT.STEAM;quench=true;}
            if(get(x,y-1)===MAT.WATER&&Math.random()<0.5){grid[idx(x,y-1)]=MAT.STEAM;quench=true;}
            if(get(x,y+1)===MAT.WATER&&Math.random()<0.5){grid[idx(x,y+1)]=MAT.STEAM;quench=true;}
            if(quench)temp[i]-=40;
          }
        }else if(m===MAT.WATER){
          var hot=temp[idx(x>0?x-1:x,y)]>cfg.evap_temp||temp[idx(x<gW-1?x+1:x,y)]>cfg.evap_temp||
                  temp[idx(x,y>0?y-1:y)]>cfg.evap_temp||temp[idx(x,y<gH-1?y+1:y)]>cfg.evap_temp;
          if(hot&&Math.random()<0.3)grid[i]=MAT.STEAM;
          else if(t<cfg.freeze_temp&&Math.random()<0.2)grid[i]=MAT.ICE;
        }else if(m===MAT.STEAM&&t<cfg.condense_temp&&Math.random()<0.3){
          grid[i]=MAT.WATER;
        }else if(m===MAT.ICE&&t>cfg.thaw_temp&&Math.random()<0.2){
          grid[i]=MAT.WATER;
        }
      }
    }
  }

  /* la fumée bloquée contre un plafond se dépose en suie ; au-delà d'une certaine épaisseur
     empilée, le bas de la colonne se détache et tombe en cendre */
  function sootPass(){
    for(var y=0;y<gH;y++){
      for(var x=0;x<gW;x++){
        if(grid[idx(x,y)]!==MAT.SOOT)continue;
        if(get(x,y+1)===MAT.SOOT)continue; /* pas le bas de la colonne */
        if(get(x,y+1)!==MAT.EMPTY)continue;
        var run=0,yy=y;
        while(yy>=0&&grid[idx(x,yy)]===MAT.SOOT){run++;yy--;}
        if(run>=cfg.soot_cap&&Math.random()<0.15)grid[idx(x,y)]=MAT.ASH;
      }
    }
  }

  function stepGrid(){
    _windT+=0.016;
    var env=envTick();
    heatPass(env.amb);
    reactionPass();
    sootPass();
    var wind=env.wind;
    /* iterate bottom-up for sand/water/lave, top-down feel for fire/smoke/vapeur */
    for(var y=gH-2;y>=0;y--){
      var dir=Math.random()<0.5?1:-1;
      for(var xi=0;xi<gW;xi++){
        var x=dir>0?xi:(gW-1-xi);
        var m=grid[idx(x,y)];
        if(m===MAT.EMPTY||m===MAT.WALL||m===MAT.GLASS||m===MAT.ICE||m===MAT.SOOT)continue;
        if(m===MAT.SAND){
          var windPushed=false;
          if(wind!==0){
            var wv=windNoise(x,_windT)*wind;
            var wd=wv>0.15?1:(wv<-0.15?-1:0);
            if(wd!==0&&isPassableForFalling(get(x+wd,y+1))&&Math.random()<Math.min(0.9,Math.abs(wv)*0.45)){
              swap(x,y,x+wd,y+1);windPushed=true;
            }
          }
          if(!windPushed){
            if(isPassableForFalling(get(x,y+1))){swap(x,y,x,y+1);}
            else if(isPassableForFalling(get(x-1,y+1))){swap(x,y,x-1,y+1);}
            else if(isPassableForFalling(get(x+1,y+1))){swap(x,y,x+1,y+1);}
          }
        }else if(m===MAT.ASH){
          if(isLightGas(get(x,y+1))){swap(x,y,x,y+1);}
          else if(isLightGas(get(x-1,y+1))){swap(x,y,x-1,y+1);}
          else if(isLightGas(get(x+1,y+1))){swap(x,y,x+1,y+1);}
        }else if(m===MAT.WATER){
          if(get(x,y+1)===MAT.EMPTY||get(x,y+1)===MAT.OIL){swap(x,y,x,y+1);}
          else{var sp=Math.floor(cfg.water_spread);var moved=false;
            for(var d2=1;d2<=sp&&!moved;d2++){var r2=Math.random()<0.5?d2:-d2;if(get(x+r2,y)===MAT.EMPTY){swap(x,y,x+r2,y);moved=true;}}
          }
        }else if(m===MAT.OIL){
          if(get(x,y+1)===MAT.LAVA){grid[idx(x,y)]=MAT.FIRE;temp[idx(x,y)]=cfg.fire_temp;}
          else if(get(x,y+1)===MAT.EMPTY){swap(x,y,x,y+1);}
          else{var moved2=false;for(var d3=1;d3<=3&&!moved2;d3++){var r3=Math.random()<0.5?d3:-d3;if(get(x+r3,y)===MAT.EMPTY){swap(x,y,x+r3,y);moved2=true;}}}
        }else if(m===MAT.LAVA){
          if(get(x,y+1)===MAT.WATER){grid[idx(x,y+1)]=MAT.STEAM;temp[idx(x,y)]-=30;}
          else if(get(x,y+1)===MAT.OIL){grid[idx(x,y+1)]=MAT.FIRE;temp[idx(x,y+1)]=cfg.fire_temp;}
          else if(isLightGas(get(x,y+1))){swap(x,y,x,y+1);}
          else{var moved3=false;for(var d4=1;d4<=2&&!moved3;d4++){var r4=Math.random()<0.5?d4:-d4;if(get(x+r4,y)===MAT.EMPTY){swap(x,y,x+r4,y);moved3=true;}}}
        }else if(m===MAT.FIRE){
          var hasFuel=get(x-1,y)===MAT.OIL||get(x+1,y)===MAT.OIL||get(x,y-1)===MAT.OIL||get(x,y+1)===MAT.OIL;
          var burnRate=hasFuel?cfg.fire_speed*0.4:cfg.fire_speed*2.2;
          if(Math.random()<burnRate){
            grid[idx(x,y)]=Math.random()<0.4?MAT.SMOKE:MAT.EMPTY;
          }
        }else if(m===MAT.SMOKE){
          if(y===0||get(x,y-1)===MAT.WALL){
            if(Math.random()<0.04){grid[idx(x,y)]=MAT.SOOT;continue;}
          }
          if(Math.random()<0.05)set(x,y,MAT.EMPTY);
          else if(get(x,y-1)===MAT.EMPTY&&Math.random()<0.3)swap(x,y,x,y-1);
          else if(Math.random()<0.1){var rx=Math.floor(Math.random()*3-1);if(get(x+rx,y-1)===MAT.EMPTY)swap(x,y,x+rx,y-1);}
        }else if(m===MAT.STEAM){
          if(Math.random()<0.04)set(x,y,MAT.EMPTY);
          else if(get(x,y-1)===MAT.EMPTY&&Math.random()<0.35)swap(x,y,x,y-1);
          else if(Math.random()<0.12){var rx2=Math.floor(Math.random()*3-1);if(get(x+rx2,y-1)===MAT.EMPTY)swap(x,y,x+rx2,y-1);}
        }
      }
    }
  }

  function drawBrush(){
    if(!mouse.down)return;
    var gx=Math.round(mouse.x/cfg.grid_res),gy=Math.round(mouse.y/cfg.grid_res);
    var r=cfg.pen_size;
    for(var dy=-r;dy<=r;dy++)for(var dx=-r;dx<=r;dx++){
      if(dx*dx+dy*dy<=r*r)set(gx+dx,gy+dy,_activeMat);
    }
    if(_activeMat===MAT.LAVA||_activeMat===MAT.FIRE){
      for(var dy2=-r;dy2<=r;dy2++)for(var dx2=-r;dx2<=r;dx2++){
        if(dx2*dx2+dy2*dy2<=r*r){var cx3=gx+dx2,cy3=gy+dy2;if(inBounds(cx3,cy3))temp[idx(cx3,cy3)]=_activeMat===MAT.LAVA?cfg.solidify_temp+200:cfg.fire_temp;}
      }
    }
  }

  var offscreen=null,offCtx=null;
  function renderPixels(){
    if(!offscreen){offscreen=document.createElement('canvas');offCtx=offscreen.getContext('2d');}
    if(offscreen.width!==gW||offscreen.height!==gH){offscreen.width=gW;offscreen.height=gH;imgData=null;}
    if(!imgData||imgData.width!==gW||imgData.height!==gH)imgData=offCtx.createImageData(gW,gH);
    for(var i=0;i<gW*gH;i++){
      var c=getColor(grid[i]);
      pixels=imgData.data;
      pixels[i*4]=c[0];pixels[i*4+1]=c[1];pixels[i*4+2]=c[2];pixels[i*4+3]=255;
    }
    offCtx.putImageData(imgData,0,0);
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(offscreen,0,0,gW,gH,0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  function draw(){
    if(!_active)return;
    if(canvas.width!==cfg.canvas_width||canvas.height!==cfg.canvas_height){
      cfg.canvas_width=canvas.width;cfg.canvas_height=canvas.height;_reset();
    }
    for(var u=0;u<cfg.update_rate;u++)stepGrid();
    drawBrush();
    renderPixels();
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    var expectedGW=Math.max(1,Math.floor(cfg.canvas_width/cfg.grid_res));
    var expectedGH=Math.max(1,Math.floor(cfg.canvas_height/cfg.grid_res));
    if(!grid||gW!==expectedGW||gH!==expectedGH||_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  Object.defineProperty(cfg,'activeMat',{get:function(){return _activeMat;},set:function(v){_activeMat=v;}});
  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,markReset:function(){_needsReset=true;}};
})();

