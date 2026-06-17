/* ═══════════════════════════════════════════
   COLOUR UTILS
═══════════════════════════════════════════ */
function hex2d(n){return(n<16?'0':'')+Math.max(0,Math.min(255,Math.round(n))).toString(16);}
function shiftHexHue(hex,deg){
  if(!hex||hex.length<7)return hex;
  var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,s=mx?d/mx:0,v=mx,h=0;
  if(d){if(mx===r)h=((g-b)/d%6+6)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;}
  h=(h+deg%360+360)%360;
  var i=Math.floor(h/60),f=h/60-i,p=v*(1-s),q=v*(1-f*s),t_=v*(1-(1-f)*s);
  var rgb=[[v,t_,p],[q,v,p],[p,v,t_],[p,q,v],[t_,p,v],[v,p,q]][i%6];
  return'#'+hex2d(rgb[0]*255)+hex2d(rgb[1]*255)+hex2d(rgb[2]*255);
}
function lerpHex(c1,c2,t){
  var r=parseInt(c1.slice(1,3),16),g=parseInt(c1.slice(3,5),16),b=parseInt(c1.slice(5,7),16);
  var r2=parseInt(c2.slice(1,3),16),g2=parseInt(c2.slice(3,5),16),b2=parseInt(c2.slice(5,7),16);
  return'#'+hex2d(r+(r2-r)*t)+hex2d(g+(g2-g)*t)+hex2d(b+(b2-b)*t);
}
function hexToRgba(hex,a){var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return'rgba('+r+','+g+','+b+','+a+')';}
function hexToRgb(hex){return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)};}
function getRampColor(t){
  t=Math.max(0,Math.min(1,t));
  var stops=FluidSim.cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});
  if(!stops.length)return'#ffffff';
  if(t<=stops[0].pos)return stops[0].color;
  if(t>=stops[stops.length-1].pos)return stops[stops.length-1].color;
  for(var i=0;i<stops.length-1;i++){
    if(t>=stops[i].pos&&t<=stops[i+1].pos){var f=(t-stops[i].pos)/(stops[i+1].pos-stops[i].pos);return lerpHex(stops[i].color,stops[i+1].color,f);}
  }
  return stops[0].color;
}
var rampLUT=[];
function buildLUT(){rampLUT=[];for(var i=0;i<256;i++)rampLUT[i]=getRampColor(i/255);drawRampCanvas();}
function drawRampCanvas(){
  var rc=document.getElementById('ramp-canvas');if(!rc)return;
  var rctx=rc.getContext('2d'),w=rc.width,h=rc.height;
  var stops=FluidSim.cfg.ramp_stops.slice().sort(function(a,b){return a.pos-b.pos;});
  if(stops.length<2)return;
  var grad=rctx.createLinearGradient(0,0,w,0);
  stops.forEach(function(s){grad.addColorStop(Math.max(0,Math.min(1,s.pos)),s.color);});
  rctx.fillStyle=grad;rctx.fillRect(0,0,w,h);
}

/* ═══════════════════════════════════════════
   PERLIN 3D NOISE
═══════════════════════════════════════════ */
(function(){
  var _p=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  var _perm=new Array(512);for(var i=0;i<512;i++)_perm[i]=_p[i&255];
  function _fade(t){return t*t*t*(t*(t*6-15)+10);}
  function _lerp3(a,b,t){return a+(b-a)*t;}
  function _grad3(hash,x,y,z){var h=hash&15,u=h<8?x:y,v=h<4?y:(h===12||h===14?x:z);return((h&1)?-u:u)+((h&2)?-v:v);}
  window.perlin3=function(x,y,z){
    var X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
    x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
    var u=_fade(x),v=_fade(y),w=_fade(z);
    var A=_perm[X]+Y,AA=_perm[A]+Z,AB=_perm[A+1]+Z,B=_perm[X+1]+Y,BA=_perm[B]+Z,BB=_perm[B+1]+Z;
    return _lerp3(_lerp3(_lerp3(_grad3(_perm[AA],x,y,z),_grad3(_perm[BA],x-1,y,z),u),_lerp3(_grad3(_perm[AB],x,y-1,z),_grad3(_perm[BB],x-1,y-1,z),u),v),_lerp3(_lerp3(_grad3(_perm[AA+1],x,y,z-1),_grad3(_perm[BA+1],x-1,y,z-1),u),_lerp3(_grad3(_perm[AB+1],x,y-1,z-1),_grad3(_perm[BB+1],x-1,y-1,z-1),u),v),w);
  };
})();

/* ═══════════════════════════════════════════
   GLOBAL MOUSE
═══════════════════════════════════════════ */
window._mouse={x:0,y:0,px:0,py:0,down:false};
window._warpAmount=0;
window._cursorHidden=false;
window._cursorOnCanvas=false;

