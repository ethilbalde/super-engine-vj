# Super Engine VJ — Règles de développement

## Commandes

| Action | Commande |
|--------|----------|
| Build (unique) | `node build.js` |
| Build (watch) | `node build.js --watch` |
| Résultat | `super-engine.html` (fichier unique, aucun serveur requis) |

Après chaque modification de `src/`, toujours lancer `node build.js` et vérifier que le nombre de lignes affiché est cohérent (pas de baisse inattendue).

---

## Architecture du projet

```
super-engine-vj/
├── build.js                  ← assembleur : concatène src/ → super-engine.html
├── super-engine.html         ← fichier de sortie (ne jamais éditer directement)
└── src/
    ├── style.css             ← styles globaux
    ├── ui.html               ← boutons moteurs + onglets + panes de contrôle
    ├── utils.js              ← fonctions partagées (lerpHex, hexToRgba, shiftHexHue…)
    ├── main.js               ← EngineManager, système de tabs, wiring de chaque moteur
    ├── info-modal.html       ← modale d'info globale
    └── engines/              ← un fichier .js par moteur
        ├── fluid.js          ← MOTEUR RÉFÉRENCE — copier sa structure pour tout nouveau moteur
        ├── dune.js, cloth.js, fpaint.js…
```

**Contrainte fondamentale :** tout doit fonctionner en `file://` local, sans serveur. Pas de `fetch()`, pas d'import ES modules, pas de CDN externe dans le code moteur.

---

## Pattern moteur (IIFE)

Chaque moteur est une Immediately Invoked Function Expression exposée en variable globale :

```javascript
var Engine_NomMoteur = (function() {
  var canvas, ctx;
  var mouse = window._mouse;   // curseur global partagé
  var _active = false;

  var cfg = {
    canvas_width: 800, canvas_height: 600,
    // ... tous les paramètres
    pulse_enabled: false, pulse_interval: 4.0, pulse_beat_div: 1,
    time_mode: 'bpm', bpm: 120
  };

  function draw()       { if (!_active) return; /* rendu */ }
  function _reset()     { /* réinitialiser l'état */ }
  function triggerPulse() { /* impulsion */ }
  function activate()   { _active = true; /* sync canvas_width/height */ }
  function deactivate() { _active = false; }
  function init()       { /* setup initial */ }

  return { cfg, init, draw, activate, deactivate, reset: _reset,
           triggerPulse, markReset: function() { _needsReset = true; } };
})();
```

**Cas WebGL2** (moteurs shader comme `fpaint.js`) : créer un canvas WebGL2 off-screen séparé, rendre dessus, puis copier sur le canvas principal 2D avec `ctx.drawImage(glCanvas, 0, 0)`. Ne jamais appeler `getContext('webgl2')` sur `#c`.

---

## Checklist : ajouter un nouveau moteur (5 fichiers)

Valider le plan avant de toucher plus de 2 fichiers.

### 1. `src/engines/nom.js`
Créer le fichier moteur en suivant le pattern IIFE ci-dessus.

### 2. `build.js`
Ajouter `'engines/nom.js'` dans le tableau `ENGINE_FILES` (respecter l'ordre de chargement).

### 3. `src/ui.html` — 2 endroits
- **Bouton** dans la grille des moteurs : `<button class="eng-btn" data-engine="nom" style="--e:#couleur">LABEL</button>`
- **Panes** : bloc `<div class="engine-panes" data-engine="nom">` avec les onglets `tab-nom-live`, `tab-nom-sim`, `tab-nom-color`, `tab-nom-tempo`, `tab-nom-io`, `tab-nom-save`

### 4. `src/main.js` — 7 endroits critiques

```javascript
// 1. Registre des moteurs
var ENGINES = { ..., nom: window.Engine_Nom };

// 2. Couleur accent
var ACCENT = { ..., nom: '#couleur' };

// 3. Nom affiché
var NAMES = { ..., nom: 'NOM — Description' };

// 4. Sync canvas size au resize  (ligne ~100)
var engineNames = [..., 'Engine_Nom'];

// 5. ⚠️ CRITIQUE — activation des onglets  (ligne ~178)
['vortex', ..., 'dune', 'cloth', 'fpaint', 'nom'].forEach(function(eng) { ... });

// 6. Préfixe HTML → moteur actif (pour sync curseur MIDI)
var ENG_PFX = { ..., nom: 'pfx' };

// 7. Liste pour cursor-x/y + btn-click
var ALL_PFX = [..., 'pfx'];
```

> **⚠️ Erreur la plus fréquente :** oublier le point 5 (liste ligne ~178). Symptôme : les onglets LIVE/SIM/COLOR s'affichent pour FLUID mais pas pour le nouveau moteur.

### 5. Wiring `src/main.js`
Bloc IIFE `(function(){ var E=Engine_Nom; ... })()` qui connecte chaque `<input>` / `<button>` de l'UI à `E.cfg.*` et aux méthodes du moteur. L'insérer avant la section `CURSOR X/Y + CLICK`.

---

## Supprimer un moteur (checklist inverse)

1. Supprimer `src/engines/nom.js`
2. Retirer de `ENGINE_FILES` dans `build.js`
3. Retirer le bouton et les panes dans `src/ui.html`
4. Retirer des 7 endroits dans `src/main.js` (ENGINES, ACCENT, NAMES, engineNames, liste ~178, ENG_PFX, ALL_PFX)
5. Supprimer le bloc de wiring

---

## Style de code

- **Langage :** JavaScript vanilla ES5/ES6 (pas de TypeScript, pas de bundler)
- **Pattern :** IIFE + variables locales — pas de classes, pas de modules
- **Commentaires :** en anglais, uniquement quand le *pourquoi* n'est pas évident
- **Nommage :** `camelCase` pour les variables JS, `kebab-case` pour les IDs HTML
- **Préfixe HTML :** chaque moteur a un préfixe court unique (ex: `dun`, `clth`, `fp`) pour tous ses IDs — éviter tout conflit entre moteurs
- **Pas de commentaires** qui décrivent ce que le code fait (le code le dit lui-même)

---

## Fonctions utilitaires disponibles (utils.js)

```javascript
lerpHex(a, b, t)          // interpolation couleur hex
hexToRgba(hex, alpha)     // hex → 'rgba(...)'
shiftHexHue(hex, degrees) // rotation de teinte
```

---

## Règle d'or avant de coder

- **Valider le plan** avec l'utilisateur avant de modifier plus de 2 fichiers
- **Lancer `node build.js`** après chaque modification et vérifier l'absence d'erreur
- **Toujours répondre en français**, écrire le code et les commentaires en anglais
- Ne pas ajouter de fonctionnalités non demandées, ne pas refactoriser le code existant sans demande explicite

---

## Banque Animation (Google Drive)

Quand l'utilisateur dit **"scan le dossier banque animation"** :

Scanner le dossier Drive :
`Claude Programe / Banque Animation`
ID Drive : `10iCsXDkYoaDfJADkUiOIbimUliWBmUk2`

### Statuts des fichiers
- `nom.md` → à proposer
- `nom [SKIP].md` → refusé, reproposer au prochain scan
- `nom [HOLD].md` → en attente, ne pas proposer
- `nom [TRAITÉ].md` → intégré, ignorer

### Workflow — un fichier à la fois

#### ÉTAPE 1 — Présentation
Lire le fichier et présenter en 3 points :
- **Ce que c'est** (type, technologie)
- **Ce qu'il apporte** à notre engine
- **Où il s'intègrerait** dans notre archi

Demander : **OUI** / **NON** / **HOLD**
- `NON` → renommer `[SKIP]`, passer au suivant
- `HOLD` → renommer `[HOLD]`, passer au suivant
- `OUI` → passer à l'étape 2

#### ÉTAPE 2 — Proposition d'intégration + contrôles
Proposer une intégration complète dans notre workflow et super engine :
- Fichiers à créer / modifier
- Comment l'animation s'instancie dans le moteur
- Comment elle s'expose (composant, hook, système de paramètres)
- Compatibilité avec les systèmes existants

Puis lister **tous les contrôles disponibles** :
- Nom, type, valeur par défaut, plage, effet visuel
- Quels contrôles exposer à l'utilisateur vs garder en interne
- Suggestions de valeurs optimales pour notre contexte

Demander : **VALIDE** / **MODIFIE** / **ANNULE**
- `ANNULE` → renommer `[SKIP]`, passer au suivant
- `MODIFIE` → ajuster et représenter
- `VALIDE` → passer à l'étape 3

#### ÉTAPE 3 — Intégration
Intégrer dans le super engine selon la proposition validée.
Renommer `nom [TRAITÉ].md` sur Drive. Confirmer.
