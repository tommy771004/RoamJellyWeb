import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { decryptSecret, readSecret, sha256 } from './authCrypto';
import type { AuthProvider, AuthTransactionRecord, ProviderIdentity } from './authRepository';

export interface SocialProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  scopes: string[];
}

function configuredSecret(direct: string, ...references: string[]): string {
  for (const reference of references) {
    try {
      const value = readSecret(direct, reference);
      if (value) return value;
    } catch {
      // An absent or unreadable secret disables only this provider.
    }
  }
  return '';
}

export function providerConfig(provider: AuthProvider): SocialProviderConfig | null {
  if (process.env.SOCIAL_AUTH_CALLBACK_ENABLED !== 'true') return null;
  if (provider === 'apple') {
    const clientId = process.env.APPLE_CLIENT_ID?.trim() ?? '';
    const redirectUri = process.env.APPLE_REDIRECT_URI?.trim() ?? '';
    const privateKey = configuredSecret('APPLE_PRIVATE_KEY', 'APPLE_PRIVATE_KEY_REF', 'APPLE_PRIVATE_KEY_SECRET_REF');
    const teamId = process.env.APPLE_TEAM_ID?.trim() ?? '';
    const keyId = process.env.APPLE_KEY_ID?.trim() ?? '';
    return clientId && redirectUri && privateKey && teamId && keyId
      ? { clientId, redirectUri, clientSecret: '', authorizationEndpoint: 'https://appleid.apple.com/auth/authorize', scopes: ['name', 'email'] }
      : null;
  }
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? '';
    const clientSecret = configuredSecret('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET_REF', 'GOOGLE_CLIENT_SECRET_SECRET_REF');
    return clientId && redirectUri && clientSecret
      ? { clientId, redirectUri, clientSecret, authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['openid', 'email', 'profile'] }
      : null;
  }
  const clientId = process.env.LINE_CHANNEL_ID?.trim() ?? '';
  const redirectUri = process.env.LINE_REDIRECT_URI?.trim() ?? '';
  const clientSecret = configuredSecret('LINE_CHANNEL_SECRET', 'LINE_CHANNEL_SECRET_REF', 'LINE_CHANNEL_SECRET_SECRET_REF');
  return clientId && redirectUri && clientSecret
    ? { clientId, redirectUri, clientSecret, authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize', scopes: ['openid', 'profile', 'email'] }
    : null;
}

export function buildProviderAuthorizationUrl(
  provider: AuthProvider,
  config: SocialProviderConfig,
  input: { state: string; nonce: string; providerCodeChallenge?: string },
): string {
  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  if (provider === 'apple') url.searchParams.set('response_mode', 'form_post');
  else if (input.providerCodeChallenge) {
    url.searchParams.set('code_challenge', input.providerCodeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return url.toString();
}

async function postForm(url: string, body: URLSearchParams): Promise<any> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Provider token exchange failed (${response.status}).`);
  return payload;
}

function assertNonce(value: unknown, transaction: AuthTransactionRecord) {
  if (typeof value !== 'string' || sha256(value) !== transaction.nonceHash) throw new Error('Provider nonce mismatch.');
}

async function appleClientSecret(config: SocialProviderConfig): Promise<string> {
  const key = await importPKCS8(configuredSecret('APPLE_PRIVATE_KEY', 'APPLE_PRIVATE_KEY_REF', 'APPLE_PRIVATE_KEY_SECRET_REF'), 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID!.trim() })
    .setIssuer(process.env.APPLE_TEAM_ID!.trim())
    .setAudience('https://appleid.apple.com')
    .setSubject(config.clientId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export async function exchangeProviderCode(
  provider: AuthProvider,
  code: string,
  transaction: AuthTransactionRecord,
  appleUserJson?: string,
): Promise<ProviderIdentity> {
  const config = providerConfig(provider);
  if (!config) throw new Error('Provider is not configured.');
  const verifier = transaction.providerCodeVerifierEncrypted
    ? decryptSecret(transaction.providerCodeVerifierEncrypted)
    : '';

  if (provider === 'google') {
    const tokens = await postForm('https://oauth2.googleapis.com/token', new URLSearchParams({
      code, client_id: config.clientId, client_secret: config.clientSecret,
      redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: verifier,
    }));
    const { payload } = await jwtVerify(String(tokens.id_token ?? ''), googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId, clockTolerance: 5,
    });
    assertNonce(payload.nonce, transaction);
    if (!payload.sub) throw new Error('Google subject is missing.');
    return {
      provider, providerSubject: payload.sub, providerEmail: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      providerEmailVerified: payload.email_verified === true, displayName: typeof payload.name === 'string' ? payload.name : null,
      avatarUrl: typeof payload.picture === 'string' ? payload.picture : null,
    };
  }

  if (provider === 'apple') {
    const tokens = await postForm('https://appleid.apple.com/auth/token', new URLSearchParams({
      code, client_id: config.clientId, client_secret: await appleClientSecret(config),
      redirect_uri: config.redirectUri, grant_type: 'authorization_code',
    }));
    const { payload } = await jwtVerify(String(tokens.id_token ?? ''), appleJwks, {
      issuer: 'https://appleid.apple.com', audience: config.clientId, clockTolerance: 5,
    });
    assertNonce(payload.nonce, transaction);
    if (!payload.sub) throw new Error('Apple subject is missing.');
    let displayName: string | null = null;
    try {
      const user = appleUserJson ? JSON.parse(appleUserJson) : null;
      displayName = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(' ') || null;
    } catch { /* Apple sends user JSON only on first consent. */ }
    return {
      provider, providerSubject: payload.sub, providerEmail: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      providerEmailVerified: payload.email_verified === true || payload.email_verified === 'true', displayName, avatarUrl: null,
    };
  }

  const tokens = await postForm('https://api.line.me/oauth2/v2.1/token', new URLSearchParams({
    code, client_id: config.clientId, client_secret: config.clientSecret,
    redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: verifier,
  }));
  const claims = await postForm('https://api.line.me/oauth2/v2.1/verify', new URLSearchParams({
    id_token: String(tokens.id_token ?? ''), client_id: config.clientId,
  }));
  assertNonce(claims.nonce, transaction);
  if (claims.iss !== 'https://access.line.me' || String(claims.aud) !== config.clientId || !claims.sub) {
    throw new Error('LINE ID token validation failed.');
  }
  return {
    provider, providerSubject: String(claims.sub), providerEmail: typeof claims.email === 'string' ? claims.email.toLowerCase() : null,
    providerEmailVerified: typeof claims.email === 'string', displayName: typeof claims.name === 'string' ? claims.name : null,
    avatarUrl: typeof claims.picture === 'string' ? claims.picture : null,
  };
}
