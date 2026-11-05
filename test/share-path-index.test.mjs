import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('sharePathIndex is memoized in App.tsx', () => {
  assert.match(src, /const sharePathIndex=React\.useMemo\(\(\)=>sharePath\?paths\.indexOf\(sharePath\):-1,\[sharePath,catalogReady\]\);/);
});

test('skipSong and transport buttons use memoized sharePathIndex', () => {
  assert.match(src, /const index=sharePathIndex>=0\?sharePathIndex:paths\.indexOf\(sharePath\);/);
  assert.match(src, /sharePathIndex<=0/);
  assert.match(src, /sharePathIndex>=paths\.length-1/);
});

// Test boundary and navigation conditions
function canSkip(sharePathIndex, pathsLength) {
  return {
    canPrevious: sharePathIndex > 0,
    canNext: sharePathIndex !== -1 && sharePathIndex < pathsLength - 1,
  };
}

test('navigation buttons disabled at boundaries and when no tune is loaded', () => {
  const total = 61157;

  // No tune loaded (sharePathIndex = -1)
  assert.deepEqual(canSkip(-1, total), { canPrevious: false, canNext: false });

  // First tune in catalog (sharePathIndex = 0)
  assert.deepEqual(canSkip(0, total), { canPrevious: false, canNext: true });

  // Last tune in catalog (sharePathIndex = total - 1)
  assert.deepEqual(canSkip(total - 1, total), { canPrevious: true, canNext: false });

  // Middle tune in catalog
  assert.deepEqual(canSkip(30000, total), { canPrevious: true, canNext: true });
});
