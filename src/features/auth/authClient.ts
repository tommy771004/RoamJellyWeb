import type {
  AuthErrorCode,
  AuthProvider,
  AuthSessionResponse,
  PendingAuthTransaction,
  SocialProviderAvailability,
  StartAuthRequest,
  StartAuthResponse,
} from './types';

const PENDING_AUTH_KEY = 'roamjelly_pending_auth';
const DEFAULT_TRANSACTION_TTL_SECONDS = 600;
export const SOCIAL_PROVIDERS: AuthProvider[] = ['apple', 'google', 'line'];

export function disabledSocialProviders(): SocialProviderAvailability {
  return { apple: false, google: false, line: false };
}

export class AuthClientError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AuthClientError';
  }
}

function sessionStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

function authRedirectUri(): string {
  const configured = String((import.meta as any).env?.VITE_AUTH_CALLBACK_URI ?? '').trim();
  if (configured) return configured;
  return typeof window === 'undefined' ? '/auth/callback' : `${window.location.origin}/auth/callback`;
}

function parseErrorCode(value: string | null): AuthErrorCode {
  const supported: AuthErrorCode[] = [
    'AUTH_CANCELLED',
    'AUTH_PROVIDER_ERROR',
    'AUTH_STATE_MISMATCH',
    'AUTH_TICKET_EXPIRED',
    'AUTH_TICKET_USED',
    'AUTH_SESSION_EXCHANGE_FAILED',
    'ACCOUNT_DISABLED',
    'ACCOUNT_LINK_REQUIRED',
    'NETWORK_ERROR',
    'RATE_LIMITED',
  ];
  return supported.includes(value as AuthErrorCode)
    ? (value as AuthErrorCode)
    : 'AUTH_PROVIDER_ERROR';
}

export function readPendingAuthTransaction(): PendingAuthTransaction | null {
  const raw = sessionStore()?.getItem(PENDING_AUTH_KEY);
  if (!raw) return null;
  try {
    const pending = JSON.parse(raw) as PendingAuthTransaction;
    if (!pending.state || !pending.codeVerifier || !pending.authorizationUrl) return null;
    return pending;
  } catch {
    return null;
  }
}

export function clearPendingAuthTransaction(): void {
  sessionStore()?.removeItem(PENDING_AUTH_KEY);
}

export function isPendingAuthExpired(pending: PendingAuthTransaction): boolean {
  return Date.now() >= pending.expiresAt;
}

export async function getSocialProviderAvailability(): Promise<SocialProviderAvailability> {
  try {
    const response = await fetch('/api/auth/social/providers');
    if (!response.ok) return disabledSocialProviders();
    const body = await response.json().catch(() => null);
    return {
      apple: body?.providers?.apple === true,
      google: body?.providers?.google === true,
      line: body?.providers?.line === true,
    };
  } catch {
    return disabledSocialProviders();
  }
}

export async function startSocialAuth(provider: AuthProvider, options?: { link?: boolean }): Promise<PendingAuthTransaction> {
  const state = randomBase64Url(32);
  const nonce = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  const requestId = crypto.randomUUID();
  const payload: StartAuthRequest = {
    provider,
    state,
    nonce,
    codeChallenge,
    codeChallengeMethod: 'S256',
    appRedirectUri: authRedirectUri(),
    requestId,
    link: options?.link,
  };

  let response: Response;
  try {
    response = await fetch('/api/auth/social/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
        ...(options?.link && sessionStore()?.getItem('access_token') ? { Authorization: `Bearer ${sessionStore()!.getItem('access_token')}` } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthClientError('NETWORK_ERROR', '目前無法連線，請檢查網路後再試一次。');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthClientError(
      parseErrorCode(String(body?.error ?? 'AUTH_PROVIDER_ERROR')),
      String(body?.message ?? `${provider} 登入暫時無法使用，請稍後再試。`),
    );
  }

  const started = body as StartAuthResponse;
  if (!started.authorizationUrl || !started.transactionId) {
    throw new AuthClientError('AUTH_PROVIDER_ERROR', '登入服務回應不完整，請稍後再試。');
  }

  const pending: PendingAuthTransaction = {
    provider,
    state,
    codeVerifier,
    authorizationUrl: started.authorizationUrl,
    transactionId: started.transactionId,
    requestId,
    expiresAt: Date.now() + (started.expiresIn || DEFAULT_TRANSACTION_TTL_SECONDS) * 1000,
  };
  sessionStore()?.setItem(PENDING_AUTH_KEY, JSON.stringify(pending));
  return pending;
}

export async function listConnectedIdentities(): Promise<Array<{ provider: AuthProvider; providerEmail?: string | null }>> {
  const token = sessionStore()?.getItem('access_token') ?? '';
  const response = await fetch('/api/auth/social/identities', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new AuthClientError('AUTH_SESSION_EXCHANGE_FAILED', '無法讀取已連結帳號。');
  const body = await response.json();
  return Array.isArray(body?.identities) ? body.identities : [];
}

export async function disconnectIdentity(provider: AuthProvider): Promise<void> {
  const token = sessionStore()?.getItem('access_token') ?? '';
  const response = await fetch(`/api/auth/social/identities/${provider}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthClientError('AUTH_PROVIDER_ERROR', String(body?.message ?? '無法解除連結。'));
}

export async function openAuthorizationUrl(pending: PendingAuthTransaction): Promise<void> {
  const url = new URL(pending.authorizationUrl);
  if (url.protocol !== 'https:') {
    throw new AuthClientError('AUTH_PROVIDER_ERROR', '登入網址無效，已停止開啟。');
  }
  window.location.assign(url.toString());
}

export async function exchangeSocialCallback(
  callbackUrl: string,
  rememberMe: boolean,
): Promise<AuthSessionResponse> {
  const pending = readPendingAuthTransaction();
  if (!pending || isPendingAuthExpired(pending)) {
    clearPendingAuthTransaction();
    throw new AuthClientError('AUTH_TICKET_EXPIRED', '登入已逾時，請重新登入。');
  }

  const callback = new URL(callbackUrl);
  const callbackError = callback.searchParams.get('error');
  if (callbackError) {
    clearPendingAuthTransaction();
    throw new AuthClientError(parseErrorCode(callbackError), '第三方登入未完成。');
  }

  const state = callback.searchParams.get('state') ?? '';
  const ticket = callback.searchParams.get('ticket') ?? '';
  if (!constantTimeEqual(state, pending.state)) {
    clearPendingAuthTransaction();
    throw new AuthClientError('AUTH_STATE_MISMATCH', '登入驗證失敗，請重新登入。');
  }
  if (!/^[A-Za-z0-9_-]{20,512}$/.test(ticket)) {
    clearPendingAuthTransaction();
    throw new AuthClientError('AUTH_SESSION_EXCHANGE_FAILED', '登入驗證失敗，請重新登入。');
  }

  let response: Response;
  try {
    response = await fetch('/api/auth/social/session/exchange', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': pending.requestId,
      },
      body: JSON.stringify({
        ticket,
        state,
        codeVerifier: pending.codeVerifier,
        rememberMe,
      }),
    });
  } catch {
    throw new AuthClientError('NETWORK_ERROR', '目前無法連線，請檢查網路後再試一次。');
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AuthClientError(
      parseErrorCode(String(body?.error ?? 'AUTH_SESSION_EXCHANGE_FAILED')),
      String(body?.message ?? '登入驗證失敗，請重新登入。'),
      body,
    );
  }

  clearPendingAuthTransaction();
  return body as AuthSessionResponse;
}

export async function refreshAppSession(): Promise<AuthSessionResponse | null> {
  let response: Response;
  try {
    response = await fetch('/api/auth/session/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch { return null; }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  return body as AuthSessionResponse;
}

export async function logoutAppSession(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  }).catch(() => undefined);
}

export async function confirmAccountLink(linkTicket: string): Promise<void> {
  const pending = readPendingAuthTransaction();
  if (!pending) throw new AuthClientError('AUTH_STATE_MISMATCH', '帳號連結已逾時，請重新登入。');
  const token = window.sessionStorage.getItem('access_token') ?? '';
  const response = await fetch('/api/auth/social/link/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ticket: linkTicket, state: pending.state, codeVerifier: pending.codeVerifier }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new AuthClientError('AUTH_SESSION_EXCHANGE_FAILED', String(body?.message ?? '帳號連結失敗。'));
  clearPendingAuthTransaction();
}
