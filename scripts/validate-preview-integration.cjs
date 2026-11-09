const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const html = read('index.html');
const app = read('app.js');
const materials = read('materials.js');
const backup = read('backup.js');
const sw = read('sw.js');

function assert(condition, message) {
  if (!condition) {
    console.error('ÉCHEC : ' + message);
    process.exitCode = 1;
  } else {
    console.log('OK : ' + message);
  }
}

function sectionBounds(id) {
  const start = html.indexOf('<section id="' + id + '"');
  if (start < 0) throw new Error('Section introuvable : ' + id);
  const re = /<section\\b[^>]*>|<\\/section>/g;
  re.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = re.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { start, end: re.lastIndex };
  }
  throw new Error('Section non fermée : ' + id);
}

const ids = [...html.matchAll(/\\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
assert(duplicates.length === 0, 'tous les identifiants HTML sont uniques');

for (const tag of ['section', 'details', 'form', 'div']) {
  const open = (html.match(new RegExp('<' + tag + '\\\\b', 'g')) || []).length;
  const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
  assert(open === close, 'balises ' + tag + ' équilibrées (' + open + '/' + close + ')');
}

const tools = sectionBounds('toolsView');
const setups = sectionBounds('setupsView');
const help = sectionBounds('helpView');
const comparison = html.indexOf('id="setupComparisonPanel"');
const save = html.indexOf('id="backupPanel"');
assert(comparison > tools.start && comparison < tools.end, 'comparaison des setups placée dans Outils');
assert(!(comparison > setups.start && comparison < setups.end), 'comparaison absente de Setups');
assert(save > help.start, 'panneau de sauvegarde placé dans Aide');
assert((html.match(/id="setupComparisonPanel"/g) || []).length === 1, 'un seul panneau de comparaison');
assert((html.match(/id="backupPanel"/g) || []).length === 1, 'un seul panneau de sauvegarde');

assert(html.includes('data-shortcut-view="tools" data-shortcut-target="setupComparisonPanel"'), 'raccourci comparaison vers Outils');
assert(html.includes('data-shortcut-view="help" data-shortcut-target="backupPanel"'), 'raccourci sauvegarde vers Aide');
assert(html.includes('app.js?v=168'), 'version app.js cohérente dans index.html');
assert(app.includes("navigator.serviceWorker.register('./sw.js?v=5'"), 'enregistrement du Service Worker versionné');
assert(sw.includes("const CACHE_NAME = 'rc-setup-preview-v5'") && sw.includes('./app.js?v=168'), 'cache Service Worker cohérent');

assert(app.includes('rc-setup-preview-v1') && materials.includes('rc-setup-preview-materials-v1') && backup.includes('rc-setup-preview-backups'), 'espaces de stockage propres à la prévisualisation');
assert(!/rc-setup-beta/.test(app + materials + backup + sw), 'aucune clé bêta dans les fichiers de l’application');
assert(html.includes('./assets/rc-setup-logo.svg?v=1') && sw.includes('./assets/rc-setup-logo.svg'), 'logo de la prévisualisation conservé');
assert(app.includes('stateLoadBlocked') && materials.includes('materialsLoadBlocked'), 'protections des données conservées');
assert(backup.includes('showBackupError') && backup.includes('lastBackupError'), 'diagnostics de sauvegarde présents');

if (process.exitCode) process.exit(process.exitCode);
console.log('Validation de la prévisualisation terminée.');
