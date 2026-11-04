import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('queueGroups is memoized in App.tsx with Set-based single pass', () => {
  assert.match(src, /const queueGroups=React\.useMemo\(\(\)=>\{/);
  assert.match(src, /const playedSet=new Set\(playedIds\);/);
  assert.match(src, /<ol className="playlist-rows dir-list">\{queueGroups\.map\(/);
});

// Test the partitioning logic and invariant properties
function partitionQueue(queueRows, activeQueueId, playedIds) {
  const playedSet = new Set(playedIds);
  const played = [];
  const current = [];
  const upcoming = [];
  for (let i = 0; i < queueRows.length; i++) {
    const track = queueRows[i];
    const item = { track, i };
    if (track.id === activeQueueId) current.push(item);
    else if (playedSet.has(track.id)) played.push(item);
    else upcoming.push(item);
  }
  return [
    { group: 'played', tracks: played },
    { group: 'current', tracks: current },
    { group: 'upcoming', tracks: upcoming }
  ];
}

test('partitionQueue partitions empty queue correctly', () => {
  const res = partitionQueue([], null, []);
  assert.equal(res[0].tracks.length, 0);
  assert.equal(res[1].tracks.length, 0);
  assert.equal(res[2].tracks.length, 0);
});

test('partitionQueue maintains exact group membership and track indices', () => {
  const tracks = [
    { id: 't-1', name: 'Song 1' },
    { id: 't-2', name: 'Song 2' },
    { id: 't-3', name: 'Song 3' },
    { id: 't-4', name: 'Song 4' },
    { id: 't-5', name: 'Song 5' }
  ];
  const activeQueueId = 't-3';
  const playedIds = ['t-1', 't-5', 't-3']; // t-3 is active, so should be in current, not played

  const res = partitionQueue(tracks, activeQueueId, playedIds);
  const [played, current, upcoming] = res;

  // Active track must be in current
  assert.equal(current.tracks.length, 1);
  assert.equal(current.tracks[0].track.id, 't-3');
  assert.equal(current.tracks[0].i, 2);

  // Played tracks (excluding active track)
  assert.equal(played.tracks.length, 2);
  assert.deepEqual(played.tracks.map(x => x.track.id), ['t-1', 't-5']);
  assert.deepEqual(played.tracks.map(x => x.i), [0, 4]);

  // Upcoming tracks (not active and not in playedIds)
  assert.equal(upcoming.tracks.length, 2);
  assert.deepEqual(upcoming.tracks.map(x => x.track.id), ['t-2', 't-4']);
  assert.deepEqual(upcoming.tracks.map(x => x.i), [1, 3]);

  // Invariant: sum of all partitioned tracks equals total tracks
  const total = played.tracks.length + current.tracks.length + upcoming.tracks.length;
  assert.equal(total, tracks.length);
});
