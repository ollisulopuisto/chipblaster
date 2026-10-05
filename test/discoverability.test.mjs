import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SITE = 'https://chipblaster.sulopuis.to/';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('robots.txt allows every crawler and names the sitemap', () => {
  const robots = read('public/robots.txt');
  assert.match(robots, /User-agent: \*\nAllow: \//);
  assert.doesNotMatch(robots, /Disallow/);
  assert.ok(robots.includes(`Sitemap: ${SITE}sitemap.xml`));
});

test('sitemap.xml lists the canonical URL', () => {
  assert.ok(read('public/sitemap.xml').includes(`<loc>${SITE}</loc>`));
});

test('index.html has description, canonical and crawlable text', () => {
  const html = read('index.html');
  assert.match(html, /<meta name="description" content="[^"]{50,}"/);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE}"`));
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /<div id="root">\s*<main>[\s\S]*<h1>/);
});

test('llms.txt describes the site for language models', () => {
  const llms = read('public/llms.txt');
  assert.match(llms, /^# CHIPBLASTER\n\n> .+/);
  assert.ok(llms.includes(SITE));
});
