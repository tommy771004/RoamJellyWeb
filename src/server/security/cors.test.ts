import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAllowedCorsOrigins, isCorsOriginAllowed, parseAllowedCorsOrigins } from './cors';

test('parseAllowedCorsOrigins trims entries and drops empty values', () => {
  assert.deepEqual(
    parseAllowedCorsOrigins(' https://roam-jelly-web.vercel.app , , https://app.example.com '),
    ['https://roam-jelly-web.vercel.app', 'https://app.example.com'],
  );
});

test('isCorsOriginAllowed allows requests without an Origin header', () => {
  assert.equal(isCorsOriginAllowed(undefined, []), true);
});

test('isCorsOriginAllowed rejects arbitrary cross-origin requests when no allowlist is configured', () => {
  assert.equal(isCorsOriginAllowed('https://evil.example', []), false);
});

test('isCorsOriginAllowed only accepts configured origins', () => {
  const allowedOrigins = ['https://roam-jelly-web.vercel.app', 'https://preview.roamjelly.app'];

  assert.equal(isCorsOriginAllowed('https://roam-jelly-web.vercel.app', allowedOrigins), true);
  assert.equal(isCorsOriginAllowed('https://evil.example', allowedOrigins), false);
});

test('buildAllowedCorsOrigins includes the production site and inferred vercel hostnames', () => {
  const allowedOrigins = buildAllowedCorsOrigins({
    configuredOrigins: 'https://app.example.com',
    nodeEnv: 'production',
    vercelUrl: 'preview-roam-jelly-web.vercel.app',
  });

  assert.deepEqual(allowedOrigins, [
    'https://app.example.com',
    'https://roam-jelly-web.vercel.app',
    'https://preview-roam-jelly-web.vercel.app',
  ]);
});

test('buildAllowedCorsOrigins adds localhost origins outside production', () => {
  const allowedOrigins = buildAllowedCorsOrigins({ nodeEnv: 'development' });

  assert.equal(allowedOrigins.includes('http://localhost:5173'), true);
  assert.equal(allowedOrigins.includes('http://127.0.0.1:3000'), true);
});
