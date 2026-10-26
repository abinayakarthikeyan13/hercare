/* i18n coverage checker: EN vs TA keys, and t() keys used in src but absent from EN. */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../src/lib/translations.js'), 'utf8');
const mod = { exports: {} };
new Function(
  'module',
  'exports',
  src
    .replace(/export\s+default\s+/, 'module.exports.default = ')
    .replace(/export\s+const\s+/g, 'const ') +
    '\nif (typeof translations !== "undefined") module.exports.translations = translations;'
)(mod, mod.exports);
const dict = mod.exports.translations || mod.exports.default || mod.exports;

function flatten(obj, prefix = '') {
  const out = [];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...flatten(v, key));
    else out.push(key);
  }
  return out;
}

const en = new Set(flatten(dict.en || {}));
const ta = new Set(flatten(dict.ta || {}));

const missingTa = [...en].filter((k) => !ta.has(k));
const extraTa = [...ta].filter((k) => !en.has(k));

// Collect t('...') usages from source
const used = new Set();
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) used.add(m[1]);
    }
  }
})(path.join(__dirname, '../src'));

const missingEn = [...used].filter((k) => !en.has(k) && !k.includes('${'));

console.log(`EN keys: ${en.size} | TA keys: ${ta.size} | used t() keys: ${used.size}`);
console.log(`\nMissing in TA (${missingTa.length}):`);
console.log(missingTa.join('\n') || '(none)');
console.log(`\nExtra in TA (${extraTa.length}):`);
console.log(extraTa.join('\n') || '(none)');
console.log(`\nUsed but missing in EN (${missingEn.length}):`);
console.log(missingEn.join('\n') || '(none)');
