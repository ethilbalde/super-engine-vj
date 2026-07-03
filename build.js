#!/usr/bin/env node
/**
 * build.js — Super Engine VJ
 * Assemble src/ → super-engine.html
 *
 * Usage:  node build.js
 *         node build.js --watch   (rebuild on file change)
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = __dirname;
const SRC     = path.join(ROOT, 'src');
const OUT     = path.join(ROOT, 'super-engine.html');

// ── Engine files in load order ────────────────────────────────────────────────
const ENGINE_FILES = [
  'engines/fluid.js',
  'engines/vortex.js',
  'engines/nbody.js',
  'engines/sph.js',
  'engines/boids.js',
  'engines/physarum.js',
  'engines/lorenz.js',
  'engines/react.js',
  'engines/aco.js',
  'engines/rdiff.js',
  'engines/voronoi.js',
  'engines/follow.js',
  'engines/ribbon.js',
  'engines/physiks.js',
  'engines/neural.js',
  'engines/ink.js',
  'engines/slope.js',
  'engines/dune.js',
  'engines/cloth.js',
  'engines/fpaint.js',
  'engines/wfc.js',
  'engines/sketch.js',
  'engines/nstokes.js',
  'engines/obscure.js',
  'engines/drift.js',
  'engines/menger.js',
  // ── Add new engines here ──
];

function read(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function incrementBuild() {
  const mainPath = path.join(SRC, 'main.js');
  let src = fs.readFileSync(mainPath, 'utf8');
  src = src.replace(/var VERSION='(v\d+\.\d+\.\d+\.)(\d+)'/, (_, prefix, build) => {
    const next = String(Number(build) + 1).padStart(build.length, '0');
    return `var VERSION='${prefix}${next}'`;
  });
  fs.writeFileSync(mainPath, src, 'utf8');
  const m = src.match(/var VERSION='([^']+)'/);
  return m ? m[1] : '?';
}

function build() {
  const version    = incrementBuild();
  const style      = read('style.css');
  const ui         = read('ui.html');
  const utils      = read('utils.js');
  const engines    = ENGINE_FILES.map(f => read(f)).join('\n');
  const main       = read('main.js');
  const presets    = read('presets.js');
  const infoModal  = read('info-modal.html');

  const js = utils + '\n' + engines + '\n' + main + '\n' + presets;

  const html =
`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Super Engine VJ</title>
<style>
${style}
</style>
${ui}
<script>
${js}
</script>
${infoModal}`;

  fs.writeFileSync(OUT, html, 'utf8');

  const lines = html.split('\n').length;
  console.log(`[build] ${version} — super-engine.html — ${lines} lines`);
}

// ── Watch mode ────────────────────────────────────────────────────────────────
if (process.argv.includes('--watch')) {
  build();
  console.log('[watch] Watching src/ for changes…');
  fs.watch(SRC, { recursive: true }, (evt, filename) => {
    if (!filename) return;
    console.log(`[watch] ${filename} changed`);
    try { build(); } catch(e) { console.error('[build error]', e.message); }
  });
} else {
  build();
}
