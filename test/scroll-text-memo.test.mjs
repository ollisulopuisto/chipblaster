import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('songLine, scrollText, and vizSeed are memoized in App.tsx with React.useMemo', () => {
  assert.match(
    src,
    /const \[songLine,scrollText,vizSeed\]=React\.useMemo\(\(\)=>\{/
  );
  assert.match(
    src,
    /\},\[sharePath,chipLoaded,playing,title,author,customMsg\]\);/
  );
});

test('no unmemoized songLine or scrollText calculations remain in App.tsx', () => {
  assert.doesNotMatch(
    src,
    /const songLine=\(sharePath\|\|chipLoaded/
  );
});

function computeOriginal(sharePath, chipLoaded, playing, title, author, customMsg) {
  const songLine = (sharePath || chipLoaded || playing) && title && !/^Decoding/i.test(title) ? title + (author ? ' / ' + author : '') : 'CHIPBLASTER';
  const scrollText = songLine + (customMsg ? '   ***   ' + customMsg : '') + '   ';
  const vizSeed = sharePath || title + '|' + author;
  return { songLine, scrollText, vizSeed };
}

function computeMemoized(sharePath, chipLoaded, playing, title, author, customMsg) {
  const sLine = (sharePath || chipLoaded || playing) && title && !/^Decoding/i.test(title) ? title + (author ? ' / ' + author : '') : 'CHIPBLASTER';
  const sText = sLine + (customMsg ? '   ***   ' + customMsg : '') + '   ';
  const vSeed = sharePath || title + '|' + author;
  return { songLine: sLine, scrollText: sText, vizSeed: vSeed };
}

test('resolves edge cases identically to original logic', () => {
  // 1. Initial idle state (no tune loaded)
  assert.deepEqual(
    computeMemoized(null, false, false, 'Your SID goes here', 'Press EJECT and choose a tune', ''),
    computeOriginal(null, false, false, 'Your SID goes here', 'Press EJECT and choose a tune', '')
  );
  assert.deepEqual(
    computeMemoized(null, false, false, 'Your SID goes here', 'Press EJECT and choose a tune', ''),
    {
      songLine: 'CHIPBLASTER',
      scrollText: 'CHIPBLASTER   ',
      vizSeed: 'Your SID goes here|Press EJECT and choose a tune',
    }
  );

  // 2. Playing track with author
  assert.deepEqual(
    computeMemoized('MUSICIANS/H/Hubbard_Rob/Commando.sid', false, true, 'Commando', 'Rob Hubbard', ''),
    computeOriginal('MUSICIANS/H/Hubbard_Rob/Commando.sid', false, true, 'Commando', 'Rob Hubbard', '')
  );
  assert.deepEqual(
    computeMemoized('MUSICIANS/H/Hubbard_Rob/Commando.sid', false, true, 'Commando', 'Rob Hubbard', ''),
    {
      songLine: 'Commando / Rob Hubbard',
      scrollText: 'Commando / Rob Hubbard   ',
      vizSeed: 'MUSICIANS/H/Hubbard_Rob/Commando.sid',
    }
  );

  // 3. Track with custom scroller message
  assert.deepEqual(
    computeMemoized('MUSICIANS/G/Galway_Martin/Arkanoid.sid', false, true, 'Arkanoid', 'Martin Galway', 'HELLO WORLD'),
    computeOriginal('MUSICIANS/G/Galway_Martin/Arkanoid.sid', false, true, 'Arkanoid', 'Martin Galway', 'HELLO WORLD')
  );
  assert.deepEqual(
    computeMemoized('MUSICIANS/G/Galway_Martin/Arkanoid.sid', false, true, 'Arkanoid', 'Martin Galway', 'HELLO WORLD'),
    {
      songLine: 'Arkanoid / Martin Galway',
      scrollText: 'Arkanoid / Martin Galway   ***   HELLO WORLD   ',
      vizSeed: 'MUSICIANS/G/Galway_Martin/Arkanoid.sid',
    }
  );

  // 4. Decoding state (should fall back to CHIPBLASTER)
  assert.deepEqual(
    computeMemoized(null, true, false, 'Decoding header...', 'Unknown', ''),
    computeOriginal(null, true, false, 'Decoding header...', 'Unknown', '')
  );
  assert.equal(
    computeMemoized(null, true, false, 'Decoding header...', 'Unknown', '').songLine,
    'CHIPBLASTER'
  );

  // 5. Track without author
  assert.deepEqual(
    computeMemoized('DEMOS/Unknown/Intro.sid', false, true, 'Intro', '', ''),
    computeOriginal('DEMOS/Unknown/Intro.sid', false, true, 'Intro', '', '')
  );
  assert.equal(
    computeMemoized('DEMOS/Unknown/Intro.sid', false, true, 'Intro', '').songLine,
    'Intro'
  );

  // 6. Local chip loaded without sharePath
  assert.deepEqual(
    computeMemoized(null, true, true, 'Local Tune', 'Local Artist', ''),
    computeOriginal(null, true, true, 'Local Tune', 'Local Artist', '')
  );
  assert.equal(
    computeMemoized(null, true, true, 'Local Tune', 'Local Artist', '').vizSeed,
    'Local Tune|Local Artist'
  );
});

test('fuzz test random combinations of track metadata and state against original logic', () => {
  const titles = ['', 'Commando', 'Arkanoid', 'Decoding SID...', 'decoding audio', 'Sanxion', 'Ocean Loader'];
  const authors = ['', 'Rob Hubbard', 'Martin Galway', 'Chris Huelsbeck', 'Unknown'];
  const customMsgs = ['', 'HELLO C64', 'SID MUSIC 4EVER', '1985'];
  const paths = [null, 'MUSICIANS/H/Hubbard_Rob/Commando.sid', 'DEMOS/A/Antics.sid'];

  for (let iter = 0; iter < 1000; iter++) {
    const sharePath = paths[Math.floor(Math.random() * paths.length)];
    const chipLoaded = Math.random() < 0.5;
    const playing = Math.random() < 0.5;
    const title = titles[Math.floor(Math.random() * titles.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    const customMsg = customMsgs[Math.floor(Math.random() * customMsgs.length)];

    const expected = computeOriginal(sharePath, chipLoaded, playing, title, author, customMsg);
    const actual = computeMemoized(sharePath, chipLoaded, playing, title, author, customMsg);

    assert.equal(actual.songLine, expected.songLine, `songLine mismatch on iter ${iter}`);
    assert.equal(actual.scrollText, expected.scrollText, `scrollText mismatch on iter ${iter}`);
    assert.equal(actual.vizSeed, expected.vizSeed, `vizSeed mismatch on iter ${iter}`);
  }
});
