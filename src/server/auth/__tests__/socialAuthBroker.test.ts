import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAuthorizationUrl } from '../socialAuthBroker';

const input = {
  state: 'state-value',
  nonce: 'nonce-value',
  codeChallenge: 'challenge-value',
};

test('Google authorization URL includes OIDC scopes and PKCE', () => {
  const url = new URL(buildAuthorizationUrl('google', {
    clientId: 'google-client',
    redirectUri: 'https://api.example.com/callback/google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: ['openid', 'email', 'profile'],
  }, input));

  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('state'), input.state);
  assert.equal(url.searchParams.get('nonce'), input.nonce);
  assert.equal(url.searchParams.get('code_challenge'), input.codeChallenge);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});

test('Apple authorization URL uses form_post and does not expose PKCE fields', () => {
  const url = new URL(buildAuthorizationUrl('apple', {
    clientId: 'apple-client',
    redirectUri: 'https://api.example.com/callback/apple',
    authorizationEndpoint: 'https://appleid.apple.com/auth/authorize',
    scopes: ['name', 'email'],
  }, input));

  assert.equal(url.searchParams.get('response_mode'), 'form_post');
  assert.equal(url.searchParams.get('scope'), 'name email');
  assert.equal(url.searchParams.has('code_challenge'), false);
});

test('LINE authorization URL includes PKCE without provider secrets', () => {
  const url = new URL(buildAuthorizationUrl('line', {
    clientId: 'line-channel',
    redirectUri: 'https://api.example.com/callback/line',
    authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize',
    scopes: ['openid', 'profile', 'email'],
  }, input));

  assert.equal(url.searchParams.get('client_id'), 'line-channel');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.toString().includes('secret'), false);
});
