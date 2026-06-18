#!/usr/bin/env node
/**
 * test.js — Super Engine VJ — static checks
 * Usage: node test.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC  = path.join(ROOT, 'src');

let pass = 0, fail = 0;

function ok(label) { console.log('  ✓ ' + label); pass++; }
function ko(label, detail) { console.log('  ✗ ' + label + (detail ? '\n      → ' + detail : '')); fail++; }
function section(title) { console.log('\n── ' + title + ' ──'); }

// ─── helpers ─────────────────────────────────────────────────────────────────

function readSrc(rel) { return fs.readFileSync(path.join(SRC, rel), 'utf8'); }

function extractList(src, varName) {
  // Extract keys from a JS object literal like: var FOO = { a:x, b:y, ... }
  var re = new RegExp('var\\s+' + varName + '\\s*=\\s*\\{([^}]+)\\}');
  var m = src.match(re);
  if (!m) return null;
  var keys = [];
  m[1].replace(/(\w+)\s*:/g, function(_, k) { keys.push(k); });
  return keys;
}

function extractArray(src, pattern) {
  var m = src.match(pattern);
  if (!m) return null;
  var items = [];
  m[1].replace(/'([^']+)'/g, function(_, v) { items.push(v); });
  return items;
}

// ─── 1. Build ─────────────────────────────────────────────────────────────────
section('BUILD');

try {
  require('child_process').execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
  ok('node build.js exits without error');
} catch(e) {
  ko('node build.js failed', e.stderr && e.stderr.toString().trim());
}

var builtPath = path.join(ROOT, 'super-engine.html');
if (fs.existsSync(builtPath)) {
  var builtLines = fs.readFileSync(builtPath, 'utf8').split('\n').length;
  if (builtLines > 7000) {
    ok('super-engine.html has ' + builtLines + ' lines (> 7000 expected)');
  } else {
    ko('super-engine.html only has ' + builtLines + ' lines — suspiciously short');
  }
} else {
  ko('super-engine.html not found after build');
}

// ─── 2. Engine files ──────────────────────────────────────────────────────────
section('ENGINE FILES');

var buildSrc = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');
var engineFilesMatch = buildSrc.match(/ENGINE_FILES\s*=\s*\[([^\]]+)\]/s);
var declaredFiles = [];
if (engineFilesMatch) {
  engineFilesMatch[1].replace(/'([^']+)'/g, function(_, f) { declaredFiles.push(f); });
}

declaredFiles.forEach(function(f) {
  var fp = path.join(SRC, f);
  if (fs.existsSync(fp)) {
    ok(f + ' exists');
  } else {
    ko(f + ' declared in ENGINE_FILES but file not found');
  }
});

// ─── 3. main.js structural consistency ────────────────────────────────────────
section('main.js — CONSISTENCY');

var mainSrc = readSrc('main.js');

// Extract engine keys from each registry
var enginesKeys = extractList(mainSrc.replace(/\n/g,''), 'ENGINES');
var accentKeys  = extractList(mainSrc.replace(/\n/g,''), 'ACCENT');
var namesKeys   = extractList(mainSrc.replace(/\n/g,''), 'NAMES');
var engPfxKeys  = extractList(mainSrc.replace(/\n/g,''), 'ENG_PFX');

// Tab activation list (line ~178)
var tabListMatch = mainSrc.match(/\['vortex'[^\]]+\]\.forEach\(function\(eng\)/);
var tabList = tabListMatch ? extractArray(mainSrc, /\['vortex'([^\]]+)\]\.forEach\(function\(eng\)/) : null;
// rebuild properly
var tabListFull = null;
var tlm = mainSrc.match(/\[('vortex'[^;]+?)\]\.forEach\(function\(eng\)/);
if (tlm) {
  tabListFull = [];
  tlm[1].replace(/'([^']+)'/g, function(_, v) { tabListFull.push(v); });
}

// engineNames array in autoResize
var engineNamesMatch = mainSrc.match(/var engineNames=\[([^\]]+)\]/);
var engineNamesArr = engineNamesMatch ? [] : null;
if (engineNamesMatch) engineNamesMatch[1].replace(/'([^']+)'/g, function(_, v) { engineNamesArr.push(v); });

if (!enginesKeys) { ko('ENGINES object not found in main.js'); }
else ok('ENGINES found: ' + enginesKeys.length + ' engines');

if (!accentKeys) { ko('ACCENT object not found in main.js'); }
if (!namesKeys)  { ko('NAMES object not found in main.js'); }
if (!engPfxKeys) { ko('ENG_PFX object not found in main.js'); }

// Cross-check: every engine in ENGINES must be in ACCENT, NAMES, ENG_PFX
if (enginesKeys && accentKeys && namesKeys && engPfxKeys) {
  enginesKeys.forEach(function(k) {
    var inAccent  = accentKeys.indexOf(k) !== -1;
    var inNames   = namesKeys.indexOf(k) !== -1;
    var inEngPfx  = engPfxKeys.indexOf(k) !== -1;
    // fluid is intentionally absent from the tab list (it uses direct IDs, not prefixed ones)
    var inTabList = (k === 'fluid') ? true : (tabListFull ? tabListFull.indexOf(k) !== -1 : null);
    var misses = [];
    if (!inAccent)  misses.push('ACCENT');
    if (!inNames)   misses.push('NAMES');
    if (!inEngPfx)  misses.push('ENG_PFX');
    if (inTabList === false) misses.push('tab-list ~l178');
    if (misses.length) {
      ko(k + ' missing from: ' + misses.join(', '));
    } else {
      ok(k + ' present in all registries');
    }
  });

  // Reverse: ACCENT/NAMES keys not in ENGINES
  accentKeys.forEach(function(k) {
    if (enginesKeys.indexOf(k) === -1) ko('ACCENT has "' + k + '" but it is not in ENGINES');
  });
}

// ─── 4. FX system ─────────────────────────────────────────────────────────────
section('FX SYSTEM');

['FX_TYPES','FXCHAIN','fxRenderUI','fxAdd','fxRemove','applyEffect','FXEngine'].forEach(function(sym) {
  if (mainSrc.indexOf(sym) !== -1) ok(sym + ' declared');
  else ko(sym + ' NOT found in main.js');
});

// Check colorramp is in FX_TYPES
if (mainSrc.indexOf("colorramp:") !== -1) ok('colorramp type defined in FX_TYPES');
else ko('colorramp type missing from FX_TYPES');

// Check helpers
['_crHex','_crSample','_crLUT','_crToHex','buildColorRampEditor'].forEach(function(fn) {
  if (mainSrc.indexOf('function ' + fn) !== -1) ok(fn + ' helper defined');
  else ko(fn + ' helper NOT found');
});

// ─── 5. Common variable-name bugs ─────────────────────────────────────────────
section('KNOWN BUG PATTERNS');

// In forEach callbacks — variable shadowing check
// Look for patterns like forEach(function(e){ ... fx.something })
// This is heuristic: find all "forEach(function(VAR)" and check if a *different* var name
// is used in the body for obvious object-access patterns.
var forEachRe = /\.forEach\(function\((\w+)\)\s*\{([^}]{0,800})\}/g;
var m;
var shadowBugs = [];
while ((m = forEachRe.exec(mainSrc)) !== null) {
  var loopVar = m[1];
  var body    = m[2];
  // look for fx.* when loop var is not 'fx' (but only in top-level forEach, not nested closures)
  // 'e' is commonly a valid closure var from an outer forEach so we skip that case
  if (loopVar !== 'fx' && loopVar !== 'e' && /\bfx\.(type|phase|id|params|enabled)\b/.test(body)) {
    shadowBugs.push('forEach(function(' + loopVar + '){...} uses fx.* — should be ' + loopVar + '.*');
  }
}
if (shadowBugs.length === 0) ok('No obvious forEach variable-name mismatch found');
else shadowBugs.forEach(function(b) { ko('Possible variable-name bug: ' + b); });

// ─── 6. presets.js ────────────────────────────────────────────────────────────
section('PRESETS');

var presetsSrc = readSrc('presets.js');
var flagMatch = presetsSrc.match(/['"]super_engine_factory_([^'"]+)['"]/);
if (flagMatch) ok('Factory flag: super_engine_factory_' + flagMatch[1]);
else ko('Factory flag not found in presets.js');

if (enginesKeys) {
  enginesKeys.forEach(function(k) {
    if (presetsSrc.indexOf("engine:'" + k + "'") !== -1 ||
        presetsSrc.indexOf('engine:"' + k + '"') !== -1) {
      ok('Presets exist for engine: ' + k);
    } else {
      ko('No preset found for engine: ' + k);
    }
  });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(40));
console.log('  ' + pass + ' passed   ' + fail + ' failed');
console.log('─'.repeat(40));
process.exit(fail > 0 ? 1 : 0);
