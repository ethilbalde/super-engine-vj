# ARCHITECTURE.md — Super Engine VJ

## Structure des fichiers

```
super-engine-vj/
├── build.js                  ← Assembleur Node.js : concatène src/ → super-engine.html
├── super-engine.html         ← Fichier de sortie (NE PAS éditer directement)
├── PROJECT_CONTEXT.md        ← Ce document de contexte
├── ARCHITECTURE.md
├── DEPENDENCIES.md
├── TODO_RECOVERY.md
└── src/
    ├── style.css             ← Styles globaux, CSS custom properties, thèmes
    ├── ui.html               ← Structure HTML : panel, engine-bar, tabs, panes
    ├── utils.js              ← Fonctions partagées (lerpHex, hexToRgba, shiftHexHue)
    ├── main.js               ← EngineManager + tout le wiring UI (~2000 lignes)
    ├── info-modal.html       ← Modale "À propos"
    └── engines/              ← Un fichier .js par moteur (IIFE, variable globale)
        ├── fluid.js          ← MOTEUR RÉFÉRENCE — moteur principal + cfg maître
        ├── vortex.js
        ├── nbody.js
        ├── sph.js
        ├── boids.js
        ├── physarum.js
        ├── lorenz.js
        ├── react.js
        ├── aco.js
        ├── rdiff.js
        ├── voronoi.js
        ├── follow.js
        ├── ribbon.js
        ├── physiks.js
        ├── neural.js
        ├── ink.js
        ├── slope.js
        ├── dune.js
        ├── cloth.js
        └── fpaint.js         ← WebGL2, domain-warping shader
```

## Ordre d'assemblage (build.js)

```
HTML :  <style>style.css</style>
        ui.html                 (body + panel)
        <script>
          utils.js              (fonctions partagées)
          engines/*.js          (20 IIFEs, ordre du tableau ENGINE_FILES)
          main.js               (EngineManager + wiring)
        </script>
        info-modal.html
```

## Pattern moteur

Chaque moteur est une **IIFE** qui expose une interface commune :

```javascript
var Engine_Nom = (function() {
  var _active = false;
  var cfg = { canvas_width, canvas_height, bpm, time_mode, ... };

  function init()        { /* setup DOM/GL, une seule fois */ }
  function activate()    { _active = true; /* sync taille canvas */ }
  function deactivate()  { _active = false; }
  function draw()        { if (!_active) return; /* frame */ }
  function _reset()      { /* réinitialiser état */ }
  function triggerPulse(){ /* impulsion rhythmique */ }
  function markReset()   { _needsReset = true; /* reset lazy au prochain activate */ }

  return { cfg, init, draw, activate, deactivate, reset: _reset, triggerPulse, markReset };
})();
```

**Cas WebGL2** (`fpaint.js`) : canvas off-screen séparé, rendu WebGL2 dessus, puis `ctx.drawImage(glCanvas, 0, 0)` sur le canvas principal.

## Flux de données et rendu

```
requestAnimationFrame
  └── masterDraw()                         [main.js — EngineManager]
        ├── FXEngine.apply('pre')           [effets GPU avant moteur]
        ├── ENGINES[activeEngine].draw()    [moteur actif]
        ├── overlayEngine.draw()            [moteur overlay si actif]
        ├── FXEngine.apply('post')          [effets GPU après moteur]
        │   └── ping-pong WebGL sur #gl-canvas
        ├── glRender(warpAmount)            [legacy warp fluid]
        ├── drawGlobalCursor()              [crosshair sur #cursor-overlay]
        ├── _hudUpdate()                    [HUD BPM/moteur/scène, 1/20 frames]
        ├── _fadeTick()                     [interpolation transition scène]
        └── _looperTick()                   [looper timing]
```

## Canvases (couches)

| ID | Type | Rôle |
|----|------|------|
| `#c` | Canvas 2D | Canvas principal, rendu de tous les moteurs |
| `#cursor-overlay` | Canvas 2D | Curseur crosshair + ring de rayon (au-dessus) |
| `#gl-canvas` | Canvas WebGL | Effets FX post-process (au-dessus de #c, CSS position:absolute) |

## EngineManager (main.js)

```
ENGINES{}     → map clé → objet moteur
ACCENT{}      → map clé → couleur CSS hex
NAMES{}       → map clé → label affiché

switchEngine(name, isOverlay)
  → deactivate ancien moteur
  → mettre à jour --accent CSS
  → afficher le bon .engine-panes
  → activate nouveau moteur

masterDraw()  → boucle RAF principale
init()        → initialise tous les moteurs + bind les boutons eng-btn
```

## Système de tabs

6 onglets globaux : `live | sim | color | tempo | io | save | scenes | output | info | bug`

Chaque moteur a ses propres panes `tab-{engine}-{tab}`. La logique dans `main.js` (~ligne 178) active simultanément l'onglet global et l'onglet du moteur courant.

## FX Chain Engine (main.js — FXEngine IIFE)

- Pipeline **ping-pong WebGL** (3 textures, 3 framebuffers)
- 16 types d'effets avec shaders GLSL inline
- Effets multi-pass séparés : `bloom` (2 passes), `eevee` (5 passes Kawase)
- Chaque effet a un paramètre `opacity` pour blend partiel
- Phase `pre` (avant draw moteur) ou `post` (après)
- Résultat final copié sur `#gl-canvas` par-dessus `#c`

## Communication externe

| Protocole | Implémentation | Capacités |
|-----------|---------------|-----------|
| Web MIDI | `navigator.requestMIDIAccess` | CC (mappable + Learn), Note Map, PC → preset, MIDI Clock BPM |
| OSC | WebSocket + JSON | `/fluid/pulse`, `/fluid/auto_stroke`, `/fluid/<param>` |

## Persistance

| Donnée | Stockage |
|--------|---------|
| Presets moteurs | `localStorage['super_engine_presets']` (JSON) |
| Scènes (8 slots) | Mémoire JavaScript (session uniquement) |
| Bindings MIDI Learn | `localStorage['vj_ml_bindings']` |
| Thème UI | `localStorage` (implicite via CSS vars) |
