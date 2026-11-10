import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('pageCount, currentPage, tunes, and selectedTune are memoized in App.tsx with React.useMemo', () => {
  assert.match(
    src,
    /const \[pageCount,currentPage,tunes,selectedTune\]=React\.useMemo\(\(\)=>\{/
  );
  assert.match(
    src,
    /\},\[visibleTunes,loaderPage,selectedBrowseTune\]\);/
  );
});

test('no unmemoized visibleTunes.slice page calculations remain in App.tsx', () => {
  assert.doesNotMatch(
    src,
    /const tunes=visibleTunes\.slice/
  );
});

function originalPagination(visibleTunes, loaderPage, selectedBrowseTune) {
  const pageCount = Math.max(1, Math.ceil(visibleTunes.length / 20));
  const currentPage = Math.min(loaderPage, pageCount - 1);
  const tunes = visibleTunes.slice(currentPage * 20, (currentPage + 1) * 20);
  const selectedTune = selectedBrowseTune && tunes.includes(selectedBrowseTune) ? selectedBrowseTune : (tunes[0] ?? null);
  return { pageCount, currentPage, tunes, selectedTune };
}

function memoizedPagination(visibleTunes, loaderPage, selectedBrowseTune) {
  const pCount = Math.max(1, Math.ceil(visibleTunes.length / 20));
  const cPage = Math.min(loaderPage, pCount - 1);
  const t = visibleTunes.slice(cPage * 20, (cPage + 1) * 20);
  const sel = selectedBrowseTune && t.includes(selectedBrowseTune) ? selectedBrowseTune : (t[0] ?? null);
  return { pageCount: pCount, currentPage: cPage, tunes: t, selectedTune: sel };
}

test('pagination and tune selection resolve edge cases identically to original logic', () => {
  const sampleTunes = Array.from({ length: 45 }, (_, i) => `MUSICIANS/H/Hubbard_Rob/Track_${i}.sid`);

  // 1. Page 0 with selected tune on page 0
  assert.deepEqual(
    memoizedPagination(sampleTunes, 0, sampleTunes[5]),
    originalPagination(sampleTunes, 0, sampleTunes[5])
  );
  assert.equal(memoizedPagination(sampleTunes, 0, sampleTunes[5]).selectedTune, sampleTunes[5]);
  assert.equal(memoizedPagination(sampleTunes, 0, sampleTunes[5]).currentPage, 0);
  assert.equal(memoizedPagination(sampleTunes, 0, sampleTunes[5]).pageCount, 3);
  assert.equal(memoizedPagination(sampleTunes, 0, sampleTunes[5]).tunes.length, 20);

  // 2. Page 1 where selected tune is on page 0 (should fall back to tunes[0] of current page)
  assert.deepEqual(
    memoizedPagination(sampleTunes, 1, sampleTunes[5]),
    originalPagination(sampleTunes, 1, sampleTunes[5])
  );
  assert.equal(memoizedPagination(sampleTunes, 1, sampleTunes[5]).selectedTune, sampleTunes[20]);

  // 3. Loader page exceeding pageCount clamps to pageCount - 1
  assert.deepEqual(
    memoizedPagination(sampleTunes, 99, null),
    originalPagination(sampleTunes, 99, null)
  );
  assert.equal(memoizedPagination(sampleTunes, 99, null).currentPage, 2);
  assert.equal(memoizedPagination(sampleTunes, 99, null).tunes.length, 5);
  assert.equal(memoizedPagination(sampleTunes, 99, null).selectedTune, sampleTunes[40]);

  // 4. Empty visibleTunes list returns pageCount 1, currentPage 0, empty tunes, null selectedTune
  assert.deepEqual(
    memoizedPagination([], 0, 'some/path.sid'),
    originalPagination([], 0, 'some/path.sid')
  );
  assert.deepEqual(
    memoizedPagination([], 0, 'some/path.sid'),
    { pageCount: 1, currentPage: 0, tunes: [], selectedTune: null }
  );

  // 5. Single item list
  assert.deepEqual(
    memoizedPagination(['single.sid'], 0, null),
    originalPagination(['single.sid'], 0, null)
  );
  assert.equal(memoizedPagination(['single.sid'], 0, null).selectedTune, 'single.sid');
});

test('fuzz test random combinations of visibleTunes, loaderPage, and selectedBrowseTune', () => {
  for (let iter = 0; iter < 1000; iter++) {
    const total = Math.floor(Math.random() * 85);
    const visibleTunes = Array.from({ length: total }, (_, i) => `DEMOS/Group/Tune_${i}.sid`);
    const loaderPage = Math.floor(Math.random() * 10);
    const selectedBrowseTune = Math.random() < 0.3
      ? null
      : (Math.random() < 0.7 && total > 0
          ? visibleTunes[Math.floor(Math.random() * total)]
          : `MISSING/Tune_${iter}.sid`);

    const expected = originalPagination(visibleTunes, loaderPage, selectedBrowseTune);
    const actual = memoizedPagination(visibleTunes, loaderPage, selectedBrowseTune);

    assert.equal(actual.pageCount, expected.pageCount, `pageCount mismatch on iteration ${iter}`);
    assert.equal(actual.currentPage, expected.currentPage, `currentPage mismatch on iteration ${iter}`);
    assert.deepEqual(actual.tunes, expected.tunes, `tunes mismatch on iteration ${iter}`);
    assert.equal(actual.selectedTune, expected.selectedTune, `selectedTune mismatch on iteration ${iter}`);
  }
});
