/* ═══════════════════════════════════════════
   HAND CONTROL — webcam hand tracking (2 mains) → global cursor + canaux liables
   Pointeur = milieu pouce/index de la main droite (main gauche si seule visible).
   Pincement pouce-index de cette même main = clic maintenu.
   Écrit dans window._mouse (partagé par tous les moteurs) et window._handChannels
   (canaux continus 0-1, liables à n'importe quel slider via l'icône main bleue).
   MediaPipe HandLandmarker tourne 100% offline : Wasm + modèle embarqués en
   base64 (MP_ASSETS, voir build.js), chargés via blob: — aucun fetch().
═══════════════════════════════════════════ */
var HandControl = (function() {
  var _active = false;
  var _starting = false;
  var handLandmarker = null;
  var video = null;
  var stream = null;
  var rafId = 0;
  var smoothX = 0.5, smoothY = 0.5;
  var pinchThreshold = 0.45;
  var smoothing = 0.35;
  var overlayCtx = null;
  var lastFps = 0, fpsAcc = 0, fpsN = 0, fpsT = performance.now();
  var prevCx = { L: 0.5, R: 0.5 }, prevCy = { L: 0.5, R: 0.5 }, prevT = { L: 0, R: 0 };

  var CH = {};
  ['L_pinceIndex', 'L_pinceMajeur', 'L_pinceAnnulaire', 'L_pinceAuriculaire',
   'L_ouverture', 'L_proximite', 'L_hauteur', 'L_lateral', 'L_inclinaison', 'L_vitesse',
   'R_pinceIndex', 'R_pinceMajeur', 'R_pinceAnnulaire', 'R_pinceAuriculaire',
   'R_ouverture', 'R_proximite', 'R_hauteur', 'R_lateral', 'R_inclinaison', 'R_vitesse',
   'ecartement', 'diffHauteur', 'inclinaisonMains'
  ].forEach(function(k) { CH[k] = 0; });
  window._handChannels = CH;

  function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function norm(v, lo, hi) { return clamp01((v - lo) / (hi - lo)); }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  var lastMode = null; // 'online' | 'embedded'
  var CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
  var CDN_PROBE = CDN_BASE + '/vision_wasm_internal.js';
  var CDN_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

  function getHandLandmarkerClass() {
    if (!window.MP_ASSETS) throw new Error('MP_ASSETS manquant (build incomplet)');
    var cjsSource = new TextDecoder().decode(b64ToBytes(MP_ASSETS.cjs));
    var fakeModule = { exports: {} };
    (new Function('module', 'exports', cjsSource))(fakeModule, fakeModule.exports);
    var HandLandmarker = fakeModule.exports.HandLandmarker;
    if (!HandLandmarker) throw new Error('HandLandmarker introuvable dans le bundle MediaPipe');
    return HandLandmarker;
  }

  function createWithFallback(HandLandmarker, fileset, baseOptions, cb) {
    var opts = function(delegate) {
      var b = {}; for (var k in baseOptions) b[k] = baseOptions[k]; b.delegate = delegate;
      return { baseOptions: b, runningMode: 'VIDEO', numHands: 2 };
    };
    HandLandmarker.createFromOptions(fileset, opts('GPU')).then(function(hl) {
      handLandmarker = hl; cb(null);
    }).catch(function() {
      // fallback: certains GPU/drivers refusent le délégué GPU
      HandLandmarker.createFromOptions(fileset, opts('CPU')).then(function(hl) {
        handLandmarker = hl; cb(null);
      }).catch(function(err2) { cb(err2); });
    });
  }

  function probeConnectivity(cb) {
    if (navigator.onLine === false) { cb(false); return; }
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = setTimeout(function() { if (ctrl) ctrl.abort(); }, 2000);
    fetch(CDN_PROBE, { method: 'HEAD', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function() { clearTimeout(timer); cb(true); })
      .catch(function() { clearTimeout(timer); cb(false); });
  }

  function loadOnline(HandLandmarker, cb) {
    HandLandmarker.createFromOptions(
      { wasmLoaderPath: CDN_BASE + '/vision_wasm_internal.js', wasmBinaryPath: CDN_BASE + '/vision_wasm_internal.wasm' },
      { baseOptions: { modelAssetPath: CDN_MODEL, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 }
    ).then(function(hl) {
      handLandmarker = hl; lastMode = 'online'; cb(null);
    }).catch(function() {
      HandLandmarker.createFromOptions(
        { wasmLoaderPath: CDN_BASE + '/vision_wasm_internal.js', wasmBinaryPath: CDN_BASE + '/vision_wasm_internal.wasm' },
        { baseOptions: { modelAssetPath: CDN_MODEL, delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 2 }
      ).then(function(hl) { handLandmarker = hl; lastMode = 'online'; cb(null); })
        .catch(function() { loadEmbedded(HandLandmarker, cb); }); // CDN dispo mais échec (ex: CSP) → repli embarqué
    });
  }

  function loadEmbedded(HandLandmarker, cb) {
    var wasmLoaderPath, wasmBinaryPath, modelBytes;
    try {
      wasmLoaderPath = URL.createObjectURL(new Blob([b64ToBytes(MP_ASSETS.loader)], { type: 'text/javascript' }));
      wasmBinaryPath = URL.createObjectURL(new Blob([b64ToBytes(MP_ASSETS.wasm)], { type: 'application/wasm' }));
      modelBytes = b64ToBytes(MP_ASSETS.model);
    } catch (e) { cb(e); return; }
    createWithFallback(HandLandmarker, { wasmLoaderPath: wasmLoaderPath, wasmBinaryPath: wasmBinaryPath },
      { modelAssetBuffer: modelBytes }, function(err) {
        if (!err) lastMode = 'embedded';
        cb(err);
      });
  }

  function loadLandmarker(cb) {
    if (handLandmarker) { cb(null); return; }
    var HandLandmarker;
    try { HandLandmarker = getHandLandmarkerClass(); } catch (e) { cb(e); return; }
    probeConnectivity(function(online) {
      if (online) loadOnline(HandLandmarker, cb);
      else loadEmbedded(HandLandmarker, cb);
    });
  }

  function getMode() { return lastMode; }

  function startCamera(cb) {
    if (video) { cb(null); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cb(new Error('getUserMedia indisponible sur ce navigateur'));
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then(function(s) {
        stream = s;
        video = document.createElement('video');
        video.srcObject = s;
        video.playsInline = true;
        video.muted = true;
        video.addEventListener('loadeddata', function() { cb(null); }, { once: true });
        video.play();
      })
      .catch(function(err) { cb(err); });
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(function(t) { t.stop(); }); stream = null; }
    video = null;
  }

  // ── canaux par main (préfixe 'L' ou 'R') ──
  function computeHandChannels(side, lm) {
    var thumb = lm[4], index = lm[8], middle = lm[12], ring = lm[16], pinky = lm[20];
    var wrist = lm[0], midMcp = lm[9];
    var scale = dist(wrist, midMcp) || 0.1;

    CH[side + '_pinceIndex'] = 1 - norm(dist(thumb, index) / scale, 0.15, 0.9);
    CH[side + '_pinceMajeur'] = 1 - norm(dist(thumb, middle) / scale, 0.2, 1.1);
    CH[side + '_pinceAnnulaire'] = 1 - norm(dist(thumb, ring) / scale, 0.25, 1.3);
    CH[side + '_pinceAuriculaire'] = 1 - norm(dist(thumb, pinky) / scale, 0.3, 1.5);

    var spreadAvg = (dist(index, wrist) + dist(middle, wrist) + dist(ring, wrist) + dist(pinky, wrist)) / 4 / scale;
    CH[side + '_ouverture'] = norm(spreadAvg, 1.0, 2.6);

    CH[side + '_proximite'] = norm(scale, 0.08, 0.35);

    var cx = 1 - (thumb.x + index.x) / 2; // mirroir (webcam selfie)
    var cy = (thumb.y + index.y) / 2;
    CH[side + '_hauteur'] = 1 - clamp01(cy);
    CH[side + '_lateral'] = clamp01(cx);

    var tiltAngle = Math.atan2(midMcp.x - wrist.x, -(midMcp.y - wrist.y));
    CH[side + '_inclinaison'] = norm(tiltAngle, -1, 1);

    var now = performance.now();
    var dt = prevT[side] ? (now - prevT[side]) / 1000 : 0.033;
    var v = dt > 0 ? Math.sqrt(Math.pow(cx - prevCx[side], 2) + Math.pow(cy - prevCy[side], 2)) / dt : 0;
    prevCx[side] = cx; prevCy[side] = cy; prevT[side] = now;
    CH[side + '_vitesse'] = norm(v, 0.3, 4.0);

    return { cx: cx, cy: cy, wrist: wrist, pinceIndex: CH[side + '_pinceIndex'] };
  }

  function computeTwoHandChannels(dataL, dataR) {
    if (!dataL || !dataR) return;
    var dx = dataL.wrist.x - dataR.wrist.x, dy = dataL.wrist.y - dataR.wrist.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    CH.ecartement = norm(d, 0.1, 0.9);
    CH.diffHauteur = norm(0.5 + (dataR.cy - dataL.cy), 0, 1);
    var angle = Math.atan2(dataR.wrist.y - dataL.wrist.y, dataR.wrist.x - dataL.wrist.x);
    CH.inclinaisonMains = norm(angle, -Math.PI / 2, Math.PI / 2);
  }

  function applyHandBindings() {
    var hb = window._handBindings;
    if (!hb) return;
    Object.keys(hb).forEach(function(sliderId) {
      var b = hb[sliderId];
      if (b && CH[b.channel] !== undefined) b.applyFn(CH[b.channel]);
    });
  }

  function drawOverlay(hands) {
    if (!overlayCtx) return;
    var c = overlayCtx.canvas;
    overlayCtx.clearRect(0, 0, c.width, c.height);
    overlayCtx.drawImage(video, 0, 0, c.width, c.height);
    var wrists = {};
    hands.forEach(function(h) {
      overlayCtx.fillStyle = h.side === 'L' ? '#ffaa33' : '#00ffcc';
      for (var i = 0; i < h.lm.length; i++) {
        overlayCtx.beginPath();
        overlayCtx.arc(h.lm[i].x * c.width, h.lm[i].y * c.height, 3, 0, 6.28318);
        overlayCtx.fill();
      }
      wrists[h.side] = h.lm[0];
    });
    if (wrists.L && wrists.R) {
      overlayCtx.strokeStyle = '#ff3366';
      overlayCtx.beginPath();
      overlayCtx.moveTo(wrists.L.x * c.width, wrists.L.y * c.height);
      overlayCtx.lineTo(wrists.R.x * c.width, wrists.R.y * c.height);
      overlayCtx.stroke();
    }
    var now = performance.now();
    fpsAcc += now - fpsT; fpsT = now; fpsN++;
    if (fpsAcc > 500) { lastFps = Math.round(1000 * fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    overlayCtx.fillStyle = '#fff';
    overlayCtx.font = '10px monospace';
    overlayCtx.fillText(hands.map(function(h) { return h.side; }).join('+') + ' ' + lastFps + ' fps', 4, 12);
  }

  function loop() {
    if (!_active) return;
    rafId = requestAnimationFrame(loop);
    if (!video || video.readyState < 2 || !handLandmarker) return;
    var result = handLandmarker.detectForVideo(video, performance.now());
    var hands = [];
    var dataL = null, dataR = null;
    if (result.landmarks && result.landmarks.length > 0) {
      for (var i = 0; i < result.landmarks.length; i++) {
        var lm = result.landmarks[i];
        var handedness = result.handedness && result.handedness[i] && result.handedness[i][0];
        var side = handedness && handedness.categoryName === 'Left' ? 'L' : 'R';
        hands.push({ side: side, lm: lm });
        var data = computeHandChannels(side, lm);
        if (side === 'L') dataL = data; else dataR = data;
      }
      computeTwoHandChannels(dataL, dataR);

      // le pointeur/clic suivent la main droite (gauche en secours)
      var driver = dataR || dataL;
      var pinched = driver.pinceIndex > (1 - pinchThreshold);
      smoothX += (driver.cx - smoothX) * (1 - smoothing);
      smoothY += (driver.cy - smoothY) * (1 - smoothing);
      var c = document.getElementById('c');
      var W = c ? c.width : 1280, H = c ? c.height : 720;
      window._mouse.x = smoothX * W;
      window._mouse.y = smoothY * H;
      window._mouse.down = pinched;

      applyHandBindings();
      drawOverlay(hands);
    } else {
      drawOverlay([]);
    }
  }

  function setOverlayCanvas(canvasEl) {
    overlayCtx = canvasEl ? canvasEl.getContext('2d') : null;
  }

  function setPinchThreshold(v) { pinchThreshold = v; }
  function setSmoothing(v) { smoothing = v; }

  function enable(onDone) {
    if (_active || _starting) return;
    _starting = true;
    startCamera(function(camErr) {
      if (camErr) { _starting = false; if (onDone) onDone(camErr); return; }
      loadLandmarker(function(mlErr) {
        _starting = false;
        if (mlErr) { stopCamera(); if (onDone) onDone(mlErr); return; }
        _active = true;
        loop();
        if (onDone) onDone(null);
      });
    });
  }

  function disable() {
    _active = false;
    if (rafId) cancelAnimationFrame(rafId);
    stopCamera();
    window._mouse.down = false;
  }

  function isActive() { return _active; }

  return {
    enable: enable,
    disable: disable,
    isActive: isActive,
    getMode: getMode,
    setOverlayCanvas: setOverlayCanvas,
    setPinchThreshold: setPinchThreshold,
    setSmoothing: setSmoothing
  };
})();
