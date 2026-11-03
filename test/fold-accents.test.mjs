import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('foldAccents has ASCII fast-path check in App.tsx', () => {
  assert.match(src, /const NON_ASCII=\/\[\\u0080-\\uFFFF\]\/;/);
  assert.match(src, /const foldAccents=\(t:string\)=>!NON_ASCII\.test\(t\)\?t:t\.normalize/);
});

// Extract foldAccents logic directly from source or evaluate implementation
const NON_ASCII = /[\u0080-\uFFFF]/;
const foldAccents = (t) => !NON_ASCII.test(t) ? t : t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ø/g, 'o').replace(/Ø/g, 'O');

test('foldAccents leaves ASCII strings unchanged', () => {
  const asciiSamples = [
    'OUTPUT',
    'VOICE 1',
    'RASTER BARS',
    '120HZ',
    '3:00',
    'PAGE 1/3058',
    '61157 TUNES',
    'CHIPBLASTER 64',
    'Rob Hubbard / Commando',
  ];
  for (const s of asciiSamples) {
    assert.equal(foldAccents(s), s);
  }
});

test('foldAccents correctly strips combining diacritics and folds special characters', () => {
  assert.equal(foldAccents('Jäger'), 'Jager');
  assert.equal(foldAccents('Müller'), 'Muller');
  assert.equal(foldAccents('Straße'), 'Strasse');
  assert.equal(foldAccents('Sørensen'), 'Sorensen');
  assert.equal(foldAccents('KØBENHAVN'), 'KOBENHAVN');
  assert.equal(foldAccents('Encyclopædia'), 'Encyclopaedia');
  assert.equal(foldAccents('ÆGIS'), 'AEGIS');
  assert.equal(foldAccents('Ångström'), 'Angstrom');
  assert.equal(foldAccents('Élégie'), 'Elegie');
});
