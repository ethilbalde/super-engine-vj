# Super Engine VJ — Outil de Performance Visuelle Générative

**Outil VJ standalone — fichier HTML unique, aucune dépendance, aucun serveur requis.**

Ouvrir `super-engine.html` dans Chrome ou Edge et commencer à performer.

---

## Volonté du projet

**Super Engine VJ** est un moteur de performance visuelle live conçu pour les VJ (video jockeys) et artistes numériques. L'objectif est de fournir :

- **26 moteurs génératifs** explorant des domaines différents : fluides, particules, attracteurs chaotiques, fractales, reaction-diffusion, réseaux, physique et abstraction
- **Contrôle en temps réel** via souris, clavier, MIDI et réseau (OSC via WebSocket)
- **Synchronisation audio/BPM** pour aligner les visuels à la musique
- **Superposition et effets GPU** — FX Chain 17 effets post-process (bloom, feedback, warp, chroma, vignette, miroir, grain, seuil, etc.)
- **Sauvegarde instantanée** — presets, scènes et bindings MIDI persistants dans localStorage
- **Zéro dépendance** — une seule page HTML, fonctionne en `file://`, aucun serveur requis

C'est un outil de **production live**, pensé pour les performances VJ, installations interactives, installations, et expérimentation générative en temps réel.

---

## Installation et démarrage

1. Télécharger ou cloner ce repo
2. Ouvrir le fichier `super-engine.html` dans **Chrome** ou **Edge** (Firefox et Safari non supportés pour MIDI)
3. Accepter les permissions du navigateur (MIDI si utilisé, caméra Web optionnel pour certains moteurs)
4. Les scènes et presets sont sauvegardés automatiquement en localStorage

> **Note :** le fichier HTML est autonome et fonctionnera en `file://`, sur un serveur web, ou via USB sur une autre machine.

---

## Les 26 moteurs génératifs

### Fluides et particules

#### **FLUID** — Simulation Eulérienne classique
Fondamental : simulation de fluide 2D basée Navier-Stokes (grille Eulérienne). La souris agit comme un brush qui ajoute de la vélocité et de la couleur. Forces de vortex applicables, dissipation réglable, nombreuses pallettes de couleur prédéfinies.
- **Paramètres clés** : `brush_force`, `dissipation`, `color_mode`, `vortex_strength`
- **Idéal pour** : base générique, transitions fluides, warm-up du set

#### **NS FLUID** — Navier-Stokes haute-fidélité
Version avancée du FLUID avec générateurs de mouvement synchronisés au BPM :
- **Turbulence** : bruit cohérent sin/cos agitant la grille (replicate les mouvements internes réalistes)
- **Vent** : force directionnelle uniforme (angle + intensité) créant des flux unidirectionnels
- **Impulsion BPM** : pulse radial depuis le centre, syncable au tempo (beat-div configurable)
- **Paramètres clés** : `turb_enabled`, `turb_frequency`, `wind_enabled`, `wind_angle`, `pgen_enabled`, `pgen_beat_div`
- **Idéal pour** : synchronisation musicale précise, motion design, effets pulsants

#### **SPH FLUID** — Smoothed Particle Hydrodynamics
Simulation de fluide basée particules : chaque particule interagit avec ses voisins par pression et viscosité. Produit un mouvement plus granulaire et organique que les grilles Eulériennes.
- **Paramètres clés** : `particle_count`, `mass`, `gas_stiffness`, `viscosity`, `surface_tension`
- **Idéal pour** : fluidité organique, effets gouttelettes, mouvement naturel

#### **PAINT** — Fluid Painting (WebGL2)
Peinture fluide avancée : simulation GPU avec domain-warping (déformation texture via vecteurs de flux). Les traits acquièrent une texture liquide en temps réel.
- **Paramètres clés** : `brush_size`, `paint_viscosity`, `warp_strength`, `drying_rate`
- **Idéal pour** : peinture numérique légère, effets de liquéfaction, abstraction artistique

#### **DUNE** — Sable et Perlin
Champs de sable animés par bruit de Perlin fractal 2D. Crée des paysages ondulants, des dunes qui se déplacent.
- **Paramètres clés** : `noise_scale`, `animation_speed`, `color_map`, `height_map_mode`
- **Idéal pour** : arrière-plans géométriques, transitions, paysages abstraits

---

### Systèmes de particules et nuées

#### **BOIDS** — Algorithme de nuée (flocking)
Implémentation classique Craig Reynolds : agents autonomes avec séparation (éviter voisins), alignement (vitesse moyenne), cohésion (diriger vers centre). Crée des bancs de poissons, nuées d'oiseaux, formations organiques.
- **Paramètres clés** : `boid_count`, `separation_weight`, `alignment_weight`, `cohesion_weight`, `max_speed`
- **Idéal pour** : mouvements organiques collectifs, formations dynamiques

#### **VORTEX** — Tourbillons de Rankine
Particules orbitales autour de tourbillons générés à la souris ou générés aléatoirement. Produit des spirales hypnotiques.
- **Paramètres clés** : `vortex_strength`, `decay_rate`, `particle_speed`, `visual_mode`
- **Idéal pour** : patterns hypnotiques, transitions, warm-up

#### **PHYSARUM** — Moisissure slime mold
Simule le réseau de tubes d'une moisissure *Physarum polycephalum*. Les agents déposent des phéromones, créant des chemins sinueux interconnectés très organiques.
- **Paramètres clés** : `agent_count`, `pheromone_deposit`, `pheromone_diffuse`, `agent_speed`, `sense_distance`
- **Idéal pour** : structures organiques, patterns hyper-réalistes, installations naturelles

#### **ACO FOURMIS** — Ant Colony Optimization
Colonies de fourmis avec phéromones : agents recherchent de la nourriture et laissent des traces chimiques. Converge vers patterns géométriques complexes.
- **Paramètres clés** : `ant_count`, `pheromone_strength`, `decay_rate`, `search_radius`
- **Idéal pour** : patterns collectifs, ordre émergent, structures géométriques

#### **NEURAL** — Visualisation réseau de neurones
Graphique de nœuds et connexions formant un réseau de neurones artificiels. Les connexions s'animent avec intensity. Très utilisé en présentation tech/AI.
- **Paramètres clés** : `node_count`, `connection_density`, `pulse_speed`, `color_scheme`
- **Idéal pour** : contexte tech/AI, visualisation d'algorithme, présentation

---

### Attracteurs et chaos

#### **LORENZ** — Attracteurs chaotiques 3D
Explore quatre attracteurs chaotiques différents en rotation 3D :
- **Lorenz** : spirales symétriques classiques
- **Rössler** : boucles toriques
- **Clifford** : strange attractors fractals
- **Thomas** : étranges tores entrelacés
- **Paramètres clés** : `attractor_type`, `scale`, `rotation_speed`, `color_cycle`
- **Idéal pour** : esthétique chaotique/mathématique, couleurs pulsantes hypnotiques

#### **SLOPE** — Champs de vecteurs
Visualisation directe de champs de vecteurs (gradients de potentiel). Les lignes de flux suivent la topologie du champ. Très mathématique et abstrait.
- **Paramètres clés** : `field_function`, `flow_speed`, `vector_density`, `color_mapping`
- **Idéal pour** : esthétique scientifique, patterns mathématiques purs

---

### Morphogenèse et Turing

#### **REACT** — Reaction-Diffusion Gray-Scott (Canvas 2D)
Simulation chimique 2D : deux substances qui réagissent et diffusent, créant des patterns de Turing (taches, rayures, spirales). Version CPU Canvas 2D.
- **Paramètres clés** : `feed_rate`, `kill_rate`, `diffusion_a`, `diffusion_b`, `iteration_count`
- **Idéal pour** : patterns biologiques (zèbres, léopards, corail), morphogenèse

#### **R-D** — Reaction-Diffusion (WebGL)
Même système que REACT mais en GPU WebGL pour performance élevée et tailles plus grandes. Support de couleurs multiples et interactions souris.
- **Paramètres clés** : idem REACT + `gpu_iterations` pour accélération GPU
- **Idéal pour** : patterns à grande résolution, animations fluides haute-perf

#### **VORONOI** — Diagramme de Voronoi Vivant
Génère un diagramme de Voronoi animé : cellules qui se déplacent et se repoussent. Les couleurs se mélangent aux frontières.
- **Paramètres clés** : `seed_count`, `repulsion_force`, `color_mode`, `animation_speed`
- **Idéal pour** : tessellations organiques, divisions géométriques fluides

---

### Génératives et création procédurale

#### **WFC** — Wave Function Collapse
Algorithme de génération procédurale : place des tuiles sur une grille en respectant des contraintes (compatibilité de tuile). Génère des patterns complexes jamais identiques.
- **Paramètres clés** : `max_gens` (1–8 grilles simultanées), `tile_size`, `style` (courbes/segments/dots), `glow_radius`, `color_scheme`
- **Paramètres par grille** : position, taille, couleur aléatoires
- **Idéal pour** : contenu procédural infini, patterns complexes, installations durables

#### **SKETCH** — Dessin génératif au trait
Génère des traits abstraits au hasard, chacun avec durée de vie (`life`), opacité, et probabilité de contour vs remplissage. Peut être synchronisé au BPM pour l'apparition.
- **Paramètres clés** : `spawn_rate`, `spawn_sync` (BPM), `life`, `opacity_min`, `opacity_max`, `stroke_prob`, `bg_color`
- **Idéal pour** : animation abstraite légère, underlay génératif, clean backgrounds

#### **MENGER** — Éponge de Menger / Fractale 3D
Visualisation 3D interactive de la fractale d'éponge de Menger. Niveau de détail configurable, rotation interactive.
- **Paramètres clés** : `detail_level`, `rotation_speed`, `zoom`, `color_mode`
- **Idéal pour** : esthétique fractale pure, contexte mathématique, installations immersives

---

### Physique et matériaux

#### **N-BODY** — Gravité N-corps
Simulation physique de particules soumises à la gravité mutuelle. Les particules peuvent collider ou orbiter les unes autour des autres. Formation de galaxies possibles.
- **Paramètres clés** : `particle_count`, `gravity_strength`, `collision_mode`, `time_step`
- **Idéal pour** : cosmologie, formations stellaires, chaos physique

#### **CLOTH** — Tissu physique avec découpe
Simulation de tissu : grille de points reliés par des ressorts, soumise à la gravité et aux contraintes. Peut être coupé ou brûlé à la souris.
- **Paramètres clés** : `cloth_width`, `cloth_height`, `gravity`, `damping`, `wind_force`
- **Idéal pour** : textures fluides, déchirures interactives, installations immersives

#### **RIBBON** — Rubans physiques animés
Rubans qui flottent dans l'air, soumis à des forces de vent et de gravité. Créent des traînées ondulantes très organiques.
- **Paramètres clés** : `ribbon_count`, `ribbon_length`, `wind_strength`, `gravity_strength`
- **Idéal pour** : mouvement fluide poétique, arrière-plans calmes

#### **PHYSIKS** — Simulation de matériaux
Simulation générique de systèmes de particules avec interactions : collision, friction, élasticité. Très polyvalent.
- **Paramètres clés** : `particle_count`, `elasticity`, `friction`, `collision_radius`
- **Idéal pour** : systèmes physiques libres, démonstrations interactives

#### **INK** — Simulation encre / peinture
Simulation de gouttes d'encre en diffusion : particules de couleur qui se diluent et se mélangent dans un fluide.
- **Paramètres clés** : `ink_viscosity`, `diffusion_rate`, `drop_frequency`, `color_mixing`
- **Idéal pour** : encre coulante, textures humides, esthétique liquide

#### **DRIFT** — Simulation de dérive
Particules qui dérivent dans un flux changeant. Crée des formations lentes et organiques.
- **Paramètres clés** : `drift_force`, `particle_count`, `lifetime`, `color_gradient`
- **Idéal pour** : transitions lentes, ambiance calme, underlay

#### **OBSCURE** — Moteur génératif sombre
Moteur générique sombre/atmosphérique : bruit perlin animé avec palettes de couleur sombres, crée une esthétique sombre et mystérieuse.
- **Paramètres clés** : `noise_scale`, `darkness_level`, `animation_speed`, `color_palette`
- **Idéal pour** : ambiance sombre, horror VJ, transitions discrètes

---

### Synthèse et utilisation

**Commencer par** : FLUID (plus intuitif), VORTEX (hypnotique), ou BOIDS (organique)  
**Combiner pour** : créer des transitions via l'onglet OUT (overlay de deux moteurs avec fade)  
**Synchroniser** : utiliser BPM pour aligner tous les moteurs au tempo  
**Enchaîner** : sauvegarder des scènes (1–8) pour des enchaînements programés

---

## Toutes les interactions possibles

### Souris

| Action | Effet |
|--------|-------|
| Mouvement + clic gauche | Brush interactif (force, vélocité, couleur) |
| Clic droit | Palette de couleurs rapide pour brush |
| Molette (scroll) | Zoom / changement de paramètre (contexte dépendant) |
| Double-clic | Reset du moteur |

### Clavier

| Touche | Action |
|--------|--------|
| `1`–`8` | Charger scène n° |
| `Maj+1`–`8` | Sauvegarder scène n° |
| `F` | Plein écran / quitter plein écran |
| `H` | Afficher/masquer HUD (BPM, moteur, scène) et icônes |
| `R` | Enregistrer une séquence d'événements (Looper) |
| `Espace` | Replay de la séquence Looper |
| `Échap` | Fermer modales, annuler édition |
| `+` / `-` | Augmenter/diminuer BPM |
| Flèches | Naviguer entre moteurs (gauche/droite) |
| `Z` | Undo / annuler dernière action |

### MIDI (Web MIDI API)

**Setup** :
1. Onglet **MIDI** → Activer MIDI
2. Sélectionner votre contrôleur USB
3. Onglet **MIDI** → bouton **LEARN** à côté d'un slider
4. Bouger un potentiomètre → binding enregistré en localStorage

**Types de messages MIDI supportés** :
- **CC (Control Change)** : mapping continu de sliders
- **Note On/Off** : trigger actions (reset, pulse, changer moteur)
- **Programme Change (PC)** : charger un preset numéroté
- **MIDI Clock** : synchronisation BPM depuis un synthé ou séquenceur USB

**Exemple workflow** :
- Potentiomètre 1 → `brush_force` du moteur FLUID
- Potentiomètre 2 → `dissipation`
- Pad 1 (Note C3) → Pulse automatique
- Pad 2 (Note D3) → Reset moteur
- Séquenceur USB qui envoie MIDI Clock → BPM auto-sync

### OSC (WebSocket)

Super Engine VJ écoute les messages OSC JSON reçus via WebSocket :

**Endpoints** :
- `/fluid/pulse` → déclenche une impulsion (moteur FLUID)
- `/fluid/brush_force` → définir `brush_force` en temps réel
- `/active_engine/<param>` → modifier un paramètre du moteur actif
- `/bpm` → définir le BPM manuellement

**Exemple** (Python avec `python-osc`) :
```python
from pythonosc import udp_client
client = udp_client.SimpleUDPClient("127.0.0.1", 5005)
client.send_message("/fluid/pulse", [])
client.send_message("/active_engine/brush_force", [1.5])
```

---

## Onglets de contrôle détaillés

### **LIVE** — Contrôles du moteur actif

Affiche **tous les paramètres du moteur actif** :
- Sliders pour force, viscosité, vitesse, etc.
- Valeurs numériques directement modifiables (clic sur la valeur pour saisir au clavier)
- Boutons de preset pré-configurés pour le moteur (ex: "Calme", "Dynamique", "Chaos")
- Bouton **RESET** pour réinitialiser le moteur
- Bouton **PULSE** pour déclencher une impulsion/event
- Paramètres de simulation (itérations, précision CPU/GPU)

### **COLOR** — Palette et couleurs

- **Palette de couleurs prédéfinies** : sélectionner le schéma de couleur (ex: feu, océan, pastel, néon)
- **Couleur de fond** : choisir la teinte de base (#hex ou RGB)
- **Fondu de couleur** : interpoler en douceur entre deux couleurs au temps
- **Inversion / Solarisation** : inversions de palette en temps réel
- **Mix mode** : ajouter/soustraire/multiplier les couleurs pour des effets visuels

### **TEMPO** — Synchronisation BPM

- **Entrée BPM** : définir le tempo (60–200 BPM typique)
- **TAP TEMPO** : cliquer en rythme sur un bouton pour capturer le BPM
- **Pulse auto** : synchroniser les impulsions du moteur au BPM
- **Beat divisor** : 1/4, 1/8, 1/16 pour synchroniser sur des subdivisions musicales
- **MIDI Clock** : recevoir le BPM depuis un appareil MIDI externe (séquenceur, synthé)

### **MIDI** — Mapping du contrôleur

- **Sélection d'appareil** : liste tous les appareils MIDI branchés (USB, RtpMIDI, loopMIDI)
- **Mode LEARN** : cliquer **MIDI** à côté d'un slider → passer en écoute
- **Binding affiché** : montre le mapping (ex: `CC014` = `brush_force`)
- **Bindings existants** : liste tous les mappings créés (avec option de suppression)
- **Sauvegarde automatique** : tous les bindings sont persistants dans localStorage

### **SAVE** — Presets et sauvegarde

- **Sauvegarder un preset** : créer un snapshot JSON de l'état actuel (tous les moteurs + paramètres)
- **Charger un preset** : appliquer un snapshot précédemment sauvegardé
- **Import/Export fichier** : télécharger un preset `.json` ou importer depuis un fichier local
- **Presets factory** : presets prédéfinis couvrant tous les moteurs (4+ par moteur)
- **Supprimer** : annuler un preset sauvegardé

### **SCN** — Scènes (Scenes)

- **8 slots de scènes** : chaque slot est un snapshot complet (tous les moteurs, paramètres, FX Chain active)
- **Charger scène** : appliquer toute la configuration d'une scène en une seule action
- **Sauvegarder scène** : enregistrer l'état actuel dans un slot
- **Transition** : choisir entre **CUT** (immédiat) ou **FADE** (interpolation lisse sur N secondes)
- **Sauvegarde rapide** : `Maj+1`–`8` pour sauvegarder ; `1`–`8` pour charger

### **OUT** — Sortie et overlay

- **Résolution de sortie** : 720p, 1080p, 4K (affecte la taille du canvas)
- **Overlay mode** : afficher deux moteurs simultanément avec opacité par couche
- **Moteur overlay** : sélectionner le moteur secondaire et son opacité (0–100%)
- **Blend mode** : choisir le mode de fusion (Normal, Add, Multiply, Screen, Overlay)

### **FX Chain** — Effets post-process

17 effets GPU empilables :
- **Bloom** : halo lumineux autour des couleurs claires
- **Feedback** : répétition/écho visuel (très psychédélique)
- **Chroma Shift** : décalage de couleur RGB temporel
- **Warp** : déformation de l'image par vecteurs de flux
- **Vignette** : assombrissement des bords
- **Miroir** : réflexion horizontale/verticale/diagonale
- **Seuil** : binarisation (contraste extrême)
- **Grain** : bruit additif pour esthétique filmique
- **Glow** : luminescence globale
- **Saturation** : intensité des couleurs
- **Hue Shift** : rotation de teinte globale
- **Mosaic** : pixellisation
- **Kaleidoscope** : symétrie miroir fractale
- **Color Ramp** : mapping de couleur (LUT style Blender)
- **Glitch** : artefacts numériques
- **Posterize** : réduction de palette de couleur
- **Wave Distortion** : ondes de distorsion

Pour chaque effet :
- **Enable/Disable** : activer/désactiver sans le supprimer
- **Opacité** : mélanger avec l'image de base (0–100%)
- **Mode** : PRE (avant certains moteurs) ou POST (après tous)
- **Paramètres** : sliders spécifiques à l'effet (intensité, fréquence, etc.)
- **Ordre** : réorganiser l'ordre des effets (l'ordre change le résultat final)

---

## Envoyer le flux vers Resolume, MadMapper, etc.

### Flux vidéo vers Resolume

#### Méthode 1 : OBS + Caméra virtuelle (Windows/Mac)

**Le plus simple et recommandé** :

1. **Installer OBS Studio**
   - [obsproject.com](https://obsproject.com) → télécharger OBS Studio
   - Installer et lancer

2. **Configurer OBS**
   - Sources → `+` → **Capture de fenêtre**
   - Sélectionner la fenêtre du navigateur avec Super Engine VJ
   - Redimensionner la source pour couvrir le canvas entièrement
   - Cocher **Capturer le curseur** ou non selon besoin

3. **Activer la caméra virtuelle**
   - **Outils** → **Démarrer la caméra virtuelle** (ou **Caméra virtuelle** selon version)
   - Un périphérique virtuel `OBS Virtual Camera` apparaît maintenant

4. **Dans Resolume**
   - Aller dans **Settings** → **Video Input**
   - Sélectionner **OBS Virtual Camera** ou chercher dans la liste des sources
   - Ajouter comme source média
   - La source vidéo Super Engine VJ est maintenant disponible en temps réel

**Avantages** : zéro latence, contrôle full OBS, enregistrement simultané facile  
**Inconvénients** : fenêtre flottante (pas idéal live), décalage possible entre écrans

#### Méthode 2 : OBS + NDI (réseau, meilleur pour live)

**Plus pro pour une vraie performance** :

1. **Installer les outils**
   - NDI Tools : [ndi.video/tools](https://ndi.video/tools)
   - Plugin obs-ndi : [github.com/obs-ndi/obs-ndi](https://github.com/obs-ndi/obs-ndi)

2. **Configuration OBS**
   - Installer le plugin obs-ndi (ajouter à OBS)
   - **Outils** → **NDI Output Settings**
   - Activer **Main Output** ✓
   - Donner un nom à la sortie (ex: `SuperEngineVJ`)

3. **Configuration Resolume**
   - **Settings** → **Preferences** → **Network**
   - Activer **NDI**
   - Aller dans **Add Source** → chercher `SuperEngineVJ` (votre flux NDI)
   - Cliquer et ajouter

**Avantages** : zéro latence réseau, caméra flottante optionnelle, idéal pour multi-écrans  
**Inconvénients** : nécessite une bonne connexion réseau (local ethernet recommandé)

### Flux vidéo vers MadMapper

#### Méthode 1 : OBS Virtual Camera

Identique à Resolume, mais dans MadMapper :
- **Settings** → **Input**
- Sélectionner **OBS Virtual Camera**
- Ajouter et mapper

#### Méthode 2 : OBS + Spout (Windows)

Si MadMapper supporte Spout (plugin [obs-spout2](https://github.com/Gvoorbeeld/obs-spout2-plugin)) :

1. Installer le plugin obs-spout2 dans OBS
2. **Outils** → **Spout Output** → activer
3. Dans MadMapper : **Video In** → sélectionner la sortie Spout
4. Zéro latence, performant sur Windows

### Flux vidéo vers autre software (vMix, XSplit, OBS Multicast)

**Générique (fonctionne partout)** :

1. **OBS Virtual Camera** (Windows/Mac) — le plus universel
2. **NDI** (réseau) — compatible vMix, ATEM, Tricast
3. **Caméra USB physique** — faire passer le navigateur dans une caméra USB virtuelle (ex: [Manycam](https://www.manycam.com))

### Performance directement sans OBS

**Si vous voulez vraiment zéro latence et pas de fenêtre supplémentaire** :

**Option : acceder à la vidéo Canvas directement en WebSocket**
- Modifier le code HTML pour diffuser le canvas en WebRTC ou MJPEG
- Complexe, nécessite un serveur WebRTC local
- Pour les experts uniquement

**Option : Navigateur en fullscreen sur le moniteur de sortie**
- Appuyer sur `F` pour plein écran dans Super Engine VJ
- Projeter/étendre l'écran navigateur vers Resolume/MadMapper via capture réseau
- Appuyer sur `H` pour masquer l'interface et afficher le canvas seul

---

## Workflow VJ typique

### Setup avant la performance

1. **Charger les presets**
   - Onglet **SAVE** → importer un fichier `.json` avec vos presets préférés
   - Ou créer les vôtres et les sauvegarder

2. **Configurer les scènes**
   - Pré-créer 8 scènes (Onglet **SCN**) pour votre set :
     - Scène 1 : Intro (FLUID calme)
     - Scène 2 : Build (NS FLUID avec turbulence)
     - Scène 3 : Drop (WFC + effects)
     - Etc.

3. **Mapper MIDI** (si contrôleur)
   - Onglet **MIDI** → sélectionner l'appareil
   - Créer 10–20 mappings essentiels (brush_force, dissipation, BPM, reset, etc.)

4. **Vérifier la sortie vidéo**
   - Lancer OBS + VirtualCam ou NDI
   - Tester dans Resolume/MadMapper
   - Mettre à l'échelle correctement (résolution, rapport)

5. **BPM sync**
   - Récepteur MIDI Clock du synthé/séquenceur
   - Ou tap tempo manuel
   - Tester la synchronisation

### Pendant la performance

1. **Lancer la musique**
2. **Commencer avec une scène calme**
   - Appuyer `1` pour charger scène 1
   - Moduler les paramètres via sliders/MIDI pour suivre la musique

3. **Transitions**
   - Appuyer `2`, `3`, etc. pour changer de scène à des points clés
   - L'interface fait un fade doux entre les états

4. **Interactions live**
   - Bouger la souris pour brush interactif
   - Tourner les potentiomètres MIDI pour effectuer des changements en temps réel
   - Déclencher des pulses (bouton ou MIDI) pour des "impacts" visuels

5. **Réagir à la musique**
   - Utiliser le BPM pour maintenir la synchronisation
   - Modifier l'esthétique via FX Chain (ajout/retrait d'effets)
   - Changer de moteur si besoin

6. **Enregistrement**
   - OBS enregistre en continu (Setup → Output → Recording)
   - Exporter pour archive ou réseau social

---

## Fichiers de configuration et persistance

- **localStorage** : tous les presets, scènes et bindings MIDI sont sauvegardés dans le navigateur
- **Pas de cloud** : tout reste sur votre machine
- **Export/Import** : fichiers `.json` pour partager configurations

---

## Technique

- **Un seul fichier HTML** — pas de build, pas de npm, pas de serveur
- **WebGL2** pour Reaction-Diffusion, Voronoi, PAINT
- **Canvas 2D** pour tous les autres moteurs
- **GPU compute** pour effets post-process (FX Chain)
- Compatible **Chrome / Edge** (bureau)
- MIDI via Web MIDI API (Chrome uniquement)
- Responsive — s'adapte à la résolution de l'écran

---

## Développement et extension

Pour ajouter un moteur personnel ou modifier le code :

1. Cloner le repo GitHub
2. Modifier les fichiers dans `src/engines/` (nouveau moteur) ou `src/main.js` (UI)
3. Lancer `node build.js` pour regénérer `super-engine.html`
4. Tester dans le navigateur (`file://super-engine.html`)

Voir [CLAUDE.md](CLAUDE.md) pour le pattern complet d'intégration.

---

## FAQ

### "J'ai un lag dans Resolume/MadMapper ?"
→ Réduire la résolution de sortie (onglet **OUT**)  
→ Désactiver quelques effets FX  
→ Utiliser NDI plutôt que Virtual Camera  
→ Vérifier que le navigateur tourne en 60 FPS (appuyer F12 → console)

### "Le MIDI n'est pas reconnu ?"
→ Utilisez Chrome (pas Firefox, pas Safari)  
→ Brancher le contrôleur **avant** de charger la page  
→ Aller dans l'onglet **MIDI** et vérifier qu'il est listé  
→ Cliquer **LEARN** et bouger un potentiomètre lentement

### "Comment animer les transitions ?"
→ Utiliser les **scènes** avec mode FADE (onglet **SCN**)  
→ Définir la durée du fade  
→ Appuyer sur une touche 1–8 pour transitionner

### "Peut-on diffuser en direct sur Twitch ?"
→ Oui, via OBS :  
   1. Ajouter capture de fenêtre Super Engine VJ dans OBS
   2. OBS → Settings → Stream → Twitch
   3. Connecter compte Twitch
   4. Start streaming

### "Combien de moteurs je peux overlay ?"
→ 2 maximum (overlay binaire + opacité)  
→ Créer plus d'overlay : ajouter manuelle dans les scènes

---

## Crédits

**Florent Revol** — Larsen Studio  
Développé avec [Claude Code](https://claude.ai/code) — Anthropic

**Bibliothèque et référence** :
- Navier-Stokes : Jos Stam (Real-Time Fluid Dynamics for Games)
- Boids : Craig Reynolds
- Physarum : Jeff Jones (Slime Mould Simulations)
- Wave Function Collapse : Maxim Gumin

---

## Signaler un bug

Onglet **BUG** dans l'application → remplir le formulaire → ouverture automatique d'une Issue GitHub pré-remplie avec les infos système.

Ou directement : [github.com/ethilbalde/super-engine-vj/issues](https://github.com/ethilbalde/super-engine-vj/issues)

---

## Licence

À définir. Voir le repo GitHub pour les détails.
