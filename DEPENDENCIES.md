# DEPENDENCIES.md — Super Engine VJ

## Dépendances runtime : AUCUNE

Le fichier `super-engine.html` généré est **entièrement autonome** :
- Zéro CDN externe
- Zéro `import` / `require`
- Zéro `fetch()` vers une API tierce
- Fonctionne en `file://` sans serveur HTTP

## Dépendances de build

| Dépendance | Version | Usage |
|------------|---------|-------|
| **Node.js** | ≥ 14 (LTS recommandé) | Exécuter `build.js` |
| `fs` (built-in Node) | — | Lecture des fichiers `src/` |
| `path` (built-in Node) | — | Résolution des chemins |

Aucun `package.json`, aucun `node_modules`. Le build utilise uniquement les modules natifs Node.

## APIs navigateur utilisées

| API | Moteur/Module | Obligatoire |
|-----|--------------|-------------|
| **Canvas 2D** (`getContext('2d')`) | Tous les moteurs | Oui |
| **WebGL** (`getContext('webgl')`) | FXEngine (effets post-process) | Non (effets désactivés si absent) |
| **WebGL2** (`getContext('webgl2')`) | `fpaint.js` (FLUID PAINTING) | Non (moteur inutilisable sans ça) |
| **requestAnimationFrame** | Boucle principale | Oui |
| **Web MIDI API** (`navigator.requestMIDIAccess`) | MIDI I/O | Non (feature optionnelle) |
| **WebSocket** | OSC over WS | Non (feature optionnelle) |
| **localStorage** | Presets, bindings MIDI | Non (presets non persistés si absent) |
| **FileReader** | Import de presets JSON | Non (feature optionnelle) |
| **Fullscreen API** (`requestFullscreen`) | Mode plein écran | Non |
| **performance.now()** | Timing BPM, looper, tap tempo | Oui |

## Compatibilité navigateur recommandée

| Navigateur | Compatibilité |
|------------|--------------|
| **Chrome / Chromium ≥ 90** | Optimale (WebGL2 + MIDI) |
| **Firefox ≥ 90** | Bonne (MIDI non supporté natif) |
| **Safari** | Limitée (MIDI non supporté, WebGL2 variable) |
| **Edge (Chromium)** | Bonne |

**Note :** Le moteur `fpaint` (Fluid Painting GPU) requiert WebGL2. Sur navigateur sans support WebGL2, le moteur sera non fonctionnel mais les 19 autres moteurs Canvas 2D continueront de fonctionner.
