var Engine_Obscure = (function () {
  var canvas, ctx;
  var mouse = window._mouse;
  var _active = false, _needsReset = false;
  var _pmx = 0, _pmy = 0;
  var _lastPulse = 0;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    /* LIVE */
    row_pad: 50,
    col_pad: 10,
    home_force: 0.05,
    mouse_force: 800,
    mouse_radius: 150,
    damping: 0.85,
    line_weight: 20,
    circle_size: 0.6,
    /* COLOR */
    bg_color: '#ffffff',
    line_color: '#000000',
    c1: '#4466ff', c2: '#aa33ff', c3: '#ee0000', c4: '#008800', c5: '#dd1188',
    /* TEMPO */
    pulse_enabled: false, pulse_interval: 4.0, pulse_beat_div: 1,
    time_mode: 'bpm', bpm: 120
  };

  var particles = [];
  var cols = 0, rows = 0;
  var circleColor = '#4466ff';

  function getPalette() {
    return [cfg.c1, cfg.c2, cfg.c3, cfg.c4, cfg.c5];
  }

  function setRandomColor() {
    var pal = getPalette();
    circleColor = pal[Math.floor(Math.random() * pal.length)];
  }

  function idx(i, j) { return i * rows + j; }

  function initParticles() {
    var W = cfg.canvas_width, H = cfg.canvas_height;
    rows = Math.max(2, Math.floor(H / cfg.row_pad) + 1);
    cols = Math.max(2, Math.floor(W / cfg.col_pad) + 1);
    var adjRowPad = H / (rows - 1);
    var adjColPad = W / (cols - 1);
    particles = [];
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var x = i * adjColPad;
        var y = j * adjRowPad;
        particles.push({
          x: x, y: y, vx: 0, vy: 0,
          hx: x, hy: y,
          isStatic: (j === 0 || j === rows - 1)
        });
      }
    }
    setRandomColor();
  }

  /* Catmull-Rom → canvas bezier for one column */
  function drawColumn(i) {
    var pts = [];
    var topX = particles[idx(i, 0)].x;
    pts.push({ x: topX, y: -100 });
    for (var j = 0; j < rows; j++) {
      var p = particles[idx(i, j)];
      pts.push({ x: p.x, y: p.y });
    }
    pts.push({ x: topX, y: cfg.canvas_height + 100 });

    ctx.moveTo(pts[0].x, pts[0].y);
    var n = pts.length;
    for (var k = 0; k < n - 1; k++) {
      var p0 = pts[Math.max(0, k - 1)];
      var p1 = pts[k];
      var p2 = pts[k + 1];
      var p3 = pts[Math.min(n - 1, k + 2)];
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  function draw() {
    if (!_active) return;
    if (_needsReset) { _reset(); _needsReset = false; }

    var W = cfg.canvas_width, H = cfg.canvas_height;
    var now = performance.now() / 1000;

    /* pulse */
    var pulseEff = cfg.time_mode === 'bpm'
      ? (60 / cfg.bpm) * cfg.pulse_beat_div
      : cfg.pulse_interval;
    if (cfg.pulse_enabled && now - _lastPulse >= pulseEff) {
      triggerPulse(); _lastPulse = now;
    }

    /* clear */
    ctx.fillStyle = cfg.bg_color;
    ctx.fillRect(0, 0, W, H);

    /* circle underneath */
    var diam = Math.min(W, H) * cfg.circle_size;
    ctx.fillStyle = circleColor;
    ctx.beginPath();
    ctx.arc(W - mouse.x, H - mouse.y, diam / 2, 0, Math.PI * 2);
    ctx.fill();

    /* physics */
    var mdx = mouse.x - _pmx;
    var mdy = mouse.y - _pmy;
    var hasMoved = Math.abs(mdx) > 1 || Math.abs(mdy) > 1;
    var isHome = true;
    var mr = cfg.mouse_radius;

    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      if (p.isStatic) continue;

      p.vx += (p.hx - p.x) * cfg.home_force;
      p.vy += (p.hy - p.y) * cfg.home_force;

      if (hasMoved) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        if (dist < mr) {
          var falloff = 1 - dist / mr;
          var f = cfg.mouse_force * falloff * 0.003;
          p.vx += (dx / dist) * f;
          p.vy += (dy / dist) * f;
        }
      }

      p.vx *= cfg.damping;
      p.vy *= cfg.damping;
      p.x  += p.vx;
      p.y  += p.vy;

      if (Math.abs(p.x - p.hx) > 20) isHome = false;
    }

    if (isHome) setRandomColor();
    _pmx = mouse.x;
    _pmy = mouse.y;

    /* draw all columns in one stroke call */
    ctx.strokeStyle = cfg.line_color;
    ctx.lineWidth   = cfg.line_weight;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    for (var i = 0; i < cols; i++) drawColumn(i);
    ctx.stroke();

  }

  function triggerPulse() {
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      if (!p.isStatic) {
        p.vx += (Math.random() - 0.5) * 30;
        p.vy += (Math.random() - 0.5) * 30;
      }
    }
  }

  function _reset() {
    initParticles();
    if (ctx) {
      ctx.fillStyle = cfg.bg_color;
      ctx.fillRect(0, 0, cfg.canvas_width, cfg.canvas_height);
    }
  }

  function activate() {
    _active = true;
    canvas = document.getElementById('c');
    ctx    = canvas.getContext('2d');
    cfg.canvas_width  = canvas.width  || cfg.canvas_width;
    cfg.canvas_height = canvas.height || cfg.canvas_height;
    _pmx = mouse.x; _pmy = mouse.y;
    if (!particles.length) _reset();
    if (_needsReset) { _needsReset = false; _reset(); }
  }

  function deactivate() { _active = false; }

  function init() {
    canvas = document.getElementById('c');
    if (canvas) ctx = canvas.getContext('2d');
  }

  return {
    cfg: cfg, init: init, draw: draw,
    activate: activate, deactivate: deactivate,
    reset: _reset, triggerPulse: triggerPulse,
    markReset: function () { _needsReset = true; }
  };
})();
