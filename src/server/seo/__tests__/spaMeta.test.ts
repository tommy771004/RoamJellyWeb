import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { injectSpaPageMeta } from '../spaMeta.js';

const shell = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
const CANONICAL = 'https://roam-jelly-web.vercel.app/trips/trip_abc';

function canonicals(html: string): string[] {
  return [...html.matchAll(/<link rel="canonical" href="([^"]*)"/gi)].map((m) => m[1]);
}

test('replaces the homepage canonical instead of adding a second one', () => {
  assert.equal(canonicals(shell).length, 1, 'fixture: shell starts with exactly one canonical');
  const out = injectSpaPageMeta(shell, { title: 'T', description: 'D', canonical: CANONICAL });
  assert.deepEqual(canonicals(out), [CANONICAL]);
});

test('points og:url at the page, not the homepage', () => {
  const out = injectSpaPageMeta(shell, { title: 'T', description: 'D', canonical: CANONICAL });
  assert.match(out, new RegExp(`<meta property="og:url" content="${CANONICAL}"`));
  assert.equal((out.match(/property="og:url"/g) ?? []).length, 1);
});

test('sets title and description once each', () => {
  const out = injectSpaPageMeta(shell, { title: '東京三日', description: '行程說明', canonical: CANONICAL });
  assert.equal((out.match(/<title>/g) ?? []).length, 1);
  assert.match(out, /<title>東京三日<\/title>/);
  assert.equal((out.match(/<meta name="description"/g) ?? []).length, 1);
  assert.match(out, /<meta name="description" content="行程說明"/);
});

test('escapes user-supplied trip names in tags and JSON-LD', () => {
  const evil = '"><script>alert(1)</script>';
  const out = injectSpaPageMeta(shell, {
    title: evil,
    description: evil,
    canonical: CANONICAL,
    jsonLd: [{ '@type': 'Trip', name: '</script><script>alert(2)</script>' }],
  });
  assert.ok(!out.includes('<script>alert(1)</script>'));
  assert.ok(!out.includes('</script><script>alert(2)'));
  assert.match(out, /<title>&quot;&gt;&lt;script&gt;/);
});

test('handles $-patterns in values literally', () => {
  const out = injectSpaPageMeta(shell, { title: "Cost $& $' trip", description: 'D', canonical: CANONICAL });
  assert.match(out, /<title>Cost \$&amp; \$&#x27; trip<\/title>/);
});
