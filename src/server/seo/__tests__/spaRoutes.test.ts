import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isSpaRoute, SPA_ROUTE_PATTERN } from '../spaRoutes.js';

const SPA = ['/', '/index.html', '/trip/trip_abc', '/trips/trip_abc', '/auth/callback', '/forgot-password', '/reset-password', '/pricing', '/pricing/'];
const NOT_SPA = ['/foo', '/guide', '/trip', '/trip/a/b', '/trips/tokyo', '/random/path', '/wp-login.php', '/pricing/extra'];

test('known client routes are SPA routes', () => {
  for (const p of SPA) assert.ok(isSpaRoute(p), `${p} should be an SPA route`);
});

test('unknown paths are not SPA routes (served as 404)', () => {
  for (const p of NOT_SPA) assert.ok(!isSpaRoute(p), `${p} should 404`);
});

test('vercel.json SPA route matches the server-side pattern, followed by a 404 catch-all', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf-8'));
  const routes: { src: string; dest?: string; status?: number }[] = vercel.routes;
  const last = routes[routes.length - 1];
  const spa = routes[routes.length - 2];
  assert.deepEqual({ src: last.src, status: last.status, dest: last.dest }, { src: '/(.*)', status: 404, dest: '/index.html' });
  assert.equal(spa.dest, '/index.html');
  assert.equal(spa.status, undefined);
  const vercelPattern = new RegExp(`^${spa.src}$`);
  for (const p of SPA) assert.equal(vercelPattern.test(p), true, `vercel: ${p}`);
  for (const p of NOT_SPA) assert.equal(vercelPattern.test(p), SPA_ROUTE_PATTERN.test(p), `vercel vs server disagree on ${p}`);
});
