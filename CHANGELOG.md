# Changelog — Super Engine VJ

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
