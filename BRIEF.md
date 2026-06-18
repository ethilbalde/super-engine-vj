# BRIEF — Super Engine VJ

## Objectif
Outil VJ (performance visuelle live) : un fichier HTML unique autonome (`super-engine.html`) avec 21 moteurs génératifs animés, pilotables en temps réel via souris, MIDI et OSC.

## Décisions clés
- **Zéro dépendance** : fonctionne en `file://`, pas de serveur, pas de CDN
- **Build** : `node build.js` concatène `src/` → `super-engine.html` (vérifier nb de lignes après chaque modif)
- **Pattern moteur** : IIFE exposée en variable globale (`var Engine_Nom = (function(){...})()`)
- **Moteur maître** : `fluid.js` (`window.FluidSim`) centralise cfg canvas, BPM, presets globaux
- **WebGL2 off-screen** : les moteurs GPU (ex: `fpaint.js`) créent un canvas séparé, copient sur `#c` via `drawImage`
- **5 fichiers à toucher** pour ajouter un moteur : `engines/nom.js`, `build.js`, `ui.html` (×2), `main.js` (×7)
- **Erreur fréquente** : oublier d'ajouter le moteur dans la liste des tabs (~ligne 178 `main.js`) → onglets LIVE/SIM/COLOR muets

## État actuel (2026-06-18)
- **21 moteurs** opérationnels (ajout WFC depuis le brief précédent)
- **FX Chain GPU** : 17 effets dont `colorramp` (ramp Blender-style avec stops draggables, interpolation linear/constant/ease)
- **Turbulence fluide** : bruit cohérent sin/cos dans `fluid.js`, slider Force + Vitesse dans l'onglet SIM
- **Presets factory v4** : 42 presets couvrant tous les paramètres LIVE/SIM/COLOR des 21 moteurs
- **Tests** : `node test.js` (81 checks statiques) + `test.html` (tests runtime browser)
- Trace morte : `'lsys'` dans la liste des tabs (moteur supprimé, sans impact)

## Règles de livraison
- **Avant chaque `git push`** : mettre à jour `CHANGELOG.md` avec les ajouts et corrections du commit
- **Mémoire Claude** : les règles importantes sont sauvegardées dans `C:\Users\florent\.claude\projects\E--claude-programe-super-engine-vj\memory\` pour persister entre les sessions

## Infrastructure de test
- `node test.js` : build, fichiers moteurs, cohérence ENGINES/ACCENT/NAMES/ENG_PFX/tab-list, FX system, presets
- `test.html` : globals runtime, interface moteurs, activate/deactivate, fxRenderUI par type FX, DOM, presets localStorage
- **Règle** : lancer `node test.js` après chaque modif, `test.html` si quelque chose d'UI semble cassé

## Prochaines actions
1. **Nettoyer** : retirer `'lsys'` et `'Engine_LSystem'` des listes dans `main.js`
2. **Clarifier** : décider si les scènes doivent persister en localStorage
3. **Nouveau moteur** : valider le plan avec l'utilisateur avant de toucher plus de 2 fichiers
