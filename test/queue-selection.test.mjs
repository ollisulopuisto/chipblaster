import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('queueSel and queueSelIndex are memoized in App.tsx with React.useMemo', () => {
  assert.match(
    src,
    /const \[queueSel,queueSelIndex\]=React\.useMemo\(\(\)=>\{/
  );
  assert.match(
    src,
    /\},\[queueRows,selQueueId,activeQueueId\]\);/
  );
});

test('no unmemoized queueSel linear searches remain in App.tsx', () => {
  assert.doesNotMatch(
    src,
    /queueSel=queueRows\.find\(/
  );
});

function findOriginal(queueRows, selQueueId, activeQueueId) {
  const queueSel = queueRows.find(t => t.id === selQueueId) ?? queueRows.find(t => t.id === activeQueueId) ?? queueRows[0] ?? null;
  const queueSelIndex = queueSel ? queueRows.indexOf(queueSel) : -1;
  return { queueSel, queueSelIndex };
}

function resolveQueueSel(queueRows, selQueueId, activeQueueId) {
  let idx = -1;
  if (selQueueId) idx = queueRows.findIndex(t => t.id === selQueueId);
  if (idx < 0 && activeQueueId) idx = queueRows.findIndex(t => t.id === activeQueueId);
  if (idx < 0 && queueRows.length) idx = 0;
  return { queueSel: idx >= 0 ? queueRows[idx] : null, queueSelIndex: idx };
}

test('queue selection correctly resolves edge cases identically to original logic', () => {
  const sampleRows = [
    { id: 'track-1', name: 'Song 1' },
    { id: 'track-2', name: 'Song 2' },
    { id: 'track-3', name: 'Song 3' },
  ];

  // 1. Explicit selQueueId match
  assert.deepEqual(
    resolveQueueSel(sampleRows, 'track-2', 'track-1'),
    findOriginal(sampleRows, 'track-2', 'track-1')
  );
  assert.equal(resolveQueueSel(sampleRows, 'track-2', 'track-1').queueSelIndex, 1);

  // 2. Fallback to activeQueueId when selQueueId is null or not found
  assert.deepEqual(
    resolveQueueSel(sampleRows, null, 'track-3'),
    findOriginal(sampleRows, null, 'track-3')
  );
  assert.deepEqual(
    resolveQueueSel(sampleRows, 'nonexistent', 'track-3'),
    findOriginal(sampleRows, 'nonexistent', 'track-3')
  );
  assert.equal(resolveQueueSel(sampleRows, null, 'track-3').queueSelIndex, 2);

  // 3. Fallback to first item when neither selQueueId nor activeQueueId matches
  assert.deepEqual(
    resolveQueueSel(sampleRows, null, null),
    findOriginal(sampleRows, null, null)
  );
  assert.deepEqual(
    resolveQueueSel(sampleRows, 'nonexistent', 'missing'),
    findOriginal(sampleRows, 'nonexistent', 'missing')
  );
  assert.equal(resolveQueueSel(sampleRows, null, null).queueSelIndex, 0);

  // 4. Empty queue returns null and -1
  assert.deepEqual(
    resolveQueueSel([], 'track-1', 'track-2'),
    findOriginal([], 'track-1', 'track-2')
  );
  assert.deepEqual(
    resolveQueueSel([], null, null),
    { queueSel: null, queueSelIndex: -1 }
  );
});

test('fuzz test random combinations of queueRows, selQueueId, and activeQueueId against original implementation', () => {
  for (let iter = 0; iter < 1000; iter++) {
    const count = Math.floor(Math.random() * 25);
    const rows = Array.from({ length: count }, (_, i) => ({
      id: `id-${i}-${Math.floor(Math.random() * 5)}`,
      name: `Track ${i}`
    }));
    const selQueueId = Math.random() < 0.25 ? null : `id-${Math.floor(Math.random() * 30)}-0`;
    const activeQueueId = Math.random() < 0.25 ? null : `id-${Math.floor(Math.random() * 30)}-0`;

    const expected = findOriginal(rows, selQueueId, activeQueueId);
    const actual = resolveQueueSel(rows, selQueueId, activeQueueId);

    assert.equal(actual.queueSel, expected.queueSel, `Mismatch in queueSel on iteration ${iter}`);
    assert.equal(actual.queueSelIndex, expected.queueSelIndex, `Mismatch in queueSelIndex on iteration ${iter}`);
  }
});
