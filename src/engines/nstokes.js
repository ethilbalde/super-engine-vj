var Engine_NSFluid = (function () {
  var canvas, ctx;
  var mouse = window._mouse;
  var _active = false, _needsReset = false;
  var _lastTime = 0, _pmx = 0, _pmy = 0;
  var _lastPulse = 0;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    /* LIVE */
    velocity_scale: 11,
    mouse_force: 0.1,
    mouse_radius: 1,
    pen_size: 40,
    /* SIM */
    grid_n: 15,
    viscosity: 0.00025,
    num_particles: 8000,
    point_size: 1.5,
    trail_alpha: 0.15,
    /* COLOR */
    bg_color: '#000000',
    particle_color: '#ffffff',
    color_mode: 0,   /* 0=uniforme  1=vélocité  2=position */
    /* TEMPO */
    pulse_enabled: false, pulse_interval: 8.0, pulse_beat_div: 1,
    time_mode: 'bpm', bpm: 120
  };

  /* ── Navier-Stokes solver (Stam 2003) ── */
  function Solver(N) {
    this.N    = N;
    this.SIZE = (N + 2) * (N + 2);
    this.u  = new Float32Array(this.SIZE);
    this.v  = new Float32Array(this.SIZE);
    this.u0 = new Float32Array(this.SIZE);
    this.v0 = new Float32Array(this.SIZE);
  }

  Solver.prototype.idx = function (i, j) { return i + (this.N + 2) * j; };

  Solver.prototype.getDx = function (x, y) { return this.u[this.idx(x + 1, y + 1)]; };
  Solver.prototype.getDy = function (x, y) { return this.v[this.idx(x + 1, y + 1)]; };

  Solver.prototype.applyForce = function (cx, cy, vx, vy) {
    cx++; cy++;
    var i = this.idx(cx, cy);
    if (vx !== 0) this.u[i] = vx + (this.u[i] - vx) * 0.85;
    if (vy !== 0) this.v[i] = vy + (this.v[i] - vy) * 0.85;
  };

  Solver.prototype.setBnd = function (b, x) {
    var N = this.N;
    for (var i = 1; i <= N; i++) {
      x[this.idx(0,   i)] = b === 1 ? -x[this.idx(1, i)] : x[this.idx(1, i)];
      x[this.idx(N+1, i)] = b === 1 ? -x[this.idx(N, i)] : x[this.idx(N, i)];
      x[this.idx(i,   0)] = b === 2 ? -x[this.idx(i, 1)] : x[this.idx(i, 1)];
      x[this.idx(i, N+1)] = b === 2 ? -x[this.idx(i, N)] : x[this.idx(i, N)];
    }
    x[this.idx(0,   0  )] = 0.5*(x[this.idx(1,0)]   + x[this.idx(0,1)]);
    x[this.idx(0,   N+1)] = 0.5*(x[this.idx(1,N+1)] + x[this.idx(0,N)]);
    x[this.idx(N+1, 0  )] = 0.5*(x[this.idx(N,0)]   + x[this.idx(N+1,1)]);
    x[this.idx(N+1, N+1)] = 0.5*(x[this.idx(N,N+1)] + x[this.idx(N+1,N)]);
  };

  Solver.prototype.diffuse = function (b, x, x0, diff, dt) {
    var a = dt * diff * this.N * this.N, N = this.N;
    for (var k = 0; k < 20; k++) {
      for (var i = 1; i <= N; i++) {
        for (var j = 1; j <= N; j++) {
          x[this.idx(i,j)] = (x0[this.idx(i,j)] + a*(
            x[this.idx(i-1,j)] + x[this.idx(i+1,j)] +
            x[this.idx(i,j-1)] + x[this.idx(i,j+1)]
          )) / (1 + 4*a);
        }
      }
      this.setBnd(b, x);
    }
  };

  Solver.prototype.project = function (u, v, p, div) {
    var h = 1.0 / this.N, N = this.N;
    for (var i = 1; i <= N; i++) {
      for (var j = 1; j <= N; j++) {
        div[this.idx(i,j)] = -0.5*h*(
          u[this.idx(i+1,j)] - u[this.idx(i-1,j)] +
          v[this.idx(i,j+1)] - v[this.idx(i,j-1)]);
        p[this.idx(i,j)] = 0;
      }
    }
    this.setBnd(0, div); this.setBnd(0, p);
    for (var k = 0; k < 20; k++) {
      for (var i = 1; i <= N; i++) {
        for (var j = 1; j <= N; j++) {
          p[this.idx(i,j)] = (div[this.idx(i,j)] +
            p[this.idx(i-1,j)] + p[this.idx(i+1,j)] +
            p[this.idx(i,j-1)] + p[this.idx(i,j+1)]) / 4;
        }
      }
      this.setBnd(0, p);
    }
    for (var i = 1; i <= N; i++) {
      for (var j = 1; j <= N; j++) {
        u[this.idx(i,j)] -= 0.5*(p[this.idx(i+1,j)] - p[this.idx(i-1,j)]) / h;
        v[this.idx(i,j)] -= 0.5*(p[this.idx(i,j+1)] - p[this.idx(i,j-1)]) / h;
      }
    }
    this.setBnd(1, u); this.setBnd(2, v);
  };

  Solver.prototype.tick = function (dt, visc) {
    this.diffuse(1, this.u, this.u, visc, dt);
    this.diffuse(2, this.v, this.v, visc, dt);
    this.project(this.u, this.v, this.u0, this.v0);
  };

  /* ── Particles ── */
  var solver, particles;

  function lp(a, b, t) { return a + (b - a) * t; }

  function initParticles() {
    var W = cfg.canvas_width, H = cfg.canvas_height;
    var n = Math.floor(cfg.num_particles);
    particles = new Float32Array(n * 2);
    for (var i = 0; i < n; i++) {
      particles[i*2]   = Math.random() * W;
      particles[i*2+1] = Math.random() * H;
    }
  }

  function initSolver() {
    solver = new Solver(cfg.grid_n);
  }

  function hexRgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }

  /* velocity magnitude → HSL color string */
  function velColor(speed) {
    var t = Math.min(speed * 8, 1);
    var h = (220 - t * 220)|0;
    var l = (30 + t * 55)|0;
    return 'hsl('+h+',90%,'+l+'%)';
  }

  function posColor(x, W) {
    return 'hsl('+((x/W*300)|0)+',80%,60%)';
  }

  /* ── draw ── */
  function draw() {
    if (!_active) return;
    if (_needsReset) { _reset(); _needsReset = false; }

    var W = cfg.canvas_width, H = cfg.canvas_height;
    var now = performance.now() / 1000;
    var dt  = Math.min(now - _lastTime, 0.05);
    _lastTime = now;

    /* pulse */
    var pulseEff = cfg.time_mode === 'bpm'
      ? (60 / cfg.bpm) * cfg.pulse_beat_div
      : cfg.pulse_interval;
    if (cfg.pulse_enabled && now - _lastPulse >= pulseEff) {
      initParticles(); _lastPulse = now;
    }

    /* mouse force — spread over 3×3 neighbourhood to avoid single-cell block artefact */
    if (mouse.x > 0 && mouse.x < W && mouse.y > 0 && mouse.y < H) {
      var mdx = Math.max(-20, Math.min(20, mouse.x - _pmx));
      var mdy = Math.max(-20, Math.min(20, mouse.y - _pmy));
      if (Math.abs(mdx) + Math.abs(mdy) > 0.3 || mouse.down) {
        var cx = Math.floor(cfg.grid_n * mouse.x / W);
        var cy = Math.floor(cfg.grid_n * mouse.y / H);
        for (var di = -cfg.mouse_radius; di <= cfg.mouse_radius; di++) {
          for (var dj = -cfg.mouse_radius; dj <= cfg.mouse_radius; dj++) {
            var nx = cx + di, ny = cy + dj;
            if (nx >= 0 && nx < cfg.grid_n && ny >= 0 && ny < cfg.grid_n) {
              var dist = Math.sqrt(di*di + dj*dj);
              var falloff = 1 / (1 + dist);
              solver.applyForce(nx, ny, mdx * cfg.mouse_force * falloff, mdy * cfg.mouse_force * falloff);
            }
          }
        }
      }
    }
    _pmx = mouse.x; _pmy = mouse.y;

    /* simulate */
    solver.tick(dt, cfg.viscosity);

    /* trail */
    var bg = hexRgb(cfg.bg_color);
    ctx.fillStyle = 'rgba('+bg[0]+','+bg[1]+','+bg[2]+','+cfg.trail_alpha+')';
    ctx.fillRect(0, 0, W, H);

    /* particles */
    var n    = solver.N;
    var cW   = W / n;
    var cH   = H / n;
    var vSc  = cfg.velocity_scale;
    var ps   = cfg.point_size;
    var mode = cfg.color_mode;
    var pc   = hexRgb(cfg.particle_color);
    var uniformCol = 'rgb('+pc[0]+','+pc[1]+','+pc[2]+')';
    var count = (particles.length / 2)|0;

    if (mode === 0) ctx.fillStyle = uniformCol;

    for (var i = 0; i < count; i++) {
      var px = particles[i*2];
      var py = particles[i*2+1];

      var cxp = Math.max(0, Math.min(n-1, (px / cW)|0));
      var cyp = Math.max(0, Math.min(n-1, (py / cH)|0));

      var dx = solver.getDx(cxp, cyp);
      var dy = solver.getDy(cxp, cyp);

      /* bilinear interpolation of velocity */
      var lX = px - cxp * cW - cW * 0.5;
      var lY = py - cyp * cH - cH * 0.5;
      var vn, hn, vf, hf;
      if (lX > 0) { vn = Math.min(n, cxp+1); vf=1; } else { vn = Math.max(0, cxp-1); vf=-1; }
      if (lY > 0) { hn = Math.min(n, cyp+1); hf=1; } else { hn = Math.max(0, cyp-1); hf=-1; }
      var tx = vf * lX / cW;
      var ty = hf * lY / cH;
      dx = lp(lp(dx, solver.getDx(vn,cyp), tx), lp(solver.getDx(cxp,hn), solver.getDx(vn,hn), tx), ty);
      dy = lp(lp(dy, solver.getDy(vn,cyp), tx), lp(solver.getDy(cxp,hn), solver.getDy(vn,hn), tx), ty);

      px += dx * vSc;
      py += dy * vSc;
      if (px < 0) px = 0; if (px > W) px = W;
      if (py < 0) py = 0; if (py > H) py = H;
      particles[i*2]   = px;
      particles[i*2+1] = py;

      if (mode === 1) ctx.fillStyle = velColor(Math.sqrt(dx*dx+dy*dy));
      else if (mode === 2) ctx.fillStyle = posColor(px, W);

      ctx.fillRect(px, py, ps, ps);
    }
  }

  function _reset() {
    initSolver();
    initParticles();
    _lastTime  = performance.now() / 1000;
    _lastPulse = _lastTime;
    _pmx = mouse.x; _pmy = mouse.y;
    /* clear canvas */
    if (ctx) {
      var bg = hexRgb(cfg.bg_color);
      ctx.fillStyle = 'rgb('+bg[0]+','+bg[1]+','+bg[2]+')';
      ctx.fillRect(0, 0, cfg.canvas_width, cfg.canvas_height);
    }
  }

  function triggerPulse() { initParticles(); }

  function activate() {
    _active = true;
    canvas = document.getElementById('c');
    ctx    = canvas.getContext('2d');
    cfg.canvas_width  = canvas.width  || cfg.canvas_width;
    cfg.canvas_height = canvas.height || cfg.canvas_height;
    _pmx = mouse.x; _pmy = mouse.y;
    if (!solver) _reset();
    if (_needsReset) { _needsReset = false; _reset(); }
  }

  function deactivate() { _active = false; }

  function init() {
    canvas = document.getElementById('c');
    if (canvas) ctx = canvas.getContext('2d');
  }

  return {
    cfg: cfg,
    init: init, draw: draw,
    activate: activate, deactivate: deactivate,
    reset: _reset, triggerPulse: triggerPulse,
    resetSolver:    function () { initSolver(); },
    resetParticles: function () { initParticles(); },
    markReset: function () { _needsReset = true; }
  };
})();
