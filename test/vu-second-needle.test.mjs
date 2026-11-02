import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
test('second VU needle is drawn on every voice meter, not only on two-SID tunes',()=>{
  assert.match(src,/const showSecond=s\.chipSource==='SID'&&!s\.master,hasSecond=/);
  assert.match(src,/if\(showSecond\)\{const a2=/);
});
test('second VU needle only moves and brightens for a playing two-SID tune',()=>{
  assert.match(src,/target2=hasSecond&&!muted\?db2:0/);
  assert.match(src,/hasSecond&&s\.active&&!muted\?1:\.3/);
});
