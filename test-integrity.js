#!/usr/bin/env node
/**
 * test-integrity.js — Super Engine VJ — tests anti-casse
 *
 * Vérifie les invariants qui cassent l'application quand on ajoute,
 * retire ou renomme un moteur. Complète test.js (qui couvre build,
 * presets et FX) avec des contrôles structurels stricts :
 *
 *   1. Le HTML généré parse sans erreur de syntaxe JS
 *   2. Aucun id HTML dupliqué
 *   3. Chaque fichier moteur définit son global + l'interface standard
 *   4. La map ENGINES pointe vers des globals réellement assignés
 *   5. Symétrie des 7 points d'enregistrement (ENGINES/ACCENT/NAMES/
 *      ENG_PFX/ALL_PFX/engineNames/tab-list/boutons/panes/ENGINE_FILES)
 *   6. Chaque bouton moteur a un pane, un onglet LIVE et du wiring
 *
 * Le code mort sans danger (panes/prefixes orphelins, fichiers non buildés)
 * est signalé en WARN — non bloquant — pour rester vert sur une base saine.
 *
 * Usage: node test-integrity.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC  = path.join(ROOT, 'src');

let pass = 0, fail = 0, warned = 0;
const ok   = (l) => { console.log('  ✓ ' + l); pass++; };
const ko   = (l, d) => { console.log('  ✗ ' + l + (d ? '\n      → ' + d : '')); fail++; };
const warn = (l) => { console.log('  ⚠ ' + l); warned++; };
const section = (t) => console.log('\n── ' + t + ' ──');

const readSrc = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Renvoie le contenu brut du littéral objet `var NAME = { ... }`, accolades équilibrées. */
function objectBody(src, name) {
  const start = src.search(new RegExp('var\\s+' + name + '\\s*=\\s*\\{'));
  if (start < 0) return null;
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(open + 1, i); }
  }
  return null;
}

/** Clés de premier niveau d'un littéral objet (ignore les objets imbriqués). */
function topLevelKeys(body) {
  if (body == null) return null;
  const keys = [];
  let depth = 0;
  const re = /([{}]|(\w+)\s*:)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[1] === '{') depth++;
    else if (m[1] === '}') depth--;
    else if (m[2] && depth === 0) keys.push(m[2]);
  }
  return keys;
}

/** Items chaîne `'x'` d'un tableau capturé par une regex à 1 groupe. */
function quotedItems(src, re) {
  const m = src.match(re);
  if (!m) return null;
  const out = [];
  m[1].replace(/'([^']+)'/g, (_, v) => out.push(v));
  return out;
}

/** Différence ensembliste symétrique : { missing: dans a pas b, extra: dans b pas a }. */
function symDiff(a, b) {
  return {
    missing: a.filter((x) => b.indexOf(x) === -1),
    extra:   b.filter((x) => a.indexOf(x) === -1),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 0. Build frais
// ═══════════════════════════════════════════════════════════════════════════
section('BUILD');
try {
  require('child_process').execSync('node build.js', { cwd: ROOT, stdio: 'pipe' });
  ok('node build.js termine sans erreur');
} catch (e) {
  ko('node build.js a echoue', e.stderr && e.stderr.toString().trim());
}

const builtPath = path.join(ROOT, 'super-engine.html');
const built = fs.existsSync(builtPath) ? fs.readFileSync(builtPath, 'utf8') : '';
if (!built) ko('super-engine.html introuvable apres build');

// ═══════════════════════════════════════════════════════════════════════════
// 1. Le JS généré parse sans erreur de syntaxe
// ═══════════════════════════════════════════════════════════════════════════
section('SYNTAXE JS DU FICHIER GENERE');
{
  const scripts = [...built.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (scripts.length === 0) ko('aucun bloc <script> trouve dans le HTML');
  let allOk = true;
  scripts.forEach((s, i) => {
    try {
      // eslint-disable-next-line no-new-func
      new Function(s);
    } catch (e) {
      allOk = false;
      ko('bloc <script> #' + i + ' invalide', e.message);
    }
  });
  if (allOk && scripts.length) ok(scripts.length + ' bloc(s) <script> parse(nt) sans erreur de syntaxe');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. Aucun id HTML dupliqué (getElementById renverrait le mauvais noeud)
// ═══════════════════════════════════════════════════════════════════════════
section('IDS HTML UNIQUES');
{
  const ids = [...built.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const seen = Object.create(null), dups = [];
  ids.forEach((id) => { if (seen[id]) { if (seen[id] === 1) dups.push(id); seen[id]++; } else seen[id] = 1; });
  if (dups.length === 0) ok(ids.length + ' ids, aucun duplicat');
  else ko(dups.length + ' id(s) duplique(s)', dups.slice(0, 25).join(', '));
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Registres de main.js — extraction
// ═══════════════════════════════════════════════════════════════════════════
const mainSrc = readSrc('main.js');
const buildSrc = fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8');

const enginesBody = objectBody(mainSrc, 'ENGINES');
const engineMap = {};                       // clé moteur -> nom global (window.XXX)
if (enginesBody) {
  enginesBody.replace(/(\w+)\s*:\s*window\.(\w+)/g, (_, k, g) => { engineMap[k] = g; });
}
const engineKeys = Object.keys(engineMap);

const accentKeys = topLevelKeys(objectBody(mainSrc, 'ACCENT'));
const namesKeys  = topLevelKeys(objectBody(mainSrc, 'NAMES'));
const engPfxBody = objectBody(mainSrc, 'ENG_PFX');
const engPfxKeys = topLevelKeys(engPfxBody);
const engPfxVals = engPfxBody ? (engPfxBody.match(/:\s*'([^']*)'/g) || []).map((s) => s.replace(/:\s*'([^']*)'/, '$1')) : null;

// ALL_PFX : autoriser la chaîne vide '' (préfixe du moteur maître fluid).
const allPfx = (() => {
  const m = mainSrc.match(/var ALL_PFX=\[([^\]]+)\]/);
  if (!m) return null;
  const out = [];
  m[1].replace(/'([^']*)'/g, (_, v) => out.push(v));
  return out;
})();
const engineNames  = quotedItems(mainSrc, /var engineNames=\[([^\]]+)\]/);
const tabList      = quotedItems(mainSrc, /\[('vortex'[^\]]+)\]\.forEach\(function\(eng\)/);
const engineFiles  = (quotedItems(buildSrc, /ENGINE_FILES\s*=\s*\[([^\]]+)\]/) || [])
                       .map((f) => f.replace(/^engines\//, '').replace(/\.js$/, ''));

// ═══════════════════════════════════════════════════════════════════════════
// 4. Chaque fichier moteur : global défini + interface standard exposée
// ═══════════════════════════════════════════════════════════════════════════
section('FICHIERS MOTEURS — GLOBAL + INTERFACE');
{
  // Interface minimale appelée par EngineManager. `init` est optionnel
  // (rdiff/voronoi initialisent dans activate) donc non requis.
  const IFACE = ['cfg', 'draw', 'activate', 'deactivate'];
  const engineDir = path.join(SRC, 'engines');
  engineFiles.forEach((name) => {
    const fp = path.join(engineDir, name + '.js');
    if (!fs.existsSync(fp)) { ko('engines/' + name + '.js declare mais absent'); return; }
    const s = fs.readFileSync(fp, 'utf8');
    // global assigné (var Engine_X = ... | window.X = ... | var FluidSim = ...)
    const hasGlobal = /\b(var\s+)?(Engine_\w+|FluidSim|VortexEngine|NBodyEngine)\s*=/.test(s);
    if (!hasGlobal) { ko(name + '.js ne definit aucun global moteur'); return; }
    // Méthode exposée = présence d'une propriété `nom:` ou `nom,` (tolérant aux
    // styles return{...} / window.X={...}, avec ou sans espace).
    const miss = IFACE.filter((r) => !new RegExp('\\b' + r + '\\s*[:,]').test(s));
    if (miss.length) ko(name + '.js n\'expose pas: ' + miss.join(', '));
    else ok(name + '.js — global + interface OK');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. ENGINES pointe vers des globals réellement assignés dans un fichier moteur
// ═══════════════════════════════════════════════════════════════════════════
section('ENGINES -> GLOBAL REELLEMENT ASSIGNE');
{
  const allEngineSrc = engineFiles
    .map((n) => { try { return fs.readFileSync(path.join(SRC, 'engines', n + '.js'), 'utf8'); } catch (e) { return ''; } })
    .join('\n');
  engineKeys.forEach((k) => {
    const g = engineMap[k];
    if (new RegExp('\\b' + g + '\\s*=').test(allEngineSrc)) ok(k + ' -> ' + g + ' (assigne)');
    else ko(k + ' -> window.' + g + ' jamais assigne dans un fichier moteur');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. Symétrie des registres (la casse #1 à l'ajout/retrait de moteur)
// ═══════════════════════════════════════════════════════════════════════════
section('SYMETRIE DES REGISTRES');
{
  if (!engineKeys.length) { ko('ENGINES vide ou introuvable'); }
  else ok('ENGINES = ' + engineKeys.length + ' moteurs');

  const checkSet = (label, set) => {
    if (!set) { ko(label + ' introuvable'); return; }
    const d = symDiff(engineKeys, set);
    if (!d.missing.length && !d.extra.length) ok(label + ' identique a ENGINES');
    else ko(label + ' diverge de ENGINES',
      (d.missing.length ? 'manque: ' + d.missing.join(',') + '  ' : '') +
      (d.extra.length ? 'en trop: ' + d.extra.join(',') : ''));
  };
  checkSet('ACCENT', accentKeys);
  checkSet('NAMES', namesKeys);

  // ENG_PFX : doit couvrir tous les moteurs (les entrées en trop = code mort -> WARN)
  if (!engPfxKeys) ko('ENG_PFX introuvable');
  else {
    const d = symDiff(engineKeys, engPfxKeys);
    if (d.missing.length) ko('ENG_PFX : moteur(s) sans prefixe', d.missing.join(','));
    else ok('ENG_PFX couvre tous les moteurs');
    if (d.extra.length) warn('ENG_PFX : prefixe(s) orphelin(s) sans moteur : ' + d.extra.join(','));
  }

  // ALL_PFX doit contenir exactement les valeurs de ENG_PFX
  if (!allPfx || !engPfxVals) ko('ALL_PFX ou valeurs ENG_PFX introuvables');
  else {
    const d = symDiff(engPfxVals, allPfx);
    if (!d.missing.length && !d.extra.length) ok('ALL_PFX = valeurs de ENG_PFX');
    else ko('ALL_PFX diverge des valeurs ENG_PFX',
      (d.missing.length ? 'manque: ' + d.missing.join(',') + '  ' : '') +
      (d.extra.length ? 'en trop: ' + d.extra.join(',') : ''));
  }

  // engineNames (autoResize) : chaque global sauf le maître FluidSim.
  // Manque = casse (resize non synchronisé) ; en trop = global fantôme -> WARN.
  if (!engineNames) ko('engineNames introuvable');
  else {
    const expected = engineKeys.map((k) => engineMap[k]).filter((g) => g !== 'FluidSim');
    const d = symDiff(expected, engineNames);
    if (d.missing.length) ko('engineNames : global(s) manquant(s)', d.missing.join(','));
    else ok('engineNames couvre tous les globals (hors FluidSim)');
    if (d.extra.length) warn('engineNames : global(s) fantome(s) : ' + d.extra.join(','));
  }

  // tab-list (~l178) : active les onglets. Oublier un moteur ici = onglets muets
  // (la casse #1 du projet). Manque = fail ; en trop (fantome) = WARN.
  if (!tabList) ko('tab-list (~l178) introuvable');
  else {
    const expected = engineKeys.filter((k) => k !== 'fluid'); // fluid hors liste (IDs directs)
    const d = symDiff(expected, tabList);
    if (d.missing.length) ko('tab-list : moteur(s) sans activation d\'onglets', d.missing.join(','));
    else ok('tab-list active les onglets de tous les moteurs');
    if (d.extra.length) warn('tab-list : entree(s) fantome(s) : ' + d.extra.join(','));
  }

  // ENGINE_FILES : un fichier par moteur
  const d = symDiff(engineKeys, engineFiles);
  if (!d.missing.length && !d.extra.length) ok('ENGINE_FILES = un fichier par moteur');
  else ko('ENGINE_FILES diverge de ENGINES',
    (d.missing.length ? 'sans fichier: ' + d.missing.join(',') + '  ' : '') +
    (d.extra.length ? 'fichier sans moteur: ' + d.extra.join(',') : ''));
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. UI : bouton -> registre + pane + onglet LIVE + wiring
// ═══════════════════════════════════════════════════════════════════════════
section('UI — BOUTON -> PANE -> WIRING');
{
  const uiSrc = readSrc('ui.html');
  const buttons = [...uiSrc.matchAll(/eng-btn[^>]*data-engine="(\w+)"/g)].map((m) => m[1]);
  const panes   = [...uiSrc.matchAll(/engine-panes"\s+data-engine="(\w+)"/g)].map((m) => m[1]);

  // Bouton == ENGINES (forward : un bouton sans moteur casse le switch)
  const dB = symDiff(engineKeys, buttons);
  if (!dB.missing.length && !dB.extra.length) ok('boutons UI = ENGINES (' + buttons.length + ')');
  else ko('boutons UI divergent de ENGINES',
    (dB.missing.length ? 'sans bouton: ' + dB.missing.join(',') + '  ' : '') +
    (dB.extra.length ? 'bouton sans moteur: ' + dB.extra.join(',') : ''));

  // fluid = moteur maître : pilote le panneau global (IDs directs), pas de pane
  // prefixe ni d'onglet LIVE dedie. On l'exempte de ce controle.
  buttons.forEach((eng) => {
    if (eng === 'fluid') { ok('fluid : moteur maitre (panneau global, exempte)'); return; }
    const problems = [];
    if (panes.indexOf(eng) === -1) problems.push('pas de pane');
    if (uiSrc.indexOf('id="tab-' + eng + '-live"') === -1) problems.push('pas d\'onglet LIVE');
    const pfx = (engPfxBody.match(new RegExp(eng + ":\\s*'([^']*)'")) || [])[1];
    if (pfx) {
      // Le wiring peut être dans main.js OU dans le fichier moteur lui-même
      // (rdiff/voronoi se câblent en interne).
      let wired = mainSrc.indexOf("getElementById('" + pfx) !== -1;
      if (!wired) {
        const fp = path.join(SRC, 'engines', eng + '.js');
        if (fs.existsSync(fp)) wired = fs.readFileSync(fp, 'utf8').indexOf("getElementById('" + pfx) !== -1;
      }
      if (!wired) problems.push('aucun wiring (prefixe ' + pfx + ')');
    } else {
      problems.push('absent de ENG_PFX');
    }
    if (problems.length) ko(eng + ' : ' + problems.join(', '));
    else ok(eng + ' : pane + LIVE + wiring OK');
  });

  // Panes orphelins (sans bouton) = code mort -> WARN
  const orphanPanes = panes.filter((p) => buttons.indexOf(p) === -1);
  if (orphanPanes.length) warn('panes orphelins (sans bouton) : ' + orphanPanes.join(', '));
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. Fichiers moteurs présents mais non buildés -> WARN
// ═══════════════════════════════════════════════════════════════════════════
section('FICHIERS NON BUILDES');
{
  const onDisk = fs.readdirSync(path.join(SRC, 'engines'))
    .filter((f) => f.endsWith('.js'))
    .map((f) => f.replace(/\.js$/, ''));
  const notBuilt = onDisk.filter((n) => engineFiles.indexOf(n) === -1);
  if (notBuilt.length) warn('fichier(s) moteur sur disque absent(s) de ENGINE_FILES : ' + notBuilt.join(', '));
  else ok('tous les fichiers moteurs sont buildes');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(48));
console.log('  ' + pass + ' passed   ' + fail + ' failed   ' + warned + ' warn');
console.log('─'.repeat(48));
process.exit(fail > 0 ? 1 : 0);
