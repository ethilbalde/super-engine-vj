/* ═══════════════════════════════════════════
   WFC ENGINE — Wave Function Collapse multi-génération
   Plusieurs grilles simultanées, tailles/positions/couleurs aléatoires,
   fonds transparents pour superposition, effet glow optionnel.
═══════════════════════════════════════════ */
var Engine_WFC = (function () {
  var canvas, ctx, mouse = window._mouse, _active = false;
  var _needsReset = false, lastPulseTime = 0;
  var _gens = [];

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    /* LIVE */
    max_gens: 4,
    collapse_speed: 10,
    done_delay: 2.0,
    /* SIM */
    tile_size_min: 14,
    tile_size_max: 72,
    blank_weight: 0.08,
    use_curves: true,
    glow_radius: 8,
    /* COLOR */
    bg_color: '#05050f',
    color_scheme: -1,   /* -1 = aléatoire par génération */
    /* TEMPO */
    pulse_enabled: false, pulse_interval: 6.0, pulse_beat_div: 1,
    bpm: 120, time_mode: 'bpm',
    pen_size: 60, push_force: 1.0
  };

  /* Palette de 15 couleurs vives sur fond sombre */
  var COLORS = [
    '#00ffcc', '#c084fc', '#38bdf8', '#ff6644', '#ffd23f',
    '#4ade80', '#f472b6', '#818cf8', '#fb923c', '#e2e8f0',
    '#ff4757', '#2ed573', '#eccc68', '#1e90ff', '#ff6b81'
  ];

  var TILES = [
    [0,0,0,0], [0,1,0,1], [1,0,1,0],
    [1,1,0,0], [1,0,0,1], [0,1,1,0], [0,0,1,1],
    [1,1,0,1], [0,1,1,1], [1,1,1,0], [1,0,1,1],
    [1,1,1,1]
  ];
  var BASE_W = [0.6, 2.2, 2.2, 1.5, 1.5, 1.5, 1.5, 0.65, 0.65, 0.65, 0.65, 0.35];

  /* ── WFC algorithm ── */

  function allIndices() {
    var a = []; for (var i = 0; i < TILES.length; i++) a.push(i); return a;
  }

  function weightedChoice(indices, bw) {
    var total = 0;
    for (var i = 0; i < indices.length; i++) {
      var w = (indices[i] === 0) ? bw * 5 : BASE_W[indices[i]];
      total += w;
    }
    var r = Math.random() * total, acc = 0;
    for (var i = 0; i < indices.length; i++) {
      var w = (indices[i] === 0) ? bw * 5 : BASE_W[indices[i]];
      acc += w;
      if (r <= acc) return indices[i];
    }
    return indices[indices.length - 1];
  }

  function computeWFC(COLS, ROWS, bw) {
    var N = ROWS * COLS;
    var g = new Int8Array(N).fill(-1);
    var poss = [];
    for (var i = 0; i < N; i++) poss.push(allIndices());
    var order = [], uncollapsed = N, maxIter = N * 6, iter = 0;

    while (uncollapsed > 0 && iter++ < maxIter) {
      var minE = 9999, best = -1;
      for (var i = 0; i < N; i++) {
        if (g[i] >= 0) continue;
        var e = poss[i].length;
        if (e === 0) { g[i] = 0; order.push((i << 8) | 0); uncollapsed--; continue; }
        var ej = e + Math.random() * 0.9;
        if (ej < minE) { minE = ej; best = i; }
      }
      if (best < 0) break;
      var chosen = weightedChoice(poss[best], bw);
      g[best] = chosen;
      order.push((best << 8) | chosen);
      uncollapsed--;
      _propagate(g, poss, best, COLS, ROWS);
    }
    for (var i = 0; i < N; i++) { if (g[i] < 0) order.push((i << 8) | 0); }
    return order;
  }

  function _propagate(g, poss, startIdx, COLS, ROWS) {
    var stack = [startIdx];
    var inStack = new Uint8Array(ROWS * COLS);
    inStack[startIdx] = 1;
    while (stack.length > 0) {
      var idx = stack.pop(); inStack[idx] = 0;
      if (g[idx] < 0) continue;
      var t = TILES[g[idx]];
      var r = Math.floor(idx / COLS), c = idx % COLS;
      var nbrs = [];
      if (r > 0)        nbrs.push([idx - COLS, 0, 2]);
      if (r < ROWS - 1) nbrs.push([idx + COLS, 2, 0]);
      if (c < COLS - 1) nbrs.push([idx + 1,    1, 3]);
      if (c > 0)        nbrs.push([idx - 1,    3, 1]);
      for (var ni = 0; ni < nbrs.length; ni++) {
        var nidx = nbrs[ni][0], me = nbrs[ni][1], them = nbrs[ni][2];
        if (g[nidx] >= 0) continue;
        var req = t[me], filtered = [], before = poss[nidx].length;
        for (var j = 0; j < poss[nidx].length; j++) {
          if (TILES[poss[nidx][j]][them] === req) filtered.push(poss[nidx][j]);
        }
        if (filtered.length === 0) filtered = [0];
        if (filtered.length < before) {
          poss[nidx] = filtered;
          if (!inStack[nidx]) { stack.push(nidx); inStack[nidx] = 1; }
        }
      }
    }
  }

  /* ── Tile rendering ── */

  function edgeMid(x, y, ts, dir) {
    var h = ts * 0.5;
    if (dir === 0) return [x + h, y];
    if (dir === 1) return [x + ts, y + h];
    if (dir === 2) return [x + h, y + ts];
    return [x, y + h];
  }

  function cornerCtrl(x, y, ts, d1, d2) {
    var top = (d1===0||d2===0), right = (d1===1||d2===1);
    var bot = (d1===2||d2===2), left  = (d1===3||d2===3);
    if (top && right) return [x + ts, y];
    if (top && left)  return [x, y];
    if (bot && right) return [x + ts, y + ts];
    return [x, y + ts];
  }

  function drawTileAt(oc, cellIdx, tileType, gen) {
    var r = Math.floor(cellIdx / gen.cols), c = cellIdx % gen.cols;
    var ts = gen.ts, x = c * ts, y = r * ts;
    var cx = x + ts * 0.5, cy = y + ts * 0.5;
    var t = TILES[tileType];

    oc.clearRect(x, y, ts, ts);
    if (tileType === 0) return;

    oc.strokeStyle = gen.fg;
    oc.lineWidth = gen.lw;
    oc.lineCap = (gen.style === 2) ? 'butt' : 'round';
    oc.lineJoin = 'round';

    var conns = t[0] + t[1] + t[2] + t[3];

    oc.beginPath();
    if (cfg.use_curves && gen.style !== 1 && conns === 2 && !(t[0]&&t[2]) && !(t[1]&&t[3])) {
      var dirs = [];
      for (var d = 0; d < 4; d++) if (t[d]) dirs.push(d);
      var p1 = edgeMid(x, y, ts, dirs[0]);
      var p2 = edgeMid(x, y, ts, dirs[1]);
      var cp = cornerCtrl(x, y, ts, dirs[0], dirs[1]);
      oc.moveTo(p1[0], p1[1]);
      oc.quadraticCurveTo(cp[0], cp[1], p2[0], p2[1]);
    } else {
      if (t[0]) { oc.moveTo(cx, y);      oc.lineTo(cx, cy); }
      if (t[2]) { oc.moveTo(cx, cy);     oc.lineTo(cx, y + ts); }
      if (t[1]) { oc.moveTo(cx, cy);     oc.lineTo(x + ts, cy); }
      if (t[3]) { oc.moveTo(x, cy);      oc.lineTo(cx, cy); }
    }
    oc.stroke();

    /* dot au centre pour jonctions (style épaisseur) */
    if (gen.style === 2 && conns >= 3) {
      oc.beginPath();
      oc.arc(cx, cy, gen.lw * 0.75, 0, Math.PI * 2);
      oc.fillStyle = gen.fg;
      oc.fill();
    }
  }

  /* ── Spawning ── */

  function spawnGen() {
    var W = cfg.canvas_width, H = cfg.canvas_height;
    var tsMin = Math.max(8,  cfg.tile_size_min | 0);
    var tsMax = Math.max(tsMin + 4, cfg.tile_size_max | 0);
    var ts = tsMin + Math.floor(Math.random() * (tsMax - tsMin + 1));

    var maxC = Math.floor(W / ts);
    var maxR = Math.floor(H / ts);
    var cols = Math.max(3, Math.floor(3 + Math.random() * (maxC - 2)));
    var rows = Math.max(3, Math.floor(3 + Math.random() * (maxR - 2)));
    cols = Math.min(cols, maxC);
    rows = Math.min(rows, maxR);

    var gw = cols * ts, gh = rows * ts;
    var x = Math.random() * Math.max(1, W - gw);
    var y = Math.random() * Math.max(1, H - gh);

    var fg;
    if (cfg.color_scheme >= 0 && cfg.color_scheme < COLORS.length) {
      fg = COLORS[cfg.color_scheme];
    } else {
      fg = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    /* 3 styles : 0=courbes lisses  1=segments droits  2=épais+dots */
    var style = Math.floor(Math.random() * 3);
    var lw = style === 2 ? Math.max(2, ts * 0.22) : Math.max(1, ts * 0.11 + 0.5);

    var off = document.createElement('canvas');
    off.width = gw; off.height = gh;
    var oCtx = off.getContext('2d', { alpha: true });

    return {
      x: x, y: y,
      cols: cols, rows: rows, ts: ts,
      fg: fg, lw: lw, style: style,
      off: off, oCtx: oCtx,
      queue: computeWFC(cols, rows, cfg.blank_weight),
      idx: 0,
      done: false, doneAt: 0
    };
  }

  /* ── Draw loop ── */

  function draw() {
    if (!_active) return;

    var W = cfg.canvas_width, H = cfg.canvas_height;
    var now = performance.now() / 1000;
    var maxG = Math.max(1, cfg.max_gens | 0);
    var speed = Math.max(1, cfg.collapse_speed | 0);

    /* fond principal */
    ctx.fillStyle = cfg.bg_color;
    ctx.fillRect(0, 0, W, H);

    /* garantir le bon nombre de générations */
    while (_gens.length < maxG) _gens.push(spawnGen());
    if (_gens.length > maxG) _gens.length = maxG;

    for (var gi = 0; gi < _gens.length; gi++) {
      var gen = _gens[gi];

      /* remplacer une génération terminée après done_delay */
      if (gen.done && (now - gen.doneAt) >= cfg.done_delay) {
        _gens[gi] = spawnGen();
        gen = _gens[gi];
      }

      /* avancer le collapse */
      if (!gen.done) {
        for (var s = 0; s < speed && gen.idx < gen.queue.length; s++, gen.idx++) {
          var packed = gen.queue[gen.idx];
          drawTileAt(gen.oCtx, packed >> 8, packed & 0xFF, gen);
        }
        if (gen.idx >= gen.queue.length) {
          gen.done = true;
          gen.doneAt = now;
        }
      }

      /* composite vers canvas principal avec glow optionnel */
      var gr = cfg.glow_radius | 0;
      if (gr > 0) {
        ctx.shadowBlur = gr;
        ctx.shadowColor = gen.fg;
      }
      ctx.drawImage(gen.off, gen.x, gen.y);
      ctx.shadowBlur = 0;
    }

    /* pulse auto */
    var pulseEff = cfg.time_mode === 'bpm'
      ? (60 / cfg.bpm) * cfg.pulse_beat_div
      : cfg.pulse_interval;
    if (cfg.pulse_enabled && now - lastPulseTime >= pulseEff) {
      triggerPulse(); lastPulseTime = now;
    }
  }

  function triggerPulse() { _gens = []; }

  function _reset() { _gens = []; }

  function activate() {
    _active = true;
    var cv = document.getElementById('c');
    canvas = cv;
    ctx = cv.getContext('2d');
    cfg.canvas_width  = cv.width  || cfg.canvas_width;
    cfg.canvas_height = cv.height || cfg.canvas_height;
    if (_needsReset) { _needsReset = false; _gens = []; }
  }

  function deactivate() { _active = false; }

  function init() {
    canvas = document.getElementById('c');
    if (canvas) ctx = canvas.getContext('2d');
    cfg.canvas_width  = FluidSim.cfg.canvas_width;
    cfg.canvas_height = FluidSim.cfg.canvas_height;
  }

  return {
    cfg: cfg, init: init, draw: draw,
    activate: activate, deactivate: deactivate,
    reset: _reset, triggerPulse: triggerPulse,
    markReset: function () { _needsReset = true; }
  };
})();
