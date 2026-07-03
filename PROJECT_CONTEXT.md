# PROJECT_CONTEXT.md — Super Engine VJ

## Résumé

**Super Engine VJ** est un outil de performance visuelle générative en temps réel (VJ = Video Jockey), distribué sous forme d'un **fichier HTML unique autonome** (`super-engine.html`). Il fonctionne entièrement en local sans serveur, sans dépendances externes, directement depuis `file://`.

## Objectif

Permettre à un performeur live de :
- Switcher entre 20 moteurs visuels génératifs en direct
- Tweaker les paramètres en temps réel via des sliders
- Synchroniser les visuels au BPM (manuel, tap tempo, ou horloge MIDI)
- Piloter le tout via MIDI (CC, Note, Programme Change, Clock), OSC (WebSocket)
- Appliquer des effets post-process GPU (bloom, feedback, chroma, warp, etc.)
- Sauvegarder/charger des presets et des scènes

## Point d'entrée

- **Développement :** `node build.js` dans `super-engine-vj/` → génère `super-engine.html`
- **Usage :** ouvrir `super-engine.html` dans un navigateur moderne (Chrome recommandé pour WebGL2)

## Technologies

| Couche | Technologie |
|--------|-------------|
| Langage | JavaScript vanilla ES5/ES6 |
| Rendu 2D | Canvas 2D API |
| Rendu GPU | WebGL / WebGL2 (certains moteurs et effets FX) |
| Build | Node.js (script custom `build.js`, pas de bundler) |
| Persistance | `localStorage` (presets, scènes, bindings MIDI) |
| Communication externe | Web MIDI API, WebSocket (OSC JSON) |
| Style | CSS custom properties (variables `--accent`, theming) |

## Moteurs visuels (20)

| Clé | Nom affiché | Type de simulation |
|-----|-------------|-------------------|
| `fluid` | FLUID SIM | Fluide Eulerian + particules (moteur principal) |
| `vortex` | VORTEX | Tourbillons de Rankine |
| `nbody` | N-BODY | Gravitation N-corps |
| `sph` | SPH FLUID | Smoothed Particle Hydrodynamics |
| `boids` | BOIDS | Algorithme de nuée (Craig Reynolds) |
| `physarum` | PHYSARUM | Simulation moisissure à réseaux |
| `lorenz` | LORENZ | Attracteurs chaotiques (Lorenz, Rössler, Clifford, Thomas) |
| `react` | REACT | Systèmes réaction-diffusion (Gray-Scott) |
| `aco` | ACO FOURMIS | Algorithme colonie de fourmis |
| `rdiff` | REACTION-DIFFUSION | Patterns de Turing |
| `voronoi` | VORONOI VIVANT | Diagramme de Voronoï animé |
| `follow` | FOLLOW — FLOW FIELD | Champ de flux + suivi de particules |
| `ribbon` | RIBBON — RUBANS | Rubans physiques |
| `physiks` | PHYSIKS | Simulation de matériaux |
| `neural` | NEURAL — RÉSEAU | Visualisation réseau de neurones |
| `ink` | INK — ENCRE | Simulation encre/peinture |
| `slope` | SLOPE — CHAMPS | Champs de vecteurs |
| `dune` | DUNE — SABLE | Sable & bruit de Perlin |
| `cloth` | CLOTH — TISSU | Tissu physique avec découpe |
| `fpaint` | FLUID PAINTING | Peinture fluide GPU (WebGL2, domain-warping) |

## Fonctionnalités globales

- **FX Chain** : 16 effets post-process GPU empilables (bloom, chroma, feedback, warp, grain, vignette, miroir, seuil, etc.) avec mode PRE/POST et opacité par effet
- **MIDI** : CC mappable (Learn + manuel), Note Map, Programme Change → presets, MIDI Clock sync BPM
- **OSC** : via WebSocket (JSON) pour `/fluid/pulse`, `/fluid/auto_stroke`, `/fluid/<param>`
- **Scènes** : 8 slots, transition cut ou fade interpolé
- **Looper** : enregistrement et replay d'événements timed
- **Presets** : sauvegarde JSON dans localStorage, import/export fichier
- **Overlay** : superposition de deux moteurs simultanément avec alpha
- **HUD** : affichage BPM / moteur actif / scène en overlay discret
- **Thèmes** : sombre, clair, personnalisé (4 variables CSS)
- **Fullscreen** : mode plein écran avec masquage du panneau
