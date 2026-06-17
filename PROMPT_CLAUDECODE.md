# Prompt de reprise — Super Engine VJ

## Contexte du projet

Outil VJ single-file : `super-engine.html` (version `v4.0.0.027`).
Moteur de visualisation temps réel avec 23 moteurs graphiques (FLUID, VORTEX, NBODY, SPH, BOIDS, PHYSARUM, LORENZ, REACT, ACO, RDIFF, LSYS, VORONOI, FOLLOW, RIBBON, PHYSIKS, NEURAL, INK, SLOPE, DUNE, GROWTH, GRIDWAVE, BLOOM, DISPLACE).

Chaque moteur suit le pattern IIFE → `{cfg, init, draw, activate, deactivate, reset, triggerPulse, markReset}`.
État souris global : `window._mouse`. Système MIDI : `makeMidiBtn()`, `addMidiBtnToSlider()`.

GitHub : https://github.com/ethilbalde/super-engine-vj

---

## Ce qui a été fait dans la session précédente (Cowork)

Le fichier monolithique `super-engine.html` (~7500 lignes) a été **découpé en sources** pour faciliter le développement :

```
src/
  style.css          — CSS complet
  ui.html            — HTML du panneau + barre de moteurs
  utils.js           — colour utils, perlin noise, window._mouse
  info-modal.html    — modale d'info
  engines/
    fluid.js  vortex.js  nbody.js  sph.js  boids.js
    physarum.js  lorenz.js  react.js  aco.js  rdiff.js
    lsys.js  voronoi.js  follow.js  ribbon.js  physiks.js
    neural.js  ink.js  slope.js  dune.js  bloom.js
    displace.js  growth.js
  main.js            — ENGINE MANAGER, MIDI, scenes, wiring
build.js             — node build.js → régénère super-engine.html
```

Le build a été vérifié : il produit un fichier identique à l'original.
Un commit a été créé localement mais **pas encore pushé** (les credentials GitHub ne sont pas disponibles dans le sandbox Cowork).

## Action immédiate

```bash
cd "E:\claude programe\super-engine-vj"
git push
```

---

## Tâche principale : nouveau moteur Engine_Particles

Implémenter le sketch https://openprocessing.org/sketch/751983 comme nouveau moteur.

Le site retourne 403 en fetch automatique — **l'utilisateur doit coller le code source JS** depuis la page OpenProcessing (bouton `</>` dans le player).

### Ce qu'il faut faire une fois le code collé

1. Analyser le sketch et le réécrire comme `Engine_Particles` avec le pattern standard
2. Créer `src/engines/particles.js`
3. Ajouter `'engines/particles.js'` dans le tableau `ENGINE_FILES` de `build.js`
4. Dans `src/ui.html` : ajouter le bouton dans `#engine-bar`
   ```html
   <button class="eng-btn" data-engine="particles" style="--e:#COULEUR">PARTICLES</button>
   ```
   Et ajouter les panes HTML (tabs live/sim/color/tempo/io/save) en suivant le pattern des autres moteurs
5. Dans `src/main.js` : ajouter aux registres
   ```js
   ENGINES  → particles: window.Engine_Particles
   ACCENT   → particles: '#COULEUR'
   NAMES    → particles: 'NOM AFFICHÉ'
   ENG_PFX  → particles: 'pt'
   ```
6. Lancer `node build.js` pour régénérer `super-engine.html`
7. Tester dans le navigateur
8. Commiter et pusher

### Pattern de référence pour un moteur simple (canvas 2D)

Voir `src/engines/follow.js` ou `src/engines/boids.js` comme modèle.
Les moteurs grille (canvas offscreen) : voir `src/engines/physiks.js` ou `src/engines/ink.js`.
