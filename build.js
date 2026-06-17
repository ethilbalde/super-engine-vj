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
  'engines/lsys.js',
  'engines/voronoi.js',
  'engines/follow.js',
  'engines/ribbon.js',
  'engines/physiks.js',
  'engines/neural.js',
  'engines/ink.js',
  'engines/slope.js',
  'engines/dune.js',
  'engines/bloom.js',
  'engines/displace.js',
  'engines/growth.js',
  // ── Add new engines here ──
];

function read(rel) {
  return fs.readFileSync(path.join(SRC, rel), 'utf8');
}

function build() {
  const style      = read('style.css');
  const ui         = read('ui.html');
  const utils      = read('utils.js');
  const engines    = ENGINE_FILES.map(f => read(f)).join('\n');
  const main       = read('main.js');
  const infoModal  = read('info-modal.html');

  const js = utils + '\n' + engines + '\n' + main;

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
  console.log(`[build] super-engine.html — ${lines} lines`);
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
