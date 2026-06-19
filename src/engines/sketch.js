var Engine_Sketch = (function () {
  var canvas, ctx;
  var mouse = window._mouse;
  var _active = false;
  var _needsReset = false;
  var _offscreen = null;
  var _offCtx = null;
  var _frame = 0;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    /* LIVE */
    forms_per_frame: 60,
    flower_prob: 0.001,
    pen_size: 40,
    /* SIM */
    spread: 0.12,
    size_min: 0.5,
    size_max: 2.0,
    life: 0,
    spawn_sync: false,
    spawn_beat_div: 1,
    grid_refresh: 80,
    grid_visible: false,
    grid_weight: 0.5,
    /* COLOR */
    bg_color: '#000000',
    opacity_min: 0.3,
    opacity_max: 0.9,
    stroke_prob: 0.1,
    palette_index: -1,   /* -1 = aléatoire à chaque reset */
    /* TEMPO */
    pulse_enabled: false,
    pulse_interval: 8.0,
    pulse_beat_div: 1,
    time_mode: 'bpm',
    bpm: 120
  };

  /* ── 37 palettes from original sketch ── */
  var PALETTES = [
    ["#e9dbce","#fceade","#ea526f","#e2c290","#6b2d5c","#25ced1"],
    ["#223843","#e9dbce","#eff1f3","#dbd3d8","#d8b4a0","#d77a61"],
    ["#e29578","#ffffff","#006d77","#83c5be","#ffddd2","#edf6f9"],
    ["#e9dbce","#ffffff","#cc3528","#028090","#00a896","#f8c522"],
    ["#e9dbce","#f8f7c1","#f46902","#da506a","#fae402","#92accc"],
    ["#e42268","#fb8075","#761871","#5b7d9c","#a38cb4","#476590"],
    ["#f9b4ab","#fdebd3","#264e70","#679186","#bbd4ce"],
    ["#1f306e","#553772","#8f3b76","#c7417b","#f5487f"],
    ["#e0f0ea","#95adbe","#574f7d","#503a65","#3c2a4d"],
    ["#413e4a","#73626e","#b38184","#f0b49e","#f7e4be"],
    ["#ff4e50","#fc913a","#f9d423","#ede574","#e1f5c4"],
    ["#99b898","#fecea8","#ff847c","#e84a5f","#2a363b"],
    ["#69d2e7","#a7dbd8","#e0e4cc","#f38630","#fa6900"],
    ["#fe4365","#fc9d9a","#f9cdad","#c8c8a9","#83af9b"],
    ["#ecd078","#d95b43","#c02942","#542437","#53777a"],
    ["#556270","#4ecdc4","#c7f464","#ff6b6b","#c44d58"],
    ["#774f38","#e08e79","#f1d4af","#ece5ce","#c5e0dc"],
    ["#e8ddcb","#cdb380","#036564","#033649","#031634"],
    ["#490a3d","#bd1550","#e97f02","#f8ca00","#8a9b0f"],
    ["#594f4f","#547980","#45ada8","#9de0ad","#e5fcc2"],
    ["#00a0b0","#6a4a3c","#cc333f","#eb6841","#edc951"],
    ["#5bc0eb","#fde74c","#9bc53d","#e55934","#fa7921"],
    ["#ed6a5a","#f4f1bb","#9bc1bc","#5ca4a9","#e6ebe0"],
    ["#ef476f","#ffd166","#06d6a0","#118ab2","#073b4c"],
    ["#22223b","#4a4e69","#9a8c98","#c9ada7","#f2e9e4"],
    ["#114b5f","#1a936f","#88d498","#c6dabf","#f3e9d2"],
    ["#3d5a80","#98c1d9","#e0fbfc","#ee6c4d","#293241"],
    ["#06aed5","#086788","#f0c808","#fff1d0","#dd1c1a"],
    ["#540d6e","#ee4266","#ffd23f","#3bceac","#0ead69"],
    ["#c9cba3","#ffe1a8","#e26d5c","#723d46","#472d30"],
    ["#3c4cad","#5FB49C","#e8a49c"],
    ["#1c3560","#f2efdb","#fea985","#ff6343"],
    ["#e0d7c5","#488a50","#b59a55","#bf5513","#3b6fb6","#4f3224","#9a7f6e"],
    ["#ffb53c","#eeb3a3","#f3553c","#642a02"],
    ["#DEEFB7","#5FB49C","#ed6a5a"],
    ["#2B2B2B","#91B3E1","#2F5FB3","#3D4B89","#AE99E8","#DBE2EC"],
    ["#ffbe0b","#fb5607","#ff006e","#8338ec","#3a86ff"]
  ];

  var _lastSpawn = 0;

  var _pal, _pal1, _pal2;

  /* ── Box-Muller gaussian ── */
  function gauss(mean, std) {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function randPal() {
    return PALETTES[Math.floor(Math.random() * PALETTES.length)];
  }

  function pickPal() {
    return cfg.palette_index >= 0 ? PALETTES[cfg.palette_index % PALETTES.length] : randPal();
  }

  /* ── hex → rgba string ── */
  function hex2rgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ── Flower shape ── */
  function drawFlower(oc, x, y, r) {
    var d = Math.random() * 0.2;
    var topNum = Math.floor(Math.random() * 10);
    var angle = Math.random() * Math.PI * 2;

    oc.save();
    oc.translate(x, y);
    oc.rotate(angle);

    oc.beginPath();
    for (var i = 0; i <= 360; i++) {
      var rad = i * Math.PI / 180;
      var radius = r + (r * d) * Math.sin(rad * topNum);
      var ex = radius * Math.sin(rad);
      var ey = radius * Math.cos(rad);
      if (i === 0) oc.moveTo(ex, ey); else oc.lineTo(ex, ey);
    }
    oc.closePath();
    oc.clip();

    /* fill with dot grid */
    var nums = 140;
    var w = (cfg.canvas_width * 2) / nums;
    oc.fillStyle = randFrom(_pal);
    oc.translate(-cfg.canvas_width, -cfg.canvas_height);
    for (var jj = 0; jj < nums; jj++) {
      for (var ii = 0; ii < nums; ii++) {
        oc.beginPath();
        if (jj % 2) {
          oc.arc(ii * w + w / 2, jj * w, w * 0.25, 0, Math.PI * 2);
        } else {
          oc.arc(ii * w, jj * w, w * 0.25, 0, Math.PI * 2);
        }
        oc.fill();
      }
    }
    oc.restore();
  }

  /* ── Poly shape ── */
  function drawPoly(oc, x, y, r) {
    var angle = Math.random() * Math.PI * 2;
    var d = r * (0.3 + Math.random() * 0.5);
    var col1 = randFrom(_pal1);
    var col2 = randFrom(_pal2);

    oc.save();
    oc.translate(x, y);
    oc.rotate(angle);

    if (Math.random() >= cfg.stroke_prob) {
      var grad = oc.createLinearGradient(0, -d, 0, d);
      grad.addColorStop(0, hex2rgba(col1, cfg.opacity_min));
      grad.addColorStop(1, hex2rgba(col2, cfg.opacity_max));
      oc.fillStyle = grad;
      oc.strokeStyle = 'transparent';
    } else {
      oc.fillStyle = 'transparent';
      oc.strokeStyle = col1;
      oc.lineWidth = 0.8;
    }

    if (Math.random() < 0.5) {
      var nums2 = Math.floor(3 + Math.random() * 3);
      var dep = 0.1 + Math.random() * 0.2;
      oc.beginPath();
      for (var i = 0; i <= 360; i++) {
        var rad = i * Math.PI / 180;
        var radius = d + (d * dep * Math.sin(rad * nums2));
        var ex = radius * Math.sin(rad);
        var ey = radius * Math.cos(rad);
        if (i === 0) oc.moveTo(ex, ey); else oc.lineTo(ex, ey);
      }
      oc.closePath();
      oc.fill();
      if (oc.strokeStyle !== 'transparent') oc.stroke();
    } else {
      var h = d * (0.2 + Math.random() * 0.8);
      var rr = Math.abs(h / 2);
      oc.beginPath();
      oc.roundRect ? oc.roundRect(0, 0, d, h, rr) : oc.rect(0, 0, d, h);
      oc.fill();
      if (oc.strokeStyle !== 'transparent') oc.stroke();
    }
    oc.restore();
  }

  function drawGrid(oc) {
    if (!cfg.grid_visible) return;
    var W = cfg.canvas_width, H = cfg.canvas_height;
    var gNum = 60;
    var w = W / gNum;
    oc.lineWidth = cfg.grid_weight;
    for (var x = 0; x < gNum; x++) {
      for (var y = 0; y < gNum; y++) {
        oc.strokeStyle = randFrom(_pal);
        if (x % 2 || y % 2) {
          oc.save();
          oc.setLineDash([1, 2]);
          oc.beginPath(); oc.moveTo(x * w, 0); oc.lineTo(x * w, H); oc.stroke();
          oc.beginPath(); oc.moveTo(0, y * w); oc.lineTo(W, y * w); oc.stroke();
          oc.restore();
        } else {
          oc.beginPath(); oc.moveTo(x * w, 0); oc.lineTo(x * w, H); oc.stroke();
          oc.beginPath(); oc.moveTo(0, y * w); oc.lineTo(W, y * w); oc.stroke();
        }
      }
    }
  }

  function _initOffscreen() {
    _offscreen = document.createElement('canvas');
    _offscreen.width = cfg.canvas_width;
    _offscreen.height = cfg.canvas_height;
    _offCtx = _offscreen.getContext('2d', { alpha: false });
  }

  function _reset() {
    if (!_offCtx) _initOffscreen();
    _offscreen.width = cfg.canvas_width;
    _offscreen.height = cfg.canvas_height;
    _pal  = pickPal();
    _pal1 = randPal();
    _pal2 = randPal();
    _offCtx.fillStyle = cfg.bg_color;
    _offCtx.fillRect(0, 0, cfg.canvas_width, cfg.canvas_height);
    drawGrid(_offCtx);
    _frame = 0;
  }

  function draw() {
    if (!_active) return;
    if (_needsReset) { _reset(); _needsReset = false; }

    var W = cfg.canvas_width, H = cfg.canvas_height;
    var spread = cfg.spread;
    var n = Math.floor(cfg.forms_per_frame);

    /* refresh palette grid periodically */
    if (_frame > 0 && _frame % cfg.grid_refresh === 0) {
      _pal1 = randPal();
      _pal2 = randPal();
      drawGrid(_offCtx);
    }

    /* tempo-gated spawning */
    var spawnOk = true;
    if (cfg.spawn_sync) {
      var now = performance.now() / 1000;
      var beatInterval = (60 / cfg.bpm) / cfg.spawn_beat_div;
      if (now - _lastSpawn < beatInterval) {
        spawnOk = false;
      } else {
        _lastSpawn += beatInterval;
        if (now - _lastSpawn > beatInterval) _lastSpawn = now;
      }
    }

    /* fade old forms toward bg when life > 0 */
    if (cfg.life > 0) {
      _offCtx.globalAlpha = Math.min(1, 4 / cfg.life);
      _offCtx.fillStyle = cfg.bg_color;
      _offCtx.fillRect(0, 0, W, H);
      _offCtx.globalAlpha = 1;
    }

    if (!spawnOk) {
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(_offscreen, 0, 0);
      _frame++;
      return;
    }

    /* draw N forms onto offscreen */
    for (var i = 0; i < n; i++) {
      var x = gauss(W / 2, W * spread);
      var y = gauss(H / 2, H * spread);
      var r = gauss(H * 0.001, H * (cfg.size_min * 0.005 + Math.random() * cfg.size_max * 0.01));
      r = Math.max(1, r);
      if (Math.random() < cfg.flower_prob) {
        drawFlower(_offCtx, x, y, r * 3);
      } else {
        drawPoly(_offCtx, x, y, r);
      }
    }

    /* copy offscreen → main canvas (alpha:false garantit l'opacité, pas de clearRect) */
    ctx.drawImage(_offscreen, 0, 0);

    _frame++;
  }

  function triggerPulse() { _reset(); }

  function activate() {
    _active = true;
    canvas = document.getElementById('c');
    ctx = canvas.getContext('2d');
    canvas.width = cfg.canvas_width;
    canvas.height = cfg.canvas_height;
    if (!_offscreen || _offscreen.width !== cfg.canvas_width || _offscreen.height !== cfg.canvas_height) {
      _reset();
    }
  }

  function deactivate() { _active = false; }

  function init() { _initOffscreen(); }

  return {
    cfg: cfg,
    init: init,
    draw: draw,
    activate: activate,
    deactivate: deactivate,
    reset: _reset,
    triggerPulse: triggerPulse,
    markReset: function () { _needsReset = true; }
  };
})();
