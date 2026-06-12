# Changelog — Super Engine VJ

Format : `vMAJOR.DAILY.MICRO` — micro changes during session, daily release compiled at end of day.

---

## v4.01 — 2026-06-12

### Added
- Editable numeric values on all sliders (click the number, type a precise value, Enter to confirm)
- L-System random variation per cycle: angle ±35%, length 0.75–1.25×, position jitter — each redraw is unique
- MAJ tab: version number display + direct HTML update via GitHub (fetch + Blob download)
- MAJ tab: auto-check on startup, silent badge + red highlight if update available
- INFO tab: OBS Virtual Camera setup guide
- INFO tab: OBS-NDI setup guide (obs-ndi plugin + NDI Tools)
- MIDI tab: loopMIDI + MIDI-OX bridge guide for proprietary controllers (Novation, etc.)
- README.md: full project documentation (13 engines, interface, shortcuts, OBS, MIDI, versioning)
- CHANGELOG.md: this file

### Fixed
- ACO: `H` key now hides Food (F) and Nest (N) icons correctly
- R-D: cursor Y-axis no longer inverted (correct WebGL→Canvas coordinate mapping)
- R-D: patterns no longer collapse in 1s (initial seed conditions A=0.5/B=0.25, Pearson standard)
- R-D: texture wrapping set to REPEAT for seamless edge behavior
- R-D coral preset: f=0.055 k=0.062 du=0.4 dv=0.13 dt=0.5 steps=8
- R-D worms preset: du=0.45 dv=0.075 dt=0.4
- Strange Attractors: twinkling lines eliminated (path break on jump > 0.6×scale)
- Strange Attractors: Gingerbread formula corrected (`1-y+|x|`), no more crash/black screen
- Voronoi: engine now displays correctly (GL context destroyed on canvas resize — fixed)

### Changed
- Versioning system: moved from v3.x to v4.x with 3-level scheme (major / daily / micro)
- Strange Attractors: per-type safe initial positions to avoid divergence

---

## v3.01 — 2026-06-11

Initial public release on GitHub.
