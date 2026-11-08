import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('knownLength is memoized in App.tsx with React.useMemo', () => {
  assert.match(
    src,
    /const knownLength=React\.useMemo\(\(\)=>\{if\(chipRef\.current\)return chipRef\.current\.duration;/
  );
  assert.match(
    src,
    /return match\?Math\.min\(600,Math\.max\(1,Number\(match\[1\]\)\*60\+Number\(match\[2\]\)\)\):null\},\[sharePath,subtune,chipLoaded,catalogReady\]\);/
  );
});

test('no unmemoized knownLength IIFE calculation remains', () => {
  assert.doesNotMatch(
    src,
    /const knownLength=\(\(\)=>\{if\(chipRef\.current\)/
  );
});

function calculateKnownLength(sharePath, subtune, lengths, chipDuration = null) {
  if (chipDuration !== null) return chipDuration;
  const raw = sharePath ? lengths[sharePath]?.[subtune] : undefined;
  const match = raw?.match(/^(\d+):(\d+)/);
  return match ? Math.min(600, Math.max(1, Number(match[1]) * 60 + Number(match[2]))) : null;
}

test('knownLength calculation parses mm:ss and bounds to [1, 600] seconds', () => {
  const lengths = {
    'DEMOS/A-F/Audiomix_v2.sid': ['1:19'],
    'MUSICIANS/H/Hubbard_Rob/Commando.sid': ['3:56', '0:00', '15:30'],
  };

  // Normal mm:ss parsing
  assert.equal(calculateKnownLength('DEMOS/A-F/Audiomix_v2.sid', 0, lengths), 79);
  assert.equal(calculateKnownLength('MUSICIANS/H/Hubbard_Rob/Commando.sid', 0, lengths), 236);

  // Clamping minimum to 1s (0:00 becomes 1)
  assert.equal(calculateKnownLength('MUSICIANS/H/Hubbard_Rob/Commando.sid', 1, lengths), 1);

  // Clamping maximum to 600s (15:30 = 930s clamped to 600)
  assert.equal(calculateKnownLength('MUSICIANS/H/Hubbard_Rob/Commando.sid', 2, lengths), 600);

  // Missing path or non-existent subtune returns null
  assert.equal(calculateKnownLength('NONEXISTENT/Tune.sid', 0, lengths), null);
  assert.equal(calculateKnownLength('DEMOS/A-F/Audiomix_v2.sid', 5, lengths), null);
  assert.equal(calculateKnownLength(null, 0, lengths), null);

  // Custom chip duration takes precedence
  assert.equal(calculateKnownLength('DEMOS/A-F/Audiomix_v2.sid', 0, lengths, 42.5), 42.5);
});
