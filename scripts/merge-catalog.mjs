// Merge a new HVSC path list into the bundled catalog without breaking old share links.
// Usage: node scripts/merge-catalog.mjs path/to/new-paths.json
// Paths that vanished from the new list move to src/hvsc-retired.json, so their share IDs still resolve to a name.
import fs from 'node:fs';
const [, , newFile] = process.argv;
if (!newFile) { console.error('usage: node scripts/merge-catalog.mjs new-paths.json'); process.exit(1); }
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const oldPaths = read('src/hvsc-index.json');
const retired = read('src/hvsc-retired.json');
const next = read(newFile);
const nextSet = new Set(next);
const kept = new Set(retired.filter(p => !nextSet.has(p)));
for (const p of oldPaths) if (!nextSet.has(p)) kept.add(p);
fs.writeFileSync('src/hvsc-index.json', JSON.stringify(next));
fs.writeFileSync('src/hvsc-retired.json', JSON.stringify([...kept].sort()));
console.log(`${next.length} current, ${kept.size} retired (${[...kept].length - retired.length >= 0 ? '+' : ''}${kept.size - retired.length} newly retired)`);
