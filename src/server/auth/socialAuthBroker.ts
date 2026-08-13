import { randomUUID } from 'node:crypto';
import type { Express, Request, RequestHandler, Response } from 'express';
import type { AppRepository } from '../repositories/appRepository';
import { getRequestUserId } from './requestAuth';
import { encryptSecret, pkceChallenge, randomToken, sha256 } from './authCrypto';
import type { AuthProvider, AuthRepository, AuthTransactionRecord, ProviderIdentity } from './authRepository';
import { buildProviderAuthorizationUrl, exchangeProviderCode, providerConfig, type SocialProviderConfig } from './providerAuth';
import { issueAppSession, revokeRefreshSession, rotateRefreshSession } from './sessionService';

const TRANSACTION_TTL_SECONDS = 600;
const TICKET_TTL_SECONDS = 120;
const PROVIDERS = new Set<AuthProvider>(['apple', 'google', 'line']);
const BASE64URL_RE = /^[A-Za-z0-9_-]{32,256}$/;

export function socialProviderAvailability(): Record<AuthProvider, boolean> {
  return {
    apple: Boolean(providerConfig('apple')),
    google: Boolean(providerConfig('google')),
    line: Boolean(providerConfig('line')),
  };
}

export function buildAuthorizationUrl(
  provider: AuthProvider,
  config: Omit<SocialProviderConfig, 'clientSecret'> & { clientSecret?: string },
  input: { state: string; nonce: string; codeChallenge: string },
): string {
  return buildProviderAuthorizationUrl(provider, { ...config, clientSecret: config.clientSecret ?? '' }, {
    state: input.state, nonce: input.nonce, providerCodeChallenge: input.codeChallenge,
  });
}

function isAllowedAppRedirectUri(uri: string, req: Request): boolean {
  const configured = (process.env.AUTH_ALLOWED_APP_REDIRECT_URIS ?? '').split(',')
    .map((value) => value?.trim()).filter(Boolean);
  if (configured.includes(uri)) return true;
  try {
    const candidate = new URL(uri);
    if (process.env.NODE_ENV !== 'production') {
      return ['localhost', '127.0.0.1'].includes(candidate.hostname) && candidate.pathname === '/auth/callback';
    }
    return uri === `${req.protocol}://${req.get('host')}/auth/callback`;
  } catch { return false; }
}

function redirectWith(uri: string, params: Record<string, string>): string {
  const url = new URL(uri);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

function providerLabel(provider: AuthProvider) {
  return provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : 'LINE';
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => { void handler(req, res).catch((error) => {
    console.error('social auth request failed', error instanceof Error ? error.message : 'unknown error');
    if (!res.headersSent) res.status(500).json({ error: 'AUTH_PROVIDER_ERROR', message: '登入服務暫時無法使用。' });
  }); };
}

async function createLoginTicket(
  authRepo: AuthRepository, transaction: AuthTransactionRecord, userId: string,
  identity: ProviderIdentity, kind: 'login' | 'link',
) {
  const raw = randomToken(48);
  await authRepo.createTicket({
    id: randomUUID(), transactionId: transaction.id, userId, ticketHash: sha256(raw), kind, ...identity,
    expiresAt: new Date(Date.now() + TICKET_TTL_SECONDS * 1000), consumedAt: null,
  });
  return raw;
}

export function registerSocialAuthBrokerRoutes(
  app: Express,
  limiter: RequestHandler,
  deps?: { repo: AppRepository; authRepo: AuthRepository },
): void {
  app.get('/api/auth/social/providers', (_req, res) => {
    res.json({ providers: socialProviderAvailability() });
  });
  if (!deps) return;
  const { repo, authRepo } = deps;

  app.post('/api/auth/social/start', limiter, asyncRoute(async (req, res) => {
    const provider = String(req.body?.provider ?? '') as AuthProvider;
    const state = String(req.body?.state ?? '');
    const nonce = String(req.body?.nonce ?? '');
    const appCodeChallenge = String(req.body?.codeChallenge ?? '');
    const appRedirectUri = String(req.body?.appRedirectUri ?? '').trim();
    if (!PROVIDERS.has(provider) || !BASE64URL_RE.test(state) || !BASE64URL_RE.test(nonce)
      || !BASE64URL_RE.test(appCodeChallenge) || req.body?.codeChallengeMethod !== 'S256') {
      res.status(400).json({ error: 'AUTH_PROVIDER_ERROR', message: '登入請求格式不正確。' }); return;
    }
    if (!isAllowedAppRedirectUri(appRedirectUri, req)) {
      res.status(400).json({ error: 'AUTH_PROVIDER_ERROR', message: '登入回呼網址不在允許清單。' }); return;
    }
    const config = providerConfig(provider);
    if (!config) {
      res.status(503).json({ error: 'AUTH_PROVIDER_ERROR', message: `${providerLabel(provider)} 登入尚未完成服務設定，請改用電子郵件登入。` }); return;
    }
    const providerVerifier = provider === 'apple' ? '' : randomToken(64);
    const transactionId = randomUUID();
    await authRepo.createTransaction({
      id: transactionId, provider, stateHash: sha256(state), nonceHash: sha256(nonce), appCodeChallenge,
      providerCodeVerifierEncrypted: providerVerifier ? encryptSecret(providerVerifier) : null,
      appRedirectUri, linkUserId: req.body?.link ? getRequestUserId(req) : null,
      expiresAt: new Date(Date.now() + TRANSACTION_TTL_SECONDS * 1000), consumedAt: null,
    });
    res.json({
      authorizationUrl: buildProviderAuthorizationUrl(provider, config, {
        state, nonce, providerCodeChallenge: providerVerifier ? pkceChallenge(providerVerifier) : undefined,
      }),
      transactionId, expiresIn: TRANSACTION_TTL_SECONDS,
    });
  }));

  const callback = async (req: Request, res: Response) => {
    const state = String(req.method === 'POST' ? req.body?.state ?? '' : req.query.state ?? '');
    const transaction = await authRepo.findActiveTransaction(sha256(state));
    if (!transaction) { res.status(400).send('Invalid or expired OAuth state.'); return; }
    const provider = req.params.provider as AuthProvider;
    if (!PROVIDERS.has(provider) || provider !== transaction.provider) {
      res.redirect(303, redirectWith(transaction.appRedirectUri, { error: 'AUTH_STATE_MISMATCH', state })); return;
    }
    const providerError = String(req.method === 'POST' ? req.body?.error ?? '' : req.query.error ?? '');
    if (providerError) {
      await authRepo.consumeTransaction(transaction.id);
      res.redirect(303, redirectWith(transaction.appRedirectUri, {
        error: providerError === 'access_denied' || providerError === 'user_cancelled_authorize' ? 'AUTH_CANCELLED' : 'AUTH_PROVIDER_ERROR', state,
      })); return;
    }
    const code = String(req.method === 'POST' ? req.body?.code ?? '' : req.query.code ?? '');
    if (!code) { res.redirect(303, redirectWith(transaction.appRedirectUri, { error: 'AUTH_PROVIDER_ERROR', state })); return; }
    try {
      const identity = await exchangeProviderCode(provider, code, transaction, String(req.body?.user ?? ''));
      const existingIdentity = await authRepo.findIdentity(provider, identity.providerSubject);
      let userId = existingIdentity?.userId ?? transaction.linkUserId;
      let kind: 'login' | 'link' = 'login';

      if (existingIdentity && transaction.linkUserId && existingIdentity.userId !== transaction.linkUserId) {
        throw new Error('This provider identity is already connected to another account.');
      }
      if (!userId && identity.providerEmailVerified && identity.providerEmail) {
        const emailUser = await repo.getUserByEmail(identity.providerEmail);
        if (emailUser) { userId = emailUser.userId; kind = 'link'; }
      }
      if (!userId) {
        userId = `usr_${randomUUID()}`;
        await repo.createSocialUser(userId, identity.providerEmailVerified ? identity.providerEmail : null,
          identity.displayName || identity.providerEmail?.split('@')[0] || providerLabel(provider), identity.avatarUrl);
      }
      if (kind === 'login') await authRepo.createIdentity(userId, identity);
      if (!(await authRepo.consumeTransaction(transaction.id))) throw new Error('OAuth transaction was already consumed.');
      const ticket = await createLoginTicket(authRepo, transaction, userId, identity, kind);
      res.redirect(303, redirectWith(transaction.appRedirectUri, { ticket, state }));
    } catch (error) {
      console.error(`${provider} OAuth callback failed`, error instanceof Error ? error.message : 'unknown error');
      await authRepo.consumeTransaction(transaction.id);
      res.redirect(303, redirectWith(transaction.appRedirectUri, { error: 'AUTH_PROVIDER_ERROR', state }));
    }
  };
  app.get('/api/auth/social/callback/:provider', asyncRoute(callback));
  app.post('/api/auth/social/callback/:provider', asyncRoute(callback));

  app.post('/api/auth/social/session/exchange', limiter, asyncRoute(async (req, res) => {
    const ticketRaw = String(req.body?.ticket ?? '');
    const state = String(req.body?.state ?? '');
    const verifier = String(req.body?.codeVerifier ?? '');
    const ticket = await authRepo.findActiveTicket(sha256(ticketRaw));
    if (!ticket) { res.status(410).json({ error: 'AUTH_TICKET_EXPIRED', message: '登入票證已失效。' }); return; }
    const transaction = await authRepo.findTransactionById(ticket.transactionId);
    if (!transaction || transaction.stateHash !== sha256(state) || pkceChallenge(verifier) !== transaction.appCodeChallenge) {
      res.status(400).json({ error: 'AUTH_STATE_MISMATCH', message: '登入驗證失敗。' }); return;
    }
    if (ticket.kind === 'link') {
      res.status(409).json({ error: 'ACCOUNT_LINK_REQUIRED', message: '此信箱已有帳號，請先用原密碼登入以完成連結。', linkTicket: ticketRaw }); return;
    }
    if (!(await authRepo.consumeTicket(ticket.id))) {
      res.status(409).json({ error: 'AUTH_TICKET_USED', message: '登入票證已使用。' }); return;
    }
    const user = await repo.getUserById(ticket.userId);
    if (!user || user.status === 'disabled') { res.status(403).json({ error: 'ACCOUNT_DISABLED', message: '此帳號目前無法登入。' }); return; }
    res.json(await issueAppSession(authRepo, req, res, {
      userId: user.userId, displayName: user.displayName, email: user.primaryEmail,
    }, Boolean(req.body?.rememberMe)));
  }));

  app.post('/api/auth/social/link/confirm', asyncRoute(async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) { res.status(401).json({ error: 'UNAUTHORIZED' }); return; }
    const ticketRaw = String(req.body?.ticket ?? '');
    const ticket = await authRepo.findActiveTicket(sha256(ticketRaw));
    const transaction = ticket ? await authRepo.findTransactionById(ticket.transactionId) : null;
    if (!ticket || ticket.kind !== 'link' || ticket.userId !== userId || !transaction
      || transaction.stateHash !== sha256(String(req.body?.state ?? ''))
      || pkceChallenge(String(req.body?.codeVerifier ?? '')) !== transaction.appCodeChallenge) {
      res.status(400).json({ error: 'AUTH_SESSION_EXCHANGE_FAILED', message: '帳號連結驗證失敗。' }); return;
    }
    await authRepo.createIdentity(userId, ticket);
    await authRepo.consumeTicket(ticket.id);
    res.json({ status: 'success', identities: await authRepo.listIdentities(userId) });
  }));

  app.get('/api/auth/social/identities', asyncRoute(async (req, res) => {
    const userId = getRequestUserId(req);
    if (!userId) { res.status(401).json({ error: 'UNAUTHORIZED' }); return; }
    res.json({ identities: await authRepo.listIdentities(userId) });
  }));

  app.delete('/api/auth/social/identities/:provider', asyncRoute(async (req, res) => {
    const userId = getRequestUserId(req);
    const provider = req.params.provider as AuthProvider;
    if (!userId || !PROVIDERS.has(provider)) { res.status(400).json({ error: 'AUTH_PROVIDER_ERROR' }); return; }
    const [identities, user] = await Promise.all([authRepo.listIdentities(userId), repo.getUserById(userId)]);
    if (identities.length + (user?.passwordHash ? 1 : 0) <= 1) {
      res.status(409).json({ error: 'LAST_LOGIN_METHOD', message: '至少需要保留一種登入方式。' }); return;
    }
    await authRepo.deleteIdentity(userId, provider);
    res.json({ status: 'success' });
  }));

  app.post('/api/auth/session/refresh', limiter, asyncRoute(async (req, res) => {
    const session = await rotateRefreshSession(authRepo, req, res);
    if (!session) { res.status(401).json({ error: 'AUTH_SESSION_EXCHANGE_FAILED', message: '工作階段已失效。' }); return; }
    res.json(session);
  }));
  app.post('/api/auth/logout', asyncRoute(async (req, res) => {
    await revokeRefreshSession(authRepo, req, res); res.status(204).end();
  }));
}
