import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { decryptSecret, envValue, readSecret, sha256 } from './authCrypto';
import type { AuthProvider, AuthTransactionRecord, ProviderIdentity } from './authRepository';

export interface SocialProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationEndpoint: string;
  scopes: string[];
}

interface SecretLookup {
  value: string;
  /** Why the secret could not be read (env var names only — never values). */
  problems: string[];
}

function lookupSecret(direct: string, ...references: string[]): SecretLookup {
  const problems: string[] = [];
  for (const reference of references) {
    try {
      const value = readSecret(direct, reference);
      if (value) return { value, problems: [] };
      const ref = envValue(reference);
      if (ref.startsWith('env://')) problems.push(`${reference} points to ${ref.slice(6)}, which is empty or unset`);
    } catch {
      // An absent or unreadable secret disables only this provider.
      const ref = envValue(reference);
      problems.push(ref.startsWith('file://')
        ? `${reference} file could not be read`
        : `${reference} must start with env:// or file:// (put a raw secret in ${direct} instead)`);
    }
  }
  if (problems.length === 0) problems.push(`${direct} (or ${references.join(' / ')}) is not set`);
  return { value: '', problems };
}

export function socialAuthCallbackEnabled(): boolean {
  return envValue('SOCIAL_AUTH_CALLBACK_ENABLED').toLowerCase() === 'true';
}

interface ProviderResolution {
  config: SocialProviderConfig | null;
  /** Empty when enabled. Each entry names the env var at fault; values are never included. */
  problems: string[];
  /** True when at least one of this provider's own env vars is set (i.e. someone tried to configure it). */
  attempted: boolean;
}

function resolveProvider(provider: AuthProvider): ProviderResolution {
  const required = (names: string[]) => names.filter((name) => !envValue(name)).map((name) => `${name} is not set`);
  const anySet = (names: string[]) => names.some((name) => envValue(name) !== '');

  let config: SocialProviderConfig | null = null;
  let problems: string[];
  let attempted: boolean;

  if (provider === 'apple') {
    const names = ['APPLE_CLIENT_ID', 'APPLE_REDIRECT_URI', 'APPLE_TEAM_ID', 'APPLE_KEY_ID'];
    const secretNames = ['APPLE_PRIVATE_KEY', 'APPLE_PRIVATE_KEY_REF', 'APPLE_PRIVATE_KEY_SECRET_REF'];
    const key = lookupSecret('APPLE_PRIVATE_KEY', 'APPLE_PRIVATE_KEY_REF', 'APPLE_PRIVATE_KEY_SECRET_REF');
    problems = [...required(names), ...key.problems];
    attempted = anySet([...names, ...secretNames]);
    if (problems.length === 0) {
      config = { clientId: envValue('APPLE_CLIENT_ID'), redirectUri: envValue('APPLE_REDIRECT_URI'), clientSecret: '', authorizationEndpoint: 'https://appleid.apple.com/auth/authorize', scopes: ['name', 'email'] };
    }
  } else if (provider === 'google') {
    const names = ['GOOGLE_CLIENT_ID', 'GOOGLE_REDIRECT_URI'];
    const secretNames = ['GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET_REF', 'GOOGLE_CLIENT_SECRET_SECRET_REF'];
    const secret = lookupSecret('GOOGLE_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET_REF', 'GOOGLE_CLIENT_SECRET_SECRET_REF');
    problems = [...required(names), ...secret.problems];
    attempted = anySet([...names, ...secretNames]);
    if (problems.length === 0) {
      config = { clientId: envValue('GOOGLE_CLIENT_ID'), redirectUri: envValue('GOOGLE_REDIRECT_URI'), clientSecret: secret.value, authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth', scopes: ['openid', 'email', 'profile'] };
    }
  } else {
    const names = ['LINE_CHANNEL_ID', 'LINE_REDIRECT_URI'];
    const secretNames = ['LINE_CHANNEL_SECRET', 'LINE_CHANNEL_SECRET_REF', 'LINE_CHANNEL_SECRET_SECRET_REF'];
    const secret = lookupSecret('LINE_CHANNEL_SECRET', 'LINE_CHANNEL_SECRET_REF', 'LINE_CHANNEL_SECRET_SECRET_REF');
    problems = [...required(names), ...secret.problems];
    attempted = anySet([...names, ...secretNames]);
    if (problems.length === 0) {
      config = { clientId: envValue('LINE_CHANNEL_ID'), redirectUri: envValue('LINE_REDIRECT_URI'), clientSecret: secret.value, authorizationEndpoint: 'https://access.line.me/oauth2/v2.1/authorize', scopes: ['openid', 'profile', 'email'] };
    }
  }

  if (!socialAuthCallbackEnabled()) {
    return { config: null, problems: ['SOCIAL_AUTH_CALLBACK_ENABLED is not "true"', ...problems], attempted };
  }
  return { config, problems, attempted };
}

export function providerConfig(provider: AuthProvider): SocialProviderConfig | null {
  return resolveProvider(provider).config;
}

/**
 * Why each provider is disabled — env var names only, safe to log.
 * Providers nobody tried to configure (no env var set at all) are omitted.
 */
export function socialProviderDiagnostics(): Partial<Record<AuthProvider, string[]>> {
  const out: Partial<Record<AuthProvider, string[]>> = {};
  for (const provider of ['apple', 'google', 'line'] as const) {
    const { config, problems, attempted } = resolveProvider(provider);
    if (!config && attempted) out[provider] = problems;
  }
  return out;
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
  const key = await importPKCS8(lookupSecret('APPLE_PRIVATE_KEY', 'APPLE_PRIVATE_KEY_REF', 'APPLE_PRIVATE_KEY_SECRET_REF').value, 'ES256');
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: envValue('APPLE_KEY_ID') })
    .setIssuer(envValue('APPLE_TEAM_ID'))
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
