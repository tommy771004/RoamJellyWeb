import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { signAccessToken } from './jwt';
import { randomToken, sha256 } from './authCrypto';
import type { AuthRepository } from './authRepository';

const COOKIE_NAME = 'roamjelly_refresh';
const ACCESS_SECONDS = 15 * 60;
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;
const SESSION_SECONDS = 12 * 60 * 60;

function cookieValue(req: Request): string {
  const cookie = String(req.headers.cookie ?? '');
  const value = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return value ? decodeURIComponent(value.slice(COOKIE_NAME.length + 1)) : '';
}
function setRefreshCookie(res: Response, token: string, rememberMe: boolean) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth',
    ...(rememberMe ? { maxAge: REMEMBER_SECONDS * 1000 } : {}),
  });
}

export async function issueAppSession(
  authRepo: AuthRepository, req: Request, res: Response, user: { userId: string; displayName?: string; email?: string | null },
  rememberMe: boolean, familyId: string = randomUUID(),
) {
  const refreshToken = randomToken(48);
  const ttl = rememberMe ? REMEMBER_SECONDS : SESSION_SECONDS;
  await authRepo.createSession({
    id: randomUUID(), userId: user.userId, familyId, tokenHash: sha256(refreshToken), rememberMe,
    expiresAt: new Date(Date.now() + ttl * 1000), consumedAt: null, revokedAt: null,
  });
  setRefreshCookie(res, refreshToken, rememberMe);
  return {
    status: 'success', accessToken: signAccessToken({ userId: user.userId }, '15m'), access_token: undefined,
    expiresIn: ACCESS_SECONDS, refreshSession: true,
    user: { id: user.userId, displayName: user.displayName, display_name: user.displayName, email: user.email ?? undefined },
  };
}

export async function rotateRefreshSession(authRepo: AuthRepository, req: Request, res: Response) {
  const raw = cookieValue(req);
  if (!raw) return null;
  const session = await authRepo.findSession(sha256(raw));
  if (!session) return null;
  if (session.consumedAt || session.revokedAt || session.expiresAt <= new Date()) {
    if (session.consumedAt) await authRepo.revokeFamily(session.familyId);
    return null;
  }
  if (!(await authRepo.consumeSession(session.id))) return null;
  return issueAppSession(authRepo, req, res, { userId: session.userId }, session.rememberMe, session.familyId);
}

export async function revokeRefreshSession(authRepo: AuthRepository, req: Request, res: Response) {
  const raw = cookieValue(req);
  if (raw) {
    const session = await authRepo.findSession(sha256(raw));
    if (session) await authRepo.revokeFamily(session.familyId);
  }
  res.clearCookie(COOKIE_NAME, { path: '/api/auth' });
}
