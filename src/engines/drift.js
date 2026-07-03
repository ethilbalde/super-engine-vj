var Engine_Drift = (function () {
  var canvas, ctx;
  var mouse = window._mouse;
  var _active = false, _needsReset = false;
  var _lastPulse = 0;
  var _t = 0, _wasDown = false;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    /* LIVE */
    speed: 2,
    spawn_rate: 1,
    y_amplitude: 1.0,
    noise_speed: 0.01,
    w_min: 3, w_max: 20,
    h_min: 0, h_max: 300,
    stroke_weight: 1.5,
    filled: false,
    /* COLOR */
    bg_color: '#000000',
    color_top: '#c80000',
    color_bot: '#0000c8',
    /* TEMPO */
    pulse_enabled: false, pulse_interval: 4.0, pulse_beat_div: 1,
    time_mode: 'bpm', bpm: 120
  };

  /* ── Simple Perlin 1D ── */
  var _perm = [];
  (function () {
    for (var i = 0; i < 256; i++) _perm[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = _perm[i]; _perm[i] = _perm[j]; _perm[j] = tmp;
    }
    for (var i = 0; i < 256; i++) _perm[i + 256] = _perm[i];
  })();

  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _grad(h, x) { return (h & 1) ? -x : x; }
  function noise(x) {
    var xi = Math.floor(x) & 255;
    var xf = x - Math.floor(x);
    var u = _fade(xf);
    var a = _grad(_perm[xi],     xf);
    var b = _grad(_perm[xi + 1], xf - 1);
    return 0.5 + 0.5 * (a + (b - a) * u);
  }

  var shapes = [];

  function spawnShape() {
    var W = cfg.canvas_width, H = cfg.canvas_height;
    var ns = cfg.noise_speed;
    var y   = H * 0.5 + (noise(_t * ns)         - 0.5) * H * cfg.y_amplitude;
    var w   = cfg.w_min + noise(1000 + _t * ns * 2.5) * (cfg.w_max - cfg.w_min);
    var h   = cfg.h_min + noise(10000 + _t * ns * 2.5) * (cfg.h_max - cfg.h_min);
    var ang = (noise(100000 + _t * ns) - 0.5) * 720;
    shapes.push({ x: W * 0.9, y: y, w: w, h: h, ang: ang });
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

    /* clic = burst */
    if (mouse.down && !_wasDown) triggerPulse();
    _wasDown = mouse.down;

    /* spawn */
    var rate = Math.max(1, Math.round(cfg.spawn_rate));
    for (var s = 0; s < rate; s++) { spawnShape(); _t++; }

    /* update & draw */
    ctx.lineWidth = cfg.stroke_weight;
    for (var i = shapes.length - 1; i >= 0; i--) {
      var sh = shapes[i];
      sh.x -= cfg.speed;
      if (sh.x < W * 0.05) { shapes.splice(i, 1); continue; }

      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.ang * Math.PI / 180);

      var hw = sh.w / 2, hh = sh.h / 2;

      if (cfg.filled) {
        ctx.fillStyle = cfg.color_top;
        ctx.fillRect(-hw, -hh, sh.w, hh);
        ctx.fillStyle = cfg.color_bot;
        ctx.fillRect(-hw, 0,   sh.w, hh);
      } else {
        ctx.strokeStyle = cfg.color_top;
        ctx.strokeRect(-hw, -hh, sh.w, hh);
        ctx.strokeStyle = cfg.color_bot;
        ctx.strokeRect(-hw, 0,   sh.w, hh);
      }

      ctx.restore();
    }
  }

  function triggerPulse() {
    for (var s = 0; s < 30; s++) { spawnShape(); _t++; }
  }

  function _reset() {
    shapes = [];
    _t = 0;
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
    if (!shapes.length) _reset();
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
