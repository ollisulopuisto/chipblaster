import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('favoritesSet is memoized in App.tsx', () => {
  assert.match(
    src,
    /const favoritesSet=React\.useMemo\(\(\)=>new Set\(favorites\),\[favorites\]\);/
  );
});

test('filtered uses favoritesSet for lookups', () => {
  assert.match(src, /const favSet=favoritesOnly\?favoritesSet:null;/);
  assert.match(
    src,
    /\},\[query,folder,category,favoritesSet,favoritesOnly,catalogReady\]\);/
  );
});

test('App.tsx uses favoritesSet.has across render paths instead of favorites.includes', () => {
  // Transport favorite button
  assert.match(src, /sharePath&&favoritesSet\.has\(sharePath\)/);
  // Catalog browse rows
  assert.match(src, /fav=favoritesSet\.has\(path\)/);
  // Catalog key bar
  assert.match(src, /favoritesSet\.has\(selectedTune\)/);
  // Playlist key bar
  assert.match(src, /favoritesSet\.has\(queueSel\.path\)/);
  // Playlist queue items
  assert.match(src, /fav=!!track\.path&&favoritesSet\.has\(track\.path\)/);
  // Title console aria-label
  assert.match(src, /sharePath&&favoritesSet\.has\(sharePath\)/);

  // Make sure no unmemoized favorites.includes calls remain in JSX/render expressions
  const remainingIncludes = src.match(/favorites\.includes/g) || [];
  assert.equal(
    remainingIncludes.length,
    0,
    `Expected 0 favorites.includes calls in App.tsx, found ${remainingIncludes.length}`
  );
});

test('favoritesSet has expected lookup behavior', () => {
  const favorites = ['MUSICIANS/H/Hubbard_Rob/Commando.sid', 'DEMOS/UNKNOWN/Test.sid'];
  const favSet = new Set(favorites);

  assert.equal(favSet.has('MUSICIANS/H/Hubbard_Rob/Commando.sid'), true);
  assert.equal(favSet.has('MUSICIANS/G/Galway_Martin/Comic_Bakery.sid'), false);
  assert.equal(favSet.has(''), false);
});
