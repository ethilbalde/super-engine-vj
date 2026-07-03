# Changelog — Super Engine VJ

---

## [2026-07-03] — v4.2.0.077

### Nettoyage

- Suppression de 5 panes orphelines dans `ui.html` (`lsys`, `growth`, `gridwave`, `bloom`, `displace`) — HTML sans moteur associé
- Suppression des références fantômes `lsys` dans `main.js` (`engineNames`, liste d'activation des tabs, `ENG_PFX`, `ALL_PFX`)
- Suppression de `src/engines/feedback.js` (orphelin, absent de `ENGINE_FILES`)

### Documentation

- Ajout du workflow **Banque Animation** dans `CLAUDE.md` (scan du dossier Google Drive pour proposer l'intégration de nouvelles animations)
- Ajout de `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, `DEPENDENCIES.md`, `TODO_RECOVERY.md`
- README mis à jour : liste des 26 moteurs actuels (était figée à 13), suppression de la mention de l'onglet SIM (fusionné dans LIVE)

### Tests

- Nouvelle suite `test-integrity.js` (91 tests, 0 warning)

---

## [2026-06-19] — v4.0.0.047

### Améliorations moteurs

- **SKETCH — fond propre** : offscreen canvas créé avec `{ alpha: false }` → le fondu `life` transite proprement vers `bg_color` sans tache grise résiduelle
- **SKETCH — params COLOR enrichis** : `opacity_min` (plancher opacité dégradé), `opacity_max` (plafond opacité dégradé), `stroke_prob` (probabilité contour vs remplissage)
- **NS FLUID — générateurs de mouvement** :
  - `turb_enabled` : turbulence cohérente sin/cos sur toute la grille (force, échelle, vitesse réglables)
  - `wind_enabled` : vent directionnel uniforme (angle 0–360°, force réglable)
  - `pgen_enabled` : impulsion radiale depuis le centre, synchronisée au BPM (`pgen_beat_div`)
- **WFC — refonte complète** : remplace le système mono-grille par `max_gens` (1–8) générations simultanées indépendantes, chacune avec taille de tuile, position, couleur et style aléatoires ; `done_delay` configurable avant respawn ; `triggerPulse` efface et recrée toutes les générations instantanément
  - 3 styles de dessin : courbes lisses (quadBézier), segments droits, trait épais + dots aux jonctions
  - Palette de 15 couleurs vives prédéfinies, sélectionnable ou aléatoire (`color_scheme`)
  - Effet glow optionnel (`glow_radius`) via `shadowBlur`/`shadowColor` canvas 2D
  - Fonds d'offscreen transparents (`{ alpha: true }`) → superposition naturelle sur le fond `bg_color`

### Technique
- **BRIEF.md** mis à jour : WFC multi-gen, SKETCH alpha:false, NS FLUID générateurs, pre-commit hook

---

## [2026-06-19] — v4.0.0.044

### Ajouts
- **Moteur SKETCH** : bloom organique 2D, accumulation de formes (polygones, étoiles, fleurs pointillistes) sur canvas off-screen — fond noir uni, 37 palettes, paramètre `life` (fondu progressif des formes vers le fond), sync tempo BPM (`spawn_sync` + `spawn_beat_div`)
- **Moteur NS FLUID** : simulation Navier-Stokes Stable Fluids (Stam 2003) CPU, 8000 particules, 3 modes couleur (uniforme / vélocité / position), paramètre `mouse_radius` (rayon d'influence du pointeur, 1–4 cellules avec falloff euclidien)
- **Presets SKETCH** : Risographie, Neon Storm, Pale Bloom, Dark Scatter
- **Presets NS FLUID** : Doux, Vélocité Color, Tempête, Position Arc-en-ciel

### Suppressions
- **Moteur FEEDBACK** supprimé (dysfonctionnel — WebGL2 RGBA32F non supporté sans extension sur certains navigateurs, aucune solution satisfaisante)

### Améliorations UI
- **Onglet SIM supprimé** du tab bar — contenu fusionné à la suite du pane LIVE pour tous les moteurs (28 moteurs traités), séparés par un `<div class="sep">`
- **NS FLUID — artefact curseur corrigé** : force diffusée sur voisinage N×N (rayon paramétrable) au lieu d'une cellule unique, delta clampée à ±20px, `_pmx`/`_pmy` initialisés à la position courante au démarrage
- **Versioning auto** : `build.js` incrémente automatiquement le numéro de build à chaque exécution

### Technique
- **BRIEF.md** mis à jour : 23 moteurs, structure des onglets, règles SIM→LIVE

---

## [2026-06-18] — commit `9f58d2b`

### Ajouts
- **FX Color Ramp** : nouvel effet inspiré de Blender — ramp de couleur avec stops draggables, ajout/suppression de stops par double-clic, interpolation Linear / Constant / Ease
- **Turbulence fluide** : bruit cohérent sin/cos dans le moteur FLUID (plus organique que le bruit blanc précédent) — sliders "Force turbulence" et "Vitesse turbulence" dans l'onglet SIM
- **Presets factory v4** : 42 presets couvrant tous les paramètres LIVE / SIM / COLOR des 21 moteurs
- **Suite de tests** :
  - `node test.js` — 81 vérifications statiques (build, fichiers moteurs, cohérence des registres, système FX, presets)
  - `test.html` — tests runtime browser (globals, interface moteurs, activate/deactivate, fxRenderUI par type FX, DOM)
- **BRIEF.md** : document de référence du projet mis à jour

### Corrections
- **FX panel vide** : crash silencieux dans `fxRenderUI` causé par l'utilisation de `fx` au lieu de `e` comme variable de boucle — tous les effets disparaissaient de la liste
- **FX WebGL texture units** : bug dans `applyEffect` colorramp — `gl.bindTexture` sans `setTex` écrasait TEXTURE0 avec les données LUT, cassant tous les effets suivants
- **Cloth activate()** : crash `Cannot set properties of undefined (setting 'fillStyle')` quand `activate()` était appelé sans `init()` — `ctx` est maintenant initialisé au besoin dans `activate()`
- **FPaint preset Default** : `pointer_mode` corrigé en `repel`
- **syncUIFromCfg** : les boutons pointer_mode des moteurs non-fluid (FPaint, Vortex, NBody, SPH, Boids, Physarum, React, ACO, Follow) n'étaient pas synchronisés au chargement d'un preset

---

## Historique antérieur

| Commit | Description |
|--------|-------------|
| `066f6d7` | Add CLAUDE.md — règles de dev et checklist intégration moteur |
| `7ed9597` | Add FLUID PAINTING engine — shader WebGL2 domain-warping |
| `c77de9c` | Fix CLOTH tabs — ajout de 'cloth' dans la liste d'activation |
| `9999f1d` | Add CLOTH engine — simulation tissu avec interaction de coupe |
| `09908eb` | Remove MANDALA engine |
