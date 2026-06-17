/* ═══════════════════════════════════════════
   GROWTH ENGINE — Arbres organiques, feuilles colorées depuis une image
   Graines déposées → poussent en branches sinueuses qui se ramifient en
   rétrécissant, puis se terminent en feuillage échantillonnant une image.
═══════════════════════════════════════════ */
var Engine_Growth=(function(){
  var canvas,ctx,mouse=window._mouse,_active=false;
  var seeds=[],sprouts=[],leaves=[],_needsReset=false,_t=0;
  var imgCanvas=null,imgCtx=null,imgData=null,imgW=0,imgH=0,imgReady=false;

  var cfg={
    canvas_width:800,canvas_height:600,
    fall_speed:3.0,wander:0.33,shrink:0.998,
    leaf_min:3,leaf_max:10,
    img_scale:1.0,img_offset_y:0,
    pen_size:20,push_force:1.0,
    bg_color:'#000000',color_branch:'#ffffff',shadow:true
  };

  function hexToRgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
  function wrap(v,n){return((v%n)+n)%n;}

  /* bruit 1D maison (hash + lissage) utilisé pour faire serpenter les branches */
  function hash1(n){var s=Math.sin(n*43.234+17.7)*12973.123;return s-Math.floor(s);}
  function wander1D(t){
    var i=Math.floor(t),f=t-i;
    var a=hash1(i),b=hash1(i+1);
    var u=f*f*(3-2*f);
    return a+(b-a)*u;
  }

  function buildDefaultImage(){
    imgW=320;imgH=320;
    imgCanvas=document.createElement('canvas');imgCanvas.width=imgW;imgCanvas.height=imgH;
    imgCtx=imgCanvas.getContext('2d');
    var grad=imgCtx.createLinearGradient(0,0,imgW,imgH);
    grad.addColorStop(0,'#ff6a3d');grad.addColorStop(0.5,'#ffd23f');grad.addColorStop(1,'#2ec4b6');
    imgCtx.fillStyle=grad;imgCtx.fillRect(0,0,imgW,imgH);
    for(var i=0;i<40;i++){
      imgCtx.beginPath();
      imgCtx.fillStyle='rgba(255,255,255,'+(0.04+Math.random()*0.08)+')';
      imgCtx.arc(Math.random()*imgW,Math.random()*imgH,20+Math.random()*60,0,Math.PI*2);
      imgCtx.fill();
    }
    imgData=imgCtx.getImageData(0,0,imgW,imgH).data;
    imgReady=true;
  }

  function loadImageFile(file){
    var reader=new FileReader();
    reader.onload=function(ev){
      var im=new Image();
      im.onload=function(){
        imgW=im.naturalWidth;imgH=im.naturalHeight;
        imgCanvas=document.createElement('canvas');imgCanvas.width=imgW;imgCanvas.height=imgH;
        imgCtx=imgCanvas.getContext('2d');
        imgCtx.drawImage(im,0,0);
        imgData=imgCtx.getImageData(0,0,imgW,imgH).data;
        imgReady=true;
      };
      im.src=ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function samplePixel(x,y){
    if(!imgReady)return[200,200,200];
    var ix=wrap(Math.floor(x/cfg.img_scale),imgW),iy=wrap(Math.floor((y-cfg.img_offset_y)/cfg.img_scale),imgH);
    var p=(iy*imgW+ix)*4;
    return[imgData[p],imgData[p+1],imgData[p+2]];
  }

  function makeSprout(x,y,root){
    if(!root){
      root={pos:{x:x,y:y},dir:Math.PI,radius:10+Math.random()*20,generation:0};
    }
    return{
      pos:{x:root.pos.x,y:root.pos.y},
      phase:Math.random()*1000,
      dir:root.dir,
      radius:root.radius,
      life:(30+Math.random()*90)/(root.generation/10+1),
      generation:root.generation+1
    };
  }

  function _reset(){seeds=[];sprouts=[];leaves=[];if(!imgReady)buildDefaultImage();}
  function init(){_reset();}
  function triggerPulse(){seeds.push({x:cfg.canvas_width/2,y:20});}

  function draw(){
    if(!_active)return;
    _t+=0.016;
    var W=cfg.canvas_width,H=cfg.canvas_height,ground=H-30;
    var branchRgb=hexToRgb(cfg.color_branch);

    if(mouse.down){
      var n=Math.max(1,Math.round(cfg.push_force*2));
      for(var k=0;k<n;k++)seeds.push({x:mouse.x+(Math.random()*2-1)*cfg.pen_size,y:mouse.y+(Math.random()*2-1)*cfg.pen_size});
    }

    /* graines */
    ctx.fillStyle='rgb('+branchRgb[0]+','+branchRgb[1]+','+branchRgb[2]+')';
    for(var i=seeds.length-1;i>=0;i--){
      var sd=seeds[i];sd.y+=cfg.fall_speed;
      if(sd.y>ground){seeds.splice(i,1);sprouts.push(makeSprout(sd.x,ground));}
      else{ctx.beginPath();ctx.arc(sd.x,sd.y,5,0,Math.PI*2);ctx.fill();}
    }

    /* branches */
    for(var j=sprouts.length-1;j>=0;j--){
      var sp=sprouts[j];
      sp.dir+=(wander1D(sp.phase+_t*60)-0.5)*cfg.wander;
      sp.dir+=(Math.PI-sp.dir)*0.09/(sp.generation+1);
      sp.pos.x+=Math.sin(sp.dir)*2;sp.pos.y+=Math.cos(sp.dir)*2;
      ctx.fillStyle='rgb('+branchRgb[0]+','+branchRgb[1]+','+branchRgb[2]+')';
      ctx.beginPath();ctx.arc(sp.pos.x,sp.pos.y,sp.radius,0,Math.PI*2);ctx.fill();
      sp.radius*=cfg.shrink/(sp.generation/300+1);
      sp.life--;
      if(sp.life<0){
        sprouts.splice(j,1);
        if(sp.radius>3){
          sprouts.push(makeSprout(0,0,sp));
          sprouts.push(makeSprout(0,0,sp));
        }else{
          leaves.push({x:sp.pos.x,y:sp.pos.y,life:20+Math.random()*40});
        }
      }
    }

    /* feuillage coloré depuis l'image */
    for(var l=leaves.length-1;l>=0;l--){
      var lf=leaves[l];
      var lx=lf.x+(Math.random()*100-50),ly=lf.y+(Math.random()*100-50);
      var col=samplePixel(lx,ly);
      var size=cfg.leaf_min+Math.random()*(cfg.leaf_max-cfg.leaf_min);
      ctx.save();
      if(cfg.shadow){ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=5;}
      ctx.translate(lx,ly);ctx.rotate(Math.random()*Math.PI*2);
      ctx.fillStyle='rgb('+col[0]+','+col[1]+','+col[2]+')';
      ctx.fillRect(-size/2,-size/2,size,size);
      ctx.restore();
      lf.life--;
      if(lf.life<0)leaves.splice(l,1);
    }
  }

  function activate(){
    _active=true;
    var cv=document.getElementById('c');canvas=cv;ctx=cv.getContext('2d');
    cfg.canvas_width=cv.width||cfg.canvas_width;cfg.canvas_height=cv.height||cfg.canvas_height;
    if(!imgReady)buildDefaultImage();
    if(_needsReset){_needsReset=false;_reset();}
    ctx.fillStyle=cfg.bg_color;ctx.fillRect(0,0,cfg.canvas_width,cfg.canvas_height);
  }
  function deactivate(){_active=false;}

  return{cfg:cfg,init:init,draw:draw,activate:activate,deactivate:deactivate,reset:_reset,triggerPulse:triggerPulse,loadImageFile:loadImageFile,markReset:function(){_needsReset=true;}};
})();

