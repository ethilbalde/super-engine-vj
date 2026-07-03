# TODO_RECOVERY.md — Questions ouvertes

## Questions de compréhension

### 1. Moteur `fluid.js` — rôle "maître"
`fluid.js` (exposé comme `window.FluidSim`) est le moteur le plus ancien et le plus complet. Il est traité différemment des autres : son `cfg` sert de référence pour la résolution canvas, les presets globaux (`CFG_KEYS`), le BPM maître, et le wiring des tabs COLOR/TEMPO/IO/SAVE. Les autres moteurs ont leur propre `cfg` indépendant.

**Question ouverte :** Y a-t-il une intention de migrer les tabs COLOR/TEMPO vers un cfg partagé global, ou cette centralisation sur FluidSim est-elle définitive ?

### 2. Onglet `lsys` dans la liste des tabs (~ligne 178 main.js)
La liste d'activation des onglets contient `'lsys'` mais il n'y a pas de fichier `engines/lsys.js` dans le projet et pas de bouton `data-engine="lsys"` dans `ui.html`. Il reste une trace d'un ancien moteur L-System supprimé.

**Impact :** Aucun (la boucle forEach ignore silencieusement les IDs manquants), mais c'est une dette technique à nettoyer.

### 3. `autoResize` et `engineNames` (~ligne 100 main.js)
La liste `engineNames` dans `autoResize` contient `'Engine_LSystem'` (moteur supprimé) mais il manque certains moteurs récents si jamais la liste n'a pas été mise à jour. À vérifier à chaque ajout de moteur.

### 4. Scènes — persistance session uniquement
Les 8 scènes sont stockées en mémoire JavaScript (`var scenes = new Array(8).fill(null)`). Elles sont perdues au rechargement de la page. Les presets (localStorage) persistent mais les scènes non.

**Question ouverte :** Est-ce intentionnel (workflow live = éphémère) ou manque-t-il une sauvegarde des scènes dans localStorage ?

### 5. FX Chain — sauvegarde dans les presets
`cfgSnapshot()` sauvegarde le `cfg` de chaque moteur mais ne semble pas sauvegarder `window.FXCHAIN` (la chaîne d'effets FX active). La chaîne FX est donc perdue lors du chargement d'un preset.

**Question ouverte :** Est-ce intentionnel ou un oubli ?

### 6. Moteur `fluid.js` — variable globale `FluidSim` vs pattern `Engine_*`
`fluid.js` s'expose comme `window.FluidSim` (et non `window.Engine_Fluid` comme les autres). C'est une spécificité historique du moteur le plus ancien. Le code dans `main.js` référence directement `FluidSim` à de nombreux endroits (wiring, presets, OSC, etc.).

### 7. `ws_send_rate` dans cfg
Le paramètre `ws_send_rate` est dans `CFG_KEYS` et dans `cfg` de fluid, mais aucun code de WebSocket "send" n'est visible dans `main.js` (seulement receive OSC). Ce paramètre semble inutilisé ou incomplet.

### 8. Moteurs sans wiring complet
Les moteurs `rdiff`, `voronoi`, `follow`, `ribbon`, `physiks`, `neural`, `ink`, `slope` ont des sections de wiring dans `main.js` mais elles n'ont pas été lues en détail dans cette analyse. Leur wiring existe (confirmé par la structure du fichier) mais leur complétude n'a pas été vérifiée.

## Ce qui manque pour comprendre à 100 %

| Élément | Effort estimé |
|---------|--------------|
| Lire les 20 fichiers moteurs en entier (logique interne) | ~4h |
| Vérifier que les sections de wiring de tous les moteurs dans `main.js` sont complètes (lignes 1000–2021) | ~1h |
| Tester le rendu dans un navigateur pour valider le fonctionnement visuel | 30 min |
| Clarifier l'intention sur la persistance des scènes et de la FX Chain | Discussion avec l'auteur |
| Confirmer si `ws_send_rate` est utilisé quelque part | Grep rapide |
