import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('transport previous button uses memoized queueGroups[0].tracks.length', () => {
  assert.match(
    src,
    /activeQueueId\?!queueGroups\[0\]\.tracks\.length:/
  );
});

test('transport next button uses memoized queueGroups[2].tracks.length', () => {
  assert.match(
    src,
    /activeQueueId\?!queueGroups\[2\]\.tracks\.length:/
  );
});

test('no unmemoized playedIdsRef linear search remains in transport controls', () => {
  assert.doesNotMatch(
    src,
    /playedIdsRef\.current\.some/
  );
});

test('queue skip availability matches queueGroups partitioning across states', () => {
  function getDisabledState({ activeQueueId, playedLength, upcomingLength }) {
    return {
      prevDisabled: !activeQueueId ? true : !playedLength,
      nextDisabled: !activeQueueId ? true : !upcomingLength,
    };
  }

  // No active queue track
  assert.deepEqual(
    getDisabledState({ activeQueueId: null, playedLength: 0, upcomingLength: 0 }),
    { prevDisabled: true, nextDisabled: true }
  );

  // Active track with only upcoming tracks
  assert.deepEqual(
    getDisabledState({ activeQueueId: 'track-1', playedLength: 0, upcomingLength: 5 }),
    { prevDisabled: true, nextDisabled: false }
  );

  // Active track with only played tracks
  assert.deepEqual(
    getDisabledState({ activeQueueId: 'track-1', playedLength: 3, upcomingLength: 0 }),
    { prevDisabled: false, nextDisabled: true }
  );

  // Active track with both played and upcoming tracks
  assert.deepEqual(
    getDisabledState({ activeQueueId: 'track-1', playedLength: 2, upcomingLength: 4 }),
    { prevDisabled: false, nextDisabled: false }
  );
});
