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

test('describeAuthError surfaces the Postgres cause and never the bound params', async () => {
  const { describeAuthError } = await import('../socialAuthBroker');
  const pgError = Object.assign(new Error('column "remember_me" of relation "auth_sessions" does not exist'), { code: '42703', detail: 'Key (token_hash)=(secret-hash)' });
  const drizzleError = new Error('Failed query: insert into "auth_sessions" ("id", "token_hash") values ($1, $2)\nparams: 9d34ca07,secret-hash-value', { cause: pgError });
  const out = describeAuthError(drizzleError);
  assert.match(out, /42703 column "remember_me" of relation "auth_sessions" does not exist/);
  assert.match(out, /^Failed query: insert into "auth_sessions"/);
  assert.ok(!out.includes('secret-hash'), 'params and detail must not be logged');
  assert.equal(describeAuthError('nope'), 'unknown error');
});
