# Super Engine VJ

**Outil VJ standalone — fichier HTML unique, aucune dépendance, aucun serveur requis.**

Ouvrir `super-engine.html` dans Chrome ou Edge et commencer à performer.

---

## Moteurs de simulation (13)

| Moteur | Description |
|--------|-------------|
| **FLUID** | Simulation de fluide 2D (Navier-Stokes), forces de vortex, couleurs dynamiques |
| **VORTEX** | Champ de vortex interactif, particules orbitales |
| **N-BODY** | Gravité à N corps, collisions, formation de galaxies |
| **SPH** | Smooth Particle Hydrodynamics — fluide à particules avec pression et viscosité |
| **BOIDS** | Nuée d'agents (séparation, alignement, cohésion) à la Craig Reynolds |
| **PHYSARUM** | Moisissure physarum slime mold — réseau de tubes biologiques |
| **LORENZ** | Attracteur de Lorenz 3D en rotation |
| **REACT** | Reaction-diffusion (Gray-Scott) — version Canvas 2D |
| **ACO** | Colonies de fourmis (Ant Colony Optimization) avec phéromones |
| **R-D** | Reaction-diffusion Gray-Scott **WebGL** — corail, zèbre, vers, labyrinthes, spots, mitose |
| **ATTR** | Strange Attractors 2D — Clifford, DeJong, Peter, Tinkerbell, Gingerbread, Bedhead |
| **LSYS** | L-Systems — fougère, arbre, flocon de Koch, dragon, Sierpiński, buisson |
| **VOR** | Voronoi Vivant **WebGL** — cellules animées avec physique de répulsion |

---

## Interface

Le panneau latéral droit contient les onglets de contrôle :

- **LIVE** — contrôles principaux du moteur actif (presets, brush, pulse…)
- **SIM** — paramètres de simulation (physique, diffusion, itérations…)
- **COLOR** — palette, fond, couleurs des éléments
- **TEMPO** — synchronisation BPM, pulse automatique
- **MIDI** — mapping MIDI CC, sélection d'appareil
- **SAVE** — sauvegarde et chargement de presets
- **SCN** — scènes (1–8), sauvegarde rapide
- **OUT** — résolution de sortie, overlay de moteur
- **INFO** — raccourcis clavier, guide sortie vidéo OBS/NDI
- **BUG** — rapport de bug vers GitHub Issues
- **MAJ** — vérification et téléchargement des mises à jour

### Valeurs éditables
Cliquer sur **n'importe quelle valeur numérique** à côté d'un slider pour la saisir précisément au clavier. `Entrée` pour valider, `Échap` pour annuler.

---

## Raccourcis clavier

| Touche | Action |
|--------|--------|
| `F` | Plein écran |
| `H` | Afficher / masquer HUD + icônes |
| `1` – `8` | Charger scène |
| `Maj + 1` – `8` | Sauvegarder scène |
| `R` | Looper — enregistrer |
| `Espace` | Looper — lecture |

---

## Sortie vidéo

Super Engine VJ tourne dans le navigateur. Pour envoyer l'image vers d'autres logiciels :

### OBS — Caméra virtuelle
1. Installer [OBS Studio](https://obsproject.com)
2. Source → **Capture de fenêtre** → sélectionner le navigateur
3. **Outils → Démarrer la caméra virtuelle**
4. La caméra virtuelle est disponible dans Resolume, MadMapper, Zoom, vMix…

### OBS — NDI (réseau local)
1. Installer [NDI Tools](https://ndi.video/tools)
2. Installer le plugin [obs-ndi](https://github.com/obs-ndi/obs-ndi)
3. OBS → **Outils → NDI Output Settings** → activer Main Output
4. Dans le logiciel destinataire : ajouter une source NDI

---

## MIDI

1. Brancher un contrôleur USB ou configurer RtpMIDI / loopMIDI
2. Onglet **MIDI** → activer MIDI → sélectionner l'appareil
3. Cliquer le bouton **MIDI** à côté d'un slider → il passe en **LEARN**
4. Bouger un potentiomètre sur le contrôleur → le binding s'enregistre (**CC{n}**)

---

## Mises à jour

L'application vérifie les mises à jour directement depuis GitHub :

1. Onglet **MAJ** → cliquer **⟳ Vérifier les mises à jour**
2. Si une nouvelle version existe → **⬇ Télécharger**
3. Remplacer le fichier `super-engine.html` par le nouveau
4. Recharger le navigateur

Les scènes sauvegardées (localStorage) sont conservées entre les versions.

---

## Technique

- **Un seul fichier HTML** — pas de build, pas de npm, pas de serveur
- **WebGL** pour Reaction-Diffusion et Voronoi
- **Canvas 2D** pour tous les autres moteurs
- Compatible **Chrome / Edge** (bureau)
- MIDI via Web MIDI API (Chrome uniquement)

---

## Crédits

Florent Revol — Larsen Studio  
Développé avec [Claude Code](https://claude.ai/code) — Anthropic

---

## Signaler un bug

Onglet **BUG** dans l'application → remplir le formulaire → ouverture automatique d'une Issue GitHub pré-remplie avec les infos système.

Ou directement : [github.com/ethilbalde/super-engine-vj/issues](https://github.com/ethilbalde/super-engine-vj/issues)
