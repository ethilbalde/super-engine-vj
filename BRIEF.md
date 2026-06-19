# BRIEF — Super Engine VJ

## Objectif
Outil VJ (performance visuelle live) : un fichier HTML unique autonome (`super-engine.html`) avec 23 moteurs génératifs animés, pilotables en temps réel via souris, MIDI et OSC.

## Décisions clés
- **Zéro dépendance** : fonctionne en `file://`, pas de serveur, pas de CDN
- **Build** : `node build.js` concatène `src/` → `super-engine.html` (vérifier nb de lignes après chaque modif)
- **Pattern moteur** : IIFE exposée en variable globale (`var Engine_Nom = (function(){...})()`)
- **Moteur maître** : `fluid.js` (`window.FluidSim`) centralise cfg canvas, BPM, presets globaux
- **WebGL2 off-screen** : les moteurs GPU (ex: `fpaint.js`) créent un canvas séparé, copient sur `#c` via `drawImage`
- **5 fichiers à toucher** pour ajouter un moteur : `engines/nom.js`, `build.js`, `ui.html` (×2), `main.js` (×7)
- **Erreur fréquente** : oublier d'ajouter le moteur dans la liste des tabs (~ligne 178 `main.js`) → onglets LIVE/COLOR muets
- **Onglet SIM supprimé** : le contenu SIM est fusionné à la suite du pane LIVE (séparé par un `<div class="sep">`) — plus de pane SIM séparé ni de bouton SIM dans le tab bar

## État actuel (2026-06-19)
- **23 moteurs** opérationnels : + SKETCH (bloom organique 2D, fond noir), NS FLUID (Navier-Stokes CPU)
- **SKETCH** : fond noir uni par défaut, sans grille, paramètre `life` (fondu des formes), tempo d'apparition syncable au BPM (`spawn_sync` + `spawn_beat_div`)
- **NS FLUID** : Navier-Stokes Stam 2003, particules CPU, force souris diffusée sur voisinage N×N (`mouse_radius` 1–4), artefact de bloc corrigé
- **FX Chain GPU** : 17 effets dont `colorramp` (ramp Blender-style avec stops draggables)
- **Turbulence fluide** : bruit cohérent sin/cos dans `fluid.js`
- **Presets factory v4** : presets couvrant SKETCH et NS FLUID
- **Tests** : `node test.js` (checks statiques) + `test.html` (tests runtime browser)
- **Tab bar** : LIVE · COLOR · TEMPO · MIDI · SAVE · SCN (SIM supprimé)

## Règles de livraison
- **Avant chaque `git push`** : mettre à jour `CHANGELOG.md` avec les ajouts et corrections du commit
- **Mémoire Claude** : les règles importantes sont sauvegardées dans `C:\Users\florent\.claude\projects\E--claude-programe-super-engine-vj\memory\` pour persister entre les sessions

## Versioning (`vMAJEUR.MINEUR.PATCH.BUILD`)
- **Build** (`.BUILD`) : auto-incrémenté par `node build.js` à chaque exécution
- **Patch** (`.PATCH`) : correction de bug, nettoyage, ajustement UI — incrémenter manuellement dans `main.js`
- **Mineur** (`.MINEUR`) : **ajout d'un nouveau moteur** — incrémenter `.MINEUR` et remettre `.PATCH` à 0
- **Majeur** (`vMAJEUR`) : refonte d'architecture ou changement de paradigme — décision explicite

## Infrastructure de test
- `node test.js` : build, fichiers moteurs, cohérence ENGINES/ACCENT/NAMES/ENG_PFX/tab-list, FX system, presets
- `test.html` : globals runtime, interface moteurs, activate/deactivate, fxRenderUI par type FX, DOM, presets localStorage
- **Règle** : lancer `node test.js` après chaque modif, `test.html` si quelque chose d'UI semble cassé

## Prochaines actions
1. **Clarifier** : décider si les scènes doivent persister en localStorage
2. **Nouveau moteur** : valider le plan avec l'utilisateur avant de toucher plus de 2 fichiers
